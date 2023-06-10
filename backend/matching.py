import os

import numpy as np
import faiss
import openai
from openai.embeddings_utils import get_embedding
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain import PromptTemplate, FewShotPromptTemplate
from dotenv import load_dotenv


class TopicMatcher:
    """
    A class that searches a vector database for the most
    semantically similar topicNames to a given query.
    """
    def __init__(self, k=2, engine='text-embedding-ada-002'):
        self.k = k
        self.engine = engine
        self.topicNames = []
        self.topicMap = {}
        self.embeddings = []
        self.index = None
        self.initApiKey()

    def initApiKey(self):
        # Loads and sets the api key using the OpenAI library
        load_dotenv()  
        openai.api_key = os.getenv('OPENAI_API_KEY')

    # this is currently only called once
    def addTopics(self, topicTuples):
        for topicID, info in enumerate(topicTuples):
            userID, title = info
            self.topicNames.append(title)
            self.topicMap[topicID] = userID
            self.embeddings.append(get_embedding(title, engine=self.engine))
        self.buildIndex()

    def addTopic(self, userID, title):
        topicID = len(self.topicNames)
        self.topicNames.append(title)
        self.topicMap[topicID] = userID
        self.embeddings.append(get_embedding(title, engine=self.engine))
        self.buildIndex()

    def buildIndex(self):
        embeddings = np.array(self.embeddings).astype('float32')
        d = embeddings.shape[1]

        # TODO: optimize; re-indexing after every add is probably not the best way to do this
        # TODO: also, look into vector quantization: https://github.com/facebookresearch/faiss/blob/f809cf0d512eb69b3c675be53d287b9cc79c0f3e/tutorial/python/3-IVFPQ.py

        print("Creating Flat L2 index...")
        self.index = faiss.IndexFlatL2(d)
        self.index.add(embeddings)
        print("Done.")

    def getSimilarTopics(self, query, userID):
        print("Getting similar topics...")
        query_embedding = get_embedding(query, engine=self.engine)
        query_embedding = np.array([query_embedding]).astype('float32')
        print("Searching index...")
        # Find 3x the desired results to give room to avoid self-matches
        # TODO: this needs better error handling (i.e. retry w/ 4*self.k)
        D, I = self.index.search(query_embedding, 5*self.k)
        print("Done.")
        res = []
        for topicID, score in zip(I[0], D[0]):
            if self.topicMap[topicID] == userID:
                continue
            if self.topicNames[topicID] == 'Brainstorm':
                continue
            res.append({
                "topicName": self.topicNames[topicID],
                "topicID": int(topicID), # make sure these properties exist or are computed
                "userID": self.topicMap[topicID] # TODO: make this scale to > 2 users
            })
            if len(res) == self.k:
                break
        return res


class TopicSegway:
    """
    A class that uses a language model to generate engaging responses to a given query,
    in the context of a series of topic names.
    """
    def __init__(self):
        self.configurePrompt()
        self.llm = OpenAI(model_name="text-davinci-003")
        self.chain = LLMChain(llm=self.llm, prompt=self.few_shot_prompt)

    def configurePrompt(self):
        # Prepare example prompts and responses for training
        example_1 = {
            "query": "How will technology shape the future?",
            "topic1": "How is artificial intelligence impacting our daily lives?",
            "topic2": "What do you think about the future of cryptocurrency?",
            "answer": "If you're curious about the future of technology, you might want to explore how AI is changing our day-to-day life.\n" \
                    "Additionally, the evolving realm of cryptocurrency might pique your interest.\n"
        }

        example_2 = {
            "query": "What are the impacts of climate change?",
            "topic1": "How does climate change affect wildlife?",
            "topic2": "What are the economic consequences of climate change?",
            "answer": "If you're interested in the impacts of climate change, you might want to look into its effects on wildlife.\n" \
                    "You could also delve into the economic repercussions of climate change.\n"
        } 

        examples = [example_1, example_2]

        template = """
        Query: {query}\n
        Toipic 1: {topic1}\n
        Topic 2: {topic2}\n
        Answer: {answer}\n
        """

        # Define the structure of the prompt with input variables and template
        example_prompt = PromptTemplate(
            input_variables=["query", "topic1", "topic2", "answer"], 
            template=template,
        )

        # Define the prefix for the prompt, giving clear instructions on how to construct an engaging response
        prompt_prefix = "Connect the user's query with each of the topics below, crafting an intriguing line for each one." \
                        "Keep the user's curiosity alive and drive their engagement." \
                        "Please make sure to put each sentence on its own line. Here are some examples:\n"

        # Generate the few-shot prompt with the provided examples and structure
        self.few_shot_prompt = FewShotPromptTemplate(
            examples=examples,
            example_prompt=example_prompt,
            prefix=prompt_prefix,
            suffix="Query: {query}\nTopic 1: {topic1}\n" \
                "Topic 2: {topic2}\n" \
                "Answer:",
            input_variables=["query", "topic1", "topic2"],
            example_separator="\n",
        )
        print("Set up few shot prompt")

    def getResponse(self, query, topics):
        print("Generating response...")
        print("Query:", query)
        # TODO: add error handling
        assert len(topics) == 2, "Must provide two topics, not {}".format(len(topics))

        # Assuming topics is a list of three topicNames
        input = {
            "query": query,
            "topic1": topics[0]['topicName'],
            "topic2": topics[1]['topicName'],
        }

        print("Input:", input)
        response = self.chain.run(input)
        print("Response:", response)
        return response