-- =====================================================
-- Google Search Console Integration - README
-- =====================================================
-- This migration has been split into 5 separate files
-- for easier management and troubleshooting
-- =====================================================

-- EXECUTION ORDER:
-- Run these SQL files in your Supabase SQL Editor in this exact order:

-- 1. 010_01_platform_integrations.sql
--    Creates: platform_integrations table
--    Purpose: Stores OAuth tokens for various platform integrations
--    Dependencies: auth.users, organizations tables must exist

-- 2. 010_02_gsc_domains.sql
--    Creates: gsc_domains table
--    Purpose: Stores user's verified domains in Google Search Console
--    Dependencies: Requires platform_integrations table from step 1

-- 3. 010_03_gsc_analytics.sql
--    Creates: gsc_analytics table
--    Purpose: Stores Search Console analytics data
--    Dependencies: Requires gsc_domains table from step 2

-- 4. 010_04_gsc_queries.sql
--    Creates: gsc_queries table
--    Purpose: Stores top performing queries for detailed analysis
--    Dependencies: Requires gsc_domains table from step 2

-- 5. 010_05_gsc_pages.sql
--    Creates: gsc_pages table
--    Purpose: Stores top performing pages
--    Dependencies: Requires gsc_domains table from step 2

-- =====================================================
-- NOTES:
-- =====================================================
-- - Each file can be run independently as long as prerequisites are met
-- - All tables include Row Level Security (RLS) policies
-- - All tables include appropriate indexes for performance
-- - All tables include created_at and updated_at timestamps
-- - Tables use IF NOT EXISTS for idempotency
-- =====================================================

