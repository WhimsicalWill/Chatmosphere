import numpy as np
import os

import faiss
import openai
from openai.embeddings_utils import get_embedding
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain import PromptTemplate, FewShotPromptTemplate
from dotenv import load_dotenv


class ConversationMatcher:
    """
    A class that searches a vector database for the most
    semantically similar conversations to a given query.
    """
    def __init__(self, k=2, engine='text-embedding-ada-002'):
        self.k = k
        self.engine = engine
        self.conversations = []
        self.user_topic_ids = {}
        self.embeddings = None
        self.index = None
        self.init_api_key()

    def init_api_key(self):
        # Loads and sets the api key using the OpenAI library
        load_dotenv()  
        openai.api_key = os.getenv('OPENAI_API_KEY')

    # TODO: add better pipeline for incrementally adding conversations
    # this is currently only called once
    def add_conversations(self, conversations):
        for topic_id, conv in enumerate(conversations):
            user_id, topic = conv
            self.conversations.append(topic)
            if user_id not in self.user_topic_ids:
                self.user_topic_ids[user_id] = set()
            self.user_topic_ids[user_id].add(topic_id)
        self.build_index()

    def build_index(self):
        embeddings = [get_embedding(conv, engine=self.engine) for conv in self.conversations]
        self.embeddings = np.array(embeddings).astype('float32')
        d = self.embeddings.shape[1]
        # TODO: optimize; re-indexing after every add is probably not the best way to do this
        # TODO: also, look into vector quantization: https://github.com/facebookresearch/faiss/blob/f809cf0d512eb69b3c675be53d287b9cc79c0f3e/tutorial/python/3-IVFPQ.py
        print("Creating Flat L2 index...")
        self.index = faiss.IndexFlatL2(d)
        self.index.add(self.embeddings)
        print("Done.")

    def get_similar_conversations(self, query, user_id):
        print("Getting similar conversations...")
        query_embedding = get_embedding(query, engine=self.engine)
        query_embedding = np.array([query_embedding]).astype('float32')
        print("Searching index...")
        # Find 3x the desired results to give room to avoid self-matches
        # TODO: this needs better error handling (i.e. retry w/ 4*self.k)
        D, I = self.index.search(query_embedding, 3*self.k)
        print("Done.")
        res = []
        for idx, score in zip(I[0], D[0]):
            if idx in self.user_topic_ids[user_id]:
                continue
            res.append(self.conversations[idx])
            if len(res) == self.k:
                break
        return res


class ConversationSegway:
    """
    A class that uses a language model to generate engaging responses to a given query,
    in the context of a series of conversations.
    """
    def __init__(self):
        self.configure_prompt()
        self.llm = OpenAI(model_name="text-davinci-003")
        self.chain = LLMChain(llm=self.llm, prompt=self.few_shot_prompt)

    def configure_prompt(self):
        # Prepare example prompts and responses for training
        example_1 = {
            "query": "How will technology shape the future?",
            "conv1": "How is artificial intelligence impacting our daily lives?",
            "conv2": "What do you think about the future of cryptocurrency?",
            "answer": "If you're curious about the future of technology, you might want to explore how AI is changing our day-to-day life.\n" \
                    "Additionally, the evolving realm of cryptocurrency might pique your interest.\n"
        }

        example_2 = {
            "query": "What are the impacts of climate change?",
            "conv1": "How does climate change affect wildlife?",
            "conv2": "What are the economic consequences of climate change?",
            "answer": "If you're interested in the impacts of climate change, you might want to look into its effects on wildlife.\n" \
                    "You could also delve into the economic repercussions of climate change.\n"
        } 

        examples = [example_1, example_2]

        template = """
        Query: {query}\n
        Conversation 1: {conv1}\n
        Conversation 2: {conv2}\n
        Answer: {answer}\n
        """

        # Define the structure of the prompt with input variables and template
        example_prompt = PromptTemplate(
            input_variables=["query", "conv1", "conv2", "answer"], 
            template=template,
        )

        # Define the prefix for the prompt, giving clear instructions on how to construct an engaging response
        prompt_prefix = "Connect the user's query with each of the conversations below, crafting an intriguing line for each one." \
                        "Keep the user's curiosity alive and drive their engagement. Here are some examples:\n"

        # Generate the few-shot prompt with the provided examples and structure
        self.few_shot_prompt = FewShotPromptTemplate(
            examples=examples,
            example_prompt=example_prompt,
            prefix=prompt_prefix,
            suffix="Query: {query}\nConversation 1: {conv1}\n" \
                "Conversation 2: {conv2}" \
                "Answer:",
            input_variables=["query", "conv1", "conv2"],
            example_separator="\n",
        )
        print("Set up few shot prompt")

    def get_response(self, query, convs):
        print("Generating response...")
        print("Query:", query)
        print("Conversations:", convs)
        # TODO: add error handling
        assert len(convs) == 2, "Must provide two conversations"

        # Assuming convs is a list of three conversations
        input = {
            "query": query,
            "conv1": convs[0],
            "conv2": convs[1],
        }

        print("Input:", input)
        response = self.chain.run(input)
        print("Response:", response)
        return response