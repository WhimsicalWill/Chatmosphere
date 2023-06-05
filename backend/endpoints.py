from flask_restful import Resource
from flask import request


# Define API endpoints here
def setup_endpoints(app, socketio):

    class NextChatIdResource(Resource):
        def get(self):
            next_id = app.get_next_chat_id()  # Retrieve the next chat id
            return {'nextChatId': next_id}, 200


    class NextUserIdResource(Resource):
        def get(self):
            next_id = app.get_next_user_id()  # Retrieve the next chat id
            return {'nextUserId': next_id}, 200


    class CreateChatResource(Resource):
        def post(self):
            data = request.get_json()
            other_user_id = data.get('otherUserId')
            topic_id = int(data.get('topicId'))
            chat_name = data.get('chatName')
            topic_name = app.matcher.conversations[topic_id]

            print("Creating new chat...")
            new_chat_id = app.get_next_chat_id()
            chat_info = {"chatId": new_chat_id, "chatName": chat_name, "topicName": topic_name}
            socketio.emit('new_chat', chat_info, room=f"userId_{other_user_id}")

            return chat_info, 200


    # Define your API resources
    class UserResource(Resource):
        def get(self, user_id):
            user = app.User.query.get(user_id)
            if user:
                return {'username': user.username}
            else:
                return {"error": "User not found"}, 404


    class ConversationResource(Resource):
        def get(self, conversation_id):
            conversation = app.Conversation.query.get(conversation_id)
            if conversation:
                return {'topic': conversation.topic, 'username': conversation.user.username}, 200
            else:
                return {"error": "Conversation not found"}, 404


    class BotResponseResource(Resource):
        def get(self):
            topic = request.args.get('topic')
            user_id = int(request.args.get('userId'))
            if topic:
                conv_matches = app.matcher.get_similar_conversations(topic, user_id)
                segway_response = app.segway.get_response(topic, conv_matches)
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
                app.matcher.add_conversations([topic])
                return {'message': 'New conversation added'}
            else:
                return {"error": "No topic provided"}, 400


    return CreateChatResource, NextChatIdResource, NextUserIdResource, UserResource, ConversationResource, BotResponseResource