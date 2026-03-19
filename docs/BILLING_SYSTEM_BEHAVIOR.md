# Billing System Behavior Guide

This document describes how the billing system behaves across all user flows, subscription states, and edge cases.

---

## 1. New User Signup Flow

```
Signup → Role Selection → Onboarding → Dashboard (no plan)
                                            ↓
                                    Plan Selection (from billing page or upgrade prompt)
                                            ↓
                                    Stripe Checkout
                                            ↓
                                    Webhook: checkout.session.completed
                                            ↓
                                    Subscription activated, dashboard unlocked
```

### What happens at each stage:

1. **Signup**: Creates `auth.users` entry + `user` profile. No subscription yet.
2. **Role Selection**: User selects Client/Agency role. Creates organization.
3. **Onboarding**: Domain setup, initial configuration.
4. **Dashboard (no plan)**: User sees the dashboard but with limited data:
   - Detected prompts are shown (basic signals)
   - Detected competitors are listed (names only)
   - Basic visibility signals visible
   - Advanced features show as **locked cards** with "Unlock with [Module Name]" CTAs
   - A prominent banner invites the user to choose a plan
5. **Plan Selection**: User goes to `/dashboard/billing` and clicks "Choose a Plan"
6. **Stripe Checkout**: Redirected to Stripe's hosted checkout page
7. **Webhook processing**: On successful payment, the system:
   - Creates a Stripe Customer (stored in `organizations.stripe_customer_id`)
   - Creates a `subscriptions` record with `status: active`
   - Sets `organizations.current_plan_id`
   - Sets `commitment_end_date` to 6 months from now
8. **Dashboard unlocked**: All base features become available immediately

---

## 2. Subscription Lifecycle

### States

| Status | Meaning | Access Level |
|---|---|---|
| `active` | Subscription is current and paid | Full access to plan features |
| `past_due` | Payment failed, Stripe retrying | Full access (grace period, typically 3-7 days) |
| `canceled` | Subscription ended | No access to plan features; dashboard shows upgrade prompts |
| `trialing` | In trial period (not used currently — no free trial) | Full access |
| `incomplete` | Initial payment hasn't completed | No access |
| `unpaid` | All retry attempts failed | No access |

### State Transitions

```
incomplete → active → past_due → canceled
                 ↑         |
                 └─────────┘ (payment succeeds on retry)

active → canceled (user cancels at period end)
```

### 6-Month Commitment Enforcement

- When a subscription is created, `commitment_end_date` is set to 6 months from the start date
- The cancel button is **disabled** while within the commitment period
- A tooltip shows when cancellation becomes available
- After commitment period, user can cancel; subscription remains active until `current_period_end`
- Stripe handles the actual cancellation at period end (`cancel_at_period_end: true`)

---

## 3. Plan Upgrade / Downgrade

### Upgrade (e.g., Base → Professional)

- **Immediate effect**: The subscription is updated in Stripe instantly
- **Proration**: Stripe calculates the price difference for the remaining billing period
  - User is charged the prorated difference immediately (or on next invoice)
  - Example: 15 days into a $299/mo Base plan, upgrading to $499/mo Professional
    - Credit for remaining Base: ~$149.50
    - Charge for remaining Professional: ~$249.50
    - Net charge: ~$100
- **Database**: `subscriptions.plan_id` is updated immediately, `organizations.current_plan_id` is updated
- **Features**: New prompt limit and features available immediately

### Downgrade (e.g., Enterprise → Professional)

- Same mechanism as upgrade, with proration creating a credit
- Credit is applied to the next invoice
- If prompt usage exceeds new plan's limit, excess prompts become read-only (details locked)

---

## 4. Modules (Add-ons)

Modules are managed on a **dedicated Modules page** (`/dashboard/modules`), accessible from the sidebar.

### Pricing

All modules are **$199/month** each. No discounts or tiers.

| Module | Price |
|---|---|
| AI Visibility & AI Search Intelligence | $199/month |
| Content & Publishing | $199/month |
| Analytics & Competitor Intelligence | $199/month |
| Reputation Monitoring | $199/month |
| Opportunity & Sales Intelligence | $199/month |

### Adding Modules

1. User navigates to the **Modules** page in the sidebar
2. Available modules are shown with checkboxes — already-active ones are highlighted
3. User checks one or more modules and clicks "Subscribe"
4. API adds each module as a `subscription_item` on the existing Stripe subscription
5. `subscription_modules` records created with `status: active`
6. Module features unlock immediately
7. Proration applies — user is charged for the remaining billing period

### Removing a Module

1. User clicks "Remove" on an active module (from the Modules page or billing page)
2. API deletes the `subscription_item` from Stripe (with proration)
3. `subscription_modules` record updated to `status: canceled`
4. Module features locked immediately
5. Credit for unused portion applied to next invoice

### Requirements

- An active plan subscription is required before adding modules
- If the plan subscription is canceled, all modules are also canceled
- Modules are billed on the same cycle as the plan subscription

---

## 5. Report Purchase Flow

```
User selects reports (checkboxes) → Discount tier applied → Stripe Checkout
                                                                  ↓
                                                     Webhook: checkout.session.completed
                                                                  ↓
                                                     All report_purchases → completed
                                                     Auto-create monitoring subscription for EACH report
                                                                  ↓
                                                     PDF generated + data added to dashboard (future)
                                                     Monitoring starts immediately ($50/mo each)
```

### How it works:

1. User clicks "Purchase Reports" on the billing page
2. A modal shows all available report types with **checkboxes**
3. User selects one or more reports
4. **Progressive discount** is applied automatically based on quantity:

| Reports Selected | Discount |
|---|---|
| 1 | 0% (full price $99) |
| 2 | 5% off ($94.05 each) |
| 3 | 10% off ($89.10 each) |
| 4 | 15% off ($84.15 each) |
| 5+ | 20% off ($79.20 each) |
| 7+ | 25% off ($74.25 each) |

5. The checkout summary shows: per-report price, total, discount, and monthly monitoring cost
6. User proceeds to a single Stripe Checkout for all selected reports
7. On `checkout.session.completed`:
   - All `report_purchases` in the batch are marked `completed`
   - **Monitoring is auto-activated** for every report (no manual step)
   - Each report gets its own Stripe monitoring subscription ($50/month, 6-month commitment)
8. The purchased report:
   - Generates a **PDF intelligence report** (stored in `pdf_url`)
   - Adds **structured data to the dashboard** (stored in `data_snapshot`)
   - Makes the report page accessible with full data
9. If the user wants updated data later, they must purchase the report again

### Example: Purchasing 3 Reports

- Report execution: 3 x $89.10 = **$267.30** one-time (10% discount)
- Monitoring: 3 x $50 = **$150/month** (auto-activated, 6-month commitment)

---

## 6. Report Monitoring

### Auto-Activation

Monitoring is **always automatically activated** when a report is purchased. There is no manual "Activate Monitoring" step. This is by design -- every report purchase includes ongoing monitoring as part of the intelligence service.

### What monitoring provides:

- The report's data is automatically refreshed on a regular schedule
- Dashboard data stays current without requiring additional report purchases
- Alerts when significant changes are detected

### Monitoring pricing:

| Scenario | Monthly Cost |
|---|---|
| 1 report monitoring | $50/month |
| 3 reports monitoring | $150/month |
| 5 reports monitoring | $250/month |

### Commitment & Cancellation

- Every monitoring subscription has a **6-month minimum commitment**
- Cannot cancel within commitment period
- After commitment, cancels at end of current billing period
- Each report's monitoring is a separate Stripe subscription (can be managed independently after commitment)

---

## 7. Invoice Generation

### Automatic via Stripe

Stripe automatically generates invoices for:
- Monthly plan subscription charges
- Module charges (included in subscription invoice)
- Report monitoring charges (separate subscription invoices)
- One-time report/bundle purchases (invoice generated on payment)

### Sync to Local Database

The webhook handler syncs invoices to the local `invoices` table:

- `invoice.finalized` → Creates/updates invoice record with PDF URL
- `invoice.paid` → Updates status to `paid`, sets `paid_at` timestamp
- `invoice.payment_failed` → Updates related subscription to `past_due`

### What users see:

On the billing page, the Invoices section shows:
- Date of each invoice
- Description (plan name, module name, report name)
- Amount charged
- Status (Paid, Open, Void)
- PDF download link
- Link to hosted Stripe invoice page

---

## 8. Access When Payment Fails

### Grace Period (Past Due)

When a payment fails:

1. Stripe retries the charge (default: 3 attempts over ~7 days)
2. Subscription moves to `past_due` status
3. **During grace period**: User retains full access to all features
4. A warning banner appears on the dashboard: "Your payment failed. Please update your payment method."
5. The billing page highlights the issue and provides a link to the Stripe Customer Portal

### After All Retries Fail

1. Stripe marks the subscription as `unpaid` or `canceled` (depending on your Stripe settings)
2. Webhook updates local subscription to `canceled`
3. `organizations.current_plan_id` is set to `null`
4. All module subscriptions are canceled
5. User loses access to:
   - Module features (immediately locked)
   - Prompt monitoring beyond basic signals
   - Report execution
6. User retains:
   - Dashboard access (with limited, locked state)
   - Previously purchased report PDFs
   - Historical data
7. Recovery: User can resubscribe by choosing a plan on the billing page

---

## 9. Dashboard Behavior Without Purchases

### No Plan Subscribed

The dashboard **never appears empty**. Even without a plan:

| Visible | Locked |
|---|---|
| Detected prompts (names/count only) | Prompt details and analysis |
| Detected competitors (names only) | Competitor deep dive |
| Basic visibility signals (aggregate scores) | Detailed visibility breakdown |
| Navigation to all sections (grayed locked sections) | All premium features |

### Route-Level Access Gating

The system enforces access at the route level. Every dashboard route is classified into one of four access tiers:

| Access Tier | Requirement | Locked Overlay CTA |
|---|---|---|
| **Unrestricted** | None | — |
| **Plan** | Any active plan | "Choose a Plan" → `/dashboard/select-plan` |
| **Module** | Specific module subscription | "Browse Modules" → `/dashboard/modules` |
| **Report** | Specific report purchased | "Purchase Reports" → `/dashboard/billing` |

### Unrestricted Routes (no plan needed)

- `/dashboard/billing`
- `/dashboard/select-plan`

### Plan-Only Routes (any active plan)

- `/dashboard` (main dashboard)
- `/dashboard/domains`
- `/dashboard/settings`
- `/dashboard/team`
- `/dashboard/modules`
- `/dashboard/action-plans`

### Module-Gated Routes

| Module | Routes |
|---|---|
| AI Visibility & AI Search Intelligence | `/dashboard/ai-visibility` |
| Content & Publishing | `/dashboard/content-generator/*`, `/dashboard/missed-prompts`, `/dashboard/blog`, `/dashboard/content` |
| Analytics & Competitor Intelligence | `/dashboard/analytics`, `/dashboard/gsc-analytics`, `/dashboard/reports`, `/dashboard/keyword-forecast`, `/dashboard/google-search-console`, `/dashboard/google-maps` |
| Reputation Monitoring | `/dashboard/reputation` |
| Opportunity & Sales Intelligence | `/dashboard/quote-builder` |

### Report-Gated Routes

| Report | Route |
|---|---|
| AI Search Presence Report | `/dashboard/ai-search-presence` |
| AI vs Google Gap Report | `/dashboard/ai-vs-google-gap` |
| Market Share of Attention Report | `/dashboard/market-share-of-attention` |
| Geo Visibility & Market Coverage Report | `/dashboard/geo-visibility-market-coverage` |
| Opportunity & Blind Spots Report | `/dashboard/opportunity-blind-spots` |
| Strategic Blind Spots Report | `/dashboard/strategic-blind-spots` |
| Regional Strength Comparison Report | `/dashboard/regional-strength-comparison` |
| Global Visibility Matrix Report | `/dashboard/global-visibility-matrix` |

### How it works

1. **`BillingProvider`** wraps the entire dashboard layout and fetches billing state once
2. **`BillingGate`** checks the current route against the user's plan, modules, and purchased reports
3. If access is denied, a **`LockedOverlay`** is shown instead of the page content, with:
   - A lock icon
   - Clear explanation of what's needed
   - CTA button to the relevant purchase page
4. **Sidebar lock icons**: locked routes show a small lock icon next to their name and appear dimmed

### With Plan but No Modules

User has full access to base features:
- Main dashboard with all basic data
- Domain management
- System settings
- Seat management
- Prompt monitoring (up to plan limit)
- Viewing purchased reports
- Partial intelligence signals

Module-specific features show as locked upgrade cards.

### With Plan and Modules

Full access to all subscribed capabilities. Features from non-subscribed modules remain locked.

### Without Any Plan

User can only access `/dashboard/billing` and `/dashboard/select-plan`. All other routes show "Subscription Required" with a CTA to choose a plan.

---

## 10. Billing Page Summary

The `/dashboard/billing` page is the central hub for all billing operations:

1. **Current Plan Card** — Shows plan name, price, usage bar, renewal date, commitment status
2. **Active Modules** — Lists subscribed modules with total monthly cost and link to Modules page
3. **Intelligence Reports** — Shows purchased reports, auto-activated monitoring, discount tier badges, and "Purchase Reports" button
4. **Payment Method** — Link to Stripe Customer Portal for card management
5. **Invoices** — Paginated table of all invoices with PDF download
6. **Plan Selection Modal** — Side-by-side comparison of Base/Professional/Enterprise
7. **Report Selection Modal** — Checkbox-based multi-select with live discount preview, total summary, and single checkout button

## 11. Modules Page (`/dashboard/modules`)

A dedicated page in the sidebar for managing modules:

1. **Active modules** section at the top with total monthly cost and remove buttons
2. **Module selection** with checkboxes — active modules shown as checked/green, new ones selectable
3. **Sticky footer** with subscribe button showing selected count and total monthly cost
4. Requires an active plan subscription — shows a warning banner with link to billing if none exists

---

## 12. Seat Behavior with Billing

Seats are the core licensing unit:

| Plan | Domains | Users | Prompt Limit |
|---|---|---|---|
| Base | 1 | 1 | 10 prompts |
| Professional | 1 | 1 | 20 prompts |
| Enterprise | 1 | 1 | 50 prompts |

- Each seat = 1 domain + 1 user account + defined prompt capacity
- To monitor another domain, purchase another seat (existing seat purchase flow at `$1/seat` remains for team members)
- Seat-based plan subscription determines the prompt monitoring capacity
- The existing `organizations.seats` / `seats_used` system continues to work for team member seat management
