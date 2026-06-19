-- =============================================================
-- training-service — V1: Initial schema and tables
-- Schema: training
-- =============================================================

CREATE SCHEMA IF NOT EXISTS training;

-- ----- Exercise catalog -----

CREATE TABLE training.exercises (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID         NOT NULL,
    name        VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_user_id ON training.exercises (user_id);

COMMENT ON TABLE training.exercises IS 'User-defined exercise catalog.';

-- ----- Exercise body-part targets -----

CREATE TABLE training.exercise_targets (
    id            UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    exercise_id   UUID           NOT NULL REFERENCES training.exercises (id) ON DELETE CASCADE,
    body_part     VARCHAR(30)    NOT NULL,
    target_value  DECIMAL(5, 2)  NOT NULL,

    CONSTRAINT uq_exercise_target UNIQUE (exercise_id, body_part)
);

COMMENT ON TABLE training.exercise_targets IS 'How much an exercise hits each body part (e.g. bench press: CHEST=1.0, TRICEPS=0.5).';

-- ----- Training programs -----

CREATE TABLE training.programs (
    id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID         NOT NULL,
    name            VARCHAR(200) NOT NULL,
    duration_weeks  INT          NOT NULL,
    start_date      DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_programs_user_id ON training.programs (user_id);

COMMENT ON TABLE training.programs IS 'A user-defined training program with a fixed duration in weeks.';

-- ----- Week templates -----

CREATE TABLE training.week_templates (
    id          UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id  UUID         NOT NULL REFERENCES training.programs (id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL
);

COMMENT ON TABLE training.week_templates IS 'A repeating week blueprint within a training program.';

-- ----- Day templates -----

CREATE TABLE training.day_templates (
    id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    week_template_id  UUID         NOT NULL REFERENCES training.week_templates (id) ON DELETE CASCADE,
    name              VARCHAR(200) NOT NULL
);

COMMENT ON TABLE training.day_templates IS 'A training day within a week (e.g. Push, Pull, Legs A).';

-- ----- Day exercises -----

CREATE TABLE training.day_exercises (
    id                UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    day_template_id   UUID  NOT NULL REFERENCES training.day_templates (id) ON DELETE CASCADE,
    exercise_id       UUID  NOT NULL REFERENCES training.exercises (id) ON DELETE CASCADE,
    sets              INT   NOT NULL,
    reps              INT   NOT NULL,
    sort_order        INT   NOT NULL
);

COMMENT ON TABLE training.day_exercises IS 'An exercise assigned to a day template, with prescribed sets, reps, and display order.';
