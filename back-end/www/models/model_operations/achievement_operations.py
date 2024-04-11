"""Functions to operate the achievements."""

from models.model import Achievement
from app.app import app


def get_all_achievements():
    """Get all the achievements available"""
    achievements = Achievement.query.all()
    achievement_list = [
        {
            'name': achievement.name,
            'description': achievement.description
        }
        for achievement in achievements
    ]
    return achievement_list