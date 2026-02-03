-- Geographic region and language options for Brand Analysis query generation (AI Visibility).
-- If analysis_countries is empty, queries are general; if set, queries are geography-specific.

ALTER TABLE brand_analysis_projects
  ADD COLUMN IF NOT EXISTS analysis_languages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis_countries TEXT[] DEFAULT '{}';

COMMENT ON COLUMN brand_analysis_projects.analysis_languages IS 'Language codes for query generation (e.g. en-US, he, de). Empty = use app/default.';
COMMENT ON COLUMN brand_analysis_projects.analysis_countries IS 'Country/region codes for geography-specific queries (e.g. US, GB, DE). Empty = general queries.';
