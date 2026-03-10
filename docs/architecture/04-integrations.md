# 04 — Integrations

> Every external service and API that GEORepute.ai connects to  
> Last updated: March 7, 2026

---

## Integration Landscape

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GEORepute.ai                                        │
│                                                                             │
│  ┌──── AI / LLM ────┐  ┌── Google Suite ──┐  ┌── Social Platforms ──────┐  │
│  │ OpenAI            │  │ Search Console   │  │ LinkedIn   │ Reddit     │  │
│  │ Anthropic Claude  │  │ Analytics (GA4)  │  │ X/Twitter  │ GitHub     │  │
│  │ Google Gemini     │  │ Business Profile │  │ Facebook   │ Medium     │  │
│  │ Perplexity        │  │ Maps / Places    │  │ Instagram  │ Quora      │  │
│  │ xAI Grok/Aurora   │  │ Ads              │  │            │            │  │
│  │ Groq              │  │ Site Verification│  │            │            │  │
│  │ HuggingFace       │  │                  │  │            │            │  │
│  └───────────────────┘  └──────────────────┘  └────────────┴────────────┘  │
│                                                                             │
│  ┌── Publishing ─────┐  ┌── Payments ──────┐  ┌── Media & Email ────────┐  │
│  │ WordPress.com     │  │ Stripe           │  │ Pixabay (images)        │  │
│  │ WordPress (self)  │  │                  │  │ xAI Aurora (video)      │  │
│  │ Shopify           │  │                  │  │ Gmail SMTP (email)      │  │
│  └───────────────────┘  └──────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI / LLM Providers

### OpenAI (Primary AI Provider)

| Attribute | Detail |
|-----------|--------|
| **API** | `api.openai.com/v1/chat/completions` |
| **Models** | GPT-4 Turbo, GPT-4o, GPT-4o-mini |
| **Env Variable** | `OPENAI_API_KEY` |
| **Used For** | Content generation, keyword scoring, forecasts, action plans, annual plans, competitor analysis, global visibility matrix, DCS calculations, synthesize responses, competitive intelligence |
| **Used In** | `lib/ai/geoCore.ts`, `supabase/functions/brand-analysis/`, `supabase/functions/domain-visibility/`, `supabase/functions/generate-competitive-intelligence/`, `supabase/functions/brand-analysis-summary/`, `app/api/global-visibility-matrix/calculate/`, `app/api/geo-core/synthesize-response/`, `app/api/geo-core/business-development/`, `lib/seo/structuredContent.ts` |

### Anthropic (Claude)

| Attribute | Detail |
|-----------|--------|
| **API** | `api.anthropic.com/v1/messages` |
| **Models** | Claude 3.5 Sonnet |
| **Env Variable** | `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY` |
| **Used For** | Annual strategic plans (fallback from GPT-4), brand analysis, gap analysis suggestions, AI visibility checks |
| **Used In** | `lib/ai/geoCore.ts`, `supabase/functions/brand-analysis/`, `supabase/functions/domain-visibility/`, `app/api/reports/gap-suggestions/` |

### Google Gemini

| Attribute | Detail |
|-----------|--------|
| **API** | `generativelanguage.googleapis.com/v1beta/models` |
| **Models** | Gemini Pro |
| **Env Variable** | `GOOGLE_API_KEY` or `GEMINI_API_KEY` |
| **Used For** | Brand analysis (multi-platform), AI visibility checks, gap suggestions |
| **Used In** | `supabase/functions/brand-analysis/`, `supabase/functions/domain-visibility/`, `app/api/reports/gap-suggestions/` |

### Perplexity

| Attribute | Detail |
|-----------|--------|
| **API** | `api.perplexity.ai/chat/completions` |
| **Models** | sonar-small-online, sonar-medium-online |
| **Env Variable** | `PERPLEXITY_API_KEY` |
| **Used For** | Web-grounded brand research, brand analysis (multi-platform), AI visibility checks |
| **Used In** | `supabase/functions/brand-analysis/`, `supabase/functions/brand-analysis-summary/`, `supabase/functions/domain-visibility/` |

### xAI (Grok + Aurora)

| Attribute | Detail |
|-----------|--------|
| **API** | `api.x.ai/v1/chat/completions` (Grok), `api.x.ai/v1/videos/generations` (Aurora) |
| **Models** | Grok (chat), Aurora (video) |
| **Env Variable** | `XAI_API_KEY` or `GROK_API_KEY` |
| **Used For** | Brand analysis, AI visibility checks, **video report generation** (Aurora) |
| **Used In** | `supabase/functions/brand-analysis/`, all `app/api/reports/*/video/` routes |

### Groq

| Attribute | Detail |
|-----------|--------|
| **API** | `api.groq.com/openai/v1/chat/completions` |
| **Models** | LLaMA-based fast inference |
| **Env Variable** | `GROQ_API_KEY` |
| **Used For** | Brand analysis (fast responses), AI visibility checks |
| **Used In** | `supabase/functions/brand-analysis/`, `supabase/functions/domain-visibility/` |

### HuggingFace

| Attribute | Detail |
|-----------|--------|
| **API** | `router.huggingface.co/hf-inference/models/Hello-SimpleAI/chatgpt-detector-roberta` |
| **Env Variable** | `HUGGINGFACE_API_KEY` (optional) |
| **Used For** | AI content detection (optional enhancement) |
| **Used In** | `supabase/functions/detect-ai/` |

---

## Google Suite

### Google Search Console (GSC)

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 |
| **API** | `googleapis` npm package — `webmasters_v3` |
| **Env Variables** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **Scopes** | `webmasters.readonly`, `webmasters`, `siteverification`, `siteverification.verify_only` |
| **Data Retrieved** | Search queries (clicks, impressions, CTR, position), pages, domains, verification tokens |
| **Sync** | Manual + Vercel Cron (every 6 hours) |
| **Tables** | `platform_integrations`, `domains`, `gsc_analytics`, `gsc_queries`, `gsc_pages`, `gsc_keywords` |
| **Routes** | `app/api/integrations/google-search-console/*` (12 routes) |

### Google Analytics (GA4)

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 (shares Google OAuth client) |
| **API** | Google Analytics Data API |
| **Data Retrieved** | Report summaries, sessions, pageviews |
| **Tables** | `platform_integrations` |
| **Routes** | `app/api/integrations/google-analytics/*` (4 routes) |

### Google Maps / Places

| Attribute | Detail |
|-----------|--------|
| **API** | Places API (Place Details, Text Search, Nearby Search) |
| **Env Variable** | Uses Google OAuth token |
| **Data Retrieved** | Business listings, reviews, ratings, review text |
| **Tables** | `google_maps_reviews` |
| **Routes** | `app/api/integrations/google-maps/*` (2 routes) |

### Google Business Profile (GBP)

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 |
| **API** | My Business API |
| **Data Retrieved** | Business locations, metadata |
| **Tables** | `platform_integrations` |
| **Routes** | `app/api/integrations/google-business-profile/*` (3 routes) |

### Google Ads

| Attribute | Detail |
|-----------|--------|
| **API** | Google Ads API (REST, via `generateKeywordIdeas`) |
| **Env Variables** | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_TEST_ACCOUNT_ID` |
| **Data Retrieved** | Keyword ideas, search volume, competition, CPC |
| **Tables** | `keyword_plans` |
| **Routes** | `app/api/keyword-forecast/*` (5 routes) |

### Google Site Verification

| Attribute | Detail |
|-----------|--------|
| **API** | `googleapis` — `siteVerification` |
| **Data Retrieved** | DNS TXT verification tokens, verification status |
| **Used In** | GSC domain verification flow |

---

## Social Platform Integrations

### LinkedIn

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`) |
| **API** | `api.linkedin.com/v2` (ugcPosts, assets, userinfo) |
| **Capabilities** | Read profile, publish posts/articles, upload media |
| **Routes** | `app/api/auth/linkedin/callback/`, `app/api/integrations/linkedin/` |

### X (Twitter)

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 PKCE (`X_CLIENT_ID`, `X_CLIENT_SECRET`) |
| **API** | `api.x.com/2` (tweets, media/upload) |
| **Capabilities** | Read profile, publish tweets, upload media |
| **Routes** | `app/api/auth/x/callback/`, `app/api/integrations/x/*` |

### Facebook

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 (Facebook Login) |
| **API** | Graph API v18.0 (`graph.facebook.com`) |
| **Capabilities** | Read pages, publish to pages, manage ads |
| **Routes** | `app/api/auth/facebook/callback/`, `app/api/integrations/facebook/` |

### Instagram

| Attribute | Detail |
|-----------|--------|
| **Auth** | Via Facebook OAuth (Instagram Business Account) |
| **API** | Graph API (Instagram endpoints) |
| **Capabilities** | Read profile, publish media |
| **Routes** | `app/api/auth/instagram/callback/`, `app/api/integrations/instagram/` |

### Reddit

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) |
| **API** | `oauth.reddit.com` (submit, me) |
| **Capabilities** | Read profile, submit posts to subreddits |
| **Routes** | `app/api/auth/reddit/callback/`, `app/api/integrations/reddit/` |

### GitHub

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) |
| **API** | `api.github.com/graphql` (Discussions) |
| **Capabilities** | Read profile, create discussions |
| **Routes** | `app/api/auth/github/callback/`, `app/api/integrations/github/` |

### Medium

| Attribute | Detail |
|-----------|--------|
| **Auth** | API Token (integration token from Medium settings) |
| **API** | `api.medium.com/v1` (posts) |
| **Capabilities** | Publish stories |
| **Routes** | `app/api/integrations/medium/` |

### Quora

| Attribute | Detail |
|-----------|--------|
| **Auth** | Via external proxy service (`QUORA_MEDIUM_URL`) |
| **API** | GraphQL (Quora Space posting) |
| **Capabilities** | Publish to Quora Spaces |
| **Routes** | `app/api/integrations/quora/` |

---

## Publishing Platforms

### WordPress.com

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 |
| **API** | `public-api.wordpress.com/rest/v1.1` (sites, posts, media) |
| **Capabilities** | Create posts, upload media, manage sites |
| **Routes** | `app/api/auth/wordpress/callback/`, `app/api/blog/wordpress/publish/` |

### WordPress Self-hosted

| Attribute | Detail |
|-----------|--------|
| **Auth** | Application Password |
| **API** | `{site}/wp-json/wp/v2` (posts, media) |
| **Capabilities** | Create posts, upload media |
| **Routes** | `app/api/integrations/wordpress-self-hosted/` |

### Shopify

| Attribute | Detail |
|-----------|--------|
| **Auth** | OAuth 2.0 |
| **API** | Shopify Admin API (blogs, articles) |
| **Capabilities** | List blogs, create blog posts |
| **Routes** | `app/api/auth/shopify/callback/`, `app/api/blog/shopify/*` |

---

## Payments

### Stripe

| Attribute | Detail |
|-----------|--------|
| **Client** | `@stripe/stripe-js` (frontend), `stripe` (backend) |
| **Env Variables** | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Capabilities** | Checkout sessions, payment processing, webhook events |
| **Events Handled** | `checkout.session.completed` (seat purchase) |
| **Tables** | `seat_payments`, `organizations` |
| **Routes** | `app/api/stripe/create-checkout/`, `app/api/stripe/webhook/` |

---

## Media & Utilities

### Pixabay

| Attribute | Detail |
|-----------|--------|
| **API** | `pixabay.com/api/` |
| **Env Variable** | `PIXABAY_API_KEY` |
| **Capabilities** | Search stock images by keyword |
| **Used In** | `supabase/functions/pixabay-images/`, `app/api/geo-core/pixabay-images/` |

### Gmail SMTP (Nodemailer)

| Attribute | Detail |
|-----------|--------|
| **Technology** | Nodemailer with Gmail App Password |
| **Env Variables** | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME_REPORT` |
| **Capabilities** | Send reports, proposals, invitations via email |
| **Used In** | `lib/email.ts` |

### Playwright (Web Crawling)

| Attribute | Detail |
|-----------|--------|
| **Technology** | Playwright (Node.js) + Cheerio (HTML parsing) |
| **Capabilities** | Crawl JavaScript-rendered websites, extract content |
| **Used In** | `app/api/geo-core/domain-crawler/`, `supabase/functions/domain-intelligence/` |

---

## Environment Variables Summary

| Variable | Service | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Yes |
| `OPENAI_API_KEY` | OpenAI | Yes |
| `ANTHROPIC_API_KEY` / `CLAUDE_API_KEY` | Anthropic | Yes |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | Gemini | Yes |
| `PERPLEXITY_API_KEY` | Perplexity | Yes |
| `XAI_API_KEY` / `GROK_API_KEY` | xAI | Yes |
| `GROQ_API_KEY` | Groq | Recommended |
| `GOOGLE_CLIENT_ID` | Google OAuth | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Yes |
| `GOOGLE_REDIRECT_URI` | Google OAuth | Yes |
| `STRIPE_SECRET_KEY` | Stripe | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Yes |
| `GMAIL_USER` | Email | Yes |
| `GMAIL_APP_PASSWORD` | Email | Yes |
| `CRON_SECRET` | Vercel Cron | Yes |
| `NEXT_PUBLIC_SITE_URL` | App | Yes |
| `GOOGLE_ADS_*` (6 vars) | Google Ads | Optional |
| `LINKEDIN_CLIENT_ID` / `SECRET` | LinkedIn | Optional |
| `X_CLIENT_ID` / `SECRET` | X | Optional |
| `REDDIT_CLIENT_ID` / `SECRET` | Reddit | Optional |
| `GITHUB_CLIENT_ID` / `SECRET` | GitHub | Optional |
| `HUGGINGFACE_API_KEY` | HuggingFace | Optional |
| `QUORA_MEDIUM_URL` | Quora/Medium proxy | Optional |
| `PIXABAY_API_KEY` | Pixabay | Optional |

---

