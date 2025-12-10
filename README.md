# GeoRepute.ai - AI-Driven Generative Optimization System

Next-generation, AI-driven visibility control across traditional SEO and emerging AI search ecosystems with **complete team management and Stripe payment integration**.

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Quick Start](#-quick-start)
4. [Stripe Payment Integration](#-stripe-payment-integration)
5. [Team Seat Management](#-team-seat-management)
6. [Organizations & Roles](#-organizations--roles-system)
7. [Team Management UI](#-team-management-ui)
8. [Email Report Delivery](#-email-report-delivery)
9. [Public Report Sharing](#-public-report-sharing)
10. [Database Setup](#-database-setup)
11. [API Documentation](#-api-documentation)
12. [Troubleshooting](#-troubleshooting)
13. [Deployment](#-deployment)

---

## 🚀 Features

### Core Capabilities
- **Split-View LIVE Dashboard**: Real-time AI/Google search alongside rankings
- **AI Visibility Tracking**: Monitor presence across GPT, Gemini, Perplexity, and 50+ platforms
- **Self-Learning GEO Core**: Continuous AI optimization with feedback loops
- **Content Orchestrator**: Multi-stage approval workflow with AI humanization
- **Keyword Forecast Engine**: Predictive AI with difficulty, traffic & ROI forecasts
- **AI Content Generation**: 95%+ human score content that bypasses AI detection
- **Action Plans**: AI-generated strategic optimization roadmaps
- **50+ BI Reports**: Comprehensive analytics with PDF/CSV exports
- **Email Report Delivery**: Send professional HTML reports via Gmail SMTP ⭐ NEW
- **Public Report Sharing**: Shareable public report links with view tracking ⭐ NEW
- **White-Label Ready**: Custom branding for agencies

### Team & Billing Features ⭐ NEW
- **Stripe Payment Integration**: Seamless seat purchase workflow
- **Flexible Seat Management**: Pay-per-seat model ($1/seat)
- **Organization Owner Free**: Owner account always included
- **Real-time Seat Tracking**: Monitor usage and availability
- **Pending Invitation Management**: Track and manage invites
- **Professional Team UI**: Modern, polished interface
- **Role-Based Permissions**: Admin, Manager, Editor, Viewer roles

### Role-Based Access
- **Admin Panel**: Full system control, user management, seat purchases
- **Agency Tools**: Multi-client management, quote builder, team management
- **Client Portal**: Individual dashboards, content generation, tracking

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion for smooth interactions
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: Zustand
- **Notifications**: React Hot Toast
- **Payments**: Stripe.js

### Backend & Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **AI Engine**: OpenAI GPT-4 Turbo
- **Payment Processing**: Stripe
- **Row Level Security**: Supabase RLS policies
- **API Routes**: Next.js API Routes
- **Email**: Nodemailer with Gmail SMTP

### Deployment
- **Hosting**: Vercel (recommended)
- **Database**: Supabase Cloud
- **Payments**: Stripe

---

## 📦 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/georepute-ai.git
cd georepute-ai
npm install
```

### 2. Install Additional Dependencies
```bash
# Stripe packages
npm install stripe @stripe/stripe-js
```

### 3. Setup Environment Variables
Create `.env.local` in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Gmail SMTP (for email invitations and reports)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
EMAIL_FROM_NAME_REPORT=GeoRepute.ai Reports
```

### 4. Database Setup

#### Run All Migrations
Execute these SQL files in your Supabase SQL Editor in order:

1. `database/001_organizations_and_roles.sql` - Base org structure
2. `database/002_fix_rls_recursion.sql` - RLS fixes
3. `database/003_fix_team_page_rls.sql` - Team page policies
4. `database/004_invitation_tokens.sql` - Email invitations
5. `database/005_fix_user_table_rls.sql` - User table policies
6. `database/006_allow_delete_organization_users.sql` - Delete permissions
7. `database/007_fix_invitation_tokens_rls.sql` - Invitation policies
8. **`database/008_add_seats_to_organizations.sql`** - Seat management ⭐ NEW

### 5. Start Development Server
```bash
npm run dev
```

### 6. Setup Stripe Webhooks (Development)

#### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Linux
wget -qO- https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
```

### Environment Variables

Required variables in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for scheduled publishing

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Scheduled Publishing (Optional)
CRON_SECRET=your_random_secret_key  # Optional, for external cron services

# Optional: OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# LinkedIn Integration (for auto-publishing)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your_linkedin_client_id  # Same as above, for client-side OAuth redirect
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/auth/linkedin/callback  # Development
# LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/auth/linkedin/callback  # Production
```

**Setup Instructions:**
1. Create a Supabase project at https://supabase.com
2. Get OpenAI API key from https://platform.openai.com
3. Run database migrations from `/database` folder
4. Configure Google OAuth (optional) in Supabase dashboard

## 🗄️ Database Schema

### Core Tables
- **user**: User profiles with roles (admin/agency/client)
- **keyword_forecast**: AI-generated keyword analysis
- **content_strategy**: Content generation history
- **action_plan**: Strategic optimization plans
- **ai_engine_results**: AI visibility tracking
- **geo_learning_data**: Self-learning feedback loop
- **competitor_analysis**: Competitor tracking data

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data.

### Running Migrations
```bash
# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret (starts with `whsec_`) and add it to `.env.local`.

### 7. Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💳 Stripe Payment Integration

### Overview
Complete Stripe integration for purchasing team member seats at $1 per seat.

### Key Features
✅ Secure Stripe Checkout integration
✅ Webhook-based seat allocation
✅ Payment history tracking
✅ Automatic seat updates
✅ Real-time availability checking
✅ Admin-only purchase restrictions

### Setup Instructions

#### 1. Get Stripe API Keys

1. Sign up at [https://stripe.com](https://stripe.com)
2. Go to Dashboard → Developers → API keys
3. Copy your **Publishable key** and **Secret key**
4. Add them to `.env.local`

#### 2. Configure Webhooks

**For Development:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**For Production:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the signing secret

#### 3. Test Purchase Flow

1. Navigate to Dashboard → Team → Manage Team
2. Click "Buy More Seats"
3. Select number of seats (1-100)
4. Click "Purchase"
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout

**Verify:**
- Seats added to organization
- Payment recorded in database
- Can now invite team members

### API Endpoints

#### Create Checkout Session
```typescript
POST /api/stripe/create-checkout

Body:
{
  "organizationId": "uuid",
  "seats": 5
}

Response:
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Webhook Handler
```typescript
POST /api/stripe/webhook

Headers:
- stripe-signature: [signature]

Body: Stripe event payload
```

### Database Tables

#### seat_payments
Tracks all seat purchase transactions:
```sql
- id: UUID
- organization_id: UUID
- stripe_session_id: VARCHAR(500)
- stripe_payment_intent_id: VARCHAR(500)
- amount_cents: INTEGER
- seats_purchased: INTEGER
- status: VARCHAR(50) [pending, completed, failed, refunded]
- paid_at: TIMESTAMP
- created_at: TIMESTAMP
```

### Pricing

| Seats | Cost | Total People (with owner) |
|-------|------|---------------------------|
| 0 | $0 | 1 (owner only) |
| 5 | $5 | 6 (5 + owner) |
| 10 | $10 | 11 (10 + owner) |
| 20 | $20 | 21 (20 + owner) |
| 50 | $50 | 51 (50 + owner) |
| 100 | $100 | 101 (100 + owner) |

**Note**: Organization owner is always free and doesn't count against seat limit.

---

## 👥 Team Seat Management

### Seat Calculation Formula

```
Available Seats = Purchased Seats - Active Members (excluding owner) - Pending Invitations
```

### How It Works

#### 1. Organization Creation
- **Default Seats**: 0 (all must be purchased)
- **Owner Status**: Free (doesn't count)
- **Initial State**: Owner can work alone at no cost

#### 2. Adding Team Members
- **Requirement**: Must have available purchased seats
- **Check**: System validates before sending invitation
- **Pending Invites**: Count against available seats
- **Owner**: Never counted in seat usage

#### 3. Seat Validation
The system validates seat availability at multiple points:

**Before Invitation:**
```typescript
const totalPending = pendingInvites.length + pendingInvitations.length;
const availableSeats = totalSeats - usedSeats - totalPending;

if (availableSeats <= 0) {
  // Prevent invitation
  // Prompt to purchase or cancel pending invites
}
```

**During Invitation:**
- Re-validates availability (prevents race conditions)
- Shows appropriate error messages
- Suggests actions (cancel invites or purchase seats)

**Database Level:**
```sql
-- Trigger enforces seat limits
CREATE TRIGGER trigger_check_seat_availability
  BEFORE INSERT OR UPDATE ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION check_seat_availability();
```

### Scenarios

#### Scenario 1: New Organization
```
Purchased Seats: 0
Active Members: 1 (owner - free)
Pending Invites: 0
Available: 0 ❌

Action Required: Purchase seats before inviting
```

#### Scenario 2: After Purchase
```
Purchased Seats: 5
Active Members: 1 (owner - free)  
Pending Invites: 0
Available: 5 ✅

Can Invite: 5 team members
```

#### Scenario 3: With Pending Invites
```
Purchased Seats: 5
Active Members: 2 (1 owner + 1 member)
Pending Invites: 2
Available: 2 ✅

Note: Pending invites reserve seats
```

#### Scenario 4: At Capacity
```
Purchased Seats: 5
Active Members: 4 (1 owner + 3 members)
Pending Invites: 2
Available: 0 ❌

Options:
1. Cancel a pending invitation
2. Purchase more seats
```

### User Experience

#### Visual Indicators

**Green (Seats Available):**
```
✅ "Seats available! You can invite X more team members. (Owner seat is free)"
```

**Yellow (Reserved by Pending Invites):**
```
⚠️ "All seats are reserved. You have X pending invitations.
    Cancel a pending invitation to free up a seat, or purchase more seats."
```

**Red (No Seats):**
```
🔴 "No seats available. Purchase seats to invite team members.
    (Owner is free and doesn't count)"
```

### Best Practices

1. **Plan Ahead**: Purchase seats before inviting team members
2. **Monitor Usage**: Check seat overview regularly
3. **Manage Invites**: Cancel expired or unnecessary invitations
4. **Owner Privileges**: Owner can always access, never needs a seat
5. **Scale Gradually**: Purchase seats as your team grows

---

## 🏢 Organizations & Roles System

### Organization Structure

Each organization has:
- **Unique ID**: UUID identifier
- **Name**: Organization/Agency name
- **Description**: Optional description
- **Website**: Optional website URL
- **Logo**: Optional logo URL
- **Seats**: Number of purchased team seats (default: 0)
- **Seats Used**: Auto-calculated active members (excluding owner)
- **Created/Updated**: Timestamps

### Roles & Permissions

#### Admin
**Capabilities:**
- Full organization control
- User management (invite, edit, remove)
- Purchase team seats
- Update organization settings
- Access all features
- Manage billing

**Permissions:**
```json
{
  "all": true,
  "users": {"create": true, "read": true, "update": true, "delete": true},
  "organization": {"update": true, "delete": true},
  "billing": {"manage": true}
}
```

#### Manager
**Capabilities:**
- Content management
- Keyword management
- View reports
- Limited team visibility

**Permissions:**
```json
{
  "content": {"create": true, "read": true, "update": true, "delete": true},
  "keywords": {"create": true, "read": true, "update": true, "delete": true},
  "reports": {"read": true}
}
```

#### Editor
**Capabilities:**
- Create and edit content
- View keywords
- Limited access

**Permissions:**
```json
{
  "content": {"create": true, "read": true, "update": true},
  "keywords": {"read": true}
}
```

#### Viewer
**Capabilities:**
- Read-only access
- View content and reports

**Permissions:**
```json
{
  "content": {"read": true},
  "keywords": {"read": true},
  "reports": {"read": true}
}
```

### Organization Setup Flow

1. **User Signs Up** → Creates account
2. **Role Selection** → Automatically set to "Agency"
3. **Organization Setup** → Fill in organization details
4. **Onboarding** → 4-step guided setup
5. **Dashboard Access** → Start using the platform

### Team Invitation Flow

1. **Admin Checks Seats** → Verifies available seats
2. **Purchases Seats** (if needed) → Stripe checkout
3. **Invites Member** → Enters email and selects role
4. **Email Sent** → Invitation email with token
5. **Member Accepts** → Clicks link, creates/logs in
6. **Joins Organization** → Access granted based on role

---

## 🎨 Team Management UI

### Design System

#### Color Scheme
```css
/* Primary Actions */
from-primary-600 to-accent-600 (gradient buttons)

/* Status Colors */
- Success: bg-green-100 text-green-600
- Warning: bg-yellow-100 text-yellow-600
- Danger: bg-red-100 text-red-600
- Info: bg-blue-100 text-blue-600

/* Role Colors */
- Admin: bg-purple-100 text-purple-700
- Manager: bg-blue-100 text-blue-700
- Editor: bg-green-100 text-green-700
- Viewer: bg-gray-100 text-gray-700
```

#### Components

**Statistics Cards:**
- Hover effects with gradient glow
- Icon badges with colored backgrounds
- Status indicators (Active/Action Needed)
- Smooth animations
- 3D depth with shadows

**Team Member Cards:**
- Gradient backgrounds on hover
- Modern rounded corners (2xl)
- Gradient avatar squares
- Badge indicators (role, status, "You")
- Professional dropdown menus
- Smooth transitions (300ms)

**Pending Invitation Cards:**
- Yellow theme for pending users
- Orange theme for email invites
- Expiration countdown badges
- Mail badge indicators
- Action menus with dividers

**Empty States:**
- Gradient backgrounds with dashed borders
- Large icons in colored circles
- Context-aware messages
- Call-to-action buttons

### UI Features

✅ **Consistent Design Language** - All components follow same visual style
✅ **Clear Visual Hierarchy** - Important information stands out
✅ **Micro-interactions** - Delightful hover and click effects
✅ **Professional Polish** - Attention to detail in spacing, shadows
✅ **Accessibility** - Focus states, color contrast, clear labels
✅ **Responsive** - Mobile-optimized with adaptive grids
✅ **Smooth Animations** - Staggered entrance, hover effects

### Page Sections

1. **Seat Overview Card**
   - Shows purchased seats + owner (free)
   - Active member count
   - Pending invitations
   - Available seats
   - Status message with color coding
   - "Buy More Seats" button

2. **Statistics Grid**
   - Team Members count
   - Admins count
   - Managers count
   - Pending Invites count
   - Hover effects and status badges

3. **Search & Actions Bar**
   - Enhanced search with focus animations
   - Clear button when typing
   - Invite Member button (with seat validation)
   - Disabled states with helpful messages

4. **Team Members Section**
   - Grid of active member cards
   - Avatar with gradient background
   - Role and status badges
   - Join date information
   - Action menu (Edit Role, Remove)
   - "You" badge for current user

5. **Pending Invitations Section**
   - Separate cards for pending users
   - Expiration countdown
   - Cancel/Resend actions
   - Visual differentiation from active members

---

## 📧 Email Report Delivery

### Overview
Send professional, beautifully designed performance reports directly to users via email using Gmail SMTP.

### Features
✅ **Professional HTML Email Templates** - Gradient headers, responsive design
✅ **Comprehensive Metrics** - Keywords, content, AI visibility performance
✅ **Platform Breakdown** - Visual AI platform performance analysis
✅ **Top Keywords Table** - Easy-to-read performance data
✅ **Direct Dashboard Link** - One-click access to full report
✅ **Custom From Name** - Branded sender name for reports

### Setup

#### 1. Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if needed)
3. Scroll to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "GeoRepute.ai" and click **Generate**
6. Copy the 16-character password

#### 2. Configure Environment Variables

Add to your `.env.local`:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME_REPORT=GeoRepute.ai Reports
```

#### 3. Usage

1. Navigate to **Dashboard** → **Reports**
2. Select date range (7/30/90 days)
3. Click **"Email Report"** button
4. Enter recipient name and email
5. Review summary and click **"Send Report"**

### Email Contents

The report email includes:

**Key Metrics Overview:**
- Total Keywords tracked
- Average Ranking score
- Total Content pieces
- Published Content count

**AI Visibility Performance:**
- Overall Visibility Score
- Total Mentions across platforms
- Top 5 platform breakdown with scores and mentions

**Top Keywords:**
- Up to 10 top-performing keywords
- Ranking scores and search volumes
- Easy-to-read table format

**Professional Design:**
- Gradient headers and modern layout
- Color-coded metrics cards
- Responsive (works on mobile)
- Branded sender name
- Direct link to full dashboard report

### API Endpoint

```typescript
POST /api/reports/send-email

Authorization: Required (Supabase Auth)

Body:
{
  "email": "recipient@example.com",
  "userName": "John Doe",
  "reportData": {
    "dateRange": "Last 30 Days",
    "totalKeywords": 150,
    "avgRanking": 8.5,
    "totalContent": 45,
    "publishedContent": 32,
    "avgVisibilityScore": 78.5,
    "totalMentions": 234,
    "topKeywords": [...],
    "visibilityByPlatform": [...]
  }
}

Response (Success):
{
  "success": true,
  "message": "Report sent successfully"
}
```

### Troubleshooting

**Error: "Email service not configured"**
- Ensure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in `.env.local`

**Error: "Invalid login"**
- Verify App Password is correct (16 characters)
- Ensure 2-Step Verification is enabled
- Generate a new App Password if needed

**Emails not arriving**
- Check spam/junk folder
- Verify email address is correct
- Check Gmail's "Sent" folder

For detailed setup instructions, see: `docs/EMAIL_REPORT_SETUP.md`

---

## 📊 Public Report Sharing

### Overview
Automatically generate and share public performance reports via unique URLs. When users send reports via email, the system creates a shareable public link that anyone can access without authentication.

### Features
✅ **Automatic Storage**: Report data saved to database when emailed
✅ **Unique Share Links**: URL-safe tokens for each report
✅ **Public Access**: No login required to view
✅ **View Tracking**: Automatic view count for each report
✅ **Beautiful Public Page**: Matches dashboard design aesthetics
✅ **Email Integration**: Public link included in report emails
✅ **Permanent Storage**: Reports remain accessible indefinitely

### How It Works

#### 1. Generate & Send Report
1. User goes to **Dashboard → Reports**
2. Selects date range (7/30/90 days)
3. Clicks **"Email Report"**
4. System automatically:
   - Saves complete report data to `reports` table
   - Generates unique 40-character share token
   - Creates public URL
   - Sends email with public link

#### 2. Share Report
Email recipients receive:
- Professional HTML report email
- **"View Public Report"** button
- Shareable URL they can forward to others
- No login required

#### 3. View Public Report
Anyone with the link can:
- View full performance report
- See all metrics, keywords, and AI visibility data
- Access from any device (responsive)
- No authentication needed

### Public Report URL Structure

```
https://yourdomain.com/public/report/[shareToken]
```

Example:
```
https://georepute.ai/public/report/abc123xyz789...
```

### Database Table

**Table**: `reports`

Key fields:
- `share_token`: Unique 40-char token (auto-generated)
- `is_public`: Boolean (default: true)
- `expires_at`: Optional expiration date
- `view_count`: Tracks number of views
- Complete report data (keywords, content, AI visibility)

### API Endpoints

#### Get Public Report
```typescript
GET /api/reports/public/[shareToken]

Response:
{
  "success": true,
  "report": {
    "id": "uuid",
    "title": "Last 30 Days Performance Report",
    "date_range": "Last 30 Days",
    "generated_at": "2025-12-01T10:00:00Z",
    "total_keywords": 150,
    "avg_ranking": 8.5,
    "total_content": 45,
    "avg_visibility_score": 78.5,
    "view_count": 42,
    // ... all report data
  }
}
```

### Public Page Features

**What's Included:**
- 📊 Report title and date range
- 👁️ View counter
- 📈 Key metrics cards (Keywords, Ranking, Content, AI Visibility)
- 🔑 Top 10 keywords with rankings and volumes
- 🤖 AI platform visibility breakdown
- 📱 Fully responsive design
- 🎨 Professional gradients and styling

**What's NOT Exposed:**
- ❌ User personal information
- ❌ Organization details
- ❌ Email addresses
- ❌ Private/sensitive data

### Security Features

✅ **Row Level Security (RLS)**: Database-level access control
✅ **Anonymous Access**: Public reports viewable without auth
✅ **Unique Tokens**: 40-character collision-resistant tokens
✅ **Optional Expiration**: Set expiration dates if needed
✅ **Private Option**: Make reports private anytime
✅ **Audit Trail**: View count tracking

### Database Setup

Run migration:
```sql
-- Execute in Supabase SQL Editor
-- File: database/009_reports_table.sql
```

This creates:
- `reports` table with all report data fields
- Unique indexes on `share_token`
- RLS policies for public/private access
- Auto-increment view count function
- Share token generation trigger

### RLS Policies

**Public Access** (no auth required):
```sql
CREATE POLICY "Anyone can view public reports"
  ON public.reports
  FOR SELECT
  USING (is_public = true AND (expires_at IS NULL OR expires_at > NOW()));
```

**User Access**:
- Users can create their own reports
- Users can view/edit/delete their own reports
- Organization members can view org reports

### Use Cases

**1. Client Reporting**
- Generate monthly performance reports
- Share with clients via email
- Clients forward to stakeholders
- Track engagement via view counts

**2. Team Collaboration**
- Share reports with team members
- No need for separate logins
- Everyone sees same data
- Perfect for distributed teams

**3. Public Transparency**
- Share results publicly
- Build trust with stakeholders
- Demonstrate progress
- Use in presentations

### Managing Reports

#### View Your Reports
```sql
SELECT id, title, date_range, share_token, view_count, generated_at
FROM reports
WHERE user_id = auth.uid()
ORDER BY generated_at DESC;
```

#### Make Report Private
```sql
UPDATE reports
SET is_public = false
WHERE id = 'report_uuid' AND user_id = auth.uid();
```

#### Set Expiration
```sql
UPDATE reports
SET expires_at = NOW() + INTERVAL '7 days'
WHERE id = 'report_uuid' AND user_id = auth.uid();
```

### Monitoring

**View Count Tracking:**
- Automatically incremented on each view
- Shown in public report header
- Visible to report owner in dashboard
- Useful for engagement metrics

**Popular Reports:**
```sql
SELECT title, view_count, generated_at
FROM reports
WHERE is_public = true
ORDER BY view_count DESC
LIMIT 10;
```

For detailed documentation, see:
- `docs/PUBLIC_REPORTS_GUIDE.md` - Complete guide
- `docs/PUBLIC_REPORTS_TESTING.md` - Testing instructions

---

## 🗄️ Database Setup

### Migration Order

Execute these SQL files in Supabase SQL Editor in this order:

1. **001_organizations_and_roles.sql**
   - Creates organizations table
   - Creates roles table with default roles
   - Creates organization_users junction table
   - Sets up RLS policies

2. **002_fix_rls_recursion.sql**
   - Fixes recursive RLS policy issues
   - Optimizes query performance

3. **003_fix_team_page_rls.sql**
   - Updates team page policies
   - Allows proper data access

4. **004_invitation_tokens.sql**
   - Creates invitation_tokens table
   - Sets up expiration logic
   - Email invitation support

5. **005_fix_user_table_rls.sql**
   - Updates user table policies
   - Fixes access issues

6. **006_allow_delete_organization_users.sql**
   - Adds delete permissions
   - Allows member removal

7. **007_fix_invitation_tokens_rls.sql**
   - Fixes invitation token policies
   - Proper access control

8. **008_add_seats_to_organizations.sql** ⭐ NEW
   - Adds seat management
   - Creates seat_payments table
   - Implements seat validation triggers
   - Enforces seat limits

9. **009_reports_table.sql** ⭐ NEW
   - Creates reports table for public sharing
   - Implements share token generation
   - Sets up RLS for public access
   - Adds view count tracking
   - Auto-generates unique share tokens

### Key Tables

#### organizations
```sql
- id: UUID (PK)
- name: VARCHAR(255)
- description: TEXT
- website: VARCHAR(500)
- logo_url: VARCHAR(500)
- seats: INTEGER (default: 0) ⭐ NEW
- seats_used: INTEGER (default: 0) ⭐ NEW
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### organization_users
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- organization_id: UUID (FK)
- role_id: UUID (FK)
- invited_by: UUID
- invited_at: TIMESTAMP
- joined_at: TIMESTAMP
- status: VARCHAR(50) [active, inactive, invited, suspended]
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### seat_payments ⭐ NEW
```sql
- id: UUID (PK)
- organization_id: UUID (FK)
- stripe_session_id: VARCHAR(500)
- stripe_payment_intent_id: VARCHAR(500)
- amount_cents: INTEGER
- seats_purchased: INTEGER
- currency: VARCHAR(3) [default: usd]
- status: VARCHAR(50) [pending, completed, failed, refunded]
- paid_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### invitation_tokens
```sql
- id: UUID (PK)
- organization_id: UUID (FK)
- role_id: UUID (FK)
- email: VARCHAR(255)
- token: VARCHAR(500)
- status: VARCHAR(50) [pending, accepted, expired, cancelled]
- expires_at: TIMESTAMP
- created_at: TIMESTAMP
```

### Triggers & Functions

#### update_organization_seats_used()
Automatically calculates and updates seats_used when members are added/removed:
```sql
- Counts active members
- Excludes organization owner
- Updates seats_used column
```

#### check_seat_availability()
Validates seat availability before adding members:
```sql
- Checks if seats are available
- Excludes owner from count
- Throws error if no seats available
- Enforces database-level constraint
```

---

## 📚 API Documentation

### Stripe Endpoints

#### Create Checkout Session
```typescript
POST /api/stripe/create-checkout

Authorization: Required (Supabase Auth)

Request Body:
{
  "organizationId": "uuid",
  "seats": number (1-100)
}

Response (Success):
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}

Response (Error):
{
  "error": "Error message"
}
```

**Validations:**
- User must be authenticated
- User must be admin of organization
- Seats must be between 1-100
- Creates payment record with status "pending"

#### Verify Checkout Session
```typescript
GET /api/stripe/create-checkout?session_id=cs_test_...

Response:
{
  "success": true,
  "status": "paid",
  "session": {
    "id": "cs_test_...",
    "payment_status": "paid",
    "amount_total": 500,
    "currency": "usd",
    "metadata": {...}
  }
}
```

#### Webhook Handler
```typescript
POST /api/stripe/webhook

Headers:
- stripe-signature: [required]

Body: Stripe event payload

Events Handled:
- checkout.session.completed → Add seats to organization
- checkout.session.expired → Mark payment as failed
- payment_intent.succeeded → Update payment status
- payment_intent.payment_failed → Mark payment as failed

Response:
{
  "received": true
}
```

**Security:**
- Verifies webhook signature
- Uses service role for database operations
- Idempotent processing (handles duplicates)

### Organization Endpoints

#### Create Organization
```typescript
POST /api/organizations

Body:
{
  "name": "My Agency",
  "description": "Optional description",
  "website": "https://example.com",
  "logo_url": "https://example.com/logo.png"
}

Response:
{
  "success": true,
  "organization": {...}
}
```

#### Get Organizations
```typescript
GET /api/organizations

Response:
{
  "success": true,
  "organizations": [...]
}
```

### Invitation Endpoints

#### Send Invitation
```typescript
POST /api/organizations/invite

Body:
{
  "email": "user@example.com",
  "organizationId": "uuid",
  "roleId": "uuid"
}

Response:
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "user@example.com",
    "email_sent": true
  }
}
```

#### Resend Invitation
```typescript
POST /api/organizations/invite/resend

Body:
{
  "invitationId": "uuid"
}

Response:
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email_sent": true
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Failed to Create Payment Record

**Error:**
```
POST /api/stripe/create-checkout 500 (Internal Server Error)
Error: Failed to create payment record
```

**Causes:**
- Missing `SUPABASE_SERVICE_ROLE_KEY` environment variable
- Database migration not run
- RLS policies blocking insert

**Solutions:**
1. Add service role key to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Run database migration:
```sql
-- Execute: database/008_add_seats_to_organizations.sql
```

3. Restart development server:
```bash
npm run dev
```

#### 2. Stripe Redirect Error

**Error:**
```
IntegrationError: stripe.redirectToCheckout is no longer supported
```

**Solution:**
✅ Already fixed in `components/PurchaseSeats.tsx`
- Uses direct URL redirect instead of deprecated method
- No action needed

#### 3. Webhook Signature Verification Failed

**Error:**
```
Webhook Error: No signature found
```

**Solutions:**
1. For local development:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

2. Copy the webhook secret (starts with `whsec_`) to `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Restart server

#### 4. No Available Seats Error

**Error:**
```
No available seats. Please purchase more seats first.
```

**Explanation:**
✅ This is expected behavior! The system is working correctly.

**Solutions:**
- Purchase seats first, then invite members
- Cancel pending invitations to free up seats
- Check seat overview for current usage

#### 5. Cannot Invite Member

**Causes:**
- No purchased seats available
- Pending invitations using all seats
- Database constraint preventing insert

**Solutions:**
1. Check seat overview in Team page
2. Purchase additional seats
3. Cancel unnecessary pending invitations
4. Verify user has admin role

### Debugging Tips

#### Check Environment Variables
```bash
# Add to your API route temporarily
console.log('Env check:', {
  supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  stripeSecret: !!process.env.STRIPE_SECRET_KEY,
  stripePublishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
});
```

#### Verify Database Tables
```sql
-- Check if seat_payments table exists
SELECT * FROM seat_payments LIMIT 1;

-- Check organization seats
SELECT id, name, seats, seats_used 
FROM organizations;

-- Check seat payments
SELECT * FROM seat_payments 
ORDER BY created_at DESC LIMIT 10;
```

#### Monitor Webhook Delivery
1. Go to Stripe Dashboard
2. Developers → Webhooks
3. Click your endpoint
4. View recent events and delivery status

#### Test Cards
Use these Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

All test cards:
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

#### 1. Prepare Repository
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure project settings

#### 3. Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# Stripe (LIVE keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (production webhook)

# OpenAI
OPENAI_API_KEY=your_openai_key

# Application
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

#### 4. Setup Production Webhook

1. **Activate Stripe Live Mode**
   - Complete business verification
   - Switch to Live mode in dashboard

2. **Create Production Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - Copy signing secret to Vercel env vars

3. **Test Production Deployment**
   - Use real credit card (you'll be charged!)
   - Verify webhook delivery
   - Check database for payment records
   - Confirm seats are added

#### 5. Database Migrations
Ensure all migrations are run in your production Supabase instance:
1. Go to Supabase Dashboard (production project)
2. SQL Editor → New query
3. Execute all migration files in order
4. Verify tables and triggers exist

### Post-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations executed
- [ ] Stripe webhook configured and tested
- [ ] Live payment test successful
- [ ] Seats correctly allocated after payment
- [ ] Email invitations working
- [ ] Team management functional
- [ ] RLS policies active
- [ ] SSL certificate active
- [ ] Custom domain configured (optional)

### Monitoring

#### Stripe Dashboard
- Monitor payment success rate
- Check webhook delivery status
- Review customer disputes
- Track revenue

#### Supabase Dashboard
- Monitor database performance
- Check RLS policy execution
- Review API usage
- Monitor auth activity

#### Vercel Dashboard
- Check deployment status
- Monitor function execution
- Review error logs
- Check build times

---

## 📊 Database Queries for Monitoring

### Seat Usage
```sql
-- Organization seat overview
SELECT 
  o.name,
  o.seats as purchased_seats,
  o.seats_used,
  (o.seats - o.seats_used) as available_seats,
  COUNT(ou.id) FILTER (WHERE ou.status = 'active') as total_members
FROM organizations o
LEFT JOIN organization_users ou ON ou.organization_id = o.id
GROUP BY o.id, o.name, o.seats, o.seats_used;
```

### Payment History
```sql
-- Recent seat purchases
SELECT 
  o.name as organization,
  sp.seats_purchased,
  sp.amount_cents / 100.0 as amount_usd,
  sp.status,
  sp.paid_at,
  sp.created_at
FROM seat_payments sp
JOIN organizations o ON sp.organization_id = o.id
ORDER BY sp.created_at DESC
LIMIT 20;
```

### Active Invitations
```sql
-- Pending invitations overview
SELECT 
  o.name as organization,
  it.email,
  r.name as role,
  it.status,
  it.expires_at,
  it.created_at
FROM invitation_tokens it
JOIN organizations o ON it.organization_id = o.id
JOIN roles r ON it.role_id = r.id
WHERE it.status IN ('pending', 'expired')
ORDER BY it.created_at DESC;
```

### Team Analytics
```sql
-- Organization size distribution
SELECT 
  CASE 
    WHEN member_count = 1 THEN 'Solo (Owner only)'
    WHEN member_count <= 5 THEN 'Small (2-5)'
    WHEN member_count <= 20 THEN 'Medium (6-20)'
    ELSE 'Large (21+)'
  END as organization_size,
  COUNT(*) as count
FROM (
  SELECT 
    o.id,
    COUNT(ou.id) FILTER (WHERE ou.status = 'active') as member_count
  FROM organizations o
  LEFT JOIN organization_users ou ON ou.organization_id = o.id
  GROUP BY o.id
) subquery
GROUP BY organization_size
ORDER BY 
  CASE organization_size
    WHEN 'Solo (Owner only)' THEN 1
    WHEN 'Small (2-5)' THEN 2
    WHEN 'Medium (6-20)' THEN 3
    WHEN 'Large (21+)' THEN 4
  END;
```

---

## 🎯 Key Features Summary

### ✅ Implemented Features

#### Signup & Onboarding
- ✅ Automatic agency role assignment
- ✅ Organization info collection
- ✅ Owner gets free account
- ✅ Can edit organization later

#### Team Management
- ✅ Two tabs: Organization Info & Manage Team
- ✅ Professional modern UI
- ✅ Seat overview dashboard
- ✅ Real-time seat tracking
- ✅ Pending invitation management
- ✅ Role-based access control

#### Payment System
- ✅ Stripe integration
- ✅ $1 per seat pricing
- ✅ Owner always free
- ✅ Secure checkout
- ✅ Webhook processing
- ✅ Payment history
- ✅ Automatic seat allocation

#### Seat Validation
- ✅ Database-level enforcement
- ✅ API-level validation
- ✅ UI-level checks
- ✅ Pending invites counted
- ✅ Owner excluded from limits
- ✅ Clear error messages

#### User Experience
- ✅ Gradient hover effects
- ✅ Smooth animations
- ✅ Professional card designs
- ✅ Clear visual hierarchy
- ✅ Context-aware messages
- ✅ Responsive design
- ✅ Accessibility features

---

## 📝 License

This project is proprietary and confidential.

---

## 🤝 Support

For issues, questions, or feature requests:
- Check the [Troubleshooting](#-troubleshooting) section
- Review [Stripe Integration](#-stripe-payment-integration) docs
- Verify [Database Setup](#-database-setup)

---

## 🎉 Version History

### v2.0.0 (November 2024) - Team & Billing Update
- ✅ Complete Stripe payment integration
- ✅ Team seat management system
- ✅ Professional UI redesign
- ✅ Seat validation system
- ✅ Pending invitation tracking
- ✅ Owner-free pricing model
- ✅ Database triggers and constraints
- ✅ Comprehensive documentation

### v1.0.0 (Previous)
- Basic organization structure
- Role-based permissions
- Email invitations
- Team management

---

**Built with ❤️ for modern teams. Ready to scale with confidence! 🚀**
