-- =============================================================
-- training-service — V2: Workout logging tables
-- Schema: training
-- =============================================================

-- ----- Workout sessions -----

CREATE TABLE training.workout_sessions (
    id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           UUID         NOT NULL,
    day_template_id   UUID         NOT NULL REFERENCES training.day_templates (id) ON DELETE CASCADE,
    performed_on      DATE         NOT NULL,
    week_number       INT          NOT NULL,
    completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_workout_sessions_user_id ON training.workout_sessions (user_id);
CREATE INDEX idx_workout_sessions_day_template ON training.workout_sessions (day_template_id);

COMMENT ON TABLE training.workout_sessions IS 'An actual training session performed by the user.';

-- ----- Workout sets -----

CREATE TABLE training.workout_sets (
    id                UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id        UUID           NOT NULL REFERENCES training.workout_sessions (id) ON DELETE CASCADE,
    day_exercise_id   UUID           NOT NULL REFERENCES training.day_exercises (id) ON DELETE CASCADE,
    set_number        INT            NOT NULL,
    reps_completed    INT            NOT NULL,
    weight_kg         DECIMAL(6, 2)  NOT NULL,
    logged_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_sets_session ON training.workout_sets (session_id);

COMMENT ON TABLE training.workout_sets IS 'One logged set within a session.';
