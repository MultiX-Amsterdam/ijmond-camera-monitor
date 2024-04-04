"""Functions to operate the user table."""

from datetime import datetime, timezone
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

def get_leaderboard_data(sort_by='score', interval='alltime'):
    """Get all users' scores based on the filter (alltime, daily at the moment)."""
    today_date = datetime.now(timezone.utc).date()

    if interval == 'alltime':
        if sort_by == 'score':
            users = User.query.order_by(User.score.desc()).all()
        elif sort_by == 'raw_score':
            users = User.query.order_by(User.raw_score.desc()).all()
        leaderboard_data = [
            {
                'client_id': user.client_id,
                'id': user.id,
                'score': user.score,
                'raw_score': user.raw_score,
                'client_type': user.client_type
            }
            for user in users
        ]
    elif interval == 'daily':
        if sort_by == 'score':
            users = User.query.join(DailyScore, User.id == DailyScore.user_id)\
                              .filter(DailyScore.date == today_date)\
                              .order_by(DailyScore.score.desc()).all()
        elif sort_by == 'raw_score':
            users = User.query.join(DailyScore, User.id == DailyScore.user_id)\
                              .filter(DailyScore.date == today_date)\
                              .order_by(DailyScore.raw_score.desc()).all()
        leaderboard_data = [
            {
                'client_id': user.client_id,
                'id': user.id,
                'score': next((ds.score for ds in user.daily_scores if ds.date == today_date), 0),
                'raw_score': next((ds.raw_score for ds in user.daily_scores if ds.date == today_date), 0),
                'client_type': user.client_type
            }
            for user in users
        ]

    return leaderboard_data