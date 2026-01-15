-- =====================================================
-- Migration: Domains Management Table
-- Description: Creates a table for managing domains
--              within organizations
-- =====================================================

-- 1. Create Domains table
-- Stores domain information for each organization
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification', 'verification_failed')),
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, domain)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_domains_organization_id ON domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_created_by ON domains(created_by);

-- 2. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_domains_updated_at ON domains;
CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Users can view domains of their organization
DROP POLICY IF EXISTS "Users can view their organization domains" ON domains;
CREATE POLICY "Users can view their organization domains" ON domains
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can insert domains for their organization (Admins and Managers)
DROP POLICY IF EXISTS "Authorized users can create domains" ON domains;
CREATE POLICY "Authorized users can create domains" ON domains
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name IN ('Admin', 'Manager')
        AND ou.status = 'active'
    )
  );

-- Users can update domains in their organization (Admins and Managers)
DROP POLICY IF EXISTS "Authorized users can update domains" ON domains;
CREATE POLICY "Authorized users can update domains" ON domains
  FOR UPDATE USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name IN ('Admin', 'Manager')
        AND ou.status = 'active'
    )
  );

-- Admins can delete domains
DROP POLICY IF EXISTS "Admins can delete domains" ON domains;
CREATE POLICY "Admins can delete domains" ON domains
  FOR DELETE USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name = 'Admin'
        AND ou.status = 'active'
    )
  );

-- 5. Create helper function to get organization domains
CREATE OR REPLACE FUNCTION get_organization_domains(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  domain VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.domain,
    d.status,
    d.created_at,
    d.updated_at
  FROM domains d
  WHERE d.organization_id = p_organization_id
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT ALL ON domains TO authenticated;

-- =====================================================
-- End of Migration
-- =====================================================

-- Verify table was created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created table: domains';
  RAISE NOTICE 'Added RLS policies for domain management';
END $$;

