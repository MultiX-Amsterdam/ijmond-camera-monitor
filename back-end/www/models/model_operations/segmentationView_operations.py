"""Functions to operate the segmentation view table."""

from models.model import db
from models.model import SegmentationView
from app.app import app


def create_segmentation_view(connection_id, segmentation_id, query_type):
    """Create a segmentation view."""
    segmentation_view = SegmentationView(
        connection_id=connection_id,
        segmentation_id=segmentation_id,
        query_type=query_type
    )
    db.session.add(segmentation_view)
    db.session.commit()
    app.logger.info("Create segmentation view: %r" % segmentation_view)
    return segmentation_view


def remove_segmentation_view(segmentation_view_id):
    """Remove a segmentation view."""
    segmentation_view = SegmentationView.query.filter_by(id=segmentation_view_id).first()
    app.logger.info("Remove segmentation view: %r" % segmentation_view)
    if segmentation_view is None:
        raise Exception("No segmentation view found in the database to delete.")
    db.session.delete(segmentation_view)
    db.session.commit()


def create_segmentation_views_from_segmentation_batch(segmentations, user_jwt, query_type=None):
    """
    Create segmentation views from a batch of segmentations.

    Parameters
    ----------
    segmentations : SegmentationMask
        SegmentationMask objects (defined by the SegmentationMask model).
    user_jwt : dict
        The user token JWT.
    query_type : int
        The type of query that the front-end used to get segmentations.
        See the view table for definition.
    """
    if query_type is None: return
    for s in segmentations:
        # Connection_id -1 means that the connection is from other app, not the current app.
        # If connections comes from another app, we do not want to add them to the view table.
        if user_jwt is not None and user_jwt["connection_id"] != -1:
            create_segmentation_view(user_jwt["connection_id"], s.id, query_type)
