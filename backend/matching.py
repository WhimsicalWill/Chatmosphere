import faiss
import numpy as np
from openai.embeddings_utils import get_embedding
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain import PromptTemplate, FewShotPromptTemplate


class ConversationMatcher:
    """
    A class that searches a vector database for the most
    semantically similar conversations to a given query.
    """
    def __init__(self, k=2, engine='text-embedding-ada-002'):
        self.k = k
        self.engine = engine
        self.conversations = []
        self.embeddings = None
        self.index = None

    def add_conversations(self, conversations):
        self.conversations.extend(conversations)
        embeddings = [get_embedding(conv, engine=self.engine) for conv in self.conversations]
        self.embeddings = np.array(embeddings).astype('float32')
        d = self.embeddings.shape[1]
        # TODO: optimize; re-indexing after every add is probably not the best way to do this
        # TODO: also, look into vector quantization: https://github.com/facebookresearch/faiss/blob/f809cf0d512eb69b3c675be53d287b9cc79c0f3e/tutorial/python/3-IVFPQ.py
        print("Creating Flat L2 index...")
        self.index = faiss.IndexFlatL2(d)
        self.index.add(self.embeddings)
        print("Done.")

    def get_similar_conversations(self, query):
        print("Getting similar conversations...")
        query_embedding = get_embedding(query, engine=self.engine)
        query_embedding = np.array([query_embedding]).astype('float32')
        print("Searching index...")
        D, I = self.index.search(query_embedding, self.k)
        print("Done.")
        res = []
        for idx, score in zip(I[0], D[0]):
            # res.append((self.conversations[idx], score))
            res.append(self.conversations[idx])
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
            "conv3": "What do you think about the future of private companies in space exploration?",
            "answer": "If you're curious about the future of technology, you might want to explore how AI is changing our day-to-day life.\n" \
                    "Additionally, the evolving realm of cryptocurrency might pique your interest.\n" \
                    "Lastly, considering the role private companies could play in future space exploration might be quite intriguing.\n"
        }

        example_2 = {
            "query": "What are the impacts of climate change?",
            "conv1": "How does climate change affect wildlife?",
            "conv2": "What are the economic consequences of climate change?",
            "conv3": "How does climate change influence weather patterns?",
            "answer": "If you're interested in the impacts of climate change, you might want to look into its effects on wildlife.\n" \
                    "You could also delve into the economic repercussions of climate change.\n" \
                    "Finally, exploring how climate change modifies weather patterns could be enlightening.\n"
        } 

        examples = [example_1, example_2]

        template = """
        Query: {query}\n
        Conversation 1: {conv1}\n
        Conversation 2: {conv2}\n
        Conversation 3: {conv3}\n
        Answer: {answer}\n
        """

        # Define the structure of the prompt with input variables and template
        example_prompt = PromptTemplate(
            input_variables=["query", "conv1", "conv2", "conv3", "answer"], 
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
                "Conversation 2: {conv2}Conversation 3: {conv3}\n" \
                "Answer:",
            input_variables=["query", "conv1", "conv2", "conv3"],
            example_separator="\n",
        )

    def get_response(self, query, convs):
        # TODO: add error handling
        assert len(convs) == 3, "Must provide three conversations"

        # Assuming convs is a list of three conversations
        input = {
            "query": query,
            "conv1": convs[0],
            "conv2": convs[1],
            "conv3": convs[2]
        }

        response = self.chain.run(input)
        return response