-- ============================================================
-- LabWise v3 — Database Schema
-- Matches app/models/*.py exactly.
-- Tables are also auto-created by SQLAlchemy on startup
-- (db.create_all()), but this file is provided for reference
-- and manual setup.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,

    tier VARCHAR(20) DEFAULT 'free',
    tier_expires_at TIMESTAMP,
    sessions_this_month INTEGER DEFAULT 0,
    last_session_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    theme VARCHAR(10) DEFAULT 'dark',
    auto_login BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL,           -- 'signup' | 'reset_password'
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS experiments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,        -- pendulum | hookes | moments
    title VARCHAR(120) NOT NULL,
    aim TEXT NOT NULL,
    theory TEXT NOT NULL,
    formula VARCHAR(200) NOT NULL,
    formula_explained TEXT NOT NULL,
    apparatus JSONB NOT NULL,
    precautions JSONB NOT NULL,
    sources_of_error JSONB NOT NULL,
    result_unit VARCHAR(30) NOT NULL,
    result_label VARCHAR(80) NOT NULL,
    min_tier VARCHAR(20) DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS lab_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    experiment_id INTEGER REFERENCES experiments(id),

    status VARCHAR(20) DEFAULT 'in_progress',  -- in_progress | completed
    config JSONB NOT NULL DEFAULT '{}',
    question JSONB,
    final_result JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES lab_sessions(id) ON DELETE CASCADE,
    trial_number INTEGER NOT NULL,
    raw_inputs JSONB NOT NULL,
    adjusted_inputs JSONB NOT NULL,
    calculated JSONB NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES lab_sessions(id) ON DELETE CASCADE UNIQUE,
    result_value FLOAT NOT NULL,
    uncertainty FLOAT NOT NULL,
    unit VARCHAR(30) NOT NULL,
    graph_data JSONB NOT NULL,
    report JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL,               -- tier1 | tier2 | tier3
    amount_ngn INTEGER NOT NULL,             -- amount in kobo
    paystack_reference VARCHAR(100) UNIQUE NOT NULL,
    paystack_status VARCHAR(20) DEFAULT 'pending',  -- pending | success | failed
    started_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes for common lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lab_sessions_user_id   ON lab_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_session_id    ON readings(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id   ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id  ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reference ON subscriptions(paystack_reference);
