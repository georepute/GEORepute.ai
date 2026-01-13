-- =====================================================
-- Diagnose Platform Integration Issues
-- =====================================================
-- Run this FIRST to see what's causing the constraint error
-- =====================================================

-- Show all platform values and identify invalid ones
SELECT 
  platform,
  COUNT(*) as row_count,
  CASE 
    WHEN platform IS NULL THEN '⚠️ NULL'
    WHEN platform IN (
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
    ) THEN '✅ Valid'
    ELSE '❌ INVALID - Will cause constraint error'
  END as status,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM platform_integrations
GROUP BY platform
ORDER BY 
  CASE 
    WHEN platform IS NULL THEN 1
    WHEN platform IN ('google_search_console', 'google_analytics', 'google_business_profile', 'google_ads', 'facebook', 'linkedin', 'instagram', 'github', 'medium', 'quora', 'reddit') THEN 2
    ELSE 3
  END,
  platform;

-- Show sample rows with invalid platforms (if any)
SELECT 
  id,
  user_id,
  platform,
  status,
  created_at
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
  )
LIMIT 10;
