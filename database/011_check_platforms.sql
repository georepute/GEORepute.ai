-- =====================================================
-- Check Current Platform Values in platform_integrations
-- =====================================================
-- Run this FIRST to see what platform values exist
-- =====================================================

-- See all distinct platform values and their counts
SELECT 
  platform,
  COUNT(*) as row_count,
  CASE 
    WHEN platform IN (
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
    ) THEN '✅ Valid'
    ELSE '❌ Invalid - needs update'
  END as status
FROM platform_integrations
GROUP BY platform
ORDER BY status, platform;

-- If you see any invalid platforms, update them like this:
-- Example: If you see 'gsc', update it:
-- UPDATE platform_integrations SET platform = 'google_search_console' WHERE platform = 'gsc';
--
-- Example: If you see 'ga4', update it:
-- UPDATE platform_integrations SET platform = 'google_analytics' WHERE platform = 'ga4';
--
-- Example: If you see 'gbp' or 'gmb', update it:
-- UPDATE platform_integrations SET platform = 'google_business_profile' WHERE platform IN ('gbp', 'gmb');
