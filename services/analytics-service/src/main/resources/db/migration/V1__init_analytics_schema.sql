CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE analytics.weekly_volume_snapshots (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    program_id UUID NOT NULL,
    week_number INT NOT NULL,
    body_part VARCHAR(30) NOT NULL,
    total_sets NUMERIC(7,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id, program_id, week_number, body_part)
);

CREATE TABLE analytics.exercise_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    exercise_id UUID NOT NULL,
    session_date DATE NOT NULL,
    max_weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
    total_volume_kg NUMERIC(8,2) NOT NULL DEFAULT 0,
    total_sets INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, exercise_id, session_date)
);
