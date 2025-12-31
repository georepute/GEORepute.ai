-- Add Google Search Console tracking columns to brand_analysis_projects table

ALTER TABLE brand_analysis_projects
ADD COLUMN IF NOT EXISTS gsc_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gsc_keywords_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_gsc_sync TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN brand_analysis_projects.gsc_enabled IS 'Whether GSC integration is active for this project';
COMMENT ON COLUMN brand_analysis_projects.gsc_keywords_count IS 'Total number of keywords fetched from GSC';
COMMENT ON COLUMN brand_analysis_projects.last_gsc_sync IS 'Timestamp of last successful GSC keyword sync';

