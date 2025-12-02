-- =====================================================
-- Brand Analysis Database Tables for Supabase
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to create
-- all tables needed for the brand analysis functionality
-- =====================================================

-- 1. brand_analysis_projects
-- Stores brand analysis project configurations
CREATE TABLE IF NOT EXISTS brand_analysis_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  industry TEXT DEFAULT 'Technology',
  website_url TEXT,
  keywords TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  active_platforms TEXT[] DEFAULT '{}',
  target_keywords TEXT[] DEFAULT '{}',
  last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_brand_analysis_projects_user_id ON brand_analysis_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_projects_brand_name ON brand_analysis_projects(brand_name);

-- Enable Row Level Security (RLS)
ALTER TABLE brand_analysis_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own projects
CREATE POLICY "Users can view their own projects"
  ON brand_analysis_projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON brand_analysis_projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON brand_analysis_projects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON brand_analysis_projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================

-- 2. brand_analysis_sessions
-- Tracks individual analysis sessions and their progress
CREATE TABLE IF NOT EXISTS brand_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  session_name TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_queries INTEGER DEFAULT 0,
  completed_queries INTEGER DEFAULT 0,
  results_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sessions_project_id ON brand_analysis_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sessions_status ON brand_analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sessions_started_at ON brand_analysis_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE brand_analysis_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see sessions for their own projects
CREATE POLICY "Users can view sessions for their projects"
  ON brand_analysis_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = brand_analysis_sessions.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sessions for their projects"
  ON brand_analysis_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = brand_analysis_sessions.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions for their projects"
  ON brand_analysis_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = brand_analysis_sessions.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

-- =====================================================

-- 3. ai_platform_responses
-- Stores individual AI platform query responses
CREATE TABLE IF NOT EXISTS ai_platform_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES brand_analysis_sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('chatgpt', 'claude', 'gemini', 'perplexity', 'groq')),
  prompt TEXT NOT NULL,
  response TEXT,
  response_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_platform_responses_project_id ON ai_platform_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_platform_responses_session_id ON ai_platform_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_platform_responses_platform ON ai_platform_responses(platform);
CREATE INDEX IF NOT EXISTS idx_ai_platform_responses_created_at ON ai_platform_responses(created_at DESC);

-- Enable RLS
ALTER TABLE ai_platform_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see responses for their own projects
CREATE POLICY "Users can view responses for their projects"
  ON ai_platform_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = ai_platform_responses.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert responses for their projects"
  ON ai_platform_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = ai_platform_responses.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

-- =====================================================

-- 4. brand_analysis_website_analysis
-- Stores website content analysis results
CREATE TABLE IF NOT EXISTS brand_analysis_website_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES brand_analysis_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  analysis_result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_brand_analysis_website_analysis_project_id ON brand_analysis_website_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_website_analysis_url ON brand_analysis_website_analysis(url);

-- Enable RLS
ALTER TABLE brand_analysis_website_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see website analysis for their own projects
CREATE POLICY "Users can view website analysis for their projects"
  ON brand_analysis_website_analysis
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = brand_analysis_website_analysis.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert website analysis for their projects"
  ON brand_analysis_website_analysis
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_analysis_projects
      WHERE brand_analysis_projects.id = brand_analysis_website_analysis.project_id
      AND brand_analysis_projects.user_id = auth.uid()
    )
  );

-- =====================================================

-- 5. ai_visibility (if not already exists)
-- Stores AI visibility metrics (used by the GET endpoint)
CREATE TABLE IF NOT EXISTS ai_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date TIMESTAMPTZ DEFAULT NOW(),
  platform TEXT,
  visibility_score NUMERIC,
  mention_count INTEGER DEFAULT 0,
  sentiment_score NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_visibility_user_id ON ai_visibility(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_check_date ON ai_visibility(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_visibility_platform ON ai_visibility(platform);

-- Enable RLS
ALTER TABLE ai_visibility ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own visibility metrics
CREATE POLICY "Users can view their own visibility metrics"
  ON ai_visibility
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visibility metrics"
  ON ai_visibility
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Note: API keys are stored as Supabase Edge Function secrets
-- Set them using: supabase secrets set OPENAI_API_KEY=your_key
-- See SETUP_EDGE_FUNCTION_SECRETS.md for details
-- =====================================================
-- Summary
-- =====================================================
-- Tables created:
-- 1. brand_analysis_projects
-- 2. brand_analysis_sessions
-- 3. ai_platform_responses
-- 4. brand_analysis_website_analysis
-- 5. ai_visibility (if not exists)
--
-- Note: API keys are NOT stored in database.
-- They are stored as Supabase Edge Function secrets.
-- See SETUP_EDGE_FUNCTION_SECRETS.md for setup instructions.
-- 
-- All tables include:
-- - Proper foreign key relationships
-- - Indexes for performance
-- - Row Level Security (RLS) policies
-- - Timestamps (created_at, updated_at)
-- =====================================================

