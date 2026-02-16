-- Query configuration for Brand Analysis (AI Visibility): auto vs manual vs combined, max 50 queries per run (250 total across 5 platforms).

ALTER TABLE brand_analysis_projects
  ADD COLUMN IF NOT EXISTS query_mode TEXT DEFAULT 'auto' CHECK (query_mode IN ('auto', 'manual', 'auto_manual')),
  ADD COLUMN IF NOT EXISTS manual_queries JSONB DEFAULT '[]';

COMMENT ON COLUMN brand_analysis_projects.query_mode IS 'How queries are built: auto (generate 50), manual (user list only), auto_manual (generate + user list, cap 50 total).';
COMMENT ON COLUMN brand_analysis_projects.manual_queries IS 'User-added queries: array of { text: string, language?: string, country?: string }. Used when query_mode is manual or auto_manual.';
