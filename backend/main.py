import os

import openai
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api
from flask_cors import CORS
from langchain.llms import OpenAI
from dotenv import load_dotenv

from matching import TopicMatcher
from segway import TopicSegway
from events import socketio, initEventHandler
from data import setupModels
from endpoints import setupEndpoints

class ChatApplication:
    def __init__(self):
        self.app = Flask(__name__)
        self.configureApp()
        self.setupDatabase()
        setupEndpoints(self, self.api, socketio)
        initEventHandler(self)

    def configureApp(self):
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        self.api = Api(self.app)
        # TODO: move the data.db path to a config file
        self.dbPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        os.makedirs(self.dbPath, exist_ok=True)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(self.dbPath, 'test.db')
        socketio.init_app(self.app, cors_allowed_origins="*")

    def setupDatabase(self):
        self.db = SQLAlchemy(self.app)
        self.userID = 0
        self.User, self.Topic, self.ChatMetadata, self.ChatMessage = setupModels(self.db)
    
    def getNextUserID(self):
        self.userID += 1
        return self.userID

    def initApiKey(self):
        """Loads the OpenAI API key from the .env file"""
        load_dotenv()  
        openai.api_key = os.getenv('OPENAI_API_KEY')

    def setupTopicHelpers(self):
        llm = OpenAI(model_name="text-davinci-003")  # Initialize your language model
        self.matcher = TopicMatcher(llm, k=2)
        self.segway = TopicSegway(llm)

        with self.app.app_context():
            self.db.create_all()
            topics = self.Topic.query.all()  # grab all topics from the database

        print(f"Loading {len(topics)} topics")
        topicTuples = [(topic.userID, topic.title) for topic in topics]
        self.matcher.addTopics(topicTuples)
        print("Added topics")

    def run(self):
        self.initApiKey()
        self.setupTopicHelpers()
        socketio.run(self.app, debug=True)


if __name__ == '__main__':
    chat_app = ChatApplication()
    chat_app.run()
