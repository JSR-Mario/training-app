-- =============================================================
-- training-service — V7: Add session notes and ratings
-- Schema: training
-- =============================================================

-- Add notes to workout_sessions
ALTER TABLE training.workout_sessions
ADD COLUMN notes TEXT;

COMMENT ON COLUMN training.workout_sessions.notes IS 'General notes for this specific session';

-- Create table for exercise ratings within a session
CREATE TABLE training.workout_session_exercise_ratings (
    id                UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id        UUID  NOT NULL REFERENCES training.workout_sessions (id) ON DELETE CASCADE,
    day_exercise_id   UUID  NOT NULL REFERENCES training.day_exercises (id) ON DELETE CASCADE,
    rating            INT   NOT NULL CHECK (rating >= 1 AND rating <= 10),

    CONSTRAINT uq_session_exercise_rating UNIQUE (session_id, day_exercise_id)
);

CREATE INDEX idx_session_exercise_ratings_session_id ON training.workout_session_exercise_ratings (session_id);

COMMENT ON TABLE training.workout_session_exercise_ratings IS '1-10 rating for how an exercise felt during a specific session.';
