CREATE OR REPLACE FUNCTION monthly_champion()
RETURNS VOID
LANGUAGE plpgsql AS
$$
DECLARE
    monthly_champion_id integer := 3
    max_score_user_id integer;
    monthNow int := EXTRACT(MONTH FROM CURRENT_DATE);
    yearNow int := EXTRACT(YEAR FROM CURRENT_DATE);
    today date := CURRENT_DATE;

    v_times_received integer;
    v_dummy integer;
BEGIN
    -- Select the user with the maximum score for the day
    SELECT user_id INTO max_score_user_id
    FROM monthly_score
    WHERE month = monthNow AND year = yearNow
    ORDER BY score DESC, raw_score DESC -- in case of tie, higher raw score wins
    LIMIT 1;

    -- Check if we found a user with the maximum score
    IF max_score_user_id IS NOT NULL THEN
        -- Check if the user already has this achievement for today
        SELECT times_received INTO v_times_received
        FROM achievement_user
        WHERE user_id = max_score_user_id AND achievement_id = monthly_champion_id;

        IF FOUND THEN
            -- Update times_received if the user already has this achievement
            UPDATE achievement_user
            SET times_received = v_times_received + 1
            WHERE user_id = max_score_user_id AND achievement_id = monthly_champion_id;
        ELSE
            -- Insert a new record if the user doesn't have this achievement yet
            INSERT INTO achievement_user (user_id, achievement_id, times_received)
            VALUES (max_score_user_id, monthly_champion_id, 1);
        END IF;

        -- Insert a record into AchievementDay for today, or do nothing if it already exists
        -- Check if the achievement_day record already exists
        PERFORM 1
        FROM achievement_day
        WHERE user_id = max_score_user_id AND achievement_id = monthly_champion_id AND date = today;

        -- If not found, then insert the new record
        IF NOT FOUND THEN
            INSERT INTO achievement_day (user_id, achievement_id, date)
            VALUES (max_score_user_id, monthly_champion_id, today);
        END IF;

    END IF;
END;
$$;