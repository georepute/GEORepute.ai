# Email Report Configuration Guide

This guide explains how to set up email reporting functionality using Gmail SMTP.

## Prerequisites

1. A Gmail account
2. Gmail App Password (NOT your regular Gmail password)

## Step 1: Generate Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "GeoRepute.ai" and click **Generate**
6. Copy the 16-character password (you won't be able to see it again)

## Step 2: Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_FROM_NAME_REPORT=GeoRepute.ai Reports

# Optional: Generic email sender name
EMAIL_FROM_NAME=GeoRepute.ai

# Application URL (for links in emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Environment Variables Explanation

- **GMAIL_USER**: Your Gmail email address that will send the reports
- **GMAIL_APP_PASSWORD**: The 16-character app password generated from Google
- **EMAIL_FROM_NAME_REPORT**: The display name for report emails (e.g., "GeoRepute.ai Reports")
- **EMAIL_FROM_NAME**: Generic display name for other emails (optional)
- **NEXT_PUBLIC_APP_URL**: Your application URL (used for links in emails)

## Step 3: Using the Email Report Feature

### From the Dashboard

1. Navigate to **Dashboard** → **Reports**
2. Select your desired date range (7 days, 30 days, or 90 days)
3. Click the **"Email Report"** button in the top-right corner
4. Enter recipient details:
   - **Recipient Name**: Name of the person receiving the report
   - **Email Address**: Email address to send the report to
5. Review the report summary
6. Click **"Send Report"**

### What's Included in the Report

The email report includes:

- **Key Metrics Overview**
  - Total Keywords tracked
  - Average Ranking
  - Total Content pieces
  - Published Content count

- **AI Visibility Performance**
  - Overall Visibility Score
  - Total Mentions across AI platforms
  - Platform-by-platform breakdown (top 5 platforms)

- **Top Keywords**
  - Up to 10 top-performing keywords
  - Ranking scores
  - Search volumes

## API Endpoint

The email sending is handled by: `/api/reports/send-email`

### Request Format

```json
{
  "email": "recipient@example.com",
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
  }
}
```

### Response

Success:
```json
{
  "success": true,
  "message": "Report sent successfully"
}
```

Error:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Email Template Features

The report email includes:

- 📊 **Professional Design**: Gradient headers and clean layout
- 📈 **Interactive Metrics**: Color-coded performance indicators
- 🤖 **AI Platform Breakdown**: Visual representation of platform performance
- 🔑 **Top Keywords Table**: Easy-to-read keyword performance data
- 🔗 **Call-to-Action Button**: Direct link to view the full report in the dashboard
- 📱 **Responsive**: Works great on desktop and mobile devices

## Troubleshooting

### Error: "Email service not configured"

**Solution**: Make sure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in your `.env.local` file.

### Error: "Invalid login"

**Solution**: 
1. Verify your Gmail App Password is correct (16 characters, no spaces)
2. Ensure 2-Step Verification is enabled on your Google Account
3. Generate a new App Password if needed

### Error: "Failed to send email"

**Possible causes**:
1. Gmail daily sending limit reached (500 emails/day for free accounts)
2. Network/firewall blocking SMTP connection
3. Invalid email address format

### Emails not arriving

**Check**:
1. Spam/Junk folder
2. Email address is correct
3. Gmail account has sending permissions
4. Check Gmail's "Sent" folder to confirm it was sent

## Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Use App Passwords** instead of your main Gmail password
3. **Rotate passwords** regularly
4. **Limit access** to the `.env.local` file on your server
5. **Monitor usage** to detect any unauthorized sending

## Development vs Production

### Development (localhost)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

Make sure to update the `NEXT_PUBLIC_APP_URL` when deploying to production so that links in the email point to the correct URL.

## Additional Features

The email service (`lib/email.ts`) also supports:

- **Organization Invitations**: `sendInvitationEmail()`
- **Welcome Emails**: `sendWelcomeEmail()`
- **Custom Emails**: `sendEmail()` for general-purpose emails

## Support

If you encounter any issues:

1. Check the server logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test with a simple email first using the `sendEmail()` function
4. Ensure your Gmail account is in good standing

---

**Last Updated**: December 2025

