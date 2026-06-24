-- V8__add_cardio_support.sql

-- Add exercise type
ALTER TABLE training.exercises 
ADD COLUMN type VARCHAR(20) DEFAULT 'STRENGTH' NOT NULL;

-- Add cardio fields to day_exercises
ALTER TABLE training.day_exercises 
ADD COLUMN duration_minutes INT,
ADD COLUMN incline NUMERIC(5,2),
ADD COLUMN resistance NUMERIC(5,2);

-- Allow strength fields to be null in day_exercises
ALTER TABLE training.day_exercises ALTER COLUMN sets DROP NOT NULL;
ALTER TABLE training.day_exercises ALTER COLUMN reps DROP NOT NULL;

-- Add cardio fields to workout_sets
ALTER TABLE training.workout_sets
ADD COLUMN duration_minutes INT,
ADD COLUMN incline NUMERIC(5,2),
ADD COLUMN resistance NUMERIC(5,2);

-- Allow strength fields to be null in workout_sets
ALTER TABLE training.workout_sets ALTER COLUMN reps_completed DROP NOT NULL;
ALTER TABLE training.workout_sets ALTER COLUMN weight_kg DROP NOT NULL;
