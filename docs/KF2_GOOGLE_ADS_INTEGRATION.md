# Google Ads Manager (KF2) Integration

This module integrates Google Ads Keyword Planner API to provide keyword research, planning, and forecasting capabilities.

## Features

1. **Generate Keyword Ideas** - Use UrlSeed to generate keyword suggestions from a website URL
2. **Create Keyword Plans** - Select and organize keywords into formal plans
3. **Get Forecasts** - Retrieve predictive metrics (impressions, clicks, CTR, CPC) for keyword plans

## Architecture

### Frontend
- **Page**: `app/dashboard/kf2/page.tsx` - Main UI with three tabs (Ideas, Plans, Forecasts)
- **Navigation**: Added to sidebar in `app/dashboard/layout.tsx`

### Backend API Routes
- `app/api/kf2/generate-ideas/route.ts` - Generates keyword ideas using KeywordPlanIdeaService
- `app/api/kf2/create-plan/route.ts` - Creates and saves keyword plans
- `app/api/kf2/get-plans/route.ts` - Retrieves user's keyword plans
- `app/api/kf2/get-forecast/route.ts` - Gets forecast data for a keyword plan

### Database
- **Table**: `keyword_plans` - Stores user keyword plans
- **Migration**: `database/017_keyword_plans_table.sql`

## Setup Instructions

### 1. Database Setup

Run the migration to create the keyword_plans table:

```sql
-- Run in Supabase SQL Editor
\i database/017_keyword_plans_table.sql
```

Or apply it through Supabase Dashboard → SQL Editor.

### 2. Google Ads API Setup

#### A. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Ads API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Ads API"
   - Click "Enable"

#### B. Set Up OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure the OAuth consent screen if prompted
4. Choose "Web application" as application type
5. Add authorized redirect URIs (e.g., `http://localhost:3000/auth/callback`)
6. Download the credentials JSON file

#### C. Get Google Ads Developer Token

1. Sign in to your [Google Ads account](https://ads.google.com/)
2. Click "Tools & Settings" → "Setup" → "API Center"
3. Apply for a developer token (this may take a few days for approval)
4. Copy your developer token

#### D. Generate Refresh Token

You need to generate a refresh token using OAuth2:

```bash
# Install Google Ads API client
npm install @google-ads/google-ads

# Create a script to generate refresh token (see scripts/generate-google-ads-token.js)
node scripts/generate-google-ads-token.js
```

Example script (`scripts/generate-google-ads-token.js`):

```javascript
const { OAuth2Client } = require('google-auth-library');
const readline = require('readline');

const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/adwords'],
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('Refresh Token:', tokens.refresh_token);
  rl.close();
});
```

### 3. Environment Variables

Add these to your `.env.local` file:

```env
# Google Ads API Configuration
GOOGLE_ADS_CLIENT_ID=your_oauth_client_id
GOOGLE_ADS_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CUSTOMER_ID=your_customer_id

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Install Dependencies

```bash
# Install Google Ads API client
npm install @google-ads/google-ads
```

### 5. Implement Real API Calls

The current implementation uses mock data. To use real Google Ads API:

1. Install the package: `npm install @google-ads/google-ads`
2. Follow the commented implementation guides in each API route file
3. Uncomment and adapt the real API code sections

## Usage

### Generate Keyword Ideas

1. Navigate to Dashboard → Google Ads Manager
2. Click "Generate Ideas" tab
3. Enter a website URL
4. Click "Generate Ideas"
5. Review the keyword suggestions with metrics:
   - Average monthly searches
   - Competition level
   - Bid estimates

### Create Keyword Plan

1. After generating ideas, select relevant keywords by clicking on them
2. Enter a plan name
3. Click "Create Plan"
4. The plan is saved to your account

### View Forecasts

1. Navigate to "Keyword Plans" tab
2. Click "Get Forecast" on any plan
3. View predictive metrics:
   - Expected impressions
   - Expected clicks
   - CTR (Click-through rate)
   - Average CPC
   - Estimated cost

## API Endpoints

### POST `/api/kf2/generate-ideas`
Generates keyword ideas from a URL using Google Ads KeywordPlanIdeaService.

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "ideas": [
    {
      "text": "keyword phrase",
      "avgMonthlySearches": 12000,
      "competition": "HIGH",
      "lowTopOfPageBid": 2.5,
      "highTopOfPageBid": 8.5
    }
  ]
}
```

### POST `/api/kf2/create-plan`
Creates a new keyword plan.

**Request Body:**
```json
{
  "planName": "My Campaign Plan",
  "keywords": ["keyword 1", "keyword 2"]
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "id": "uuid",
    "name": "My Campaign Plan",
    "keywords": ["keyword 1", "keyword 2"],
    "google_ads_plan_id": "plan_id",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### GET `/api/kf2/get-plans`
Retrieves all keyword plans for the authenticated user.

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "uuid",
      "name": "My Campaign Plan",
      "keywords": ["keyword 1", "keyword 2"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET `/api/kf2/get-forecast?planId=uuid`
Gets forecast metrics for a specific keyword plan.

**Response:**
```json
{
  "success": true,
  "forecasts": [
    {
      "keyword": "keyword 1",
      "impressions": 50000,
      "clicks": 2500,
      "ctr": 0.05,
      "avgCpc": 2.5,
      "cost": 6250
    }
  ]
}
```

## Mock Data Mode

Currently, the system operates in mock data mode to allow testing without Google Ads API credentials. Mock data provides:
- Realistic keyword suggestions
- Random but plausible metrics
- Full workflow testing

To switch to real API data, complete the setup steps above and uncomment the real implementation code in each API route.

## Database Schema

```sql
CREATE TABLE keyword_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  google_ads_plan_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### "Unauthorized" Error
- Ensure you're logged in
- Check that your session cookie is valid
- Verify Supabase authentication is working

### "Database Error"
- Run the migration script
- Check RLS policies are enabled
- Verify user_id matches authenticated user

### Mock Data Instead of Real Data
- Check environment variables are set correctly
- Verify Google Ads API credentials
- Check API quotas haven't been exceeded
- Review console logs for detailed error messages

## Security Considerations

- API credentials are stored as environment variables (never in code)
- Row Level Security (RLS) ensures users only see their own plans
- OAuth2 refresh tokens are used for secure, long-lived access
- All API routes require authentication

## Future Enhancements

- [ ] Batch keyword processing
- [ ] Historical forecast comparison
- [ ] Budget recommendations
- [ ] Competitive analysis
- [ ] Export to CSV/PDF
- [ ] Integration with existing campaigns
- [ ] A/B testing suggestions
- [ ] Seasonal trend analysis

## References

- [Google Ads API Documentation](https://developers.google.com/google-ads/api/docs/start)
- [KeywordPlanIdeaService](https://developers.google.com/google-ads/api/reference/rpc/latest/KeywordPlanIdeaService)
- [KeywordPlanService](https://developers.google.com/google-ads/api/reference/rpc/latest/KeywordPlanService)
- [Forecast Metrics](https://developers.google.com/google-ads/api/docs/keyword-planning/generate-forecast-metrics)

