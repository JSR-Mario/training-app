-- =============================================================
-- training-service — V3: Add equipment_brand and unilateral to exercises
-- =============================================================

ALTER TABLE training.exercises ADD COLUMN equipment_brand VARCHAR(100);
ALTER TABLE training.exercises ADD COLUMN unilateral BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN training.exercises.equipment_brand IS 'Optional brand/model of the machine or equipment used.';
COMMENT ON COLUMN training.exercises.unilateral IS 'True if the exercise is performed one side at a time.';
