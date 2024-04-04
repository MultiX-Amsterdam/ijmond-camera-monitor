#!/bin/bash

# Uncomment the desired DB
DATABASE_NAME="ijmond_camera_monitor_staging"
# DATABASE_NAME="ijmond_camera_monitor_production"
# DATABASE_NAME="ijmond_camera_monitor_testing"

CRON_DIRECTORY="cron/"

# Create the pg_cron extension after downloading it and modifying the postgres.conf
sudo psql -U postgres -d "$DATABASE_NAME" -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"
sudo psql -U postgres -d "$DATABASE_NAME" -c "GRANT USAGE ON SCHEMA cron TO ijmond_camera_monitor;"
sudo psql -U postgres -d "$DATABASE_NAME" -c "UPDATE cron.job SET nodename = '';"

# Execute the SQL file in the context of the provided database
sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -f "$CRON_DIRECTORY/daily_champion.sql"
sudo psql -U postgres -d "$DATABASE_NAME" -c "ALTER FUNCTION daily_champion() OWNER TO ijmond_camera_monitor;"

# Schedule the function call with pg_cron, adjust the schedule as needed
sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -c "SELECT cron.schedule('36 06 * * *', 'SELECT daily_champion()');"

echo "All files processed."
