-- =====================================================
-- Migration: Organization Invitations
-- Creates table for storing invitation tokens
-- =====================================================

-- Create invitation_tokens table
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  invited_by UUID NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_organization_id ON invitation_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_status ON invitation_tokens(status);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires_at ON invitation_tokens(expires_at);

-- Add function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_invitation_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_invitation_tokens_updated_at ON invitation_tokens;
CREATE TRIGGER update_invitation_tokens_updated_at
  BEFORE UPDATE ON invitation_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_tokens_updated_at();

-- Enable RLS
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view invitations sent to their email
DROP POLICY IF EXISTS "Users can view their invitations" ON invitation_tokens;
CREATE POLICY "Users can view their invitations" ON invitation_tokens
  FOR SELECT 
  USING (
    email = (SELECT email FROM "user" WHERE user_id = auth.uid())
    OR organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Admins can create invitations for their organization
DROP POLICY IF EXISTS "Admins can create invitations" ON invitation_tokens;
CREATE POLICY "Admins can create invitations" ON invitation_tokens
  FOR INSERT 
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name = 'Admin' 
        AND ou.status = 'active'
    )
  );

-- Admins can update invitations
DROP POLICY IF EXISTS "Admins can update invitations" ON invitation_tokens;
CREATE POLICY "Admins can update invitations" ON invitation_tokens
  FOR UPDATE 
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND r.name = 'Admin' 
        AND ou.status = 'active'
    )
  );

-- Grant permissions
GRANT ALL ON invitation_tokens TO authenticated;

-- Create function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE invitation_tokens
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- End of Migration
-- =====================================================

RAISE NOTICE 'Invitation tokens table created successfully!';

