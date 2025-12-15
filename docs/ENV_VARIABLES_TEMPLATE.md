# Environment Variables Template for Google Search Console Integration

# Copy these values to your .env.local file and Vercel environment variables

# ============================================
# Google Search Console OAuth Configuration
# ============================================
# Get these from Google Cloud Console:
# https://console.cloud.google.com/apis/credentials

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Development
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-search-console/callback

# Production (use this in Vercel)
# GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/google-search-console/callback

# ============================================
# Supabase Configuration
# ============================================
# These should already exist in your project

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ============================================
# Cron Job Security
# ============================================
# Generate a secure secret with:
# openssl rand -base64 32

CRON_SECRET=your_random_secret_for_cron_jobs

# ============================================
# Notes
# ============================================
# - Never commit .env.local to Git
# - Add all variables to Vercel environment variables for production
# - Update GOOGLE_REDIRECT_URI to match your production domain
# - CRON_SECRET must match on all environments

