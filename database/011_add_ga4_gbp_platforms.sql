-- =====================================================
-- Add Google Analytics 4 and Google Business Profile to Platform Integrations
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- STEP 1: Check what platform values currently exist
-- Run this query first to see what platforms need to be handled:
/*
SELECT DISTINCT platform, COUNT(*) as count
FROM platform_integrations
GROUP BY platform
ORDER BY platform;
*/

-- STEP 2: If you see any platforms not in the list below, update them first:
-- Valid platforms: google_search_console, google_analytics, google_business_profile, 
--                  facebook, linkedin, instagram, github, medium, quora, reddit

-- STEP 3: Update any legacy/non-standard platform names
DO $$
DECLARE
  invalid_platforms TEXT[];
BEGIN
  -- Find all platforms that don't match our standard list
  SELECT ARRAY_AGG(DISTINCT platform) INTO invalid_platforms
  FROM platform_integrations
  WHERE platform NOT IN (
    'google_search_console',
    'google_analytics',
    'google_business_profile',
    'facebook', 
    'linkedin', 
    'instagram', 
    'github', 
    'medium', 
    'quora', 
    'reddit'
  );
  
  -- If there are invalid platforms, show them and don't proceed
  IF invalid_platforms IS NOT NULL AND array_length(invalid_platforms, 1) > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: Found invalid platform values: %. Please update these rows first. Run the SELECT query above to see details.', invalid_platforms;
  END IF;
  
  -- Normalize any common variations
  UPDATE platform_integrations 
  SET platform = 'google_search_console' 
  WHERE platform IN ('gsc', 'search_console');
  
  UPDATE platform_integrations 
  SET platform = 'google_analytics' 
  WHERE platform IN ('ga4', 'google_analytics_4');
  
  UPDATE platform_integrations 
  SET platform = 'google_business_profile' 
  WHERE platform IN ('gbp', 'google_my_business', 'gmb');
  
END $$;

-- STEP 4: Drop old constraint if it exists
ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_platform_check;

-- STEP 5: Add the updated constraint with GA4 and GBP
ALTER TABLE platform_integrations ADD CONSTRAINT platform_integrations_platform_check 
  CHECK (platform IN (
    'google_search_console',
    'google_analytics',
    'google_business_profile',
    'facebook', 
    'linkedin', 
    'instagram', 
    'github', 
    'medium', 
    'quora', 
    'reddit'
  ));

-- STEP 6: Add comment for documentation
COMMENT ON COLUMN platform_integrations.platform IS 'Platform identifier. Supported: google_search_console, google_analytics, google_business_profile, facebook, linkedin, instagram, github, medium, quora, reddit';
