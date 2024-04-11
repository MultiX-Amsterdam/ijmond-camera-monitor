"""Functions to operate the label table."""

from models.model import db
from models.model import Label
from models.model import Video
from models.model import User
from models.model import Batch
from models.model import Season,SeasonScore
from app.app import app
from util.util import get_current_time
from config.config import config


def create_label(video_id, y, user_id, batch_id):
    """Create a label."""
    label = Label(
        video_id=video_id,
        label=y,
        user_id=user_id,
        batch_id=batch_id
    )
    app.logger.info("Create label: %r" % label)
    db.session.add(label)
    db.session.commit()
    return label


def remove_label(label_id):
    """Remove a label."""
    label = Label.query.filter_by(id=label_id).first()
    app.logger.info("Remove label: %r" % label)
    if label is None:
        raise Exception("No label found in the database to delete.")
    db.session.delete(label)
    db.session.commit()

def update_season_score(user_id, score, raw_score, batch_time):
    """
    Update the Season Score of the users, if the season has not yet finished.

    Parameters
    ----------
    user_id : int
        The user id (defined in the user table).
    score : int
        The score to be added in the season score table.
    raw_score : int
        The raw_score to be added in the season score table.
    batch_time : int
        The epochtime (in seconds) of the batch.
    """
    latest_season = Season.query.order_by(Season.end_date.desc()).first()

    user_season = SeasonScore.query.filter_by(user_id=user_id, season_id=latest_season.id).first()

    if batch_time <= latest_season.end_date:

        if not user_season:
            season_score_entry = SeasonScore(user_id=user_id, season_id=latest_season.id, score=0, raw_score=0)
            db.session.add(season_score_entry)

        season_score_entry.score += score
        season_score_entry.raw_score += raw_score
        db.session.commit()

def update_labels(labels, user_id, connection_id, batch_id, client_type):
    """
    Update the Video table when a new label is added, return the score of the batch.

    Parameters
    ----------
    labels : int
        Video labels that were returned by the front-end (0 or 1).
    user_id : int
        The user id (defined in the user table).
    connection_id : int
        The connection id (defined in the connection table).
    batch_id : int
        The video batch id (defined in the batch table).
    client_type : int
        The type of user (defined in the user table).

    Returns
    -------
    dict
        A dictionary that contains the information of scores.
        (for the front-end website to show user contributions)
    """
    if len(labels) == 0: return
    # Search the video batch and hash videos by video_id
    video_batch = Video.query.filter(Video.id.in_((v["video_id"] for v in labels))).all()
    video_batch_hashed = {}
    for video in video_batch:
        video_batch_hashed[video.id] = video
    # Find the user
    user = User.query.filter(User.id==user_id).first()
    # Update batch data
    batch_score = None
    if batch_id is not None and connection_id is not None:
        batch = Batch.query.filter(Batch.id==batch_id).first()
        batch.return_time = get_current_time()
        batch.connection_id = connection_id
        if client_type != 0: # do not update the score for reseacher
            batch_score = compute_video_batch_score(video_batch_hashed, labels)
            batch.score = batch_score
            batch.user_score = user.score
            batch.user_raw_score = user.raw_score
        app.logger.info("Update batch: %r" % batch)
    # Add labeling history and update the video label state
    # If the batch score is 0, do not update the label history since this batch is not reliable
    user_score = None
    user_raw_score = None
    if batch_score is not None:
        user_raw_score = user.raw_score + batch.num_unlabeled
        user.raw_score = user_raw_score
        # Update user score
        if client_type != 0: # do not update the score for reseacher
            user_score = user.score + batch_score
            user.score = user_score
        app.logger.info("Update user: %r" % user)
    if batch_score != 0: # batch_score can be None if from the dashboard when updating labels
        # Update labels
        for v in labels:
            label = create_label(v["video_id"], v["label"], user_id, batch_id)
            video = video_batch_hashed[v["video_id"]]
            video.label_update_time = label.time
            if client_type == 0: # admin researcher
                next_s = label_state_machine(video.label_state_admin, v["label"], client_type)
            else: # normal user
                next_s = label_state_machine(video.label_state, v["label"], client_type)
            if next_s is not None:
                if client_type == 0: # admin researcher
                    # Researchers should not override the labels provided by normal users
                    # Because we need to compare the reliability of the labels provided by normal users
                    video.label_state_admin = next_s
                else: # normal user
                    video.label_state = next_s
                app.logger.info("Update video: %r" % video)
            else:
                app.logger.warning("No next state for video: %r" % video)
    # Update database
    db.session.commit()

    # Update the season score of the user (if a season is active)
    update_season_score(user_id, batch.score, batch.num_unlabeled, batch.return_time)

    return {"batch": batch_score, "user": user_score, "raw": user_raw_score}


def label_state_machine(s, label, client_type):
    """
    A finite state machine to infer the new label state based on current label state and some inputs.

    Parameters
    ----------
    s : int
        The current state (see the definition of the states below).
    label : int
        The labeling result, 0 means negative (no smoke), 1 means positive (has smoke).
    client_type : int
        Type of the client, see the User table.

    Returns
    -------
    next_s : int
        Next state (return None for wrong inputs).

    Notes
    -----
    Below is the definition of state:
    The first bit from the left indicates if the data is useful (1: useful, 0: discarded)
    The second bit from the left indicates if the data has discord (1: has discord, 0: no discord)
    The rest of the bits indicates positve (1) or negative (0) labels
    For example, if a layperson labels 0, will attach "0" to the current state
        0b101111 (47) : pos (gold standard), by reseacher [both INITIAL and TERMINAL STATE]
        0b100000 (32) : neg (gold standard), by reseacher [both INITIAL and TERMINAL STATE]
        0b10111 (23) : strong pos (no discord, by 1 laypeople/amateurs + 1 expert) [TERMINAL STATE]
        0b10100 (20) : weak neg (no discord, by 1 laypeople/amateurs + 1 expert) [TERMINAL STATE]
        0b10011 (19) : weak pos (no discord, by 1 laypeople/amateurs + 1 expert) [TERMINAL STATE]
        0b10000 (16) : strong neg (no discord, by 1 laypeople/amateurs + 1 expert) [TERMINAL STATE]
        0b1011 : strong pos (no discord, by 2 laypeople/amateurs, or 1 expert) -> 0b10111
        0b1001 -> 0b11
        0b1010 -> 0b11
        0b1000 : strong neg (no discord, by 2 laypeople/amateurs, or 1 expert) -> 0b10000
        0b1111 (15) : medium pos (has discord, verified by 1 expert) [NOT USED] [TERMINAL STATE]
        0b1100 (12) : medium neg (has discord, verified by 1 expert) [NOT USED] [TERMINAL STATE]
        0b111 : weak pos (has discord, verified by 1 layperson/amateur) -> 0b10011
        0b110 : weak neg (has discord, verified by 1 layperson/amateur) -> 0b10100
        0b101 (5) : maybe pos (by 1 layperson/amateur) [TRANSITIONAL STATE]
        0b100 (4) : maybe neg (by 1 layperson/amateur) [TRANSITIONAL STATE]
        0b11 (3) : no data, has discord [TRANSITIONAL STATE]
        0b10 -> -1
        -1 : no data, no discord [INITIAL state]
        -2 : discarded data, by researchers [both INITIAL and TERMINAL STATE]
    Notation "->" means that the state is merged to another state
    For consistency, we always use -1 to indicate 0b10, the initial state that has no data

    [Change on May 10, 2019] For simplicity, experts now no longer add "00" or "11" to the label
    (Labels made by experts had higher weights than the ones made by laypeople/amateurs)
    """
    next_s = None
    # Researchers
    if client_type == 0:
        if label == 0b10111: next_s = 0b10111 # strong pos
        elif label == 0b10000: next_s = 0b10000 # strong neg
        elif label == 0b10011: next_s = 0b10011 # weak pos
        elif label == 0b10100: next_s = 0b10100 # weak neg
        elif label == 0b101111: next_s = 0b101111 # pos gold standard
        elif label == 0b100000: next_s = 0b100000 # neg gold standard
        elif label == 1: next_s = 0b10111 # strong pos
        elif label == 0: next_s = 0b10000 # strong neg
        elif label == -2: next_s = -2 # discard label
        elif label == -1: next_s = -1 # reset label
    else:
        # Sanity check, can only use undefined labels (not terminal state)
        undefined_labels = [0b101, 0b100, 0b11, -1]
        if s not in undefined_labels: return None
    # Experts, amateurs, and laypeople
    if client_type in [1, 2, 3]: # laypeople, amateurs, and experts
        if s == -1: # 0b10 no data, no discord
            if label == 1: next_s = 0b101 # maybe pos
            elif label == 0: next_s = 0b100 # maybe neg
        elif s == 0b11: # no data, has discord
            if label == 1: next_s = 0b10011 # 0b111 weak pos
            elif label == 0: next_s = 0b10100 # 0b110 weak neg
        elif s == 0b100: # maybe neg
            if label == 1: next_s = 0b11 # 0b1001 no data, has discord
            elif label == 0: next_s = 0b10000 # 0b1000 strong neg
        elif s == 0b101: # maybe pos
            if label == 1: next_s = 0b10111 # 0b1011 strong pos
            elif label == 0: next_s = 0b11 # 0b1010 no data, has discord
    # Return state
    return next_s


def compute_video_batch_score(video_batch_hashed, labels):
    """
    Compute the score of a video batch.

    Parameters
    ----------
    video_batch_hashed : dict
        Video objects in a dictionary (the keys are the video id).
    labels : list of Label
        Video label objects that were returned by the front-end.

    Returns
    -------
    score : int
        The score of this batch (the higher the better).
        Score means the number of labeled videos that were accepted by the system.
    """
    score = 0
    correct_labeled_gold_standards = 0
    for v in labels:
        video = video_batch_hashed[v["video_id"]]
        label_state_admin = video.label_state_admin
        s = v["label"]
        if label_state_admin == 0b101111: # gold positive
            if s == 1:
                correct_labeled_gold_standards += 1
        elif label_state_admin == 0b100000: # gold negative
            if s == 0:
                correct_labeled_gold_standards += 1
        else:
            score += 1
    if correct_labeled_gold_standards < config.GOLD_STANDARD_IN_BATCH:
        return 0
    else:
        return score
