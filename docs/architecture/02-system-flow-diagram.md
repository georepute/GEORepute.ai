# 02 — System Flow Diagram

> Complete end-to-end workflow: from user action to final output  
> Last updated: March 7, 2026

---

## Master Flow: User Journey End-to-End

```
┌──────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐
│  SIGNUP  │───▶│  ROLE    │───▶│ ONBOARDING│───▶│ DASHBOARD│───▶│  ACTIONS  │
│  /LOGIN  │    │ SELECTION│    │  WIZARD   │    │  (HOME)  │    │           │
└──────────┘    └──────────┘    └───────────┘    └──────────┘    └───────────┘
                                      │                               │
                                      ▼                               ▼
                               ┌─────────────┐               ┌─────────────┐
                               │ Domain Scan │               │ AI Analysis │
                               │ GSC Connect │               │ Reports     │
                               │ Region Set  │               │ Content     │
                               └─────────────┘               │ Forecasts   │
                                                             │ Quote Build │
                                                             └─────────────┘
```

---

## Flow 1: User Registration & Onboarding

```
User arrives at Landing Page (/)
    │
    ├── Click "Get Started" ──▶ /signup
    │       │
    │       ▼
    │   Supabase Auth creates account (email/password or Google OAuth)
    │       │
    │       ▼
    │   /auth/callback ──▶ Exchange code for session
    │       │              Create user profile in `user` table
    │       ▼
    │   /role-selection ──▶ User picks: Agency or Client
    │       │                (Agency: creates organization + sets industry)
    │       ▼
    │   /onboarding (4 steps):
    │       │
    │       ├── Step 1: Enter Domain ──▶ saves to `domains` table
    │       ├── Step 2: Region & Language ──▶ saves country/language prefs
    │       ├── Step 3: Connect Data Sources ──▶ OAuth to GSC, GA4, etc.
    │       └── Step 4: Start Scan ──▶ Triggers domain intelligence job
    │               │
    │               ▼
    │           domain-crawler API ──▶ Playwright crawls site
    │               │                  Extracts: pages, keywords, SEO, structure
    │               ▼
    │           domain-intelligence Edge Fn ──▶ AI analysis of crawled data
    │               │                          Competitor mapping
    │               │                          AI visibility scan
    │               ▼
    │           Results stored in `domain_intelligence_jobs`
    │               │
    │               ▼
    │           Redirect to /dashboard
    │
    └── Already have account ──▶ /login ──▶ /dashboard
```

---

## Flow 2: Brand Analysis (Core AI Visibility Check)

```
User clicks "New Analysis" in AI Visibility
    │
    ▼
Select/Create Brand Analysis Project
    │ (domain, competitors, keywords, AI platforms)
    ▼
POST /api/ai-visibility
    │
    ├── Fetches GSC keywords (if connected)
    ├── Creates brand_analysis_session
    │
    ▼
Triggers brand-analysis Edge Function
    │
    ├── For EACH prompt (keyword + intent variation):
    │   ├── Query ChatGPT ──▶ "Who is the best X in Y?"
    │   ├── Query Claude ──▶ same prompt
    │   ├── Query Gemini ──▶ same prompt
    │   ├── Query Perplexity ──▶ same prompt
    │   └── Query Grok ──▶ same prompt
    │
    ├── For EACH response:
    │   ├── Extract: brand mentions, positions, sentiment
    │   ├── Identify: competitors mentioned
    │   ├── Score: visibility (0-100)
    │   └── Store in `ai_platform_responses`
    │
    ├── Run competitor-analysis-engine:
    │   ├── Rank competitors across all responses
    │   ├── Compute share of voice
    │   ├── Identify competitive gaps
    │   └── Store in `brand_analysis_sessions`
    │
    └── Optionally: analyze website content
        └── Store summary in `brand_analysis_projects`

    ▼
Dashboard displays results:
    • Visibility score per platform
    • Competitor rankings
    • Share of voice chart
    • Gap analysis
    • Actionable recommendations
```

---

## Flow 3: Content Generation & Publishing

```
User opens Content Generator
    │
    ▼
Select target platform(s):
    Reddit, LinkedIn, Medium, GitHub, Quora,
    WordPress, Shopify, Facebook, Instagram, X
    │
    ▼
POST /api/geo-core/content-generate
    │
    ├── Load brand voice profile (if exists)
    ├── Load learning rules (from self-learning loop)
    ├── Load domain intelligence context
    │
    ▼
geoCore.generateStrategicContent()
    │ (OpenAI GPT-4)
    │
    ├── Platform-specific formatting
    ├── Keyword optimization
    ├── Brand voice matching
    ├── Learning rules applied
    │
    ▼
detect-ai Edge Function ──▶ AI content detection score
    │
    ▼
make-it-human Edge Function ──▶ Humanize if needed
    │
    ▼
Content stored in `content_strategy`
    │
    ├── User reviews/edits content
    │
    ▼
Publish options:
    ├── Immediate: POST /api/geo-core/orchestrator
    │       │
    │       ├── WordPress API ──▶ Create post
    │       ├── LinkedIn API ──▶ Share/article
    │       ├── Reddit API ──▶ Submit post
    │       ├── GitHub API ──▶ Discussion
    │       ├── Medium API ──▶ Story
    │       ├── Shopify API ──▶ Blog post
    │       ├── Facebook API ──▶ Page post
    │       ├── Instagram API ──▶ Media post
    │       └── X API ──▶ Tweet
    │
    └── Scheduled: saved with schedule_date
            │
            └── scheduled-publish Edge Fn (pg_cron every 5 min)
                    └── Publishes when due
    │
    ▼
Published content tracked in `published_content`
    │
    ▼
auto-track-performance Edge Fn (daily 9 AM UTC)
    │
    ├── Fetch engagement metrics from each platform
    └── Store in `performance_snapshots`
```

---

## Flow 4: Reports Generation

```
User navigates to any report section
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Available Report Types:                          │
│                                                  │
│  1. Strategic Blind Spots                        │
│  2. AI vs Google Gap                             │
│  3. Market Share of Attention                    │
│  4. Opportunity Blind Spots                      │
│  5. AI Search Presence                           │
│  6. GEO Visibility & Market Coverage             │
│  7. Global Visibility Matrix                     │
│  8. Regional Strength Comparison                 │
└─────────────────────────────────────────────────┘
    │
    ▼
GET /api/reports/{report-type}
    │
    ├── Aggregates data from:
    │   ├── brand_analysis_sessions
    │   ├── ai_platform_responses
    │   ├── gsc_queries / gsc_pages
    │   ├── domain_intelligence_jobs
    │   └── Previous reports
    │
    ├── AI analysis (OpenAI/Claude/Gemini):
    │   ├── Patterns identification
    │   ├── Gap analysis
    │   └── Strategic recommendations
    │
    ▼
Report stored in respective table
    │
    ├── PDF Export: jspdf + html2canvas
    ├── PPT Export: pptxgenjs
    ├── Email: POST /api/reports/send-email
    ├── Public Share: /public/report/[shareToken]
    │
    ▼
Optional: Video Report Generation
    │
    POST /api/reports/{type}/video
    │
    ├── Generate Part 1 prompt ──▶ xAI Aurora API
    ├── Generate Part 2 prompt ──▶ xAI Aurora API
    │   (parallel requests)
    │
    ├── Poll for completion (async)
    │
    ├── Download video files
    ├── Merge with ffmpeg (for blind spots)
    ├── Upload to Supabase Storage bucket
    │
    └── Store reference in `report_videos`
```

---

## Flow 5: Quote Builder (Sales Proposals)

```
Agency user opens Quote Builder
    │
    ▼
Step 1: Enter client domain
    │
    ▼
Step 2: Run DCS Scan
    │
    POST /api/quote-builder/dcs
    │
    ├── Layer 1: AI Search Influence (20%) ──▶ ai_platform_responses
    ├── Layer 2: Organic & Commercial (15%) ──▶ gsc_analytics
    ├── Layer 3: Social Authority (15%) ──▶ platform_integrations
    ├── Layer 4: Reputation (15%) ──▶ google_maps_reviews
    ├── Layer 5: Website Depth (15%) ──▶ domain_intelligence
    └── Layer 6: Risk & Exposure (20%) ──▶ blind_spot_reports
    │
    ▼
Step 3: DCS Score (0-100) + Industry Benchmark
    │
    ▼
Step 4: Market & Revenue Analysis
    │   POST /api/quote-builder/revenue-exposure
    │
    ▼
Step 5: Risk & Threat Engine
    │   POST /api/quote-builder/threat-engine
    │
    ▼
Step 6: Strategic Recommendation
    │   recommendation-engine.ts ──▶ Mode selection
    │   (Stability / Growth / Strategic Control / Dominance)
    │
    ▼
Step 7-8: Report selection + Pricing
    │
    ▼
Step 9: Preview proposal
    │
    ▼
Step 10: Export
    ├── PDF: generateProposalPDF()
    ├── Email: POST /api/quote-builder/send-proposal-email
    ├── Public link: /proposals/[token]
    └── Save: stored in `quotes` table
```

---

## Flow 6: GSC Integration & Analytics

```
User connects Google Search Console
    │
    GET /api/integrations/google-search-console/auth-url
    │ ──▶ Google OAuth consent screen
    │
    ▼
Google callback ──▶ /api/integrations/google-search-console/callback
    │
    ├── Exchange code for tokens
    ├── Fetch verified sites from GSC
    ├── Store in `platform_integrations`
    ├── Auto-add domains to `domains`
    │
    ▼
Domain verification (if needed):
    ├── POST .../domains ──▶ Get DNS TXT token
    ├── User adds TXT record to DNS
    ├── POST .../domains/check-dns ──▶ Verify DNS propagation
    └── POST .../domains/verify ──▶ Verify with Google
    │
    ▼
GSC Analytics Sync:
    POST .../analytics/sync
    │
    ├── Fetch last 90 days of search analytics
    ├── Store in `gsc_analytics` (summary)
    ├── Store in `gsc_queries` (per-query data)
    └── Store in `gsc_pages` (per-page data)
    │
    ▼
Automatic sync via Vercel Cron (every 6 hours):
    GET /api/cron/sync-gsc
    │
    └── Syncs all connected domains for all users
```

---

## Flow 7: Self-Learning Loop

```
Content published to platform
    │
    ▼
Performance tracked (daily cron)
    │
    ▼
Ranking or engagement changes detected
    │
    ▼
autoTrigger.ts fires:
    ├── triggerLearningFromRanking (if rank changes ≥ 3 positions)
    └── triggerLearningFromContent (if engagement data exists)
    │
    ▼
geoCore.analyzeAndLearn()
    │ (GPT-4 analyzes what worked/failed)
    │
    ├── Success score (0-100)
    ├── Insights (what worked)
    ├── Recommendations (what to do next)
    │
    ▼
Store in `geo_learning_data`
    │
    ▼
If success score > threshold:
    └── rulesEngine.storeLearningRule()
        └── Store in `learning_rules`
    │
    ▼
Next content generation:
    └── rulesEngine.applyLearningRules()
        └── Rules injected into content prompt
            (tone, format, keywords, platform rules)
```

---

## Flow 8: Global Visibility Matrix

```
User selects domain + clicks "Calculate Matrix"
    │
    ▼
POST /api/global-visibility-matrix/calculate
    │
    ├── For EACH country (30-50 countries):
    │   ├── For EACH keyword:
    │   │   ├── Query AI platforms with geo-specific prompt
    │   │   └── Check if brand is mentioned
    │   │
    │   └── Compute country visibility score
    │
    ├── Progress updates via /progress endpoint (in-memory)
    │
    ▼
Store results in `global_visibility_matrix`
    │
    ▼
Dashboard displays:
    ├── Country heatmap
    ├── Region vs AI tab
    ├── Region vs Google tab
    └── Optional video report generation
```

---

## Flow 9: Scheduled / Automated Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATED OPERATIONS                          │
│                                                                  │
│  Vercel Cron:                                                   │
│  ├── Every 6 hours: sync-gsc (GSC analytics refresh)            │
│                                                                  │
│  Supabase pg_cron:                                              │
│  ├── Daily 9 AM UTC: auto-track-performance                     │
│  │   └── Fetches engagement from all platforms                  │
│  ├── Every 5 min: scheduled-publish                              │
│  │   └── Publishes content with schedule_date <= now            │
│  └── Configurable: scheduled-analysis                            │
│      └── Re-runs brand analysis for due projects                │
└─────────────────────────────────────────────────────────────────┘
```

---

