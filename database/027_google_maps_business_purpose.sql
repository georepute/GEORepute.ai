-- Add business_purpose to google_maps_reviews (used by onboarding and Assets Hub > Google Maps)
ALTER TABLE google_maps_reviews
ADD COLUMN IF NOT EXISTS business_purpose TEXT;

COMMENT ON COLUMN google_maps_reviews.business_purpose IS 'Company/business purpose (e.g. from onboarding)';
