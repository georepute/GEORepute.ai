-- Migration: Setup Cron Job for Automatic Performance Tracking
-- Created: 2025-01-15
-- Description: Schedules the auto-track-performance Edge Function to run daily at 9 AM UTC
-- Prerequisites: pg_cron and pg_net extensions must be enabled

-- Drop existing cron job if it exists (to allow re-running this migration)
SELECT cron.unschedule('auto-track-performance') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-track-performance'
);

-- Schedule the Edge Function to run daily at 9 AM UTC
SELECT cron.schedule(
  'auto-track-performance',
  '0 9 * * *',
  'SELECT net.http_post(
    url := ''https://tgucgsvrcuxngwnchjtq.supabase.co/functions/v1/auto-track-performance'',
    headers := jsonb_build_object(
      ''Content-Type'', ''application/json'',
      ''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)
    ),
    body := ''{}''::jsonb
  ) AS request_id;'
);
