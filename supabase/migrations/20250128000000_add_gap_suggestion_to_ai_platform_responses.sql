-- Store AI-generated gap suggestions per (project, query) so they persist when switching projects.
ALTER TABLE ai_platform_responses
  ADD COLUMN IF NOT EXISTS gap_suggestion TEXT;

COMMENT ON COLUMN ai_platform_responses.gap_suggestion IS 'AI-generated suggestion for covering the Google vs AI visibility gap for this query (from Reports > AI vs Google Gap).';
