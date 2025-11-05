# Supabase Edge Functions Cron Setup Guide

This guide will help you set up Supabase Edge Functions with pg_cron to handle scheduled content publishing, replacing Vercel Cron jobs.

## 📋 Prerequisites

1. **Supabase Project** - You should already have this
2. **Supabase CLI** - Install it to deploy Edge Functions
3. **pg_cron Extension** - Enable in your Supabase database
4. **pg_net Extension** - Enable for HTTP requests

---

## 🚀 Step-by-Step Setup

### Step 1: Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

### Step 2: Login to Supabase CLI

**First, you need to log in to Supabase CLI:**

```bash
supabase login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Complete the authentication

**If browser doesn't open automatically:**
- You'll see a URL in the terminal
- Copy and paste it into your browser
- Complete the login
- Return to the terminal

### Step 3: Initialize Supabase in Your Project

```bash
# Navigate to your project root
cd /Users/apple/Projects/GEORepute.ai

# Initialize Supabase (if not already done)
# If you get "file exists" error, use --force to overwrite, or skip if config already exists
supabase init

# If config.toml already exists, you can skip init and go directly to linking:
# supabase link --project-ref YOUR_PROJECT_REF
```

**Note:** If you see `failed to create config file: open supabase/config.toml: file exists`, you can either:
- Use `supabase init --force` to overwrite the existing config, OR
- Skip the init step and go directly to linking (the config file already exists)

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project reference:**
1. Go to [https://app.supabase.com](https://app.supabase.com) and log in
2. Click on your project (or create a new one if you don't have one)
3. Once in your project dashboard, look at the browser URL
4. The URL will be: `https://app.supabase.com/project/YOUR_PROJECT_REF`
5. Copy the `YOUR_PROJECT_REF` part (it's a long string like `abcdefghijklmnop`)

**Example:**
- If your URL is: `https://app.supabase.com/project/abcdefghijklmnop`
- Then your project reference is: `abcdefghijklmnop`

**Alternative: Get it from Settings → API**
1. Go to your Supabase Dashboard
2. Click on **Settings** (gear icon in the sidebar)
3. Click on **API**
4. Look for **Project URL** - it will be: `https://YOUR_PROJECT_REF.supabase.co`
5. Extract the `YOUR_PROJECT_REF` part from that URL

### Step 4: Enable Required Extensions

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Enable these extensions:
   - ✅ **pg_cron** - For scheduling cron jobs
   - ✅ **pg_net** - For making HTTP requests

If extensions are not visible, you can enable them via SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 5: Choose Your Approach

#### **Option A: Deploy Edge Function** (Recommended)

```bash
# Make sure you're in the project root
cd /Users/apple/Projects/GEORepute.ai

# Deploy the scheduled-publish function
supabase functions deploy scheduled-publish
```

#### **Option B: Use Vercel Endpoint** (Simpler - Skip Edge Function)
Skip this step and go directly to Step 6. Use the Vercel endpoint option in the SQL.

### Step 6: Set Edge Function Secrets (Only if using Option A)

Edge Functions need access to your Supabase credentials. Set these secrets:

```bash
# Set the service role key secret
# Note: SUPABASE_URL is automatically available in Edge Functions, no need to set it
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important:** 
- Supabase CLI doesn't allow secret names starting with `SUPABASE_`
- Use `SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` is automatically available in Edge Functions, so you don't need to set it

**To get your service role key:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (not the anon key)

**Important:** The service role key bypasses RLS, which is needed for scheduled publishing.

### Step 7: Set Up pg_cron Job

1. Go to Supabase Dashboard → **SQL Editor**
2. Open the file: `database/supabase_cron_setup.sql`
3. **Replace these placeholders:**
   - `YOUR_PROJECT_REF` → Your actual Supabase project reference
   - `YOUR_ANON_KEY` → Your Supabase anon key (or service role key for more permissions)

4. Run the SQL script in the SQL Editor

**Example:**
```sql
-- Replace this:
project_ref text := 'YOUR_PROJECT_REF';

-- With this (example):
project_ref text := 'abcdefghijklmnop';
```

### Step 8: Verify the Setup

1. **Check if cron job is scheduled:**
```sql
SELECT * FROM cron.job;
```

You should see a job named `scheduled-publish-cron`.

2. **Test the Edge Function manually:**
```sql
SELECT call_scheduled_publish();
```

3. **Check Edge Function logs:**
   - Go to your Supabase Dashboard
   - Navigate to **Edge Functions** in the sidebar
   - Click on **scheduled-publish**
   - View the logs in the **Logs** tab
   
   **Note:** Supabase CLI doesn't have a `logs` command. Use the Dashboard to view Edge Function logs.

---

## 🔧 Configuration

### Change Cron Schedule

To change the schedule (e.g., every 10 minutes instead of 5):

```sql
-- Unschedule the old job
SELECT cron.unschedule('scheduled-publish-cron');

-- Schedule with new timing
SELECT cron.schedule(
  'scheduled-publish-cron',
  '*/10 * * * *',  -- Every 10 minutes
  $$SELECT call_scheduled_publish();$$
);
```

**Common cron schedules:**
- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour
- `0 */2 * * *` - Every 2 hours

### View Cron Job Status

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: "Access token not provided" error

**Error message:**
```
Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

**Solution:**
```bash
# Log in to Supabase CLI first
supabase login

# This will open your browser to authenticate
# After logging in, try linking again:
supabase link --project-ref tgucgsvrcuxngwnchjtq
```

**If browser doesn't open:**
- The terminal will show a URL
- Copy and paste it into your browser
- Complete the authentication
- Return to terminal and try linking again

### Issue: Edge Function not deploying

**Solution:**
```bash
# Make sure you're logged in
supabase login

# Check your project link
supabase projects list

# Re-link if needed
supabase link --project-ref YOUR_PROJECT_REF
```

### Issue: pg_cron extension not available

**Solution:**
- Supabase free tier supports pg_cron
- If you see an error, contact Supabase support or check your plan
- Alternative: Use the HTTP approach (calling your Vercel endpoint)

### Issue: Function returns 401 Unauthorized

**Solution:**
- Make sure you set the correct `SUPABASE_SERVICE_ROLE_KEY` secret
- The service role key is required for admin access

### Issue: Cron job not running

**Solution:**
```sql
-- Check if job exists
SELECT * FROM cron.job WHERE jobname = 'scheduled-publish-cron';

-- Check recent runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scheduled-publish-cron')
ORDER BY start_time DESC 
LIMIT 5;
```

---

## 📝 Alternative: Call Vercel Endpoint Instead

If you prefer to keep the logic in your Next.js API route and just use Supabase to trigger it:

1. **Modify the SQL function** in `supabase_cron_setup.sql`:

```sql
CREATE OR REPLACE FUNCTION call_scheduled_publish()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_status int;
  response_content text;
  vercel_url text := 'https://your-app.vercel.app'; -- Your Vercel URL
  cron_secret text := 'YOUR_CRON_SECRET'; -- Your CRON_SECRET env var
BEGIN
  SELECT status, content INTO response_status, response_content
  FROM http((
    'GET',
    vercel_url || '/api/geo-core/orchestrator/scheduled-publish',
    ARRAY[
      http_header('Authorization', 'Bearer ' || cron_secret)
    ],
    'application/json',
    ''
  )::http_request);
  
  RAISE NOTICE 'Scheduled publish called. Status: %', response_status;
END;
$$;
```

This approach:
- ✅ Keeps your existing API route code
- ✅ Just uses Supabase to trigger it
- ✅ Simpler setup

---

## ✅ Verification Checklist

- [ ] Supabase CLI installed
- [ ] Project linked: `supabase link`
- [ ] Extensions enabled: `pg_cron` and `pg_net`
- [ ] Edge Function deployed: `supabase functions deploy scheduled-publish`
- [ ] Secrets set: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] SQL script run with correct project reference
- [ ] Cron job visible: `SELECT * FROM cron.job;`
- [ ] Test function works: `SELECT call_scheduled_publish();`
- [ ] Scheduled content publishes successfully

---

## 🎯 Next Steps

1. **Remove Vercel Cron** (optional):
   - Delete or comment out `vercel.json` cron configuration
   - The Edge Function will handle scheduling now

2. **Monitor Logs**:
   - Go to Supabase Dashboard → **Edge Functions** → **scheduled-publish** → **Logs**
   - View real-time logs and execution history
   - Filter by date, status, or search for specific errors

3. **Set Up Alerts** (optional):
   - Monitor cron job failures
   - Set up notifications for failed publishes

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

## 💡 Tips

1. **Free Tier Limits**: Supabase free tier supports pg_cron, but check for any rate limits
2. **Security**: Always use service role key in Edge Functions (never expose it in client code)
3. **Testing**: Test the function manually before relying on cron
4. **Monitoring**: Check logs regularly to ensure cron jobs are running

---

That's it! Your scheduled publishing should now work with Supabase Edge Functions and pg_cron. 🎉

