# Define User and Conversation database models here
def setupModels(db):

    class User(db.Model):
        __tablename__ = 'users'

        id = db.Column(db.Integer, primary_key=True)
        username = db.Column(db.String(64), unique=True, nullable=False)
        # bio = db.Column(db.String(256), nullable=True)
        # profilePic = db.Column(db.String(256), nullable=True)


    class Topic(db.Model):
        __tablename__ = 'topics'

        id = db.Column(db.Integer, primary_key=True)
        userID = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        title = db.Column(db.String(512), nullable=False)

        user = db.relationship('User', backref=db.backref('topics', lazy=True))


    class ChatMetadata(db.Model):
        __tablename__ = 'chatmetadata'

        id = db.Column(db.Integer, primary_key=True)  # changed from chat_id to id
        creatorTopicID = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
        matchedTopicID = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
        userCreatorID = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        userMatchedID = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        # lastMessage = db.Column(db.String(256), nullable=True)


    class Chat(db.Model):
        __tablename__ = 'chat'

        id = db.Column(db.Integer, primary_key=True)  # changed from chat_id to id
        chatID = db.Column(db.Integer, db.ForeignKey('chatmetadata.id'), nullable=False)
        timestamp = db.Column(db.DateTime, default=db.func.current_timestamp(), nullable=False)
        senderID = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        text = db.Column(db.String(1024), nullable=False)

        chatmetadata = db.relationship('ChatMetadata', backref=db.backref('chats', lazy=True))

    return User, Topic, ChatMetadata, Chat
