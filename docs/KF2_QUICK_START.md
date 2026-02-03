# KF2 (Google Ads Manager) - Quick Start Guide

## What is KF2?

KF2 is the Google Ads Manager integration in GeoRepute.ai that allows you to:
- Generate keyword ideas from any website URL
- Create organized keyword plans
- Get forecast metrics (impressions, clicks, CTR, cost estimates)

## Workflow

```
1. Generate Ideas → 2. Select Keywords → 3. Create Plan → 4. Get Forecast
```

## Getting Started

### Option 1: Use Mock Data (Quick Testing)

The system works out of the box with realistic mock data. No setup required!

1. Navigate to **Dashboard → Google Ads Manager** (kf2 in sidebar)
2. Enter any website URL
3. Click "Generate Ideas"
4. Select keywords you like
5. Create a plan and view forecasts

### Option 2: Connect Real Google Ads API

For real data from Google Ads, follow the setup in `docs/KF2_GOOGLE_ADS_INTEGRATION.md`

## Features Overview

### 1. Generate Ideas Tab

**Purpose**: Discover keyword opportunities based on a website URL

**How to use**:
1. Enter a website URL (e.g., `https://example.com`)
2. Click "Generate Ideas"
3. Review suggestions with:
   - Monthly search volume
   - Competition level (Low/Medium/High)
   - Bid range estimates
4. Click keywords to select them (checkbox appears when selected)

**Best practices**:
- Start with your competitor's URLs for competitive research
- Use your own URL to find missed opportunities
- Look for low competition + high volume keywords

### 2. Keyword Plans Tab

**Purpose**: View and manage your saved keyword plans

**How to use**:
1. Switch to "Keyword Plans" tab
2. View all your saved plans
3. Click "Get Forecast" to see predictive metrics

**What you'll see**:
- Plan name and creation date
- Number of keywords in each plan
- Quick preview of keywords

### 3. Forecasts Tab

**Purpose**: View predictive performance metrics for your keyword plans

**How to use**:
1. Get forecast data by clicking "Get Forecast" from the Plans tab
2. Review the detailed metrics table:
   - **Impressions**: How many times your ad might show
   - **Clicks**: Expected clicks
   - **CTR**: Click-through rate (clicks ÷ impressions)
   - **Avg CPC**: Average cost per click
   - **Est. Cost**: Total estimated campaign cost

**Metrics summary**:
- Total impressions across all keywords
- Total expected clicks
- Average CTR for the plan
- Total estimated cost

## Tips & Best Practices

### Keyword Selection

✅ **Do**:
- Mix high and low volume keywords
- Include brand and non-brand terms
- Consider user intent (informational, commercial, transactional)
- Look at competition levels

❌ **Don't**:
- Select only high-competition keywords
- Ignore long-tail variations
- Forget about seasonal trends

### Plan Creation

✅ **Do**:
- Use descriptive plan names (e.g., "Q1 2024 Brand Campaign")
- Group related keywords together
- Create separate plans for different campaigns
- Keep plans focused (10-30 keywords is ideal)

❌ **Don't**:
- Mix unrelated keyword themes
- Create overly large plans (100+ keywords)
- Use generic names like "Plan 1"

### Forecast Interpretation

**High Impressions + Low Clicks**:
- Keywords are showing but not compelling
- Consider ad copy improvements
- Check keyword relevance

**High CPC + High Competition**:
- Saturated market
- Consider long-tail alternatives
- Focus on quality score improvements

**Low Impressions + High CTR**:
- Good keyword relevance
- Low search volume
- Consider expanding to related terms

## Database Setup

The kf2 feature requires the `keyword_plans` table. To set it up:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the migration file: `database/017_keyword_plans_table.sql`

Or via Supabase CLI:
```bash
supabase db push
```

## Troubleshooting

### No plans showing?
- Check you've created plans in the "Generate Ideas" tab
- Verify database migration was run
- Check browser console for errors

### "Unauthorized" error?
- Make sure you're logged in
- Try refreshing the page
- Check your session hasn't expired

### Forecast button not working?
- Ensure the plan has keywords
- Check network tab for API errors
- Verify the plan ID is valid

### Mock data vs Real data?

**You're using mock data if**:
- Keywords all follow similar patterns
- Metrics are randomized
- Setup is instant

**You're using real data if**:
- You configured Google Ads API credentials
- Data reflects actual search volumes
- Competition levels are precise

## Next Steps

1. **Create your first plan**: Generate ideas and create a test plan
2. **Compare forecasts**: Create multiple plans and compare metrics
3. **Export data**: (Coming soon) Export forecasts to CSV
4. **Integration**: (Coming soon) Push plans directly to Google Ads

## Support

For issues or questions:
1. Check `docs/KF2_GOOGLE_ADS_INTEGRATION.md` for detailed setup
2. Review console logs for error messages
3. Verify database tables exist
4. Check environment variables if using real API

## API Endpoints Reference

Quick reference for developers:

- `POST /api/kf2/generate-ideas` - Generate keyword ideas
- `POST /api/kf2/create-plan` - Create a keyword plan
- `GET /api/kf2/get-plans` - Fetch all plans
- `GET /api/kf2/get-forecast` - Get forecast for a plan

See full API documentation in `docs/KF2_GOOGLE_ADS_INTEGRATION.md`

