# Stripe Setup Guide for GEORepute.ai Billing System

This guide walks through the complete Stripe configuration required for the billing system.

---

## 1. Stripe Account & API Keys

1. Create a Stripe account at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Go to **Developers > API keys**
3. Copy your **Publishable key** and **Secret key**
4. For development, use the **test mode** keys (toggle "Test mode" in the dashboard)

Add to `.env.local`:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

---

## 2. Create Products & Prices

### 2.1 Subscription Plans

Go to **Products > Add product** and create these three products:

| Product Name | Price | Billing | Metadata |
|---|---|---|---|
| GEORepute Base Seat | $299.00/month | Recurring, Monthly | `plan: base`, `prompt_limit: 10` |
| GEORepute Professional Seat | $499.00/month | Recurring, Monthly | `plan: professional`, `prompt_limit: 20` |
| GEORepute Enterprise Seat | $899.00/month | Recurring, Monthly | `plan: enterprise`, `prompt_limit: 50` |

After creating each, copy the **Price ID** (starts with `price_`).

### 2.2 Modules (Add-ons)

All modules are **$199/month** each. Create five module products:

| Product Name | Price | Billing |
|---|---|---|
| AI Visibility & AI Search Intelligence | $199.00/month | Recurring, Monthly |
| Content & Publishing | $199.00/month | Recurring, Monthly |
| Analytics & Competitor Intelligence | $199.00/month | Recurring, Monthly |
| Reputation Monitoring | $199.00/month | Recurring, Monthly |
| Opportunity & Sales Intelligence | $199.00/month | Recurring, Monthly |

Copy each Price ID. Users select modules via checkboxes on the dedicated Modules page (`/dashboard/modules`).

### 2.3 Intelligence Reports

Create one product with two prices:

**Product:** Intelligence Report

| Price Name | Amount | Type |
|---|---|---|
| Report Execution | $99.00 | One-time |
| Report Monitoring | $50.00/month | Recurring, Monthly |

Copy both Price IDs.

### 2.4 Report Bundles (No Stripe Products Needed)

Report bundles are handled dynamically in the app -- users select reports via checkboxes and progressive discounts are applied automatically based on quantity:

| Reports Selected | Discount |
|---|---|
| 1 | 0% (full price) |
| 2 | 5% off |
| 3 | 10% off |
| 4 | 15% off |
| 5+ | 20% off |
| 7+ | 25% off |

Discounts are stored in the `report_discount_tiers` database table and applied at checkout using `price_data` (no fixed Stripe Price needed for bundles).

**Monitoring auto-activates** for every purchased report at $50/month with a 6-month commitment. This uses the "Report Monitoring" recurring price from section 2.3.

---

## 3. Environment Variables

Add all Price IDs to `.env.local`:

```bash
# Stripe API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Plan Prices
STRIPE_PRICE_BASE_MONTHLY=price_xxx
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx

# Module Prices (all $199/month — separate Price IDs per module for Stripe tracking)
STRIPE_PRICE_MODULE_AI_VISIBILITY=price_xxx
STRIPE_PRICE_MODULE_CONTENT=price_xxx
STRIPE_PRICE_MODULE_ANALYTICS=price_xxx
STRIPE_PRICE_MODULE_REPUTATION=price_xxx
STRIPE_PRICE_MODULE_OPPORTUNITY=price_xxx

# Report Prices
STRIPE_PRICE_REPORT_EXECUTION=price_xxx
STRIPE_PRICE_REPORT_MONITORING=price_xxx
```

---

## 4. Seed Database with Stripe IDs

After creating all products and prices in Stripe, update the database catalog tables with the Stripe IDs.

Run these SQL statements in your Supabase SQL editor:

```sql
-- Update subscription plans with Stripe IDs
UPDATE subscription_plans SET
  stripe_product_id = 'prod_BASE_ID',
  stripe_price_id = 'price_BASE_ID'
WHERE name = 'base';

UPDATE subscription_plans SET
  stripe_product_id = 'prod_PRO_ID',
  stripe_price_id = 'price_PRO_ID'
WHERE name = 'professional';

UPDATE subscription_plans SET
  stripe_product_id = 'prod_ENT_ID',
  stripe_price_id = 'price_ENT_ID'
WHERE name = 'enterprise';

-- Update modules with Stripe IDs
UPDATE modules SET
  stripe_product_id = 'prod_AI_VIS_ID',
  stripe_price_id = 'price_AI_VIS_ID'
WHERE name = 'ai_visibility';

UPDATE modules SET
  stripe_product_id = 'prod_CONTENT_ID',
  stripe_price_id = 'price_CONTENT_ID'
WHERE name = 'content_publishing';

UPDATE modules SET
  stripe_product_id = 'prod_ANALYTICS_ID',
  stripe_price_id = 'price_ANALYTICS_ID'
WHERE name = 'analytics_competitor';

UPDATE modules SET
  stripe_product_id = 'prod_REPUTATION_ID',
  stripe_price_id = 'price_REPUTATION_ID'
WHERE name = 'reputation_monitoring';

UPDATE modules SET
  stripe_product_id = 'prod_OPPORTUNITY_ID',
  stripe_price_id = 'price_OPPORTUNITY_ID'
WHERE name = 'opportunity_sales';

-- Update report types with Stripe IDs
-- Use the same product for all report types, but the same two prices
UPDATE intelligence_report_types SET
  stripe_product_id = 'prod_REPORT_ID',
  stripe_price_id_onetime = 'price_REPORT_EXEC_ID',
  stripe_price_id_monitoring = 'price_REPORT_MON_ID';

-- No bundle Stripe IDs needed -- bundles are dynamic with discount tiers
```

Replace all `prod_xxx` and `price_xxx` values with your actual Stripe IDs.

---

## 5. Configure Webhooks

### Local Development

Install the Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

Login and forward events:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret and add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Production

1. Go to **Developers > Webhooks > Add endpoint**
2. Set the endpoint URL: `https://yourdomain.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the **Signing secret** and add to your production environment variables

---

## 6. Configure Customer Portal

1. Go to **Settings > Billing > Customer portal**
2. Enable the portal
3. Configure allowed actions:
   - **Payment methods**: Allow customers to update payment methods
   - **Cancel subscriptions**: Set to "At end of billing period"
   - **Switch plans**: Optional — you may want to handle this in-app instead
4. Under **Business information**, add your company name and support links
5. Save the configuration

The portal is accessed via `POST /api/billing/portal` which creates a portal session and redirects the user.

---

## 7. Test the Complete Flow

### Test Cards

| Card Number | Scenario |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure authentication required |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiration date and any 3-digit CVC.

### Testing Checklist

1. **New subscription flow**
   - Go to `/dashboard/billing`
   - Click "Choose a Plan" → Select Base ($299/mo)
   - Complete checkout with test card `4242 4242 4242 4242`
   - Verify redirect back to billing page with active plan
   - Check `subscriptions` table in Supabase

2. **Plan upgrade**
   - Click "Change Plan" → Select Professional
   - Verify proration is applied
   - Check Stripe dashboard for subscription update

3. **Module add/remove (multi-select)**
   - Go to `/dashboard/modules` (sidebar)
   - Select 2+ modules via checkboxes
   - Click "Subscribe" — verify each appears as a subscription_item in Stripe
   - Verify `subscription_modules` table has entries with `status: active`
   - Click "Remove" on an active module → Verify it's canceled and prorated

4. **Report purchase (multi-select with discount)**
   - Click "Purchase Reports" → Select 3+ reports via checkboxes
   - Verify discount tier is applied in the checkout summary
   - Complete checkout
   - Verify `report_purchases` table has all selected reports with `status: completed`
   - Verify `report_monitoring_subscriptions` has auto-created entries for each report
   - Check Stripe for separate monitoring subscriptions ($50/mo each)

6. **Invoice sync**
   - After any payment, check the Invoices section
   - Verify PDF download link works

7. **Cancellation**
   - Try canceling within commitment period (should be blocked)
   - Test cancellation after commitment period

8. **Payment failure**
   - Use test card `4000 0000 0000 0002`
   - Verify subscription goes to `past_due`

---

## 8. Go Live Checklist

- [ ] Switch from test API keys to live API keys
- [ ] Create all Products and Prices in live mode
- [ ] Update all `STRIPE_PRICE_*` environment variables with live Price IDs
- [ ] Update database catalog tables with live Stripe IDs
- [ ] Configure production webhook endpoint
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production signing secret
- [ ] Configure Customer Portal in live mode
- [ ] Test a real payment with a small amount
- [ ] Verify webhook events are being received in production
