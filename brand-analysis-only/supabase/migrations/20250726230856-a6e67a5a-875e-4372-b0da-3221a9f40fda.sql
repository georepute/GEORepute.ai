-- Fix critical RLS issues first

-- Enable RLS on all tables that have policies but RLS disabled
-- Based on the linter results, we need to identify and enable RLS

-- Enable RLS on any tables that have policies but RLS disabled
-- This query will enable RLS on tables that currently have policies but RLS is disabled
DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Find tables with policies but RLS disabled
    FOR table_record IN 
        SELECT DISTINCT tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename NOT IN (
            SELECT tablename 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE c.relrowsecurity = true
            AND t.schemaname = 'public'
        )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', 
                      table_record.schemaname, table_record.tablename);
        RAISE NOTICE 'Enabled RLS on table: %.%', table_record.schemaname, table_record.tablename;
    END LOOP;
END $$;

-- Enable RLS on tables that are completely missing RLS in public schema
-- Based on linter finding tables without RLS enabled

-- Check for common tables that should have RLS enabled
DO $$
DECLARE
    table_name TEXT;
    tables_to_secure TEXT[] := ARRAY[
        'ai_agents', 'analytics_events', 'api_keys', 'brand_analysis_sessions',
        'brand_mentions', 'chat_messages', 'content_fingerprints', 
        'deployment_configurations', 'feature_access_logs', 'ghosttrace_sites',
        'hero_section_config', 'integration_credentials', 'last_fold_settings',
        'llm_bot_visits', 'llms_files', 'message_attachments', 'message_feedback',
        'message_interactions', 'page_video_banners', 'profiles', 'realtime_metrics',
        'reddit_searches', 'reddit_threads_cache', 'reddit_user_bookmarks',
        'robots_files', 'scans', 'seo_metadata', 'speed_tests', 'teams',
        'user_feedback', 'user_notification_preferences', 'user_plans'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_secure
    LOOP
        -- Check if table exists and enable RLS if not already enabled
        IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_name AND schemaname = 'public') THEN
            -- Check if RLS is already enabled
            IF NOT EXISTS (
                SELECT 1 FROM pg_class c 
                JOIN pg_namespace n ON n.oid = c.relnamespace 
                WHERE c.relname = table_name 
                AND n.nspname = 'public' 
                AND c.relrowsecurity = true
            ) THEN
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
                RAISE NOTICE 'Enabled RLS on table: public.%', table_name;
            END IF;
        END IF;
    END LOOP;
END $$;