-- Migration: Add Performance Tracking Tables and Columns
-- Created: 2025-01-15
-- Description: Creates performance_snapshots table and adds auto-tracking columns to content_strategy

-- Create performance_snapshots table for historical tracking
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_strategy_id UUID NOT NULL REFERENCES content_strategy(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  snapshot_date TIMESTAMP NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_content_strategy 
  ON performance_snapshots(content_strategy_id);

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_platform 
  ON performance_snapshots(platform);

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_date 
  ON performance_snapshots(snapshot_date);

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_content_platform_date 
  ON performance_snapshots(content_strategy_id, platform, snapshot_date DESC);

-- Add auto_tracking_enabled flag to content_strategy (optional, for future use)
ALTER TABLE content_strategy 
  ADD COLUMN IF NOT EXISTS auto_tracking_enabled BOOLEAN DEFAULT true;

-- Add tracking_schedule to content_strategy (optional, for future use)
ALTER TABLE content_strategy 
  ADD COLUMN IF NOT EXISTS tracking_schedule JSONB DEFAULT '{"frequency": "daily", "time": "09:00"}'::jsonb;

-- Add comment to table
COMMENT ON TABLE performance_snapshots IS 'Stores historical performance metrics snapshots for content across different platforms';

-- Add comments to columns
COMMENT ON COLUMN performance_snapshots.content_strategy_id IS 'Reference to the content strategy this snapshot belongs to';
COMMENT ON COLUMN performance_snapshots.platform IS 'Platform name (instagram, facebook, etc.)';
COMMENT ON COLUMN performance_snapshots.snapshot_date IS 'Date and time when this snapshot was taken';
COMMENT ON COLUMN performance_snapshots.metrics IS 'JSON object containing platform-specific metrics (likes, comments, engagement, etc.)';
COMMENT ON COLUMN content_strategy.auto_tracking_enabled IS 'Whether automatic performance tracking is enabled for this content';
COMMENT ON COLUMN content_strategy.tracking_schedule IS 'JSON object with tracking schedule configuration (frequency, time)';

-- Enable Row Level Security (RLS) on performance_snapshots table
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own performance snapshots
-- (via content_strategy.user_id relationship)
-- Users can only see snapshots for content they own
CREATE POLICY "Users can view their own performance snapshots"
  ON performance_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content_strategy cs
      WHERE cs.id = performance_snapshots.content_strategy_id
      AND cs.user_id = auth.uid()
    )
  );

-- Policy: Service role can insert performance snapshots
-- (needed for the auto-track-performance Edge Function)
-- The service role bypasses RLS by default, but this policy ensures
-- the Edge Function can insert snapshots even when called with user context
CREATE POLICY "Service role can insert performance snapshots"
  ON performance_snapshots
  FOR INSERT
  WITH CHECK (true);

-- Note: 
-- - Users cannot directly insert/update/delete snapshots (only view)
-- - Snapshots are automatically created by the Edge Function
-- - The service role uses service_role_key which bypasses RLS, but this policy
--   ensures inserts work even if called in a different context
