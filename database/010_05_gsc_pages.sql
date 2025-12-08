-- =====================================================
-- Google Search Console Integration - Part 5
-- GSC Pages Table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- PREREQUISITE: Run 010_02_gsc_domains.sql first
-- =====================================================

-- gsc_pages table (for page-level performance)
-- Stores top performing pages separately
CREATE TABLE IF NOT EXISTS gsc_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES gsc_domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,8) DEFAULT 0,
  position NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain_id, date, page)
);

-- Add indexes for gsc_pages
CREATE INDEX IF NOT EXISTS idx_gsc_pages_domain_id ON gsc_pages(domain_id);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_user_id ON gsc_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_date ON gsc_pages(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_clicks ON gsc_pages(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_impressions ON gsc_pages(impressions DESC);

-- Enable RLS for gsc_pages
ALTER TABLE gsc_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_pages
DROP POLICY IF EXISTS "Users can view their own pages" ON gsc_pages;
CREATE POLICY "Users can view their own pages"
  ON gsc_pages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pages" ON gsc_pages;
CREATE POLICY "Users can insert their own pages"
  ON gsc_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pages" ON gsc_pages;
CREATE POLICY "Users can update their own pages"
  ON gsc_pages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pages" ON gsc_pages;
CREATE POLICY "Users can delete their own pages"
  ON gsc_pages FOR DELETE
  USING (auth.uid() = user_id);

