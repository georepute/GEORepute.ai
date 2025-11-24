# GeoRepute.ai - AI-Driven Generative Optimization System

Next-generation, AI-driven visibility control across traditional SEO and emerging AI search ecosystems.

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Quick Start](#-quick-start)
4. [Project Structure](#-project-structure)
5. [Organizations & Roles System](#-organizations--roles-system)
6. [Team Management](#-team-management)
7. [Email Invitations](#-email-invitations-gmail-smtp)
8. [Database Setup](#-database-setup)
9. [Troubleshooting](#-troubleshooting)
10. [Testing](#-testing)
11. [Deployment](#-deployment)
12. [API Documentation](#-api-documentation)

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
- **Video Reports**: Auto-generated with AI narration (planned)
- **White-Label Ready**: Custom branding for agencies

### Role-Based Access
- **Admin Panel**: Full system control, user management
- **Agency Tools**: Multi-client management, quote builder, team management
- **Client Portal**: Individual dashboards, content generation, tracking

### User Experience
- **Guided Onboarding**: 4-step personalized setup flow
- **Demo Mode**: Interactive demo with sample data
- **Collapsible Sidebar**: Clean, focused workspace
- **Real-Time Notifications**: Toast alerts for actions
- **Responsive Design**: Mobile-friendly interface

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom color palette
- **Animations**: Framer Motion for smooth interactions
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: Zustand (demo mode, onboarding)
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast

### Backend & AI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **AI Engine**: OpenAI GPT-4 Turbo
- **Row Level Security**: Supabase RLS policies
- **API Routes**: Next.js API Routes
- **Email**: Nodemailer with Gmail SMTP

### Deployment
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions (optional)

---

## 📦 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/georepute-ai.git
cd georepute-ai
npm install
```

### 2. Setup Environment
Create `.env.local` in the root directory:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Gmail SMTP (for email invitations)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=GeoRepute.ai

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production: NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Setup Database
1. Create a Supabase project at https://supabase.com
2. Run SQL migrations from `/database` folder in Supabase SQL Editor:
   - `001_organizations_and_roles.sql` (Organizations & Roles)
   - `002_fix_rls_recursion.sql` (RLS fixes - if needed)
   - `004_invitation_tokens.sql` (Email invitations)
   - `005_fix_user_table_rls.sql` (Team visibility fix)

### 4. Setup Gmail SMTP (for email invitations)
1. Go to your Google Account: https://myaccount.google.com
2. Navigate to **Security** → Enable **2-Step Verification**
3. Go to **App passwords**: https://myaccount.google.com/apppasswords
4. Generate an app password for "GeoRepute.ai"
5. Copy the 16-character password to `.env.local`

### 5. Run Development Server
```bash
npm run dev
```

### 6. Open Application
Visit [http://localhost:3000](http://localhost:3000) and create an account!

**First Time Setup:**
1. Sign up → 2. Choose role (Client/Agency) → 3. Complete onboarding → 4. Start using the dashboard!

---

## 📁 Project Structure

```
GEORepute.ai/
├── app/                         # Next.js 14 App Router
│   ├── page.tsx                 # Home page
│   ├── about/                   # About page
│   ├── systems/                 # Our Systems page
│   ├── contact/                 # Contact page
│   ├── pricing/                 # Pricing plans page
│   ├── login/                   # Login page
│   ├── signup/                  # Signup page
│   ├── role-selection/          # Role selection (Client/Agency)
│   ├── onboarding/              # User onboarding flow
│   ├── dashboard/               # Dashboard app
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   ├── page.tsx             # Dashboard overview
│   │   ├── live-view/           # Live AI/Google search split view
│   │   ├── content-generator/   # AI content generation
│   │   ├── keyword-forecast/    # Keyword forecasting
│   │   ├── action-plans/        # AI-generated action plans
│   │   ├── team/                # Team management
│   │   └── settings/            # User settings
│   ├── api/                     # API routes
│   │   ├── organizations/       # Organization APIs
│   │   │   ├── route.ts         # Create/get organizations
│   │   │   └── invite/          # Invitation system
│   │   └── geo-core/            # GEO Core AI APIs
│   └── invite/accept/           # Invitation acceptance page
├── components/                  # Reusable UI components
├── lib/                         # Utilities & services
│   ├── supabase/                # Supabase client
│   ├── ai/geoCore.ts            # GEO Core AI engine
│   ├── organizations.ts         # Organization utilities
│   └── email.ts                 # Email service (Gmail SMTP)
├── database/                    # Database migrations
│   ├── 001_organizations_and_roles.sql
│   ├── 002_fix_rls_recursion.sql
│   ├── 004_invitation_tokens.sql
│   └── 005_fix_user_table_rls.sql
└── types/                       # TypeScript types
```

---

## 🏢 Organizations & Roles System

### Overview
Complete organization and role-based access control (RBAC) system that automatically creates organizations when users sign up as agencies.

### Database Schema

#### Tables

**organizations**
- `id` (UUID, Primary Key)
- `name` (VARCHAR, NOT NULL)
- `description` (TEXT)
- `website` (VARCHAR)
- `logo_url` (VARCHAR)
- `created_at`, `updated_at` (TIMESTAMP)

**roles** (4 default roles)
- `id` (UUID, Primary Key)
- `name` (VARCHAR, UNIQUE): Admin, Manager, Editor, Viewer
- `description` (TEXT)
- `permissions` (JSONB)
- `created_at` (TIMESTAMP)

**organization_users** (Junction Table)
- `id` (UUID, Primary Key)
- `user_id` (UUID, NOT NULL)
- `organization_id` (UUID → organizations.id)
- `role_id` (UUID → roles.id)
- `invited_by` (UUID)
- `status` (VARCHAR: active/inactive/invited/suspended)
- `invited_at`, `joined_at` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

### Role Permissions

| Role | Permissions |
|------|------------|
| **Admin** | Full access to everything |
| **Manager** | Content, keywords, reports management |
| **Editor** | Create and edit content |
| **Viewer** | Read-only access |

### Signup Flow

**For Agency Users:**
1. User signs up → 2. Selects "Agency" → 3. Organization auto-created → 4. User assigned as Admin → 5. Onboarding

**For Client Users:**
1. User signs up → 2. Selects "Client" → 3. No organization created → 4. Can be invited later → 5. Onboarding

### Helper Functions

Available in `lib/organizations.ts`:

```typescript
import { 
  getUserOrganizations,
  isOrganizationAdmin,
  hasPermission,
  getOrganizationMembers,
  createOrganization,
  updateUserRole,
  removeUserFromOrganization
} from '@/lib/organizations';

// Get user's organizations
const { organizations } = await getUserOrganizations();

// Check if admin
const isAdmin = await isOrganizationAdmin(orgId);

// Check permission
const canCreate = await hasPermission(orgId, 'content.create');

// Get members
const { members } = await getOrganizationMembers(orgId);
```

### Security Features

- ✅ Row Level Security (RLS) enabled
- ✅ Users can only view their organizations
- ✅ Only admins can update organization details
- ✅ Only admins can manage members
- ✅ Permission-based access control

---

## 👥 Team Management

### Features

The `/dashboard/team` page provides complete team management:

✅ **Real-Time Team Data** - Fetches organization members from database  
✅ **Invite Functionality** - Admins can invite new members via email  
✅ **Role Management** - Change member roles (Admin, Manager, Editor, Viewer)  
✅ **Member Removal** - Remove members from organization  
✅ **Search & Filter** - Real-time search by name, email, or role  
✅ **Statistics Dashboard** - Total members, admins, managers, pending invites  
✅ **Permission-Based UI** - Admin-only actions hidden from non-admins  

### Usage

```typescript
// In your team management page
import { 
  getOrganizationMembers,
  isOrganizationAdmin,
  updateUserRole,
  removeUserFromOrganization
} from '@/lib/organizations';

// Get all members
const { members } = await getOrganizationMembers(organizationId);

// Check admin status
const isAdmin = await isOrganizationAdmin(organizationId);

// Update member role
await updateUserRole(organizationId, userId, newRoleId);

// Remove member
await removeUserFromOrganization(organizationId, userId);
```

### UI Components

- **Member Cards**: Display name, email, role, status, join date
- **Invite Modal**: Email input + role selection
- **Edit Role Modal**: Select new role for member
- **Remove Confirmation**: Warning before removal
- **Statistics Cards**: Visual metrics for team overview

---

## 📧 Email Invitations (Gmail SMTP)

### Overview

Complete email invitation system using Gmail SMTP. Users receive beautiful HTML emails with invitation links to join organizations.

### Setup (5 Steps)

#### 1. Enable 2-Factor Authentication
1. Go to: https://myaccount.google.com → Security
2. Enable **2-Step Verification**

#### 2. Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** and **Other (Custom name)**
3. Enter name: "GeoRepute.ai"
4. Copy the 16-character password

#### 3. Add to Environment Variables
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=GeoRepute.ai
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 4. Run Database Migration
```sql
-- Run: database/004_invitation_tokens.sql
```

#### 5. Restart Dev Server
```bash
npm run dev
```

### Invitation Flow

```
Admin clicks "Invite Member"
    ↓
Enters email and selects role
    ↓
System generates secure token
    ↓
Beautiful HTML email sent via Gmail
    ↓
User clicks "Accept Invitation" in email
    ↓
User redirected to acceptance page
    ↓
User accepts invitation
    ↓
User added to organization
    ↓
Welcome email sent
```

### Security Features

- ✅ 32-byte cryptographically secure tokens
- ✅ 7-day expiration (configurable)
- ✅ One-time use only
- ✅ Email verification required
- ✅ Status tracking (pending/accepted/expired/cancelled)

### Email Templates

**Invitation Email:**
- Beautiful HTML design with gradient header
- Clear call-to-action button
- Organization and role details
- Expiration notice

**Welcome Email:**
- Sent after acceptance
- Link to dashboard
- Professional design

### API Endpoints

**POST /api/organizations/invite** - Send invitation
```json
{
  "email": "user@example.com",
  "organizationId": "org-uuid",
  "roleId": "role-uuid"
}
```

**GET /api/organizations/invite?token=xxx** - Validate token

**POST /api/organizations/invite/accept** - Accept invitation
```json
{
  "token": "invitation-token"
}
```

### Database Schema

```sql
invitation_tokens
├── id (UUID, PK)
├── organization_id (UUID → organizations.id)
├── email (VARCHAR)
├── role_id (UUID → roles.id)
├── invited_by (UUID)
├── token (VARCHAR, UNIQUE)
├── expires_at (TIMESTAMP)
├── accepted_at (TIMESTAMP)
├── status (VARCHAR: pending/accepted/expired/cancelled)
├── created_at, updated_at (TIMESTAMP)
```

---

## 🗄️ Database Setup

### Migrations to Run

Execute these in order in Supabase SQL Editor:

1. **001_organizations_and_roles.sql** ⭐ Main migration
   - Creates organizations, roles, organization_users tables
   - Adds 4 default roles
   - Sets up RLS policies
   - Creates helper functions

2. **002_fix_rls_recursion.sql** (Optional - if you encounter recursion errors)
   - Fixes RLS infinite recursion
   - Updates policies to prevent circular dependencies

3. **004_invitation_tokens.sql**
   - Creates invitation_tokens table
   - Adds RLS policies for invitations
   - Enables email invitation system

4. **005_fix_user_table_rls.sql**
   - Fixes team member visibility
   - Allows organization members to view each other
   - Required for team page to work properly

### Verification Queries

```sql
-- Check roles exist
SELECT * FROM roles ORDER BY name;
-- Should show: Admin, Editor, Manager, Viewer

-- View organizations
SELECT * FROM organizations ORDER BY created_at DESC;

-- View organization members
SELECT 
  u.email,
  o.name as organization,
  r.name as role,
  ou.status
FROM organization_users ou
JOIN "user" u ON u.user_id = ou.user_id
JOIN organizations o ON o.id = ou.organization_id
JOIN roles r ON r.id = ou.role_id
WHERE ou.status = 'active';

-- Check pending invitations
SELECT 
  it.email,
  o.name as organization,
  r.name as role,
  it.status,
  it.expires_at
FROM invitation_tokens it
JOIN organizations o ON o.id = it.organization_id
JOIN roles r ON r.id = it.role_id
WHERE it.status = 'pending';
```

---

## 🐛 Troubleshooting

### Common Issues & Fixes

#### 1. Organization Not Created on Signup

**Symptoms:** Agency users don't get organization after signup

**Solution:**
1. Check browser console for errors
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
3. Restart dev server after adding env variables
4. Check Supabase logs for errors

**SQL Check:**
```sql
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 5;
```

#### 2. RLS Infinite Recursion Error

**Error:** "infinite recursion detected in policy for relation organization_users"

**Solution:** Run `database/002_fix_rls_recursion.sql`

Or use service role key (recommended):
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 3. Team Members Not Showing Names/Emails

**Symptoms:** On team page, only see your own data, others show "No name"

**Solution:** Run `database/005_fix_user_table_rls.sql`

This updates RLS policies to allow organization members to view each other.

#### 4. Email Invitations Not Sending

**Symptoms:** Invitation created but email not received

**Checks:**
1. Verify Gmail credentials in `.env.local`
2. Ensure you're using **App Password**, not regular password
3. Check 2FA is enabled on Google account
4. Verify email service configuration:

```typescript
// Check in browser console
const response = await fetch('/api/organizations/invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    organizationId: 'org-id',
    roleId: 'role-id'
  })
});
const data = await response.json();
console.log(data);
```

#### 5. Permission Denied Errors

**Symptoms:** Database queries fail with "permission denied"

**Check RLS Policies:**
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_users', 'user');
```

**Temporary Debug (DO NOT USE IN PRODUCTION):**
```sql
-- Disable RLS for testing
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users DISABLE ROW LEVEL SECURITY;

-- Test your queries

-- RE-ENABLE IMMEDIATELY
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
```

#### 6. Pending Invites Count Always Zero

**Fixed!** The stats card now includes both:
- Pending invites from `organization_users` (invited status)
- Pending invitations from `invitation_tokens` (email invites)

No action needed if you have the latest version.

---

## 🧪 Testing

### Functional Testing Checklist

#### Organizations & Roles
- [ ] Agency signup creates organization
- [ ] User assigned as Admin role
- [ ] organization_id set in user table
- [ ] Client signup does NOT create organization
- [ ] Organization visible in database

#### Team Management
- [ ] View all team members on /dashboard/team
- [ ] Search by name, email, or role works
- [ ] Admin can invite new members
- [ ] Admin can change member roles
- [ ] Admin can remove members
- [ ] Non-admins cannot see admin actions
- [ ] Statistics show correct counts

#### Email Invitations
- [ ] Admin can send invitation email
- [ ] Invitation email received in inbox
- [ ] Email contains valid invitation link
- [ ] Clicking link shows invitation details
- [ ] User can accept invitation
- [ ] User added to organization after acceptance
- [ ] Welcome email sent after acceptance
- [ ] Expired invitations cannot be accepted

### SQL Testing Queries

```sql
-- Test 1: Check user's organizations
SELECT 
  o.name,
  r.name as role,
  ou.status
FROM organization_users ou
JOIN organizations o ON o.id = ou.organization_id
JOIN roles r ON r.id = ou.role_id
WHERE ou.user_id = 'your-user-id';

-- Test 2: Check if user is admin
SELECT is_organization_admin('user-id'::uuid, 'org-id'::uuid);

-- Test 3: View all pending invitations
SELECT 
  email,
  status,
  expires_at,
  created_at
FROM invitation_tokens
WHERE status = 'pending'
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- Test 4: Check team member visibility
SELECT 
  u.email,
  u.full_name
FROM "user" u
WHERE u.user_id IN (
  SELECT ou.user_id
  FROM organization_users ou
  WHERE ou.organization_id = 'your-org-id'
    AND ou.status = 'active'
);
```

### API Testing

```javascript
// Test in browser console after login

// 1. Get organizations
const orgs = await fetch('/api/organizations');
console.log(await orgs.json());

// 2. Create organization
const create = await fetch('/api/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Agency',
    description: 'Testing'
  })
});
console.log(await create.json());

// 3. Send invitation
const invite = await fetch('/api/organizations/invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    organizationId: 'org-id',
    roleId: 'role-id'
  })
});
console.log(await invite.json());
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy

### Environment Variables for Production

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# Gmail SMTP
GMAIL_USER=your-production-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
EMAIL_FROM_NAME=GeoRepute.ai

# App URL (IMPORTANT!)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Pre-Deployment Checklist

- [ ] All migrations run successfully
- [ ] Environment variables configured
- [ ] Gmail SMTP tested and working
- [ ] Invitation emails working
- [ ] Team management tested
- [ ] RLS policies enabled
- [ ] Service role key secured (never expose to client)
- [ ] App URL set to production domain
- [ ] Test signup flow end-to-end
- [ ] Test invitation flow end-to-end

### Build Commands

```bash
# Build for production
npm run build

# Start production server (local testing)
npm start

# Lint code
npm run lint
```

---

## 📚 API Documentation

### Organizations

#### POST /api/organizations
Create a new organization

**Request:**
```json
{
  "name": "My Agency",
  "description": "Optional",
  "website": "https://example.com",
  "logo_url": "https://example.com/logo.png"
}
```

**Response:**
```json
{
  "success": true,
  "organization": { "id": "...", "name": "..." },
  "role": "Admin",
  "message": "Organization created successfully"
}
```

#### GET /api/organizations
Get user's organizations

**Response:**
```json
{
  "success": true,
  "organizations": [
    {
      "organization": { "id": "...", "name": "..." },
      "role": { "name": "Admin", "permissions": {...} },
      "status": "active"
    }
  ]
}
```

### Invitations

#### POST /api/organizations/invite
Send invitation email

**Request:**
```json
{
  "email": "user@example.com",
  "organizationId": "org-uuid",
  "roleId": "role-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "...",
    "email": "...",
    "expires_at": "...",
    "email_sent": true
  }
}
```

#### GET /api/organizations/invite?token=xxx
Validate invitation token

**Response:**
```json
{
  "success": true,
  "invitation": {
    "email": "...",
    "organization": { "name": "..." },
    "role": { "name": "Manager" }
  }
}
```

#### POST /api/organizations/invite/accept
Accept invitation

**Request:**
```json
{
  "token": "invitation-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "organization": {...},
  "role": {...}
}
```

#### POST /api/organizations/invite/resend
Resend expired invitation

**Request:**
```json
{
  "invitationId": "invitation-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": "...",
    "email_sent": true,
    "expires_at": "..."
  }
}
```

---

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6)
- **Secondary**: Teal (#14B8A6)
- **Accent**: Purple (#8B5CF6)
- **Success**: Green
- **Warning**: Yellow
- **Error**: Red

### Typography
- **Font**: Inter (system font stack)
- **Headings**: Bold, solid colors
- **Body**: Regular weight, comfortable line-height

### UI Philosophy
- Dashboard-first design
- Role-based dashboards (Admin/Agency/Client)
- Smooth interactions with Framer Motion
- Clean, focused workspace
- Mobile-responsive

---

## 🤝 Contributing

Contributions welcome! Areas for contribution:
- Additional AI platforms for visibility tracking
- New report templates
- UI/UX improvements
- Documentation enhancements

---

## 📍 Dashboard Routes

### Dashboard (Role-Based Access)
- **Overview** (`/dashboard`): Stats, charts, keyword performance
- **Live View** (`/dashboard/live-view`): Real-time AI/Google search split view
- **Content Generator** (`/dashboard/content-generator`): AI humanized content (95%+ human score)
- **Keyword Forecast** (`/dashboard/keyword-forecast`): AI-powered keyword analysis
- **Action Plans** (`/dashboard/action-plans`): AI-generated strategic plans
- **Keywords** (`/dashboard/keywords`): Keyword tracking and management
- **Content** (`/dashboard/content`): Content orchestration workflow
- **Rankings** (`/dashboard/rankings`): SEO ranking trends
- **AI Visibility** (`/dashboard/ai-visibility`): AI platform tracking
- **Reputation** (`/dashboard/reputation`): Reputation monitoring
- **Leads** (`/dashboard/leads`): Lead capture and management
- **AdSync** (`/dashboard/adsync`): Google Ads integration
- **Analytics** (`/dashboard/analytics`): Comprehensive analytics
- **Reports** (`/dashboard/reports`): 50+ BI report library
- **Video Reports** (`/dashboard/video-reports`): Auto-generated video reports
- **Quote Builder** (`/dashboard/quote-builder`): Agency quote generation
- **Team** (`/dashboard/team`): Team member management
- **Settings** (`/dashboard/settings`): User preferences

---

## 🔐 Authentication Details

### Authentication Methods
- **Email/Password**: Traditional signup/login
- **Google OAuth**: One-click Google SSO
- **Session Management**: Supabase Auth with RLS

### User Roles
- **Admin**: Full system access, user management
- **Agency**: Multi-client management, white-label tools
- **Client**: Individual dashboard access

### Role Selection Flow
1. User signs up → 2. Selects role (Client/Agency) → 3. Onboarding → 4. Dashboard

---

## 🤖 AI/GEO Core Details

### Powered by OpenAI GPT-4 Turbo

**Core Features:**
1. **Keyword Forecasting**: AI-powered keyword difficulty, traffic, and ROI predictions
2. **Content Generation**: Humanized content that bypasses AI detection (95%+ human score)
3. **Action Plans**: Strategic AI-generated optimization plans
4. **AI Visibility Tracking**: Monitor AI platform mentions
5. **Self-Learning Loop**: Continuous improvement from performance data

**AI Humanization Techniques:**
- Natural imperfections (contractions, filler words, casual language)
- Sentence variety (short, long, incomplete)
- Personal touch (experiences, emotions, humor)
- Strategic emojis (😂, 😅, 🤷‍♂️, 💡, 🔥)
- Grammar variations (slight imperfections)
- Platform-specific authenticity (Reddit, Quora, Medium styles)
- Avoids AI patterns (no robotic transitions, perfect structure)

**Bypasses AI Detection Tools:**
- ✅ Turnitin AI
- ✅ GPTZero
- ✅ Copyleaks
- ✅ Originality.ai

---

## 📊 Key Components

### Dashboard Features
- Real-time visibility metrics
- Multi-platform tracking
- AI-powered forecasts
- Interactive charts (Recharts)
- Collapsible sidebar with role badges

### Content Orchestrator
- Multi-stage approval workflow
- Platform-specific optimization
- **Scheduled publishing**: Automatically publishes content at scheduled time (works locally + production)
- Performance tracking
- AI humanization engine

### Reports & Analytics
- 50+ pre-built reports
- PDF/CSV/Google Sheets export
- Email scheduling
- White-label branding
- Auto-generated video reports

---

## 📝 License

MIT License - see LICENSE file for details.

---

## 📧 Support & Resources

- **Documentation**: See `/database` folder for schema details
- **AI System**: Check `lib/ai/geoCore.ts` for AI implementation
- **Issue Tracker**: GitHub Issues

---

## 🎯 Roadmap

### ✅ Phase 1: Core Features (Complete)
- [x] Authentication & roles
- [x] Dashboard UI
- [x] AI/GEO Core integration
- [x] Content generation with humanization
- [x] Keyword forecasting
- [x] Action plans
- [x] Organizations & Roles system
- [x] Team management
- [x] Email invitations

### 🚧 Phase 2: Advanced Features (In Progress)
- [ ] Video report generation (FFmpeg + ElevenLabs)
- [ ] Rank tracking crawler
- [ ] Multi-platform publishing
- [ ] Advanced analytics dashboard

### 📅 Phase 3: Scaling (Planned)
- [ ] White-label customization UI
- [ ] API for third-party integrations
- [ ] Mobile app (React Native)
- [ ] Enterprise features

---

## 🏗️ Architecture Overview

```
User Signup
    ↓
Role Selection (Client/Agency)
    ↓
    ├─ Client: No organization
    └─ Agency: Organization auto-created
    ↓
Onboarding (4 steps)
    ↓
Dashboard (Role-based)
    ↓
Features:
├─ Content Generation (AI humanization)
├─ Keyword Forecasting (AI predictions)
├─ Action Plans (Strategic roadmaps)
├─ Team Management (Invite, roles)
├─ Reports (50+ BI reports)
└─ Live View (Split-screen AI/Google)
```

---

## 📊 Database Schema Quick Reference

```
user
├─ user_id (PK)
├─ email
├─ full_name
├─ role (client/agency)
└─ organization_id (FK → organizations.id)

organizations
├─ id (PK)
├─ name
├─ description
├─ website
├─ logo_url
└─ timestamps

roles
├─ id (PK)
├─ name (Admin/Manager/Editor/Viewer)
├─ description
└─ permissions (JSONB)

organization_users (Junction)
├─ id (PK)
├─ user_id (FK)
├─ organization_id (FK)
├─ role_id (FK)
├─ status
└─ timestamps

invitation_tokens
├─ id (PK)
├─ organization_id (FK)
├─ email
├─ role_id (FK)
├─ token (UNIQUE)
├─ expires_at
├─ status
└─ timestamps
```

---

**Built with ❤️ using Next.js 14, OpenAI GPT-4 Turbo, and Supabase**

**GeoRepute.ai** - The future of AI-driven visibility optimization

**Version:** 1.0  
**Last Updated:** November 23, 2025  
**Status:** Production Ready ✅
