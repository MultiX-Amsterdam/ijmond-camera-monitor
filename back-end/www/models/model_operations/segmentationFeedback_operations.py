"""Functions to operate the segmentattion feedback table."""

from models.model import db
from models.model import SegmentationFeedback
from models.model import SegmentationMask
from models.model import User
from models.model import SegmentationBatch
from app.app import app
from util.util import get_current_time
from config.config import config


def create_feedback_label(segment_id, fc, x_bbox, y_bbox, w_bbox, h_bbox, user_id, batch_id):
    """Create a segmentation feedback."""
    feedback = SegmentationFeedback(
        segmentation_id = segment_id,
        feedback_code = fc,
        x_bbox = x_bbox,
        y_bbox = y_bbox,
        w_bbox = w_bbox,
        h_bbox = h_bbox,
        user_id = user_id,
        batch_id = batch_id,
    )
    app.logger.info("Create segmentation feedback: %r" % feedback)
    db.session.add(feedback)
    db.session.commit()
    return feedback


def remove_feedback_label(feedback_id):
    """Remove a segmentation feedback."""
    feedback = SegmentationMask.query.filter_by(id=feedback_id).first()
    app.logger.info("Remove segmentation feedback: %r" % feedback)
    if feedback is None:
        raise Exception("No segmentation feedback found in the database to delete.")
    db.session.delete(feedback)
    db.session.commit()


def update_segmentation_labels(labels, user_id, connection_id, batch_id, client_type):
    """
    Update the Segmentation table when a new label is added, return the score of the batch.

    Parameters
    ----------
    labels : int
        Segmentation labels that were returned by the front-end (0 or 1).
    user_id : int
        The user id (defined in the user table).
    connection_id : int
        The connection id (defined in the connection table).
    batch_id : int
        The segmentation batch id (defined in the batch table).
    client_type : int
        The type of user (defined in the user table).

    Returns
    -------
    dict
        A dictionary that contains the information of scores.
        (for the front-end website to show user contributions)
    """
    if len(labels) == 0: return
    # Search the segmentation batch and hash segmentations by segmentation_id
    segmentation_batch = SegmentationMask.query.filter(SegmentationMask.id.in_((s["id"] for s in labels))).all()
    segmentation_batch_hashed = {}
    for segmentation in segmentation_batch:
        segmentation_batch_hashed[segmentation.id] = segmentation
    # Find the user
    user = User.query.filter(User.id==user_id).first()
    # Update batch data
    batch_score = None
    if batch_id is not None and connection_id is not None:
        batch = SegmentationBatch.query.filter(SegmentationBatch.id==batch_id).first()
        batch.return_time = get_current_time()
        batch.connection_id = connection_id
        if client_type != 0: # do not update the score for reseacher
            batch_score = compare_segmentation_feedback(segmentation_batch_hashed, labels)
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
        for s in labels:
            bbox = s["relative_boxes"]
            fc = bbox_to_feedback_code(bbox)
            if bbox == None:
                x_bbox, y_bbox, h_bbox, w_bbox = None, None, None, None
            else:
                x_bbox, y_bbox, h_bbox, w_bbox = bbox["x_bbox"], bbox["y_bbox"], bbox["h_bbox"], bbox["w_bbox"]
            feedback = create_feedback_label(s["id"], fc, x_bbox, y_bbox, w_bbox, h_bbox, user_id, batch_id)
            segmentation = segmentation_batch_hashed[s["id"]]
            segmentation.label_update_time = feedback.time
            if client_type == 0: # admin researcher
                next_s = label_state_machine(segmentation.label_state_admin, fc, client_type)
            else: # normal user
                next_s = label_state_machine(segmentation.label_state, fc, client_type)
            if next_s is not None:
                if client_type == 0: # admin researcher
                    # Researchers should not override the labels provided by normal users
                    # Because we need to compare the reliability of the labels provided by normal users
                    segmentation.label_state_admin = next_s
                else: # normal user
                    segmentation.label_state = next_s
                app.logger.info("Update segmentation: %r" % segmentation)
            else:
                app.logger.warning("No next state for segmentation: %r" % segmentation)
    # Update database
    db.session.commit()
    return {"batch": batch_score, "user": user_score, "raw": user_raw_score}


# TODO Update the function so it returns a score
def compare_segmentation_feedback(segmentation_batch_hashed, feedback_sgm, proximity_threshold=1):
    """
    Compare the segmentation with the given user feedback.

    Parameters
    ----------
    segmentation_batch_hashed : dict
        Segmentation objects in a dictionary (the keys are the image id).
    feedback_sgm : list of dict
        Feedback segmentations that were returned by the front-end.
    proximity_threshold : int
        The threshold to determine if the feedback is close to the segmentation.
        Default value = 1

    Returns
    -------
    bool
        True if the feedback is close to the segmentation, False otherwise.
    """
    if len(feedback_sgm) == 0:
        app.logger.warning("No feedback segmentations found")
        return False

    for s in feedback_sgm:
        print("debug")
        return False
        # Find the true bounding box based on the given feedback
        feedback_segmentation = {
            "segmentation_id": s["id"],
            "feedback_boxes": {
                coord: true_size(
                    s["relative_boxes"][coord],
                    s["cropped_width"] if coord in ['x', 'w'] else s["cropped_height"],
                    s["div_size"]
                )
                for coord in s["relative_boxes"]
            },
        }

        # Collect the segmentation coordinates
        segmentation_id = s["id"]
        if segmentation_id in segmentation_batch_hashed:
            segmentation = segmentation_batch_hashed[segmentation_id]
            segmentation_coords = {
                "x":segmentation.x_bbox,
                "y":segmentation.y_bbox,
                "w":segmentation.w_bbox,
                "h":segmentation.h_bbox
            }

            # Compare the feedback with the segmentation
            for feedback_coord in feedback_segmentation["feedback_boxes"].values():
                for segmentation_coord in segmentation_coords.values():
                    if abs(feedback_coord - segmentation_coord) <= proximity_threshold:
                        app.logger.info("Feedback %r is close to segmentation %r" % (feedback_coord, segmentation_coord))
                        return True
        else:
            app.logger.warning("Segmentation %r not found within batch" % segmentation_id)
        return False


def compute_segmentation_batch_score(segmentation_batch_hashed, labels):
    """
    Compute the score of a segmenation batch.

    Parameters
    ---------
    segmentation_batch_hashed : dict
        Segmentation objects in a dictionary (the keys are the segmentation id).
    labels : list of Label
        Segmentation label objects that were returned by the front-end.

    Returns
    -------
    score : int
        The score of this batch (the higher the better).
        Score means the number of labeled segmentations that were accepted by the system.
    """
    score = 0
    correct_labeled_gold_standards = 0
    for s in labels:
        segmentation = segmentation_batch_hashed[s["video_id"]]
        label_state_admin = segmentation.label_state_admin
        l = s["label"]
        if label_state_admin == 0b101111: # gold positive
            if l == 1:
                correct_labeled_gold_standards += 1
        elif label_state_admin == 0b100000: # gold negative
            if l == 0:
                correct_labeled_gold_standards += 1
        else:
            score += 1
    if correct_labeled_gold_standards < config.GOLD_STANDARD_IN_BATCH:
        return 0
    else:
        return score


def bbox_to_feedback_code(bbox):
    """
    This function converts a bounding box feedback to a feedback code.
    The feedback code will be passed to the label_state_machine.

    Parameters
    ----------
    bbox : dict
        The dictionary that is returned from the front-end.
        If the value is None, it means that the box looks good.
        If the value is False, it means that the box should be removed.
    bbox.relative_boxes.x_bbox : int
        x coordinate of the box in pixels, relative to the image.
    bbox.relative_boxes.y_bbox : int
        y coordinate of the box in pixels, relative to the image.
    bbox.relative_boxes.h_bbox : int
        Height of the box in pixels.
    bbox.relative_boxes.w_bbox : int
        Width of the box in pixels.

    Returns
    ----------
    label : int
        Below is the definition of label:
        0 : One person checked the box; the box is good
        1 : One person checked the box; the person edited the box
        2 : One person checked the box; the person removed the box due to no smoke
    """
    if bbox == None:
        return 0
    elif bbox == False:
        return 2
    elif type(bbox) == dict:
        return 1
    else:
        return None


def label_state_machine(s, label, client_type):
    """
    A finite state machine to infer the new label state based on current label state and some inputs.

    Parameters
    ----------
    s : int
        The current state (see the definition of the states below).
    label : int
        The labeling result.
        0 means the box is good.
        1 means the box needs editing.
        2 means the box should be removed.
    client_type : int
        Type of the client, see the User table.

    Returns
    -------
    next_s : int
        Next state (return None for wrong inputs).

    Notes
    -----
    Below is the definition of state:
        0 : One person checked the box; the box is good
            (or there was no box, and the person agrees)
        1 : One person checked the box; the person edited the box
        2 : One person checked the box; the person removed the box due to no smoke
            (or there was no box, and the person added a box due to smoke)
        3 : Two people checked the box; they agree that the box is good
            (terminal state, no need for more feedback)
        4 : Two people checked the box; they both edited the box
            (terminal state, no need for more feedback)
        5 : Two people checked the box; they both removed the box
            (terminal state, no need for more feedback)
        6 : Two people checked the box; they give state 0 and 1
        7 : Two people checked the box; they give state 0 and 2
        8 : Two people checked the box; they give state 1 and 2
        9 : Three people checked the box; they give state 0, 1, and 0
            (terminal state, probably a good box)
        10 : Three people checked the box; they give state 0, 1, and 1
            (terminal state, probably a box that need editing)
        11 : Three people checked the box; they give state 0, 2, and 0
            (terminal state, probably a good box)
        12 : Three people checked the box; they give state 0, 2, and 2
            (terminal state, probably does not have smoke)
        13 : Three people checked the box; they give state 1, 2, and 1
            (terminal state, probably a box that need editing)
        14 : Three people checked the box; they give state 1, 2, and 2
            (terminal state, probably does not have smoke)
        15 : Three people checked the box; they give state 0, 1, and 2
            (terminal state, probably a box that need editing)
        16 : Gold standard; the box is good
            (terminal state)
        17 : Gold standard; the box needs editing
            (terminal state)
        18 : Gold standard; the box should be removed
            (terminal state)
        -1 : no data; no feedback from people
            (initial state)
        -2 : discarded data, by researchers
            (terminal state)
    """
    next_s = None
    # Researchers
    if client_type == 0:
        if label == 0: next_s = 0
        elif label == 1: next_s = 1
        elif label == 2: next_s = 2
        elif label == 16: next_s = 16
        elif label == 17: next_s = 17
        elif label == 18: next_s = 18
        elif label == -2: next_s = -2
        elif label == -1: next_s = -1
    else:
        # Sanity check, can only use undefined labels (not terminal state)
        undefined_labels = [0, 1, 2, 6, 7, 8, -1]
        if s not in undefined_labels: return None
    # Experts, amateurs, and laypeople
    if client_type in [1, 2, 3]: # laypeople, amateurs, and experts
        if s == -1:
            if label == 0: next_s = 0
            elif label == 1: next_s = 1
            elif label == 2: next_s = 2
        elif s == 0:
            if label == 0: next_s = 3 # terminal state
            elif label == 1: next_s = 6
            elif label == 2: next_s = 7
        elif s == 1:
            if label == 0: next_s = 6
            elif label == 1: next_s = 4 # terminal state
            elif label == 2: next_s = 8
        elif s == 2:
            if label == 0: next_s = 7
            elif label == 1: next_s = 8
            elif label == 2: next_s = 5 # terminal state
        elif s == 6:
            if label == 0: next_s = 9 # terminal state
            elif label == 1: next_s = 10 # terminal state
            elif label == 2: next_s = 15 # terminal state
        elif s == 7:
            if label == 0: next_s = 11 # terminal state
            elif label == 1: next_s = 15 # terminal state
            elif label == 2: next_s = 12 # terminal state
        elif s == 8:
            if label == 0: next_s = 15 # terminal state
            elif label == 1: next_s = 13 # terminal state
            elif label == 2: next_s = 14 # terminal state
    # Return state
    return next_s
