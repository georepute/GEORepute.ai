-- =====================================================
-- Migration: Add Google Search Console Integration to Domains
-- Description: Adds user_id and gsc_integration columns to domains table
--              and migrates data from gsc_domains to domains
-- =====================================================

-- 1. Add new columns to domains table
ALTER TABLE domains 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gsc_integration JSONB DEFAULT NULL;

-- 2. Create index for user_id
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);

-- 3. Create index for gsc_integration
CREATE INDEX IF NOT EXISTS idx_domains_gsc_integration ON domains USING GIN(gsc_integration);

-- 4. Migrate data from gsc_domains to domains (if needed)
-- This will attempt to match domains by domain name/url
DO $$
DECLARE
  gsc_record RECORD;
  domain_name TEXT;
  existing_domain_id UUID;
BEGIN
  FOR gsc_record IN SELECT * FROM gsc_domains LOOP
    -- Extract domain name from domain_url
    domain_name := REPLACE(REPLACE(gsc_record.domain_url, 'https://', ''), 'http://', '');
    domain_name := REPLACE(domain_name, 'www.', '');
    domain_name := SPLIT_PART(domain_name, '/', 1);
    
    -- Check if domain exists
    SELECT id INTO existing_domain_id 
    FROM domains 
    WHERE domain = domain_name
    LIMIT 1;
    
    IF existing_domain_id IS NOT NULL THEN
      -- Update existing domain with GSC integration data
      UPDATE domains
      SET 
        user_id = gsc_record.user_id,
        gsc_integration = jsonb_build_object(
          'integration_id', gsc_record.integration_id,
          'domain_url', gsc_record.domain_url,
          'site_url', gsc_record.site_url,
          'verification_method', gsc_record.verification_method,
          'verification_token', gsc_record.verification_token,
          'verification_status', gsc_record.verification_status,
          'permission_level', gsc_record.permission_level,
          'last_synced_at', gsc_record.last_synced_at
        ),
        updated_at = NOW()
      WHERE id = existing_domain_id;
      
      RAISE NOTICE 'Updated domain: % with GSC integration', domain_name;
    ELSE
      RAISE NOTICE 'Domain not found: %, skipping migration', domain_name;
    END IF;
  END LOOP;
END $$;

-- 5. Add comment to the table
COMMENT ON COLUMN domains.user_id IS 'User who owns/manages this domain';
COMMENT ON COLUMN domains.gsc_integration IS 'Google Search Console integration data stored as JSON';

-- 6. Update RLS policies to include user_id access
DROP POLICY IF EXISTS "Users can view their own domains" ON domains;
CREATE POLICY "Users can view their own domains" ON domains
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 7. Create helper function to update GSC integration data
CREATE OR REPLACE FUNCTION update_domain_gsc_integration(
  p_domain_id UUID,
  p_integration_id UUID,
  p_domain_url TEXT,
  p_site_url TEXT,
  p_verification_method TEXT DEFAULT 'DNS_TXT',
  p_verification_token TEXT DEFAULT NULL,
  p_verification_status TEXT DEFAULT 'pending',
  p_permission_level TEXT DEFAULT 'siteOwner',
  p_last_synced_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS domains AS $$
DECLARE
  v_domain domains;
BEGIN
  UPDATE domains
  SET 
    gsc_integration = jsonb_build_object(
      'integration_id', p_integration_id,
      'domain_url', p_domain_url,
      'site_url', p_site_url,
      'verification_method', p_verification_method,
      'verification_token', p_verification_token,
      'verification_status', p_verification_status,
      'permission_level', p_permission_level,
      'last_synced_at', p_last_synced_at
    ),
    updated_at = NOW()
  WHERE id = p_domain_id
  RETURNING * INTO v_domain;
  
  RETURN v_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create helper function to get domains with GSC integration
CREATE OR REPLACE FUNCTION get_domains_with_gsc_integration(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  domain VARCHAR,
  status VARCHAR,
  user_id UUID,
  gsc_integration JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.organization_id,
    d.domain,
    d.status,
    d.user_id,
    d.gsc_integration,
    d.created_at,
    d.updated_at
  FROM domains d
  WHERE 
    (p_user_id IS NULL OR d.user_id = p_user_id)
    AND d.gsc_integration IS NOT NULL
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_domain_gsc_integration TO authenticated;
GRANT EXECUTE ON FUNCTION get_domains_with_gsc_integration TO authenticated;

-- =====================================================
-- End of Migration
-- =====================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added user_id and gsc_integration columns to domains table';
  RAISE NOTICE 'Created helper functions for GSC integration management';
  RAISE NOTICE 'Updated RLS policies to support user-level access';
END $$;

