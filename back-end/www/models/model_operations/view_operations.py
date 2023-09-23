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
