"""Functions to operate the user table."""

from models.model import db
from models.model import User
from app.app import app


def create_user(client_id):
    """Create a user."""
    user = User(client_id=client_id)
    db.session.add(user)
    db.session.commit()
    app.logger.info("Create user: %r" % user)
    return user


def get_user_by_id(user_id):
    """Get a user by its ID."""
    return User.query.filter_by(id=user_id).first()


def get_user_by_client_id(client_id):
    """Get a user by its client ID."""
    return User.query.filter_by(client_id=client_id).first()


def get_all_users():
    """Get all users."""
    return User.query.all()


def update_client_type_by_user_id(user_id, client_type):
    """Update client_type by user ID."""
    user = get_user_by_id(user_id)
    if user is None:
        raise Exception("No user found in the database to update.")
    user.client_type = client_type
    db.session.commit()
    app.logger.info("Update user: %r" % user)
    return user


def remove_user(user_id):
    """Remove a user."""
    user = get_user_by_id(user_id)
    app.logger.info("Remove user: %r" % user)
    if user is None:
        raise Exception("No user found in the database to delete.")
    db.session.delete(user)
    db.session.commit()


def update_best_tutorial_action_by_user_id(user_id, best_tutorial_action):
    """Update best_tutorial_action by user ID."""
    user = get_user_by_id(user_id)
    if user is None:
        raise Exception("No user found in the database to update.")
    user.best_tutorial_action = best_tutorial_action
    db.session.commit()
    app.logger.info("Update user: %r" % user)
    return user
