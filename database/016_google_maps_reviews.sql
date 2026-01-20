-- Google Maps Reviews Table
-- Stores fetched reviews from Google Maps for user reference

CREATE TABLE IF NOT EXISTS google_maps_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  place_rating DECIMAL(2,1),
  place_reviews_total INTEGER,
  reviews_data JSONB DEFAULT '[]'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_google_maps_reviews_user_id ON google_maps_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_google_maps_reviews_place_id ON google_maps_reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_google_maps_reviews_organization_id ON google_maps_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_maps_reviews_fetched_at ON google_maps_reviews(fetched_at DESC);

-- Enable Row Level Security
ALTER TABLE google_maps_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own reviews
CREATE POLICY "Users can view own google_maps_reviews"
  ON google_maps_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reviews
CREATE POLICY "Users can insert own google_maps_reviews"
  ON google_maps_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own google_maps_reviews"
  ON google_maps_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own google_maps_reviews"
  ON google_maps_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Organization members can view reviews in their organization
CREATE POLICY "Organization members can view google_maps_reviews"
  ON google_maps_reviews
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_google_maps_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_maps_reviews_updated_at
  BEFORE UPDATE ON google_maps_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_google_maps_reviews_updated_at();

-- Add comments for documentation
COMMENT ON TABLE google_maps_reviews IS 'Stores Google Maps business reviews fetched by users';
COMMENT ON COLUMN google_maps_reviews.place_id IS 'Google Maps Place ID';
COMMENT ON COLUMN google_maps_reviews.place_name IS 'Business name from Google Maps';
COMMENT ON COLUMN google_maps_reviews.place_address IS 'Formatted address of the business';
COMMENT ON COLUMN google_maps_reviews.place_rating IS 'Overall rating (1-5)';
COMMENT ON COLUMN google_maps_reviews.place_reviews_total IS 'Total number of reviews on Google Maps';
COMMENT ON COLUMN google_maps_reviews.reviews_data IS 'JSONB array of review objects from Google Places API';
COMMENT ON COLUMN google_maps_reviews.fetched_at IS 'Timestamp when reviews were fetched from Google';

