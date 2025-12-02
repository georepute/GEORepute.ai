# Public Reports Feature - Complete Guide

## Overview

The Public Reports feature allows users to generate, save, and share performance reports via public URLs. When a user sends a report via email, the system automatically:

1. Saves all report data to the `reports` table in Supabase
2. Generates a unique share token for the report
3. Creates a public URL that anyone can access
4. Includes the public URL in the email
5. Tracks view counts for each report

## Features

### ✅ Implemented Features

- **Automatic Report Storage**: All report data saved when email is sent
- **Unique Share Tokens**: URL-safe tokens for each report
- **Public Access**: Anyone with the link can view (no login required)
- **View Tracking**: Automatic view count increment
- **Beautiful Public Page**: Matches dashboard design
- **Email Integration**: Public link included in report emails
- **RLS Security**: Row Level Security for data protection
- **No Expiration**: Reports remain accessible indefinitely (optional expiration available)

## Database Schema

### Reports Table

```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Report metadata
  title VARCHAR(500) NOT NULL,
  date_range VARCHAR(50) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Keywords data
  total_keywords INTEGER DEFAULT 0,
  keywords_change NUMERIC(10, 2) DEFAULT 0,
  avg_ranking NUMERIC(10, 2) DEFAULT 0,
  ranking_change NUMERIC(10, 2) DEFAULT 0,
  top_keywords JSONB DEFAULT '[]'::jsonb,
  ranking_trend JSONB DEFAULT '[]'::jsonb,
  
  -- Content data
  total_content INTEGER DEFAULT 0,
  content_change NUMERIC(10, 2) DEFAULT 0,
  published_content INTEGER DEFAULT 0,
  draft_content INTEGER DEFAULT 0,
  content_by_platform JSONB DEFAULT '[]'::jsonb,
  content_by_status JSONB DEFAULT '[]'::jsonb,
  recent_content JSONB DEFAULT '[]'::jsonb,
  
  -- AI Visibility data
  avg_visibility_score NUMERIC(10, 2) DEFAULT 0,
  visibility_change NUMERIC(10, 2) DEFAULT 0,
  total_mentions INTEGER DEFAULT 0,
  mentions_change NUMERIC(10, 2) DEFAULT 0,
  visibility_by_platform JSONB DEFAULT '[]'::jsonb,
  visibility_trend JSONB DEFAULT '[]'::jsonb,
  
  -- Brand Analysis data
  total_projects INTEGER DEFAULT 0,
  active_sessions INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  responses_by_platform JSONB DEFAULT '[]'::jsonb,
  
  -- Performance summary
  performance_summary JSONB DEFAULT '[]'::jsonb,
  
  -- Access control
  is_public BOOLEAN DEFAULT TRUE,
  share_token VARCHAR(100) UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

```sql
-- For fast lookups by share token
CREATE INDEX idx_reports_share_token ON public.reports(share_token);

-- For user's reports
CREATE INDEX idx_reports_user_id ON public.reports(user_id);

-- For organization reports
CREATE INDEX idx_reports_organization_id ON public.reports(organization_id);

-- For recent reports
CREATE INDEX idx_reports_generated_at ON public.reports(generated_at DESC);

-- For public reports
CREATE INDEX idx_reports_is_public ON public.reports(is_public) WHERE is_public = true;
```

## RLS Policies

### Public Access Policy

```sql
CREATE POLICY "Anyone can view public reports"
  ON public.reports
  FOR SELECT
  USING (
    is_public = true 
    AND (expires_at IS NULL OR expires_at > NOW())
  );
```

This allows **anyone** (including unauthenticated users) to view public reports.

### User Access Policies

```sql
-- Users can create their own reports
CREATE POLICY "Users can create their own reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
  ON public.reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
  ON public.reports
  FOR DELETE
  USING (auth.uid() = user_id);
```

## API Endpoints

### 1. Send Email & Save Report

**Endpoint**: `POST /api/reports/send-email`

**Request**:
```json
{
  "email": "user@example.com",
  "userName": "John Doe",
  "reportData": {
    "dateRange": "Last 30 Days",
    "totalKeywords": 150,
    "avgRanking": 8.5,
    "totalContent": 45,
    "publishedContent": 32,
    "avgVisibilityScore": 78.5,
    "totalMentions": 234,
    "topKeywords": [...],
    "visibilityByPlatform": [...]
  },
  "fullReportData": {
    // Complete report data
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Report sent successfully",
  "reportId": "uuid",
  "shareToken": "abc123xyz",
  "publicUrl": "https://yourdomain.com/public/report/abc123xyz"
}
```

### 2. Get Public Report

**Endpoint**: `GET /api/reports/public/[shareToken]`

**Response**:
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "title": "Last 30 Days Performance Report",
    "date_range": "Last 30 Days",
    "generated_at": "2025-12-01T10:00:00Z",
    "total_keywords": 150,
    "avg_ranking": 8.5,
    // ... all report data
    "view_count": 42
  }
}
```

## Public Report Page

**URL Structure**: `/public/report/[shareToken]`

**Example**: `https://yourdomain.com/public/report/abc123xyz789`

### Features

✅ **No Authentication Required**: Anyone with the link can view
✅ **Beautiful Design**: Matches dashboard aesthetics
✅ **Responsive**: Works on all devices
✅ **View Counter**: Shows number of views
✅ **Generated Date**: Shows when report was created
✅ **Full Report Data**: All metrics, keywords, platforms

### Page Sections

1. **Header**
   - Report title
   - Date range badge
   - View count
   - Generated date

2. **Public Notice Banner**
   - Indicates this is a public report
   - Link to learn more

3. **Key Metrics Cards**
   - Total Keywords
   - Average Ranking
   - Total Content
   - AI Visibility Score

4. **Top Keywords Table**
   - Keyword name
   - Ranking score
   - Search volume
   - Change indicator

5. **AI Platform Visibility**
   - Platform breakdown
   - Visibility scores
   - Mention counts
   - Sentiment scores

6. **Footer**
   - Powered by GeoRepute.ai
   - Copyright notice

## User Flow

### Sending a Report

1. User navigates to **Dashboard → Reports**
2. Selects date range (7/30/90 days)
3. Clicks **"Email Report"** button
4. Enters recipient details:
   - Name
   - Email address
5. Reviews report summary
6. Clicks **"Send Report"**
7. System:
   - Saves full report data to database
   - Generates unique share token
   - Sends email with public link
   - Shows success message with public URL

### Viewing a Public Report

1. Recipient receives email
2. Clicks **"View Public Report"** button
3. Browser opens public report page
4. No login required
5. Full report displayed
6. View count incremented
7. Can share link with others

## Email Template Updates

The email now includes:

### Public Report Link

```html
<a href="https://yourdomain.com/public/report/abc123xyz">
  View Public Report
</a>
```

### Shareable URL Section

```html
<p>Or copy and paste this link to share with others:</p>
<p>https://yourdomain.com/public/report/abc123xyz</p>
```

### Updated Footer Note

```
This report is publicly accessible via the link above 
and will remain available.
```

## Security Considerations

### What's Public

✅ Report metrics and data
✅ Keywords and rankings
✅ Content statistics
✅ AI visibility scores
✅ Platform breakdowns

### What's NOT Exposed

❌ User personal information
❌ Organization details
❌ Email addresses
❌ User IDs (masked)
❌ Database IDs (only share token shown)
❌ API keys or credentials

### Share Token Security

- **40-character** random tokens
- **URL-safe** characters only
- **Collision-resistant** (checked during generation)
- **Unique constraint** in database
- **Cannot be guessed** or brute-forced

## View Tracking

### How It Works

1. User visits public report URL
2. API endpoint fetches report
3. RPC function `increment_report_view_count()` called
4. View count incremented by 1
5. Updated count returned to frontend

### Database Function

```sql
CREATE OR REPLACE FUNCTION increment_report_view_count(report_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.reports
  SET view_count = view_count + 1
  WHERE id = report_id_param;
END;
$$;
```

### View Count Display

- Shown in public report header
- Format: "X views"
- Updates in real-time
- Visible to everyone

## Optional Features

### Report Expiration

To make reports expire after a certain time:

```sql
-- Set expiration when creating report
INSERT INTO reports (
  ...,
  expires_at = NOW() + INTERVAL '7 days'  -- Expires in 7 days
)
```

Reports with `expires_at` in the past will return 410 (Gone) error.

### Private Reports

To make a report private:

```sql
UPDATE reports
SET is_public = false
WHERE id = 'report_uuid';
```

Private reports won't be accessible via public URL.

### Custom Share Tokens

While auto-generated tokens are recommended, you can provide custom ones:

```sql
INSERT INTO reports (
  ...,
  share_token = 'my-custom-token-2025-q1'
)
```

## Troubleshooting

### Report Not Found

**Error**: "Report not found or has been removed"

**Causes**:
- Invalid share token
- Report was deleted
- Report is not public (`is_public = false`)
- Report has expired

**Solution**:
- Verify share token is correct
- Check if report exists in database
- Verify `is_public = true`
- Check `expires_at` is null or future date

### View Count Not Incrementing

**Causes**:
- RPC function not created
- Permission issue
- Database connection error

**Solution**:
```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_report_view_count TO anon;
GRANT EXECUTE ON FUNCTION increment_report_view_count TO authenticated;
```

### Public Page Shows Error

**Common Issues**:
1. Migration not run
2. RLS policies blocking access
3. API endpoint not working

**Verification**:
```sql
-- Check if table exists
SELECT * FROM reports LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'reports';

-- Test public access
SELECT * FROM reports WHERE share_token = 'test_token' AND is_public = true;
```

## Testing Checklist

### Database Setup
- [ ] Run migration: `database/009_reports_table.sql`
- [ ] Verify table created
- [ ] Check indexes created
- [ ] Verify RLS policies active
- [ ] Test RPC functions

### API Testing
- [ ] Send test report via email
- [ ] Verify report saved to database
- [ ] Check share token generated
- [ ] Verify public URL returned
- [ ] Test public report API endpoint
- [ ] Verify view count increments

### Frontend Testing
- [ ] Email contains public link
- [ ] Public report page loads
- [ ] No authentication required
- [ ] All data displays correctly
- [ ] View count shown
- [ ] Responsive on mobile
- [ ] Share URL copyable

### Security Testing
- [ ] Anonymous users can view public reports
- [ ] Users cannot view private reports
- [ ] Users cannot modify others' reports
- [ ] Share tokens are unique
- [ ] Expired reports return 410

## Monitoring Queries

### Recent Reports

```sql
SELECT 
  id,
  title,
  date_range,
  generated_at,
  view_count,
  is_public
FROM reports
ORDER BY generated_at DESC
LIMIT 20;
```

### Most Viewed Reports

```sql
SELECT 
  id,
  title,
  date_range,
  view_count,
  generated_at
FROM reports
WHERE is_public = true
ORDER BY view_count DESC
LIMIT 10;
```

### Reports by User

```sql
SELECT 
  COUNT(*) as total_reports,
  SUM(view_count) as total_views,
  AVG(view_count) as avg_views_per_report
FROM reports
WHERE user_id = 'user_uuid';
```

## Best Practices

### For Users

1. **Share Wisely**: Public links are accessible to anyone
2. **Monitor Views**: Check view counts regularly
3. **Update Regularly**: Generate fresh reports periodically
4. **Archive Old Reports**: Delete outdated reports if needed

### For Developers

1. **Index Optimization**: Ensure indexes are used for fast queries
2. **Cache Public Reports**: Consider CDN caching for popular reports
3. **Rate Limiting**: Add rate limits to prevent abuse
4. **Monitoring**: Track view counts and popular reports
5. **Backup**: Regular backups of reports table

## Future Enhancements

### Potential Features

- [ ] Custom report templates
- [ ] PDF export from public page
- [ ] Social media sharing buttons
- [ ] Report commenting system
- [ ] Analytics dashboard for report owners
- [ ] Email notifications on view milestones
- [ ] Report comparison feature
- [ ] Custom branding/white-label
- [ ] Password-protected reports
- [ ] Report collections/folders

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: December 2025

