ALTER TABLE training.workout_sessions
  ADD COLUMN last_resumed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN duration_seconds INT NOT NULL DEFAULT 0;

-- Backfill completed sessions with calculated elapsed seconds
UPDATE training.workout_sessions
SET duration_seconds = GREATEST(0, CAST(EXTRACT(EPOCH FROM (completed_at - started_at)) AS INT)),
    last_resumed_at = started_at
WHERE completed_at IS NOT NULL AND started_at IS NOT NULL;

-- Backfill active incomplete sessions
UPDATE training.workout_sessions
SET last_resumed_at = started_at
WHERE completed_at IS NULL AND started_at IS NOT NULL;
