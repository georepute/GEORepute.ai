# Public Reports - Testing Guide

## Quick Test (5 Minutes)

### Prerequisites
- Database migration `009_reports_table.sql` executed
- Application running locally
- Gmail SMTP configured
- Logged into the application

### Step-by-Step Test

#### 1. Run Database Migration

```bash
# In Supabase SQL Editor, execute:
# database/009_reports_table.sql
```

**Verify**:
```sql
-- Check table exists
SELECT COUNT(*) FROM reports;

-- Should return 0 (or number of existing reports)
```

#### 2. Navigate to Reports Page

1. Open browser: `http://localhost:3000`
2. Login to your account
3. Go to: **Dashboard → Reports**
4. Select date range: **Last 30 Days**
5. Wait for data to load

#### 3. Send Email Report

1. Click **"Email Report"** button (top-right)
2. Modal opens with pre-filled data
3. Verify name and email are correct
4. Click **"Send Report"**
5. Wait for success message

**Expected**:
```
✅ "Report sent successfully! Check your email."
✅ "Public report link: http://localhost:3000/public/report/abc123xyz"
```

#### 4. Check Database

```sql
-- Verify report was saved
SELECT 
  id,
  title,
  date_range,
  share_token,
  is_public,
  view_count,
  total_keywords,
  avg_ranking,
  total_content
FROM reports
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output**:
- New report record
- `share_token` populated (40 characters)
- `is_public = true`
- `view_count = 0`
- All metrics populated

#### 5. Check Email

1. Open your email inbox
2. Find email: "Your GeoRepute.ai Performance Report - Last 30 Days"
3. Open the email

**Verify Email Contains**:
- ✅ Key metrics cards
- ✅ AI Visibility section
- ✅ Top keywords table
- ✅ **"View Public Report"** button
- ✅ Shareable URL text section

#### 6. Test Public Report Page

1. **Copy** the share token from database or email
2. **Open in browser**: `http://localhost:3000/public/report/[share_token]`
3. **Or click** the "View Public Report" button in email

**Expected**:
- ✅ Page loads without login
- ✅ Report title shown
- ✅ Date range displayed
- ✅ View count shows "1 views"
- ✅ All metrics cards visible
- ✅ Keywords table populated
- ✅ AI visibility section shown

#### 7. Test Incognito/Anonymous Access

1. **Copy** the public report URL
2. **Open incognito/private window**
3. **Paste** URL and press Enter
4. **Verify**: Page loads without authentication

**Expected**:
- ✅ No login prompt
- ✅ Full report visible
- ✅ View count incremented (now "2 views")

#### 8. Check View Count Increment

```sql
-- Check view count increased
SELECT view_count FROM reports 
WHERE share_token = 'your_token_here';

-- Should return 2 (or more)
```

---

## Detailed Testing Scenarios

### Scenario 1: Complete Flow Test

**Goal**: Test the entire user journey from sending email to viewing report.

**Steps**:
1. ✅ Login to dashboard
2. ✅ Navigate to Reports page
3. ✅ Generate report data (select date range)
4. ✅ Click "Email Report"
5. ✅ Fill in recipient details
6. ✅ Send report
7. ✅ Verify success message
8. ✅ Check database for saved report
9. ✅ Open email and click link
10. ✅ Verify public page loads
11. ✅ Check view count increments

**Expected Duration**: 5-7 minutes

---

### Scenario 2: Database Verification

**Goal**: Verify all data is correctly stored in the reports table.

**Test Report Structure**:
```sql
SELECT 
  -- Metadata
  id,
  user_id,
  organization_id,
  title,
  date_range,
  generated_at,
  
  -- Keywords
  total_keywords,
  keywords_change,
  avg_ranking,
  ranking_change,
  jsonb_array_length(top_keywords) as keywords_count,
  jsonb_array_length(ranking_trend) as trend_points,
  
  -- Content
  total_content,
  content_change,
  published_content,
  draft_content,
  jsonb_array_length(content_by_platform) as platforms_count,
  
  -- AI Visibility
  avg_visibility_score,
  total_mentions,
  jsonb_array_length(visibility_by_platform) as ai_platforms_count,
  
  -- Access
  is_public,
  share_token,
  expires_at,
  view_count
FROM reports
WHERE id = 'your_report_id';
```

**Verify**:
- ✅ All numeric fields > 0
- ✅ JSONB arrays not empty
- ✅ share_token is unique and 40 chars
- ✅ is_public = true
- ✅ expires_at is NULL
- ✅ view_count >= 0

---

### Scenario 3: RLS Policy Testing

**Goal**: Verify Row Level Security policies work correctly.

#### Test 3.1: Public Access (Anonymous)

```sql
-- Simulate anonymous user
SET ROLE anon;

-- Should succeed
SELECT * FROM reports WHERE share_token = 'test_token' AND is_public = true;

-- Should fail
SELECT * FROM reports WHERE is_public = false;

-- Reset role
RESET ROLE;
```

#### Test 3.2: User Access (Authenticated)

```sql
-- Simulate authenticated user
SET ROLE authenticated;

-- Users can see their own reports
SELECT * FROM reports WHERE user_id = auth.uid();

-- Users cannot see others' private reports
SELECT * FROM reports WHERE user_id != auth.uid() AND is_public = false;
-- Should return nothing

RESET ROLE;
```

#### Test 3.3: Insert Permission

```sql
-- Users can insert their own reports
INSERT INTO reports (user_id, title, date_range)
VALUES (auth.uid(), 'Test Report', 'Last 7 Days');

-- Users cannot insert for other users
INSERT INTO reports (user_id, title, date_range)
VALUES ('other_user_id', 'Test Report', 'Last 7 Days');
-- Should fail
```

---

### Scenario 4: API Endpoint Testing

#### Test 4.1: Send Email API

**Request**:
```bash
curl -X POST http://localhost:3000/api/reports/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "userName": "Test User",
    "reportData": {
      "dateRange": "Last 30 Days",
      "totalKeywords": 100,
      "avgRanking": 7.5,
      "totalContent": 50,
      "publishedContent": 30,
      "avgVisibilityScore": 75.0,
      "totalMentions": 150,
      "topKeywords": [],
      "visibilityByPlatform": []
    },
    "fullReportData": {
      "totalKeywords": 100,
      "keywordsChange": 10,
      "avgRanking": 7.5
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Report sent successfully",
  "reportId": "uuid",
  "shareToken": "abc123xyz...",
  "publicUrl": "http://localhost:3000/public/report/abc123xyz..."
}
```

#### Test 4.2: Public Report API

**Request**:
```bash
curl http://localhost:3000/api/reports/public/abc123xyz
```

**Expected Response**:
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "title": "Last 30 Days Performance Report",
    "date_range": "Last 30 Days",
    "total_keywords": 100,
    "avg_ranking": 7.5,
    "view_count": 3
  }
}
```

---

### Scenario 5: Edge Cases

#### Test 5.1: Invalid Share Token

**URL**: `http://localhost:3000/public/report/invalid_token`

**Expected**:
- Status: 404
- Error page: "Report Not Found"
- Message: "This report doesn't exist or has been removed."

#### Test 5.2: Expired Report

```sql
-- Create expired report
UPDATE reports 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE id = 'test_report_id';
```

**Access Public URL**:
**Expected**:
- Status: 410 (Gone)
- Error: "This report has expired"

#### Test 5.3: Private Report

```sql
-- Make report private
UPDATE reports 
SET is_public = false
WHERE id = 'test_report_id';
```

**Access Public URL**:
**Expected**:
- Status: 404
- Error: "Report not found or has been removed"

#### Test 5.4: Empty Report Data

Send email with minimal data to test graceful handling.

**Expected**:
- ✅ Report still saves
- ✅ Empty sections show "No data" messages
- ✅ Page doesn't crash

---

### Scenario 6: Performance Testing

#### Test 6.1: View Count Race Condition

**Setup**: Open 10 browser tabs simultaneously
**Action**: Load same public report in all tabs at once
**Expected**: View count increments correctly (no lost updates)

**Verify**:
```sql
-- Check final view count
SELECT view_count FROM reports WHERE share_token = 'test_token';
-- Should be >= 10
```

#### Test 6.2: Large Report Data

**Setup**: Create report with maximum data
- 1000+ keywords
- 100+ platforms
- Large JSONB arrays

**Action**: Load public report page
**Expected**: 
- ✅ Page loads in < 3 seconds
- ✅ All data renders
- ✅ No timeout errors

---

### Scenario 7: Mobile Testing

#### Test on Mobile Devices

1. **Send report** from desktop
2. **Open email** on mobile device
3. **Click** "View Public Report"
4. **Verify**:
   - ✅ Page is responsive
   - ✅ Cards stack vertically
   - ✅ Tables are scrollable
   - ✅ Text is readable
   - ✅ Buttons are tappable

---

## Automated Tests (Optional)

### Jest Test Example

```typescript
// __tests__/reports/public-report.test.ts

describe('Public Reports', () => {
  it('should create and save report when sending email', async () => {
    const response = await fetch('/api/reports/send-email', {
      method: 'POST',
      body: JSON.stringify({ /* test data */ }),
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.shareToken).toBeDefined();
    expect(result.publicUrl).toContain('/public/report/');
  });

  it('should fetch public report by share token', async () => {
    const response = await fetch('/api/reports/public/test_token');
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report.view_count).toBeGreaterThan(0);
  });

  it('should return 404 for invalid share token', async () => {
    const response = await fetch('/api/reports/public/invalid');
    expect(response.status).toBe(404);
  });
});
```

---

## Troubleshooting Test Failures

### Issue: "Table does not exist"

**Solution**:
```sql
-- Run migration
\i database/009_reports_table.sql
```

### Issue: "Permission denied"

**Solution**:
```sql
-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT ON public.reports TO anon;
```

### Issue: "Share token not generated"

**Solution**:
```sql
-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_set_share_token';

-- If missing, recreate trigger from migration
```

### Issue: "View count not incrementing"

**Solution**:
```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'increment_report_view_count';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_report_view_count TO anon;
```

### Issue: "Public page shows login prompt"

**Cause**: RLS policy not allowing anonymous access

**Solution**:
```sql
-- Verify policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'reports' 
AND policyname = 'Anyone can view public reports';

-- If missing, recreate from migration
```

---

## Success Criteria

### ✅ All Tests Pass When:

1. **Database**
   - ✅ Reports table exists
   - ✅ All indexes created
   - ✅ RLS policies active
   - ✅ Triggers working

2. **API**
   - ✅ Send email saves report
   - ✅ Share token generated
   - ✅ Public URL returned
   - ✅ Public API fetches report
   - ✅ View count increments

3. **Frontend**
   - ✅ Email contains public link
   - ✅ Public page loads
   - ✅ No auth required
   - ✅ All data displays
   - ✅ Responsive design

4. **Security**
   - ✅ Anonymous users can view public reports
   - ✅ Private reports inaccessible
   - ✅ Users can only edit their own reports
   - ✅ Share tokens unique

---

## Test Report Template

```markdown
## Test Execution Report

**Date**: YYYY-MM-DD
**Tester**: Your Name
**Environment**: Local / Staging / Production

### Test Results

| Test Scenario | Status | Notes |
|--------------|--------|-------|
| Database Migration | ✅ Pass | Table created successfully |
| Send Email & Save | ✅ Pass | Report saved with token |
| Public Page Load | ✅ Pass | Loaded in 1.2s |
| Anonymous Access | ✅ Pass | No login required |
| View Count | ✅ Pass | Incremented correctly |
| Mobile Responsive | ✅ Pass | Tested on iPhone 13 |
| RLS Policies | ✅ Pass | All policies working |

### Issues Found
- None

### Recommendations
- Consider adding PDF export
- Add social sharing buttons

**Overall Status**: ✅ PASS
```

---

**Ready to Test!** 🚀

Follow the Quick Test section above to verify everything works correctly.

