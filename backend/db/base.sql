-- Safe to run on every start. Tables are prefixed jp_ so they can never clash with another app in the same database.
CREATE TABLE IF NOT EXISTS jp_users (
  id            BIGSERIAL PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  country       CHAR(2) NOT NULL,
  level         VARCHAR(10) NOT NULL CHECK (level IN ('student','skilled')),
  fields        TEXT[] NOT NULL DEFAULT '{}',
  role          VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status        VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  consent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jp_users_email_key ON jp_users (lower(email));

CREATE TABLE IF NOT EXISTS jp_opportunities (
  id            BIGSERIAL PRIMARY KEY,
  company       VARCHAR(80)  NOT NULL,
  title         VARCHAR(120) NOT NULL,
  summary       VARCHAR(500) NOT NULL DEFAULT '',
  work_type     VARCHAR(60)  NOT NULL DEFAULT '',
  pay_note      VARCHAR(120) NOT NULL DEFAULT '',
  fields        TEXT[] NOT NULL DEFAULT '{}',
  min_level     VARCHAR(10) NOT NULL DEFAULT 'entry' CHECK (min_level IN ('entry','skilled')),
  country_mode  VARCHAR(10) NOT NULL DEFAULT 'all' CHECK (country_mode IN ('all','allow','block')),
  countries     TEXT[] NOT NULL DEFAULT '{}',
  apply_url     VARCHAR(600) NOT NULL,           -- the company's normal page, used when there is no referral link
  referral_url  VARCHAR(600),                    -- YOUR personal referral link from that company (leave empty if you have none)
  notes         VARCHAR(300) NOT NULL DEFAULT '',-- private admin reminder, never shown to visitors
  verified_at   DATE,                            -- when you last checked the company's rules
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jp_clicks (
  id             BIGSERIAL PRIMARY KEY,
  opportunity_id BIGINT NOT NULL REFERENCES jp_opportunities(id) ON DELETE CASCADE,
  user_id        BIGINT REFERENCES jp_users(id) ON DELETE SET NULL,
  referral       BOOLEAN NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jp_clicks_opp_idx ON jp_clicks (opportunity_id, created_at);

-- A company can not have two listings with the same title (also keeps the one-time import from ever duplicating).
CREATE UNIQUE INDEX IF NOT EXISTS jp_opps_company_title_key ON jp_opportunities (lower(company), lower(title));

-- Remembers one-time jobs, such as the Mercor import, so they never run twice (even if you later delete listings).
CREATE TABLE IF NOT EXISTS jp_meta (
  key     TEXT PRIMARY KEY,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
