-- =============================================================
-- training-service — V10: Add right side reps for unilateral
-- Schema: training
-- =============================================================

ALTER TABLE training.workout_sets
ADD COLUMN reps_completed_right INT;

COMMENT ON COLUMN training.workout_sets.reps_completed_right IS 'Reps completed for the right side on unilateral exercises. reps_completed is used for the left side.';

-- Migrate existing unilateral exercises to have the same reps on the right side
UPDATE training.workout_sets ws
SET reps_completed_right = ws.reps_completed
FROM training.day_exercises de
JOIN training.exercises e ON de.exercise_id = e.id
WHERE ws.day_exercise_id = de.id
  AND e.unilateral = true;
