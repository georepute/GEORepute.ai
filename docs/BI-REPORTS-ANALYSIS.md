# BI Reports PDF – Analysis & Implementation Map

## 1. What the PDF Contains

The **Bi REPOTRTS.pdf** defines **70 reports** in **4 main groups**:

| Group | Reports | Category focus |
|-------|--------|----------------|
| **Core Visibility & Representation** | 1–12 | GEO visibility, AI presence, brand narrative, search intent, gaps, opportunity, content impact, premium topics, alerts, CPC |
| **Global Markets & Distribution** | 13–24 | Global visibility matrix, regional strength, distributor mapping/sales/trust/dependency, sales reality, cannibalization, country brand, market entry, competitive density |
| **Competitive, Pricing & Trust** | 25–36 | Market leadership, message alignment, pricing perception, trust gap, opportunity hotspots, voice share, brand competition, confusion index, reputation momentum, trust killers, price justification, authority signals |
| **Advanced BI, Risk, Funnel & Executive** | 37–70 | Blind spots, decision barriers, buyer confidence, narrative fragility, opportunity cost, market truth vs belief, revenue leakage, trust decay, strategic silence, default vendor, replaceability, authority ceiling, hidden influencers, narrative hijack, lost deal autopsy, complexity, timing, over-promise, exit signals, trust fragmentation, social authority, narrative control, competitor social dominance, social trust, funnel overview, awareness/consideration/decision, post-decision reinforcement, advocacy, memory strength, long-term risk, shock summary |

Each report in the PDF has:
- **Report name**
- **What we see** (metric/view)
- **Data sources** (GSC, GA4, AI, etc.)
- **Cross-analysis** (how it’s computed)
- **Business meaning** (what it tells you)
- **Decision insight** (what to do)
- **UI** (suggested widget: Table, Chart, List, Gauge, etc.)

---

## 2. What Is Fully Implemented Today (One “Comprehensive” Report)

The app has **one Reports page** (`/dashboard/reports`) that builds **one combined BI report** by pulling:

- **Keywords** → `keyword`, `ranking`
- **Content** → `content_strategy`, `published_content`, `performance_snapshots`
- **Brand / AI visibility** → `brand_analysis_projects`, `brand_analysis_sessions`, `ai_platform_responses`

That single report currently **covers** (in one scrollable view):

| PDF report idea | Implemented? | Where in current UI |
|-----------------|-------------|---------------------|
| **#1 GEO Visibility & Market Coverage** (demand vs visibility) | **Partial** | Keywords + rankings + “visibility” by platform; no explicit “regional table” or demand vs visibility cross-analysis |
| **#2 AI Search Presence** | **Partial** | “Brand projects” + AI platform responses; no “AI engine cards” or “how AI describes the brand” |
| **#9 Content Impact & Alignment** | **Partial** | Content by platform, status, recent content; no intent/AI alignment |
| **#11 Executive Risk & Alerts** | **No** | No “alerts feed” or dangerous changes |
| **#12 Search Cost (CPC)** | **No** | No CPC data |
| **Competitor comparison** (rankings, content volume, gaps) | **Yes** | “Competitor Comparison Report” block (rankings, content volume, gap analysis) |
| **Content calendar / backlog** | **Yes** | “Content Calendar Forecast” (upcoming, gaps, cadence, backlog) |
| **Brand / AI visibility summary** | **Yes** | Projects, sessions, responses by platform, performance radar |

So in practice:

- **Fully implemented as distinct sections:**  
  Competitor Comparison, Content Calendar/Backlog, Keywords summary, Content summary, Brand/AI visibility summary, Performance radar, Export (CSV/PDF), Email share, Public link.
- **Partially implemented (same data, different framing):**  
  GEO visibility (#1), AI presence (#2), Content impact (#9).
- **Not implemented:**  
  The other ~60+ reports (no separate data fetches or UI blocks for each).

---

## 3. How to Put “All Reports” in One Reports Page (UI Strategy)

You don’t need 70 separate pages. One **Reports** page can host all reports using **one page, many sections**, with navigation so users can jump to what they need.

### Option A: Category tabs + report list (recommended)

- **Top level:** Tabs matching the PDF groups (e.g. “Core”, “Global & Distribution”, “Competitive & Trust”, “Advanced & Funnel”).
- **Inside each tab:** List or grid of **report cards** (one card = one of the 70 reports).
- **Clicking a card:** Either:
  - **Expand in place** (accordion): that report’s content (table/chart) opens below the card, or
  - **Scroll to section**: same page, one long scroll; the card scrolls to the right section.
- **State:** “Current report” or “expanded report” so only one (or a few) are open at a time.

Result: one URL (`/dashboard/reports`), one page, but clear “50+ reports” entry points and no clutter.

### Option B: Sidebar report index

- **Left sidebar:** List of all 70 report names, optionally grouped by the 4 categories.
- **Main area:** Shows the **selected report** (single report view).
- **URL:** Optional: `/dashboard/reports?report=12` or `/dashboard/reports/opportunity-blind-spots` so each report is linkable.

Still “one reports page” from a product perspective; the sidebar is the index.

### Option C: Cards only (no tabs)

- One long page with **4 sections** (same as PDF).
- Each section has a **grid of cards** (e.g. 3 columns).
- Each card: report name, 1-line description, “View” or “Expand”.
- Click = expand that card into a full report block (table/chart) below or in a modal.

Good if you want a “catalog” feel and don’t want tabs.

### Option D: Dashboard “report selector” at top

- At the top: **Dropdown or search:** “Choose a report” with all 70 names (grouped).
- Below: **One big block** that shows the selected report’s content.
- Breadcrumb or subtitle: “Core > Opportunity & Blind Spots”.

Still one page; the selector drives what’s shown.

---

## 4. Recommended Structure for “One Reports Page”

1. **Single route:** Keep `/dashboard/reports` as the only reports page.
2. **Top:** Date range (7d / 30d / 90d) and primary filters (same as now).
3. **Navigation:** Tabs = 4 groups (Core, Global & Distribution, Competitive & Trust, Advanced & Funnel). Optional: “All” or “Favorites”.
4. **Content per tab:** List of report cards. Each card:
   - Title (e.g. “GEO Visibility & Market Coverage”)
   - Short “Decision insight” (from PDF)
   - Badge: “Implemented” / “Coming soon” / “Partial”
   - Action: “View” → scroll to section or expand in place.
5. **Report blocks:** Only **implemented** reports render real data. Others can show “Coming soon” or a short description + “Notify me” (no backend yet).
6. **URL:** e.g. `?category=core&report=1` so “Report #1” is linkable and bookmarkable.

That way:
- “All reports” live in **one reports page**.
- Users see the full list (50+) without 50+ pages.
- You can add new reports over time as “new cards” that either show real data or “Coming soon”.

---

## 5. PDF Report-by-Report: What’s Implemented in BI Reports

Below, **Implemented** = data + UI exist and match the report idea. **Partial** = same data used but not the full PDF report (e.g. no regional table, no AI engine cards). **Not** = no dedicated data or UI.

### Core Visibility & Representation (Reports 1–12)

| # | PDF Report Name | Status | Notes in app |
|---|------------------|--------|--------------|
| 1 | GEO Visibility & Market Coverage | **Partial** | Keywords, rankings, visibility by platform; no regional table or demand vs visibility |
| 2 | AI Search Presence | **Implemented** | AI engine cards, presence by engine, How AI describes your brand snippets, project selector “AI engine cards” or “how AI describes the brand” |
| 3 | Brand Narrative & Perception | **Implemented** | Narrative table (Desired vs Observed), brand voice + AI/content |
| 4 | Search Intent Intelligence | **Implemented** | Intent table (Intent vs Presence from keywords) |
| 5 | AI vs Google Gap | **Not** | — |
| 6 | Query & Question Intelligence | **Not** | — |
| 7 | Market Share of Attention | **Not** | — |
| 8 | Opportunity & Blind Spots | **Not** | (Gap analysis exists in Competitor block but not this report) |
| 9 | Content Impact & Alignment | **Partial** | Content by platform, status, recent; no intent/AI alignment |
| 10 | Premium Topic Control | **Not** | — |
| 11 | Executive Risk & Alerts | **Not** | — |
| 12 | Search Cost Intelligence (CPC) | **Not** | — |

### Global Markets & Distribution (Reports 13–24)

| # | PDF Report Name | Status |
|---|------------------|--------|
| 13 | Global Visibility Matrix | **Not** |
| 14 | Regional Strength Comparison | **Not** |
| 15 | Distributor Mapping | **Not** |
| 16 | Distributor Sales Geography | **Not** |
| 17 | Distributor Customer Profile | **Not** |
| 18 | Distributor Brand Alignment | **Not** |
| 19 | Distributor Dependency Risk | **Not** |
| 20 | Sales Geography Reality Check | **Not** |
| 21 | Internal Market Cannibalization | **Not** |
| 22 | Country Brand Definition | **Not** |
| 23 | Market Entry Readiness | **Not** |
| 24 | Competitive Density per Market | **Not** |

### Competitive, Pricing & Trust (Reports 25–36)

| # | PDF Report Name | Status | Notes in app |
|---|------------------|--------|--------------|
| 25 | Market Leadership Perception | **Not** | — |
| 26 | Cross-Market Message Alignment | **Not** | — |
| 27 | Global Pricing Perception | **Not** | — |
| 28 | Distributor vs Brand Trust Gap | **Not** | — |
| 29 | Regional Opportunity Hotspots | **Not** | — |
| 30 | Market Voice Share | **Not** | — |
| 31 | Internal Brand Competition | **Not** | — |
| 32 | Market Confusion Index | **Not** | — |
| 33 | Reputation Momentum Index | **Not** | — |
| 34 | Trust Killers | **Not** | — |
| 35 | Price Justification Gap | **Not** | — |
| 36 | Authority Signals Scan | **Not** | — |

**Implemented in app (not a single PDF report number):**  
- **Competitor Comparison** (rankings vs competitors, content volume, gap analysis) – lives in Core tab as one block; conceptually overlaps competitive/gap ideas.

### Advanced BI, Risk, Funnel & Executive (Reports 37–70)

| # | PDF Report Name | Status |
|---|------------------|--------|
| 37–70 | All (Strategic Blind Spots, Decision Barrier Analysis, Buyer Confidence Killers, Narrative Fragility, Opportunity Cost Blindness, Market Truth vs Belief, Invisible Revenue Leakage, AI Trust Decay, Strategic Silence Risk, Default Vendor Threat, Replaceability Index, Authority Ceiling, Hidden Decision Influencers, Competitive Narrative Hijack, Lost Deal Autopsy, Perceived Complexity Tax, Strategic Timing Window, Over-Promise Detector, Competitive Exit Signals, Global Trust Fragmentation, Social Authority vs AI, Social Narrative Control, Competitor Social Dominance, Social Trust Signals, Social-to-Purchase Influence, Reputation Funnel Overview, Awareness Entry Gaps, Consideration Drop Zones, Decision Confidence Index, Post-Decision Reinforcement, Advocacy Readiness, Memory Strength, Long-Term Reputation Risk, Shock Summary, etc.) | **Not** |

**Implemented in app (aggregate, not per-PDF report):**  
- **Content Calendar Forecast** (upcoming content, content gaps, publishing cadence, backlog) – one block in Core tab.  
- **Performance Overview** (radar: keyword rankings, brand projects, content output, platforms, engagement).  
- **Export** (CSV, PDF) and **Share** (email, public link).

---

## 6. Short Summary: Implemented vs Not

**Fully implemented (data + UI on current Reports page):**

- **#2 AI Search Presence** (AI engine cards, presence by engine, How AI describes your brand, project selector)
- **#3 Brand Narrative & Perception** (Narrative table: Desired vs Observed, brand voice + AI/content)
- **#4 Search Intent Intelligence** (Intent table: Intent vs Presence from keywords, rule-based intent classification)
- **Competitor Comparison** (rankings, content volume, gap analysis)
- **Content Calendar / Backlog** (upcoming, gaps, cadence, backlog stats)
- **Keywords summary** (total, avg ranking, top keywords, trend)
- **Content summary** (by platform, status, recent)
- **Brand / AI visibility** (projects, sessions, responses by platform)
- **Performance radar** (keyword rankings, brand projects, content output, platforms, engagement)
- **Export** (CSV, PDF) and **share** (email, public link)

**Partially implemented (same data, could be relabeled to match PDF):**

- **#1** GEO Visibility & Market Coverage – keywords + rankings + visibility
- **#9** Content Impact & Alignment – content by platform/status

**Not implemented (no dedicated data or UI):**

- **#4–8, #10–12** (Core)
- **#13–24** (Global & Distribution)
- **#25–36** (Competitive, Pricing & Trust)
- **#37–70** (Advanced BI, Risk, Funnel & Executive)

---

## 7. Summary

- **PDF:** 70 reports in 4 groups; each with name, data sources, logic, insight, and suggested UI.
- **App today:** One “Comprehensive BI Report” that **fully** implements competitor comparison, content calendar/backlog, keywords, content, brand/AI visibility, performance radar, and export/share; it **partially** overlaps a few PDF reports (#1, #2, #9); the rest are **not** implemented.
- **One Reports page for “all reports”:** Use one route (`/dashboard/reports`) with **category tabs** and **report cards** (or sidebar index / report selector). Each of the 70 reports is a card; only implemented ones show real data; the rest can show “Coming soon.” That gives a single place for all 50+ reports without 50+ separate pages.

If you tell me whether you prefer **tabs + cards** or **sidebar + single report view**, I can outline the exact components and state (e.g. `category`, `reportId`) for your codebase.

---

## 8. Full Implementation Checklist (from Bi REPOTRTS.pdf – Nothing Missed)

Use this section to ensure every report from the PDF is tracked. For each report: **What We See** = metric/view in PDF; **Data Sources** = PDF; **Cross-Analysis** = PDF; **UI** = suggested widget in PDF; **Status** = current app; **To Implement** = what is missing.

### Core Visibility & Representation (1–12)

| # | Report Name | What We See | Data Sources | Cross-Analysis | UI | Status | To Implement |
|---|-------------|-------------|--------------|----------------|-----|--------|--------------|
| 1 | GEO Visibility & Market Coverage | Where demand exists but visibility is missing | GSC, GA4, GEO Score, AI Sampling | Demand vs Organic vs AI | Regional Table | Partial | Regional table; demand vs visibility cross-analysis |
| 2 | AI Search Presence | How AI describes the brand | AI Engines, Query Sets | Google vs AI Context | AI Engine Cards | **Implemented** | — |
| 3 | Brand Narrative & Perception | The actual narrative in practice | AI, Snippets, Admin Narrative | Desired vs Observed Narrative | Narrative Table | **Implemented** | — |
| 4 | Search Intent Intelligence | User intent | GSC, NLP, GA4 | Intent vs Presence | Intent Table | **Implemented** | Intent classification from keywords, intent table (Intent \| Query count \| With presence \| Gap \| Coverage) |
| 5 | AI vs Google Gap | Representation gap | GSC, AI Engines | Same query comparison | Gap Table | Not | Same-query AI vs organic comparison, gap table |
| 6 | Query & Question Intelligence | How people really ask | GSC, NLP | Questions vs Coverage | Questions Table | Not | Questions extraction, coverage, table |
| 7 | Market Share of Attention | Who controls attention | AI Mentions, Organic Proxy | Attention vs Narrative | Share Chart | Not | Attention metrics, share chart |
| 8 | Opportunity & Blind Spots | Demand + CPC + Gap | GSC, AI, CPC | Demand + CPC vs Gap | Opportunity Table | Not | CPC data, demand+CPC vs gap, table |
| 9 | Content Impact & Alignment | What actually influences | Content, GSC, GA4, AI | Content vs Intent vs AI | Pages Table | Partial | Intent/AI alignment, pages table |
| 10 | Premium Topic Control | Control over money topics | Admin Topics, CPC, AI | Control score formula | Control Table | Not | Admin topics, CPC, control score, table |
| 11 | Executive Risk & Alerts | Dangerous changes | Deltas, AI Shifts | Change vs Severity | Alerts Feed | Not | Change detection, severity, alerts feed |
| 12 | Search Cost Intelligence (CPC) | Cost of missing visibility | Google Ads CPC | CPC vs Presence | CPC Columns | Not | CPC data source, CPC vs presence, columns |

### Global Markets & Distribution (13–24)

| # | Report Name | What We See | Data Sources | Cross-Analysis | UI | Status | To Implement |
|---|-------------|-------------|--------------|----------------|-----|--------|--------------|
| 13 | Global Visibility Matrix | Strength by country | Presence vs AI, GSC | Demand | Country Table | Not | Geo/country data, matrix, table |
| 14 | Regional Strength Comparison | Regional comparison | Region vs AI, GSC | Internal power gaps | Comparison Table | Not | Regional data, comparison table |
| 15 | Distributor Mapping | Who actually distributes | Distributor Sites, LinkedIn | Brand vs Distributor | Distributor Table | Not | Distributor data, table |
| 16 | Distributor Sales Geography | Where sales actually happen | Distributor Sites, AI | Declared vs Observed | Geo Table | Not | Distributor geo, declared vs observed |
| 17 | Distributor Customer Profile | Who they sell to | Cases, LinkedIn | Segment vs Market | Segment Table | Not | Distributor/customer data, table |
| 18 | Distributor Brand Alignment | Brand representation | Brand vs Distributor Text | Message drift | Gap List | Not | Distributor text, alignment, list |
| 19 | Distributor Dependency Risk | Dangerous dependency | Brand vs AI Mentions | Identity loss | Dependency Table | Not | Dependency metrics, table |
| 20 | Sales Geography Reality Check | Reporting gap | AI, GSC, Internal Data | Reported vs Reality | Reality Table | Not | Internal vs reported data, table |
| 21 | Internal Market Cannibalization | Overlapping markets | AI Overlap, Queries | Market overlap | Overlap Table | Not | Overlap detection, table |
| 22 | Country Brand Definition | Different brand definition | AI per Country | Definition drift | Country Table | Not | Per-country AI, definition drift |
| 23 | Market Entry Readiness | Market maturity | Demand vs AI, Competition | Entry timing | Readiness Score | Not | Entry metrics, readiness score |
| 24 | Competitive Density per Market | Competitive density | AI Mentions | Density | Density Index | Not | Per-market density, index |

### Competitive, Pricing & Trust (25–36)

| # | Report Name | What We See | Data Sources | Cross-Analysis | UI | Status | To Implement |
|---|-------------|-------------|--------------|----------------|-----|--------|--------------|
| 25 | Market Leadership Perception | Who is perceived leader | AI Language Signals | Leadership signals | Leader List | Not | Leadership signals, list |
| 26 | Cross-Market Message Alignment | Message consistency | AI, Content | Message drift | Alignment Table | Not | Cross-market message, alignment |
| 27 | Global Pricing Perception | Price perception | AI, Comparisons | Value vs Price | Pricing Table | Not | Pricing/perception data, table |
| 28 | Distributor vs Brand Trust Gap | Trust split | AI Language | Brand vs Distributor trust | Trust Table | Not | Trust metrics, table |
| 29 | Regional Opportunity Hotspots | Demand without supply | Queries, AI | Demand vs Supply | Hotspot List | Not | Hotspots, list |
| 30 | Market Voice Share | Control of conversation | AI Mentions vs Competitors | Voice loss | Bar Chart | Not | Voice share, bar chart |
| 31 | Internal Brand Competition | Internal cannibalization | Product AI | Confusion Overlap | Product Table | Not | Product-level overlap, table |
| 32 | Market Confusion Index | Market confusion | AI Consistency | Contradictions | Confusion Score | Not | Consistency/contradictions, score |
| 33 | Reputation Momentum Index | Reputation direction | Time Deltas | Trend | Trend Gauge | Not | Time deltas, trend gauge |
| 34 | Trust Killers | Dangerous phrases | AI Language Detection | Deal killers | Red Flag List | Not | Phrase detection, red-flag list |
| 35 | Price Justification Gap | Price without explanation | AI, Queries | Price vs Narrative | Gap Table | Not | Price vs narrative, table |
| 36 | Authority Signals Scan | Who builds authority | Links, Mentions | Authority sources | Source List | Not | Authority sources, list |

### Advanced BI, Risk, Funnel & Executive (37–70)

| # | Report Name | What We See | Data Sources | Cross-Analysis | UI | Status | To Implement |
|---|-------------|-------------|--------------|----------------|-----|--------|--------------|
| 37 | Strategic Blind Spots | Topics asked without brand presence | GSC, AI | Demand vs Absence | Gap Topic Table | Not | Blind-spot topics, table |
| 38 | Decision Barrier Analysis | What blocks decisions | AI Objections | Objections vs Stage | Barrier List | Not | Objections, stage, list |
| 39 | Buyer Confidence Killers | Confidence-reducing phrases | AI Language Patterns | Confidence vs Alternatives | Red-Flag List | Not | Confidence phrases, list |
| 40 | Narrative Fragility Index | How fragile the story is | AI Consistency | Narrative depth vs attack | Fragility Gauge | Not | Fragility metric, gauge |
| 41 | Opportunity Cost Blindness | Unused value | Unanswered Queries, CPC | Demand + CPC vs Zero Presence | Loss Table | Not | Opportunity cost, table |
| 42 | Market Truth vs Internal Belief | Leadership perception gap | Brand Claims, AI | Belief vs Reality | Reality Table | Not | Belief vs reality, table |
| 43 | Invisible Revenue Leakage | Perceptual revenue leaks | AI Gaps | High intent vs no presence | Leakage Map | Not | Leakage metrics, map |
| 44 | AI Trust Decay Monitor | Trust erosion over time | Time-Based AI Output | Tone shift | Trend Line | Not | Trust trend, line |
| 45 | Strategic Silence Risk | Sensitive unanswered topics | AI, GSC | Silence vs Sensitivity | Silence List | Not | Silence/sensitivity, list |
| 46 | Default Vendor Threat | Market default choice | AI Default Language | Default vs Brand | Default Table | Not | Default language, table |
| 47 | Replaceability Index | How replaceable we are | AI Alternatives | Substitutes vs Differentiation | Score | Not | Replaceability, score |
| 48 | Authority Ceiling Analysis | Authority limit | AI Qualifiers | Positive vs Limiting Language | Factors List | Not | Ceiling factors, list |
| 49 | Hidden Decision Influencers | Invisible influencers | AI Citations | Influence vs Brand | Influencer List | Not | Influencers, list |
| 50 | Competitive Narrative Hijack | Competitor owns story | AI "best for" | Narrative owner | Narrative Table | Not | Narrative ownership, table |
| 51 | Lost Deal Autopsy | Why deals are lost | AI "why not choose" | Objections vs Competitors | Loss Reasons | Not | Lost-deal reasons |
| 52 | Perceived Complexity Tax | Product seen as complex | AI Setup Language | Complexity vs Alternatives | Complexity Factors | Not | Complexity factors |
| 53 | Strategic Timing Window | Market readiness timing | Query Evolution | Info → Decision Shift | Timeline | Not | Timing, timeline |
| 54 | Market Over-Promise Detector | Risky promises | AI Guarantee Language | Claims vs Evidence | Over-Promise List | Not | Over-promise list |
| 55 | Competitive Exit Signals | Competitors weakening | AI Mention Decline | Trend vs Market | Exit Table | Not | Exit signals, table |
| 56 | Global Trust Fragmentation | Uneven trust globally | AI Tone by Region | Trust geography | Regional Table | Not | Trust by region |
| 57 | Social Authority vs AI | Authority Social–AI gap | Social Data, AI Experts | Social vs AI leaders | Gap Table | Not | Social vs AI authority |
| 58 | Social Narrative Control | Who controls narrative | Posts, Comments, AI Echo | Narrative vs Brand | Owner List | Not | Narrative control, list |
| 59 | Competitor Social Dominance | Competitor dominance | Engagement, Topics | Topic dominance | Dominance Matrix | Not | Social dominance, matrix |
| 60 | Social Trust Signals & Risks | Trust and warnings | Comments, Sentiment | Positive vs Negative | Signal List | Not | Social trust signals |
| 61 | Social-to-Purchase Influence | Social drives purchase | Social Mentions, AI Queries | Trigger → Decision | Flow | Not | Social-to-purchase flow |
| 62 | Reputation Funnel Overview | Reputation funnel view | All Reports | Awareness → Decision | Funnel Diagram | Not | Funnel aggregation, diagram |
| 63 | Awareness Entry Gaps | Missing awareness entry | Top Queries, AI | Demand vs Zero Awareness | Entry Table | Not | Entry gaps, table |
| 64 | Consideration Drop Zones | Where users drop | Comparison Queries | Interest vs Abandonment | Drop List | Not | Drop zones, list |
| 65 | Decision Confidence Index | Confidence before purchase | AI Certainty Language | Confidence vs Alternatives | Confidence Gauge | Not | Confidence gauge |
| 66 | Post-Decision Reinforcement | After-choice trust | AI "after choosing" | Decision → Reassurance | Signals | Not | Post-decision signals |
| 67 | Advocacy Readiness | Recommendation readiness | AI Advocacy Language | Satisfaction vs Endorsement | Indicators | Not | Advocacy indicators |
| 68 | Memory Strength | Brand recall strength | AI Recall Language | Recall vs Competitors | Memory Score | Not | Memory score |
| 69 | Long-Term Reputation Risk | Accumulating risks | All Deltas, Trends | Risk accumulation | Horizon View | Not | Long-term risk view |
| 70 | Shock Summary | Unfiltered truth | Top Critical Reports | Synthesis of gaps | One-Page Brief | Not | Executive one-pager |

### Summary Counts

- **Implemented:** 2 (AI Search Presence, Brand Narrative & Perception).
- **Partial:** 2 (GEO Visibility & Market Coverage, Content Impact & Alignment).
- **Not (dedicated report):** 65.  
- **Other blocks in app:** Competitor Comparison, Content Calendar, Keywords summary, Content summary, Brand/AI visibility summary, Performance radar, Export, Share – these cover aspects of several PDF reports but are not 1:1 with a single PDF report number.
