-- Situation X: database setup for Supabase (or any PostgreSQL).
-- Paste this whole file into  Supabase -> SQL Editor -> New query -> Run.
--
-- It is safe to run more than once, and safe on a database that already has the older tables:
-- it only creates what is missing and adds the columns that older versions did not have.
-- It never deletes or changes existing data.

-- ---------------------------------------------------------------------------------------------
-- Analyses and feedback (older databases get the newer columns added)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analyses (
  id serial PRIMARY KEY,
  user_id text,
  situation text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  modules text[] NOT NULL,
  overall_result text NOT NULL,
  overall_confidence text NOT NULL,
  overall_score real NOT NULL DEFAULT 0,
  summary text NOT NULL,
  full_analysis jsonb,
  follow_up_at timestamp,
  follow_up_status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS follow_up_at timestamp;
ALTER TABLE analyses ADD COLUMN IF NOT EXISTS follow_up_status text NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses (user_id);
CREATE INDEX IF NOT EXISTS analyses_follow_up_idx ON analyses (user_id, follow_up_at);

CREATE TABLE IF NOT EXISTS feedback (
  id serial PRIMARY KEY,
  user_id text,
  analysis_id integer NOT NULL,
  situation_snippet text,
  rating integer NOT NULL,
  accuracy integer,
  comment text,
  helpful boolean,
  outcome text,
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS outcome text;
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON feedback (user_id);

-- ---------------------------------------------------------------------------------------------
-- Subscriptions, payments, credits
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id text PRIMARY KEY,
  plan text NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  order_id text NOT NULL,
  payment_id text,
  plan text NOT NULL,
  kind text NOT NULL DEFAULT 'plan',
  months integer NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  quote jsonb,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'plan';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS payments_order_id_idx ON payments (order_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments (user_id);

CREATE TABLE IF NOT EXISTS credit_wallets (
  user_id text PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_wallets_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  ref text,
  analysis_id integer,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_ledger_user_idx ON credit_ledger (user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_reason_ref_idx ON credit_ledger (reason, ref) WHERE ref IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- Invite a friend
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referral_codes (
  user_id text PRIMARY KEY,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_idx ON referral_codes (code);

CREATE TABLE IF NOT EXISTS referrals (
  id serial PRIMARY KEY,
  referrer_id text NOT NULL,
  referee_id text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_not_self CHECK (referrer_id <> referee_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referee_idx ON referrals (referee_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals (referrer_id);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  referral_id integer NOT NULL,
  discount_pct integer NOT NULL,
  status text NOT NULL DEFAULT 'available',
  order_id text,
  reserved_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_referral_idx ON referral_rewards (referral_id);
CREATE INDEX IF NOT EXISTS referral_rewards_user_idx ON referral_rewards (user_id, status);

-- ---------------------------------------------------------------------------------------------
-- Security: these tables are used only by the Situation X server, never directly from the browser.
-- Turning on Row Level Security (with no policies) blocks Supabase's public API from reading them,
-- while the server's own database connection keeps working.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE analyses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_wallets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
