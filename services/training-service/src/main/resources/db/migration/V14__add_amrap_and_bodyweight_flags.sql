-- Add is_bodyweight to exercises
ALTER TABLE training.exercises ADD COLUMN is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_amrap to day_exercises
ALTER TABLE training.day_exercises ADD COLUMN is_amrap BOOLEAN NOT NULL DEFAULT FALSE;
