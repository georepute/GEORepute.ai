-- =====================================================
-- 030: Strategic Blind Spots Reports Table
-- =====================================================
-- Stores generated Strategic Blind Spots report
-- Topics with demand but no brand presence (GSC + AI)

CREATE TABLE IF NOT EXISTS public.blind_spot_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL,

  domain_hostname TEXT NOT NULL,
  query_limit INTEGER DEFAULT 50,
  engines_used TEXT[] DEFAULT '{}',

  -- Summary
  total_blind_spots INTEGER DEFAULT 0,
  avg_blind_spot_score NUMERIC(10, 2) DEFAULT 0,
  ai_blind_spot_pct NUMERIC(5, 2) DEFAULT 0,

  -- Full report as JSONB
  blind_spots JSONB DEFAULT '[]'::jsonb,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_blind_spot_user_domain UNIQUE (user_id, domain_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blind_spot_reports_user_id ON public.blind_spot_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_blind_spot_reports_domain_id ON public.blind_spot_reports(domain_id);
CREATE INDEX IF NOT EXISTS idx_blind_spot_reports_generated_at ON public.blind_spot_reports(generated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_blind_spot_reports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_blind_spot_reports_updated_at ON public.blind_spot_reports;
CREATE TRIGGER trigger_update_blind_spot_reports_updated_at
  BEFORE UPDATE ON public.blind_spot_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_blind_spot_reports_updated_at();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.blind_spot_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own blind spot reports" ON public.blind_spot_reports;
CREATE POLICY "Users can create their own blind spot reports"
  ON public.blind_spot_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own blind spot reports" ON public.blind_spot_reports;
CREATE POLICY "Users can view their own blind spot reports"
  ON public.blind_spot_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own blind spot reports" ON public.blind_spot_reports;
CREATE POLICY "Users can update their own blind spot reports"
  ON public.blind_spot_reports FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own blind spot reports" ON public.blind_spot_reports;
CREATE POLICY "Users can delete their own blind spot reports"
  ON public.blind_spot_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blind_spot_reports TO authenticated;

COMMENT ON TABLE public.blind_spot_reports IS 'Cached Strategic Blind Spots reports per user+domain';
