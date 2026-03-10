-- Store brand's competitor rank per response for AI visibility prompts table.
-- Set by competitor-analysis-engine when it stores competitor_analysis.

ALTER TABLE ai_platform_responses
  ADD COLUMN IF NOT EXISTS brand_rank INTEGER;

COMMENT ON COLUMN ai_platform_responses.brand_rank IS 'Brand''s position (1-based) from competitor rankings for this session; set when competitor analysis runs.';

CREATE INDEX IF NOT EXISTS idx_ai_platform_responses_brand_rank ON ai_platform_responses(brand_rank) WHERE brand_rank IS NOT NULL;
