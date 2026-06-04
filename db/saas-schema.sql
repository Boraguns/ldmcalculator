-- ===========================================================================
-- LDM Calculator — SaaS layer (accounts, usage metering, subscriptions).
-- Provision with:  DATABASE_URL=postgres://... node db/migrate-saas.js
-- All statements are idempotent (IF NOT EXISTS) so they're safe to re-run.
-- ===========================================================================

-- --- End-user accounts (kept separate from admin_users) --------------------
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    email          TEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    first_name     TEXT DEFAULT '',
    last_name      TEXT DEFAULT '',
    phone          TEXT DEFAULT '',
    account_type   TEXT NOT NULL DEFAULT 'individual',  -- individual | corporate_admin | corporate_member
    company_id     INTEGER,
    email_verified BOOLEAN DEFAULT FALSE,
    status         TEXT NOT NULL DEFAULT 'active',       -- active | suspended
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- --- Corporate accounts ----------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    tax_number    TEXT DEFAULT '',
    tax_office    TEXT DEFAULT '',
    address       TEXT DEFAULT '',
    country       TEXT DEFAULT 'TR',
    seat_count    INTEGER NOT NULL DEFAULT 3,
    admin_user_id INTEGER,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seat invitations sent by a company admin (accepted via emailed link).
CREATE TABLE IF NOT EXISTS company_invites (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER NOT NULL,
    email       TEXT NOT NULL,
    token       TEXT UNIQUE NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',          -- member | admin
    status      TEXT NOT NULL DEFAULT 'pending',         -- pending | accepted | revoked | expired
    invited_by  INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_company_invites_company ON company_invites(company_id);

-- --- Email verification + password reset tokens ----------------------------
CREATE TABLE IF NOT EXISTS email_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    token      TEXT UNIQUE NOT NULL,
    type       TEXT NOT NULL,                            -- verify | reset
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id);

-- --- Pricing table (admin-managed, multi-currency) -------------------------
-- One row per (plan, tier, period, currency). tier is NULL for individual and
-- the seat count (3,5,10,20,30,50,100) for corporate.
CREATE TABLE IF NOT EXISTS pricing (
    id         SERIAL PRIMARY KEY,
    plan       TEXT NOT NULL,                            -- individual | corporate
    tier       INTEGER,                                  -- NULL=individual; seat count for corporate
    period     TEXT NOT NULL,                            -- monthly | yearly
    currency   TEXT NOT NULL,                            -- TRY | USD | EUR
    amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_rate   NUMERIC(5,2) NOT NULL DEFAULT 20,
    active     BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_combo
    ON pricing(plan, COALESCE(tier, -1), period, currency);

-- --- Subscriptions ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    id                   SERIAL PRIMARY KEY,
    owner_type           TEXT NOT NULL,                  -- user | company
    user_id              INTEGER,
    company_id           INTEGER,
    plan                 TEXT NOT NULL,                  -- individual | corporate
    period               TEXT NOT NULL,                 -- monthly | yearly
    tier                 INTEGER,                        -- corporate seat tier
    currency             TEXT NOT NULL DEFAULT 'TRY',
    amount               NUMERIC(12,2) NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'pending',-- pending | active | past_due | canceled | expired
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    provider             TEXT NOT NULL DEFAULT 'paytr',  -- paytr | manual (admin-approved request)
    paytr_token          TEXT DEFAULT '',                -- recurring/card token from PayTR
    paytr_sub_ref        TEXT DEFAULT '',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

-- --- Payments / invoices ---------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id              SERIAL PRIMARY KEY,
    subscription_id INTEGER,
    user_id         INTEGER,
    company_id      INTEGER,
    amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency        TEXT NOT NULL DEFAULT 'TRY',
    vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 20,
    vat_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',     -- pending | paid | failed | refunded
    provider        TEXT NOT NULL DEFAULT 'paytr',
    provider_ref    TEXT DEFAULT '',                     -- merchant_oid
    invoice_no      TEXT DEFAULT '',
    kind            TEXT NOT NULL DEFAULT 'subscription',-- subscription | proration | one_time
    raw             JSONB,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(provider_ref);

-- --- Usage metering (free-tier daily limits + history) ---------------------
CREATE TABLE IF NOT EXISTS usage_events (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER,
    ip          TEXT DEFAULT '',
    cookie_id   TEXT DEFAULT '',
    fingerprint TEXT DEFAULT '',
    kind        TEXT NOT NULL,                           -- stacking | tool
    tool        TEXT DEFAULT '',                         -- truck | train | cmr | invoice | packing | ...
    day         DATE NOT NULL DEFAULT CURRENT_DATE,
    meta        JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_day_user ON usage_events(day, user_id);
CREATE INDEX IF NOT EXISTS idx_usage_day_ip ON usage_events(day, ip);
CREATE INDEX IF NOT EXISTS idx_usage_day_cookie ON usage_events(day, cookie_id);
CREATE INDEX IF NOT EXISTS idx_usage_day_fp ON usage_events(day, fingerprint);

-- --- Saved tool documents (for re-download in the user panel) ---------------
CREATE TABLE IF NOT EXISTS documents (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    type       TEXT NOT NULL,                            -- cmr | invoice | packing
    title      TEXT DEFAULT '',
    data       JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

-- --- Consent log (KVKK aydınlatma / açık rıza / terms) ----------------------
CREATE TABLE IF NOT EXISTS consents (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    type       TEXT NOT NULL,                            -- kvkk | explicit | terms | marketing
    version    TEXT DEFAULT '1.0',
    ip         TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

-- --- Reference companies (public "Referanslar" gallery) ---------------------
-- Logo gallery of customers/partners. Managed from the admin panel; rendered
-- as a grid on /references. logo_url stores a data URL or absolute URL.
CREATE TABLE IF NOT EXISTS reference_companies (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    logo_url   TEXT DEFAULT '',
    website    TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reference_companies_sort ON reference_companies(sort_order, id);

-- --- Live chat (visitor ⇄ admin support) -----------------------------------
-- A simple polling-based live chat. A visitor (anonymous device or logged-in
-- user) may keep several conversations ("sessions"); an idle one auto-closes and
-- a fresh one can be started. Messages stream both ways and the admin panel
-- polls the same tables. visitor_key is a hashed anon-device id (see userauth).
CREATE TABLE IF NOT EXISTS chat_conversations (
    id             SERIAL PRIMARY KEY,
    visitor_key    TEXT NOT NULL,                         -- hashed anon device id
    user_id        INTEGER,                               -- set when logged in
    visitor_name   TEXT DEFAULT '',
    visitor_email  TEXT DEFAULT '',
    status         TEXT DEFAULT 'open',                   -- open | closed
    lang           TEXT DEFAULT '',                       -- visitor UI language (en|tr|de|ru|fr|ar)
    admin_unread   INTEGER DEFAULT 0,                     -- visitor msgs admin hasn't read
    visitor_unread INTEGER DEFAULT 0,                     -- admin msgs visitor hasn't read
    last_message   TEXT DEFAULT '',                       -- preview of the latest message
    last_sender    TEXT DEFAULT '',                       -- visitor | admin
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    ip             TEXT DEFAULT '',
    user_agent     TEXT DEFAULT '',
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conv_visitor ON chat_conversations(visitor_key);
CREATE INDEX IF NOT EXISTS idx_chat_conv_recent  ON chat_conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender          TEXT NOT NULL,                        -- visitor | admin
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, id);
