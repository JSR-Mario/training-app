CREATE TABLE training.cardio_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    duration_minutes INT NOT NULL,
    cardio_type VARCHAR(255),
    performed_on DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_cardio_logs_user_id ON training.cardio_logs(user_id);
CREATE INDEX idx_cardio_logs_performed_on ON training.cardio_logs(performed_on);
