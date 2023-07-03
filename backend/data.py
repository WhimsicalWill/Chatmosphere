from datetime import datetime, timezone
import uuid


def setupModels(db):
    """
    Creates the SQLAlchemy models for the database
    """

    class User(db.Model):
        __tablename__ = 'users'

        id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()), unique=True, nullable=False)
        username = db.Column(db.String(64), unique=True, nullable=True)
        google_id = db.Column(db.String(255), unique=True, nullable=True)
        # bio = db.Column(db.String(256), nullable=True)
        # profilePic = db.Column(db.String(256), nullable=True)


    class Topic(db.Model):
        __tablename__ = 'topics'

        id = db.Column(db.Integer, primary_key=True)
        userID = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
        title = db.Column(db.String(512), nullable=False)

        user = db.relationship('User', backref=db.backref('topics', lazy=True))


    class ChatMetadata(db.Model):
        __tablename__ = 'chatmetadata'

        id = db.Column(db.Integer, primary_key=True)  # changed from chat_id to id
        creatorTopicID = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
        matchedTopicID = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=False)
        userCreatorID = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
        userMatchedID = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
        creatorLastViewedAt = db.Column(db.DateTime, nullable=True)
        matchedLastViewedAt = db.Column(db.DateTime, nullable=True)
        lastMessageTimestamp = db.Column(db.DateTime, nullable=True)


    class ChatMessage(db.Model):
        __tablename__ = 'chat'

        id = db.Column(db.Integer, primary_key=True)  # changed from chat_id to id
        chatID = db.Column(db.Integer, db.ForeignKey('chatmetadata.id'), nullable=False)
        messageNumber = db.Column(db.Integer, nullable=False)
        senderID = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
        text = db.Column(db.String(1024), nullable=False)
        timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)
        topicID = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=True)

        chatmetadata = db.relationship('ChatMetadata', backref=db.backref('chats', lazy=True))

    return User, Topic, ChatMetadata, ChatMessage
