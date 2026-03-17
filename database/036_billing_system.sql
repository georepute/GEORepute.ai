-- =====================================================
-- Migration: Billing System
-- Description: Creates tables for subscription plans,
--              subscriptions, modules, intelligence reports,
--              report monitoring, bundles, and invoices
-- =====================================================

-- 1. Add billing columns to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS current_plan_id UUID;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);

-- 2. Subscription Plans (reference / catalog)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents > 0),
  domain_limit INTEGER NOT NULL CHECK (domain_limit > 0),
  min_commitment_months INTEGER NOT NULL DEFAULT 6,
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO subscription_plans (name, display_name, monthly_price_cents, domain_limit, min_commitment_months, features) VALUES
  ('base', 'Base', 29900, 10, 6,
   '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 10 domains)","View Purchased Reports","Partial Intelligence Signals"]'),
  ('professional', 'Professional', 49900, 20, 6,
   '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 20 domains)","View Purchased Reports","Partial Intelligence Signals","Priority Support"]'),
  ('enterprise', 'Enterprise', 89900, 50, 6,
   '["Main Dashboard","Domain Connection","System Settings","Seat Management","Domain Monitoring (up to 50 domains)","View Purchased Reports","Partial Intelligence Signals","Priority Support","Dedicated Account Manager"]')
ON CONFLICT (name) DO NOTHING;

-- 3. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('active','past_due','canceled','trialing','incomplete','incomplete_expired','unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  commitment_end_date TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- FK for organizations.current_plan_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_organizations_current_plan'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT fk_organizations_current_plan
      FOREIGN KEY (current_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_current_plan_id ON organizations(current_plan_id);

-- 4. Modules (bundled add-ons catalog)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents > 0),
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  features JSONB DEFAULT '[]',
  usage_limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO modules (name, display_name, description, monthly_price_cents, features, usage_limits) VALUES
  ('ai_visibility',
   'AI Visibility & AI Search Intelligence',
   'Full AI visibility analysis, AI search monitoring, prompt detection beyond plan limits, and deep narrative analysis.',
   19900,
   '["AI Visibility Dashboard","AI Search Monitoring","Extended Prompt Detection","Narrative Analysis","AI Platform Response Tracking"]',
   '{"ai_scans": 100, "extra_prompts": 20}'),
  ('content_publishing',
   'Content & Publishing',
   'AI content generation, multi-platform publishing, blog management, and content strategy tools.',
   19900,
   '["AI Content Generator","Multi-Platform Publishing","Blog Management","Content Strategy","Missed Prompt Content"]',
   '{"content_items": 50, "platforms": 5}'),
  ('analytics_competitor',
   'Analytics & Competitor Intelligence',
   'Advanced analytics, competitor research, keyword forecasting, and BI reporting.',
   19900,
   '["Advanced Analytics Dashboard","Competitor Research","Keyword Forecast","BI Analytics Reports","GSC Analytics"]',
   '{"competitors": 10, "keyword_forecasts": 100}'),
  ('reputation_monitoring',
   'Reputation Monitoring',
   'Google Maps reviews monitoring, reputation tracking, review response management, and alerts.',
   19900,
   '["Google Maps Reviews","Reputation Tracking","Review Alerts","Sentiment Analysis"]',
   '{"monitored_locations": 5}'),
  ('opportunity_sales',
   'Opportunity & Sales Intelligence',
   'Opportunity detection, blind spot analysis, market coverage, quote building, and sales intelligence.',
   19900,
   '["Opportunity Detection","Blind Spot Analysis","Market Coverage Maps","Quote Builder","Sales Signals"]',
   '{"opportunity_scans": 50}')
ON CONFLICT (name) DO NOTHING;

-- 5. Subscription Modules (which modules are active on a subscription)
CREATE TABLE IF NOT EXISTS subscription_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id),
  stripe_subscription_item_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','canceled','pending')),
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  canceled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(subscription_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_modules_subscription_id ON subscription_modules(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_modules_module_id ON subscription_modules(module_id);

-- 6. Intelligence Report Types (catalog)
CREATE TABLE IF NOT EXISTS intelligence_report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 9900 CHECK (price_cents > 0),
  monitoring_monthly_cents INTEGER NOT NULL DEFAULT 5000 CHECK (monitoring_monthly_cents > 0),
  monitoring_min_months INTEGER NOT NULL DEFAULT 6,
  stripe_product_id VARCHAR(255),
  stripe_price_id_onetime VARCHAR(255),
  stripe_price_id_monitoring VARCHAR(255),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO intelligence_report_types (name, display_name, description, category) VALUES
  ('ai_search_presence',
   'AI Search Presence Report',
   'Comprehensive analysis of your brand presence across AI search platforms including ChatGPT, Claude, Gemini, and Perplexity.',
   'core'),
  ('ai_vs_google_gap',
   'AI vs Google Gap Report',
   'Identifies visibility gaps between traditional Google search and AI-powered search results.',
   'core'),
  ('market_share_of_attention',
   'Market Share of Attention Report',
   'Measures your brand share of voice across AI platforms relative to competitors.',
   'core'),
  ('geo_visibility',
   'GEO Visibility & Market Coverage Report',
   'Geographic analysis of your brand visibility across regions and markets in AI search.',
   'core'),
  ('opportunity_blind_spots',
   'Opportunity & Blind Spots Report',
   'Identifies missed opportunities and competitive blind spots in your AI visibility strategy.',
   'strategy'),
  ('strategic_blind_spots',
   'Strategic Blind Spots Report',
   'Deep strategic analysis of gaps in your AI search positioning relative to market leaders.',
   'strategy'),
  ('regional_strength',
   'Regional Strength Comparison Report',
   'Compares your brand strength across multiple regions and identifies expansion opportunities.',
   'global'),
  ('global_visibility_matrix',
   'Global Visibility Matrix Report',
   'Full global analysis of your brand visibility across all AI platforms and geographic regions.',
   'global')
ON CONFLICT (name) DO NOTHING;

-- 7. Report Purchases
CREATE TABLE IF NOT EXISTS report_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type_id UUID NOT NULL REFERENCES intelligence_report_types(id),
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  checkout_group_id VARCHAR(100),
  discount_percent INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','refunded')),
  pdf_url TEXT,
  data_snapshot JSONB,
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_purchases_organization_id ON report_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_purchases_report_type_id ON report_purchases(report_type_id);
CREATE INDEX IF NOT EXISTS idx_report_purchases_status ON report_purchases(status);

-- 8. Report Monitoring Subscriptions
CREATE TABLE IF NOT EXISTS report_monitoring_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_purchase_id UUID NOT NULL REFERENCES report_purchases(id) ON DELETE CASCADE,
  report_type_id UUID NOT NULL REFERENCES intelligence_report_types(id),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','past_due','canceled','incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  commitment_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_monitoring_organization_id ON report_monitoring_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_monitoring_stripe_sub ON report_monitoring_subscriptions(stripe_subscription_id);

-- 9. Report Discount Tiers (progressive discount by quantity)
-- Discount is applied at checkout based on how many reports the user selects.
CREATE TABLE IF NOT EXISTS report_discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_reports INTEGER NOT NULL UNIQUE CHECK (min_reports >= 1),
  discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  label VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO report_discount_tiers (min_reports, discount_percent, label) VALUES
  (1, 0,  NULL),
  (2, 5,  '5% off'),
  (3, 10, '10% off'),
  (4, 15, '15% off'),
  (5, 20, '20% off'),
  (7, 25, '25% off')
ON CONFLICT (min_reports) DO NOTHING;

-- 10. Invoices (synced from Stripe)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','paid','void','uncollectible')),
  description TEXT,
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- 11. Triggers for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_monitoring_updated_at ON report_monitoring_subscriptions;
CREATE TRIGGER update_report_monitoring_updated_at
  BEFORE UPDATE ON report_monitoring_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Enable RLS on all new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_monitoring_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_discount_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies

-- Catalog tables: anyone authenticated can read
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view modules" ON modules
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view report types" ON intelligence_report_types
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view discount tiers" ON report_discount_tiers
  FOR SELECT USING (true);

-- Subscriptions: org members can read their own
CREATE POLICY "Org members can view subscriptions" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Subscription modules: org members can read
CREATE POLICY "Org members can view subscription modules" ON subscription_modules
  FOR SELECT USING (
    subscription_id IN (
      SELECT s.id FROM subscriptions s
      JOIN organization_users ou ON ou.organization_id = s.organization_id
      WHERE ou.user_id = auth.uid() AND ou.status = 'active'
    )
  );

CREATE POLICY "Service role manages subscription modules" ON subscription_modules
  FOR ALL USING (auth.role() = 'service_role');

-- Report purchases: org members can read
CREATE POLICY "Org members can view report purchases" ON report_purchases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Service role manages report purchases" ON report_purchases
  FOR ALL USING (auth.role() = 'service_role');

-- Report monitoring: org members can read
CREATE POLICY "Org members can view report monitoring" ON report_monitoring_subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Service role manages report monitoring" ON report_monitoring_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Invoices: org members can read
CREATE POLICY "Org members can view invoices" ON invoices
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Service role manages invoices" ON invoices
  FOR ALL USING (auth.role() = 'service_role');

-- Service role can manage catalog tables
CREATE POLICY "Service role manages plans" ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages modules catalog" ON modules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages report types" ON intelligence_report_types
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages discount tiers" ON report_discount_tiers
  FOR ALL USING (auth.role() = 'service_role');

-- 14. Grant permissions
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT ON modules TO authenticated;
GRANT SELECT ON intelligence_report_types TO authenticated;
GRANT SELECT ON report_discount_tiers TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON subscription_modules TO authenticated;
GRANT SELECT ON report_purchases TO authenticated;
GRANT SELECT ON report_monitoring_subscriptions TO authenticated;
GRANT SELECT ON invoices TO authenticated;

-- 15. Table comments
COMMENT ON TABLE subscription_plans IS 'Catalog of available subscription plans (Base/Professional/Enterprise)';
COMMENT ON TABLE subscriptions IS 'Active subscriptions linking organizations to plans via Stripe';
COMMENT ON TABLE modules IS 'Catalog of purchasable add-on module bundles';
COMMENT ON TABLE subscription_modules IS 'Modules activated on a given subscription';
COMMENT ON TABLE intelligence_report_types IS 'Catalog of intelligence report types available for purchase';
COMMENT ON TABLE report_purchases IS 'Individual report purchase records';
COMMENT ON TABLE report_monitoring_subscriptions IS 'Active monitoring subscriptions for purchased reports';
COMMENT ON TABLE report_discount_tiers IS 'Progressive discount tiers based on number of reports purchased together';
COMMENT ON TABLE invoices IS 'Invoice records synced from Stripe';

-- =====================================================
-- End of Migration
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Billing system migration completed successfully!';
  RAISE NOTICE 'Created tables: subscription_plans, subscriptions, modules, subscription_modules, intelligence_report_types, report_purchases, report_monitoring_subscriptions, report_discount_tiers, invoices';
END $$;
