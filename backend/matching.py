import faiss
import numpy as np
from openai.embeddings_utils import get_embedding, cosine_similarity


class ConversationMatcher:
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
        # TODO: optimize; re-indexing after very add is probably not the best way to do this
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
            res.append((self.conversations[idx], score))
        return res