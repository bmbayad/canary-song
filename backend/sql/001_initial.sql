-- Initial Schema - Phase 1
-- Creates tables for users and Google OAuth identities

-- Create enums
CREATE TYPE userrole AS ENUM ('Participant', 'Judge', 'Admin');
CREATE TYPE userstatus AS ENUM ('Active', 'Inactive', 'Suspended');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    display_name VARCHAR,
    role userrole NOT NULL DEFAULT 'Participant',
    status userstatus NOT NULL DEFAULT 'Active',
    preferred_language VARCHAR NOT NULL DEFAULT 'en',
    timezone VARCHAR,
    country_region VARCHAR,
    phone VARCHAR,
    notification_preferences VARCHAR,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE INDEX idx_user_email ON users(email);

-- Google Identities table (for OAuth linking)
CREATE TABLE google_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    google_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_google_identity_user_id ON google_identities(user_id);
CREATE INDEX idx_google_identity_google_id ON google_identities(google_id);
