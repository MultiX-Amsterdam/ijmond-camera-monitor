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
        Segmentation labels that were returned by the front-end.
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
            batch_score = compute_segmentation_batch_score(segmentation_batch_hashed, labels)
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
                # This means the box looks good
                x_bbox, y_bbox, h_bbox, w_bbox = None, None, None, None
            elif bbox == False:
                # This means the box should be removed
                x_bbox, y_bbox, h_bbox, w_bbox = -1, -1, -1, -1
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


def compute_iou(bbox1, bbox2):
    """
    Compute the Intersection over Union (IoU).

    Parameters
    ----------
    bbox1 : dict
        The first bounding box.
        Same data structure as the bbox object in the `bbox_to_feedback_code` function.
    bbox2 : dict
        The second bounding box.
        Same data structure as the bbox object in the `bbox_to_feedback_code` function.

    Returns
    -------
    float
        Intersection over Union (with value range between 0 and 1).
    """
    # Extract the coordinates of the bounding boxes
    x1_1, y1_1, w1_1, h1_1 = bbox1["x_bbox"], bbox1["y_bbox"], bbox1["w_bbox"], bbox1["h_bbox"]
    x1_2, y1_2, w1_2, h1_2 = bbox2["x_bbox"], bbox2["y_bbox"], bbox2["w_bbox"], bbox2["h_bbox"]

    # Determine the (x, y)-coordinates of the intersection rectangle
    x_inter_left = max(x1_1, x1_2)
    y_inter_top = max(y1_1, y1_2)
    x_inter_right = min(x1_1 + w1_1, x1_2 + w1_2)
    y_inter_bottom = min(y1_1 + h1_1, y1_2 + h1_2)

    # Compute the width and height of the intersection rectangle
    inter_width = max(0, x_inter_right - x_inter_left)
    inter_height = max(0, y_inter_bottom - y_inter_top)

    # Compute the area of the intersection rectangle
    inter_area = inter_width * inter_height

    # Compute the area of both the prediction and ground-truth rectangles
    bbox1_area = w1_1 * h1_1
    bbox2_area = w1_2 * h1_2

    # Compute the area of the union
    union_area = bbox1_area + bbox2_area - inter_area

    # Compute the Intersection over Union (IoU)
    iou = inter_area / union_area if union_area != 0 else 0

    return iou


def compute_segmentation_batch_score(segmentation_batch_hashed, labels, threshold=0.5):
    """
    Compute the score of a segmenation batch.

    Parameters
    ---------
    segmentation_batch_hashed : dict
        SegmentationMask objects in a dictionary (the keys are the segmentation ID).
    labels : list of dict
        Labels that were returned by the front-end.
        Same data structure as the bbox object in the `bbox_to_feedback_code` function.
    threshold : int
        The threshold to determine if the feedback is close to the segmentation.

    Returns
    -------
    score : int
        The score of this batch (the higher the better).
        Score means the number of labeled segmentations that were accepted by the system.
    """
    # TODO: implement this function
    # For now we accept all the labels
    return max(len(labels) - config.GOLD_STANDARD_IN_BATCH, 0)


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
    bbox.id : int
        The ID of the segmentation mask in the database.
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
