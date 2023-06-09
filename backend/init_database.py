import json
from main import ChatApplication


def loadData(dataPath):
    with open(dataPath, 'r') as f:
        data = json.load(f)
    return data['conversations']

def initDatabase(chatApp, dataPath):
    data = loadData(dataPath)
    for conv in data:
        topic = chatApp.Topic(userID=conv['userID'], title=conv['title'])
        chatApp.db.session.add(topic)
    chatApp.db.session.commit()
    print(f"Database initialized with data from {dataPath}")

if __name__ == '__main__':
    # this iniitializes the chat app, and allows us to access data models
    chatApp = ChatApplication()
    dataPath = 'data/mock_convs.json'
    with chatApp.app.app_context():
        chatApp.db.drop_all() # This deletes all existing data
        chatApp.db.create_all()
        initDatabase(chatApp, dataPath)
