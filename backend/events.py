from flask_socketio import join_room, leave_room, send
from extensions import socketio


# Global variable to store the chatApp object
chatApp = None

def initEventHandler(app):
    global chatApp
    chatApp = app

@socketio.on("connect")
def handle_connect():
    print("Client connected!")

@socketio.on('user-join')
def on_user_join(data):
    userID = data['userID']
    room = "userID_" + str(data['room'])
    join_room(room)
    print(f"{userID} has joined the room {room}.")

@socketio.on('chat-join')
def on_chat_join(data):
    userID = data['userID']
    room = "chatID_" + str(data['room'])
    join_room(room)
    print(f"{userID} has joined the room {room}.")

@socketio.on('user-leave')
def on_user_leave(data):
    userID = data['userID']
    room = "userID_" + str(data['room'])
    leave_room(room)
    print(f"{userID} has left the room {room}.")

@socketio.on('chat-leave')
def on_chat_leave(data):
    userID = data['userID']
    room = "chatID_" + str(data['room'])
    leave_room(room)
    print(f"{userID} has left the room {room}.")

@socketio.on("new-message")
def handle_new_message(data):
    print(f"New message from user {data['senderID']} in chatID {data['chatID']}")
    room = "chatID_" + str(data['chatID'])
    
    # Query the latest message in the chat and increment the message number
    # TODO: get rid of this hack and order by timestamp on client side
    lastMessage = chatApp.ChatMessage.query.filter_by(chatID=data['chatID']) \
        .order_by(chatApp.ChatMessage.messageNumber.desc()).first()

    if lastMessage is None:
        newMessageNumber = 0
    else:
        newMessageNumber = lastMessage.messageNumber + 1
    
    data['messageNumber'] = newMessageNumber

    add_new_message(data)
    print(data)
    send(data, room=room)

def add_new_message(data):
    chatID, messageNumber, senderID, text, topicInfo = \
        data['chatID'], data['messageNumber'], data['senderID'], data['text'], data['topicInfo']
    
    # Create a new message in the database
    newMessage = chatApp.ChatMessage(
        chatID=chatID,
        messageNumber=messageNumber,
        senderID=senderID,
        text=text,
        topicID=topicInfo['topicID'] if topicInfo else None
    )
    chatApp.db.session.add(newMessage)

    # Update the last message timestamp for chat metadata
    chatMetadata = chatApp.ChatMetadata.query.filter_by(id=chatID).first()
    if chatMetadata:
        # update the timestamp of the last message
        chatMetadata.lastMessageAt = newMessage.timestamp

        # determine which user sent the message and update their last viewed timestamp
        if senderID == chatMetadata.userCreatorID:
            chatMetadata.creatorLastViewedAt = newMessage.timestamp
        else: # user is the matched user
            chatMetadata.matchedLastViewedAt = newMessage.timestamp

        chatApp.db.session.add(chatMetadata)
    
    chatApp.db.session.commit()

    data['isoString'] = newMessage.timestamp.isoformat()