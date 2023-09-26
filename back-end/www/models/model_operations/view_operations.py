"""Functions to operate the view table."""

from models.model import db
from models.model import View
from app.app import app


def create_view(connection_id, video_id, query_type):
    """Create a view."""
    view = View(
        connection_id=connection_id,
        video_id=video_id,
        query_type=query_type
    )
    app.logger.info("Create view: %r" % view)
    db.session.add(view)
    db.session.commit()
    return view


def remove_view(view_id):
    """Remove a view."""
    view = View.query.filter_by(id=view_id).first()
    app.logger.info("Remove view: %r" % view)
    if view is None:
        raise Exception("No view found in the database to delete.")
    db.session.delete(view)
    db.session.commit()


def create_views_from_video_batch(videos, user_jwt, query_type=None):
    """
    Create views from a batch of videos.

    Parameters
    ----------
    videos : Video
        Video objects (defined by the video model).
    user_jwt : dict
        The user token JWT.
    query_type : int
        The type of query that the front-end used to get videos.
        See the view table for definition.
    """
    if query_type is None: return
    for v in videos:
        # Connection_id -1 means that the connection is from other app, not the current app.
        # If connections comes from another app, we do not want to add them to the view table.
        if user_jwt is not None and user_jwt["connection_id"] != -1:
            create_view(user_jwt["connection_id"], v.id, query_type)