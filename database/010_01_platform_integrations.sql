-- =====================================================
-- Google Search Console Integration - Part 1
-- Platform Integrations Table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- platform_integrations table
-- Stores OAuth tokens for various platform integrations
CREATE TABLE IF NOT EXISTS platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN (
    'google_search_console', 
    'facebook', 
    'linkedin', 
    'instagram', 
    'github', 
    'medium', 
    'quora', 
    'reddit'
  )),
  platform_user_id TEXT,
  platform_username TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for platform_integrations
CREATE INDEX IF NOT EXISTS idx_platform_integrations_user_id ON platform_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_platform ON platform_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_status ON platform_integrations(status);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_expires_at ON platform_integrations(expires_at);

-- Unique constraint using expression index (allows COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_integrations_unique 
  ON platform_integrations(user_id, platform, COALESCE(platform_user_id, ''));

-- Enable RLS for platform_integrations
ALTER TABLE platform_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_integrations
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

