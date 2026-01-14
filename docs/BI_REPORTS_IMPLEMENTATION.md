# BI Reports Implementation Guide

## Overview

This document explains the three main BI reports identified in the PDF and provides implementation guidance for each.

---

## 📊 Report 1: Global Markets & Distribution Intelligence

### Purpose
Analyzes market presence, geographic distribution, and market penetration across different regions and platforms.

### Key Metrics & Sections

#### 1. **Geographic Market Analysis**
- **Primary Markets**: Countries/regions where the domain has strongest presence
- **Secondary Markets**: Emerging or developing markets
- **Market Penetration Score**: Calculated based on:
  - Search console data by country
  - AI visibility by region
  - Keyword rankings by geography
  - Content distribution by language/region

#### 2. **Distribution Channel Intelligence**
- **Platform Distribution**:
  - Organic search visibility (Google, Bing)
  - AI platform presence (ChatGPT, Gemini, Claude, Perplexity, Groq)
  - Social media mentions (Reddit, Quora, Medium, LinkedIn)
  - Content platforms distribution

#### 3. **Market Share by Geography**
- Traffic distribution by country
- Top performing keywords by region
- Content performance by market
- Conversion potential by geography

#### 4. **Language & Localization Analysis**
- Content language distribution
- Multi-language keyword opportunities
- Localization gaps and opportunities

### Data Sources Required
- `gsc_analytics` table (country dimension data)
- `domain_intelligence_jobs.results.geography`
- `ranking` table (geo-specific keywords)
- `content_strategy` (content by language/region)
- `domain_visibility_checks` (AI platform presence by region)

### Implementation Approach

```typescript
// New API endpoint: /api/reports/global-markets
interface GlobalMarketsReport {
  geography: {
    primary: string;
    secondary: string[];
    marketScores: Array<{
      country: string;
      penetrationScore: number;
      trafficShare: number;
      keywordCount: number;
      aiVisibility: number;
    }>;
  };
  distribution: {
    platforms: {
      organic: { google: number; bing: number };
      ai: { chatgpt: number; gemini: number; claude: number };
      social: { reddit: number; quora: number; medium: number };
    };
    channels: Array<{
      channel: string;
      share: number;
      growth: number;
    }>;
  };
  languageAnalysis: {
    languages: Array<{
      code: string;
      contentCount: number;
      keywordCount: number;
      trafficShare: number;
    }>;
    opportunities: string[];
  };
}
```

---

## 📈 Report 2: Competitive, Pricing & Trust Intelligence

### Purpose
Provides competitive analysis, pricing intelligence, and trust signal analysis to understand market position.

### Key Metrics & Sections

#### 1. **Competitive Landscape Analysis**
- **Direct Competitors**: Identified through:
  - Shared keyword rankings
  - Similar content topics
  - Overlapping market presence
- **Competitive Rankings**:
  - Keyword ranking comparison
  - Content volume comparison
  - Backlink comparison
  - Domain authority comparison

#### 2. **Pricing Intelligence**
- **Competitor Pricing Signals**:
  - Pricing mentions in content
  - Service tier information
  - Pricing page analysis
- **Market Positioning**:
  - Price point comparison
  - Value proposition analysis
  - Pricing strategy insights

#### 3. **Trust Signals Analysis**
- **Trust Indicators**:
  - SSL certificates and security
  - Privacy policy presence
  - Terms of service
  - Contact information visibility
  - Social proof (reviews, testimonials)
  - Brand mentions and sentiment
- **Trust Score**: Calculated from multiple signals
- **Trust Gap Analysis**: Areas where competitors outperform

#### 4. **Competitive Gap Analysis**
- **Keywords Where Competitors Rank Better**
- **Content Opportunities**: Topics competitors cover better
- **Platform Presence Gaps**: Where competitors have stronger presence
- **Trust Signal Gaps**: Trust indicators competitors have

### Data Sources Required
- `domain_intelligence_jobs.results.competitors`
- `domain_intelligence_jobs.results.keywords` (competitive keywords)
- `ranking` table (competitive rankings)
- Content analysis (pricing mentions, trust signals)
- Backlink data (if available)

### Implementation Approach

```typescript
// New API endpoint: /api/reports/competitive-intelligence
interface CompetitiveIntelligenceReport {
  competitors: {
    identified: Array<{
      domain: string;
      overlapScore: number;
      sharedKeywords: number;
      similarContent: number;
    }>;
    rankings: Array<{
      keyword: string;
      yourRank: number;
      competitorRanks: Array<{
        competitor: string;
        rank: number;
        gap: number;
      }>;
    }>;
  };
  pricing: {
    signals: Array<{
      competitor: string;
      pricingIndicators: string[];
      priceRange?: { min: number; max: number; currency: string };
    }>;
    marketPosition: {
      yourPosition: 'premium' | 'mid-market' | 'budget';
      competitorsPosition: Array<{
        competitor: string;
        position: string;
      }>;
    };
  };
  trust: {
    signals: Array<{
      domain: string;
      ssl: boolean;
      privacyPolicy: boolean;
      termsOfService: boolean;
      contactVisible: boolean;
      socialProof: number;
      trustScore: number;
    }>;
    gaps: Array<{
      indicator: string;
      competitors: string[];
      yourStatus: boolean;
    }>;
  };
  gaps: {
    keywords: Array<{
      keyword: string;
      competitor: string;
      theirRank: number;
      yourRank: number;
      opportunity: 'high' | 'medium' | 'low';
    }>;
    content: Array<{
      topic: string;
      competitors: string[];
      yourCoverage: number;
      competitorCoverage: number;
    }>;
  };
}
```

---

## 🎯 Report 3: Advanced BI, Risk, Funnel & Executive Intelligence

### Purpose
High-level executive dashboard with risk analysis, funnel metrics, and strategic insights for decision-makers.

### Key Metrics & Sections

#### 1. **Risk Intelligence**
- **SEO Risks**:
  - Toxic backlink patterns
  - Keyword cannibalization
  - Technical SEO issues
  - Penalty risk indicators
- **Content Risks**:
  - Duplicate content
  - Thin content pages
  - Content quality issues
- **Competitive Risks**:
  - Market share loss
  - Keyword position decline
  - Competitor threats
- **Risk Score**: Overall risk assessment (0-100)

#### 2. **Funnel Intelligence**
- **Traffic Funnel**:
  - Awareness (impressions, visibility)
  - Interest (clicks, engagement)
  - Consideration (content engagement, time on site)
  - Conversion (if tracking available)
- **Conversion Funnel by Channel**:
  - Organic search funnel
  - AI platform funnel
  - Social media funnel
- **Funnel Optimization Opportunities**:
  - Drop-off points
  - Optimization recommendations

#### 3. **Executive Summary**
- **KPIs Dashboard**:
  - Total visibility score
  - Average ranking position
  - Content performance score
  - AI visibility score
  - Risk score
- **Growth Metrics**:
  - Month-over-month growth
  - Quarter-over-quarter trends
  - Year-over-year comparison
- **Strategic Insights**:
  - Top opportunities
  - Key risks
  - Recommended actions
  - ROI projections

#### 4. **Performance Forecasting**
- **Predictive Analytics**:
  - Keyword ranking forecasts
  - Traffic projections
  - Content performance predictions
- **Scenario Analysis**:
  - Best case scenario
  - Worst case scenario
  - Most likely scenario

### Data Sources Required
- `domain_intelligence_jobs.results` (all analysis data)
- `gsc_analytics` (traffic, impressions, clicks, CTR)
- `ranking` table (historical rankings)
- `keyword` table (keyword forecasts if available)
- Risk indicators from domain intelligence

### Implementation Approach

```typescript
// New API endpoint: /api/reports/executive-intelligence
interface ExecutiveIntelligenceReport {
  risk: {
    seo: {
      toxicPatterns: string[];
      technicalIssues: Array<{ issue: string; severity: 'high' | 'medium' | 'low' }>;
      penaltyRisk: number; // 0-100
    };
    content: {
      duplicateContent: number;
      thinContent: number;
      qualityIssues: Array<{ type: string; count: number }>;
    };
    competitive: {
      marketShareTrend: 'up' | 'down' | 'stable';
      keywordDeclines: number;
      threats: Array<{ threat: string; impact: string }>;
    };
    overallRiskScore: number; // 0-100
  };
  funnel: {
    awareness: {
      impressions: number;
      visibilityScore: number;
      reach: number;
    };
    interest: {
      clicks: number;
      ctr: number;
      engagement: number;
    };
    consideration: {
      contentEngagement: number;
      timeOnSite: number;
      pagesPerSession: number;
    };
    conversion: {
      conversionRate?: number;
      conversions?: number;
      revenue?: number;
    };
    byChannel: {
      organic: FunnelStage;
      ai: FunnelStage;
      social: FunnelStage;
    };
    opportunities: Array<{
      stage: string;
      issue: string;
      recommendation: string;
      impact: string;
    }>;
  };
  executive: {
    kpis: {
      visibilityScore: number;
      avgRanking: number;
      contentScore: number;
      aiVisibilityScore: number;
      riskScore: number;
    };
    growth: {
      mom: { metric: string; change: number; trend: 'up' | 'down' }[];
      qoq: { metric: string; change: number; trend: 'up' | 'down' }[];
      yoy: { metric: string; change: number; trend: 'up' | 'down' }[];
    };
    insights: {
      opportunities: Array<{ title: string; description: string; impact: string }>;
      risks: Array<{ title: string; description: string; severity: string }>;
      actions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; timeframe: string }>;
      roiProjections: Array<{ initiative: string; projectedROI: number; timeframe: string }>;
    };
  };
  forecasting: {
    keywordRankings: Array<{
      keyword: string;
      currentRank: number;
      projectedRank: number;
      confidence: number;
    }>;
    traffic: {
      current: number;
      projected: number;
      growth: number;
    };
    scenarios: {
      bestCase: { metric: string; value: number }[];
      worstCase: { metric: string; value: number }[];
      mostLikely: { metric: string; value: number }[];
    };
  };
}
```

---

## 🛠️ Implementation Steps

### Step 1: Create Database Tables (if needed)

```sql
-- BI Reports Cache Table
CREATE TABLE IF NOT EXISTS bi_reports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'global_markets', 'competitive', 'executive'
  domain_url VARCHAR(500),
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bi_reports_user_type ON bi_reports_cache(user_id, report_type);
CREATE INDEX idx_bi_reports_domain ON bi_reports_cache(domain_url);
```

### Step 2: Create API Endpoints

1. **Global Markets Report**: `/app/api/reports/global-markets/route.ts`
2. **Competitive Intelligence Report**: `/app/api/reports/competitive-intelligence/route.ts`
3. **Executive Intelligence Report**: `/app/api/reports/executive-intelligence/route.ts`

### Step 3: Create Frontend Components

1. **Report Tabs**: Add three new tabs to `/app/dashboard/reports/page.tsx`:
   - Global Markets & Distribution
   - Competitive, Pricing & Trust
   - Advanced BI & Executive

2. **Report Components**: Create reusable components for each report section

### Step 4: Integrate with Domain Intelligence

Leverage existing `domain_intelligence_jobs` results to populate report data.

---

## 📝 Key Integration Points

### 1. Domain Intelligence Integration
- Use `domain_intelligence_jobs.results` for:
  - Geography data
  - Competitor data
  - Keyword data
  - Risk patterns
  - Site structure

### 2. Google Search Console Integration
- Use `gsc_analytics` for:
  - Country-level traffic
  - Device distribution
  - Query performance
  - Page performance

### 3. Ranking & Keyword Data
- Use `ranking` and `keyword` tables for:
  - Competitive rankings
  - Keyword performance
  - Ranking trends

### 4. Content Data
- Use `content_strategy` for:
  - Content distribution
  - Platform analysis
  - Content performance

---

## 🎨 UI/UX Recommendations

1. **Report Navigation**: Use tabs or accordion to switch between reports
2. **Data Visualization**: 
   - Use charts from Recharts (already in codebase)
   - Map visualizations for geographic data
   - Comparison tables for competitive data
3. **Export Options**: PDF and CSV export for each report
4. **Date Range Filters**: Allow filtering by time period
5. **Refresh Button**: Manual refresh for latest data
6. **Loading States**: Show progress for data generation

---

## 🔄 Caching Strategy

- Cache reports for 24 hours to reduce database load
- Allow manual refresh to generate fresh reports
- Store cache in `bi_reports_cache` table

---

## 📊 Report Generation Flow

1. User requests a report
2. Check cache for recent data
3. If cache exists and valid, return cached data
4. If cache expired or missing:
   - Fetch data from multiple sources
   - Process and aggregate data
   - Generate report structure
   - Cache the result
   - Return to user

---

This implementation will provide comprehensive BI reporting capabilities that leverage your existing data infrastructure while adding new insights for strategic decision-making.
