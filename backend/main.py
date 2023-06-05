import os
import json
import os

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api
from flask_cors import CORS

from matching import ConversationMatcher, ConversationSegway
from events import socketio
from data import setup_models
from endpoints import setup_endpoints

class ChatApplication:
    def __init__(self):
        self.app = Flask(__name__)
        self.configure_app()
        self.setup_database()
        self.setup_conversation_handler()
        self.setup_endpoints()

    def configure_app(self):
        # CORS(self.app)
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        self.api = Api(self.app)
        self.db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        os.makedirs(self.db_dir, exist_ok=True)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(self.db_dir, 'test.db')
        socketio.init_app(self.app, cors_allowed_origins="*")

    def setup_database(self):
        self.db = SQLAlchemy(self.app)
        self.chat_id = 0
        self.user_id = -1
        self.User, self.Conversation = setup_models(self.db)
    
    def get_next_chat_id(self):
        self.chat_id += 1
        return self.chat_id

    def get_next_user_id(self):
        self.user_id += 1
        return self.user_id

    def setup_endpoints(self):
        CreateChatResource, NextChatIdResource, NextUserIdResource, UserResource, \
        ConversationResource, BotResponseResource = setup_endpoints(self, socketio)

        self.api.add_resource(CreateChatResource, '/create-chat')
        self.api.add_resource(NextChatIdResource, '/next-chat-id')
        self.api.add_resource(NextUserIdResource, '/next-user-id')
        self.api.add_resource(UserResource, '/user/<int:user_id>')
        self.api.add_resource(ConversationResource, '/conversation/<int:conversation_id>')
        self.api.add_resource(BotResponseResource, '/bot-response')

    def setup_conversation_handler(self):
        self.matcher = ConversationMatcher(k=2)
        with open(os.path.join(self.db_dir, 'mock_convs.json')) as f:
            data = json.load(f)  # TODO: Load from actual SQL database
        convs = [(conv['user_id'], conv['topic']) for conv in data['conversations']]
        self.matcher.add_conversations(convs)
        self.segway = ConversationSegway()

    def run(self):
        with self.app.app_context():
            self.db.create_all()  # Creates the database tables
        socketio.run(self.app, debug=True)
        print("Backend started")


if __name__ == '__main__':
    chat_app = ChatApplication()
    chat_app.run()
