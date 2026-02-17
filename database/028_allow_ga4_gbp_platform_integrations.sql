-- =====================================================
-- Allow Google Analytics 4 and Google Business Profile
-- in platform_integrations (fix "not storing" in Supabase)
-- =====================================================
-- If GA4/GBP connections succeed in OAuth but no row appears
-- in platform_integrations, the platform CHECK constraint
-- is likely still the old one. Run this in Supabase SQL Editor.
-- =====================================================

-- Drop existing platform constraint
ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_platform_check;

-- Re-add constraint including google_analytics and google_business_profile
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
    'shopify',
    'wordpress',
    'wordpress_self_hosted'
  ));

COMMENT ON COLUMN platform_integrations.platform IS 'Platform identifier. Supported: google_search_console, google_analytics, google_business_profile, google_ads, facebook, linkedin, instagram, github, medium, quora, reddit, shopify, wordpress, wordpress_self_hosted';
