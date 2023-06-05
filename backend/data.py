# Define User and Conversation database models here
def setup_models(db):
    class User(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        username = db.Column(db.String(80), unique=True, nullable=False)

        def __repr__(self):
            return f'<User {self.username}>'


    # Define a Conversation model
    class Conversation(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        topic = db.Column(db.String(200), nullable=False)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        user = db.relationship('User', backref=db.backref('conversations', lazy=True))

        def __repr__(self):
            return f'<Conversation {self.topic}>'


    return User, Conversation
