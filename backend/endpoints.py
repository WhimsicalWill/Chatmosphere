from datetime import datetime, timezone

from flask_restful import Resource, reqparse
from flask import request
from sqlalchemy import or_

def setupEndpoints(chatApp, api, socketio):

    class NextUserIDResource(Resource):
        def get(self):
            nextID = chatApp.getNextUserID()  # Retrieve the next user id
            return {'nextUserID': nextID}, 200


    class CreateUserResource(Resource):
        def post(self):
            # POST method to create new user
            # Create new user instance and add to the database
            newUser = chatApp.User()
            chatApp.db.session.add(newUser)
            chatApp.db.session.commit()

            return {'uuid': newUser.id }, 201


    class UserResource(Resource):
        def get(self, userID):
            user = chatApp.User.query.get(userID)
            if user:
                return {'username': user.username}, 200
            else:
                return {'error': 'chatApp.User not found'}, 404

        def delete(self, userID):
            # DELETE method to delete user
            user = chatApp.User.query.get(userID)
            if not user:
                return {'error': 'chatApp.User not found'}, 404

            chatApp.db.session.delete(user)
            chatApp.db.session.commit()

            return {'message': f'chatApp.User {user.username} was deleted'}, 200


    class UserTopicResource(Resource):
        def get(self, userID):
            topics = chatApp.Topic.query.filter_by(userID=userID).all()
            if not topics:
                return {'error': 'No topics found for this user'}, 404

            return [{'id': topic.id, 'title': topic.title} for topic in topics], 200

        def post(self, userID):
            # POST method to create new topic for user
            parser = reqparse.RequestParser()
            parser.add_argument('title', required=True, help="title cannot be blank!")
            args = parser.parse_args()

            # user = chatApp.User.query.get(userID)
            # if not user:
            #     return {'error': 'User not found'}, 404

            newTopic = chatApp.Topic(
                userID=userID, 
                title=args['title'], 
            )
            chatApp.db.session.add(newTopic)
            chatApp.db.session.commit()

            # add the topic to the matcher list
            chatApp.matcher.addTopic(newTopic.id, userID, args['title'])

            return {'id': newTopic.id}, 201


    class TopicResource(Resource):
        def get(self, topicID):
            topic = chatApp.Topic.query.get(topicID)
            if not topic:
                return {'error': 'Topic not found'}, 404

            return {'title': topic.title, 'userID': topic.userID}, 200

        def delete(self, topicID):
            # DELETE method to delete topic
            topic = chatApp.Topic.query.get(topicID)
            if not topic:
                return {'error': 'Topic not found'}, 404

            chatApp.db.session.delete(topic)
            chatApp.db.session.commit()
            return {'message': f'Topic {topic.id} was deleted'}, 200


    class CreateChatResource(Resource):
        def post(self):
            print('Creating new chat...')
            parser = reqparse.RequestParser()
            parser.add_argument('creatorTopicID', type=int, required=True, help="Creator topic id cannot be blank!")
            parser.add_argument('matchedTopicID', type=int, required=True, help="Matched topic id cannot be blank!")
            parser.add_argument('userCreatorID', type=str, required=True, help="User creator id cannot be blank!")
            parser.add_argument('userMatchedID', type=str, required=True, help="User matched id cannot be blank!")
            args = parser.parse_args()

            newMetadata = chatApp.ChatMetadata(
                creatorTopicID=args['creatorTopicID'],
                matchedTopicID=args['matchedTopicID'],
                userCreatorID=args['userCreatorID'],
                userMatchedID=args['userMatchedID']
            )
            chatApp.db.session.add(newMetadata)
            chatApp.db.session.commit()

            chatInfo = {
                'chatID': newMetadata.id,
                'creatorTopicID': newMetadata.creatorTopicID,
                'matchedTopicID': newMetadata.matchedTopicID,
                'userCreatorID': newMetadata.userCreatorID,
                'userMatchedID': newMetadata.userMatchedID,
            }

            print(f"Sending new chat info to userID_{newMetadata.userCreatorID}...")
            socketio.emit('new-chat', chatInfo, room=f"userID_{newMetadata.userCreatorID}")

            return chatInfo, 201


    class TopicChatMetadataResource(Resource):
        def get(self, topicID):
            chatMetadataList = chatApp.ChatMetadata.query.filter(
                or_(chatApp.ChatMetadata.creatorTopicID == topicID,
                    chatApp.ChatMetadata.matchedTopicID == topicID
                )
            ).all()

            if not chatMetadataList:
                return {'error': 'Chat metadata not found'}, 404

            chatInfoList = []
            for chatMetadata in chatMetadataList:
                chatInfo = {
                    'chatID': chatMetadata.id,
                    'creatorTopicID': chatMetadata.creatorTopicID,
                    'matchedTopicID': chatMetadata.matchedTopicID,
                    'userCreatorID': chatMetadata.userCreatorID,
                    'userMatchedID': chatMetadata.userMatchedID,
                    'creatorLastViewedAt': chatMetadata.creatorLastViewedAt.isoformat() if chatMetadata.creatorLastViewedAt else None,
                    'matchedLastViewedAt': chatMetadata.matchedLastViewedAt.isoformat() if chatMetadata.matchedLastViewedAt else None,
                    'lastMessageTimestamp': chatMetadata.lastMessageTimestamp.isoformat() if chatMetadata.lastMessageTimestamp else None,
                }
                chatInfoList.append(chatInfo)

            return chatInfoList, 200


    class ChatMessagesResource(Resource):
        def get(self, chatID):
            messageList = chatApp.ChatMessage.query.filter_by(chatID=chatID).all()
            if not messageList:
                return {'error': 'No chats found for this metadata'}, 404
            
            messageInfoList = []
            for message in messageList:
                messageInfo = {
                    'id': message.id,
                    'messageNumber': message.messageNumber,
                    'senderID': message.senderID,
                    'text': message.text,
                    'timestamp': message.timestamp.isoformat(),
                    'topicID': message.topicID,
                }
                messageInfoList.append(messageInfo)

            return messageInfoList

        def post(self, chatID):
            parser = reqparse.RequestParser()  
            parser.add_argument('senderID', required=True, help="Sender id cannot be blank!")
            parser.add_argument('text', required=True, help="Text cannot be blank!")
            args = parser.parse_args()

            newChat = chatApp.ChatMessage(
                chatID=chatID, 
                senderID=args['senderID'], 
                text=args['text']
            )
            chatApp.db.session.add(newChat)
            chatApp.db.session.commit()

            return {'id': newChat.id}, 201

        def delete(self, chatID):
            chat = chatApp.ChatMessage.query.filter_by(chatID=chatID).all()
            if not chat:
                return {'error': 'Chat message not found'}, 404

            chatApp.db.session.delete(chat)
            chatApp.db.session.commit()
            return {'message': 'Chat message was deleted'}, 200

    class LastViewedTimestamp(Resource):
        def post(self):
            parser = reqparse.RequestParser()  
            parser.add_argument('chatID', required=True, help="Sender id cannot be blank!")
            parser.add_argument('userID', required=True, help="Text cannot be blank!")
            args = parser.parse_args()

            chatMetadata = chatApp.ChatMetadata.query.filter_by(id=args['chatID']).first()
            if args['userID'] == chatMetadata.userCreatorID:
                chatMetadata.creatorLastViewedAt = datetime.now(timezone.utc)
            else: # user is the matched user
                chatMetadata.matchedLastViewedAt =  datetime.now(timezone.utc)
            
            chatApp.db.session.add(chatMetadata)
            chatApp.db.session.commit()


    class BotResponseResource(Resource):
        def get(self):
            topic = request.args.get('topic')
            userID = request.args.get('userID')
            if topic:
                topicMatches = chatApp.matcher.getSimilarTopics(topic, userID)
                return {'topicMatches': topicMatches}, 200
            else:
                return {'error': 'No topic provided'}, 400

    api.add_resource(NextUserIDResource, '/next-user-id')
    # TODO: get rid of the NextID resources above
    api.add_resource(CreateUserResource, '/create-user')
    api.add_resource(UserResource, '/users/<string:userID>')
    api.add_resource(UserTopicResource, '/user-topics/<string:userID>')
    api.add_resource(TopicResource, '/topics/<int:topicID>')
    api.add_resource(CreateChatResource, '/create-chat')
    api.add_resource(TopicChatMetadataResource, '/chatmetadata/<int:topicID>')
    api.add_resource(ChatMessagesResource, '/chats/<int:chatID>')
    api.add_resource(LastViewedTimestamp, '/update-timestamp')
    api.add_resource(BotResponseResource, '/bot-response')