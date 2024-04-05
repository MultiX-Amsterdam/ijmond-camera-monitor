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

# Loop through each SQL file in the cron directory
for sql_file in "$CRON_DIRECTORY"*.sql
do
    # Execute the SQL file
    sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -f "$sql_file"
    
    # Extract the function name from the filename (assuming filename matches function name)
    function_name=$(basename "$sql_file" .sql)
    
    # Alter the function owner
    sudo psql -U postgres -d "$DATABASE_NAME" -c "ALTER FUNCTION ${function_name}() OWNER TO ijmond_camera_monitor;"
done

# Schedule tasks
sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -c "SELECT cron.schedule('0 0 * * *', 'SELECT daily_champion()');"
sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -c "SELECT cron.schedule('0 0 * * 0', 'SELECT weekly_champion()');"
sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -c "SELECT cron.schedule('0 0 1 * *', 'SELECT monthly_champion()');"
sudo psql -U ijmond_camera_monitor -d "$DATABASE_NAME" -c "SELECT cron.schedule('0 0 1 1 *', 'SELECT yearly_champion()');"

echo "All files processed."
