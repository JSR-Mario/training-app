-- Set reps_completed_right to NULL for all sets where the exercise is not unilateral.
-- This cleans up historical corrupted data caused by a frontend bug.
UPDATE training.workout_sets ws
SET reps_completed_right = NULL
FROM training.day_exercises de
JOIN training.exercises e ON de.exercise_id = e.id
WHERE ws.day_exercise_id = de.id
  AND e.unilateral = false
  AND ws.reps_completed_right IS NOT NULL;
