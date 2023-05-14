import os
import json

from flask import Flask, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Resource, Api
from flask_cors import CORS

from matching import ConversationMatcher, ConversationSegway


class ChatApplication:
    def __init__(self):
        self.app = Flask(__name__)
        self.configure_app()
        self.setup_database()
        self.setup_models()
        self.setup_conversation_handler()
        self.setup_resources()

    def configure_app(self):
        CORS(self.app)
        self.api = Api(self.app)
        self.db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        os.makedirs(self.db_dir, exist_ok=True)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(self.db_dir, 'test.db')

    def setup_database(self):
        self.db = SQLAlchemy(self.app)

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
                if topic:
                    similar_convs = matcher.get_similar_conversations(topic)
                    print(f"Similar conversations:\n{similar_convs}")
                    segway_response = segway.get_response(topic, similar_convs)
                    return {'similar_conversations': similar_convs, 'segway_response': segway_response}, 200
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


        self.api.add_resource(UserResource, '/user/<int:user_id>')
        self.api.add_resource(ConversationResource, '/conversation/<int:conversation_id>')
        self.api.add_resource(BotResponseResource, '/bot-response')

    def setup_conversation_handler(self):
        self.matcher = ConversationMatcher(k=3)
        with open(os.path.join(self.db_dir, 'mock_convs.json')) as f:
            data = json.load(f)  # TODO: Load from actual SQL database
        self.matcher.add_conversations([conv['topic'] for conv in data['conversations']])
        self.segway = ConversationSegway()

    def run(self):
        with self.app.app_context():
            self.db.create_all()  # Creates the database tables
        self.app.run(debug=True)
        print("Backend started")


if __name__ == '__main__':
    chat_app = ChatApplication()
    chat_app.run()
