# 03 — System Modules

> Every module in GEORepute.ai: what it does, where it lives, how it connects  
> Last updated: March 7, 2026

---

## Module Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GEORepute.ai MODULES                              │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │   AUTH   │ │ONBOARDING│ │ AI ENGINE │ │ CONTENT  │ │   REPORTS      │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ └──────┬─────────┘  │
│       │             │             │             │              │            │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴──────┐ ┌───┴──────┐ ┌─────┴────────┐  │
│  │  ROLES & │ │ DOMAIN   │ │ LEARNING  │ │PUBLISHING│ │ VIDEO        │  │
│  │  PERMS   │ │ INTEL    │ │   LOOP    │ │  ENGINE  │ │ REPORTS      │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘ └──────────────┘  │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │   GSC    │ │ KEYWORD  │ │   QUOTE   │ │  TEAM &  │ │  INTEGRATIONS │  │
│  │ANALYTICS │ │ FORECAST │ │  BUILDER  │ │   ORGS   │ │   HUB         │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘ └────────────────┘  │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ GLOBAL   │ │  BRAND   │ │ DASHBOARD │ │ STRIPE   │ │  SEO & SCHEMA │  │
│  │VISIBILITY│ │  VOICE   │ │  SUMMARY  │ │ PAYMENTS │ │   ENGINE      │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Details

### 1. Authentication & Session Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `middleware.ts`, `app/auth/callback/`, `app/api/auth/*/callback/`, `app/login/`, `app/signup/` |
| **Purpose** | User registration, login, session management, OAuth callbacks |
| **Technology** | Supabase Auth (email/password + Google OAuth + social SSO) |
| **Tables** | `auth.users`, `user` |
| **Connects to** | Roles & Permissions, Onboarding, all dashboard modules |

**What it does:**
- Handles email/password registration and login
- Processes OAuth callbacks for Google, LinkedIn, X, Reddit, Facebook, GitHub, WordPress, Shopify, Instagram
- Maintains session via Supabase SSR cookies
- Middleware blocks unauthenticated access to `/dashboard/*`
- Redirects authenticated users from `/` to `/dashboard`

---

### 2. Roles & Permissions Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/permissions/roles.ts`, `lib/permissions/permissions.ts`, `hooks/usePermissions.tsx` |
| **Purpose** | Role-based access control across the platform |
| **Roles** | `admin`, `agency`, `client` |
| **Tables** | `roles`, `organization_users` |
| **Connects to** | Dashboard layout (sidebar filtering), all feature pages |

**Capabilities matrix:**

| Capability | Admin | Agency | Client |
|------------|-------|--------|--------|
| View All Clients | Yes | Yes | No |
| Manage Team | Yes | Yes | No |
| Access White Label | Yes | Yes | No |
| Build Quotes | Yes | Yes | No |
| Manage Settings | Yes | Yes | Yes |
| View Reports | Yes | Yes | Yes |
| Manage Content | Yes | Yes | Yes |
| View Analytics | Yes | Yes | Yes |
| Manage Keywords | Yes | Yes | Yes |
| View AI Visibility | Yes | Yes | Yes |
| Access Video Reports | Yes | Yes | Yes |

---

### 3. Onboarding Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/onboarding/`, `app/role-selection/`, `hooks/useOnboarding.tsx` |
| **Purpose** | Guide new users through initial setup |
| **Steps** | Enter Domain → Region & Language → Connect Sources → Start Scan |
| **Tables** | `domains`, `platform_integrations`, `domain_intelligence_jobs` |
| **Connects to** | Domain Intelligence, GSC Integration, Dashboard |

---

### 4. AI Engine Module (GEO Core)

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/ai/geoCore.ts`, `app/api/geo-core/*`, `supabase/functions/brand-analysis/`, `supabase/functions/domain-visibility/` |
| **Purpose** | Central AI brain — content generation, analysis, scoring, planning |
| **Providers** | OpenAI GPT-4, Anthropic Claude, Google Gemini, Perplexity, Grok, Groq |
| **Tables** | `brand_analysis_sessions`, `ai_platform_responses`, `content_strategy`, `action_plan` |
| **Connects to** | Content, Reports, Learning Loop, Forecasts, Quote Builder |

**Functions:**

| Function | Purpose |
|----------|---------|
| `generateStrategicContent` | Create platform-optimized content |
| `checkAIVisibility` | Check brand visibility across AI platforms |
| `generateKeywordForecast` | Predict keyword performance |
| `generateKeywordScore` | Score keywords (0-100) |
| `generateActionPlan` | Create step-by-step action plans |
| `generateAnnualStrategicPlan` | 12-month strategic plan |
| `analyzeCompetitors` | Competitor analysis with gaps |
| `analyzeAndLearn` | Learn from performance data |
| `recordLearningData` | Store learning observations |

---

### 5. Domain Intelligence Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/geo-core/domain-crawler/`, `app/api/geo-core/domain-intelligence/`, `supabase/functions/domain-intelligence/` |
| **Purpose** | Deep analysis of a domain: crawl, extract SEO data, map competitors |
| **Technology** | Playwright (browser crawl), Cheerio (HTML parsing), OpenAI (analysis) |
| **Tables** | `domain_intelligence_jobs`, `domains` |
| **Connects to** | Onboarding, AI Engine, Quote Builder, Content Generation |

**Pipeline:** Crawl website → Parse HTML → Extract keywords → SEO analysis → Competitor mapping → AI visibility scan → Store results

---

### 6. Content Generation & Publishing Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/geo-core/content-generate/`, `app/api/geo-core/content-generate-multi/`, `app/api/geo-core/orchestrator/`, `app/dashboard/content-generator/` |
| **Purpose** | Generate AI content, review, publish to 10+ platforms |
| **Tables** | `content_strategy`, `published_content`, `brand_voice_profiles` |
| **Connects to** | AI Engine, Brand Voice, Publishing platforms, Learning Loop, Performance Tracking |

**Supported platforms for publishing:**

| Platform | Method |
|----------|--------|
| WordPress.com | OAuth API |
| WordPress Self-hosted | REST API |
| LinkedIn | OAuth + ugcPosts API |
| X (Twitter) | OAuth + Tweets API |
| Reddit | OAuth + Submit API |
| GitHub | OAuth + Discussions API |
| Medium | API Token |
| Facebook | Graph API |
| Instagram | Graph API |
| Shopify | Admin API |

---

### 7. Reports Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/reports/*`, `app/dashboard/reports/`, individual report dashboard pages |
| **Purpose** | Generate strategic BI reports from aggregated data |
| **Tables** | `reports`, `blind_spot_reports`, `ai_google_gap_reports`, `market_share_reports`, `opportunity_blind_spots_reports`, `report_videos` |
| **Connects to** | AI Engine, GSC Analytics, Brand Analysis, Video Reports |

**Report types:**

| Report | Description | Table |
|--------|-------------|-------|
| Strategic Blind Spots | Keywords where brand is invisible to AI | `blind_spot_reports` |
| AI vs Google Gap | Discrepancy between AI and Google rankings | `ai_google_gap_reports` |
| Market Share of Attention | Brand's share vs competitors across AI | `market_share_reports` |
| Opportunity Blind Spots | Missed keyword opportunities | `opportunity_blind_spots_reports` |
| AI Search Presence | Overall AI search footprint | Aggregated |
| GEO Visibility | Geographic coverage map | Aggregated |
| Global Visibility Matrix | Country-by-country AI visibility | `global_visibility_matrix` |
| Regional Strength | Compare performance across regions | Aggregated |

---

### 8. Video Reports Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/reports/*/video/`, `app/dashboard/video-reports/` |
| **Purpose** | Generate AI video summaries of reports |
| **Technology** | xAI Aurora API + ffmpeg for merging |
| **Storage** | 8 Supabase Storage buckets (one per report type) |
| **Tables** | `report_videos` |
| **Connects to** | Reports Module |

**Process:** Generate text prompts from report data → Send to xAI Aurora → Poll for completion → Download → Merge (if multi-part) → Upload to Storage → Store reference

---

### 9. GSC Analytics Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/integrations/google-search-console/*`, `app/dashboard/gsc-analytics/`, `app/api/cron/sync-gsc/` |
| **Purpose** | Connect, verify, and sync Google Search Console data |
| **Tables** | `domains`, `platform_integrations`, `gsc_analytics`, `gsc_queries`, `gsc_pages`, `gsc_keywords` |
| **Connects to** | Reports, AI Engine, Brand Analysis, Quote Builder |

**Features:** OAuth connection → Domain verification (DNS TXT) → Analytics sync (90 days) → Auto-refresh (6h cron) → Query-level and page-level data

---

### 10. Keyword Forecast Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/keyword-forecast/*`, `app/api/geo-core/forecast/`, `app/api/geo-core/keyword-score/`, `lib/google-ads/keyword-ideas.ts` |
| **Purpose** | Forecast keyword performance, generate keyword ideas |
| **Providers** | OpenAI (scoring), Google Ads API (volume/competition data) |
| **Tables** | `keyword`, `keyword_forecast`, `keyword_plans`, `ranking` |
| **Connects to** | AI Engine, GSC Analytics, Content Strategy |

---

### 11. Quote Builder Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/quote-builder/*`, `app/dashboard/quote-builder/`, `lib/quote-builder/*` |
| **Purpose** | Generate sales proposals with Digital Control Score (DCS) |
| **Components** | DCS Engine (6-layer scoring), Recommendation Engine (4 strategic modes), Threat Engine, Revenue Exposure calculator |
| **Tables** | `quotes`, `quote_activity_log` |
| **Connects to** | All data modules (aggregates scores from AI, GSC, reviews, content, integrations) |

**DCS Layers:**

| Layer | Weight | Data Source |
|-------|--------|-------------|
| AI Search Influence | 20% | `ai_platform_responses` |
| Organic & Commercial | 15% | `gsc_analytics` |
| Social Authority | 15% | `platform_integrations` |
| Reputation & Google Business | 15% | `google_maps_reviews` |
| Website & Content Depth | 15% | `domain_intelligence_jobs` |
| Risk & External Exposure | 20% | `blind_spot_reports`, gap reports |

---

### 12. Learning & Self-Improvement Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/learning/rulesEngine.ts`, `lib/learning/autoTrigger.ts`, `app/api/geo-core/learning/`, `app/api/geo-core/learning-rules/`, `app/dashboard/learning/` |
| **Purpose** | Learn from content performance; improve future output |
| **Tables** | `geo_learning_data`, `learning_rules` |
| **Connects to** | Content Generation, Performance Tracking, AI Engine |

**Loop:** Publish → Track → Detect change → Analyze (AI) → Store insight → Apply to future content

---

### 13. Global Visibility Matrix Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/global-visibility-matrix/*`, `app/dashboard/global-visibility-matrix/`, `lib/global-visibility-matrix/` |
| **Purpose** | Check brand visibility across AI platforms in 30-50 countries |
| **Tables** | `global_visibility_matrix` |
| **Connects to** | AI Engine, GSC, Reports |

---

### 14. Brand Voice Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/brand-voice/`, `app/dashboard/settings/` (Brand Voice tab) |
| **Purpose** | Define brand tone, style, and personality for content generation |
| **Tables** | `brand_voice_profiles` |
| **Connects to** | Content Generation |

---

### 15. Team & Organizations Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/organizations/*`, `app/dashboard/team/`, `app/invite/` |
| **Purpose** | Multi-org support, team invitations, seat management |
| **Tables** | `organizations`, `organization_users`, `roles` |
| **Connects to** | Auth, Roles, Stripe (seat payments) |

---

### 16. Stripe Payments Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/stripe/*` |
| **Purpose** | Seat purchases, checkout, webhook processing |
| **Tables** | `seat_payments`, `organizations` |
| **Connects to** | Team & Organizations |

---

### 17. Integrations Hub Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/integrations/*`, `app/dashboard/settings/` (Integrations tab), `lib/integrations/*` |
| **Purpose** | Central OAuth and API management for all external platforms |
| **Tables** | `platform_integrations` |
| **Connects to** | Content Publishing, Performance Tracking, GSC Analytics, Google Maps |

**Supported integrations:** Google Search Console, Google Analytics, Google Business Profile, Google Maps, LinkedIn, X, Reddit, Facebook, Instagram, GitHub, Medium, Quora, WordPress.com, WordPress Self-hosted, Shopify

---

### 18. SEO & Schema Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/seo/schemaGenerator.ts`, `lib/seo/structuredContent.ts`, `lib/seo/metaTags.ts`, `app/api/seo/schema/` |
| **Purpose** | Generate structured data (JSON-LD), meta tags, SEO-optimized content |
| **Connects to** | Content Generation |

---

### 19. Dashboard Summary Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `app/api/dashboard/summary/`, `app/api/dashboard/prompts/`, `app/dashboard/page.tsx` |
| **Purpose** | Aggregate all key metrics for the main dashboard view |
| **Tables** | Reads from 15+ tables |
| **Connects to** | Every data-producing module |

---

### 20. Email Module

| Attribute | Detail |
|-----------|--------|
| **Location** | `lib/email.ts`, `app/api/reports/send-email/`, `app/api/quote-builder/send-proposal-email/`, `app/api/organizations/invite/resend/` |
| **Purpose** | Send reports, proposals, and invitations via email |
| **Technology** | Nodemailer + Gmail SMTP |
| **Connects to** | Reports, Quote Builder, Team |

---

## Module Dependency Graph

```
                    ┌──────────────┐
                    │     AUTH     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌─────────┐  ┌──────────┐  ┌─────────┐
       │  ROLES  │  │ONBOARDING│  │  TEAM   │
       └────┬────┘  └────┬─────┘  └────┬────┘
            │             │             │
            ▼             ▼             │
       ┌─────────────────────────┐      │
       │      DASHBOARD          │◀─────┘
       └──────────┬──────────────┘
                  │
    ┌─────────────┼─────────────────────────────┐
    ▼             ▼             ▼                ▼
┌────────┐  ┌─────────┐  ┌──────────┐    ┌──────────┐
│AI ENGINE│  │  GSC    │  │INTEGRATIONS│   │ STRIPE   │
└───┬────┘  └────┬────┘  └─────┬─────┘    └──────────┘
    │             │             │
    ├─────────────┼─────────────┤
    ▼             ▼             ▼
┌────────┐  ┌─────────┐  ┌──────────┐
│CONTENT │  │KEYWORDS │  │ DOMAIN   │
│  GEN   │  │FORECAST │  │  INTEL   │
└───┬────┘  └─────────┘  └──────────┘
    │
    ├────────────────────────────────┐
    ▼                                ▼
┌────────┐                    ┌──────────┐
│PUBLISH │                    │ LEARNING │
│ ENGINE │                    │   LOOP   │
└───┬────┘                    └──────────┘
    │
    ▼
┌────────────┐    ┌───────────┐    ┌────────────┐
│ PERFORMANCE│───▶│  REPORTS  │───▶│   VIDEO    │
│  TRACKING  │    │           │    │  REPORTS   │
└────────────┘    └─────┬─────┘    └────────────┘
                        │
                        ▼
                  ┌───────────┐
                  │   QUOTE   │
                  │  BUILDER  │
                  └───────────┘
```

---

