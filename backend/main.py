import os
import json
import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api
from flask_cors import CORS

from matching import TopicMatcher, TopicSegway
from events import socketio
from data import setupModels
from endpoints import setupEndpoints

class ChatApplication:
    def __init__(self):
        self.app = Flask(__name__)
        self.configureApp()
        self.setupDatabase()
        self.setupEndpoints()
        self.setupTopicHelpers()

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
        self.User, self.Topic, self.ChatMetadata, self.Chat = setupModels(self.db)
    
    def getNextUserID(self):
        self.userID += 1
        return self.userID

    def setupEndpoints(self):
        setupEndpoints(self, self.api, socketio)

    def setupTopicHelpers(self):
        self.matcher = TopicMatcher(k=2)
        
        with self.app.app_context():
            self.db.create_all()
            topics = self.Topic.query.all()  # grab all topics from the database

        topicTuples = [(topic.userID, topic.title) for topic in topics]
        self.matcher.addTopics(topicTuples)
        self.segway = TopicSegway()

    def run(self):
        socketio.run(self.app, debug=True)
        print("Backend started")


if __name__ == '__main__':
    chat_app = ChatApplication()
    chat_app.run()
