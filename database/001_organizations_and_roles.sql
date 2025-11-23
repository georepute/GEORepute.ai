-- =====================================================
-- Migration: Organizations and Roles System
-- Description: Creates tables for Organizations, Roles, 
--              and Organization_users to support multi-user
--              organization management
-- =====================================================

-- 1. Create Organizations table
-- Stores organization/agency information
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  website VARCHAR(500),
  logo_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- 2. Create Roles table
-- Defines roles that users can have within an organization
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
  ('Admin', 'Full access to organization settings and all features', '{"all": true, "users": {"create": true, "read": true, "update": true, "delete": true}, "organization": {"update": true, "delete": true}}'),
  ('Manager', 'Can manage content, keywords, and view reports', '{"content": {"create": true, "read": true, "update": true, "delete": true}, "keywords": {"create": true, "read": true, "update": true, "delete": true}, "reports": {"read": true}}'),
  ('Editor', 'Can create and edit content', '{"content": {"create": true, "read": true, "update": true}, "keywords": {"read": true}}'),
  ('Viewer', 'Read-only access to reports and content', '{"content": {"read": true}, "keywords": {"read": true}, "reports": {"read": true}}')
ON CONFLICT (name) DO NOTHING;

-- 3. Create Organization_users table (junction table)
-- Links users to organizations with their roles
CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_role_id ON organization_users(role_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_status ON organization_users(status);

-- 4. Add organization_id column to existing user table (optional - for primary organization)
-- This helps identify which organization a user primarily belongs to
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user' AND column_name='organization_id') THEN
    ALTER TABLE "user" ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_user_organization_id ON "user"(organization_id);
  END IF;
END $$;

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_users_updated_at ON organization_users;
CREATE TRIGGER update_organization_users_updated_at
  BEFORE UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies

-- Roles table - Allow everyone to read roles
DROP POLICY IF EXISTS "Anyone can view roles" ON roles;
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);

-- Organizations table policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name = 'Admin' 
        AND ou.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Anyone can create organization" ON organizations;
CREATE POLICY "Anyone can create organization" ON organizations
  FOR INSERT WITH CHECK (true);

-- Organization_users table policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_users;
CREATE POLICY "Users can view organization members" ON organization_users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_users;
CREATE POLICY "Admins can manage organization members" ON organization_users
  FOR ALL USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name = 'Admin' 
        AND ou.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert themselves into organizations" ON organization_users;
CREATE POLICY "Users can insert themselves into organizations" ON organization_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 9. Create helper function to get user's role in an organization
CREATE OR REPLACE FUNCTION get_user_organization_role(p_user_id UUID, p_organization_id UUID)
RETURNS TABLE (
  role_name VARCHAR,
  role_id UUID,
  permissions JSONB,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.name::VARCHAR,
    r.id,
    r.permissions,
    ou.status::VARCHAR
  FROM organization_users ou
  JOIN roles r ON r.id = ou.role_id
  WHERE ou.user_id = p_user_id 
    AND ou.organization_id = p_organization_id
    AND ou.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create helper function to check if user is org admin
CREATE OR REPLACE FUNCTION is_organization_admin(p_user_id UUID, p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = p_user_id 
      AND ou.organization_id = p_organization_id
      AND r.name = 'Admin'
      AND ou.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON roles TO authenticated;
GRANT ALL ON organization_users TO authenticated;

-- =====================================================
-- End of Migration
-- =====================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created tables: organizations, roles, organization_users';
  RAISE NOTICE 'Inserted % default roles', (SELECT COUNT(*) FROM roles);
END $$;

