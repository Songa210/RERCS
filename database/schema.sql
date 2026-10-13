-- RERCS database schema (PostgreSQL)
-- Run this file inside the database "rercs_db".
-- WARNING: the DROP lines delete old tables, so running it again resets your data.

DROP TABLE IF EXISTS incident_updates CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS responders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS: citizens, dispatchers, responders and administrators
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    address       VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL
                  CHECK (role IN ('citizen', 'dispatcher', 'responder', 'admin')),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- 2. RESPONDERS: extra details for users whose role is 'responder'
CREATE TABLE responders (
    id             SERIAL PRIMARY KEY,
    user_id        INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    responder_type VARCHAR(20) NOT NULL
                   CHECK (responder_type IN ('police', 'medical', 'fire')),
    unit           VARCHAR(100),
    badge_number   VARCHAR(50),   -- police
    license_number VARCHAR(50),   -- medical
    station        VARCHAR(100),  -- fire
    status         VARCHAR(20) NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'busy', 'offline'))
);

-- 3. INCIDENTS: emergency reports and their progress
CREATE TABLE incidents (
    id            SERIAL PRIMARY KEY,
    citizen_id    INT NOT NULL REFERENCES users(id),
    type          VARCHAR(50)  NOT NULL,
    location      VARCHAR(255) NOT NULL,
    latitude      DECIMAL(9,6),
    longitude     DECIMAL(9,6),
    description   TEXT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'Reported'
                  CHECK (status IN ('Reported', 'Verified', 'Rejected', 'Assigned',
                                    'In Progress', 'Pending', 'Completed', 'Closed')),
    dispatcher_id INT REFERENCES users(id),
    responder_id  INT REFERENCES responders(id),
    reported_at   TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- 4. INCIDENT_UPDATES: history of every status change (keeps records)
CREATE TABLE incident_updates (
    id          SERIAL PRIMARY KEY,
    incident_id INT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL,
    note        TEXT,
    updated_by  INT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes make searching faster
CREATE INDEX idx_incidents_status  ON incidents(status);
CREATE INDEX idx_incidents_citizen ON incidents(citizen_id);
