"""Functions to operate the user table."""

from models.model import db
from models.model import User
from app.app import app


def create_user(client_id):
    """Create a user."""
    user = User(client_id=client_id)
    app.logger.info("Create user: %r" % user)
    db.session.add(user)
    db.session.commit()
    return user


def get_user_by_id(user_id):
    """Get a user by its ID."""
    user = User.query.filter_by(id=user_id).first()
    return user


def get_user_by_client_id(client_id):
    """Get a user by its client ID."""
    user = User.query.filter_by(client_id=client_id).first()
    return user


def get_all_users():
    """Get all users."""
    users = User.query.all()
    return users


def update_client_type_by_user_id(user_id, client_type):
    """Update client type by user ID."""
    user = User.query.filter_by(id=user_id).first()
    if user is None:
        raise Exception("No user found in the database to update.")
    user.client_type = client_type
    db.session.commit()
    return user


def remove_user(user_id):
    """Remove a user."""
    user = User.query.filter_by(id=user_id).first()
    app.logger.info("Remove user: %r" % user)
    if user is None:
        raise Exception("No user found in the database to delete.")
    db.session.delete(user)
    db.session.commit()
