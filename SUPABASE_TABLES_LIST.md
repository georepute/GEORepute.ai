# Database Tables Required for Brand Analysis

## 📋 Tables to Create in Supabase

Run the SQL file `database/brand_analysis_tables.sql` in your Supabase SQL Editor, or create these tables manually:

### 1. **brand_analysis_projects**
Stores brand analysis project configurations
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `brand_name` (TEXT)
- `industry` (TEXT)
- `website_url` (TEXT)
- `keywords` (TEXT[])
- `competitors` (TEXT[])
- `active_platforms` (TEXT[])
- `target_keywords` (TEXT[])
- `last_analysis_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 2. **brand_analysis_sessions**
Tracks individual analysis sessions and their progress
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key → brand_analysis_projects)
- `session_name` (TEXT)
- `status` (TEXT: 'running', 'completed', 'failed', 'cancelled')
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `total_queries` (INTEGER)
- `completed_queries` (INTEGER)
- `results_summary` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 3. **ai_platform_responses**
Stores individual AI platform query responses
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key → brand_analysis_projects)
- `session_id` (UUID, Foreign Key → brand_analysis_sessions)
- `platform` (TEXT: 'chatgpt', 'claude', 'gemini', 'perplexity', 'groq')
- `prompt` (TEXT)
- `response` (TEXT)
- `response_metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)

### 4. **brand_analysis_website_analysis**
Stores website content analysis results
- `id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key → brand_analysis_projects)
- `url` (TEXT)
- `analysis_result` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 5. **ai_visibility** (Optional - may already exist)
Stores AI visibility metrics
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users)
- `check_date` (TIMESTAMPTZ)
- `platform` (TEXT)
- `visibility_score` (NUMERIC)
- `mention_count` (INTEGER)
- `sentiment_score` (NUMERIC)
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

## 🔑 **API Keys (NOT in Database)**

API keys are **NOT** stored in the database. They are stored as **Supabase Edge Function secrets**.

**Set them using:**
```bash
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set CLAUDE_API_KEY=your_key
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set PERPLEXITY_API_KEY=your_key
supabase secrets set GROQ_API_KEY=your_key
```

See `SETUP_EDGE_FUNCTION_SECRETS.md` for detailed instructions.

---

## 🚀 Quick Setup Instructions

1. **Open Supabase Dashboard** → Go to SQL Editor
2. **Copy the SQL file**: `database/brand_analysis_tables.sql`
3. **Paste and Run** in the SQL Editor
4. **Verify**: Check that all 5 tables are created
5. **Set API Keys**: Use Supabase Edge Function secrets (see `SETUP_EDGE_FUNCTION_SECRETS.md`)

---

## ✅ What's Included

- ✅ All required columns with correct data types
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Check constraints for valid values
- ✅ Default values and timestamps

---

## 📝 Notes

- The SQL file uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- RLS policies ensure users can only access their own data
- All tables include proper indexes for fast queries
- **API keys are NOT stored in database** - Use Supabase Edge Function secrets instead

