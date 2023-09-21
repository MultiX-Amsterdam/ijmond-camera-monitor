"""Functions to operate the video table."""

import numpy as np
from sqlalchemy import func
from sqlalchemy import and_
from random import shuffle
from models.model import db
from models.model import Video
from models.model import Label
from app.app import app
from config.config import config


def create_video(fn, st, et, up, l, r, t, b, vid, cid):
    """Create a video."""
    video = Video(
        file_name=fn,
        start_time=st,
        end_time=et,
        url_part=up,
        left=l,
        right=r,
        top=t,
        bottom=b,
        view_id=vid,
        camera_id=cid
    )
    app.logger.info("Create video: %r" % video)
    db.session.add(video)
    db.session.commit()
    return video


def remove_video(video_id):
    """Remove a video."""
    video = Video.query.filter_by(id=video_id).first()
    app.logger.info("Remove video: %r" % video)
    if video is None:
        raise Exception("No video found in the database to delete.")
    db.session.delete(video)
    db.session.commit()


def get_video_ids_labeled_by_user(user_id):
    """Get a list of video IDs labeled by the user before."""
    labels = Label.query.filter(Label.user_id==user_id)
    v_ids = labels.from_self(Video).join(Video).distinct().with_entities(Video.id).all()
    return v_ids


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
    v_ids = get_video_ids_labeled_by_user(user_id)
    labeled_video_ids = [v[0] for v in v_ids]
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