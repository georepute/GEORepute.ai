# Integration Status: Edge Function ↔ AI Visibility Page

## ✅ **YES - They are fully integrated!**

## Integration Flow

### 1. **UI → API Route** ✅
**File**: `app/dashboard/ai-visibility/page.tsx`
- **Function**: `handleAnalyze()`
- **Calls**: `POST /api/ai-visibility`
- **Sends**:
  ```json
  {
    "brandName": "...",
    "websiteUrl": "...",
    "industry": "...",
    "keywords": [...],
    "competitors": [...],
    "platforms": ["chatgpt", "perplexity", ...]
  }
  ```
- **Receives**: `{ session_id, projectId, message, ... }`

### 2. **API Route → Edge Function** ✅
**File**: `app/api/ai-visibility/route.ts`
- **Function**: `POST` handler
- **Creates/Finds**: Project in `brand_analysis_projects` table
- **Calls**: `${supabaseUrl}/functions/v1/brand-analysis`
- **Sends**:
  ```json
  {
    "projectId": "...",
    "platforms": ["chatgpt", "perplexity", ...]
  }
  ```
- **Receives**: `{ success: true, session_id: "...", message: "...", ... }`
- **Returns**: `{ ...data, projectId, message }`

### 3. **Edge Function Processing** ✅
**File**: `supabase/functions/brand-analysis/index.ts`
- **Receives**: `{ projectId, platforms }`
- **Processes**:
  1. Fetches project from database
  2. Creates analysis session
  3. Generates 50 realistic queries
  4. Starts batch processing
  5. Returns immediately with `session_id`
- **Returns**:
  ```json
  {
    "success": true,
    "session_id": "...",
    "message": "Analysis started in background with batch processing",
    "platforms_analyzed": [...],
    "total_queries": 250,
    ...
  }
  ```

### 4. **UI Polling & Results** ✅
**File**: `app/dashboard/ai-visibility/page.tsx`
- **Function**: `pollAnalysisStatus()`
- **Polls**: `brand_analysis_sessions` table every 5 seconds
- **Checks**: `session.status` and `completed_queries / total_queries`
- **Updates**: Progress bar and status message
- **Fetches Results**: When `status === 'completed'`
  - Calls `fetchAnalysisResults()` which queries:
    - `brand_analysis_sessions` (summary)
    - `ai_platform_responses` (detailed responses)

## Data Flow Diagram

```
┌─────────────────────────────────┐
│   AI Visibility Page (UI)       │
│   - User fills form              │
│   - Clicks "Launch Analysis"     │
└──────────────┬──────────────────┘
               │ POST /api/ai-visibility
               │ { brandName, websiteUrl, ... }
               ▼
┌─────────────────────────────────┐
│   API Route                     │
│   - Creates/finds project       │
│   - Calls edge function         │
└──────────────┬──────────────────┘
               │ POST /functions/v1/brand-analysis
               │ { projectId, platforms }
               ▼
┌─────────────────────────────────┐
│   Edge Function                 │
│   - Creates session              │
│   - Generates queries            │
│   - Starts batch processing     │
│   - Returns session_id          │
└──────────────┬──────────────────┘
               │ Returns { session_id, ... }
               ▼
┌─────────────────────────────────┐
│   UI Polling                    │
│   - Polls every 5s              │
│   - Updates progress bar         │
│   - Fetches results when done   │
└─────────────────────────────────┘
```

## Database Tables Used

1. **`brand_analysis_projects`** - Stores project configuration
2. **`brand_analysis_sessions`** - Tracks analysis progress
3. **`ai_platform_responses`** - Stores individual query responses
4. **`brand_analysis_website_analysis`** - Stores website analysis (optional)

## Integration Points Verified

✅ **UI sends correct data** to API route
✅ **API route creates project** before calling edge function
✅ **API route calls edge function** with correct parameters
✅ **Edge function returns session_id** for tracking
✅ **UI receives session_id** and starts polling
✅ **UI polls database** for session status
✅ **UI fetches results** when analysis completes
✅ **Error handling** in place at all levels

## Status: **FULLY INTEGRATED** ✅

The edge function and AI visibility page are properly connected and working together!

