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
    """Fetch batches for the given user_id, ordered by return_time"""
    user_id = User.query.filter(User.client_id==client_id).first().id

    batches = db.session.query(
        Batch.return_time,
        Batch.user_score,
        Batch.user_raw_score
    ).join(Connection, Batch.connection_id == Connection.id
    ).filter(
        Batch.return_time.isnot(None), Batch.user_score.isnot(None), Batch.user_raw_score.isnot(None), Connection.user_id == user_id
    ).order_by(Batch.return_time.asc()).all()

    daily_scores = []
    for batch in batches:
        if batch.return_time:
            daily_scores.append({
                'date': convert_epoch_to_date(batch.return_time),
                'score': batch.user_score if batch.user_score is not None else 0,
                'raw_score': batch.user_raw_score if batch.user_raw_score is not None else 0
            })

    # Calculate daily differences
    daily_diffs = []
    prev_day_scores = {}

    for day_scores in daily_scores:
        day = day_scores['date']
        score = day_scores['score']
        raw_score = day_scores['raw_score']

        if prev_day_scores:
            # Calculate differences if previous day scores exist
            score_diff = score - prev_day_scores.get('score', 0)
            raw_score_diff = raw_score - prev_day_scores.get('raw_score', 0)
            daily_diffs.append({'date': day, 'score': score_diff, 'raw_score': raw_score_diff})

        prev_day_scores = {'date': day, 'score': score, 'raw_score': raw_score}

    return aggregate_final_results(daily_diffs)

def aggregate_final_results(daily_diffs):
    """
    Aggregates the score differences and raw score differences for entries with the same date.
    """
    aggregated_results = {}
    for entry in daily_diffs:
        date = entry['date']
        if date in aggregated_results:
            aggregated_results[date]['score'] += entry['score']
            aggregated_results[date]['raw_score'] += entry['raw_score']
        else:
            aggregated_results[date] = {
                'score': entry['score'],
                'raw_score': entry['raw_score']
            }
    
    final_aggregated_list = [
        {'date': date, 'score': details['score'], 'raw_score': details['raw_score']}
        for date, details in sorted(aggregated_results.items())
    ]
    
    return final_aggregated_list