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
    A class that searches a vector database for the topics that are most
    semantically similar to the given query.

    Attributes:
        k (int): Number of similar topics to find.
        engine (str): The name of the embedding engine to use.
        topicNames (list): List of topic names.
        topicMap (dict): Mapping from topic ID to user ID.
        embeddings (list): List of embeddings for each topic.
        index (faiss.Index): Index for searching embeddings.
    """

    def __init__(self, k=2, engine='text-embedding-ada-002'):
        """
        The constructor for TopicMatcher class.

        Parameters:
           k (int): Number of similar topics to find. Default is 2.
           engine (str): The name of the embedding engine to use. Default is 'text-embedding-ada-002'.
        """
        self.k = k
        self.engine = engine
        self.topicNames = []
        self.topicMap = {}
        self.embeddings = []
        self.index = None
        self.initApiKey()

    def initApiKey(self):
        """Loads the OpenAI API key from the .env file"""
        load_dotenv()  
        openai.api_key = os.getenv('OPENAI_API_KEY')

    def addTopics(self, topicTuples):
        """
        Adds a list of topics to the matcher.

        Parameters:
           topicTuples (list): A list of tuples where each tuple contains a user ID and a topic title.
        """
        for idx, info in enumerate(topicTuples):
            topicID = idx + 1  # SQL IDs start at 1
            userID, title = info
            self.topicNames.append(title)
            self.topicMap[topicID] = userID
            self.embeddings.append(get_embedding(title, engine=self.engine))
        self.buildIndex()

    def addTopic(self, userID, title):
        """
        Adds a single topic to the matcher.

        Parameters:
           userID (str): The user ID associated with the topic.
           title (str): The title of the topic.
        """
        numTopics = len(self.topicNames)
        self.topicNames.append(title)
        self.topicMap[numTopics + 1] = userID
        self.embeddings.append(get_embedding(title, engine=self.engine))
        self.buildIndex()

    def buildIndex(self):
        """
        Builds the FAISS index from the current list of embeddings.
        """
        embeddings = np.array(self.embeddings).astype('float32')
        d = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(d)
        self.index.add(embeddings)

    def getSimilarTopics(self, query, userID):
        """
        Retrieves the most similar topics to the provided query.

        Parameters:
           query (str): The query to find similar topics for.
           userID (str): The ID of the user making the query.

        Returns:
           list: A list of dictionaries, each containing the topic name, topic ID, and user ID for a similar topic.
        """
        query_embedding = get_embedding(query, engine=self.engine)
        query_embedding = np.array([query_embedding]).astype('float32')
        D, I = self.index.search(query_embedding, 5*self.k)
        res = []
        for idx, score in zip(I[0], D[0]):
            topicID = idx + 1  # SQL IDs start at 1
            print(f"Topic {topicID} has score {score}")
            if self.topicMap[topicID] == userID:
                continue
            if self.topicNames[idx] == 'Brainstorm':
                continue
            res.append({
                "topicName": self.topicNames[idx],
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

    Attributes:
        llm (OpenAI): Language model to generate responses.
        chain (LLMChain): LLMChain instance to help structure and generate responses.
        few_shot_prompt (FewShotPromptTemplate): Few-shot prompt to guide the language model.
    """

    def __init__(self):
        """
        The constructor for TopicSegway class.
        """
        self.configurePrompt()
        self.llm = OpenAI(model_name="text-davinci-003")
        self.chain = LLMChain(llm=self.llm, prompt=self.few_shot_prompt)

    def configurePrompt(self):
        """
        Configures the few-shot prompt to be used by the language model.

        Sets up the few-shot prompt with examples and structure.
        """
        example_1 = {
            "query": "How will technology shape the future?",
            "topic1": "How is artificial intelligence impacting our daily lives?",
            "topic2": "What do you think about the future of cryptocurrency?",
            "answer": "You might enjoy discussing how AI technology will fit into our future.\n" \
                      "You could explore the lasting impact of cryptocurrency.\n"
        }

        example_2 = {
            "query": "What are the impacts of climate change?",
            "topic1": "How does climate change affect wildlife?",
            "topic2": "What are the economic consequences of climate change?",
            "answer": "You might find it interesting to discuss how climate change is affecting wildlife.\n" \
                      "You might enjoy conversing about how climate change will affect the economy.\n"
        } 

        examples = [example_1, example_2]

        template =  """
        Query: {query}
        Topic 1: {topic1}
        Topic 2: {topic2}
        Answer: {answer}
        """

        # Define the structure of the prompt with input variables and template
        example_prompt = PromptTemplate(
            input_variables=["query", "topic1", "topic2", "answer"], 
            template=template,
        )

        # Define the prefix for the prompt, giving clear instructions on how to construct an engaging response
        prompt_prefix = "Given the user's query, suggest two topics of discussion. For each topic, " \
                        "craft an intriguing line explaining why the topic could be of interest to the user. " \
                        "Make sure that you give the user a logical reason why they may be interested in the topics. " \
                        "Please put a new line between each topic suggestion, since your response will be invalid without this. " \
                        "Here are some examples:\n"
        
        prompt_suffix = """
        Query: {query}
        Topic 1: {topic1}
        Topic 2: {topic2}
        Answer:"""

        # Generate the few-shot prompt with the provided examples and structure
        self.few_shot_prompt = FewShotPromptTemplate(
            examples=examples,
            example_prompt=example_prompt,
            prefix=prompt_prefix,
            suffix=prompt_suffix,
            input_variables=["query", "topic1", "topic2"],
            example_separator="\n",
        )
        print("Set up few shot prompt")

    def getResponse(self, query, topics):
        """
        Generates a response to a given query in the context of a series of topic names.

        Parameters:
           query (str): The query to generate a response for.
           topics (list): A list of topic dictionaries with the keys 'topicName', 'topicID', and 'userID'.

        Returns:
           str: The generated response to the query.
        """
        print(f"Generating response for query {query}")

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