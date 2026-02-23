-- Migration: Add analysis frequency and run history for recurring brand analysis
-- This enables automated re-runs (daily/weekly/monthly) and historical comparison

-- 1. Add analysis_frequency column to brand_analysis_projects
ALTER TABLE brand_analysis_projects 
ADD COLUMN IF NOT EXISTS analysis_frequency TEXT DEFAULT 'manual' 
CHECK (analysis_frequency IN ('manual', 'daily', 'weekly', 'monthly'));

-- 2. Add next_scheduled_at to track when the next run is due
ALTER TABLE brand_analysis_projects 
ADD COLUMN IF NOT EXISTS next_scheduled_at TIMESTAMPTZ;

-- 3. Create analysis_run_history table to store snapshot scores per run
CREATE TABLE IF NOT EXISTS analysis_run_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  session_id UUID REFERENCES brand_analysis_sessions(id) ON DELETE SET NULL,
  run_number INTEGER NOT NULL DEFAULT 1,
  run_type TEXT NOT NULL DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled')),
  
  -- Aggregate visibility scores
  overall_visibility_score NUMERIC(5,2) DEFAULT 0,
  platform_scores JSONB DEFAULT '{}',
  
  -- Query-level results snapshot
  total_queries INTEGER DEFAULT 0,
  queries_with_brand_mention INTEGER DEFAULT 0,
  brand_mention_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Sentiment breakdown
  positive_mentions INTEGER DEFAULT 0,
  neutral_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,
  
  -- Comparison deltas (vs previous run)
  visibility_delta NUMERIC(5,2) DEFAULT 0,
  mention_rate_delta NUMERIC(5,2) DEFAULT 0,
  
  -- Config snapshot (frozen at time of run)
  config_snapshot JSONB DEFAULT '{}',
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_run_history_project_id ON analysis_run_history(project_id);
CREATE INDEX IF NOT EXISTS idx_run_history_project_created ON analysis_run_history(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_projects_next_scheduled ON brand_analysis_projects(next_scheduled_at) 
  WHERE analysis_frequency != 'manual' AND next_scheduled_at IS NOT NULL;

-- RLS policies
ALTER TABLE analysis_run_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis run history"
  ON analysis_run_history FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM brand_analysis_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own analysis run history"
  ON analysis_run_history FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM brand_analysis_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own analysis run history"
  ON analysis_run_history FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM brand_analysis_projects WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role full access to analysis run history"
  ON analysis_run_history FOR ALL
  USING (auth.role() = 'service_role');
