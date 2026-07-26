-- =============================================================
-- auth-service — V4: Add email verification columns and table
-- Schema: auth
-- =============================================================

ALTER TABLE auth.users
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing users created prior to V4 are marked as verified
UPDATE auth.users SET email_verified = TRUE;

CREATE TABLE auth.verification_tokens (
    id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token        VARCHAR(64) NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_verification_tokens_token UNIQUE (token)
);

CREATE INDEX idx_verification_tokens_user ON auth.verification_tokens (user_id);

COMMENT ON COLUMN auth.users.email_verified IS 'Whether the user verified their email address.';
COMMENT ON TABLE  auth.verification_tokens  IS 'Stores email verification tokens and resend rate limits.';
