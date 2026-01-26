-- Add organization_id column to keyword_plans table
-- This allows tracking which organization owns each keyword plan

-- Add the organization_id column
ALTER TABLE keyword_plans 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for faster queries by organization
CREATE INDEX IF NOT EXISTS idx_keyword_plans_organization_id ON keyword_plans(organization_id);

-- Add comment for documentation
COMMENT ON COLUMN keyword_plans.organization_id IS 'Reference to the organization that owns this keyword plan';

-- Backfill existing plans with organization_id from user's organization
UPDATE keyword_plans kp
SET organization_id = (
  SELECT ou.organization_id 
  FROM organization_users ou 
  WHERE ou.user_id = kp.user_id 
  AND ou.status = 'active'
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Make organization_id required (NOT NULL) after backfill
ALTER TABLE keyword_plans 
ALTER COLUMN organization_id SET NOT NULL;

-- Verify the column was added
DO $$ 
BEGIN
  RAISE NOTICE 'Organization_id column has been added to keyword_plans table successfully';
END $$;

