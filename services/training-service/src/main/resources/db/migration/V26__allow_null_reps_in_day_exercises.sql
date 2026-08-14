-- Allow null reps for AMRAP day exercises
ALTER TABLE training.day_exercises ALTER COLUMN reps DROP NOT NULL;
