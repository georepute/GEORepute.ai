# Debugging Email Report Link Issue

## ✅ Issue Fixed!

The `expires_at` field reference has been removed from the API. Now let's debug why the email button redirects to login.

---

## 🔍 Debugging Steps

### Step 1: Verify Database Migration

```sql
-- In Supabase SQL Editor, check if reports table exists
SELECT * FROM reports LIMIT 1;

-- Expected: Table exists (even if empty)
-- Error means: Migration not run yet
```

**If you get an error**, run the migration:
```sql
-- Execute the entire file:
-- database/009_reports_table.sql
```

### Step 2: Test Report Creation

1. **Open browser console** (F12)
2. **Go to Dashboard → Reports**
3. **Click "Email Report"**
4. **Fill in details and send**
5. **Check console for errors**

Look for:
```
✅ Success: "Report sent successfully!"
❌ Error: Check what the error says
```

### Step 3: Check Database

After sending email, verify report was saved:

```sql
-- Check if report was created
SELECT 
  id,
  title,
  date_range,
  is_public,
  created_at
FROM reports
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- ✅ New record with your report
- ✅ `id` is a UUID
- ✅ `is_public = true`

**If no record:**
- Check console for errors
- Check Supabase logs
- Verify RLS policies

### Step 4: Check API Response

In browser console after sending email, check the response:

```javascript
// Should see something like:
{
  success: true,
  message: "Report sent successfully",
  reportId: "550e8400-e29b-41d4-a716-446655440000",
  publicUrl: "http://localhost:3000/public/report/550e8400-..."
}
```

**If `reportId` is null:**
- `fullReportData` might not be sent
- Report insert might have failed
- Check server logs

### Step 5: Test Public URL Manually

Copy the report ID from database and test:

```
http://localhost:3000/public/report/[paste-uuid-here]
```

**Expected:**
- ✅ Public report page loads
- ✅ No login required
- ✅ All data displays

**If redirects to login:**
- RLS policies might not be set up
- Report might have `is_public = false`
- Report might not exist

---

## 🐛 Common Issues

### Issue 1: "Table does not exist"

**Solution:**
```sql
-- Run migration
\i database/009_reports_table.sql
```

### Issue 2: "Permission denied for table reports"

**Solution:**
```sql
-- Grant permissions (should be in migration)
GRANT SELECT ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
```

### Issue 3: Email button goes to `/login`

**Cause:** `reportId` is null, so email falls back to dashboard URL

**Debug:**
1. Check if `fullReportData` is sent in API request
2. Check if report insert succeeded (look for errors in logs)
3. Verify `savedReport` is not null
4. Verify `savedReport.id` exists

**Fix:**
```typescript
// In send-email API, add logging:
console.log('fullReportData received:', !!fullReportData);
console.log('savedReport:', savedReport);
console.log('reportId:', savedReport?.id);
```

### Issue 4: "Report not found" on public page

**Causes:**
- Report was not saved
- RLS policy blocking access
- Report ID in URL is wrong

**Debug:**
```sql
-- Check if report exists and is public
SELECT id, is_public FROM reports WHERE id = 'your-uuid-here';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'reports';
```

---

## ✅ Verification Checklist

After fixing, verify everything works:

- [ ] Database migration run successfully
- [ ] `reports` table exists
- [ ] RLS policies created
- [ ] Can send report via email
- [ ] Report saved to database (check with SQL)
- [ ] API response includes `reportId` and `publicUrl`
- [ ] Email received
- [ ] Email button says "View Public Report"
- [ ] Button URL contains `/public/report/[uuid]`
- [ ] Clicking button opens public page (no login)
- [ ] Public page shows all data
- [ ] Can share URL with others
- [ ] Incognito mode works (no login required)

---

## 🔍 Server-Side Logging

Add this to `app/api/reports/send-email/route.ts` for debugging:

```typescript
// After line 49 (inside if (fullReportData))
console.log('📊 Attempting to save report...');

// After line 91 (after insert)
if (reportError) {
  console.error('❌ Report save error:', reportError);
} else {
  console.log('✅ Report saved successfully!');
  console.log('📝 Report ID:', report?.id);
  console.log('🔗 Public URL will be:', 
    `${process.env.NEXT_PUBLIC_APP_URL}/public/report/${report?.id}`
  );
}

// After line 106 (before sending email)
console.log('📧 Sending email with reportId:', savedReport?.id);
```

Restart server and check terminal logs when sending email.

---

## 🚀 Quick Fix Steps

If you're experiencing the login redirect:

1. **Restart your development server** (important!)
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache** (or open incognito)

3. **Try sending a new report**

4. **Check the email for the button URL**

5. **Right-click button → Copy link** and paste to see if it has UUID

**Expected URL:**
```
http://localhost:3000/public/report/550e8400-e29b-41d4-a716-446655440000
```

**Wrong URL (causes login redirect):**
```
http://localhost:3000/dashboard/reports
```

---

## 📞 Need More Help?

If still not working:

1. **Check Supabase logs**:
   - Go to Supabase Dashboard
   - Logs → API
   - Look for errors during report insert

2. **Check browser network tab**:
   - F12 → Network
   - Send report
   - Check `/api/reports/send-email` request/response

3. **Verify environment variables**:
   ```bash
   # Check .env.local has:
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   GMAIL_USER=...
   GMAIL_APP_PASSWORD=...
   ```

---

**Most Common Fix:** Restart the development server! 🔄

```bash
# Stop (Ctrl+C) then:
npm run dev
```

The changes won't take effect until the server restarts!

