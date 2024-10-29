"""Functions to operate the tutorial table."""

from models.model import db
from models.model import Tutorial
from app.app import app


def create_tutorial(connection_id, action_type, query_type):
    """Create a tutorial."""
    tutorial = Tutorial(
        connection_id=connection_id,
        action_type=action_type,
        query_type=query_type
    )
    db.session.add(tutorial)
    db.session.commit()
    app.logger.info("Create tutorial: %r" % tutorial)
    return tutorial


def remove_tutorial(tutorial_id):
    """Remove a tutorial."""
    tutorial = Tutorial.query.filter_by(id=tutorial_id).first()
    app.logger.info("Remove tutorial: %r" % tutorial)
    if tutorial is None:
        raise Exception("No tutorial found in the database to delete.")
    db.session.delete(tutorial)
    db.session.commit()
