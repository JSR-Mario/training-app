-- =============================================================
-- training-service — V14: Remove cardio from exercises
-- Schema: training
-- =============================================================

-- Delete cardio sets and day exercises
DELETE FROM training.workout_sets WHERE duration_minutes IS NOT NULL;
DELETE FROM training.day_exercises WHERE duration_minutes IS NOT NULL;

-- Delete cardio exercises
DELETE FROM training.exercises WHERE type = 'CARDIO';

-- Normalize NULLs in remaining (strength) data before applying NOT NULL
UPDATE training.workout_sets SET weight_kg = 0 WHERE weight_kg IS NULL;
UPDATE training.workout_sets SET reps_completed = 0 WHERE reps_completed IS NULL;
UPDATE training.day_exercises SET sets = 1 WHERE sets IS NULL;
UPDATE training.day_exercises SET reps = 1 WHERE reps IS NULL;

-- Drop type from exercises
ALTER TABLE training.exercises DROP COLUMN type;

-- Drop cardio fields from day_exercises
ALTER TABLE training.day_exercises DROP COLUMN duration_minutes;
ALTER TABLE training.day_exercises DROP COLUMN incline;
ALTER TABLE training.day_exercises DROP COLUMN resistance;

-- Restore NOT NULL constraints to day_exercises (from V2)
ALTER TABLE training.day_exercises ALTER COLUMN sets SET NOT NULL;
ALTER TABLE training.day_exercises ALTER COLUMN reps SET NOT NULL;

-- Drop cardio fields from workout_sets
ALTER TABLE training.workout_sets DROP COLUMN duration_minutes;
ALTER TABLE training.workout_sets DROP COLUMN incline;
ALTER TABLE training.workout_sets DROP COLUMN resistance;

-- Restore NOT NULL constraints to workout_sets (from V2)
ALTER TABLE training.workout_sets ALTER COLUMN reps_completed SET NOT NULL;
ALTER TABLE training.workout_sets ALTER COLUMN weight_kg SET NOT NULL;
