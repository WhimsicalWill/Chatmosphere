from flask_socketio import join_room, leave_room, send

from extensions import socketio

@socketio.on("connect")
def handle_connect():
    print("Client connected!")

@socketio.on('user_join')
def on_join(data):
    username = data['username']
    room = "userId_" + str(data['room'])
    join_room(room)
    print(f"{username} has joined the room {room}.")

@socketio.on('chat_join')
def on_join(data):
    username = data['username']
    room = "chatId_" + str(data['room'])
    join_room(room)
    print(f"{username} has joined the room {room}.")

@socketio.on('user_leave')
def on_leave(data):
    username = data['username']
    room = "userId_" + str(data['room'])
    leave_room(room)
    print(f"{username} has left the room {room}.")

@socketio.on('chat_leave')
def on_leave(data):
    username = data['username']
    room = "chatId_" + str(data['room'])
    leave_room(room)
    print(f"{username} has left the room {room}.")

@socketio.on("new_message")
def handle_new_message(data):
    print(f"New message received from {data['userId']}!")
    room = "chatId_" + str(data['chatId'])
    send(data, room=room)