-- =============================================================
-- training-service: V27: Add distance_km to cardio_logs
-- Schema: training
-- =============================================================

ALTER TABLE training.cardio_logs
    ADD COLUMN distance_km NUMERIC(6, 2);
