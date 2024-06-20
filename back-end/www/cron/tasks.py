import sys
import argparse
from celery_config import celery
from app.app import app
from models.model import Achievement, AchievementRecords, Season, SeasonScore, Tasks, db
from datetime import datetime, timedelta, timezone

def parse_args():
    parser = argparse.ArgumentParser(description="Schedule season tasks or adjust existing seasons.")
    parser.add_argument('--fix', action='store_true', help="Adjust the timing of the last season and reschedule its end task.")
    parser.add_argument('start_datetime', type=str, nargs='?', help="Start datetime of the season.")
    parser.add_argument('end_datetime', type=str, nargs='?', help="End datetime of the season.")
    return parser.parse_args()

def save_task(task_id):
    """
    Schedule tasks for the start and end of a season.

    Parameters:
    ---
    task_id (string): The ID of the task as given by Celery 
    """
    new_task = Tasks(task_id=task_id)
    db.session.add(new_task)
    db.session.commit()
    app.logger.info(f"Task Recorded.")

def schedule_season_tasks(start_datetime, end_datetime, end_datetime_celery):
    """
    Schedule tasks for the start and end of a season.

    Parameters:
    ---
    start_datetime (string): When the season starts.
    end_datetime (string): When the season ends.
    end_datetime_celery (string): When the season ends for Celery (artificially minus 2h)
    """

    start_season(start_datetime, end_datetime)
    
    # Schedule a task for the end of the season
    task = end_season.apply_async(eta=end_datetime_celery)
    save_task(task.id)

def start_season(start_datetime,end_datetime):
    """
    Task to be executed at the start of the season.

    Parameters:
    ---
    start_datetime (string): When the season starts.
    end_datetime (string): When the season ends.
    """
    new_entry_season = Season(start_date=int(start_datetime.timestamp()), end_date=int(end_datetime.timestamp()))
    db.session.add(new_entry_season)
    db.session.commit()
    
    # Get the latest season number
    latest_season = Season.query.order_by(Season.id.desc()).first()

    new_season = 1  # This case is for when no seasons exist yet
    if latest_season:
        new_season = latest_season.id
        
    # Create a new achievement for the season
    new_achievement = Achievement(
        name=f"Season {new_season} Champion",
        description="You are the champion of the season."
    )
    db.session.add(new_achievement)
    db.session.commit()

    app.logger.info(f"Achievement for Season {new_season} created.")

@celery.task(name='cron.end_season')
def end_season():
    """Task to be executed at the end of the season."""
    with app.app_context():
        # Assuming the current season is the latest one
        current_season = Season.query.order_by(Season.id.desc()).first()
        if not current_season:
            app.logger.info("No season found.")
            return

        top_scorer = SeasonScore.query.filter_by(season_id=current_season.id)\
                                    .order_by(SeasonScore.score.desc(), SeasonScore.raw_score.desc())\
                                    .first()
        if top_scorer:
            # Assuming the achievement for the current season is the latest one created
            current_season_achievement = Achievement.query.order_by(Achievement.id.desc()).first()
            if current_season_achievement:
                achievement_record = AchievementRecords(
                    user_id=top_scorer.user_id,
                    achievement_id=current_season_achievement.id,
                    date=datetime.now(timezone.utc).date()
                )
                db.session.add(achievement_record)
                db.session.commit()

                app.logger.info(f"Awarded Season {current_season.id} Champion to user {top_scorer.user_id}.")
            else:
                app.logger.info("No achievement found for the current season.")
        else:
            app.logger.info("No top scorer found for the current season.")

def adjust_season(new_start_datetime, new_end_datetime, new_end_datetime_celery):
    with app.app_context():
        old_task = Tasks.query.order_by(Tasks.id.desc()).first()
        if old_task:
            celery.control.revoke(old_task.task_id, terminate=True)
            season = Season.query.order_by(Season.id.desc()).first()
            if season:
                season.start_date = int(new_start_datetime.timestamp())
                season.end_date = int(new_end_datetime.timestamp())
                db.session.commit()
                app.logger.info(f"Season {season.id} dates adjusted.")
                # Schedule a new task with the updated time
                new_task = end_season.apply_async(eta=new_end_datetime_celery)
                return new_task.id  # Optionally update the stored task ID
            else:
                app.logger.info("No season found.")
        else:
            app.logger.info("No task found to revoke.")

def main():

    args = parse_args()
    if args.start_datetime and args.end_datetime:
        start_datetime = datetime.strptime(args.start_datetime, '%Y-%m-%d %H:%M')
        end_datetime = datetime.strptime(args.end_datetime, '%Y-%m-%d %H:%M')
        end_datetime_celery = end_datetime + timedelta(hours=-2)

        if args.fix:
            adjust_season(start_datetime, end_datetime, end_datetime_celery)
        else:
            schedule_season_tasks(start_datetime, end_datetime, end_datetime_celery)
    else:
        print("Start and end-time must be provided.")

if __name__ == '__main__':
    with app.app_context():
        main()