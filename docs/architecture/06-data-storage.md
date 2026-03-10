# 06 — Data Storage

> Where data is stored, what the source of truth is, and how it's organized  
> Last updated: March 7, 2026

---

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Primary Backend)                          │
│                                                                             │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │    PostgreSQL        │  │  Supabase Auth   │  │  Supabase Storage     │  │
│  │    (40+ tables)      │  │  (JWT sessions)  │  │  (8 video buckets +   │  │
│  │    RLS-protected     │  │                  │  │   1 image bucket)     │  │
│  └─────────────────────┘  └──────────────────┘  └───────────────────────┘  │
│                                                                             │
│  ┌─────────────────────┐  ┌──────────────────┐                             │
│  │  Edge Functions      │  │  pg_cron         │                             │
│  │  (13 functions)      │  │  (3 scheduled    │                             │
│  │                      │  │   jobs)          │                             │
│  └─────────────────────┘  └──────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│  In-Memory (Transient)  │
│  • Progress tracking    │
│  • Temporary state      │
└─────────────────────────┘
```

---

## Database Tables (PostgreSQL)

### Core Identity Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `auth.users` | User authentication (managed by Supabase) | `id`, `email`, `encrypted_password` | Supabase-managed |
| `user` | User profile data | `id`, `name`, `email`, `avatar_url`, `role` | Yes |
| `organizations` | Organization info | `id`, `name`, `slug`, `industry`, `seats`, `white_label_config` | Yes |
| `organization_users` | Org membership & roles | `user_id`, `organization_id`, `role_id`, `status`, `invitation_token` | Yes |
| `roles` | Role definitions | `id`, `role_name`, `organization_id` | Yes |

**Source of truth:** `auth.users` for identity, `organization_users` for authorization scope.

---

### Domain & Website Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `domains` | Registered domains | `id`, `domain_name`, `organization_id`, `gsc_property`, `gsc_verified` | Yes |
| `domain_intelligence_jobs` | Website crawl & analysis results | `id`, `domain_id`, `status`, `crawl_data`, `seo_analysis`, `keywords`, `competitors`, `ai_visibility`, `recommendations` | Yes |

**Source of truth:** `domains` is the master record for what domains belong to an org. `domain_intelligence_jobs` is the snapshot of the domain's state at crawl time.

---

### Google Search Console Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `gsc_analytics` | Daily GSC summary metrics | `id`, `domain_id`, `date`, `clicks`, `impressions`, `ctr`, `position` | Yes |
| `gsc_queries` | Per-query search data | `id`, `domain_id`, `query`, `clicks`, `impressions`, `ctr`, `position`, `date` | Yes |
| `gsc_pages` | Per-page search data | `id`, `domain_id`, `page_url`, `clicks`, `impressions`, `ctr`, `position`, `date` | Yes |
| `gsc_keywords` | Extracted keywords from GSC | `id`, `domain_id`, `keyword`, `search_volume`, `position` | Yes |

**Source of truth:** Google's API is the upstream truth. These tables are a **cached mirror**, refreshed every 6 hours via cron. The `date` field preserves the time dimension.

**Unique constraint:** `gsc_analytics` has a unique index on `(domain_id, date)` to prevent duplicate syncs.

---

### AI Analysis Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `brand_analysis_projects` | Project configuration | `id`, `domain_id`, `organization_id`, `name`, `competitors`, `keywords`, `ai_platforms`, `schedule` | Yes |
| `brand_analysis_sessions` | Analysis run results | `id`, `project_id`, `status`, `competitor_rankings`, `share_of_voice`, `competitive_gaps`, `market_positioning` | Yes |
| `ai_platform_responses` | Individual AI platform responses | `id`, `session_id`, `platform`, `query`, `response_text`, `brand_mentioned`, `position`, `sentiment`, `visibility_score`, `competitors_found`, `gap_suggestion` | Yes |
| `brand_analysis_website_analysis` | Website content analysis | `id`, `project_id`, `title`, `description`, `summary` | Yes |
| `ai_engine_results` | AI visibility check results | `id`, `domain`, `platform`, `query`, `mentioned`, `score` | Yes |
| `analysis_run_history` | Track when analyses were run | `id`, `project_id`, `triggered_by`, `status`, `started_at`, `completed_at` | Yes |

**Source of truth:** `ai_platform_responses` is the ground truth for AI visibility data. Each row is a unique query × platform × session snapshot.

---

### Content & Publishing Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `content_strategy` | Generated content (drafts and published) | `id`, `user_id`, `keyword`, `platform`, `title`, `body`, `status`, `ai_detection_score`, `schedule_date`, `brand_voice_id` | Yes |
| `published_content` | Where content was published | `id`, `content_id`, `platform`, `external_url`, `external_id`, `published_at`, `latest_metrics` | Yes |
| `content` | Generic content items | `id`, `title`, `body`, `type`, `user_id` | Yes |
| `brand_voice_profiles` | Brand voice configurations | `id`, `user_id`, `name`, `tone`, `style`, `personality`, `guidelines` | Yes |

**Source of truth:** `content_strategy` owns the content lifecycle state. `published_content` links to the external platform reference (URL, ID).

---

### Reports Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `reports` | Shareable report references | `id`, `type`, `data`, `share_token`, `view_count`, `organization_id`, `created_at` | Yes |
| `blind_spot_reports` | Strategic blind spots data | `id`, `domain_id`, `organization_id`, `data`, `video_part1_path` | Yes |
| `ai_google_gap_reports` | AI vs Google gap data | `id`, `domain_id`, `organization_id`, `data` | Yes |
| `market_share_reports` | Market share of attention data | `id`, `domain_id`, `organization_id`, `data` | Yes |
| `opportunity_blind_spots_reports` | Opportunity blind spots data | `id`, `organization_id`, `data` | Yes |
| `report_videos` | Video report references | `id`, `report_type`, `report_id`, `video_url`, `storage_path`, `duration`, `organization_id` | Yes |
| `global_visibility_matrix` | Country-level visibility data | `id`, `domain_id`, `country`, `keywords`, `ai_scores`, `google_scores`, `overall_score`, `organization_id` | Yes |

**Source of truth:** Each report-specific table owns its data. The `reports` table is a wrapper for sharing/exporting.

---

### Keyword & Forecast Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `keyword` | Tracked keywords | `id`, `keyword`, `domain_id`, `user_id`, `status` | Yes |
| `keyword_forecast` | AI-generated forecasts | `id`, `keyword_id`, `search_volume`, `difficulty`, `competition`, `roi_score`, `trend`, `opportunity_score` | Yes |
| `keyword_plans` | Google Ads keyword plans | `id`, `organization_id`, `name`, `keywords`, `forecast_data` | Yes |
| `ranking` | Keyword ranking history | `id`, `keyword_id`, `position`, `date`, `source` | Yes |

---

### Learning & Intelligence Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `geo_learning_data` | Learning observations from performance | `id`, `user_id`, `content_id`, `keyword`, `action`, `outcome`, `success_score`, `insights`, `recommendations` | Yes |
| `learning_rules` | Extracted rules for future content | `id`, `user_id`, `rule_type`, `conditions`, `actions`, `success_count`, `failure_count`, `last_applied` | Yes |
| `performance_snapshots` | Point-in-time engagement metrics | `id`, `content_id`, `platform`, `metrics`, `date` | Yes |

---

### Quote Builder Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `quotes` | Sales proposals/quotes | `id`, `organization_id`, `client_name`, `domain`, `dcs_data`, `pricing`, `recommendation`, `status`, `share_token` | Yes |
| `quote_activity_log` | Quote interaction tracking | `id`, `quote_id`, `event`, `details`, `timestamp` | Yes |

---

### Integration & Payment Tables

| Table | Source of Truth For | Key Columns | RLS |
|-------|-------------------|-------------|-----|
| `platform_integrations` | OAuth tokens for all platforms | `id`, `user_id`, `platform`, `access_token`, `refresh_token`, `metadata`, `status` | Yes |
| `google_maps_reviews` | Google Maps business reviews | `id`, `user_id`, `place_id`, `business_name`, `rating`, `total_reviews`, `reviews_data` | Yes |
| `seat_payments` | Stripe payment records | `id`, `organization_id`, `stripe_session_id`, `amount`, `status` | Yes |

**Source of truth for OAuth:** `platform_integrations` stores the active token. Tokens are refreshed automatically when expired.

---

## Supabase Storage Buckets

| Bucket Name | Content Type | Source | Purpose |
|-------------|-------------|--------|---------|
| `platform-content-images` | PNG, JPG, WebP | User uploads | Content images for blog posts |
| `blind-spot-videos` | MP4 | xAI Aurora | Strategic Blind Spots video reports |
| `gap-report-videos` | MP4 | xAI Aurora | AI vs Google Gap video reports |
| `market-share-videos` | MP4 | xAI Aurora | Market Share of Attention video reports |
| `opportunity-videos` | MP4 | xAI Aurora | Opportunity Blind Spots video reports |
| `visibility-matrix-videos` | MP4 | xAI Aurora | Global Visibility Matrix video reports |
| `geo-visibility-videos` | MP4 | xAI Aurora | GEO Visibility Market Coverage video reports |
| `ai-presence-videos` | MP4 | xAI Aurora | AI Search Presence video reports |

**Access:** Public URLs for sharing. Scoped by organization via file paths.

---

## In-Memory / Transient Storage

| Data | Location | Purpose | Lifetime |
|------|----------|---------|----------|
| Global Visibility Matrix progress | Server-side `Map` (in API route) | Track calculation progress per user | Until calculation completes |
| Video generation status | Polling loop in API route | Track xAI Aurora job progress | Until video is ready |
| Frontend state | Zustand stores, React state | UI state, form data | Browser session |
| Onboarding progress | `localStorage` | Track onboarding step | Until completed |

---

## Source of Truth Summary

| Question | Source of Truth |
|----------|----------------|
| Who is this user? | `auth.users` + `user` |
| What org does the user belong to? | `organization_users` |
| What role does the user have? | `roles` via `organization_users.role_id` |
| What domains does the org own? | `domains` |
| How does the domain perform on Google? | `gsc_analytics`, `gsc_queries`, `gsc_pages` (mirror of Google API) |
| How visible is the brand in AI search? | `ai_platform_responses` |
| What content has been created? | `content_strategy` |
| Where was content published? | `published_content` |
| How is content performing? | `performance_snapshots` |
| What are the strategic gaps? | `blind_spot_reports`, `ai_google_gap_reports` |
| What's the overall digital health score? | Computed by DCS Engine from 6 tables (not stored permanently — computed on demand) |
| What are the active OAuth connections? | `platform_integrations` |
| What videos have been generated? | `report_videos` + Storage bucket |

---

## Database Migrations & Schema Management

**Location:** Two directories maintain the schema.

| Directory | Purpose | Count |
|-----------|---------|-------|
| `database/` | Manual SQL scripts (numbered sequence) | 78 files |
| `supabase/migrations/` | Supabase CLI migrations (timestamped) | 17 files |
| `database-migrations/` | Additional migration scripts | 2 files |

**Migration naming:**
- `database/001_organizations_and_roles.sql` through `database/034_quote_builder.sql`
- `supabase/migrations/20250115000000_add_performance_tracking.sql` (timestamp format)

**RLS (Row Level Security):** Every table has RLS policies. Data access is restricted to the user's organization. Several migration files specifically fix RLS issues (e.g., `002_fix_rls_recursion.sql`, `003_fix_team_page_rls.sql`, `005_fix_user_table_rls.sql`).

---

