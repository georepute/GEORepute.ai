-- Migration: 038_rename_prompt_limit_to_domain_limit.sql
-- Each "prompt" in a plan represents one domain slot in Domain Management.
-- Rename the column accordingly and update plan feature descriptions.

BEGIN;

-- Rename column
ALTER TABLE subscription_plans
  RENAME COLUMN prompt_limit TO domain_limit;

-- Update feature descriptions to reflect domains, not prompts
UPDATE subscription_plans SET
  features = '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 10 domains)","View Purchased Reports","Partial Intelligence Signals"]'
WHERE name = 'base';

UPDATE subscription_plans SET
  features = '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 20 domains)","View Purchased Reports","Partial Intelligence Signals","Priority Support"]'
WHERE name = 'professional';

UPDATE subscription_plans SET
  features = '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 50 domains)","View Purchased Reports","Partial Intelligence Signals","Priority Support","Dedicated Account Manager"]'
WHERE name = 'enterprise';

COMMIT;
