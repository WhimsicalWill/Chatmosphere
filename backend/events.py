from flask_socketio import join_room, leave_room, send
from extensions import socketio


# Create a global variable to store the chatApp object
chatApp = None

def initEventHandler(app):
    global chatApp
    chatApp = app

@socketio.on("connect")
def handle_connect():
    print("Client connected!")

@socketio.on('user-join')
def on_user_join(data):
    print(data)
    userID = data['userID']
    room = "userID_" + str(data['room'])
    join_room(room)
    print(f"{userID} has joined the room {room}.")

@socketio.on('chat-join')
def on_chat_join(data):
    print(data)
    userID = data['userID']
    room = "chatID_" + str(data['room'])
    join_room(room)
    print(f"{userID} has joined the room {room}.")

@socketio.on('user-leave')
def on_leave(data):
    userID = data['userID']
    room = "userID_" + str(data['room'])
    leave_room(room)
    print(f"{userID} has left the room {room}.")

@socketio.on('chat-leave')
def on_leave(data):
    userID = data['userID']
    room = "chatID_" + str(data['room'])
    leave_room(room)
    print(f"{userID} has left the room {room}.")

@socketio.on("new-message")
def handle_new_message(data):
    print(f"New message from user {data['senderID']} in chatID {data['chatID']}")
    room = "chatID_" + str(data['chatID'])
    data['id'], data['timestamp'] = add_new_message(
        data['chatID'], 
        data['senderID'],
        data['text']
    )
    send(data, room=room)

def add_new_message(chatID, senderID, text):
    newMessage = chatApp.ChatMessage(
        chatID=chatID,
        senderID=senderID,
        text=text
    )
    chatApp.db.session.add(newMessage)
    chatApp.db.session.commit()

    return newMessage.id, newMessage.timestamp