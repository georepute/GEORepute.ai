-- =====================================================
-- Opportunity Blind Spots Reports Table (Report #8)
-- =====================================================
-- Stores generated Opportunity & Blind Spots reports
-- with CPC from Google Ads API and gap from AI vs Google Gap report

CREATE TABLE IF NOT EXISTS public.opportunity_blind_spots_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL,

  domain_hostname TEXT NOT NULL,
  engines_used TEXT[] DEFAULT '{}',

  -- Summary
  total_queries INTEGER DEFAULT 0,
  priority_gaps_count INTEGER DEFAULT 0,
  avg_cpc NUMERIC(10, 2) DEFAULT 0,
  revenue_at_risk NUMERIC(12, 2) DEFAULT 0,

  -- Full report data: [{ query, demand, cpc, gap, estimatedValue, opportunityNote, band, ... }]
  queries JSONB DEFAULT '[]'::jsonb,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_opportunity_report_user_domain UNIQUE (user_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_reports_user_id ON public.opportunity_blind_spots_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_reports_domain_id ON public.opportunity_blind_spots_reports(domain_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_reports_generated_at ON public.opportunity_blind_spots_reports(generated_at DESC);

CREATE OR REPLACE FUNCTION update_opportunity_reports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_opportunity_reports_updated_at
  BEFORE UPDATE ON public.opportunity_blind_spots_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_reports_updated_at();

ALTER TABLE public.opportunity_blind_spots_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own opportunity reports"
  ON public.opportunity_blind_spots_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own opportunity reports"
  ON public.opportunity_blind_spots_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunity reports"
  ON public.opportunity_blind_spots_reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunity reports"
  ON public.opportunity_blind_spots_reports FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_blind_spots_reports TO authenticated;

COMMENT ON TABLE public.opportunity_blind_spots_reports IS 'Cached Opportunity & Blind Spots reports (Report #8) with CPC from Google Ads and gap from AI vs Google Gap';
