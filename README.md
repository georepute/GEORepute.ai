# GeoRepute.ai - AI-Driven Generative Optimization System

Next-generation, AI-driven visibility control across traditional SEO and emerging AI search ecosystems.

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

### Deployment
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions (optional)

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Setup Database
- Create a Supabase project at https://supabase.com
- Run SQL migrations from `/database` folder in order:
  1. `migration_update_roles.sql`
  2. `geo_core_schema.sql`

### 4. Run Development Server
```bash
npm run dev
```

### 5. Open Application
Visit [http://localhost:3000](http://localhost:3000) and create an account!

**First Time Setup:**
1. Sign up → 2. Choose role (Client/Agency) → 3. Complete onboarding → 4. Start using the dashboard!

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
│   │   ├── page.tsx             # Onboarding orchestrator
│   │   └── steps/               # Onboarding steps
│   ├── dashboard/               # Dashboard app
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   ├── page.tsx             # Dashboard overview
│   │   ├── live-view/           # Live AI/Google search view
│   │   ├── content-generator/   # AI content generation (with humanization)
│   │   ├── keyword-forecast/    # Keyword forecasting with AI
│   │   ├── action-plans/        # AI-generated action plans
│   │   ├── keywords/            # Keyword tracking
│   │   ├── content/             # Content orchestration
│   │   ├── rankings/            # Rankings tracking
│   │   ├── ai-visibility/       # AI platform visibility
│   │   ├── reputation/          # Reputation monitoring
│   │   ├── leads/               # Lead capture
│   │   ├── adsync/              # Google Ads sync
│   │   ├── analytics/           # Analytics dashboard
│   │   ├── reports/             # 50+ BI reports
│   │   ├── video-reports/       # Auto-generated video reports
│   │   ├── quote-builder/       # Agency quote builder
│   │   ├── team/                # Team management
│   │   └── settings/            # User settings
│   ├── api/                     # API routes
│   │   ├── user/profile/        # User profile API
│   │   └── geo-core/            # GEO Core AI APIs
│   │       ├── forecast/        # Keyword forecasting
│   │       ├── content-generate/ # Content generation
│   │       ├── action-plan/     # Action plans
│   │       ├── ai-visibility-check/ # AI visibility
│   │       └── learning/        # Self-learning data
│   ├── auth/callback/           # OAuth callback
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
│
├── components/                  # Reusable UI components
│   ├── Navbar.tsx               # Main navigation
│   ├── Footer.tsx               # Footer
│   ├── Button.tsx               # Custom button with animations
│   ├── Card.tsx                 # Card component
│   ├── Skeleton.tsx             # Loading skeleton
│   └── DemoMode/                # Demo mode components
│       ├── DemoModeBanner.tsx
│       └── DemoModeToggle.tsx
│
├── lib/                         # Utilities & services
│   ├── utils.ts                 # Helper functions
│   ├── supabase/                # Supabase client
│   │   └── client.ts
│   ├── ai/                      # AI services
│   │   └── geoCore.ts           # GEO Core AI engine (GPT-4 Turbo)
│   ├── permissions/             # Role-based access control
│   │   ├── roles.ts             # Role definitions
│   │   └── permissions.ts       # Permission logic
│   └── demo/                    # Demo mode data
│       └── demoData.ts
│
├── hooks/                       # Custom React hooks
│   ├── usePermissions.tsx       # Role & permissions hook
│   ├── useDemoMode.tsx          # Demo mode state
│   └── useOnboarding.tsx        # Onboarding state
│
├── database/                    # Database schemas & migrations
│   └── (SQL migration files)
│
├── public/                      # Static assets
│   ├── logo.png                 # Brand logo
│   └── favicon.png              # Favicon
│
├── .env.local                   # Environment variables (not in repo)
├── package.json                 # Dependencies
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

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
- **Headings**: Bold, solid colors for clarity
- **Body**: Regular weight, comfortable line-height

### UI Philosophy
Inspired by Monday.com:
- **Dashboard-First**: Role-based dashboards (Admin/Agency/Client)
- **True Modularity**: Access only selected modules based on permissions
- **Smooth Interactions**: Soft colors, subtle animations, no visual overload
- **Smart Demo Mode**: Interactive demo with sample data
- **Guided Onboarding**: Intuitive onboarding customized per user role

## 🌐 Pages

### Marketing Website
- **Home** (`/`): Hero, features, how it works, CTA
- **About** (`/about`): Mission, vision, values, team
- **Our Systems** (`/systems`): Detailed feature breakdown
- **Pricing** (`/pricing`): Client & Agency plans with yearly discounts
- **Contact** (`/contact`): Contact form and information

### Authentication
- **Login** (`/login`): Email/password + Google OAuth
- **Signup** (`/signup`): User registration
- **Role Selection** (`/role-selection`): Choose Client or Agency role
- **Onboarding** (`/onboarding`): 4-step guided setup

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

## 🔐 Authentication & Roles

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

## 🤖 AI/GEO Core System

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

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

```bash
npm run build
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
# In Supabase SQL Editor, run files in order:
1. database/migration_update_roles.sql
2. database/geo_core_schema.sql
```

## 🔧 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🧪 Testing

### Test AI Features
1. **Content Generation**: Navigate to `/dashboard/content-generator`
   - Add keywords (e.g., "youtube seo", "video optimization")
   - Run diagnostic scan
   - Generate humanized content
   - Check human score (should be 95%+)

2. **Keyword Forecast**: Navigate to `/dashboard/keyword-forecast`
   - Add keywords
   - Generate forecasts
   - View AI analysis (difficulty, traffic, trend)

3. **Action Plans**: Navigate to `/dashboard/action-plans`
   - Enter project details
   - Generate AI strategic plan
   - Review recommendations

## 🐛 Troubleshooting

### Common Issues

**API Errors:**
- Ensure `OPENAI_API_KEY` is set in `.env.local`
- Restart dev server after changing environment variables

**Database Errors:**
- Check RLS policies are created correctly
- Verify user role is set after signup
- Use Supabase SQL Editor to query data directly

**Build Errors:**
- Delete `.next` folder and rebuild: `rm -rf .next && npm run dev`
- Clear node_modules if needed: `rm -rf node_modules && npm install`

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Areas for contribution:
- Additional AI platforms for visibility tracking
- New report templates
- UI/UX improvements
- Documentation enhancements

## 📧 Support & Resources

- **Documentation**: See `/database` folder for schema details
- **AI System**: Check `lib/ai/geoCore.ts` for AI implementation
- **Issue Tracker**: GitHub Issues
- **Community**: Discord (coming soon)

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Authentication & roles
- [x] Dashboard UI
- [x] AI/GEO Core integration
- [x] Content generation with humanization
- [x] Keyword forecasting
- [x] Action plans

### Phase 2: Advanced Features (In Progress)
- [ ] Video report generation (FFmpeg + ElevenLabs)
- [ ] Rank tracking crawler
- [ ] Multi-platform publishing
- [ ] Advanced analytics dashboard

### Phase 3: Scaling (Planned)
- [ ] White-label customization
- [ ] API for third-party integrations
- [ ] Mobile app (React Native)
- [ ] Enterprise features

---

Built with ❤️ using Next.js 14, OpenAI GPT-4 Turbo, and Supabase  
**GeoRepute.ai** - The future of AI-driven visibility optimization
