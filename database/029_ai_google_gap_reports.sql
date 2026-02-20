-- =====================================================
-- 029: AI vs Google Gap Reports Table
-- =====================================================
-- Stores generated AI vs Google gap analysis reports
-- so users don't need to regenerate each time

CREATE TABLE IF NOT EXISTS public.ai_google_gap_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL,
  
  domain_hostname TEXT NOT NULL,
  query_limit INTEGER DEFAULT 30,
  engines_used TEXT[] DEFAULT '{}',

  -- Summary fields for quick access
  total_queries INTEGER DEFAULT 0,
  avg_gap_score NUMERIC(10, 2) DEFAULT 0,
  ai_risk_count INTEGER DEFAULT 0,
  moderate_gap_count INTEGER DEFAULT 0,
  balanced_count INTEGER DEFAULT 0,
  seo_opportunity_count INTEGER DEFAULT 0,
  seo_failure_count INTEGER DEFAULT 0,

  -- Full report data as JSONB
  queries JSONB DEFAULT '[]'::jsonb,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One report per user+domain; regeneration replaces the row
  CONSTRAINT uq_gap_report_user_domain UNIQUE (user_id, domain_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gap_reports_user_id ON public.ai_google_gap_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_gap_reports_domain_id ON public.ai_google_gap_reports(domain_id);
CREATE INDEX IF NOT EXISTS idx_gap_reports_generated_at ON public.ai_google_gap_reports(generated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_gap_reports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_gap_reports_updated_at
  BEFORE UPDATE ON public.ai_google_gap_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_gap_reports_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.ai_google_gap_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own gap reports"
  ON public.ai_google_gap_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own gap reports"
  ON public.ai_google_gap_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own gap reports"
  ON public.ai_google_gap_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gap reports"
  ON public.ai_google_gap_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Organization members can view gap reports for their org's domains
CREATE POLICY "Org members can view org gap reports"
  ON public.ai_google_gap_reports FOR SELECT
  USING (
    user_id IN (
      SELECT ou.user_id FROM public.organization_users ou
      WHERE ou.organization_id IN (
        SELECT ou2.organization_id FROM public.organization_users ou2
        WHERE ou2.user_id = auth.uid() AND ou2.status = 'active'
      )
      AND ou.status = 'active'
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_google_gap_reports TO authenticated;

COMMENT ON TABLE public.ai_google_gap_reports IS 'Cached AI vs Google gap analysis reports per user+domain';
