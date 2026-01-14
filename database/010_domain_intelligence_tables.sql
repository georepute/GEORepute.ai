-- =====================================================
-- Domain Intelligence Database Tables
-- Description: Creates tables for domain intelligence
--              analysis jobs and results
-- =====================================================

-- Domain Intelligence Jobs (tracking)
CREATE TABLE IF NOT EXISTS domain_intelligence_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  domain_url VARCHAR(500) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  progress JSONB DEFAULT '{}', -- { currentStep: string, percentage: number, steps: {...} }
  results JSONB, -- Complete analysis results
  error_message TEXT,
  language VARCHAR(10) DEFAULT 'en',
  integrations JSONB DEFAULT '{}', -- { gsc: boolean, ga4: boolean, gbp: boolean }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_domain_intelligence_user_id ON domain_intelligence_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_intelligence_status ON domain_intelligence_jobs(status);
CREATE INDEX IF NOT EXISTS idx_domain_intelligence_domain ON domain_intelligence_jobs(domain_name);
CREATE INDEX IF NOT EXISTS idx_domain_intelligence_created ON domain_intelligence_jobs(created_at DESC);

-- Domain Visibility Checks (separate table for AI visibility results)
CREATE TABLE IF NOT EXISTS domain_visibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_url VARCHAR(500) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  language VARCHAR(10) DEFAULT 'en',
  results JSONB NOT NULL,
  overall_score DECIMAL(5,2),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domain_visibility_user_id ON domain_visibility_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_visibility_domain ON domain_visibility_checks(domain_name);

-- Enable Row Level Security (RLS)
ALTER TABLE domain_intelligence_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_visibility_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domain_intelligence_jobs
CREATE POLICY "Users can view their own domain intelligence jobs"
  ON domain_intelligence_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domain intelligence jobs"
  ON domain_intelligence_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domain intelligence jobs"
  ON domain_intelligence_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domain intelligence jobs"
  ON domain_intelligence_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for domain_visibility_checks
CREATE POLICY "Users can view their own visibility checks"
  ON domain_visibility_checks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visibility checks"
  ON domain_visibility_checks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_domain_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_domain_intelligence_updated_at ON domain_intelligence_jobs;
CREATE TRIGGER trigger_update_domain_intelligence_updated_at
  BEFORE UPDATE ON domain_intelligence_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_intelligence_updated_at();
