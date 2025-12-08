-- =====================================================
-- Google Search Console Integration - Part 3
-- GSC Analytics Table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- PREREQUISITE: Run 010_02_gsc_domains.sql first
-- =====================================================

-- gsc_analytics table
-- Stores Search Console analytics data
CREATE TABLE IF NOT EXISTS gsc_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES gsc_domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Core metrics
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,8) DEFAULT 0, -- Click-through rate
  position NUMERIC(10,2) DEFAULT 0, -- Average position
  
  -- Dimensions (optional, for detailed breakdowns)
  query TEXT,
  page TEXT,
  country TEXT,
  device TEXT CHECK (device IS NULL OR device IN ('MOBILE', 'DESKTOP', 'TABLET')),
  search_appearance TEXT,
  
  -- Data type classifier
  data_type TEXT DEFAULT 'summary' CHECK (data_type IN ('summary', 'query', 'page', 'country', 'device', 'search_appearance')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for gsc_analytics
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_domain_id ON gsc_analytics(domain_id);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_user_id ON gsc_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_date ON gsc_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_data_type ON gsc_analytics(data_type);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_query ON gsc_analytics(query) WHERE query IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_page ON gsc_analytics(page) WHERE page IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_device ON gsc_analytics(device) WHERE device IS NOT NULL;

-- Composite unique constraint using expression index
CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_analytics_unique 
  ON gsc_analytics(domain_id, date, data_type, COALESCE(query, ''), COALESCE(page, ''), COALESCE(country, ''), COALESCE(device, ''));

-- Enable RLS for gsc_analytics
ALTER TABLE gsc_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_analytics
DROP POLICY IF EXISTS "Users can view their own analytics" ON gsc_analytics;
CREATE POLICY "Users can view their own analytics"
  ON gsc_analytics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics" ON gsc_analytics;
CREATE POLICY "Users can insert their own analytics"
  ON gsc_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analytics" ON gsc_analytics;
CREATE POLICY "Users can update their own analytics"
  ON gsc_analytics FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own analytics" ON gsc_analytics;
CREATE POLICY "Users can delete their own analytics"
  ON gsc_analytics FOR DELETE
  USING (auth.uid() = user_id);

