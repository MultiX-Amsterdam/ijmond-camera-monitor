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

# Label states for videos (not for segmentation masks)
# Check the label_state_machine function in `label_operations.py` for details
pos_labels = [0b10111, 0b1111, 0b10011]
neg_labels = [0b10000, 0b1100, 0b10100]
pos_gold_labels = [0b101111]
neg_gold_labels = [0b100000]
gold_labels = pos_gold_labels + neg_gold_labels
maybe_pos_labels = [0b101]
maybe_neg_labels = [0b100]
discorded_labels = [0b11]
bad_labels = [-2]

# Label states for segmentation masks (not for videos)
# Check the label_state_machine function in `segmentationFeedback_operations.py` for details
pos_labels_seg = [3, 4, 9, 10, 11, 13, 15]
neg_labels_seg = [5, 12, 14]
pos_gold_labels_seg = [16, 17]
neg_gold_labels_seg = [18]
gold_labels_seg = pos_gold_labels_seg + neg_gold_labels_seg
maybe_pos_labels_seg = [0, 1, 6]
maybe_neg_labels_seg = [2]
discorded_labels_seg = [7, 8]
bad_labels_seg = [-2]
partial_labels_seg = maybe_pos_labels_seg + maybe_neg_labels_seg + discorded_labels_seg


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
    register_time = db.Column(db.Integer, default=get_current_time)
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
        Check the label_state_machine function in `label_operations.py` for details.
        Also enable database indexing on this column for fast lookup.
    label_state_admin : int
        The state of the label, contributed by the admin researcher (client type 0).
        Using label_state_admin allows the system to compare researcher and citizen labels.
        Check the label_state_machine function in `label_operations.py` for details.
        Also enable database indexing on this column for fast lookup.
    label_update_time : int
        The most recent epochtime (in seconds) that the label state is updated.
        Notice that this is only for the normal users (label_state, not label_state_admin).
    view_id : int
        ID of the view within the same camera.
        Note that this is not the key for the View table.
    camera_id : int
        ID of the camera.
        - 0 is hoogovens (hoogovens 7)
        - 1 is kooksfabriek_1 (kooksgasfabriek 1)
        - 2 is kooksfabriek_2 (kooksgasfabriek 2)
    priority : int
        The priority of the video.
        Higher priority indicates that the mask should get feedback faster.
        Larger number means higher priority (e.g., 5 has higher priority than 4)
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
    priority = db.Column(db.Integer, nullable=False, default=1)
    # Relationships
    label = db.relationship("Label", backref=db.backref("video", lazy=True), lazy=True)
    view = db.relationship("View", backref=db.backref("video", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<Video id=%r file_name=%r start_time=%r end_time=%r url_part=%r "
            "label_state=%r, label_state_admin=%r, label_update_time=%r view_id=%r "
            "camera_id=%r, priority=%r>"
        ) % (
            self.id, self.file_name, self.start_time, self.end_time, self.url_part,
            self.label_state, self.label_state_admin, self.label_update_time, self.view_id,
            self.camera_id, self.priority
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
        Also enable database indexing on this column for fast lookup.
    batch_id : int
        The batch ID in the Batch table (foreign key).
        A null batch ID means that an admin changed the label and created a record.
    """
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey("video.id"), nullable=False)
    label = db.Column(db.Integer, nullable=False)
    time = db.Column(db.Integer, nullable=False, default=get_current_time)
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
    time = db.Column(db.Integer, nullable=False, default=get_current_time)
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
    request_time = db.Column(db.Integer, nullable=False, default=get_current_time)
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
    time = db.Column(db.Integer, default=get_current_time)

    def __repr__(self):
        return (
            "<View id=%r connection_id=%r video_id=%r query_type=%r time=%r>"
        ) % (
            self.id, self.connection_id, self.video_id, self.query_type, self.time
        )


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
    time = db.Column(db.Integer, default=get_current_time)

    def __repr__(self):
        return (
            "<Tutorial id=%r connection_id=%r action_type=%r query_type=%r time=%r>"
        ) % (
            self.id, self.connection_id, self.action_type, self.query_type, self.time
        )


class SegmentationMask(db.Model):
    """
    Class representing a segmentation mask.

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    mask_file_name : str
        The grayscale segmentation mask file name that is stored in the computer.
    image_file_name : str
        The file name of the image that is stored in the computer.
    file_path : str
        The path to the file (should be unique).
    x_bbox : int
        The x coordinate of the top-left corner of the bounding box, relative to the image.
    y_bbox : int
        The y coordinate of the top-left corner of the bounding box, relative to the image.
    w_bbox : int
        Width of the bounding box, relative to the image.
    h_bbox : int
        Height of the bounding box, relative to the image.
    w_image : int
        Width of the image.
    h_image : int
        Height of the image.
    priority : int
        The priority of the segmentation mask.
        Higher priority indicates that the mask should get feedback faster.
        Larger number means higher priority (e.g., 5 has higher priority than 4)
    label_state : int
        The state of the label, contributed by normal users (client type 1).
        Check the label_state_machine function in `segmentationFeedback_operations.py` for details.
        Also enable database indexing on this column for fast lookup.
    label_state_admin : int
        The state of the label, contributed by the admin researcher (client type 0).
        Using label_state_admin allows the system to compare researcher and citizen labels.
        Check the label_state_machine function in `segmentationFeedback_operations.py` for details.
        Also enable database indexing on this column for fast lookup.
    label_update_time : int
        The most recent epochtime (in seconds) that the label state is updated.
        Notice that this is only for the normal users (label_state, not label_state_admin).
    frame_number : int
        The frame number in the video (can be null if no video is linked to this mask).
        Note that this is 1-based (i.e., the first frame is 1, not 0).
    frame_timestamp : int
        If there is no video ID, this field will have the information of the timestamp.
        The format should be epoch time in seconds.
    video_id : int
        The corresponding video ID (can be null if no video is linked to this mask)
    """
    id = db.Column(db.Integer, primary_key=True)
    mask_file_name = db.Column(db.String(255), unique=False, nullable=False)
    image_file_name = db.Column(db.String(255), unique=False, nullable=False)
    file_path = db.Column(db.String(768), unique=True, nullable=False)
    x_bbox = db.Column(db.Integer, nullable=False)
    y_bbox = db.Column(db.Integer, nullable=False)
    w_bbox = db.Column(db.Integer, nullable=False)
    h_bbox = db.Column(db.Integer, nullable=False)
    w_image = db.Column(db.Integer, nullable=False)
    h_image = db.Column(db.Integer, nullable=False)
    priority = db.Column(db.Integer, nullable=False, default=1)
    label_state = db.Column(db.Integer, nullable=False, default=-1, index=True)
    label_state_admin = db.Column(db.Integer, nullable=False, default=-1, index=True)
    label_update_time = db.Column(db.Integer, default=get_current_time)
    frame_number = db.Column(db.Integer, nullable=True)
    frame_timestamp = db.Column(db.Integer, nullable=True)
    video_id = db.Column(db.Integer, db.ForeignKey("video.id"))
    # Relationships
    feedback = db.relationship("SegmentationFeedback", backref=db.backref("segmentation_mask", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<SegmentationMask id=%r mask_file_name=%r image_file_name=%r x_bbox=%r y_bbox=%r "
            "w_bbox=%r h_bbox=%r w_image=%r h_image=%r priority=%r label_state=%r "
            "label_state_admin=%r label_update_time=%r frame_number=%r frame_timestamp=%r video_id=%r>"
        ) % (
            self.id, self.mask_file_name, self.image_file_name, self.x_bbox, self.y_bbox,
            self.w_bbox, self.h_bbox, self.w_image, self.h_image, self.priority,
            self.label_state, self.label_state_admin, self.label_update_time,
            self.frame_number, self.frame_timestamp, self.video_id
        )


class SegmentationFeedback(db.Model):
    """
    Class representing a segmentation feedback.

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    segmentation_id : int
        The segmentation mask ID in the SegmentationMask table (foreign key).
    feedback_code : int
        The feedback code from the user.
        Check the bbox_to_feedback_code function in the `segmentationFeedback_operations.py` file.
    x_bbox : int
        The x coordinate of the top-left corner of the bounding box, relative to the image.
        This is the feedback from the user.
    y_bbox : int
        The y coordinate of the top-left corner of the bounding box, relative to the image.
        This is the feedback from the user.
    w_bbox : int
        Width of the bounding box, relative to the image.
        This is the feedback from the user.
    h_bbox : int
        Height of the bounding box, relative to the image.
        This is the feedback from the user.
    frame_number : int
        The frame number in the video that the user thinks there should be a bounding box.
        Note that this is 1-based (i.e., the first frame is 1, not 0).
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
    segmentation_id = db.Column(db.Integer, db.ForeignKey("segmentation_mask.id"), nullable=False)
    feedback_code = db.Column(db.Integer, nullable=False)
    x_bbox = db.Column(db.Integer, nullable=True)
    y_bbox = db.Column(db.Integer, nullable=True)
    w_bbox = db.Column(db.Integer, nullable=True)
    h_bbox = db.Column(db.Integer, nullable=True)
    frame_number = db.Column(db.Integer, nullable=True)
    time = db.Column(db.Integer, nullable=False, default=get_current_time)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey("segmentation_batch.id"))

    def __repr__(self):
        return (
            "<SegmentationFeedback id=%r segmentation_id=%r feedback_code=%r "
            "x_bbox=%r y_bbox=%r w_bbox=%r h_bbox=%r time=%r user_id=%r batch_id=%r>"
        ) % (
            self.id, self.segmentation_id, self.feedback_code,
            self.x_bbox, self.y_bbox, self.w_bbox, self.h_bbox,
            self.time, self.user_id, self.batch_id
        )


class SegmentationBatch(db.Model):
    """
    Class

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
        The score that the user obtained in this Batch (number of segmentation masks that the user gives the feedback correctly).
        A null score means that no data is returned by the user, or the user is a researcher.
    num_unlabeled : int
        The number of segmentation masks that need user feedback in this batch.
    num_gold_standard : int
        The number of gold standards (i.e., segmentation masks with known bounding boxes) in this batch.
    user_score : int
        Current score of the user (User.score).
        This means how many segmentation masks that the user already provided feedback and passed the data quality check
        (which means using the gold standards to check if the user is doing a good job).
    user_raw_score : int
        Current raw score of the user (User.raw_score).
        This means how many segmentation masks that the user already provided feedback.
    """

    id = db.Column(db.Integer, primary_key=True)
    request_time = db.Column(db.Integer, nullable=False, default=get_current_time)
    return_time = db.Column(db.Integer)
    connection_id = db.Column(db.Integer, db.ForeignKey("connection.id"))
    score = db.Column(db.Integer)
    num_unlabeled = db.Column(db.Integer, nullable=False, default=0)
    num_gold_standard = db.Column(db.Integer, nullable=False, default=0)
    user_score = db.Column(db.Integer)
    user_raw_score = db.Column(db.Integer)
    # Relationships
    feedback = db.relationship("SegmentationFeedback", backref=db.backref("segmentation_batch", lazy=True), lazy=True)

    def __repr__(self):
        return (
            "<SegmentationBatch id=%r request_time=%r return_time=%r connection_id=%r "
            "score=%r num_unlabeled=%r num_gold_standard=%r "
            "user_score=%r user_raw_score=%r>"
        ) % (
            self.id, self.request_time, self.return_time, self.connection_id,
            self.score, self.num_unlabeled, self.num_gold_standard,
            self.user_score, self.user_raw_score
        )


class SegmentationView(db.Model):
    """
    Class representing a view of a segmentation mask (for tracking viewed segmentation masks).

    Attributes
    ----------
    id : int
        Unique identifier (primary key).
    connection_id : int
        The connection ID in the Connection table (foreign key).
    segmentation_id : int
        The segmentation mask ID in the SegmentationMask table (foreign key).
    query_type : int
        The query type about how the client requested the segmentation mask.
        0 => query by label state.
        1 => query by user id.
    time : int
        The epochtime (in seconds) when the view is added.
    """
    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(db.Integer, db.ForeignKey("connection.id"), nullable=False)
    segmentation_id = db.Column(db.Integer, db.ForeignKey("segmentation_mask.id"), nullable=False)
    query_type = db.Column(db.Integer, nullable=False)
    time = db.Column(db.Integer, default=get_current_time)

    def __repr__(self):
        return (
            "<SegmentationView id=%r connection_id=%r segmentation_id=%r query_type=%r time=%r>"
        ) % (
            self.id, self.connection_id, self.segmentation_id, self.query_type, self.time
        )