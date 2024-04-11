from app.app import app
from apscheduler.schedulers.background import BlockingScheduler
import sys
from models.model import Achievement, AchievementRecords, Season, SeasonScore, db
from datetime import datetime, timezone

def schedule_season_tasks(start_datetime, end_datetime):
    """
    Schedule tasks for the start and end of a season.

    Parameters:
    ---
    start_date (string): When the season starts.
    end_date (string): When the season ends.
    """

    start_season(start_datetime, end_datetime)
    
    # Schedule a task for the end of the season
    scheduler.add_job(end_season, 'date', run_date=end_datetime)
    scheduler.start()

def start_season(start_datetime,end_datetime):
    """
    Task to be executed at the start of the season.

    Parameters:
    ---
    start_date (datetime): When the season starts.
    end_date (datetime): When the season ends.
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


def end_season():
    """Task to be executed at the end of the season."""
    with app.app_context(): # VERY IMPORTANT, cannot schedule without it
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

def main():

    # Check for command line arguments
    if len(sys.argv) != 3:
        print("Usage: python cron.py <start_datetime> <end_datetime>")
        print("Datetime format: 'YYYY-MM-DD HH:MM'")
        sys.exit(1)

    start_datetime_str = sys.argv[1]
    end_datetime_str = sys.argv[2]

    # Convert string arguments to datetime objects
    start_datetime = datetime.strptime(start_datetime_str, '%Y-%m-%d %H:%M')
    end_datetime = datetime.strptime(end_datetime_str, '%Y-%m-%d %H:%M')

    # Call the scheduling function
    schedule_season_tasks(start_datetime, end_datetime)

if __name__ == '__main__':
    with app.app_context():
        # Initialize APScheduler
        scheduler = BlockingScheduler(daemon=True)
        main()