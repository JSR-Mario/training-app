-- =============================================================
-- training-service -- V17: Create user_experience table
-- Schema: training
-- =============================================================
-- Stores each user's all-time accumulated workout volume (kg),
-- used as the XP source for the level progression system.
-- The row is created lazily on the first dashboard load and
-- updated incrementally when a session is completed or uncompleted.
-- =============================================================

CREATE TABLE training.user_experience (
    user_id     UUID            NOT NULL PRIMARY KEY,
    total_xp    NUMERIC(20, 2)  NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  training.user_experience             IS 'Accumulated workout volume (kg) per user, used for XP and level progression.';
COMMENT ON COLUMN training.user_experience.user_id    IS 'References the user in auth-service; no FK constraint across service boundaries.';
COMMENT ON COLUMN training.user_experience.total_xp   IS 'All-time sum of (weight_kg * total_reps) across all completed workout sets.';
COMMENT ON COLUMN training.user_experience.updated_at IS 'Timestamp of the last XP update.';