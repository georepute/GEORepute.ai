-- Add forecast column to keyword_plans table
-- This column will store the generated forecast data in JSON format

-- Add the forecast column
ALTER TABLE keyword_plans 
ADD COLUMN IF NOT EXISTS forecast JSONB;

-- Add index for better query performance on forecast column
CREATE INDEX IF NOT EXISTS idx_keyword_plans_forecast ON keyword_plans USING gin(forecast);

-- Add comment for documentation
COMMENT ON COLUMN keyword_plans.forecast IS 'JSON data containing forecast metrics (impressions, clicks, CTR, etc.) for the keywords in this plan';

-- Verify the column was added
DO $$ 
BEGIN
  RAISE NOTICE 'Forecast column has been added to keyword_plans table successfully';
END $$;

