-- ============================================
-- Global Visibility Matrix Table Migration
-- ============================================
-- This migration creates the table to store country-level visibility analysis
-- combining GSC data, AI presence, and demand metrics.
--
-- Run this SQL in your Supabase SQL Editor before using the Global Visibility Matrix feature.
-- ============================================

-- Create the global_visibility_matrix table
CREATE TABLE IF NOT EXISTS global_visibility_matrix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL,
  country_code TEXT NOT NULL,         -- ISO alpha-3 code (e.g., "USA", "DEU", "GBR")
  
  -- GSC Metrics (Organic Presence)
  gsc_clicks INTEGER DEFAULT 0,
  gsc_impressions INTEGER DEFAULT 0,
  gsc_ctr NUMERIC DEFAULT 0,
  gsc_avg_position NUMERIC DEFAULT 0,
  organic_score NUMERIC DEFAULT 0,     -- Normalized 0-100
  
  -- AI Presence Metrics (Source-Based Detection)
  ai_mention_count INTEGER DEFAULT 0,          -- How many platforms found the domain
  ai_visibility_score NUMERIC DEFAULT 0,       -- 0-100 score
  ai_platforms_present TEXT[] DEFAULT '{}',    -- Platforms where domain was found
  ai_sentiment NUMERIC DEFAULT 0,              -- -1 to 1
  
  -- Detailed Source Information
  ai_domain_found BOOLEAN DEFAULT false,       -- Was domain URL found in sources?
  ai_best_position INTEGER,                    -- Best position across all platforms
  ai_mentioned_competitors TEXT[] DEFAULT '{}', -- Other domains/brands AI mentioned
  ai_source_urls TEXT[] DEFAULT '{}',          -- Actual source URLs from AI responses
  ai_check_method VARCHAR(50) DEFAULT 'source_based', -- Detection methodology used
  
  -- Demand Metrics
  demand_score NUMERIC DEFAULT 0,     -- Normalized 0-100 (based on impressions relative to other countries)
  search_interest NUMERIC DEFAULT 0,  -- Relative interest
  
  -- Composite Scores
  overall_visibility_score NUMERIC DEFAULT 0, -- Weighted composite
  quadrant TEXT CHECK (quadrant IN ('strong', 'emerging', 'declining', 'absent')),
  opportunity_score NUMERIC DEFAULT 0,  -- How big the opportunity is (high demand + low presence)
  
  -- Metadata
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user, domain, country, and date range
  UNIQUE(user_id, domain_id, country_code, date_range_start, date_range_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gvm_user_domain 
  ON global_visibility_matrix(user_id, domain_id);

CREATE INDEX IF NOT EXISTS idx_gvm_quadrant 
  ON global_visibility_matrix(quadrant);

CREATE INDEX IF NOT EXISTS idx_gvm_country 
  ON global_visibility_matrix(country_code);

CREATE INDEX IF NOT EXISTS idx_gvm_date_range 
  ON global_visibility_matrix(date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_gvm_opportunity 
  ON global_visibility_matrix(opportunity_score DESC);

CREATE INDEX IF NOT EXISTS idx_gvm_ai_domain_found 
  ON global_visibility_matrix(ai_domain_found);

CREATE INDEX IF NOT EXISTS idx_gvm_ai_best_position 
  ON global_visibility_matrix(ai_best_position);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_global_visibility_matrix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_global_visibility_matrix_updated_at
  BEFORE UPDATE ON global_visibility_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_global_visibility_matrix_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE global_visibility_matrix ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can only view their own data
CREATE POLICY "Users can view their own global visibility matrix data"
  ON global_visibility_matrix
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert their own global visibility matrix data"
  ON global_visibility_matrix
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update their own global visibility matrix data"
  ON global_visibility_matrix
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own data
CREATE POLICY "Users can delete their own global visibility matrix data"
  ON global_visibility_matrix
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON global_visibility_matrix TO authenticated;
GRANT ALL ON global_visibility_matrix TO service_role;

-- ============================================
-- Migration Complete
-- ============================================
-- The global_visibility_matrix table is now ready to use.
-- 
-- Next steps:
-- 1. Navigate to /dashboard/global-visibility-matrix in your app
-- 2. Select a domain and click "Calculate Matrix"
-- 3. The system will analyze your GSC country data and populate this table
-- ============================================
