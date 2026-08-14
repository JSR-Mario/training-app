-- =============================================================
-- training-service — V25: Add program description, source_program_id and ratings
-- Schema: training
-- =============================================================

ALTER TABLE training.programs
ADD COLUMN description TEXT,
ADD COLUMN source_program_id UUID REFERENCES training.programs (id) ON DELETE SET NULL;

CREATE INDEX idx_programs_source_program_id ON training.programs (source_program_id);

CREATE TABLE training.program_ratings (
    id                 UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id         UUID         NOT NULL REFERENCES training.programs (id) ON DELETE CASCADE,
    user_id            UUID         NOT NULL,
    rating             INT          NOT NULL CHECK (rating >= 1 AND rating <= 10),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_program_ratings_program_id ON training.program_ratings (program_id);
CREATE INDEX idx_program_ratings_user_id ON training.program_ratings (user_id);
