-- =====================================================
-- Google Search Console Integration Database Tables
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. platform_integrations table (if not exists)
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

-- =====================================================

-- 2. gsc_domains table
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

-- =====================================================

-- 3. gsc_analytics table
-- Stores Search Console analytics data
CREATE TABLE IF NOT EXISTS gsc_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES gsc_domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Core metrics
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,8) DEFAULT 0, -- Click-through rate
  position NUMERIC(10,2) DEFAULT 0, -- Average position
  
  -- Dimensions (optional, for detailed breakdowns)
  query TEXT,
  page TEXT,
  country TEXT,
  device TEXT CHECK (device IS NULL OR device IN ('MOBILE', 'DESKTOP', 'TABLET')),
  search_appearance TEXT,
  
  -- Data type classifier
  data_type TEXT DEFAULT 'summary' CHECK (data_type IN ('summary', 'query', 'page', 'country', 'device', 'search_appearance')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for gsc_analytics
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_domain_id ON gsc_analytics(domain_id);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_user_id ON gsc_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_date ON gsc_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_data_type ON gsc_analytics(data_type);
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_query ON gsc_analytics(query) WHERE query IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_page ON gsc_analytics(page) WHERE page IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_analytics_device ON gsc_analytics(device) WHERE device IS NOT NULL;

-- Composite unique constraint using expression index
CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_analytics_unique 
  ON gsc_analytics(domain_id, date, data_type, COALESCE(query, ''), COALESCE(page, ''), COALESCE(country, ''), COALESCE(device, ''));

-- Enable RLS for gsc_analytics
ALTER TABLE gsc_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_analytics
DROP POLICY IF EXISTS "Users can view their own analytics" ON gsc_analytics;
CREATE POLICY "Users can view their own analytics"
  ON gsc_analytics FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own analytics" ON gsc_analytics;
CREATE POLICY "Users can insert their own analytics"
  ON gsc_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own analytics" ON gsc_analytics;
CREATE POLICY "Users can update their own analytics"
  ON gsc_analytics FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own analytics" ON gsc_analytics;
CREATE POLICY "Users can delete their own analytics"
  ON gsc_analytics FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================

-- 4. gsc_queries table (for detailed query analysis)
-- Stores top performing queries separately for better analysis
CREATE TABLE IF NOT EXISTS gsc_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES gsc_domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,8) DEFAULT 0,
  position NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain_id, date, query)
);

-- Add indexes for gsc_queries
CREATE INDEX IF NOT EXISTS idx_gsc_queries_domain_id ON gsc_queries(domain_id);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_user_id ON gsc_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_date ON gsc_queries(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_clicks ON gsc_queries(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_impressions ON gsc_queries(impressions DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_queries_query_text ON gsc_queries USING gin(to_tsvector('english', query));

-- Enable RLS for gsc_queries
ALTER TABLE gsc_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_queries
DROP POLICY IF EXISTS "Users can view their own queries" ON gsc_queries;
CREATE POLICY "Users can view their own queries"
  ON gsc_queries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own queries" ON gsc_queries;
CREATE POLICY "Users can insert their own queries"
  ON gsc_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own queries" ON gsc_queries;
CREATE POLICY "Users can update their own queries"
  ON gsc_queries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own queries" ON gsc_queries;
CREATE POLICY "Users can delete their own queries"
  ON gsc_queries FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================

-- 5. gsc_pages table (for page-level performance)
-- Stores top performing pages separately
CREATE TABLE IF NOT EXISTS gsc_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES gsc_domains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  page TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(10,8) DEFAULT 0,
  position NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain_id, date, page)
);

-- Add indexes for gsc_pages
CREATE INDEX IF NOT EXISTS idx_gsc_pages_domain_id ON gsc_pages(domain_id);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_user_id ON gsc_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_date ON gsc_pages(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_clicks ON gsc_pages(clicks DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_pages_impressions ON gsc_pages(impressions DESC);

-- Enable RLS for gsc_pages
ALTER TABLE gsc_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gsc_pages
DROP POLICY IF EXISTS "Users can view their own pages" ON gsc_pages;
CREATE POLICY "Users can view their own pages"
  ON gsc_pages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pages" ON gsc_pages;
CREATE POLICY "Users can insert their own pages"
  ON gsc_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pages" ON gsc_pages;
CREATE POLICY "Users can update their own pages"
  ON gsc_pages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pages" ON gsc_pages;
CREATE POLICY "Users can delete their own pages"
  ON gsc_pages FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================

-- Summary
-- =====================================================
-- Tables created:
-- 1. platform_integrations - OAuth tokens for integrations
-- 2. gsc_domains - User's verified GSC domains
-- 3. gsc_analytics - General analytics data
-- 4. gsc_queries - Top performing search queries
-- 5. gsc_pages - Top performing pages
--
-- All tables include:
-- - Proper foreign key relationships
-- - Indexes for performance
-- - Row Level Security (RLS) policies
-- - Timestamps (created_at, updated_at)
-- =====================================================

