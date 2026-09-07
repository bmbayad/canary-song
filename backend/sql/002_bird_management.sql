-- Phase 2 Migration: Bird Management

-- Create enum for bird status
CREATE TYPE birdstatus AS ENUM ('Active', 'Archived');

-- Bird Types table
CREATE TABLE bird_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR UNIQUE NOT NULL,
    description VARCHAR,
    active VARCHAR NOT NULL DEFAULT 'true',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bird_type_name ON bird_types(name);

-- Birds table
CREATE TABLE birds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR NOT NULL,
    leg_band_number VARCHAR NOT NULL,
    bird_type_id UUID NOT NULL,
    sex VARCHAR,
    notes VARCHAR,
    status birdstatus NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id, leg_band_number)
);

CREATE INDEX idx_bird_owner_id ON birds(owner_id);
CREATE INDEX idx_bird_type_id ON birds(bird_type_id);

-- Insert default bird types
INSERT INTO bird_types (name, description, active) VALUES
    ('Canary – Waterslager', 'Waterslager canary', 'true'),
    ('Canary – Roller', 'Roller canary', 'true'),
    ('Canary – American Singer', 'American Singer canary', 'true');
