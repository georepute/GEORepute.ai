-- =====================================================
-- Migration: Update GSC Tables Foreign Keys
-- Description: Updates gsc_analytics, gsc_queries, gsc_pages, and gsc_keywords
--              to reference domains table instead of gsc_domains
-- =====================================================

-- Step 1: Check which tables exist and report
DO $$
DECLARE
  has_analytics BOOLEAN;
  has_queries BOOLEAN;
  has_pages BOOLEAN;
  has_keywords BOOLEAN;
BEGIN
  -- Check table existence
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_analytics'
  ) INTO has_analytics;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_queries'
  ) INTO has_queries;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_pages'
  ) INTO has_pages;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_keywords'
  ) INTO has_keywords;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'GSC Tables Status Check';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'gsc_analytics exists: %', has_analytics;
  RAISE NOTICE 'gsc_queries exists: %', has_queries;
  RAISE NOTICE 'gsc_pages exists: %', has_pages;
  RAISE NOTICE 'gsc_keywords exists: %', has_keywords;
  RAISE NOTICE '==============================================';
END $$;

-- Step 2: Update gsc_analytics table
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_analytics'
  ) THEN
    -- Drop old constraint
    ALTER TABLE gsc_analytics DROP CONSTRAINT IF EXISTS gsc_analytics_domain_id_fkey;
    
    -- Add new constraint
    ALTER TABLE gsc_analytics 
      ADD CONSTRAINT gsc_analytics_domain_id_fkey 
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    
    -- Add comment
    COMMENT ON CONSTRAINT gsc_analytics_domain_id_fkey ON gsc_analytics 
      IS 'References domains table (migrated from gsc_domains)';
    
    RAISE NOTICE 'Updated gsc_analytics foreign key ✓';
  ELSE
    RAISE NOTICE 'Skipped gsc_analytics (table does not exist)';
  END IF;
END $$;

-- Step 3: Update gsc_queries table
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_queries'
  ) THEN
    -- Drop old constraint
    ALTER TABLE gsc_queries DROP CONSTRAINT IF EXISTS gsc_queries_domain_id_fkey;
    
    -- Add new constraint
    ALTER TABLE gsc_queries 
      ADD CONSTRAINT gsc_queries_domain_id_fkey 
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    
    -- Add comment
    COMMENT ON CONSTRAINT gsc_queries_domain_id_fkey ON gsc_queries 
      IS 'References domains table (migrated from gsc_domains)';
    
    RAISE NOTICE 'Updated gsc_queries foreign key ✓';
  ELSE
    RAISE NOTICE 'Skipped gsc_queries (table does not exist)';
  END IF;
END $$;

-- Step 4: Update gsc_pages table
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_pages'
  ) THEN
    -- Drop old constraint
    ALTER TABLE gsc_pages DROP CONSTRAINT IF EXISTS gsc_pages_domain_id_fkey;
    
    -- Add new constraint
    ALTER TABLE gsc_pages 
      ADD CONSTRAINT gsc_pages_domain_id_fkey 
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    
    -- Add comment
    COMMENT ON CONSTRAINT gsc_pages_domain_id_fkey ON gsc_pages 
      IS 'References domains table (migrated from gsc_domains)';
    
    RAISE NOTICE 'Updated gsc_pages foreign key ✓';
  ELSE
    RAISE NOTICE 'Skipped gsc_pages (table does not exist)';
  END IF;
END $$;

-- Step 5: Update gsc_keywords table (if it uses domain_id)
-- Note: There are two different gsc_keywords tables in the system:
--   1. One for brand analysis (uses project_id) - should NOT be modified
--   2. One for GSC domains (uses domain_id) - needs foreign key update
-- We check if the table has domain_id column before modifying it
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gsc_keywords'
  ) AND EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'gsc_keywords' 
      AND column_name = 'domain_id'
  ) THEN
    -- Drop old constraint
    ALTER TABLE gsc_keywords DROP CONSTRAINT IF EXISTS gsc_keywords_domain_id_fkey;
    
    -- Add new constraint
    ALTER TABLE gsc_keywords 
      ADD CONSTRAINT gsc_keywords_domain_id_fkey 
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;
    
    -- Add comment
    COMMENT ON CONSTRAINT gsc_keywords_domain_id_fkey ON gsc_keywords 
      IS 'References domains table (migrated from gsc_domains)';
    
    RAISE NOTICE 'Updated gsc_keywords foreign key ✓';
  ELSE
    RAISE NOTICE 'Skipped gsc_keywords (table does not exist or does not have domain_id column)';
  END IF;
END $$;

-- Step 6: Optional cleanup - delete orphaned records
-- Uncomment the appropriate sections below if you want to remove orphaned data

-- Clean up gsc_analytics orphaned records
/*
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gsc_analytics') THEN
    DELETE FROM gsc_analytics WHERE domain_id NOT IN (SELECT id FROM domains);
    RAISE NOTICE 'Cleaned up orphaned gsc_analytics records';
  END IF;
END $$;
*/

-- Clean up gsc_queries orphaned records
/*
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gsc_queries') THEN
    DELETE FROM gsc_queries WHERE domain_id NOT IN (SELECT id FROM domains);
    RAISE NOTICE 'Cleaned up orphaned gsc_queries records';
  END IF;
END $$;
*/

-- Clean up gsc_pages orphaned records
/*
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gsc_pages') THEN
    DELETE FROM gsc_pages WHERE domain_id NOT IN (SELECT id FROM domains);
    RAISE NOTICE 'Cleaned up orphaned gsc_pages records';
  END IF;
END $$;
*/

-- Clean up gsc_keywords orphaned records (only if table has domain_id column)
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'gsc_keywords' AND column_name = 'domain_id'
  ) THEN
    DELETE FROM gsc_keywords WHERE domain_id NOT IN (SELECT id FROM domains);
    RAISE NOTICE 'Cleaned up orphaned gsc_keywords records';
  END IF;
END $$;
*/

-- Step 7: Final verification and summary
DO $$
DECLARE
  analytics_count INTEGER := 0;
  queries_count INTEGER := 0;
  pages_count INTEGER := 0;
  keywords_count INTEGER := 0;
  domains_with_gsc INTEGER;
BEGIN
  -- Count records in each table (only if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gsc_analytics') THEN
    SELECT COUNT(*) INTO analytics_count FROM gsc_analytics;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gsc_queries') THEN
    SELECT COUNT(*) INTO queries_count FROM gsc_queries;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gsc_pages') THEN
    SELECT COUNT(*) INTO pages_count FROM gsc_pages;
  END IF;
  
  -- Only count gsc_keywords if it has domain_id column (not the brand analysis one)
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'gsc_keywords' AND column_name = 'domain_id'
  ) THEN
    SELECT COUNT(*) INTO keywords_count FROM gsc_keywords;
  END IF;
  
  -- Count domains with GSC integration
  SELECT COUNT(*) INTO domains_with_gsc FROM domains WHERE gsc_integration IS NOT NULL;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Foreign keys updated to reference domains table';
  RAISE NOTICE '';
  RAISE NOTICE 'Final statistics:';
  RAISE NOTICE '  - Domains with GSC integration: %', domains_with_gsc;
  RAISE NOTICE '  - gsc_analytics records: %', analytics_count;
  RAISE NOTICE '  - gsc_queries records: %', queries_count;
  RAISE NOTICE '  - gsc_pages records: %', pages_count;
  RAISE NOTICE '  - gsc_keywords records: %', keywords_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All existing GSC tables now reference domains table';
  RAISE NOTICE 'Non-existent tables were safely skipped';
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- End of Migration
-- =====================================================
