# Deploying Brand Analysis Edge Function to Supabase

This guide will help you deploy the `brand-analysis` edge function to your Supabase project.

## Prerequisites

1. **Supabase CLI** (already installed ✅)
2. **Supabase Project** - You need a Supabase project at https://supabase.com
3. **Project Reference ID** - Found in your Supabase project settings

## Step 1: Link Your Supabase Project

If you haven't linked your project yet, run:

```bash
cd /Users/apple/Projects/GEORepute.ai
supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for:
- **Database password** (your Supabase project database password)
- **Project reference** (found in Project Settings → General → Reference ID)

**To find your Project Reference:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Copy the **Reference ID**

## Step 2: Set Up Secrets (REQUIRED)

The edge function **requires** these secrets. Set them using Supabase CLI:

```bash
# REQUIRED: Set SERVICE_ROLE_KEY (for database access)
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key

# REQUIRED: Set API keys as secrets (for AI platform access)
supabase secrets set OPENAI_API_KEY=your_openai_key
supabase secrets set CLAUDE_API_KEY=your_claude_key
supabase secrets set GEMINI_API_KEY=your_gemini_key
supabase secrets set PERPLEXITY_API_KEY=your_perplexity_key
supabase secrets set GROQ_API_KEY=your_groq_key
```

**To find your SERVICE_ROLE_KEY:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (⚠️ Keep this secret!)

**Note:** The function now uses Supabase Edge Function secrets directly. You don't need the `admin_api_keys` database table anymore!

## Step 3: Deploy the Edge Function

Deploy the brand-analysis function:

```bash
supabase functions deploy brand-analysis
```

This will:
- Upload the function code
- Set up the function in your Supabase project
- Make it available at: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/brand-analysis`

## Step 4: Verify Deployment

Check that the function is deployed:

```bash
supabase functions list
```

You should see `brand-analysis` in the list.

## Step 5: Test the Function

You can test the function using curl or from your Next.js API route:

### Using curl:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/brand-analysis' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "projectId": "your-project-id",
    "platforms": ["chatgpt", "claude"]
  }'
```

### From Next.js API Route:

The function is already integrated in `app/api/ai-visibility/route.ts` and will automatically call the edge function.

## Step 6: Monitor Function Logs

View function logs in real-time:

```bash
supabase functions logs brand-analysis
```

Or view logs in the Supabase Dashboard:
1. Go to **Edge Functions** → **brand-analysis**
2. Click on **Logs** tab

## Troubleshooting

### Error: "Function not found"
- Make sure you've deployed: `supabase functions deploy brand-analysis`
- Check function name matches exactly

### Error: "Missing Supabase configuration"
- Verify `SERVICE_ROLE_KEY` is set: `supabase secrets list`
- Re-set the secret if needed

### Error: "No API keys configured"
- Set API keys as secrets: `supabase secrets set OPENAI_API_KEY=...`
- Verify secrets are set: `supabase secrets list`
- Make sure you've deployed after setting secrets

### Error: "Project not linked"
- Run: `supabase link --project-ref YOUR_PROJECT_REF`

## Quick Deploy Script

You can create a deploy script for convenience:

```bash
#!/bin/bash
# deploy-brand-analysis.sh

echo "🚀 Deploying brand-analysis edge function..."

# Deploy the function
supabase functions deploy brand-analysis

# Check deployment status
if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo "📊 View logs: supabase functions logs brand-analysis"
else
  echo "❌ Deployment failed. Check errors above."
  exit 1
fi
```

Make it executable:
```bash
chmod +x deploy-brand-analysis.sh
./deploy-brand-analysis.sh
```

## Function Endpoint

Once deployed, your function will be available at:

```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/brand-analysis
```

## Next Steps

1. ✅ Function is deployed
2. ✅ Test it from your Next.js app
3. ✅ Monitor logs for any issues
4. ✅ Set up API keys in the database (`admin_api_keys` table)

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)

