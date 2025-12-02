# Email Report - Quick Start Guide

## ⚡ Quick Setup (5 Minutes)

### Step 1: Get Gmail App Password (2 minutes)

1. **Open Google Account Settings**
   - Go to: https://myaccount.google.com/security
   - Or click your profile picture → "Manage your Google Account" → "Security"

2. **Enable 2-Step Verification** (if not already enabled)
   - Scroll to "How you sign in to Google"
   - Click "2-Step Verification"
   - Follow the setup wizard

3. **Generate App Password**
   - Still in Security settings
   - Scroll to "2-Step Verification" section
   - Click "App passwords" (at the bottom)
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter: "GeoRepute.ai"
   - Click **Generate**
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 2: Configure Environment (1 minute)

1. **Open your `.env.local` file** in the project root

2. **Add these lines** (or update if they exist):

```env
# Gmail SMTP for Email Reports
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
EMAIL_FROM_NAME_REPORT=GeoRepute.ai Reports
```

3. **Replace with your actual values:**
   - `GMAIL_USER`: Your Gmail address
   - `GMAIL_APP_PASSWORD`: The 16-character password (remove spaces)
   - `EMAIL_FROM_NAME_REPORT`: How you want the sender name to appear

**Example:**
```env
GMAIL_USER=myagency@gmail.com
GMAIL_APP_PASSWORD=xyza1234bcde5678
EMAIL_FROM_NAME_REPORT=My Agency Reports
```

### Step 3: Restart Server (1 minute)

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test the Feature (1 minute)

1. **Open your browser**: http://localhost:3000
2. **Login** to your account
3. **Navigate to**: Dashboard → Reports
4. **Click**: "Email Report" button (top-right, next to Export CSV)
5. **Fill in the modal**:
   - Name: Your name (pre-filled)
   - Email: Your email (pre-filled)
6. **Click**: "Send Report"
7. **Wait for success message**: "Report sent successfully!"
8. **Check your email inbox** (may take 10-30 seconds)

---

## 🎯 Expected Result

### In Your Inbox
You should receive an email with:
- **Subject**: "Your GeoRepute.ai Performance Report - [Date Range]"
- **From**: "GeoRepute.ai Reports" (or your custom name)
- **Content**: Beautiful HTML email with:
  - Gradient header
  - Key metrics cards (Keywords, Ranking, Content, Published)
  - AI Visibility performance section
  - Top keywords table
  - Platform breakdown
  - "View Full Report" button linking to dashboard

### Email Preview
```
┌─────────────────────────────────────────┐
│  📊 Performance Report                  │ ← Purple gradient header
│  Last 30 Days Analysis                  │
├─────────────────────────────────────────┤
│  Hi [Your Name],                        │
│                                         │
│  Here's your comprehensive performance  │
│  report for the selected period.        │
│                                         │
│  📈 Key Metrics Overview                │
│  ┌──────────┬──────────┐              │
│  │ Keywords │ Rankings │              │ ← 4 metric cards
│  │   150    │   8.5    │              │
│  ├──────────┼──────────┤              │
│  │ Content  │ Published│              │
│  │   45     │   32     │              │
│  └──────────┴──────────┘              │
│                                         │
│  🤖 AI Visibility Performance           │
│  Score: 78.5% | Mentions: 234          │
│  [Platform breakdown...]                │
│                                         │
│  🔑 Top Keywords                        │
│  [Keywords table...]                    │
│                                         │
│  [View Full Report Button]              │
└─────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Problem: "Email service not configured"

**Solution:**
```bash
# Check your .env.local file exists
ls -la .env.local

# Verify it contains the Gmail variables
cat .env.local | grep GMAIL

# Should show:
# GMAIL_USER=your-email@gmail.com
# GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

If missing, add them and restart the server.

### Problem: "Invalid login" or "Authentication failed"

**Possible Causes:**
1. App password has spaces (remove them)
2. Using regular Gmail password instead of App Password
3. 2-Step Verification not enabled

**Solution:**
```env
# WRONG - has spaces
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# CORRECT - no spaces
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

Generate a new App Password if needed.

### Problem: Email not arriving

**Check These:**
1. ✅ Check spam/junk folder
2. ✅ Verify email address is correct
3. ✅ Check Gmail's "Sent" folder
4. ✅ Wait 1-2 minutes (Gmail may delay)
5. ✅ Check browser console for errors (F12)

**Gmail Limits:**
- Free account: 500 emails per day
- Google Workspace: 2000 emails per day

### Problem: Modal not opening

**Solution:**
1. Check browser console (F12) for errors
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Clear cache and reload
4. Check if button exists on page

---

## 📱 Using the Feature

### From Reports Dashboard

1. **Select Date Range**
   - 7 Days: Quick weekly summary
   - 30 Days: Monthly performance review
   - 90 Days: Quarterly analysis

2. **Click "Email Report"**
   - Located in top-right header
   - Next to "Export CSV" button
   - Purple border, mail icon

3. **Review Modal**
   - **Name**: Recipient's name (editable)
   - **Email**: Recipient's email (editable)
   - **Summary**: Preview of what's included
   - Shows: date range, keywords, content, platforms

4. **Send or Cancel**
   - **Cancel**: Close modal without sending
   - **Send Report**: Sends email immediately

5. **Wait for Confirmation**
   - Loading spinner appears
   - Success: Green toast notification
   - Error: Red toast with error message

---

## 🎨 Customization

### Change Sender Name

In `.env.local`:
```env
# Default
EMAIL_FROM_NAME_REPORT=GeoRepute.ai Reports

# Custom for your agency
EMAIL_FROM_NAME_REPORT=Acme Digital Reports

# Custom for your brand
EMAIL_FROM_NAME_REPORT=Your Brand Analytics
```

### Change App URL (for email links)

```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

Links in the email will use this URL.

---

## 🚀 Advanced Usage

### Sending to Multiple Recipients

Currently, the UI supports one recipient at a time. To send to multiple people:

1. Send report to first person
2. Modal closes automatically on success
3. Click "Email Report" again
4. Enter next recipient
5. Send

### Scheduled Reports (Future Enhancement)

Not currently implemented. The feature currently sends on-demand only.

**Workaround:**
- Use a cron job to call the API endpoint
- Schedule in external service (Zapier, etc.)

---

## 📊 What's Included in Reports

### Metrics Sent
- ✅ Total Keywords
- ✅ Average Ranking Score
- ✅ Total Content Pieces
- ✅ Published Content Count
- ✅ AI Visibility Score (percentage)
- ✅ Total Mentions across AI platforms
- ✅ Top 10 Keywords (with ranking & volume)
- ✅ Top 5 AI Platforms (with scores & mentions)

### Not Included (in email)
- ❌ Full ranking trends (available in dashboard)
- ❌ Detailed content list (available in dashboard)
- ❌ Performance charts (available in dashboard)
- ❌ All keywords (limited to top 10)
- ❌ All platforms (limited to top 5)

**Reason**: Email size limits and readability. Full data available in dashboard.

---

## ✅ Success Checklist

- [ ] Gmail App Password generated
- [ ] Environment variables added to `.env.local`
- [ ] Server restarted
- [ ] Logged into application
- [ ] Navigated to Reports page
- [ ] Date range selected
- [ ] "Email Report" button visible
- [ ] Modal opens when clicked
- [ ] Email address pre-filled
- [ ] Can edit name and email
- [ ] "Send Report" button works
- [ ] Success notification appears
- [ ] Email received in inbox
- [ ] Email looks professional
- [ ] "View Full Report" link works

---

## 🎉 You're All Set!

The email report feature is now ready to use. Send reports to:
- ✉️ Yourself (for review)
- 👥 Team members
- 💼 Clients
- 📊 Stakeholders
- 📈 Management

**Pro Tips:**
1. Test with your own email first
2. Check spam folder on first send
3. Add sender to contacts to avoid spam
4. Use consistent sender name for branding
5. Send at consistent times for familiarity

---

**Need Help?**
- Check: `docs/EMAIL_REPORT_SETUP.md` (detailed guide)
- Check: `docs/IMPLEMENTATION_SUMMARY.md` (technical details)
- Check: Browser console (F12) for errors
- Check: Server logs for detailed error messages

**Happy Reporting! 🚀**

