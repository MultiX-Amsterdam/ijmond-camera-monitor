"""Functions to operate the video table."""

import numpy as np
from sqlalchemy import func
from sqlalchemy import and_
from sqlalchemy import or_
from sqlalchemy import desc
from sqlalchemy.orm import load_only
from sqlalchemy.exc import IntegrityError
from random import shuffle
from models.model import db
from models.model import Video
from models.model import Label
from app.app import app
from config.config import config
import models.model as m


def create_video(fn, st, et, up, vid, cid):
    """Create a video."""
    try:
        video = Video(
            file_name=fn,
            start_time=st,
            end_time=et,
            url_part=up,
            view_id=vid,
            camera_id=cid
        )
        app.logger.info("Create video: %r" % video)
        db.session.add(video)
        db.session.commit()
        return video
    except IntegrityError as e:
        app.logger.warning("Error message\n %s" % e)
        db.session.rollback()
        return None


def remove_video(video_id):
    """Remove a video."""
    video = Video.query.filter_by(id=video_id).first()
    app.logger.info("Remove video: %r" % video)
    if video is None:
        raise Exception("No video found in the database to delete.")
    db.session.delete(video)
    db.session.commit()


def get_all_videos():
    """Get all videos."""
    return Video.query.all()


def get_video_ids_labeled_by_user(user_id):
    """Get a list of video IDs labeled by the user before."""
    labels = Label.query.filter(Label.user_id==user_id).all()
    v_ids = set()
    for label in labels:
        v_ids.add(label.video_id)
    return list(v_ids)


def query_video_batch(user_id, use_admin_label_state=False):
    """
    Query a batch of videos for labeling by using active learning or random sampling.

    Parameters
    ----------
    user_id : int
        The ID in the User table.
    use_admin_label_state : bool
        Whether the returned videos should contain labeling information or not.

    Returns
    -------
    list of Video
        The video object is defined in the Video model.
    """
    # Get the video IDs labeled by the user before
    labeled_video_ids = get_video_ids_labeled_by_user(user_id)
    if use_admin_label_state:
        # For admin researcher, do not add gold standards
        # Exclude the videos that were labeled by the same user
        q = Video.query.filter(and_(Video.label_state_admin.in_((-1, 0b11, 0b100, 0b101)), Video.id.notin_(labeled_video_ids)))
        return q.order_by(func.random()).limit(config.BATCH_SIZE).all()
    else:
        # Select gold standards (at least one pos and neg to prevent spamming)
        # Spamming patterns include ignoring or selecting all videos
        num_gold_pos = np.random.choice(range(1, config.GOLD_STANDARD_IN_BATCH))
        num_gold_neg = config.GOLD_STANDARD_IN_BATCH - num_gold_pos
        gold_pos = Video.query.filter(Video.label_state_admin==0b101111).order_by(func.random()).limit(num_gold_pos).all()
        gold_neg = Video.query.filter(Video.label_state_admin==0b100000).order_by(func.random()).limit(num_gold_neg).all()
        # Exclude videos labeled by the same user, also the gold standards and other terminal states of reseacher labels
        # (We do not want citizens to do the double work to confirm reseacher labeled videos)
        excluded_labels = (0b101111, 0b100000, 0b10111, 0b10000, 0b10011, 0b10100, 0b1111, 0b1100, -2)
        excluded_v_ids = Video.query.filter(Video.label_state_admin.in_(excluded_labels)).with_entities(Video.id).all()
        excluded_v_ids = [v[0] for v in excluded_v_ids]
        q = Video.query.filter(Video.id.notin_(labeled_video_ids + excluded_v_ids))
        # Try to include some partially labeled videos in this batch
        num_unlabeled = config.BATCH_SIZE - config.GOLD_STANDARD_IN_BATCH
        num_partially_labeled = int(num_unlabeled*config.PARTIAL_LABEL_RATIO)
        partially_labeled = q.filter(Video.label_state.in_((0b11, 0b100, 0b101))).order_by(func.random()).limit(num_partially_labeled).all()
        not_labeled = q.filter(Video.label_state==-1).order_by(func.random()).limit(num_unlabeled - len(partially_labeled)).all()
        if (len(gold_pos + gold_neg) != config.GOLD_STANDARD_IN_BATCH):
            # This means that there are not enough or no gold standard videos
            return None
        else:
            videos = gold_pos + gold_neg + not_labeled + partially_labeled
            shuffle(videos)
            return videos


def get_video_query(labels, page_number, page_size, use_admin_label_state=False):
    """
    Get video query from the database by the type of labels.

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
        In the video table, there are two types of label states.
        One is for the normal user (label_state).
        And another one is for the researcher (label_state_admin).
        See the definition of the "label_state_admin" column in the video table.

    Returns
    -------
    The query object of the video table.
    """
    page_size = config.MAX_PAGE_SIZE if page_size > config.MAX_PAGE_SIZE else page_size
    q = None
    if type(labels) == list:
        if len(labels) > 1:
            if use_admin_label_state:
                q = Video.query.filter(Video.label_state_admin.in_(labels))
            else:
                # Exclude gold standards and bad labels for normal request
                q = Video.query.filter(and_(
                    Video.label_state.in_(labels),
                    Video.label_state_admin.notin_(m.gold_labels + m.bad_labels)))
        elif len(labels) == 1:
            if use_admin_label_state:
                q = Video.query.filter(Video.label_state_admin==labels[0])
            else:
                # Exclude gold standards and bad labels for normal request
                q = Video.query.filter(and_(
                    Video.label_state==labels[0],
                    Video.label_state_admin.notin_(m.gold_labels + m.bad_labels)))
    elif type(labels) == str:
        # Aggregate citizen and researcher labels
        # Researcher labels override citizen labels
        if labels == "pos":
            # Exclude gold standards and bad labels for normal request
            q = Video.query.filter(and_(
                Video.label_state_admin.notin_(m.gold_labels + m.bad_labels),
                or_(
                    Video.label_state_admin.in_(m.pos_labels),
                    and_(
                        Video.label_state_admin.notin_(m.pos_labels + m.neg_labels),
                        Video.label_state.in_(m.pos_labels)))))
        elif labels == "neg":
            # Exclude gold standards and bad labels for normal request
            q = Video.query.filter(and_(
                Video.label_state_admin.notin_(m.gold_labels + m.bad_labels),
                or_(
                    Video.label_state_admin.in_(m.neg_labels),
                    and_(
                        Video.label_state_admin.notin_(m.pos_labels + m.neg_labels),
                        Video.label_state.in_(m.neg_labels)))))
    q = q.order_by(desc(Video.label_update_time))
    if page_number is not None and page_size is not None:
        q = q.paginate(page=page_number, per_page=page_size, max_per_page=100)
    return q


def get_pos_video_query_by_user_id(user_id, page_number, page_size, is_researcher):
    """
    Get video query (with positive labels) from the database by user id (exclude gold standards).

    Notice that this function only returns videos with positive labels (i.e. videos having smoke).
    The returned videos are paginated, and the front-end needs to specify page number and size.

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
    The query object of the video table.
    """
    page_size = config.MAX_PAGE_SIZE if page_size > config.MAX_PAGE_SIZE else page_size
    if is_researcher: # researcher
        q = Label.query.filter(and_(Label.user_id==user_id, Label.label.in_([1, 0b10111, 0b1111, 0b10011]))).subquery()
    else:
        q = Label.query.filter(and_(Label.user_id==user_id, Label.label==1)).subquery()
    # Exclude gold standards
    #q = q.from_self(Video).join(Video).distinct().filter(Video.label_state_admin!=0b101111)
    q = (
        Video.query
        .join(q, Video.id == q.c.video_id)
        .distinct()
        .filter(Video.label_state_admin != 0b101111)
        .order_by(desc(Video.label_update_time))
    )
    if page_number is not None and page_size is not None:
        q = q.paginate(page=page_number, per_page=page_size, max_per_page=100)
    return q


def get_all_url_part():
    """Get all the url_part in the video table."""
    return Video.query.with_entities(Video.url_part).all()


def get_statistics():
    """Get statistics of the video labels."""
    full = m.pos_labels + m.neg_labels
    gold = m.pos_gold_labels + m.neg_gold_labels
    partial = m.maybe_pos_labels + m.maybe_neg_labels + m.discorded_labels
    q = Video.query
    num_all_videos = q.filter(Video.label_state_admin.notin_(m.bad_labels + gold)).count()
    num_fully_labeled = q.filter(
        and_(
            Video.label_state_admin.notin_(m.bad_labels + gold),
            or_(
                Video.label_state_admin.in_(full),
                Video.label_state.in_(full)
            )
        )
    ).count()
    num_partially_labeled = q.filter(Video.label_state.in_(partial)).count()
    return_json = {
        "num_all_videos": num_all_videos,
        "num_fully_labeled": num_fully_labeled,
        "num_partially_labeled": num_partially_labeled
    }
    return return_json
