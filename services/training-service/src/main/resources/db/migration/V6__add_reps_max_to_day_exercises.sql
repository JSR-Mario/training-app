-- =============================================================
-- training-service — V6: Add reps_max to day_exercises
-- Schema: training
-- =============================================================

ALTER TABLE training.day_exercises
ADD COLUMN reps_max INT DEFAULT NULL;

COMMENT ON COLUMN training.day_exercises.reps IS 'Minimum or target reps';
COMMENT ON COLUMN training.day_exercises.reps_max IS 'Maximum reps in the range (optional)';
