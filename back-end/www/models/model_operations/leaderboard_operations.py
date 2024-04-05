"""Functions to operate the leaderboard functionality."""

from datetime import datetime, timezone
from models.model import User
from models.model import DailyScore
from models.model import WeeklyScore
from models.model import MonthlyScore
from models.model import YearlyScore

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

    elif interval == 'weekly':
        current_week = datetime.now().isocalendar()[1]
        current_year = datetime.now().isocalendar()[0]

        if sort_by == 'score':
            users = User.query.join(WeeklyScore, User.id == WeeklyScore.user_id)\
                              .filter(WeeklyScore.week == current_week, WeeklyScore.year == current_year)\
                              .order_by(WeeklyScore.score.desc()).all()
        elif sort_by == 'raw_score':
            users = User.query.join(WeeklyScore, User.id == WeeklyScore.user_id)\
                              .filter(WeeklyScore.week == current_week, WeeklyScore.year == current_year)\
                              .order_by(WeeklyScore.raw_score.desc()).all()
        leaderboard_data = [
            {
                'client_id': user.client_id,
                'id': user.id,
                'score': next((ds.score for ds in user.weekly_scores if (ds.week == current_week and ds.year == current_year)), 0),
                'raw_score': next((ds.raw_score for ds in user.weekly_scores if (ds.week == current_week and ds.year == current_year)), 0),
                'client_type': user.client_type
            }
            for user in users
        ]
    
    elif interval == 'monthly':
        current_year = datetime.now().isocalendar()[0]
        current_month = datetime.now().isocalendar()[2]

        if sort_by == 'score':
            users = User.query.join(MonthlyScore, User.id == MonthlyScore.user_id)\
                              .filter(MonthlyScore.month == current_month, MonthlyScore.year == current_year)\
                              .order_by(MonthlyScore.score.desc()).all()
        elif sort_by == 'raw_score':
            users = User.query.join(MonthlyScore, User.id == MonthlyScore.user_id)\
                              .filter(MonthlyScore.month == current_month, MonthlyScore.year == current_year)\
                              .order_by(MonthlyScore.raw_score.desc()).all()
        leaderboard_data = [
            {
                'client_id': user.client_id,
                'id': user.id,
                'score': next((ds.score for ds in user.monthly_scores if (ds.month == current_month and ds.year == current_year)), 0),
                'raw_score': next((ds.raw_score for ds in user.monthly_scores if (ds.month == current_month and ds.year == current_year)), 0),
                'client_type': user.client_type
            }
            for user in users
        ]

    elif interval == 'yearly':
        current_year = datetime.now().isocalendar()[0]

        if sort_by == 'score':
            users = User.query.join(YearlyScore, User.id == YearlyScore.user_id)\
                              .filter(YearlyScore.year == current_year)\
                              .order_by(YearlyScore.score.desc()).all()
        elif sort_by == 'raw_score':
            users = User.query.join(YearlyScore, User.id == YearlyScore.user_id)\
                              .filter(YearlyScore.year == current_year)\
                              .order_by(YearlyScore.raw_score.desc()).all()
        leaderboard_data = [
            {
                'client_id': user.client_id,
                'id': user.id,
                'score': next((ds.score for ds in user.yearly_scores if ds.year == current_year), 0),
                'raw_score': next((ds.raw_score for ds in user.yearly_scores if ds.year == current_year), 0),
                'client_type': user.client_type
            }
            for user in users
        ]

    return leaderboard_data

