ALTER TABLE training.day_exercises
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
