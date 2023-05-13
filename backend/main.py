import os
import json

from flask import Flask, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Resource, Api
from flask_cors import CORS

from matching import ConversationMatcher


# Create the Flask app
app = Flask(__name__)
CORS(app)
api = Api(app)
db_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(db_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(db_dir, 'test.db')
db = SQLAlchemy(app)

# Load the conversations into the ConversationMatcher
matcher = ConversationMatcher(k=2)  # Change k to whatever value you want
with open(os.path.join(db_dir, 'mock_convs.json')) as f:
    data = json.load(f)  # TODO: Load from actual SQL database
matcher.add_conversations([conv['topic'] for conv in data['conversations']])


# Define a User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

# Define a Conversation model
class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('conversations', lazy=True))

    def __repr__(self):
        return f'<Conversation {self.topic}>'

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
            return {'topic': conversation.topic, 'username': conversation.user.username}
        else:
            return {"error": "Conversation not found"}, 404


class SimilarConversationResource(Resource):
    def get(self):
        topic = request.args.get('topic')
        if topic:
            similar_convs = matcher.get_similar_conversations(topic)
            return {'similar_conversations': similar_convs}
        else:
            return {"error": "No topic provided"}, 400

    def post(self):
        topic = request.args.get('topic')
        if topic:
            # new_conversation = Conversation(topic=topic)
            # db.session.add(new_conversation)
            # db.session.commit()
            matcher.add_conversations([topic])
            return {'message': 'New conversation added'}
        else:
            return {"error": "No topic provided"}, 400


# Add the API resources
api.add_resource(SimilarConversationResource, '/similar-conversations')
api.add_resource(UserResource, '/user/<int:user_id>')
api.add_resource(ConversationResource, '/conversation/<int:conversation_id>')


if __name__ == '__main__':
    # Create the database and run the app
    with app.app_context():
        db.create_all()  # Creates the database tables
    app.run(debug=True)
    print("Backend started")