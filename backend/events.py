from flask_socketio import join_room, leave_room, send

from extensions import socketio

@socketio.on("connect")
def handle_connect():
    print("Client connected!")

@socketio.on('user-join')
def on_join(data):
    username = data['username']
    room = "userID_" + str(data['room'])
    join_room(room)
    print(f"{username} has joined the room {room}.")

@socketio.on('chat-join')
def on_join(data):
    username = data['username']
    room = "chatID_" + str(data['room'])
    join_room(room)
    print(f"{username} has joined the room {room}.")

@socketio.on('user-leave')
def on_leave(data):
    username = data['username']
    room = "userID_" + str(data['room'])
    leave_room(room)
    print(f"{username} has left the room {room}.")

@socketio.on('chat-leave')
def on_leave(data):
    username = data['username']
    room = "chatID_" + str(data['room'])
    leave_room(room)
    print(f"{username} has left the room {room}.")

@socketio.on("new-message")
def handle_new_message(data):
    print(f"New message received from {data['userID']}!")
    room = "chatID_" + str(data['chatID'])
    send(data, room=room)