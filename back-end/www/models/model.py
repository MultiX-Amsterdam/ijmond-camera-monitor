"""Database model for the application."""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from util.util import get_current_time


# Set the naming convention for database columns
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# Initalize app with database
db = SQLAlchemy(metadata=MetaData(naming_convention=convention))

# Label set variables
# Check the label_state_machine function in label_operations.py for details
pos_labels = [0b10111, 0b1111, 0b10011]
neg_labels = [0b10000, 0b1100, 0b10100]
pos_gold_labels = [0b101111]
neg_gold_labels = [0b100000]
gold_labels = pos_gold_labels + neg_gold_labels
maybe_pos_labels = [0b101]
maybe_neg_labels = [0b100]
discorded_labels = [0b11]
bad_labels = [-2]


class User(db.Model):
    """
    Class representing a user.

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    register_time : datetime
        A timestamp indicating when the user is created.
    client_id : str
        A unique identifier provided by the front-end client.
        This is typically provided by the client using Google Analytics (GA).
        If GA fails to give the ID, a random string is generated by the client instead.
        If the user signed in using a Google account, the client id will be the Google ID.
    client_type : int
        The current type of the user (the history of client type changes is in the Connection table).
        0 => admin.
        1 => expert.
        2 => amateur.
        3 => laypeople.
        -1 => banned user.
    score : int
        The score that the user obtained so far.
        It means the number of effectively labeled videos that passed the system's check.
        A high score also means that the user is reliable.
    raw_score : int
        The raw score that the user obtained so far.
        It means the number of unlabeled video that the user went through so far.
        A high raw score also means that the user frequently participate in labeling.
    best_tutorial_action : int
        The best action_type in the tutorial table.
        -1 => did not take the tutorial.
        0 => took the tutorial.
        1 => did not pass the last batch in the tutorial.
        2 => passed the last batch (16 videos) during the third try with hints.
        3 => passed the last batch during the second try after showing the answers.
        4 => passed the last batch (16 videos) in the tutorial during the first try.
    """
    id = db.Column(db.Integer, primary_key=True)
    register_time = db.Column(db.Integer, default=get_current_time())
    client_id = db.Column(db.String(255), unique=True, nullable=False)
    client_type = db.Column(db.Integer, nullable=False, default=3)
    score = db.Column(db.Integer, nullable=False, default=0)
    raw_score = db.Column(db.Integer, nullable=False, default=0)
    best_tutorial_action = db.Column(db.Integer, nullable=False, default=-1)
    # Relationships
    label = db.relationship("Label", backref=db.backref("user", lazy=True), lazy=True)
    connection = db.relationship("Connection", backref=db.backref("user", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<User id=%r register_time=%r client_id=%r client_type=%r score=%r "
            "raw_score=%r best_tutorial_action=%r>"
        ) % (
            self.id, self.register_time, self.client_id, self.client_type, self.score,
            self.raw_score, self.best_tutorial_action
        )


class Video(db.Model):
    """
    Class representing a video.

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    file_name : str
        The video file name that is stored in the computer.
    start_time : int
        The starting epochtime (in seconds) of the video clip.
    end_time : int
        The ending epochtime (in seconds) of the video clip.
    url_part : str
        The URL part of the panorama video that contains the video clip.
    label_state : int
        The state of the label, contributed by normal users (client type 1).
        Also enable database indexing on this column for fast lookup.
    label_state_admin : int
        The state of the label, contributed by the admin researcher (client type 0).
        Using label_state_admin allows the system to compare researcher and citizen labels.
    label_update_time : int
        The most recent epochtime (in seconds) that the label state is updated.
        Notice that this is only for the normal users (label_state, not label_state_admin).
    view_id : int
        ID of the view within the same camera.
    camera_id : int
        ID of the camera.
    """
    id = db.Column(db.Integer, primary_key=True)
    file_name = db.Column(db.String(255), unique=True, nullable=False)
    start_time = db.Column(db.Integer, nullable=False)
    end_time = db.Column(db.Integer)
    url_part = db.Column(db.String(768), nullable=False)
    label_state = db.Column(db.Integer, nullable=False, default=-1, index=True)
    label_state_admin = db.Column(db.Integer, nullable=False, default=-1, index=True)
    label_update_time = db.Column(db.Integer)
    view_id = db.Column(db.Integer, nullable=False, default=-1)
    camera_id = db.Column(db.Integer, nullable=False, default=-1)
    # Relationships
    label = db.relationship("Label", backref=db.backref("video", lazy=True), lazy=True)
    view = db.relationship("View", backref=db.backref("video", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<Video id=%r file_name=%r start_time=%r end_time=%r url_part=%r "
            "label_state=%r, label_state_admin=%r, label_update_time=%r view_id=%r "
            "camera_id=%r>"
        ) % (
            self.id, self.file_name, self.start_time, self.end_time, self.url_part,
            self.label_state, self.label_state_admin, self.label_update_time, self.view_id,
            self.camera_id
        )


class Label(db.Model):
    """
    Class representing a video label.

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    video_id : int
        The video ID in the Video table (foreign key).
    label : int
        The user-provided label for the video.
    time : int
        The epochtime (in seconds) when the user created the label record.
    user_id : int
        The user ID in the User table (foreign key).
        This information is duplicated also in the batch->connnection, for fast query.
    batch_id : int
        The batch ID in the Batch table (foreign key).
        A null batch ID means that an admin changed the label and created a record.
    """
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey("video.id"), nullable=False)
    label = db.Column(db.Integer, nullable=False)
    time = db.Column(db.Integer, nullable=False, default=get_current_time())
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    batch_id = db.Column(db.Integer, db.ForeignKey("batch.id"))

    def __repr__(self):
        return (
            "<Label id=%r video_id=%r label=%r time=%r user_id=%r batch_id=%r>"
        ) % (
            self.id, self.video_id, self.label, self.time, self.user_id, self.batch_id
        )


class Connection(db.Model):
    """
    Class representing a user connection (for tracking user sessions).

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    time : int
        The epochtime (in seconds) when the user connects to the server.
    client_type : int
        The current client type of the user.
        Notice that the client type may change over time.
    user_id : int
        The user ID in the User table (foreign key).
        This indicates the user who connected to the server.
    """
    id = db.Column(db.Integer, primary_key=True)
    time = db.Column(db.Integer, nullable=False, default=get_current_time())
    client_type = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    # Relationships
    batch = db.relationship("Batch", backref=db.backref("connection", lazy=True), lazy=True)
    view = db.relationship("View", backref=db.backref("connection", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<Connection id=%r time=%r client_type=%r user_id=%r>"
        ) % (
            self.id, self.time, self.client_type, self.user_id
        )


class Batch(db.Model):
    """
    Class representing a video batch (for tracking issued video batches).

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    request_time : int
        The epochtime (in seconds) when the client requested a batch with many videos.
    return_time : int
        The epochtime (in seconds) when the client returned a video batch with labels.
    connection_id : int
        The connection ID in the Connection table (foreign key).
    score : int
        The score that the user obtained in this Batch (number of labeled videos).
        A null score means that no data is returned by the user, or the user is a reseacher.
    num_unlabeled : int
        The number of unlabeled videos in this batch.
    num_gold_standard : int
        The number of gold standards (i.e., videos with known labels) in this batch.
    user_score : int
        Current score of the user (User.score).
    user_raw_score : int
        Current raw score of the user (User.raw_score).
    """
    id = db.Column(db.Integer, primary_key=True)
    request_time = db.Column(db.Integer, nullable=False, default=get_current_time())
    return_time = db.Column(db.Integer)
    connection_id = db.Column(db.Integer, db.ForeignKey("connection.id"))
    score = db.Column(db.Integer)
    num_unlabeled = db.Column(db.Integer, nullable=False, default=0)
    num_gold_standard = db.Column(db.Integer, nullable=False, default=0)
    user_score = db.Column(db.Integer)
    user_raw_score = db.Column(db.Integer)
    # Relationships
    label = db.relationship("Label", backref=db.backref("batch", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<Batch id=%r request_time=%r return_time=%r connection_id=%r "
            "score=%r num_unlabeled=%r num_gold_standard=%r "
            "user_score=%r user_raw_score=%r>"
        ) % (
            self.id, self.request_time, self.return_time, self.connection_id,
            self.score, self.num_unlabeled, self.num_gold_standard,
            self.user_score, self.user_raw_score
        )


class View(db.Model):
    """
    Class representing a view of a video (for tracking viewed videos).

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    connection_id : int
        The connection ID in the Connection table (foreign key).
    video_id : int
        The video ID in the Video table (foreign key).
    query_type : int
        The query type about how the client requested the video.
        0 => query by label state.
        1 => query by user id.
    time : int
        The epochtime (in seconds) when the view is added.
    """
    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(db.Integer, db.ForeignKey("connection.id"), nullable=False)
    video_id = db.Column(db.Integer, db.ForeignKey("video.id"), nullable=False)
    query_type = db.Column(db.Integer, nullable=False)
    time = db.Column(db.Integer, default=get_current_time())

    def __repr__(self):
        return (
            "<View id=%r connection_id=%r video_id=%r query_type=%r time=%r>"
        ) % (
            self.id, self.connection_id, self.video_id, self.query_type, self.time
        )

class Achievement(db.Model):
    """
    Class representing an achievement.
    
    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    name : str
        The name of the achievement.
    description : str
        A short description of the achievement.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f"<Achievement id={self.id}, name={self.name}, description={self.description}>"

class AchievementRecords(db.Model):
    """
    Class representing the achievements earned by users.
    
    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    user_id : int
        The user ID in the User table (foreign key).
    achievement_id : int
        The achievement ID in the Achievement table (foreign key).
    date: date
        Date of receiving the achievement.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)

    user = db.relationship('User', backref=db.backref('achievement_users', lazy=True))
    achievement = db.relationship('Achievement', backref=db.backref('achievement_users', lazy=True))

    def __repr__(self):
        return f"<AchievementUser id={self.id}, user_id={self.user_id}, achievement_id={self.achievement_id}, date={self.date}>"

class Season(db.Model):
    """
    Class representing the labeling game's season. The start and the end is specified by the user, and through this period
    users can earn scores and compete for the achievement of the season's champion.
    
    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    start_date : int
        The epochtime (in seconds) of the start date of the season.
    end_date : int
        The epochtime (in seconds) of the end date of the season.
    """
    id = db.Column(db.Integer, primary_key=True)
    start_date = db.Column(db.Integer, nullable=False)
    end_date = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return f"<Season id={self.id}, start_date={self.start_date}, end_date={self.end_date}>"

class SeasonScore(db.Model):
    """
    Class representing the labeling game season's score earned by labelling in a specific season.
    
    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    season_id : int
        The ID of the season at the moment (foreign key).
    user_id : int
        The user ID in the User table (foreign key).
    score : int
        The achievement ID in the Achievement table (foreign key).
    raw_score : int
        The achievement ID in the Achievement table (foreign key).
    """
    id = db.Column(db.Integer, primary_key=True)
    season_id = db.Column(db.Integer, db.ForeignKey('season.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    raw_score = db.Column(db.Integer, default=0)
    score = db.Column(db.Integer, default=0)

    season = db.relationship('Season', backref=db.backref('season_score', lazy=True))
    user = db.relationship('User', backref=db.backref('season_score', lazy=True))

    def __repr__(self):
        return f"<SeasonScore season_id={self.season_id} user_id={self.user_id}, raw_score = {self.raw_score}, score={self.score}>"

class Tutorial(db.Model):
    """
    Class representing a tutorial status (for tracking if a user took or passed it).

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    connection_id : int
        The connection ID in the Connection table (foreign key).
    action_type : int
        The action type for the tutorial.
        0 => took the tutorial.
        1 => did not pass the last batch in the tutorial.
        2 => passed the last batch (16 videos) during the third try with hints.
        3 => passed the last batch during the second try after showing the answers.
        4 => passed the last batch (16 videos) in the tutorial during the first try.
    query_type : int
        The query type of the tutorial.
        0 => users enter the tutorial page (may come from different sources or button clicks).
        1 => users click the tutorial button on the webpage (not the prompt dialog).
        2 => users click the tutorial button in the prompt dialog (not the webpage).
        The prompt dialog will show up if the user makes too many mistakes on gold standards.
    time : int
        The epochtime (in seconds) when the tutorial is taken or passed.
    """
    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(db.Integer, db.ForeignKey("connection.id"), nullable=False)
    action_type = db.Column(db.Integer, nullable=False)
    query_type = db.Column(db.Integer, nullable=False)
    time = db.Column(db.Integer, default=get_current_time())

    def __repr__(self):
        return (
            "<Tutorial id=%r connection_id=%r action_type=%r query_type=%r time=%r>"
        ) % (
            self.id, self.connection_id, self.action_type, self.query_type, self.time
        )

class ModelScores(db.Model):
    """
    Class representing different metrics for the model along with actual and predicted scores.

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    f1 : float
        The f1-score of the model. (0,1)
    mcc : float
        The Matthews correlation coefficient (MCC) of the model. (-1,1)
    precision: float
        The precision of the model. (0,1)
    recall: float
        The recall of the model. (0,1)
    tp : int
        The number of true positives after running the benchmark
    tn : int
        The number of true negatives after running the benchmark
    fp : int
        The number of false positives after running the benchmark
    fn : int
        The number of false negatives after running the benchmark
    date : date
        The date of the specific entry.
    """
    id = db.Column(db.Integer, primary_key=True)

    f1 = db.Column(db.Float, nullable=False)
    mcc = db.Column(db.Float, nullable=False)
    precision = db.Column(db.Float, nullable=False)
    recall = db.Column(db.Float, nullable=False)
    tp = db.Column(db.Integer, nullable = False)
    tn = db.Column(db.Integer, nullable = False)
    fp = db.Column(db.Integer, nullable = False)
    fn = db.Column(db.Integer, nullable = False)

    date = db.Column(db.Date, nullable=False)

    def __repr__(self):
        return (
            "<ModelScores id=%r f1=%r mcc=%r precision=%r recall=%r tp=%r tn=%r fp=%r fn=%r date=%r>"
        ) % (
            self.id, self.f1, self.mcc, self.precision, self.recall, self.tp, self.tn, self.fp, self.fn, self.date
        )
    
class Tasks(db.Model):
    """
    Class with the tasks and their respective IDs; useful for rescheduling (revoke the task and then reschedule it)

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    task_id : string
        The ID of the task, as obtained by Celery after scheduling it
    """
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.String(255), nullable=False)
    
    def __repr__(self):
        return (
            "<Tasks id=%r task_id=%r>"
        ) % (
            self.id, self.task_id
        )

class Games(db.Model):
    """
    Class with the games that the user has played in the Performance page

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    user_id : int
        The user ID in the User table (foreign key).
    action_type : int
        The action type for the tutorial.
        -1 => did not finish the game.
        0 => finished the game with mistakes.
        1 => finished the game with no mistakes.
    time : int
        The epochtime (in seconds) when the user starts or finishes the game. 
        The time is if they start the game if the action_type is -1
        Otherwise it means they ended the game   
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action_type = db.Column(db.Integer, nullable=False)
    time = db.Column(db.Integer, default=get_current_time())

    def __repr__(self):
        return (
            "<Games id=%r user_id=%r action_type=%r time=%r>"
        ) % (
            self.id, self.user_id, self.action_type, self.time
        )
    
class GameMistakes(db.Model):
    """
    Class that logs the mistakes a user has done at the questions while playing the quiz game(s)

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    user_id : int
        The user ID in the User table (foreign key).
    game_id : int
        The game ID in the Games table (foreign key).
    question: int
        The question number concerning that specific game.
    mistakes: int
        The number of mistakes the user has done in that question.
    time : int
        The epochtime (in seconds) when the user connects to the server.    
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    question = db.Column(db.Integer)
    mistakes = db.Column(db.Integer)
    time = db.Column(db.Integer, default=get_current_time())

    def __repr__(self):
        return (
            "<GameMistakes id=%r user_id=%r game_id=%r question=%r mistakes=%r time=%r>"
        ) % (
            self.id, self.user_id, self.game_id, self.question, self.mistakes, self.time
        )