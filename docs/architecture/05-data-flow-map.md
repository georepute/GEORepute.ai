# 05 — Data Flow Map

> What data is collected, where it moves, and why  
> Last updated: March 7, 2026

---

## Data Flow Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DATA SOURCES                                        │
│                                                                              │
│  User Input ─── Google APIs ─── AI Platforms ─── Social APIs ─── Crawlers   │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                                        │
│                                                                              │
│  Next.js API Routes ─── Supabase Edge Functions ─── GEO Core AI Engine      │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        STORAGE LAYER                                         │
│                                                                              │
│  PostgreSQL (40+ tables) ─── Supabase Storage (8 buckets) ─── In-memory     │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        OUTPUT LAYER                                          │
│                                                                              │
│  Dashboard UI ─── PDF/PPT ─── Email ─── Public Links ─── Video Reports      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow 1: User Identity & Organization Data

```
User signs up (email/password or Google OAuth)
    │
    ▼
Supabase Auth creates record ──▶ auth.users
    │
    ▼
Auth callback creates profile ──▶ user (name, email, avatar, role)
    │
    ▼
Role selection (agency only):
    ├── Creates organization ──▶ organizations (name, industry, slug)
    ├── Creates role ──▶ roles (role_name)
    └── Links user to org ──▶ organization_users (user_id, org_id, role_id)
    │
    ▼
Team invitations:
    ├── Invite sent ──▶ organization_users (status: 'invited', invitation_token)
    └── Invite accepted ──▶ organization_users (status: 'active')
```

**Why:** Establishes identity, authorization context, and data isolation boundaries. All subsequent data is scoped to the user's organization.

---

## Data Flow 2: Domain & Website Intelligence

```
User enters domain in onboarding
    │
    ▼
domain saved ──▶ domains (domain_name, org_id, gsc_property)
    │
    ▼
Domain crawler triggered:
    │
    ├── Playwright navigates to domain
    ├── Cheerio parses HTML
    │
    ├── Extracted data:
    │   ├── Page structure (URLs, hierarchy)
    │   ├── Meta tags (title, description, keywords)
    │   ├── Content text
    │   ├── Internal/external links
    │   ├── Schema markup
    │   └── Technical SEO signals
    │
    ▼
Domain intelligence Edge Function:
    │
    ├── AI analyzes crawled content (OpenAI)
    ├── Competitor mapping (generate-competitive-intelligence)
    ├── AI visibility scan (domain-visibility)
    │
    ▼
Results stored ──▶ domain_intelligence_jobs
    │                (status, crawl_data, seo_analysis, keywords,
    │                 competitors, ai_visibility, recommendations)
    │
    ▼
Used by: Content Generation, Quote Builder, Reports, Action Plans
```

**Why:** Provides the foundational data about what the brand's website contains, its SEO health, and competitive landscape. This data feeds into almost every other module.

---

## Data Flow 3: Google Search Console Data

```
User connects GSC via OAuth
    │
    ▼
OAuth tokens stored ──▶ platform_integrations
    │                     (platform: 'google_search_console',
    │                      access_token, refresh_token, metadata)
    │
    ▼
Verified domains stored ──▶ domains (gsc_verified: true, gsc_property)
    │
    ▼
Analytics sync triggered (manual or cron every 6h):
    │
    ├── Fetch last 90 days from GSC API
    │
    ├── Summary metrics ──▶ gsc_analytics
    │   (date, clicks, impressions, ctr, position, domain_id)
    │
    ├── Per-query data ──▶ gsc_queries
    │   (query, clicks, impressions, ctr, position, domain_id, date)
    │
    ├── Per-page data ──▶ gsc_pages
    │   (page_url, clicks, impressions, ctr, position, domain_id, date)
    │
    └── Keyword extraction ──▶ gsc_keywords
        (keyword, search_volume, position, domain_id)
    │
    ▼
Used by: Reports (AI vs Google Gap, Market Share, Blind Spots),
         Brand Analysis, Quote Builder (DCS Layer 2),
         Action Plans, Content Generation
```

**Why:** GSC data is the ground truth for how the brand performs in Google search. Comparing this with AI visibility reveals gaps and opportunities.

---

## Data Flow 4: AI Brand Analysis

```
User starts brand analysis:
    ├── Select project (domain, competitors, keywords)
    ├── Select AI platforms (ChatGPT, Claude, Gemini, Perplexity, Grok)
    ├── Select prompts/keywords to test
    │
    ▼
brand-analysis Edge Function:
    │
    ├── For each prompt × platform combination:
    │   │
    │   ├── Send query: "What is the best {keyword} in {region}?"
    │   ├── Receive AI response
    │   │
    │   ├── Analyze response:
    │   │   ├── Brand mentioned? (yes/no)
    │   │   ├── Position in response (1st, 2nd, 3rd, etc.)
    │   │   ├── Sentiment (positive/neutral/negative)
    │   │   ├── Context (recommendation, comparison, mention)
    │   │   ├── Competitors mentioned
    │   │   └── Visibility score (0-100)
    │   │
    │   └── Store ──▶ ai_platform_responses
    │                  (session_id, platform, query, response,
    │                   brand_mentioned, position, sentiment,
    │                   visibility_score, competitors_found,
    │                   gap_suggestion)
    │
    ├── Competitor analysis engine:
    │   ├── Rank all competitors across responses
    │   ├── Compute share of voice
    │   ├── Identify competitive gaps
    │   └── Store ──▶ brand_analysis_sessions
    │                  (competitor_rankings, market_positioning,
    │                   share_of_voice, competitive_gaps)
    │
    └── Website analysis (optional):
        └── Store ──▶ brand_analysis_website_analysis
    │
    ▼
Used by: Dashboard (visibility gauge, top prompts),
         Reports (all types), Quote Builder (DCS Layer 1),
         Action Plans, Learning Loop
```

**Why:** This is the core value proposition — measuring how visible a brand is when people ask AI assistants for recommendations. This data drives every strategic decision in the platform.

---

## Data Flow 5: Content Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CONTENT LIFECYCLE                                    │
│                                                                         │
│  Generate ──▶ Store ──▶ Review ──▶ Publish ──▶ Track ──▶ Learn         │
└─────────────────────────────────────────────────────────────────────────┘

GENERATE:
    User triggers content generation
        │
        ├── Input: keyword, platform, brand voice, learning rules
        ├── AI generates content (geoCore.generateStrategicContent)
        ├── AI detection check (detect-ai Edge Fn)
        ├── Humanization if needed (make-it-human Edge Fn)
        │
        ▼
    Store ──▶ content_strategy
              (title, body, platform, keyword, status: 'draft',
               ai_detection_score, humanized: bool)

REVIEW:
    User edits content in dashboard
        │
        ▼
    Update ──▶ content_strategy (status: 'approved')

PUBLISH:
    User clicks "Publish" or sets schedule_date
        │
        ├── Immediate: orchestrator API publishes to platform
        │   └── Store ──▶ published_content
        │                  (content_id, platform, external_url,
        │                   external_id, published_at)
        │
        └── Scheduled: pg_cron checks every 5 min
            └── Same flow when schedule_date <= now

TRACK:
    auto-track-performance (daily 9 AM UTC cron)
        │
        ├── For each published content:
        │   ├── Fetch platform metrics (likes, shares, comments, views)
        │   └── Store ──▶ performance_snapshots
        │                  (content_id, platform, metrics, date)
        │
        └── Update ──▶ published_content (latest_metrics)

LEARN:
    When metrics change significantly:
        │
        ├── autoTrigger.ts detects change
        ├── AI analyzes what worked/failed
        ├── Store insight ──▶ geo_learning_data
        │                     (content_id, keyword, action, outcome,
        │                      success_score, insights)
        │
        └── If success > threshold:
            └── Create rule ──▶ learning_rules
                                (rule_type, conditions, actions,
                                 success_count, failure_count)
```

**Why:** Content is the primary lever for improving AI visibility. This lifecycle ensures content is optimized, tracked, and continuously improved through the learning loop.

---

## Data Flow 6: Reports Generation

```
User requests a report
    │
    ▼
API aggregates data from multiple sources:
    │
    ├── ai_platform_responses (AI visibility data)
    ├── gsc_queries / gsc_pages (Google search data)
    ├── brand_analysis_sessions (competitor data)
    ├── domain_intelligence_jobs (website data)
    ├── published_content (content data)
    ├── performance_snapshots (engagement data)
    │
    ▼
AI analyzes aggregated data (OpenAI/Claude):
    ├── Identifies patterns
    ├── Finds gaps
    ├── Generates recommendations
    │
    ▼
Report stored ──▶ report-type-specific table
    │               (blind_spot_reports, ai_google_gap_reports,
    │                market_share_reports, opportunity_blind_spots_reports)
    │
    ├── Also stored ──▶ reports (generic table for sharing)
    │                    (type, data, share_token, view_count, org_id)
    │
    ▼
Output options:
    ├── Dashboard visualization (charts, tables)
    ├── PDF export ──▶ Generated client-side (jspdf + html2canvas)
    ├── PPT export ──▶ Generated client-side (pptxgenjs)
    ├── Email ──▶ Sent via Gmail SMTP (Nodemailer)
    ├── Public link ──▶ /public/report/[shareToken]
    └── Video ──▶ See Data Flow 7
```

**Why:** Reports turn raw data into strategic intelligence. They're the primary deliverable for agencies to show clients.

---

## Data Flow 7: Video Reports

```
User clicks "Generate Video Report"
    │
    ▼
API reads report data from respective table
    │
    ▼
Generate text prompts from report data
    (narration scripts based on findings)
    │
    ├── Part 1 prompt ──▶ xAI Aurora API (POST /videos/generations)
    ├── Part 2 prompt ──▶ xAI Aurora API (parallel)
    │
    ▼
Poll for completion:
    ├── GET /videos/{id} every few seconds
    ├── Status: queued → processing → completed
    │
    ▼
Download video files (URLs from xAI)
    │
    ├── For multi-part (blind spots):
    │   └── Merge with ffmpeg ──▶ Single video file
    │
    ▼
Upload to Supabase Storage ──▶ Bucket (per report type)
    │
    ▼
Store reference ──▶ report_videos
    │                 (report_type, report_id, video_url,
    │                  storage_path, duration, org_id)
    │
    ▼
Available in dashboard for playback/download/sharing
```

---

## Data Flow 8: Quote Builder (DCS)

```
Agency user enters client domain
    │
    ▼
DCS Engine reads from 6 data layers:
    │
    ├── Layer 1 (AI Search) ──── ai_platform_responses
    │   └── Brand mention rate across AI platforms
    │
    ├── Layer 2 (Organic) ────── gsc_analytics
    │   └── Clicks, impressions, CTR, position
    │
    ├── Layer 3 (Social) ─────── platform_integrations
    │   └── Connected platforms count, follower metadata
    │
    ├── Layer 4 (Reputation) ──── google_maps_reviews
    │   └── Rating, review count, review content
    │
    ├── Layer 5 (Website) ────── domain_intelligence_jobs
    │   └── Content depth, pages, keywords, technical SEO
    │
    └── Layer 6 (Risk) ─────── blind_spot_reports, gap_reports
        └── Missing keywords, competitive gaps
    │
    ▼
DCS Score (0-100) + Industry Benchmark
    │
    ▼
Threat Engine: reads blind_spot, gap, market_share reports
    │
    ▼
Recommendation Engine: selects strategic mode
    │ (Stability / Growth / Strategic Control / Dominance)
    │
    ▼
Quote stored ──▶ quotes (client, domain, dcs_data, pricing,
    │                      recommendation, status)
    │
    ▼
Activity logged ──▶ quote_activity_log (event, timestamp, details)
    │
    ▼
Output:
    ├── PDF proposal (generateProposalPDF)
    ├── Email (send-proposal-email)
    └── Public link (/proposals/[token])
```

---

## Data Flow 9: Global Visibility Matrix

```
User selects domain + clicks "Calculate"
    │
    ▼
For each country (30-50):
    ├── For each keyword:
    │   ├── AI query with geo context: "Best {keyword} in {country}"
    │   ├── Check if brand is mentioned
    │   └── Score visibility (0-100)
    │
    ├── Progress updated in memory (polled by frontend)
    │
    ▼
Country-level scores aggregated
    │
    ▼
Store ──▶ global_visibility_matrix
           (domain_id, country, keywords, ai_scores,
            google_scores, overall_score, org_id)
    │
    ▼
Display: Country heatmap, comparison tables, charts
```

---

## Data Flow Summary: What Data Goes Where

| Data Category | Source | Stored In | Used By |
|---------------|--------|-----------|---------|
| User identity | Signup form, OAuth | `auth.users`, `user` | Auth, all modules |
| Organization | Role selection | `organizations`, `organization_users` | Data scoping |
| Domain info | Onboarding, GSC | `domains` | Everything |
| Website crawl | Playwright, Cheerio | `domain_intelligence_jobs` | DCS, Content, Reports |
| GSC analytics | Google API (cron) | `gsc_analytics`, `gsc_queries`, `gsc_pages` | Reports, DCS, Analysis |
| AI responses | 5+ LLMs | `ai_platform_responses` | Reports, DCS, Dashboard |
| Analysis sessions | Brand analysis | `brand_analysis_sessions` | Reports, Competitor view |
| Content | AI generation | `content_strategy` | Publishing, Tracking |
| Published content | Platform APIs | `published_content` | Performance tracking |
| Performance | Platform APIs (cron) | `performance_snapshots` | Learning, Reports |
| Learning data | AI analysis | `geo_learning_data`, `learning_rules` | Content generation |
| Reports | Aggregated analysis | Type-specific tables + `reports` | Dashboard, Export, Email |
| Videos | xAI Aurora | Supabase Storage, `report_videos` | Dashboard, Sharing |
| Reviews | Google Maps API | `google_maps_reviews` | DCS, Reputation |
| Quotes | Quote Builder | `quotes`, `quote_activity_log` | Proposals, Email |
| Payments | Stripe | `seat_payments` | Organizations |
| OAuth tokens | Platform OAuth | `platform_integrations` | All integrations |
| Keywords | GSC, AI, user input | `keyword`, `keyword_forecast`, `keyword_plans` | Forecasts, Content |

---

