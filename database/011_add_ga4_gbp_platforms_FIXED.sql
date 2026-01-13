-- =====================================================
-- Add Google Analytics 4 and Google Business Profile to Platform Integrations
-- FIXED VERSION - Handles existing data safely
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop the constraint first (this allows us to update data)
ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_platform_check;

-- STEP 2: First, let's see what platform values exist (for debugging)
-- Uncomment to see what platforms you have:
-- SELECT DISTINCT platform, COUNT(*) as count FROM platform_integrations GROUP BY platform ORDER BY platform;

-- STEP 3: Normalize any common platform name variations
UPDATE platform_integrations 
SET platform = 'google_search_console' 
WHERE platform IN ('gsc', 'search_console');

UPDATE platform_integrations 
SET platform = 'google_analytics' 
WHERE platform IN ('ga4', 'google_analytics_4');

UPDATE platform_integrations 
SET platform = 'google_business_profile' 
WHERE platform IN ('gbp', 'google_my_business', 'gmb');

-- STEP 4: Handle any remaining invalid platforms
-- This will show what invalid platforms exist and set them to a safe default
DO $$
DECLARE
  invalid_count INTEGER;
  invalid_platforms TEXT;
BEGIN
  -- Count invalid platforms
  SELECT COUNT(*), COALESCE(STRING_AGG(DISTINCT platform, ', '), '')
  INTO invalid_count, invalid_platforms
  FROM platform_integrations
  WHERE platform IS NOT NULL
    AND platform NOT IN (
      'google_search_console',
      'google_analytics',
      'google_business_profile',
      'google_ads',
      'facebook', 
      'linkedin', 
      'instagram', 
      'github', 
      'medium', 
      'quora', 
      'reddit'
    );
  
  IF invalid_count > 0 THEN
    -- Log what we found
    RAISE NOTICE 'Found % rows with invalid platform values: %', invalid_count, invalid_platforms;
    
    -- Set invalid platforms to NULL (we can update them later if needed)
    -- This allows the constraint to be added
    UPDATE platform_integrations 
    SET platform = NULL 
    WHERE platform IS NOT NULL
      AND platform NOT IN (
        'google_search_console',
        'google_analytics',
        'google_business_profile',
        'google_ads',
        'facebook', 
        'linkedin', 
        'instagram', 
        'github', 
        'medium', 
        'quora', 
        'reddit'
      );
    
    RAISE NOTICE 'Set % invalid platform values to NULL. You can update them manually later.', invalid_count;
  END IF;
END $$;

-- STEP 5: Add the updated constraint with GA4, GBP, and Google Ads
-- Allow NULL values (platform can be NULL if not set yet)
ALTER TABLE platform_integrations ADD CONSTRAINT platform_integrations_platform_check 
  CHECK (platform IS NULL OR platform IN (
    'google_search_console',
    'google_analytics',
    'google_business_profile',
    'google_ads',
    'facebook', 
    'linkedin', 
    'instagram', 
    'github', 
    'medium', 
    'quora', 
    'reddit'
  ));

-- STEP 6: Add comment for documentation
COMMENT ON COLUMN platform_integrations.platform IS 'Platform identifier. Supported: google_search_console, google_analytics, google_business_profile, google_ads, facebook, linkedin, instagram, github, medium, quora, reddit';

-- STEP 7: Verify the constraint was added successfully
SELECT 
  constraint_name,
  constraint_type,
  'Constraint added successfully!' as status
FROM information_schema.table_constraints
WHERE table_name = 'platform_integrations'
  AND constraint_name = 'platform_integrations_platform_check';

-- STEP 8: Show current platform distribution (for verification)
SELECT 
  COALESCE(platform, 'NULL') as platform,
  COUNT(*) as row_count
FROM platform_integrations
GROUP BY platform
ORDER BY platform;
