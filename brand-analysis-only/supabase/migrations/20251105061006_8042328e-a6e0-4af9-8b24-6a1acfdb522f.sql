-- Brand Analysis Cleanup - Fix stuck sessions only
-- Sessions stuck in 'running' status for > 1 hour

UPDATE brand_analysis_sessions 
SET 
  status = 'failed', 
  completed_at = NOW(),
  results_summary = jsonb_build_object(
    'error', 'Session cleaned up - was stuck in running state',
    'cleanup_date', NOW(),
    'cleanup_reason', 'Phase 1 database cleanup',
    'original_started_at', started_at,
    'stuck_duration_hours', EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600
  )
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '1 hour';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_analysis_sessions_status 
  ON brand_analysis_sessions(status) 
  WHERE status IN ('running', 'pending');

CREATE INDEX IF NOT EXISTS idx_brand_analysis_sessions_project_status 
  ON brand_analysis_sessions(project_id, status);

CREATE INDEX IF NOT EXISTS idx_brand_analysis_sources_project 
  ON brand_analysis_sources(project_id);

-- Create cleanup function for future use
CREATE OR REPLACE FUNCTION cleanup_brand_analysis_stuck_sessions()
RETURNS TABLE(cleaned_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_cleaned INTEGER;
BEGIN
  UPDATE brand_analysis_sessions 
  SET 
    status = 'failed', 
    completed_at = NOW(),
    results_summary = jsonb_build_object(
      'error', 'Session auto-cleanup - stuck in running state',
      'cleanup_date', NOW()
    )
  WHERE status = 'running' 
    AND started_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS count_cleaned = ROW_COUNT;
  
  RETURN QUERY SELECT count_cleaned;
END;
$$;