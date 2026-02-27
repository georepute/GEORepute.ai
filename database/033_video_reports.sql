-- =====================================================
-- 033: Video Report Columns & Table
-- =====================================================
-- Adds video generation support to existing report tables
-- and creates a generic report_videos table for reports
-- that don't have a dedicated table with a single row per domain.

-- ─── 1. ai_google_gap_reports — add video columns ───────────────────────────

ALTER TABLE public.ai_google_gap_reports
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_request_id TEXT,
  ADD COLUMN IF NOT EXISTS video_status TEXT,
  ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ;

-- ─── 2. market_share_reports — add video columns ────────────────────────────

ALTER TABLE public.market_share_reports
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_request_id TEXT,
  ADD COLUMN IF NOT EXISTS video_status TEXT,
  ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ;

-- ─── 3. opportunity_blind_spots_reports — add video columns ─────────────────

ALTER TABLE public.opportunity_blind_spots_reports
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_request_id TEXT,
  ADD COLUMN IF NOT EXISTS video_status TEXT,
  ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ;

-- ─── 4. report_videos — generic video table for reports without a dedicated ─
--        report row per domain (global-visibility-matrix, geo-visibility,
--        ai-search-presence)

CREATE TABLE IF NOT EXISTS public.report_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identifies the specific report and resource
  report_type TEXT NOT NULL,   -- 'global-visibility-matrix' | 'geo-visibility-market-coverage' | 'ai-search-presence'
  domain_id UUID,              -- for domain-based reports
  project_id UUID,             -- for project-based reports (ai-search-presence)

  -- Video state
  video_url TEXT,
  video_request_id TEXT,
  video_status TEXT DEFAULT 'idle',
  video_generated_at TIMESTAMPTZ,
  video_requested_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- no table-level unique constraint; partial indexes below handle NULL permutations correctly
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_videos_user_id ON public.report_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_report_videos_domain_id ON public.report_videos(domain_id);
CREATE INDEX IF NOT EXISTS idx_report_videos_project_id ON public.report_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_report_videos_type ON public.report_videos(report_type);

-- Partial unique indexes to handle nullable domain_id / project_id correctly
-- (PostgreSQL treats NULLs as distinct in regular UNIQUE constraints)
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_video_domain_only
  ON public.report_videos (user_id, report_type, domain_id)
  WHERE project_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_video_project_only
  ON public.report_videos (user_id, report_type, project_id)
  WHERE domain_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_video_both
  ON public.report_videos (user_id, report_type, domain_id, project_id)
  WHERE domain_id IS NOT NULL AND project_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_report_videos_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_report_videos_updated_at ON public.report_videos;
CREATE TRIGGER trigger_update_report_videos_updated_at
  BEFORE UPDATE ON public.report_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_report_videos_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.report_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own report videos" ON public.report_videos;
CREATE POLICY "Users can create their own report videos"
  ON public.report_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own report videos" ON public.report_videos;
CREATE POLICY "Users can view their own report videos"
  ON public.report_videos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own report videos" ON public.report_videos;
CREATE POLICY "Users can update their own report videos"
  ON public.report_videos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own report videos" ON public.report_videos;
CREATE POLICY "Users can delete their own report videos"
  ON public.report_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_videos TO authenticated;

COMMENT ON TABLE public.report_videos IS 'Generic video generation tracking for reports that do not have a dedicated single-row-per-domain table';

-- ─── 5. Storage buckets (run these manually in Supabase Dashboard → Storage) ─
--
-- CREATE BUCKET: gap-report-videos       (for ai-vs-google-gap)
-- CREATE BUCKET: market-share-videos     (for market-share-of-attention)
-- CREATE BUCKET: opportunity-videos      (for opportunity-blind-spots)
-- CREATE BUCKET: visibility-matrix-videos (for global-visibility-matrix)
-- CREATE BUCKET: geo-visibility-videos   (for geo-visibility-market-coverage)
-- CREATE BUCKET: ai-presence-videos      (for ai-search-presence)
--
-- Note: The existing "blind-spot-videos" bucket is used by strategic-blind-spots.
-- All new buckets should be set to PUBLIC with the same settings.
