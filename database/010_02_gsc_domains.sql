-- =====================================================
-- Google Search Console Integration - Part 2
-- GSC Domains Table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- PREREQUISITE: Run 010_01_platform_integrations.sql first
-- =====================================================

-- gsc_domains table
-- Stores user's verified domains in Google Search Console
CREATE TABLE IF NOT EXISTS gsc_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES platform_integrations(id) ON DELETE CASCADE,
  domain_url TEXT NOT NULL,
  site_url TEXT NOT NULL, -- Format: sc-domain:example.com or https://example.com
  verification_method TEXT DEFAULT 'DNS_TXT' CHECK (verification_method IN ('DNS_TXT', 'FILE', 'META', 'ANALYTICS', 'TAG_MANAGER')),
  verification_token TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  permission_level TEXT DEFAULT 'siteOwner' CHECK (permission_level IN ('siteOwner', 'siteFullUser', 'siteRestrictedUser')),
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain_url)
);

-- Add indexes for gsc_domains
CREATE INDEX IF NOT EXISTS idx_gsc_domains_user_id ON gsc_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_domains_integration_id ON gsc_domains(integration_id);
CREATE INDEX IF NOT EXISTS idx_gsc_domains_verification_status ON gsc_domains(verification_status);
CREATE INDEX IF NOT EXISTS idx_gsc_domains_last_synced_at ON gsc_domains(last_synced_at);

-- Enable RLS for gsc_domains
ALTER TABLE gsc_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_domains
DROP POLICY IF EXISTS "Users can view their own domains" ON gsc_domains;
CREATE POLICY "Users can view their own domains"
  ON gsc_domains FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own domains" ON gsc_domains;
CREATE POLICY "Users can insert their own domains"
  ON gsc_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own domains" ON gsc_domains;
CREATE POLICY "Users can update their own domains"
  ON gsc_domains FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own domains" ON gsc_domains;
CREATE POLICY "Users can delete their own domains"
  ON gsc_domains FOR DELETE
  USING (auth.uid() = user_id);

