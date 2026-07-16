CREATE TABLE training.session_exercises (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES training.workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES training.exercises(id) ON DELETE CASCADE,
    sets INT,
    reps INT,
    reps_max INT,
    sort_order INT NOT NULL,
    is_amrap BOOLEAN NOT NULL DEFAULT FALSE,
    tmp_day_exercise_id UUID
);

-- Copy all day exercises for all existing sessions
INSERT INTO training.session_exercises (id, session_id, exercise_id, sets, reps, reps_max, sort_order, is_amrap, tmp_day_exercise_id)
SELECT 
    gen_random_uuid(), 
    ws.id, 
    de.exercise_id, 
    de.sets, 
    de.reps, 
    de.reps_max, 
    de.sort_order, 
    de.is_amrap,
    de.id
FROM training.workout_sessions ws
JOIN training.day_exercises de ON ws.day_template_id = de.day_template_id;

-- Add started_at to sessions
ALTER TABLE training.workout_sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
UPDATE training.workout_sessions SET started_at = COALESCE(completed_at, performed_on::timestamp at time zone 'UTC');
ALTER TABLE training.workout_sessions ALTER COLUMN started_at SET NOT NULL;

-- Update workout_sets to link to session_exercises
ALTER TABLE training.workout_sets ADD COLUMN session_exercise_id UUID;

UPDATE training.workout_sets wset
SET session_exercise_id = se.id
FROM training.session_exercises se
WHERE wset.session_id = se.session_id
  AND wset.day_exercise_id = se.tmp_day_exercise_id;

-- Update ratings to link to session_exercises
ALTER TABLE training.workout_session_exercise_ratings ADD COLUMN session_exercise_id UUID;

UPDATE training.workout_session_exercise_ratings r
SET session_exercise_id = se.id
FROM training.session_exercises se
WHERE r.session_id = se.session_id
  AND r.day_exercise_id = se.tmp_day_exercise_id;

-- Clean up
ALTER TABLE training.session_exercises DROP COLUMN tmp_day_exercise_id;

ALTER TABLE training.workout_sets ALTER COLUMN session_exercise_id SET NOT NULL;
ALTER TABLE training.workout_sets ADD CONSTRAINT fk_ws_session_exercise FOREIGN KEY (session_exercise_id) REFERENCES training.session_exercises(id) ON DELETE CASCADE;
ALTER TABLE training.workout_sets DROP COLUMN day_exercise_id;

ALTER TABLE training.workout_session_exercise_ratings ALTER COLUMN session_exercise_id SET NOT NULL;
ALTER TABLE training.workout_session_exercise_ratings ADD CONSTRAINT fk_rating_session_exercise FOREIGN KEY (session_exercise_id) REFERENCES training.session_exercises(id) ON DELETE CASCADE;
ALTER TABLE training.workout_session_exercise_ratings DROP COLUMN day_exercise_id;
