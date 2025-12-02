-- =====================================================
-- 009: Reports Table for Public Report Sharing
-- =====================================================
-- This migration creates a table to store generated reports
-- with public viewing capabilities via shareable links

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Report metadata
  title VARCHAR(500) NOT NULL,
  date_range VARCHAR(50) NOT NULL, -- e.g., "Last 30 Days"
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Keywords data
  total_keywords INTEGER DEFAULT 0,
  keywords_change NUMERIC(10, 2) DEFAULT 0,
  avg_ranking NUMERIC(10, 2) DEFAULT 0,
  ranking_change NUMERIC(10, 2) DEFAULT 0,
  top_keywords JSONB DEFAULT '[]'::jsonb, -- Array of {keyword, ranking, volume, change}
  ranking_trend JSONB DEFAULT '[]'::jsonb, -- Array of {date, avgRank, count}
  
  -- Content data
  total_content INTEGER DEFAULT 0,
  content_change NUMERIC(10, 2) DEFAULT 0,
  published_content INTEGER DEFAULT 0,
  draft_content INTEGER DEFAULT 0,
  content_by_platform JSONB DEFAULT '[]'::jsonb, -- Array of {platform, count, color}
  content_by_status JSONB DEFAULT '[]'::jsonb, -- Array of {status, count}
  recent_content JSONB DEFAULT '[]'::jsonb, -- Array of {title, platform, status, created}
  
  -- AI Visibility data
  avg_visibility_score NUMERIC(10, 2) DEFAULT 0,
  visibility_change NUMERIC(10, 2) DEFAULT 0,
  total_mentions INTEGER DEFAULT 0,
  mentions_change NUMERIC(10, 2) DEFAULT 0,
  visibility_by_platform JSONB DEFAULT '[]'::jsonb, -- Array of {platform, score, mentions, sentiment}
  visibility_trend JSONB DEFAULT '[]'::jsonb, -- Array of {date, score}
  
  -- Brand Analysis data
  total_projects INTEGER DEFAULT 0,
  active_sessions INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  responses_by_platform JSONB DEFAULT '[]'::jsonb, -- Array of {platform, count}
  
  -- Performance summary
  performance_summary JSONB DEFAULT '[]'::jsonb, -- Array of {metric, value, target}
  
  -- Access control
  is_public BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_organization_id ON public.reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_is_public ON public.reports(is_public) WHERE is_public = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_report_view_count(report_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.reports
  SET view_count = view_count + 1
  WHERE id = report_id_param;
END;
$$;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can create their own reports
CREATE POLICY "Users can create their own reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Anyone can view public reports (including unauthenticated users)
CREATE POLICY "Anyone can view public reports"
  ON public.reports
  FOR SELECT
  USING (is_public = true);

-- Policy 4: Users can update their own reports
CREATE POLICY "Users can update their own reports"
  ON public.reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy 5: Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
  ON public.reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 6: Organization members can view reports from their organization
CREATE POLICY "Organization members can view org reports"
  ON public.reports
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get report by ID (for public access)
CREATE OR REPLACE FUNCTION get_public_report_by_id(report_id UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  date_range VARCHAR(50),
  generated_at TIMESTAMP WITH TIME ZONE,
  total_keywords INTEGER,
  keywords_change NUMERIC(10, 2),
  avg_ranking NUMERIC(10, 2),
  ranking_change NUMERIC(10, 2),
  top_keywords JSONB,
  ranking_trend JSONB,
  total_content INTEGER,
  content_change NUMERIC(10, 2),
  published_content INTEGER,
  draft_content INTEGER,
  content_by_platform JSONB,
  content_by_status JSONB,
  recent_content JSONB,
  avg_visibility_score NUMERIC(10, 2),
  visibility_change NUMERIC(10, 2),
  total_mentions INTEGER,
  mentions_change NUMERIC(10, 2),
  visibility_by_platform JSONB,
  visibility_trend JSONB,
  total_projects INTEGER,
  active_sessions INTEGER,
  total_responses INTEGER,
  responses_by_platform JSONB,
  performance_summary JSONB,
  view_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment view count
  PERFORM increment_report_view_count(report_id);
  
  -- Return report data
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.date_range,
    r.generated_at,
    r.total_keywords,
    r.keywords_change,
    r.avg_ranking,
    r.ranking_change,
    r.top_keywords,
    r.ranking_trend,
    r.total_content,
    r.content_change,
    r.published_content,
    r.draft_content,
    r.content_by_platform,
    r.content_by_status,
    r.recent_content,
    r.avg_visibility_score,
    r.visibility_change,
    r.total_mentions,
    r.mentions_change,
    r.visibility_by_platform,
    r.visibility_trend,
    r.total_projects,
    r.active_sessions,
    r.total_responses,
    r.responses_by_platform,
    r.performance_summary,
    r.view_count
  FROM public.reports r
  WHERE r.id = report_id
    AND r.is_public = true;
END;
$$;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.reports IS 'Stores generated reports for public sharing and archival';
COMMENT ON COLUMN public.reports.id IS 'Unique UUID used in public URL for accessing the report';
COMMENT ON COLUMN public.reports.is_public IS 'Whether the report can be accessed publicly';
COMMENT ON COLUMN public.reports.view_count IS 'Number of times the report has been viewed';

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Allow authenticated users to insert/select/update/delete their own reports
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;

-- Allow anonymous users to select public reports
GRANT SELECT ON public.reports TO anon;

-- Allow execution of helper functions
GRANT EXECUTE ON FUNCTION get_public_report_by_id TO anon;
GRANT EXECUTE ON FUNCTION get_public_report_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION increment_report_view_count TO anon;
GRANT EXECUTE ON FUNCTION increment_report_view_count TO authenticated;

-- =====================================================
-- Sample Query Examples
-- =====================================================

-- Get all reports for current user:
-- SELECT * FROM reports WHERE user_id = auth.uid() ORDER BY generated_at DESC;

-- Get public report by ID:
-- SELECT * FROM get_public_report_by_id('report-uuid-here');

-- Get recent public reports:
-- SELECT id, title, date_range, generated_at, view_count 
-- FROM reports 
-- WHERE is_public = true 
-- ORDER BY generated_at DESC 
-- LIMIT 10;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports') THEN
    RAISE NOTICE '✅ Reports table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create reports table';
  END IF;
END $$;

