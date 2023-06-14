import numpy as np
import faiss
from openai.embeddings_utils import get_embedding

from query import AsymmetricQueryHelper


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

    def __init__(self, llm, k=2, engine='text-embedding-ada-002'):
        """
        The constructor for TopicMatcher class.

        Parameters:
           k (int): Number of similar topics to find. Default is 2.
           engine (str): The name of the embedding engine to use. Default is 'text-embedding-ada-002'.
        """
        self.llm = llm
        self.k = k
        self.engine = engine
        self.topicNames = []
        self.topicMap = {}
        self.embeddings = []
        self.index = None
        self.queryHelper = AsymmetricQueryHelper(llm)

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
            print(f"Added topic {topicID}")
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

    def searchIndexWithQuery(self, embedding, userID, k):
        """
        Retrieves the most similar topics to the provided query.

        Parameters:
           embedding (np.array): The embedding used to search the vector store.
           userID (str): The ID of the user making the query.
           k (int): The number of similar topics to return.

        Returns:
           list: A list of dictionaries, each containing the topic name, topic ID, and user ID for a similar topic.
        """
        D, I = self.index.search(embedding, 3*k)
        res = []
        for idx, score in zip(I[0], D[0]):
            topicID = idx + 1  # SQL IDs start at 1
            print(f"Topic {topicID} has score {score}. Topic:\n{self.topicNames[idx]}\n")
            if self.topicMap[topicID] == userID:
                continue
            if self.topicNames[idx] == 'Brainstorm':
                continue
            res.append({
                "topicName": self.topicNames[idx],
                "topicID": int(topicID),
                "userID": self.topicMap[topicID]
            })
            if len(res) == k:
                break
        return res

    def getSimilarTopics(self, query, userID):
        """
        Retrieves the most similar topics to the provided query.

        Parameters:
           query (str): The query to find similar topics for.
           userID (str): The ID of the user making the query.

        Returns:
           list: A list of dictionaries, each containing the topic name, topic ID, and user ID for a similar topic.
        """
        queryEmbedding = get_embedding(query, engine=self.engine)
        queryEmbedding = np.array([queryEmbedding]).astype('float32')

        alternateQueries = self.queryHelper.getAlternateQuery(query, numAlternates=5)
        print("Alternate queries: ", alternateQueries)
        alternateEmbeddings = [get_embedding(alternateQuery, engine=self.engine) for alternateQuery in alternateQueries]
        alternateEmbeddings = np.array(alternateEmbeddings).astype('float32')

        numDesiredOriginal = self.k // 2
        numDesiredAlternate = self.k - numDesiredOriginal

        originalResults = self.searchIndexWithQuery(queryEmbedding, userID, numDesiredOriginal)
        alternateResults = self.searchIndexWithQuery(alternateEmbeddings, userID, numDesiredAlternate)
        return originalResults + alternateResults