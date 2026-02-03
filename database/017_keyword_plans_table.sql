  -- Create keyword_plans table for storing Google Ads Manager keyword plans
-- This table stores keyword plans created through the KF2 (Keyword Forecast 2) interface

CREATE TABLE IF NOT EXISTS keyword_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  google_ads_plan_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_keyword_plans_user_id ON keyword_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_plans_created_at ON keyword_plans(created_at DESC);

-- Enable Row Level Security
ALTER TABLE keyword_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can create their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can update their own keyword plans" ON keyword_plans;
DROP POLICY IF EXISTS "Users can delete their own keyword plans" ON keyword_plans;

-- Create RLS policies
CREATE POLICY "Users can view their own keyword plans"
  ON keyword_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keyword plans"
  ON keyword_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyword plans"
  ON keyword_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyword plans"
  ON keyword_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_keyword_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_keyword_plans_updated_at ON keyword_plans;
CREATE TRIGGER trigger_update_keyword_plans_updated_at
  BEFORE UPDATE ON keyword_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_keyword_plans_updated_at();

-- Add comments for documentation
COMMENT ON TABLE keyword_plans IS 'Stores keyword plans created through the Google Ads Manager (KF2) interface';
COMMENT ON COLUMN keyword_plans.id IS 'Unique identifier for the keyword plan';
COMMENT ON COLUMN keyword_plans.user_id IS 'Reference to the user who created the plan';
COMMENT ON COLUMN keyword_plans.name IS 'User-defined name for the keyword plan';
COMMENT ON COLUMN keyword_plans.keywords IS 'Array of keywords included in the plan';
COMMENT ON COLUMN keyword_plans.google_ads_plan_id IS 'Google Ads API plan ID if synced with Google Ads';
COMMENT ON COLUMN keyword_plans.created_at IS 'Timestamp when the plan was created';
COMMENT ON COLUMN keyword_plans.updated_at IS 'Timestamp when the plan was last updated';

