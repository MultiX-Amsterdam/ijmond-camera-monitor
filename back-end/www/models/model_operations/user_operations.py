"""Functions to operate the user table."""

from sqlalchemy import desc
from models.model import db
from models.model import User
from models.model import DailyScore
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

def get_past_user_scores(user_id):
    """Get the past 7 maximum active days of the user score-wise"""
    user = get_user_by_client_id(user_id)
    all_scores = DailyScore.query.filter(
        DailyScore.user_id == user.id
    ).order_by(desc(DailyScore.date)).limit(7).all()  # Ordering by date for chronological scores and picking the max last 7 days the user was active
    
    scores_list = [
        {
            'date': score.date.strftime('%Y-%m-%d'),
            'score': score.score,
            'raw_score': score.raw_score
        }
        for score in all_scores
    ]
    
    return scores_list