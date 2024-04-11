"""Functions to operate the leaderboard functionality."""

from models.model import User
from models.model import Season, SeasonScore
from app import app

def get_all_seasons():
    """Retrieve all seasons."""
    seasons = Season.query.all()
    return [{"id": season.id, "name": f"Season {season.id}", "season_start": season.start_date, "season_end": season.end_date} for season in seasons]

def get_leaderboard_data(sort_by='score', interval='alltime'):
    """Get all users' scores based on the filter (alltime, or specific season)."""

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
    else:
        # Cast to int to use at ID
        interval = int(interval)
        if sort_by == 'score':
            users = User.query.join(SeasonScore, User.id == SeasonScore.user_id)\
                              .filter(SeasonScore.season_id == interval)\
                              .order_by(SeasonScore.score.desc()).all()
        elif sort_by == 'raw_score':
            users = User.query.join(SeasonScore, User.id == SeasonScore.user_id)\
                              .filter(SeasonScore.season_id == interval)\
                              .order_by(SeasonScore.raw_score.desc()).all()
        leaderboard_data = [
            {
                'client_id': user.client_id,
                'id': user.id,
                'score': next((ds.score for ds in user.season_score if ds.season_id == interval), 0),
                'raw_score': next((ds.raw_score for ds in user.season_score if ds.season_id == interval), 0),
                'client_type': user.client_type
            }
            for user in users
        ]
    return leaderboard_data