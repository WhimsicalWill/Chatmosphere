import os
import json
import os

from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Resource, Api
from flask_cors import CORS

from matching import ConversationMatcher, ConversationSegway
from events import socketio


class ChatApplication:
    def __init__(self):
        self.app = Flask(__name__)
        self.configure_app()
        self.setup_database()
        self.setup_models()
        self.setup_conversation_handler()
        self.setup_resources()

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
        self.chat_id = -1
        self.user_id = -1
    
    def get_next_chat_id(self):
        self.chat_id += 1
        return self.chat_id

    def get_next_user_id(self):
        self.user_id += 1
        return self.user_id

    # Define User and Conversation database models here
    def setup_models(self):
        class User(self.db.Model):
            id = self.db.Column(self.db.Integer, primary_key=True)
            username = self.db.Column(self.db.String(80), unique=True, nullable=False)

            def __repr__(self):
                return f'<User {self.username}>'


        # Define a Conversation model
        class Conversation(self.db.Model):
            id = self.db.Column(self.db.Integer, primary_key=True)
            topic = self.db.Column(self.db.String(200), nullable=False)
            user_id = self.db.Column(self.db.Integer, self.db.ForeignKey('user.id'), nullable=False)
            user = self.db.relationship('User', backref=self.db.backref('conversations', lazy=True))

            def __repr__(self):
                return f'<Conversation {self.topic}>'

        self.User = User
        self.Conversation = Conversation

    # Define API resources here
    def setup_resources(self):

        # these bindings allow the inner classes to access the outer class's variables
        User = self.User
        Conversation = self.Conversation
        matcher = self.matcher
        segway = self.segway
        get_next_chat_id = self.get_next_chat_id
        get_next_user_id = self.get_next_user_id

        # Define your API resources
        class UserResource(Resource):
            def get(self, user_id):
                user = User.query.get(user_id)
                if user:
                    return {'username': user.username}
                else:
                    return {"error": "User not found"}, 404


        class ConversationResource(Resource):
            def get(self, conversation_id):
                conversation = Conversation.query.get(conversation_id)
                if conversation:
                    return {'topic': conversation.topic, 'username': conversation.user.username}, 200
                else:
                    return {"error": "Conversation not found"}, 404


        class BotResponseResource(Resource):
            def get(self):
                topic = request.args.get('topic')
                user_id = int(request.args.get('userId'))
                if topic:
                    conv_matches = matcher.get_similar_conversations(topic, user_id)
                    segway_response = segway.get_response(topic, conv_matches)
                    return {'conv_matches': conv_matches, 'segway_response': segway_response}, 200
                else:
                    return {"error": "No topic provided"}, 400

            # TODO: actually use the database instead of mock data
            def post(self):
                topic = request.args.get('topic')
                if topic:
                    # new_conversation = Conversation(topic=topic)
                    # self.db.session.add(new_conversation)
                    # self.db.session.commit()
                    matcher.add_conversations([topic])
                    return {'message': 'New conversation added'}
                else:
                    return {"error": "No topic provided"}, 400


        class NextChatIdResource(Resource):
            def get(self):
                next_id = get_next_chat_id()  # Retrieve the next chat id
                return {'nextChatId': next_id}, 200


        class NextUserIdResource(Resource):
            def get(self):
                next_id = get_next_user_id()  # Retrieve the next chat id
                return {'nextUserId': next_id}, 200


        class CreateChatResource(Resource):
            def post(self):
                data = request.get_json()
                other_user_id = data.get('otherUserId')
                topic_id = int(data.get('topicId'))
                chat_name = data.get('chatName')
                topic_name = matcher.conversations[topic_id]

                print("Creating new chat...")
                new_chat_id = get_next_chat_id()
                chat_info = {"chatId": new_chat_id, "chatName": chat_name, "topicName": topic_name}
                socketio.emit('new_chat', chat_info, room=f"userId_{other_user_id}")

                return chat_info, 200  # return the newly created chat info


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
        # self.app.run(debug=True)
        socketio.run(self.app, debug=True)
        print("Backend started")


if __name__ == '__main__':
    chat_app = ChatApplication()
    chat_app.run()
