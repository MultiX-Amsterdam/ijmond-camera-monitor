"""Functions to operate the segmentation table."""

import numpy as np
from sqlalchemy import func
from sqlalchemy import and_
from sqlalchemy import or_
from sqlalchemy import desc
from sqlalchemy.orm import load_only
from random import shuffle
from models.model import db
from models.model import SegmentationMask
from models.model import SegmentationFeedback
from app.app import app
from config.config import config
import models.model as m


def create_segmentation(mask_fn, img_fn, x_bbox, y_bbox, w_bbox, h_bbox,
                 lb_state, lb_state_admin, lb_update_time, f_nbr, v_id):
    """Create a segmentation mask."""
    segment = SegmentationMask(
        mask_file_name=mask_fn,
        image_file_name=img_fn,
        x_bbox=x_bbox,
        y_bbox=y_bbox,
        w_bbox=w_bbox,
        h_bbox=h_bbox,
        label_state = lb_state,
        label_state_admin = lb_state_admin,
        label_update_time = lb_update_time,
        frame_number = f_nbr,
        video_id = v_id
    )
    app.logger.info("Create segmentation: %r" % segment)
    db.session.add(segment)
    db.session.commit()
    return segment


def remove_segmentation(segment_id):
    """Remove a segmentation."""
    segment = SegmentationMask.query.filter_by(id=segment_id).first()
    app.logger.info("Remove segmentation: %r" % segment)
    if segment is None:
        raise Exception("No segmentation mask found in the database to delete.")
    db.session.delete(segment)
    db.session.commit()


def get_all_segmentations():
    """Get all segmentations."""
    return SegmentationMask.query.all()


def get_segmentation_ids_labeled_by_user(user_id):
    """Get a list of segmentation IDs labeled by the user before."""
    labels = SegmentationFeedback.query.filter(SegmentationFeedback.user_id==user_id).all()
    s_ids = set()
    for label in labels:
        s_ids.add(label.segment_id)
    return list(s_ids)


def query_segmentation_batch(user_id, use_admin_label_state=False):
    """
    Query a batch of segmentations for labeling by using active learning or random sampling.

    Parameters
    ----------
    user_id : int
        The ID in the User table.
    use_admin_label_state : bool
        Whether the returned segmentations should contain labeling information or not.

    Returns
    -------
    list of Segmentations
        The regementation object is defined in the Video model.
    """
    # Get the segmentation IDs labeled by the user before
    labeled_segmentation_ids = get_segmentation_ids_labeled_by_user(user_id)
    if use_admin_label_state:
        # For admin researcher, do not add gold standards
        # Exclude the segmentations that were labeled by the same user
        q = SegmentationMask.query.filter(and_(SegmentationMask.label_state_admin.in_((-1, 0b11, 0b100, 0b101)),
                                               SegmentationMask.id.notin_(labeled_segmentation_ids)))
        return q.order_by(func.random()).limit(config.BATCH_SIZE).all()
    else:
        # Select gold standards (at least one pos and neg to prevent spamming)
        # Spamming patterns include ignoring or selecting all segmentations
        num_gold_pos = np.random.choice(range(1, config.GOLD_STANDARD_IN_BATCH))
        num_gold_neg = config.GOLD_STANDARD_IN_BATCH - num_gold_pos
        gold_pos = SegmentationMask.query.filter(SegmentationMask.label_state_admin==0b101111).order_by(func.random()).limit(num_gold_pos).all()
        gold_neg = SegmentationMask.query.filter(SegmentationMask.label_state_admin==0b100000).order_by(func.random()).limit(num_gold_neg).all()
        # Exclude segmentations labeled by the same user, also the gold standards and other terminal states of reseacher labels
        # (We do not want citizens to do the double work to confirm reseacher labeled segmentations)
        excluded_labels = (0b101111, 0b100000, 0b10111, 0b10000, 0b10011, 0b10100, 0b1111, 0b1100, -2) # TODO check if the labels match
        excluded_s_ids = SegmentationMask.query.filter(SegmentationMask.label_state_admin.in_(excluded_labels)).with_entities(SegmentationMask.id).all()
        excluded_s_ids = [s[0] for s in excluded_s_ids]
        q = SegmentationMask.query.filter(SegmentationMask.id.notin_(labeled_segmentation_ids + excluded_s_ids))
        # Try to include some partially labeled segmentations in this batch
        num_unlabeled = config.BATCH_SIZE - config.GOLD_STANDARD_IN_BATCH
        num_partially_labeled = int(num_unlabeled*config.PARTIAL_LABEL_RATIO)
        partially_labeled = q.filter(SegmentationMask.label_state.in_((0b11, 0b100, 0b101))).order_by(func.random()).limit(num_partially_labeled).all()
        not_labeled = q.filter(SegmentationMask.label_state==-1).order_by(func.random()).limit(num_unlabeled - len(partially_labeled)).all()
        if (len(gold_pos + gold_neg) != config.GOLD_STANDARD_IN_BATCH):
            # This means that there are not enough or no gold standard segmentations
            return None
        else:
            segmentations = gold_pos + gold_neg + not_labeled + partially_labeled
            shuffle(segmentations)
            return segmentations


def get_segmentation_query(labels, page_number, page_size, use_admin_label_state=False):
    """
    Get segmentation query from the database by the type of labels.

    Parameters
    ----------
    labels : list of raw label states, or str
        This can be a list of the raw label state (defined in the label_state_machine function).
        This can also be a string ("pos" or "neg", which means positive or negative labels).
    page_number : int
        The page number that the front-end requested.
    page_size : int
        The page size that the front-end requested.
    use_admin_label_state : bool
        Use the admin label state or not.
        In the segmentation table, there are two types of label states.
        One is for the normal user (label_state).
        And another one is for the researcher (label_state_admin).
        See the definition of the "label_state_admin" column in the segmentation table.

    Returns
    -------
    The query object of the segmentation table.
    """
    page_size = config.MAX_PAGE_SIZE if page_size > config.MAX_PAGE_SIZE else page_size
    q = None
    if type(labels) == list:
        if len(labels) > 1:
            if use_admin_label_state:
                q = SegmentationMask.query.filter(SegmentationMask.label_state_admin.in_(labels))
            else:
                # Exclude gold standards and bad labels for normal request
                q = SegmentationMask.query.filter(and_(
                    SegmentationMask.label_state.in_(labels),
                    SegmentationMask.label_state_admin.notin_(m.gold_labels + m.bad_labels)))
        elif len(labels) == 1:
            if use_admin_label_state:
                q = SegmentationMask.query.filter(SegmentationMask.label_state_admin==labels[0])
            else:
                # Exclude gold standards and bad labels for normal request
                q = SegmentationMask.query.filter(and_(
                    SegmentationMask.label_state==labels[0],
                    SegmentationMask.label_state_admin.notin_(m.gold_labels + m.bad_labels)))
    elif type(labels) == str:
        # Aggregate citizen and researcher labels
        # Researcher labels override citizen labels
        if labels == "pos":
            # Exclude gold standards and bad labels for normal request
            q = SegmentationMask.query.filter(and_(
                SegmentationMask.label_state_admin.notin_(m.gold_labels + m.bad_labels),
                or_(
                    SegmentationMask.label_state_admin.in_(m.pos_labels),
                    and_(
                        SegmentationMask.label_state_admin.notin_(m.pos_labels + m.neg_labels),
                        SegmentationMask.label_state.in_(m.pos_labels)))))
        elif labels == "neg":
            # Exclude gold standards and bad labels for normal request
            q = SegmentationMask.query.filter(and_(
                SegmentationMask.label_state_admin.notin_(m.gold_labels + m.bad_labels),
                or_(
                    SegmentationMask.label_state_admin.in_(m.neg_labels),
                    and_(
                        SegmentationMask.label_state_admin.notin_(m.pos_labels + m.neg_labels),
                        SegmentationMask.label_state.in_(m.neg_labels)))))
    q = q.order_by(desc(SegmentationMask.label_update_time))
    if page_number is not None and page_size is not None:
        q = q.paginate(page=page_number, per_page=page_size, max_per_page=100)
    return q


def get_pos_segmentation_query_by_user_id(user_id, page_number, page_size, is_researcher):
    """
    Get segmentation query (with positive labels) from the database by user id (exclude gold standards).

    Notice that this function only returns segmentations with positive labels (i.e. segmentations having smoke).
    The returned segmentations are paginated, and the front-end needs to specify page number and size.

    Parameters
    ----------
    user_id : int
        The user id (defined in the user table).
    page_number : int
        The page number that the front-end requested.
    page_size : int
        The page size that the front-end requested.
    is_researcher : bool
        If the client type is researcher or not.

    Returns
    -------
    The query object of the segmentation table.
    """
    page_size = config.MAX_PAGE_SIZE if page_size > config.MAX_PAGE_SIZE else page_size
    if is_researcher: # researcher
        q = SegmentationFeedback.query.filter(and_(SegmentationFeedback.user_id==user_id,
                                                   SegmentationFeedback.label.in_([1, 0b10111, 0b1111, 0b10011]))).subquery()
    else:
        q = SegmentationFeedback.query.filter(and_(SegmentationFeedback.user_id==user_id, SegmentationFeedback.label==1)).subquery()
    # Exclude gold standards
    #q = q.from_self(SegmentationMask).join(SegmentationMask).distinct().filter(SegmentationMask.label_state_admin!=0b101111)
    q = (
        SegmentationMask.query
        .join(q, SegmentationMask.id == q.c.segmentation_id)
        .distinct()
        .filter(SegmentationMask.label_state_admin != 0b101111)
        .order_by(desc(SegmentationMask.label_update_time))
    )
    if page_number is not None and page_size is not None:
        q = q.paginate(page=page_number, per_page=page_size, max_per_page=100)
    return q


def get_all_url_part():
    """Get all the url_part in the segmentation table."""
    return SegmentationMask.query.with_entities(SegmentationMask.url_part).all()


def get_statistics():
    """Get statistics of the segmentation labels."""
    full = m.pos_labels + m.neg_labels
    gold = m.pos_gold_labels + m.neg_gold_labels
    partial = m.maybe_pos_labels + m.maybe_neg_labels + m.discorded_labels
    q = SegmentationMask.query
    num_all_segmentations= q.filter(SegmentationMask.label_state_admin.notin_(m.bad_labels + gold)).count()
    num_fully_labeled = q.filter(
        and_(
            SegmentationMask.label_state_admin.notin_(m.bad_labels + gold),
            or_(
                SegmentationMask.label_state_admin.in_(full),
                SegmentationMask.label_state.in_(full)
            )
        )
    ).count()
    num_partially_labeled = q.filter(SegmentationMask.label_state.in_(partial)).count()
    return_json = {
        "num_all_segmentations": num_all_segmentations,
        "num_fully_labeled": num_fully_labeled,
        "num_partially_labeled": num_partially_labeled
    }
    return return_json