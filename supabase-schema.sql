-- ══════════════════════════════════════
-- FakeTillReal — Supabase Schema
-- À exécuter dans : Supabase > SQL Editor
-- ══════════════════════════════════════

-- 1. Sessions de paiement Stripe (créées par le webhook)
CREATE TABLE IF NOT EXISTS paid_sessions (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT UNIQUE NOT NULL,   -- Stripe checkout session ID
  payment_intent  TEXT,
  amount_total    INT,
  currency        TEXT,
  account_created BOOLEAN DEFAULT FALSE,
  user_id         BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Comptes utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id                BIGSERIAL PRIMARY KEY,
  username          TEXT UNIQUE NOT NULL,  -- lowercase, 3-24 chars
  password_hash     TEXT NOT NULL,         -- bcrypt hash
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sessions de connexion (tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les lookups fréquents
CREATE INDEX IF NOT EXISTS idx_users_username       ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token       ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_paid_sessions_sid    ON paid_sessions(session_id);

-- Désactiver RLS (accès via service_role uniquement côté API Vercel)
ALTER TABLE paid_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users         DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      DISABLE ROW LEVEL SECURITY;
