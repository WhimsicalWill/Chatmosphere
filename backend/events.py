from flask_socketio import join_room, leave_room, send

from extensions import socketio

@socketio.on("connect")
def handle_connect():
    print("Client connected!")

@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    print(f"{username} has joined the room {room}.")
    # send(f'{username} has entered the room.', room=room)

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    print(f"{username} has left the room {room}.")
    # send(f'{username} has left the room.', room=room)

@socketio.on("new_message")
def handle_new_message(data):
    print(f"New message received from {data['userId']}!")
    send(data, room=data['room'])

# How to use on the frontend:
# const socket = io.connect('http://localhost:5000');
# socket.emit('join', { username: 'Alice', room: 'chatroom1' });
# socket.emit('leave', { username: 'Alice', room: 'chatroom1' });
# socket.emit('message', { username: 'Alice', room: 'chatroom1', message: 'Hello, everyone!' });
