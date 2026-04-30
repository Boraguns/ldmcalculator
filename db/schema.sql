-- LDM Calculator backing store (Neon Postgres).
-- Run this once against your Neon database to provision tables.
-- psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS flag_companies (
    id           SERIAL PRIMARY KEY,
    country_code TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    logo_url     TEXT DEFAULT '',
    website      TEXT DEFAULT '',
    is_featured  BOOLEAN DEFAULT FALSE,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flag_companies_country ON flag_companies(country_code);

CREATE TABLE IF NOT EXISTS banners (
    slot       TEXT PRIMARY KEY,        -- 'left' | 'right' | 'top'
    image_url  TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    subject    TEXT DEFAULT '',
    message    TEXT NOT NULL,
    user_agent TEXT DEFAULT '',
    ip         TEXT DEFAULT '',
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertise_messages (
    id           SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT DEFAULT '',
    budget       TEXT DEFAULT '',
    message      TEXT DEFAULT '',
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screenshot_logs (
    id           SERIAL PRIMARY KEY,
    company_name TEXT DEFAULT '',
    plate        TEXT DEFAULT '',
    driver       TEXT DEFAULT '',
    note         TEXT DEFAULT '',
    truck_type   TEXT DEFAULT '',
    payload      JSONB,                 -- full form snapshot for forensic record
    user_agent   TEXT DEFAULT '',
    ip           TEXT DEFAULT '',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
