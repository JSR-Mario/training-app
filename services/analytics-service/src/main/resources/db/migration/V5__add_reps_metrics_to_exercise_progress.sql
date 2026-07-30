ALTER TABLE analytics.exercise_progress
ADD COLUMN max_weight_reps INT NOT NULL DEFAULT 0,
ADD COLUMN best_set_volume_weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
ADD COLUMN best_set_volume_reps INT NOT NULL DEFAULT 0;
