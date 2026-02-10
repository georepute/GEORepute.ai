# Geographic Region–Based Query Generation for Brand Analysis (AI Visibility)

## Goal

Implement **geography-specific query generation** so that when users select **languages** and **countries/regions** in AI Visibility, the Brand Analysis generates queries that reflect how people in those regions really ask (e.g. “best CRM in the UK”, “project management tools for Germany”), instead of only general queries.

---

## Current State

| Component | Current behavior |
|-----------|------------------|
| **UI** | No “Select Languages for Global Analysis” or “Select Countries/Regions” in the flow. Only a single app-level language (e.g. en/he) is passed. |
| **Data** | `brand_analysis_projects`: has `target_keywords`, `active_platforms`, etc. No `analysis_languages` or `analysis_countries`. |
| **Edge function** | `brand-analysis` receives `projectId`, `platforms`, `language` (single: `"en"` \| `"he"`). |
| **Query generation** | `generateRealisticUserQueries(brandName, industry, keywords, competitors, websiteUrl, language)` — language-aware (e.g. Hebrew) but **not** region/country-aware. |
| **Queries per run** | ~50 queries generated once, reused for all platforms. No “200 per platform” or “distributed across N languages × M regions” yet. |

---

## Implementation Plan (High Level)

1. **Data model** – Store analysis languages and countries per project (or per session).
2. **UI** – Add “Select Languages for Global Analysis” and “Select Countries/Regions for Analysis” and the query-count formula.
3. **Query generation** – Extend to accept regions/countries and produce geography-specific (and optionally language-specific) queries.
4. **Orchestration** – Distribute queries across languages × regions and pass options into the edge function.
5. **Optional** – Attach language/region to each query or response for reporting.

---

## Phase 1: Data Model

### 1.1 Add columns (prefer on project so it’s reusable)

**Option A – On `brand_analysis_projects` (recommended)**

- `analysis_languages` – `TEXT[]` (e.g. `['en-US', 'he', 'de']`). If empty/null → treat as one language from app or default `en`.
- `analysis_countries` – `TEXT[]` (e.g. `['US', 'GB', 'DE', 'IL']`). If empty/null → “general” (no country-specific phrasing).

**Option B – On `brand_analysis_sessions`**

- Same fields on the session so each run can have a different language/region set without changing project settings.

**Recommendation:** Start with **Option A** (project-level). You can later add session-level overrides if needed.

### 1.2 Migration

- New migration, e.g. `database/024_analysis_languages_countries.sql` and matching Supabase migration.
- Add columns with `DEFAULT '{}'` so existing rows stay valid.

### 1.3 RLS

- No change needed if you only added columns; existing RLS on `brand_analysis_projects` still applies.

---

## Phase 2: UI (AI Visibility – project details / “before analysis” step)

### 2.1 “Select Languages for Global Analysis”

- **Purpose:** “Track your brand visibility across different languages and regions.”
- **Control:** Multi-select (e.g. dropdown with tags). Values: language codes + labels (e.g. `en-US` → “English (US)”, `he` → “Hebrew”, `de` → “German”, `fr` → “French”).
- **Persistence:** On save, update `brand_analysis_projects.analysis_languages`.
- **Default:** If empty, use current app language or `['en']` so existing behavior is unchanged.

### 2.2 “Select Countries/Regions for Analysis”

- **Purpose:** “Track your brand visibility in specific countries and regions.”
- **Copy:** “Select countries to generate geography-specific queries. If none selected, queries will be general (not country-specific).”
- **Control:** Multi-select for countries/regions (e.g. ISO 3166-1 alpha-2: US, GB, DE, FR, IL, IN, …).
- **Persistence:** `brand_analysis_projects.analysis_countries`.
- **Default:** Empty = general queries (current behavior).

### 2.3 Query count formula (informational)

- Text like:  
  “Each platform will have up to **200** queries distributed across **{N}** language(s) and **{M}** region(s). Total: **{P}** platform(s) × 200 = **{P × 200}** queries.”
- **Logic:**
  - `N = analysis_languages.length || 1`
  - `M = analysis_countries.length || 1` (treat “general” as 1 “region”)
  - `P = active_platforms.length`
  - Total = `P * 200` (or your chosen cap per platform).

You can later refine to “up to 200” = e.g. 50 per (language × region) or similar; the UI can stay the same and only the backend formula changes.

### 2.4 Where to place in the app

- In the project **details** view (or the step where user clicks “Launch Analysis”), above or next to the “Launch Analysis” button.
- Load/save with the rest of project settings so `analysis_languages` and `analysis_countries` are always in sync with what the user sees.

---

## Phase 3: Query Generation (Backend – Edge Function)

### 3.1 Extend `generateRealisticUserQueries`

**Current signature:**

```ts
generateRealisticUserQueries(brandName, industry, keywords, competitors, websiteUrl, language)
```

**New (backward compatible):**

```ts
generateRealisticUserQueries(
  brandName,
  industry,
  keywords,
  competitors,
  websiteUrl,
  language,
  options?: {
    languages?: string[];   // e.g. ['en-US', 'de']
    countries?: string[];   // e.g. ['US', 'GB', 'DE']
  }
)
```

- If `options?.countries` is missing or empty → keep current behavior (no country-specific instruction).
- If `options?.languages` is provided, you can either:
  - generate one set per language and concatenate, or
  - generate one set with “use these languages” and let the model mix (simpler).

### 3.2 Prompt changes for geography

When `countries` is non-empty, add to the system/user prompt for query generation, for example:

- “Generate queries as they would be asked by users in these countries/regions: **{US, UK, Germany}**. Include region-specific phrasing where natural (e.g. ‘in the UK’, ‘for the German market’, ‘best X in Germany’).”
- Optionally: “Roughly one third of queries should reflect US, one third UK, one third Germany” (or equal split by country).

Keep existing rules: no direct brand mention, conversational, 1–3 sentences, etc.

### 3.3 Number of queries and distribution

- Today: ~50 queries per run, same list for all platforms.
- Target (from your UI): “up to 200 queries per platform” distributed across N languages × M regions.

**Possible strategy:**

1. **Total queries to generate**
   - `queriesPerPlatform = 200` (or 50 if you want to keep volume lower at first).
   - If you have multiple (language, country) combinations, either:
     - **Option A:** Generate `queriesPerPlatform` total, with the prompt asking for a mix of regions/languages, or  
     - **Option B:** Generate e.g. `ceil(200 / (N * M))` per (language, country) and concatenate (max 200 per platform).

2. **Per platform**
   - Same query list is used for each platform (current behavior); only the *content* of the list becomes geography- (and optionally language-) aware.

3. **Backward compatibility**
   - If `analysis_countries` and `analysis_languages` are empty, call `generateRealisticUserQueries(..., language, undefined)` and keep current 50-query, single-language behavior.

### 3.4 Fallback (`generateFallbackQueries`)

- Extend fallback to accept `countries?: string[]` and append region-specific variants (e.g. “Best X in the UK”, “X for the German market”) when provided.

---

## Phase 4: Edge Function Wiring

### 4.1 Request body

- When starting analysis, frontend sends:
  - `projectId`, `platforms`, `language` (existing),
  - optionally `languages?: string[]`, `countries?: string[]`.
- Prefer reading **from project** in the edge function so one source of truth: after loading `project`, set  
  `languages = body.languages ?? project.analysis_languages ?? []`,  
  `countries = body.countries ?? project.analysis_countries ?? []`.

### 4.2 Where query generation is called

- In `runEnhancedBrandAnalysis` (and any other path that starts a full run), when calling `generateRealisticUserQueries`, pass:
  - `languages`: from project (or body).
  - `countries`: from project (or body).
- Use the same `languages`/`countries` when generating queries for the initial run and when resuming batches (if you pass pre-generated queries, they’re already region-specific; no change needed for batch continuation).

### 4.3 Session metadata (optional)

- When creating `brand_analysis_sessions`, you can store in `results_summary` or a new `session_metadata` JSONB:
  - `languages`, `countries` used for that run.
- Helps for “why did I get these queries?” and for future reporting (e.g. “visibility by region”).

---

## Phase 5: Optional – Per-query or per-response metadata

- **Option A:** Store with each generated query (e.g. in memory or in a new table) a `language` and `country` so reports can show “queries for UK” vs “queries for DE”.
- **Option B:** Store on `ai_platform_responses`: e.g. `response_metadata.language_region = 'en-GB'` or `{ language: 'en', country: 'GB' }`.
- This is optional and can be Phase 2 once the main flow works.

---

## Implementation Order (Checklist)

1. [ ] **DB migration** – Add `analysis_languages` and `analysis_countries` to `brand_analysis_projects` (and optionally to session).
2. [ ] **UI – Languages** – Multi-select for “Select Languages for Global Analysis”, save to `analysis_languages`.
3. [ ] **UI – Countries** – Multi-select for “Select Countries/Regions for Analysis”, save to `analysis_countries`, with note: “If none selected, queries will be general.”
4. [ ] **UI – Query count** – Display “Each platform will have up to 200 queries distributed across N language(s) and M region(s). Total: P platforms × 200 = X queries.”
5. [ ] **Edge function – Options** – Read `analysis_languages` and `analysis_countries` from project (or body); pass into query generation.
6. [ ] **Query generation – Geography** – Extend `generateRealisticUserQueries` with `options: { languages?, countries? }`; add region/country instruction to prompt when `countries` is non-empty.
7. [ ] **Query generation – Volume** – If needed, increase from 50 to e.g. 200 per run and/or distribute across language×region (same list used for all platforms).
8. [ ] **Fallback** – Extend `generateFallbackQueries` with optional `countries` for region-specific fallback queries.
9. [ ] **Testing** – Run with no countries (general), then with e.g. US + UK + DE and confirm queries mention regions where expected.
10. [ ] **(Optional)** – Store language/region on session or on `ai_platform_responses` for reporting.

---

## File / Component Reference

| What | Where |
|------|--------|
| Project table | `database/brand_analysis_tables.sql`, migrations |
| AI Visibility UI | `app/dashboard/ai-visibility/page.tsx` (project details, “Launch Analysis” flow) |
| Start analysis request | Same file: `fetch(.../brand-analysis`, body: `projectId`, `platforms`, `language`) |
| Query generation | `supabase/functions/brand-analysis/index.ts` – `generateRealisticUserQueries`, `generateFallbackQueries` |
| Run entry | `supabase/functions/brand-analysis/index.ts` – `runEnhancedBrandAnalysis`, initial POST handler |

---

## Summary

- **Data:** Add `analysis_languages` and `analysis_countries` on the project (or session).
- **UI:** Add language and country multi-selects plus the “200 queries × N languages × M regions” line.
- **Backend:** Pass languages/countries from project into `generateRealisticUserQueries`; add geography-specific instructions to the prompt when countries are selected; optionally increase query count and add per-query/per-response metadata later.

This gives you **geographic region–based query generation** for Brand Analysis in AI Visibility while keeping “no selection” = general queries and existing behavior intact.
