-- Add keyword_ideas column to keyword_plans table
-- This column will store the original keyword ideas data with search volumes and competition

-- Add the keyword_ideas column
ALTER TABLE keyword_plans 
ADD COLUMN IF NOT EXISTS keyword_ideas JSONB;

-- Add index for better query performance on keyword_ideas column
CREATE INDEX IF NOT EXISTS idx_keyword_plans_keyword_ideas ON keyword_plans USING gin(keyword_ideas);

-- Add comment for documentation
COMMENT ON COLUMN keyword_plans.keyword_ideas IS 'JSON array containing keyword ideas with search volumes, competition levels, and bid estimates from Google Ads API';

-- Example structure:
-- [
--   {
--     "text": "local seo services",
--     "avgMonthlySearches": 5400,
--     "competition": "HIGH",
--     "lowTopOfPageBid": 12.50,
--     "highTopOfPageBid": 45.30
--   }
-- ]

