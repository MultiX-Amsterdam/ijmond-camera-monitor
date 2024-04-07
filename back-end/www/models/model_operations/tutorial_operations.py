"""Functions to operate the tutorial table."""

from models.model import db
from datetime import datetime, timezone
from models.model import Tutorial, AchievementDay, AchievementUser, User
from app.app import app


def create_tutorial(connection_id, action_type, query_type):
    """Create a tutorial."""
    tutorial = Tutorial(
        connection_id=connection_id,
        action_type=action_type,
        query_type=query_type
    )
    app.logger.info("Create tutorial: %r" % tutorial)
    db.session.add(tutorial)
    db.session.commit()
    return tutorial


def remove_tutorial(tutorial_id):
    """Remove a tutorial."""
    tutorial = Tutorial.query.filter_by(id=tutorial_id).first()
    app.logger.info("Remove tutorial: %r" % tutorial)
    if tutorial is None:
        raise Exception("No tutorial found in the database to delete.")
    db.session.delete(tutorial)
    db.session.commit()

def give_tutorial_achievement(user_id, action_type):
    """
    Assigns an achievement to a logged-in user for completing a tutorial, based on the action type.
    If the user has already received the achievement, it increments the times_received.
    Achievements for action types:
    - 0: Achievement with ID 5 (tutorial finisher)
    - 1: No achievement, you did not pass the last batch
    - 2,3: Since you were shown hints, you get the achievement with ID 5 only (tutorial finisher)
    - 4: Achievements with IDs 5 and 6 (tutorial finisher tutorial pro, since no hints were usen)
    """

    # When we have a guest we have None as the ID. To prevent errors and achievement handover to guests, we do this check
    if (user_id is not None):
        client_id = 'google.'+user_id # We create client_id to query the DB
        # Map action_type to achievement IDs
        achievement_mappings = {
            0: [5],
            2: [5],
            3: [5],
            4: [5,6]
        }

        achievement_ids = achievement_mappings.get(action_type, []) # Find the achievements per your action_type, based on the mappings
        user = User.query.filter_by(client_id = client_id).first()

        for achievement_id in achievement_ids:
            # Check if the user has already received this achievement
            achievement_user = AchievementUser.query.filter_by(
                user_id=user.id,
                achievement_id=achievement_id
            ).first()

            if achievement_user:
                # User already has this achievement, increment times_received
                achievement_user.times_received += 1
            else:
                # User does not have this achievement, create a new record
                achievement_user = AchievementUser(
                    user_id=user.id,
                    achievement_id=achievement_id,
                    times_received=1
                )
                db.session.add(achievement_user)

            db.session.commit()

            today = datetime.now(timezone.utc).date()

            # Check if there's already a record in AchievementDay for this user and achievement today
            achievement_day_exists = AchievementDay.query.filter(
                (AchievementDay.user_id == user.id) &
                (AchievementDay.achievement_id == achievement_id) &
                (AchievementDay.date == today)
            ).first()

            if not achievement_day_exists:
                # No record for today, insert a new one
                achievement_day = AchievementDay(
                    user_id=user.id,
                    achievement_id=achievement_id,
                    date=today
                )
                db.session.add(achievement_day)
                db.session.commit()