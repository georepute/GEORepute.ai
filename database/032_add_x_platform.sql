-- ============================================================================
-- Add X (Twitter) Platform Support
-- ============================================================================
-- Adds 'x' to allowed platforms for content generation and publishing.
-- Run after 021_add_wordpress_platform.sql
-- ============================================================================

-- content_strategy: allow target_platform = 'x'
ALTER TABLE content_strategy 
  DROP CONSTRAINT IF EXISTS content_strategy_target_platform_check;

ALTER TABLE content_strategy 
  ADD CONSTRAINT content_strategy_target_platform_check 
  CHECK (target_platform IN (
    'reddit', 'quora', 'medium', 'github', 'facebook', 'linkedin', 'instagram',
    'shopify', 'wordpress', 'wordpress_self_hosted', 'x'
  ));

-- published_content: allow platform = 'x'
ALTER TABLE published_content 
  DROP CONSTRAINT IF EXISTS published_content_platform_check;

ALTER TABLE published_content 
  ADD CONSTRAINT published_content_platform_check 
  CHECK (platform IN (
    'reddit', 'quora', 'medium', 'github', 'facebook', 'linkedin', 'instagram',
    'shopify', 'wordpress', 'wordpress_self_hosted', 'x'
  ));

-- platform_integrations: allow future X OAuth (optional)
ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_platform_check;

ALTER TABLE platform_integrations ADD CONSTRAINT platform_integrations_platform_check 
  CHECK (platform IS NULL OR platform IN (
    'google_search_console', 'google_analytics', 'google_business_profile', 'google_ads',
    'facebook', 'linkedin', 'instagram', 'github', 'medium', 'quora', 'reddit',
    'shopify', 'wordpress', 'wordpress_self_hosted', 'x'
  ));
