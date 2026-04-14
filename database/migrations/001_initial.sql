-- database/migrations/001_initial.sql
-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- =========================
-- USERS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
-- =========================
-- ANALYSES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  intent TEXT NOT NULL,
  emotion TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  simulation JSONB NOT NULL,
  astro JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at);
-- =========================
-- FEEDBACK TABLE
-- =========================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_analysis_id ON feedback(analysis_id);
-- =========================
-- ENABLE RLS
-- =========================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
-- =========================
-- RLS POLICIES
-- =========================
-- USERS
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (auth.uid() = id);
-- ANALYSES
CREATE POLICY "Users can view their analyses"
ON analyses
FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their analyses"
ON analyses
FOR INSERT
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their analyses"
ON analyses
FOR DELETE
USING (auth.uid() = user_id);
-- FEEDBACK
CREATE POLICY "Users can view their feedback"
ON feedback
FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert feedback"
ON feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);
