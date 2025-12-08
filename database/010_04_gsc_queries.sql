-- =====================================================
-- Google Search Console Integration - Part 4
-- GSC Queries Table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- PREREQUISITE: Run 010_02_gsc_domains.sql first
-- =====================================================

-- gsc_queries table (for detailed query analysis)
-- Stores top performing queries separately for better analysis
CREATE TABLE IF NOT EXISTS gsc_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES gsc_domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,8) DEFAULT 0,
  position NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain_id, date, query)
);

-- Add indexes for gsc_queries
CREATE INDEX IF NOT EXISTS idx_gsc_queries_domain_id ON gsc_queries(domain_id);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_user_id ON gsc_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_date ON gsc_queries(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_clicks ON gsc_queries(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_impressions ON gsc_queries(impressions DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_query_text ON gsc_queries USING gin(to_tsvector('english', query));

-- Enable RLS for gsc_queries
ALTER TABLE gsc_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_queries
DROP POLICY IF EXISTS "Users can view their own queries" ON gsc_queries;
CREATE POLICY "Users can view their own queries"
  ON gsc_queries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own queries" ON gsc_queries;
CREATE POLICY "Users can insert their own queries"
  ON gsc_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own queries" ON gsc_queries;
CREATE POLICY "Users can update their own queries"
  ON gsc_queries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own queries" ON gsc_queries;
CREATE POLICY "Users can delete their own queries"
  ON gsc_queries FOR DELETE
  USING (auth.uid() = user_id);

