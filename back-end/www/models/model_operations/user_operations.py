"""Functions to operate the user table."""

import datetime
from sqlalchemy import or_
from models.model import db
from models.model import User
from models.model import Connection
from models.model import Batch
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
    app.logger.info("Update user: %r" % user)
    db.session.commit()
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
    app.logger.info("Update user: %r" % user)
    db.session.commit()
    return user

def convert_epoch_to_date(epoch):
    """Convert epoch time to a date object."""
    return datetime.datetime.fromtimestamp(epoch).strftime('%Y-%m-%d')

def get_past_user_scores(client_id):
    """Fetch batches for the given user_id, ordered by return_time and keep only the newest scores by date."""
    user = User.query.filter(User.client_id == client_id).first()
    if not user:
        app.logger.error("No user found for client_id: {}".format(client_id))
        return []

    user_id = user.id

    batches = db.session.query(
        Batch.return_time,
        Batch.user_score,
        Batch.user_raw_score,
        Batch.score,
        Batch.num_unlabeled
    ).join(Connection, Batch.connection_id == Connection.id
    ).filter(
        Batch.return_time.isnot(None),
        Connection.user_id == user_id
    ).order_by(Batch.return_time.asc()).all()

    if not batches:
        app.logger.info("No batches found for user_id: {}".format(user_id))
        return []

    scores_by_date = {}

    for batch in batches:
        date = convert_epoch_to_date(batch.return_time)
        current_score = (batch.user_score if batch.user_score is not None else 0) + (batch.score if batch.score is not None else 0)
        current_raw_score = (batch.user_raw_score if batch.user_raw_score is not None else 0) + (batch.num_unlabeled if batch.num_unlabeled is not None else 0)

        if date not in scores_by_date or batch.return_time > scores_by_date[date]['return_time']:
            scores_by_date[date] = {
                'date': date,
                'score': current_score,
                'raw_score': current_raw_score,
                'return_time': batch.return_time  # Storing return_time to compare later
            }

    # Convert the dictionary to a sorted list of daily scores
    sorted_daily_scores = sorted(scores_by_date.values(), key=lambda x: x['date'])

    return sorted_daily_scores