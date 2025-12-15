-- =====================================================
-- Alter Platform Integrations Table
-- =====================================================
-- Run this SQL if platform_integrations table already exists
-- This will add missing columns and update constraints
-- =====================================================

-- Add missing columns (if they don't exist)
-- Note: PostgreSQL will skip if column already exists with IF NOT EXISTS in newer versions
-- For older versions, we use DO blocks

-- Add scope column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'scope'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN scope TEXT;
  END IF;
END $$;

-- Add organization_id column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add platform_user_id column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'platform_user_id'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN platform_user_id TEXT;
  END IF;
END $$;

-- Add platform_username column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'platform_username'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN platform_username TEXT;
  END IF;
END $$;

-- Add token_type column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'token_type'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN token_type TEXT DEFAULT 'Bearer';
  END IF;
END $$;

-- Add expires_at column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add status column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'status'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN status TEXT DEFAULT 'connected';
  END IF;
END $$;

-- Add metadata column (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'platform_integrations' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE platform_integrations ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Update platform CHECK constraint to include all platforms
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'platform_integrations' AND constraint_name LIKE '%platform%check%'
  ) THEN
    ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_platform_check;
  END IF;
  
  -- Add updated constraint
  ALTER TABLE platform_integrations ADD CONSTRAINT platform_integrations_platform_check 
    CHECK (platform IN (
      'google_search_console', 
      'facebook', 
      'linkedin', 
      'instagram', 
      'github', 
      'medium', 
      'quora', 
      'reddit'
    ));
END $$;

-- Update status CHECK constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE platform_integrations DROP CONSTRAINT IF EXISTS platform_integrations_status_check;
  
  -- Add updated constraint
  ALTER TABLE platform_integrations ADD CONSTRAINT platform_integrations_status_check 
    CHECK (status IN ('connected', 'disconnected', 'expired', 'error'));
END $$;

-- Add indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_platform_integrations_user_id ON platform_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_platform ON platform_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_status ON platform_integrations(status);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_expires_at ON platform_integrations(expires_at);

-- Drop old unique index if exists
DROP INDEX IF EXISTS idx_platform_integrations_unique;
DROP INDEX IF EXISTS idx_platform_integrations_user_platform;
DROP INDEX IF EXISTS idx_platform_integrations_user_platform_userid;

-- Create simple unique constraint on user_id and platform
-- This matches the ON CONFLICT usage in the code where platform_user_id is NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_integrations_user_platform 
  ON platform_integrations(user_id, platform);

-- Enable RLS (if not already enabled)
ALTER TABLE platform_integrations ENABLE ROW LEVEL SECURITY;

-- Recreate RLS Policies
DROP POLICY IF EXISTS "Users can view their own integrations" ON platform_integrations;
CREATE POLICY "Users can view their own integrations"
  ON platform_integrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own integrations" ON platform_integrations;
CREATE POLICY "Users can insert their own integrations"
  ON platform_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own integrations" ON platform_integrations;
CREATE POLICY "Users can update their own integrations"
  ON platform_integrations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own integrations" ON platform_integrations;
CREATE POLICY "Users can delete their own integrations"
  ON platform_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Refresh schema cache (important for Supabase)
NOTIFY pgrst, 'reload schema';

