-- =============================================================
-- auth-service — V1: Create users table
-- Schema: auth
-- =============================================================

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
    id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    username      VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email    UNIQUE (email)
);

COMMENT ON TABLE  auth.users                IS 'Application user accounts managed by auth-service.';
COMMENT ON COLUMN auth.users.id             IS 'Surrogate primary key — UUID v4.';
COMMENT ON COLUMN auth.users.username       IS 'Unique login name chosen by the user.';
COMMENT ON COLUMN auth.users.email          IS 'Unique email address.';
COMMENT ON COLUMN auth.users.password_hash  IS 'BCrypt hash (cost 12) of the user password.';
COMMENT ON COLUMN auth.users.created_at     IS 'Timestamp when the account was created (UTC).';
