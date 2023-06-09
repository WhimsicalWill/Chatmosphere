from flask_restful import Resource, reqparse
from flask import request
from sqlalchemy import or_

def setupEndpoints(chatApp, api, socketio):

    class NextUserIDResource(Resource):
        def get(self):
            nextID = chatApp.getNextUserID()  # Retrieve the next user id
            return {'nextUserID': nextID}, 200


    class UserResource(Resource):
        def get(self, userID):
            user = chatApp.User.query.get(userID)
            if user:
                return {'username': user.username}, 200
            else:
                return {'error': 'chatApp.User not found'}, 404

        def post(self):
            # POST method to create new user
            parser = reqparse.RequestParser()  
            parser.add_argument('username', required=True, help="Username cannot be blank!")
            args = parser.parse_args()

            # Check if user already exists
            user = chatApp.User.query.filter_by(username=args['username']).first()
            if user:
                return {'message': f'A user with username {args["username"]} already exists'}, 400

            # Create new user instance and add to the database
            newUser = chatApp.User(username=args['username'])
            chatApp.db.session.add(newUser)
            chatApp.db.session.commit()

            return {'message': f'chatApp.User {args["username"]} was created'}, 201

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

            return {'id': newTopic.id}, 201


    class TopicResource(Resource):
        def get(self, topicID):
            topic = chatApp.Topic.query.get(topicID)
            if not topic:
                return {'error': 'Topic not found'}, 404

            return {'id': topic.id, 'title': topic.title}, 200

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
            parser.add_argument('userCreatorID', type=int, required=True, help="User creator id cannot be blank!")
            parser.add_argument('userMatchedID', type=int, required=True, help="User matched id cannot be blank!")
            args = parser.parse_args()

            newMetadata = chatApp.ChatMetadata(
                creatorTopicID=args['creatorTopicID'],
                matchedTopicID=args['matchedTopicID'],
                userCreatorID=args['userCreatorID'],
                userMatchedID=args['userMatchedID']
            )
            chatApp.db.session.add(newMetadata)
            chatApp.db.session.commit()

            chatInfo = {'chatID': newMetadata.id,
                        'creatorTopicID': newMetadata.matchedTopicID,
                        'matchedTopicID': newMetadata.matchedTopicID,
                        'userCreatorID': newMetadata.userCreatorID,
                        'userMatchedID': newMetadata.userMatchedID,
            }

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
                chatInfo = {'chatID': chatMetadata.id,
                            'creatorTopicID': chatMetadata.creatorTopicID,
                            'matchedTopicID': chatMetadata.matchedTopicID,
                            'userCreatorID': chatMetadata.userCreatorID,
                            'userMatchedID': chatMetadata.userMatchedID,
                }
                chatInfoList.append(chatInfo)

            return chatInfoList, 200


    class NewMessageResource(Resource):
        def post(self):
            parser = reqparse.RequestParser()  
            parser.add_argument('chatID', required=True, help="Chat id cannot be blank!")
            parser.add_argument('senderID', required=True, help="Sender id cannot be blank!")
            parser.add_argument('text', required=True, help="Text cannot be blank!")
            args = parser.parse_args()

            newChat = chatApp.Chat(
                chatID=args['chatID'], 
                senderID=args['senderID'], 
                text=args['text']
            )
            chatApp.db.session.add(newChat)
            chatApp.db.session.commit()

            return {'id': newChat.id}, 201


    class ChatMessagesResource(Resource):
        def get(self, chatID):
            chats = chatApp.Chat.query.filter_by(chatID=chatID).all()
            if not chats:
                return {'error': 'No chats found for this metadata'}, 404

            return [{'id': chat.id, 'timestamp': chat.timestamp, 'senderID': chat.senderID,
                    'text': chat.text} for chat in chats], 200

        def delete(self, chatID):
            chat = chatApp.Chat.query.get(chatID)
            if not chat:
                return {'error': 'Chat message not found'}, 404

            chatApp.db.session.delete(chat)
            chatApp.db.session.commit()
            return {'message': 'Chat message was deleted'}, 200


    class BotResponseResource(Resource):
        def get(self):
            topic = request.args.get('topic')
            userID = int(request.args.get('userID'))
            if topic:
                convMatches = chatApp.matcher.getSimilarConversations(topic, userID)
                segwayResponses = chatApp.segway.getResponse(topic, convMatches)
                return {'convMatches': convMatches, 'segwayResponses': segwayResponses}, 200
            else:
                return {'error': 'No topic provided'}, 400

    api.add_resource(NextUserIDResource, '/next-user-id')
    # TODO: get rid of the NextID resources above
    api.add_resource(UserResource, '/users/<int:userID>')
    api.add_resource(UserTopicResource, '/user-topics/<int:userID>')
    api.add_resource(TopicResource, '/topics/<int:topicID>')
    api.add_resource(CreateChatResource, '/create-chat')
    api.add_resource(TopicChatMetadataResource, '/chatmetadata/<int:topicID>')
    api.add_resource(ChatMessagesResource, '/chats/<int:chatID>')
    api.add_resource(NewMessageResource, '/new-message')
    api.add_resource(BotResponseResource, '/bot-response')