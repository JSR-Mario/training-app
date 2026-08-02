-- Backfills max_weight_reps, best_set_volume_weight_kg, best_set_volume_reps
-- for all exercise_progress rows that still carry the default zero from V5.
-- Joins across schemas (same Postgres instance). Safe to re-run (WHERE guards legacy rows).
UPDATE analytics.exercise_progress ep
SET
    max_weight_reps           = sub.max_weight_reps,
    best_set_volume_weight_kg = sub.best_set_volume_weight_kg,
    best_set_volume_reps      = sub.best_set_volume_reps
FROM (
    SELECT
        ws.session_id,
        se.exercise_id,
        -- Reps on the heaviest set (ties broken by higher reps)
        (
            SELECT ws2.reps_completed
            FROM   training.workout_sets ws2
            JOIN   training.session_exercises se2 ON se2.id = ws2.session_exercise_id
            WHERE  ws2.session_id      = ws.session_id
              AND  se2.exercise_id     = se.exercise_id
              AND  ws2.weight_kg       IS NOT NULL
              AND  ws2.reps_completed  IS NOT NULL
            ORDER BY ws2.weight_kg DESC, ws2.reps_completed DESC
            LIMIT 1
        ) AS max_weight_reps,
        -- Weight of the best set by volume
        (
            SELECT ws3.weight_kg
            FROM   training.workout_sets ws3
            JOIN   training.session_exercises se3 ON se3.id = ws3.session_exercise_id
            WHERE  ws3.session_id      = ws.session_id
              AND  se3.exercise_id     = se.exercise_id
              AND  ws3.weight_kg       IS NOT NULL
              AND  ws3.reps_completed  IS NOT NULL
            ORDER BY (ws3.weight_kg * ws3.reps_completed) DESC
            LIMIT 1
        ) AS best_set_volume_weight_kg,
        -- Reps of the best set by volume
        (
            SELECT ws4.reps_completed
            FROM   training.workout_sets ws4
            JOIN   training.session_exercises se4 ON se4.id = ws4.session_exercise_id
            WHERE  ws4.session_id      = ws.session_id
              AND  se4.exercise_id     = se.exercise_id
              AND  ws4.weight_kg       IS NOT NULL
              AND  ws4.reps_completed  IS NOT NULL
            ORDER BY (ws4.weight_kg * ws4.reps_completed) DESC
            LIMIT 1
        ) AS best_set_volume_reps
    FROM training.workout_sets ws
    JOIN training.session_exercises se ON se.id = ws.session_exercise_id
    WHERE ws.reps_completed IS NOT NULL
      AND ws.weight_kg      IS NOT NULL
    GROUP BY ws.session_id, se.exercise_id
) sub
WHERE ep.session_id  = sub.session_id
  AND ep.exercise_id = sub.exercise_id
  AND (
      ep.max_weight_reps      = 0
   OR ep.best_set_volume_reps = 0
  );
