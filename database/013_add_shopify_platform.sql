-- ============================================================================
-- Add Shopify Platform Support
-- ============================================================================
-- This migration adds 'shopify' to the allowed platforms in:
-- 1. platform_integrations table
-- 2. content_strategy table
-- 3. published_content table
-- Run this after 011_add_ga4_gbp_platforms_FIXED.sql
-- ============================================================================

-- ============================================================================
-- PART 1: Update platform_integrations table
-- ============================================================================

-- STEP 1.1: Drop the existing platform constraint
ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_platform_check;

-- STEP 1.2: Add updated constraint with Shopify included
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
    'reddit',
    'shopify'
  ));

-- STEP 1.3: Update documentation comment
COMMENT ON COLUMN platform_integrations.platform IS 'Platform identifier. Supported: google_search_console, google_analytics, google_business_profile, google_ads, facebook, linkedin, instagram, github, medium, quora, reddit, shopify';

-- ============================================================================
-- PART 2: Update content_strategy table
-- ============================================================================

-- STEP 2.1: Drop the existing target_platform constraint
ALTER TABLE content_strategy 
DROP CONSTRAINT IF EXISTS content_strategy_target_platform_check;

-- STEP 2.2: Add updated constraint with Shopify included
ALTER TABLE content_strategy 
ADD CONSTRAINT content_strategy_target_platform_check 
CHECK (target_platform IN (
  'reddit',
  'quora', 
  'medium',
  'github',
  'facebook',
  'linkedin',
  'instagram',
  'shopify'
));

-- ============================================================================
-- PART 3: Update published_content table
-- ============================================================================

-- STEP 3.1: Drop the existing platform constraint
ALTER TABLE published_content 
DROP CONSTRAINT IF EXISTS published_content_platform_check;

-- STEP 3.2: Add updated constraint with Shopify included
ALTER TABLE published_content 
ADD CONSTRAINT published_content_platform_check 
CHECK (platform IN (
  'reddit',
  'quora', 
  'medium',
  'github',
  'facebook',
  'linkedin',
  'instagram',
  'shopify'
));

-- ============================================================================
-- PART 4: Verification queries (run separately after the above)
-- ============================================================================

-- Verify platform_integrations constraint
SELECT 
  'platform_integrations' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'platform_integrations'::regclass
  AND conname = 'platform_integrations_platform_check';

-- Verify content_strategy constraint
SELECT 
  'content_strategy' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'content_strategy_target_platform_check';

-- Verify published_content constraint
SELECT 
  'published_content' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'published_content_platform_check';

-- Show current platforms in use
SELECT 'platform_integrations' as table_name, platform, COUNT(*) as count 
FROM platform_integrations 
GROUP BY platform 
ORDER BY platform;

SELECT 'content_strategy' as table_name, target_platform as platform, COUNT(*) as count 
FROM content_strategy 
GROUP BY target_platform 
ORDER BY target_platform;

SELECT 'published_content' as table_name, platform, COUNT(*) as count 
FROM published_content 
GROUP BY platform 
ORDER BY platform;
