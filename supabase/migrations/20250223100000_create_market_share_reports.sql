-- Migration: Create market_share_reports table
-- Created: 2025-02-23
-- Description: Stores Market Share of Attention reports (AI mention share + organic proxy share)

CREATE TABLE IF NOT EXISTS market_share_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  ai_mention_share_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  ai_recommendation_share_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  weighted_ai_share_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  organic_share_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  market_share_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  is_default_leader BOOLEAN NOT NULL DEFAULT false,
  total_ai_queries INTEGER NOT NULL DEFAULT 0,
  total_ai_mentions INTEGER NOT NULL DEFAULT 0,
  total_recommendations INTEGER NOT NULL DEFAULT 0,
  total_gsc_queries INTEGER NOT NULL DEFAULT 0,
  top3_count INTEGER NOT NULL DEFAULT 0,
  total_impressions BIGINT NOT NULL DEFAULT 0,
  engine_breakdown JSONB NOT NULL DEFAULT '[]',
  intent_breakdown JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_share_reports_user_id
  ON market_share_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_market_share_reports_project_id
  ON market_share_reports(project_id);

CREATE INDEX IF NOT EXISTS idx_market_share_reports_generated_at
  ON market_share_reports(generated_at DESC);

-- Comments
COMMENT ON TABLE market_share_reports IS 'Stores Market Share of Attention reports: AI mention share + organic proxy share per brand project';
COMMENT ON COLUMN market_share_reports.ai_mention_share_pct IS 'How often AI engines mention the brand (0-100)';
COMMENT ON COLUMN market_share_reports.weighted_ai_share_pct IS 'Position-weighted AI share (1st=3pts, 2nd=2pts, 3rd=1pt)';
COMMENT ON COLUMN market_share_reports.organic_share_pct IS 'Impression-weighted share of top-3 GSC rankings';
COMMENT ON COLUMN market_share_reports.market_share_score IS 'Combined score: 0.6*AI + 0.4*Organic';
COMMENT ON COLUMN market_share_reports.is_default_leader IS 'True when market_share_score >= 35%';
COMMENT ON COLUMN market_share_reports.engine_breakdown IS 'Per-engine stats: [{engine, label, totalQueries, mentions, mentionSharePct, ...}]';
COMMENT ON COLUMN market_share_reports.intent_breakdown IS 'Query intent stats: {commercial, comparison, informational}';

-- Enable RLS
ALTER TABLE market_share_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own reports
CREATE POLICY "Users can view own market share reports"
  ON market_share_reports
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own market share reports"
  ON market_share_reports
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own market share reports"
  ON market_share_reports
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own market share reports"
  ON market_share_reports
  FOR DELETE
  USING (user_id = auth.uid());
