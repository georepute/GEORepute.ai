-- Allow user to choose how many queries to run per AI platform (1-50).
-- Used for AI Visibility with Option A: equal split across (language × region) buckets.

ALTER TABLE brand_analysis_projects
  ADD COLUMN IF NOT EXISTS queries_per_platform INTEGER DEFAULT 50;

-- Constrain to 1-50 (application also enforces; this is a safety check)
ALTER TABLE brand_analysis_projects
  ADD CONSTRAINT chk_queries_per_platform_range
  CHECK (queries_per_platform IS NULL OR (queries_per_platform >= 1 AND queries_per_platform <= 50));

COMMENT ON COLUMN brand_analysis_projects.queries_per_platform IS 'Number of queries to run per AI platform (1-50). Distributed equally across language×region buckets.';