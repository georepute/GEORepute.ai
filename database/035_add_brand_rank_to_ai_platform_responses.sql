-- Store brand's competitor rank per response so the AI visibility prompts table can show rank without recomputing.
-- Set by competitor-analysis-engine when it stores competitor_analysis (brand rank = position in rankings for that session).

ALTER TABLE ai_platform_responses
  ADD COLUMN IF NOT EXISTS brand_rank INTEGER;

COMMENT ON COLUMN ai_platform_responses.brand_rank IS 'Brand''s position (1-based) from competitor rankings for this session; set when competitor analysis runs.';

CREATE INDEX IF NOT EXISTS idx_ai_platform_responses_brand_rank ON ai_platform_responses(brand_rank) WHERE brand_rank IS NOT NULL;
