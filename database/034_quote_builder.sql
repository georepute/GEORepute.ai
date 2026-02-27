-- =====================================================
-- 034: Quote Builder Tables
-- =====================================================
-- Strategic Intelligence Quote Builder: quotes and activity log.
-- Run after brand_analysis_projects and organizations exist.
-- =====================================================

-- 1. quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.brand_analysis_projects(id) ON DELETE SET NULL,

  client_name TEXT,
  client_email TEXT,
  contact_person TEXT,
  domain TEXT NOT NULL,

  mode TEXT NOT NULL DEFAULT 'quick' CHECK (mode IN ('quick', 'advanced', 'internal')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until TIMESTAMPTZ,

  dcs_snapshot JSONB DEFAULT '{}',
  market_data JSONB DEFAULT '{}',
  revenue_exposure JSONB DEFAULT '{}',
  threat_data JSONB DEFAULT '{}',
  recommendation JSONB DEFAULT '{}',

  selected_reports TEXT[] DEFAULT '{}',
  selected_markets TEXT[] DEFAULT '{}',
  scope_adjustments JSONB DEFAULT '{}',
  pricing_data JSONB DEFAULT '{}',

  price_override NUMERIC,
  price_override_reason TEXT,
  internal_notes TEXT,
  margin_estimate NUMERIC,
  win_probability INTEGER CHECK (win_probability IS NULL OR (win_probability >= 0 AND win_probability <= 100)),

  share_token UUID DEFAULT gen_random_uuid() UNIQUE,
  total_monthly_price NUMERIC,
  proposal_version INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_organization_id ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON public.quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_share_token ON public.quotes(share_token);

-- 2. quote_activity_log table
CREATE TABLE IF NOT EXISTS public.quote_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_activity_log_quote_id ON public.quote_activity_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_activity_log_created_at ON public.quote_activity_log(created_at DESC);

-- 3. Trigger to update quotes.updated_at
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_quotes_updated_at ON public.quotes;
CREATE TRIGGER trigger_update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();

-- 4. Add white_label_config to organizations (if column does not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'white_label_config'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN white_label_config JSONB DEFAULT '{}';
  END IF;
END $$;

-- 5. RLS for quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own quotes"
  ON public.quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quotes"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own draft quotes"
  ON public.quotes FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- 5b. Function for public proposal view (fetch by share_token only)
CREATE OR REPLACE FUNCTION public.get_quote_by_share_token(token UUID)
RETURNS SETOF public.quotes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.quotes WHERE share_token = token;
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_by_share_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_quote_by_share_token(UUID) TO authenticated;

-- 6. RLS for quote_activity_log
ALTER TABLE public.quote_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity for their quotes"
  ON public.quote_activity_log FOR SELECT
  USING (
    quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert activity for their quotes"
  ON public.quote_activity_log FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND quote_id IN (SELECT id FROM public.quotes WHERE user_id = auth.uid())
  );

-- 7. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT, INSERT ON public.quote_activity_log TO authenticated;

COMMENT ON TABLE public.quotes IS 'Strategic Intelligence Quote Builder: proposals with DCS snapshot, pricing, and share token';
COMMENT ON TABLE public.quote_activity_log IS 'Audit log for quote changes and price overrides';
