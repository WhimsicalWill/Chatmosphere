from flask import request
from flask_socketio import emit

from extensions import socketio

users = {}

@socketio.on("connect")
def handle_connect():
    print("Client connected!")

@socketio.on("user_join")
def handle_user_join(username):
    print(f"User {username} joined!")
    users[username] = request.sid

#   const { topicName, chatName, text, user, match } = response;
@socketio.on("new_message")
def handle_new_message(message):
    # topic and chat name determine the room

    # broadcast a new chat message to all users in the room

    # should the AI response also be handled this way?
    # answer: yes, because this script will also handle adding to db
    # and handling everything in one place simplifies logic

    print(f"New message: {message}")
    username = None 
    for user in users:
        if users[user] == request.sid:
            username = user
    emit("chat", {"message": message, "username": username}, broadcast=True)