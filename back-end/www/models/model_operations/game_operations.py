"""Functions to operate the games table and functionality."""

from models.model import db
from datetime import datetime, timezone
from models.model import User, AchievementRecords
from models.model import Games, GameMistakes

def save_game_question(user_id, question_num, mistakes_num):
    """Save the user's game responses, based on their mistakes"""
    game_in_progress = Games.query.filter_by(user_id=user_id).order_by(Games.id.desc()).first()
    gameMistake = GameMistakes(user_id=user_id, game_id=game_in_progress.id, question=question_num, mistakes=mistakes_num)
    db.session.add(gameMistake)
    db.session.commit()

def save_game_action(user_id, action_type):
    """Save the user's game action."""
    if (action_type == -1):
        game = Games(user_id=user_id, action_type=action_type)
        db.session.add(game)
        db.session.commit()
    else:
        game_finished = Games.query.filter_by(user_id=user_id).order_by(Games.id.desc()).first()
        game_finished.action_type = action_type
        db.session.commit()

def give_game_achievement(client_id, action_type):
    """
    Assigns an achievement to a logged-in user for completing the games, based on the action type.
    If the user has already received the achievement, it increments the times_received.
    Achievements for action types:
    - 0: Since you had wrong answers, you get the achievement with ID 3 only (quiz finisher)
    - 1: Achievements with IDs 3 and 4 (quiz finisher quiz master, since there were no wrong answers)
    """

    # When we have a guest we do not want to give achievements, as a choice to disable gamification
    if (client_id.split('.')[0] == 'google'):
        # Map action_type to achievement IDs
        achievement_mappings = {
            0: [3],
            1: [3,4],
        }

        achievement_ids = achievement_mappings.get(action_type, []) # Find the achievements per your action_type, based on the mappings
        user = User.query.filter_by(client_id = client_id).first()

        for achievement_id in achievement_ids:

            today = datetime.now(timezone.utc).date()
            achievement_day = AchievementRecords(
                user_id=user.id,
                achievement_id=achievement_id,
                date=today
            )
            
            db.session.add(achievement_day)
            db.session.commit()