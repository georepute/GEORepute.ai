-- =====================================================
-- Migration: Add Seats to Organizations
-- Description: Adds seat management and payment tracking
--              for team member limits
-- =====================================================

-- 1. Add seats column to organizations table
-- Default is 0 seats - all members except owner must be purchased
-- Owner (first member) is always free and doesn't count against limit
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 0 CHECK (seats >= 0),
ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 0 CHECK (seats_used >= 0);

-- 2. Create payments table to track seat purchases
CREATE TABLE IF NOT EXISTS seat_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(500) UNIQUE,
  stripe_payment_intent_id VARCHAR(500),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  seats_purchased INTEGER NOT NULL CHECK (seats_purchased > 0),
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_seat_payments_organization_id ON seat_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_seat_payments_stripe_session_id ON seat_payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_seat_payments_status ON seat_payments(status);
CREATE INDEX IF NOT EXISTS idx_seat_payments_created_at ON seat_payments(created_at DESC);

-- 3. Add trigger for updated_at
DROP TRIGGER IF EXISTS update_seat_payments_updated_at ON seat_payments;
CREATE TRIGGER update_seat_payments_updated_at
  BEFORE UPDATE ON seat_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Create function to update seats_used count
-- This automatically calculates active members (excluding the owner)
CREATE OR REPLACE FUNCTION update_organization_seats_used()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  owner_user_id UUID;
  active_count INTEGER;
BEGIN
  -- Determine the organization_id from the operation
  IF TG_OP = 'DELETE' THEN
    org_id := OLD.organization_id;
  ELSE
    org_id := NEW.organization_id;
  END IF;

  -- Get the organization owner (first admin user who created the org)
  SELECT user_id INTO owner_user_id
  FROM organization_users
  WHERE organization_id = org_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Count active members excluding the owner
  SELECT COUNT(*) INTO active_count
  FROM organization_users
  WHERE organization_id = org_id
    AND status = 'active'
    AND user_id != COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Update the organization's seats_used
  UPDATE organizations
  SET seats_used = active_count
  WHERE id = org_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to automatically update seats_used
DROP TRIGGER IF EXISTS trigger_update_seats_used ON organization_users;
CREATE TRIGGER trigger_update_seats_used
  AFTER INSERT OR UPDATE OR DELETE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_seats_used();

-- 6. Create function to check seat availability before invite
CREATE OR REPLACE FUNCTION check_seat_availability()
RETURNS TRIGGER AS $$
DECLARE
  org_seats INTEGER;
  org_seats_used INTEGER;
  owner_user_id UUID;
BEGIN
  -- Only check for active members
  IF NEW.status = 'active' THEN
    -- Get organization seat info
    SELECT seats, seats_used INTO org_seats, org_seats_used
    FROM organizations
    WHERE id = NEW.organization_id;

    -- Get the organization owner
    SELECT user_id INTO owner_user_id
    FROM organization_users
    WHERE organization_id = NEW.organization_id
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Allow if user is the owner (first member)
    IF owner_user_id IS NULL OR NEW.user_id = owner_user_id THEN
      RETURN NEW;
    END IF;

    -- Check if seats are available
    IF org_seats_used >= org_seats THEN
      RAISE EXCEPTION 'No available seats. Current: % used out of % total. Please purchase more seats.', 
        org_seats_used, org_seats;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to enforce seat limits
DROP TRIGGER IF EXISTS trigger_check_seat_availability ON organization_users;
CREATE TRIGGER trigger_check_seat_availability
  BEFORE INSERT OR UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION check_seat_availability();

-- 8. Initialize seats_used for existing organizations
-- Count active members excluding the owner for each organization
UPDATE organizations o
SET seats_used = (
  SELECT COUNT(*) - 1 -- Subtract 1 for the owner
  FROM organization_users ou
  WHERE ou.organization_id = o.id
    AND ou.status = 'active'
)
WHERE seats_used = 0;

-- Make sure seats_used is never negative
UPDATE organizations
SET seats_used = 0
WHERE seats_used < 0;

-- 9. Enable RLS for seat_payments table
ALTER TABLE seat_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seat_payments
-- Users can view payment history for their organization
DROP POLICY IF EXISTS "Users can view their organization's payment history" ON seat_payments;
CREATE POLICY "Users can view their organization's payment history"
  ON seat_payments
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- Only service role can insert/update payments (via API)
DROP POLICY IF EXISTS "Service role can manage payments" ON seat_payments;
CREATE POLICY "Service role can manage payments"
  ON seat_payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- 10. Add helpful comments
COMMENT ON COLUMN organizations.seats IS 'Total number of team member seats purchased (owner is free and not counted)';
COMMENT ON COLUMN organizations.seats_used IS 'Number of active team member seats currently in use (auto-calculated, excludes owner)';
COMMENT ON TABLE seat_payments IS 'Tracks all seat purchase transactions via Stripe';

-- 11. Set existing organizations to 0 seats if they have the old default
-- This ensures a clean migration - organizations will need to purchase seats for any members beyond the owner
UPDATE organizations
SET seats = 0
WHERE seats = 1 AND (
  SELECT COUNT(*) 
  FROM organization_users 
  WHERE organization_id = organizations.id 
    AND status = 'active'
) <= 1;

