-- =============================================================
-- analytics-service — V4: Replace (user_id, exercise_id, session_date) unique
-- constraint with (user_id, exercise_id, session_id) so that each workout
-- session gets its own progress entry regardless of the calendar date.
-- This prevents entries from being overwritten when the same exercise appears
-- in multiple sessions performed on the same day.
-- =============================================================

ALTER TABLE analytics.exercise_progress ADD COLUMN session_id UUID;

ALTER TABLE analytics.exercise_progress
    DROP CONSTRAINT exercise_progress_user_id_exercise_id_session_date_key;

ALTER TABLE analytics.exercise_progress
    ADD CONSTRAINT exercise_progress_user_exercise_session_key
    UNIQUE (user_id, exercise_id, session_id);
