-- =============================================================
-- analytics-service — V3: Add week_number and day_template_id to exercise_progress
-- =============================================================

ALTER TABLE analytics.exercise_progress
ADD COLUMN week_number INT,
ADD COLUMN day_template_id UUID;
