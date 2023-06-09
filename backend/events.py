from flask_socketio import join_room, leave_room, send

from extensions import socketio

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
    send(data, room=room)