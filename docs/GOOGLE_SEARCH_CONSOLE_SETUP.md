# Google Search Console Integration - Setup Guide

## 📋 Overview

This guide will walk you through setting up the Google Search Console integration for your GEORepute.ai application.

## 🔧 Prerequisites

- Google Cloud Console account
- Supabase project
- Next.js application deployed or running locally
- Domain with DNS access

---

## 1️⃣ Google Cloud Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `GEORepute-GSC` (or your preferred name)
4. Click "Create"

### Step 2: Enable Required APIs

1. Navigate to "APIs & Services" → "Library"
2. Search and enable the following APIs:
   - **Google Search Console API**
   - **Site Verification API**

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (or "Internal" if using Google Workspace)
3. Fill in the required information:
   - **App name**: GEORepute.ai
   - **User support email**: your-email@domain.com
   - **Developer contact**: your-email@domain.com
4. Click "Save and Continue"

5. **Add Scopes**:
   - Click "Add or Remove Scopes"
   - Add the following scopes:
     ```
     https://www.googleapis.com/auth/webmasters
     https://www.googleapis.com/auth/webmasters.readonly
     https://www.googleapis.com/auth/siteverification
     https://www.googleapis.com/auth/siteverification.verify_only
     ```
   - Click "Update" → "Save and Continue"

6. **Test Users** (for development):
   - Add your Google email addresses
   - Click "Save and Continue"

7. Click "Back to Dashboard"

### Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: **Web application**
4. Name: `GEORepute GSC Client`
5. **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/integrations/google-search-console/callback`
   - Production: `https://your-domain.com/api/integrations/google-search-console/callback`
6. Click "Create"
7. **Copy and save**:
   - Client ID
   - Client Secret

---

## 2️⃣ Supabase Database Setup

### Step 1: Run SQL Migration

1. Open Supabase Dashboard
2. Go to "SQL Editor"
3. Click "New Query"
4. Copy the contents of `database/010_google_search_console_integration.sql`
5. Click "Run" to execute

This will create the following tables:
- `platform_integrations`
- `gsc_domains`
- `gsc_analytics`
- `gsc_queries`
- `gsc_pages`

### Step 2: Verify Tables

Check that all tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'platform_integrations',
  'gsc_domains',
  'gsc_analytics',
  'gsc_queries',
  'gsc_pages'
);
```

---

## 3️⃣ Environment Variables

### Step 1: Add to `.env.local`

Create or update your `.env.local` file:

```env
# Google Search Console
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-search-console/callback

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Job Security
CRON_SECRET=your_random_secret_here
```

### Step 2: Generate Cron Secret

Generate a secure random secret:
```bash
# On Unix/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 3: Add to Vercel (Production)

1. Go to Vercel Dashboard → Your Project
2. Click "Settings" → "Environment Variables"
3. Add all the variables from above
4. For `GOOGLE_REDIRECT_URI`, use your production domain:
   ```
   https://your-domain.com/api/integrations/google-search-console/callback
   ```

---

## 4️⃣ Deployment

### Local Development

```bash
# Install dependencies (if not already done)
npm install

# Run development server
npm run dev
```

### Vercel Deployment

1. Push your code to GitHub
2. Vercel will automatically deploy
3. The cron job (`vercel.json`) will be automatically configured

---

## 5️⃣ Usage

### For Users

1. **Connect Account**:
   - Navigate to `/dashboard/google-search-console`
   - Click "Connect Google Search Console"
   - Authorize the application

2. **Add Domain**:
   - Enter domain name (e.g., `example.com`)
   - Click "Add Domain"
   - Copy the TXT verification token

3. **Verify Domain**:
   - Add TXT record to your DNS settings:
     - **Type**: TXT
     - **Name**: @ (or your domain)
     - **Value**: [paste token]
     - **TTL**: 3600
   - Wait 5-10 minutes for DNS propagation
   - Click "Verify Domain"

4. **View Analytics**:
   - Once verified, click "Sync Data"
   - Navigate to `/dashboard/gsc-analytics`
   - View your search performance metrics

---

## 6️⃣ Automated Data Sync

### Cron Job Configuration

The cron job is configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync-gsc",
    "schedule": "0 */6 * * *"
  }]
}
```

This runs every 6 hours and syncs data for all verified domains.

### Manual Sync

You can also trigger manual syncs:
- Click "Sync Data" button in the UI
- Or make a POST request to `/api/cron/sync-gsc` with auth header

---

## 7️⃣ Troubleshooting

### Common Issues

1. **"Google Search Console not connected"**
   - Solution: Make sure environment variables are set correctly
   - Verify OAuth credentials in Google Cloud Console

2. **"Verification failed"**
   - Solution: Wait 10-15 minutes for DNS changes to propagate
   - Check TXT record with: `nslookup -type=txt your-domain.com`

3. **"Token expired"**
   - Solution: Disconnect and reconnect your account
   - The refresh token should auto-refresh, but if it fails, reconnect

4. **No data showing**
   - Solution: Click "Sync Data" button
   - Wait for cron job to run (every 6 hours)
   - Check that domain is verified in Google Search Console directly

### Check Logs

View Vercel logs:
```bash
vercel logs
```

Or check Supabase logs in the dashboard.

---

## 8️⃣ API Endpoints

### Authentication
- `GET /api/integrations/google-search-console/auth` - Get OAuth URL
- `GET /api/integrations/google-search-console/callback` - OAuth callback
- `GET /api/integrations/google-search-console/status` - Check connection
- `DELETE /api/integrations/google-search-console/status` - Disconnect

### Domain Management
- `GET /api/integrations/google-search-console/domains` - List domains
- `POST /api/integrations/google-search-console/domains` - Add domain
- `DELETE /api/integrations/google-search-console/domains` - Remove domain
- `POST /api/integrations/google-search-console/domains/verify` - Verify domain

### Analytics
- `POST /api/integrations/google-search-console/analytics/sync` - Sync data
- `GET /api/integrations/google-search-console/analytics/sync` - Get stored data
- `GET /api/integrations/google-search-console/analytics/summary` - Get summary
- `GET /api/integrations/google-search-console/analytics/queries` - Get top queries
- `GET /api/integrations/google-search-console/analytics/pages` - Get top pages

### Cron
- `GET /api/cron/sync-gsc` - Automated sync (requires CRON_SECRET)

---

## 9️⃣ Security Considerations

1. **Never commit** `.env.local` to Git
2. **Rotate** CRON_SECRET periodically
3. **Use HTTPS** in production
4. **Refresh tokens** are encrypted at rest in Supabase
5. **RLS policies** ensure users can only see their own data

---

## 🎉 You're Done!

Your Google Search Console integration is now fully set up and ready to use!

For questions or issues, check the troubleshooting section or contact support.

---

## 📚 Additional Resources

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

