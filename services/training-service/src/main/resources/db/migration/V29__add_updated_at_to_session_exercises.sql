-- Tracks when a session exercise's targets were last created (copied from the
-- day template when the session started) or edited in-workout, so sync can
-- keep the most recent edit when template and session diverge.
ALTER TABLE training.session_exercises
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- Active/legacy rows were copied from their template at session start
UPDATE training.session_exercises se
SET updated_at = ws.started_at
FROM training.workout_sessions ws
WHERE se.session_id = ws.id;
