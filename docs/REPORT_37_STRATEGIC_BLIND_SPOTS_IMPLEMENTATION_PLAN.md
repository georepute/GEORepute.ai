# Report #37 – Strategic Blind Spots (Gap Topic Table) – Implementation Plan

> **Decision-Level Insight:** What are we ignoring?  
> **Business Meaning:** Strategic blindness  
> **Cross-Analysis Logic:** Demand vs Absence  
> **Data Sources:** GSC + AI  
> **Category:** Strategy  

---

## Executive Summary

This report answers: **"What topics are people actively searching for — but we have zero presence in?"**

It identifies high-demand queries where competitors or AI mention others, but your brand does NOT appear. This reveals content gaps, SEO gaps, AI visibility gaps, and product opportunity gaps.

---

## 1. Current Codebase Alignment

### What Already Exists

| Component | Location | Reuse |
|----------|----------|-------|
| GSC query data | `gsc_queries` table | ✅ Full reuse – query, impressions, clicks, position |
| GSC sync | `api/integrations/google-search-console/analytics/sync` | ✅ Already populates `gsc_queries` |
| AI mention check | `api/reports/ai-vs-google-gap/route.ts` | ✅ Reuse `buildCheckPrompt`, `ENGINE_CALLERS`, `parseAIResponse` |
| Domain selection | `api/integrations/google-search-console/domains` | ✅ Same pattern as AI vs Google Gap |
| Report storage | `ai_google_gap_reports` pattern | 📋 New table: `blind_spot_reports` |

### Key Difference from AI vs Google Gap

| AI vs Google Gap | Strategic Blind Spots |
|------------------|------------------------|
| Compares Google presence vs AI presence | Identifies topics with **demand** but **no presence** |
| Uses all GSC queries (top by impressions) | Filters for **absence** (position > 20 OR no ranking) |
| Gap Score = Google − AI | Blind Spot Score = **Demand × Absence** |
| Bands: ai_risk, moderate_gap, balanced, etc. | Priority: High/Medium/Low by Blind Spot Score |

---

## 2. Implementation Phases

### Phase 1: Core Report (MVP) – 2–3 days

**Scope:** GSC + AI only. No external keyword tools or competitor SERP data.

#### 2.1 Database Schema

```sql
-- New table: blind_spot_reports (similar to ai_google_gap_reports)
CREATE TABLE IF NOT EXISTS public.blind_spot_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL,

  domain_hostname TEXT NOT NULL,
  query_limit INTEGER DEFAULT 50,
  engines_used TEXT[] DEFAULT '{}',

  -- Summary
  total_blind_spots INTEGER DEFAULT 0,
  avg_blind_spot_score NUMERIC(10, 2) DEFAULT 0,
  ai_blind_spot_pct NUMERIC(5, 2) DEFAULT 0,  -- % high-demand where AI ignores brand

  -- Full report as JSONB
  blind_spots JSONB DEFAULT '[]'::jsonb,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_blind_spot_user_domain UNIQUE (user_id, domain_id)
);

-- blind_spots JSONB structure per row:
-- {
--   query, topic, category,
--   volume (from GSC impressions), gsc_impressions, avg_position,
--   ai_mentions (boolean), competitors_mentioned (string[]),
--   demand_score, absence_score, blind_spot_score,
--   priority (high|medium|low), blind_spot_type (search|ai|competitive)
-- }
```

#### 2.2 API Route: `app/api/reports/strategic-blind-spots/route.ts`

**GET** – Load saved report (same pattern as ai-vs-google-gap)

- Params: `domainId`
- Returns: `{ success, data: { domain, blindSpots[], summary, enginesUsed, generatedAt } }`

**POST** – Generate report

1. **Fetch GSC queries** from `gsc_queries` (domain_id, user_id)
2. **Filter for absence:**
   - Position > 20 OR
   - Impressions > threshold (e.g. 10) AND Clicks = 0
3. **Build master topic list** from filtered queries (aggregate by query text)
4. **Run AI mention checks** (reuse ai-vs-google-gap logic) – batch of 10 per engine
5. **Compute scores:**
   - Demand Score (0–10): GSC impressions normalized + optional volume proxy
   - Absence Score (0–10): No ranking (+4), Position > 20 (+3), AI doesn’t mention (+2), Competitor top 3 (+1)
   - Blind Spot Score = Demand × Absence
6. **Assign priority:** High (score ≥ 50), Medium (20–49), Low (< 20)
7. **Save to `blind_spot_reports`**
8. **Return JSON**

#### 2.3 Scoring Logic (MVP)

```typescript
// Demand Score (0–10)
const maxImpressions = Math.max(...queries.map(q => q.impressions), 1);
const demandScore = Math.min(10, (impressions / maxImpressions) * 5 + 5);

// Absence Score (0–10)
let absenceScore = 0;
if (position > 20 || !hasRanking) absenceScore += 4;
else if (position > 10) absenceScore += 3;
if (!aiMentions) absenceScore += 2;
// competitorTop3: +1 (Phase 2)

// Blind Spot Score
const blindSpotScore = demandScore * absenceScore;
```

#### 2.4 Dashboard Page: `app/dashboard/strategic-blind-spots/page.tsx`

- Domain selector (same as ai-vs-google-gap)
- **Gap Topic Table:**
  - Columns: Topic | Volume (GSC impressions) | Your Position | AI Mentions? | Blind Spot Score | Priority
  - Sort by Blind Spot Score DESC
- **Visualizations:**
  - Top 20 Blind Spots (bar chart)
  - Blind Spots by Category (pie – if category available)
  - AI Blind Spot % (single metric)
- Generate / Refresh button
- Loading and empty states

#### 2.5 Navigation

Add to `app/dashboard/layout.tsx` under "Core Reports":

```tsx
{ name: "Strategic Blind Spots", href: "/dashboard/strategic-blind-spots", icon: Target, requiredCapability: "canViewReports" }
```

---

### Phase 2: Enhanced Data (Optional) – 3–5 days

#### 2.1 Keyword Volume

- **Option A:** Google Keyword Planner API (requires Google Ads API setup)
- **Option B:** Use GSC impressions as volume proxy (already in MVP)
- **Option C:** Ahrefs/Semrush API integration (external dependency)

**Recommendation:** Stay with GSC impressions as volume proxy for MVP. Add real volume in Phase 2 if product roadmap requires it.

#### 2.2 Competitor Ranking Data

- **Option A:** SerpAPI / DataForSEO / similar – fetch top 10 URLs per query, detect competitors
- **Option B:** Manual competitor list – user provides domain list, check if any appear in AI responses
- **Option C:** Extract competitors from AI response text (LLM parses "competitors mentioned")

**Recommendation:** Start with Option C – extend AI prompt to return `competitors_mentioned: string[]` in JSON. No new API cost.

#### 2.3 Topic Categories

- Use LLM to classify each query into: Product | Pricing | Comparison | Educational | Local
- Add to `blind_spots` JSONB
- Enable "Blind Spots by Category" pie chart

---

### Phase 3: Automation & Alerts (Advanced) – 2–3 days

- **Cron job:** Weekly refresh of blind spot reports for active domains
- **Alert:** When Blind Spot Score > threshold (e.g. 60), send notification
- **Scheduled AI checks:** Batch AI mention checks via API on schedule

---

## 3. File Structure

```
app/
├── api/reports/
│   └── strategic-blind-spots/
│       └── route.ts          # GET + POST
├── dashboard/
│   └── strategic-blind-spots/
│       └── page.tsx          # UI

database/
└── 030_blind_spot_reports.sql   # Migration

docs/
└── REPORT_37_STRATEGIC_BLIND_SPOTS_IMPLEMENTATION_PLAN.md  # This file
```

---

## 4. API Contract

### POST /api/reports/strategic-blind-spots

**Request:**
```json
{ "domainId": "uuid" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "blindSpots": [
      {
        "query": "best AI visa advisor",
        "topic": "AI visa advisor",
        "category": "Product",
        "volume": 5000,
        "gscImpressions": 1200,
        "avgPosition": 45,
        "aiMentions": false,
        "competitorsMentioned": ["competitor.com"],
        "demandScore": 8.2,
        "absenceScore": 9,
        "blindSpotScore": 73.8,
        "priority": "high",
        "blindSpotType": "ai"
      }
    ],
    "summary": {
      "totalBlindSpots": 25,
      "avgBlindSpotScore": 42.3,
      "aiBlindSpotPct": 68,
      "top5ByTraffic": [...]
    },
    "enginesUsed": ["chatgpt", "gemini"],
    "generatedAt": "2025-02-21T12:00:00Z"
  }
}
```

---

## 5. UI Components to Reuse

| Component | Source | Use |
|-----------|--------|-----|
| Domain selector | `ai-vs-google-gap/page.tsx` | Copy pattern |
| Bar chart (Top 20) | `ai-vs-google-gap` or `ai-search-presence` | Recharts |
| Data table | Existing report tables | Sortable, filterable |
| Generate button + loading | `ai-vs-google-gap` | Same UX |

---

## 6. Blind Spot Detection Logic (Summary)

| Case | Condition | Type |
|------|-----------|------|
| **A** | Volume > 500 (or high GSC impressions), Your Position > 20 or no URL | Search Blind Spot |
| **B** | AI gives answer, mentions competitors, does NOT mention you | AI Blind Spot |
| **C** | Competitor in top 5, you not in top 20 | Competitive Blind Spot |

---

## 7. Executive Summary Section (For Leadership)

Add to report UI:

- **Top 5 blind spots costing traffic** – from `blindSpots` sorted by score
- **Estimated missed traffic** – heuristic: `impressions × (1 - 0.02)` for position > 20 (assume ~2% CTR if you ranked)
- **Recommended action plan** – 1–2 sentence per top blind spot (can use gap-suggestions API pattern)

---

## 8. Implementation Checklist

### Phase 1 (MVP)

- [ ] Create `030_blind_spot_reports.sql` migration
- [ ] Create `app/api/reports/strategic-blind-spots/route.ts`
  - [ ] GET handler
  - [ ] POST handler with GSC fetch, absence filter, AI checks, scoring
- [ ] Create `app/dashboard/strategic-blind-spots/page.tsx`
  - [ ] Domain selector
  - [ ] Gap Topic Table
  - [ ] Top 20 bar chart
  - [ ] AI Blind Spot % metric
  - [ ] Generate / Refresh
- [ ] Add nav item in `app/dashboard/layout.tsx`
- [ ] Add i18n keys if needed (e.g. `strategicBlindSpots`)
- [ ] Test with real GSC + AI data

### Phase 2 (Optional)

- [ ] Extend AI prompt for `competitors_mentioned`
- [ ] Add topic category via LLM
- [ ] Blind Spots by Category pie chart
- [ ] Keyword volume integration (if applicable)

### Phase 3 (Optional)

- [ ] Cron job for weekly refresh
- [ ] Alert when score > threshold
- [ ] Executive summary with missed traffic estimate

---

## 9. Dependencies

- **Existing:** Supabase, GSC integration, AI engine APIs (OpenAI, Gemini, Perplexity, Claude, Grok)
- **New:** None for Phase 1
- **Optional:** SerpAPI/DataForSEO (competitor SERP), Ahrefs/Semrush (volume)

---

## 10. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| AI API rate limits | Batch size 10, use available engines only |
| Empty GSC data | Show "Sync GSC first" message, link to GSC sync |
| No AI keys | Same as ai-vs-google-gap: show 503 with config hint |
| Large query set | Limit to top 100 by impressions, then filter |

---

*Document version: 1.0 | Last updated: 2025-02-21*
