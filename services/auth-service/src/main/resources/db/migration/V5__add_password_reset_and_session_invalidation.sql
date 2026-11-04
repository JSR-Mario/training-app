-- =============================================================
-- auth-service: V5: Add password reset tokens and session invalidation
-- Schema: auth
-- =============================================================

ALTER TABLE auth.users
ADD COLUMN password_changed_at TIMESTAMPTZ;

CREATE TABLE auth.password_reset_tokens (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(64)  NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_password_reset_tokens_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_password_reset_tokens_user ON auth.password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON auth.password_reset_tokens (expires_at);

COMMENT ON COLUMN auth.users.password_changed_at IS 'Timestamp of last password change for session and refresh token invalidation.';
COMMENT ON TABLE  auth.password_reset_tokens     IS 'Stores single-use hashed password reset tokens with short expiry.';
