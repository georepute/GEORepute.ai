# KF2 Workflow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                   (app/dashboard/kf2/page.tsx)                  │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Generate   │  │   Keyword    │  │     Forecasts       │  │
│  │    Ideas    │  │    Plans     │  │                     │  │
│  │             │  │              │  │                     │  │
│  │  • URL      │  │  • View All  │  │  • Impressions     │  │
│  │    Input    │  │    Plans     │  │  • Clicks          │  │
│  │  • Select   │  │  • Create    │  │  • CTR             │  │
│  │    Keywords │  │    New       │  │  • CPC             │  │
│  │  • Preview  │  │  • Details   │  │  • Cost            │  │
│  │    Metrics  │  │              │  │  • Summary Stats   │  │
│  │             │  │              │  │                     │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘  │
│         │                │                     │              │
└─────────┼────────────────┼─────────────────────┼──────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API ROUTES                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ POST         │  │ POST         │  │ GET                │  │
│  │ generate-    │  │ create-plan  │  │ get-forecast       │  │
│  │ ideas        │  │              │  │                    │  │
│  │              │  │ GET          │  │ Fetches forecast   │  │
│  │ Returns      │  │ get-plans    │  │ metrics from       │  │
│  │ keyword      │  │              │  │ Google Ads API     │  │
│  │ suggestions  │  │ Stores and   │  │ or mock data       │  │
│  │ with metrics │  │ retrieves    │  │                    │  │
│  │              │  │ plans        │  │                    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────┘  │
│         │                 │                     │             │
└─────────┼─────────────────┼─────────────────────┼─────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │          Google Ads API (Optional)                     │   │
│  │                                                         │   │
│  │  • KeywordPlanIdeaService (UrlSeed)                   │   │
│  │  • KeywordPlanService (Create Plans)                  │   │
│  │  • ForecastService (Get Metrics)                      │   │
│  │                                                         │   │
│  │  Note: Falls back to mock data if not configured      │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                  Supabase Database                      │   │
│  │                                                         │   │
│  │  Table: keyword_plans                                  │   │
│  │  - id (UUID)                                           │   │
│  │  - user_id (FK to auth.users)                         │   │
│  │  - name (TEXT)                                         │   │
│  │  - keywords (TEXT[])                                   │   │
│  │  - google_ads_plan_id (TEXT)                          │   │
│  │  - created_at, updated_at (TIMESTAMPTZ)               │   │
│  │                                                         │   │
│  │  RLS: Users can only access their own plans           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## User Workflow

```
START
  │
  ├─► Step 1: Navigate to Dashboard → Google Ads Manager
  │
  ├─► Step 2: Generate Ideas
  │    │
  │    ├─► Enter website URL
  │    ├─► Click "Generate Ideas"
  │    ├─► API calls KeywordPlanIdeaService
  │    ├─► Receive keyword suggestions with:
  │    │    • Average monthly searches
  │    │    • Competition level
  │    │    • Bid estimates
  │    └─► Display results
  │
  ├─► Step 3: Select Keywords
  │    │
  │    ├─► Click keywords to select
  │    ├─► Multiple selection supported
  │    └─► Visual feedback (checkboxes)
  │
  ├─► Step 4: Create Plan
  │    │
  │    ├─► Enter plan name
  │    ├─► Click "Create Plan"
  │    ├─► API stores in database
  │    ├─► (Optional) Syncs with Google Ads
  │    └─► Success notification
  │
  ├─► Step 5: View Plans
  │    │
  │    ├─► Switch to "Keyword Plans" tab
  │    ├─► See all saved plans
  │    └─► View plan details
  │
  └─► Step 6: Get Forecast
       │
       ├─► Click "Get Forecast" on a plan
       ├─► API calls ForecastService
       ├─► Receive metrics:
       │    • Impressions
       │    • Clicks
       │    • CTR
       │    • Average CPC
       │    • Estimated cost
       ├─► Display in table format
       └─► Show summary statistics
  
END
```

## Data Flow

### 1. Generate Ideas Flow

```
User Input (URL)
      │
      ▼
Frontend (page.tsx)
      │
      ├─► POST /api/kf2/generate-ideas
      │   └─► Request: { url: "https://example.com" }
      │
      ▼
API Route (generate-ideas/route.ts)
      │
      ├─► Check Google Ads API credentials
      │
      ├─► IF configured:
      │   └─► Call KeywordPlanIdeaService.generateKeywordIdeas()
      │
      ├─► ELSE:
      │   └─► Generate mock data
      │
      ▼
Response
      │
      └─► { 
            success: true,
            ideas: [
              {
                text: "keyword",
                avgMonthlySearches: 12000,
                competition: "HIGH",
                lowTopOfPageBid: 2.5,
                highTopOfPageBid: 8.5
              },
              ...
            ]
          }
      │
      ▼
Frontend displays results
```

### 2. Create Plan Flow

```
User Input (Plan Name + Selected Keywords)
      │
      ▼
Frontend (page.tsx)
      │
      ├─► POST /api/kf2/create-plan
      │   └─► Request: {
      │         planName: "Q1 Campaign",
      │         keywords: ["keyword 1", "keyword 2", ...]
      │       }
      │
      ▼
API Route (create-plan/route.ts)
      │
      ├─► Authenticate user
      │   └─► Get user_id from session
      │
      ├─► (Optional) Create plan in Google Ads
      │   └─► Call KeywordPlanService.create()
      │
      ├─► Store in Supabase
      │   └─► INSERT INTO keyword_plans
      │
      ▼
Response
      │
      └─► {
            success: true,
            plan: {
              id: "uuid",
              name: "Q1 Campaign",
              keywords: [...],
              google_ads_plan_id: "plan_id",
              created_at: "timestamp"
            }
          }
      │
      ▼
Frontend updates plans list
```

### 3. Get Forecast Flow

```
User Action (Click "Get Forecast")
      │
      ▼
Frontend (page.tsx)
      │
      ├─► GET /api/kf2/get-forecast?planId=uuid
      │
      ▼
API Route (get-forecast/route.ts)
      │
      ├─► Authenticate user
      │
      ├─► Fetch plan from database
      │   └─► SELECT * FROM keyword_plans WHERE id = ?
      │
      ├─► (Optional) Get forecast from Google Ads
      │   └─► Call KeywordPlanService.generateForecast()
      │
      ├─► OR generate mock forecasts
      │
      ▼
Response
      │
      └─► {
            success: true,
            forecasts: [
              {
                keyword: "keyword 1",
                impressions: 50000,
                clicks: 2500,
                ctr: 0.05,
                avgCpc: 2.5,
                cost: 6250
              },
              ...
            ]
          }
      │
      ▼
Frontend displays forecast table
```

## Security Flow

```
API Request
      │
      ├─► Extract session token from cookies
      │
      ├─► Validate with Supabase
      │   └─► supabase.auth.getUser(token)
      │
      ├─► IF invalid:
      │   └─► Return 401 Unauthorized
      │
      ├─► Get user_id from session
      │
      ├─► Database query with RLS
      │   └─► Automatically filters by user_id
      │
      └─► Return authorized data only
```

## Component Hierarchy

```
KF2Page (page.tsx)
│
├─── State Management
│    ├─── activeTab
│    ├─── websiteUrl
│    ├─── keywordIdeas
│    ├─── selectedKeywords
│    ├─── keywordPlans
│    ├─── forecasts
│    └─── loading states
│
├─── Header
│    ├─── Icon
│    └─── Title + Description
│
├─── Tabs
│    ├─── Generate Ideas
│    ├─── Keyword Plans
│    └─── Forecasts
│
├─── Tab Content: Generate Ideas
│    ├─── URL Input Section
│    │    ├─── Input field
│    │    └─── Generate button
│    │
│    ├─── Results Section
│    │    └─── Keyword Cards
│    │         ├─── Checkbox
│    │         ├─── Keyword text
│    │         ├─── Search volume
│    │         ├─── Competition badge
│    │         └─── Bid range
│    │
│    └─── Create Plan Section
│         ├─── Plan name input
│         └─── Create button
│
├─── Tab Content: Keyword Plans
│    ├─── Loading state
│    ├─── Empty state
│    └─── Plans Grid
│         └─── Plan Cards
│              ├─── Plan name
│              ├─── Creation date
│              ├─── Keyword count
│              ├─── Keyword preview
│              └─── Get Forecast button
│
└─── Tab Content: Forecasts
     ├─── Empty state
     └─── Forecast Display
          ├─── Metrics Table
          │    ├─── Keyword column
          │    ├─── Impressions column
          │    ├─── Clicks column
          │    ├─── CTR column
          │    ├─── CPC column
          │    └─── Cost column
          │
          └─── Summary Stats Cards
               ├─── Total Impressions
               ├─── Total Clicks
               ├─── Average CTR
               └─── Total Cost
```

## Integration Points

### Current Integrations
1. **Supabase Auth** - User authentication and sessions
2. **Supabase Database** - Keyword plans storage
3. **Next.js API Routes** - Backend API endpoints
4. **React Hot Toast** - User notifications

### Future Integrations (Ready)
1. **Google Ads API** - Real keyword data and forecasts
2. **OAuth2** - Secure Google authentication
3. **Analytics** - Track feature usage
4. **Export** - PDF/CSV generation

## Development vs Production

### Development Mode (Current)
```
User → Frontend → API → Mock Data Generator → Frontend
                    ↓
                Database (Plans Storage)
```

### Production Mode (With Google Ads API)
```
User → Frontend → API → Google Ads API → Frontend
                    ↓         ↓
                Database  OAuth2 Auth
```

## Error Handling Flow

```
API Request
      │
      ├─► Try to execute
      │
      ├─► IF error occurs:
      │    │
      │    ├─► Log to console
      │    ├─► Return error response
      │    └─► Frontend shows toast notification
      │
      └─► Success: Return data
```

---

**Note**: This diagram represents the complete KF2 system architecture. The system is fully functional with mock data and ready for Google Ads API integration.

