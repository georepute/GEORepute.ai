# 01 — High-Level Architecture Overview

> GEORepute.ai — AI-Powered Brand Visibility & Reputation Platform  
> Last updated: March 7, 2026

---

## What Is GEORepute.ai?

GEORepute.ai is a SaaS platform that helps brands monitor, analyze, and improve their visibility across **AI search engines** (ChatGPT, Claude, Gemini, Perplexity, Grok) and **traditional search engines** (Google Search Console). It generates strategic intelligence reports, creates optimized content, publishes to multiple platforms, and tracks performance — all from a single dashboard.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USERS (Browser)                                    │
│                                                                                 │
│   Landing Pages ─── Login/Signup ─── Onboarding ─── Dashboard (Role-based)      │
└──────────────────────────────┬──────────────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP (Vercel)                                    │
│                                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Frontend    │  │  API Routes  │  │  Middleware   │  │  Server Components │   │
│  │  (React 18)  │  │  (100+ APIs) │  │  (Auth Gate) │  │  (SSR Pages)       │   │
│  └─────────────┘  └──────┬───────┘  └──────────────┘  └────────────────────┘   │
│                          │                                                       │
└──────────────────────────┼──────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────────────────────────┐
          │                │                                    │
          ▼                ▼                                    ▼
┌──────────────┐  ┌───────────────────┐              ┌───────────────────┐
│   SUPABASE   │  │   AI / LLM LAYER  │              │  EXTERNAL APIS    │
│              │  │                   │              │                   │
│  • Auth      │  │  • OpenAI GPT-4   │              │  • Google GSC     │
│  • PostgreSQL│  │  • Anthropic      │              │  • Google Ads     │
│  • Storage   │  │  • Gemini         │              │  • Google Maps    │
│  • Edge Fns  │  │  • Perplexity     │              │  • Google GA4     │
│  • RLS       │  │  • Grok (xAI)     │              │  • Stripe         │
│  • pg_cron   │  │  • Groq           │              │  • Social APIs    │
│              │  │  • HuggingFace    │              │  • Pixabay        │
└──────────────┘  └───────────────────┘              └───────────────────┘
```

---

## Layer Breakdown

### Layer 1 — Client (Browser)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI Framework | React 18 + Next.js 14 (App Router) | Page rendering, routing |
| Styling | Tailwind CSS + Framer Motion | Responsive design, animations |
| Charts | Recharts + Chart.js | Data visualization |
| State | Zustand + React hooks | Client-side state management |
| i18n | Custom LanguageProvider | English + Hebrew (RTL support) |

### Layer 2 — Application Server (Next.js on Vercel)

| Component | Purpose |
|-----------|---------|
| **100+ API Routes** | Business logic, data orchestration, AI calls |
| **Middleware** | Session validation, auth gating, redirects |
| **Server Components** | SSR for SEO, initial data loading |
| **Cron Endpoints** | Scheduled GSC sync (Vercel Cron) |

### Layer 3 — Backend Services (Supabase)

| Component | Purpose |
|-----------|---------|
| **Supabase Auth** | Email/password, Google OAuth, social SSO |
| **PostgreSQL** | Primary database (40+ tables, RLS policies) |
| **Supabase Storage** | 8 buckets for video reports, images |
| **Edge Functions** | 13 serverless functions (analysis, publishing, tracking) |
| **pg_cron** | Scheduled jobs (performance tracking, scheduled publishing) |

### Layer 4 — AI / LLM Layer

| Provider | Usage |
|----------|-------|
| **OpenAI GPT-4** | Content generation, keyword scoring, forecasts, action plans, DCS |
| **Anthropic Claude** | Annual strategic plans, gap analysis |
| **Google Gemini** | Brand analysis, visibility checks |
| **Perplexity** | Web research, brand summaries |
| **xAI Grok** | Brand analysis, video generation (Aurora) |
| **Groq** | Fast inference for visibility checks |
| **HuggingFace** | AI content detection |

### Layer 5 — External Integrations

| Category | Services |
|----------|----------|
| **Google Suite** | Search Console, Analytics (GA4), Maps/Places, Business Profile, Ads |
| **Social Platforms** | LinkedIn, X (Twitter), Facebook, Instagram, Reddit, GitHub |
| **Publishing** | WordPress.com, WordPress Self-hosted, Shopify, Medium, Quora |
| **Payments** | Stripe (checkout, webhooks, seats) |
| **Media** | Pixabay (stock images), xAI Aurora (video generation) |
| **Email** | Gmail SMTP via Nodemailer |

---

## Key Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | Next.js 14 App Router | Server components, API routes |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + Edge Functions in one |
| AI Strategy | Multi-LLM | No vendor lock-in; different models for different tasks |
| Auth | Supabase Auth + RLS | Row-level security at the database level |
| Hosting | Vercel | Next.js hosting, cron support |
| Video | xAI Aurora API | AI-generated video reports without local rendering |

---

## Security Model

```
User Request
    │
    ▼
[Middleware] ── Validates Supabase session
    │
    ▼
[API Route] ── Checks org membership, role, capabilities
    │
    ▼
[Supabase] ── RLS policies enforce row-level access
    │
    ▼
[Data] ── Organization-scoped, user cannot cross boundaries
```

- **Authentication**: Supabase Auth (JWT tokens, session cookies)
- **Authorization**: Role-based (admin / agency / client) with capability checks
- **Data Isolation**: RLS policies on every table; data scoped to organization
- **API Protection**: Cron endpoints secured with `CRON_SECRET`
- **Payments**: Stripe webhooks verified with signature

---
