# Google Ads Test Account Setup Guide

## Why You Need a Test Account

If you're using a **Test Developer Token**, it only works with Google Ads **Test Accounts**, not production accounts. This is by design to prevent accidental charges or changes to real advertising campaigns during development.

## Error You'll See

```
DEVELOPER_TOKEN_NOT_APPROVED: The developer token is only approved for use with test accounts.
```

## Solution: Create a Test Account

### Step 1: Access Google Ads Manager

1. Go to [Google Ads](https://ads.google.com)
2. Sign in with your Google account
3. Click **"Tools & Settings"** (wrench icon in top right)

### Step 2: Navigate to Manager Accounts

1. Under **"Setup"**, click **"Manager accounts"**
2. Or go directly to: https://ads.google.com/aw/manager

### Step 3: Create Test Account

1. Click **"Test account"** option
2. Click **"Create test account"**
3. Fill in the test account details:
   - **Account name**: e.g., "Local Development Test"
   - **Time zone**: Your local time zone
   - **Currency**: Your preferred currency
4. Click **"Create"**

### Step 4: Get Test Account Customer ID

1. Once created, you'll see the test account in your list
2. Click on the test account
3. Look for the **Customer ID** (format: XXX-XXX-XXXX)
4. Copy this Customer ID

### Step 5: Update Your Environment Variables

Add the test account ID to your `.env.local`:

```env
# Existing variables
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_DEVELOPER_TOKEN=your_test_developer_token
GOOGLE_ADS_CUSTOMER_ID=your_production_customer_id

# Add this for test account
GOOGLE_ADS_TEST_ACCOUNT_ID=your-test-customer-id
```

### Step 6: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

## How It Works

The application will now:
- ✅ Use `GOOGLE_ADS_TEST_ACCOUNT_ID` when it's set
- ✅ Work with your test developer token
- ✅ Generate real keyword ideas from the Google Ads API
- ✅ Fall back to `GOOGLE_ADS_CUSTOMER_ID` when test account is not set

## Local Testing Without Test Account

If you haven't set up a test account yet, the app will automatically:
- 🎯 Provide **enhanced mock data** with realistic keyword variations
- 📊 Show search volumes, competition levels, and bid estimates
- ⚡ Work immediately for UI/UX testing
- 🧪 Display a warning banner indicating test mode

## Upgrading to Production Access

### Apply for Basic Access

Once you're ready for production:

1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Click **"Apply for access"**
3. Fill out the application form:
   - Describe your application
   - Explain how you'll use the API
   - Provide your website/app details
4. Submit and wait for approval (usually 1-2 business days)

### After Approval

Once approved for **Basic** or **Standard** access:
- Remove or comment out `GOOGLE_ADS_TEST_ACCOUNT_ID`
- Use your production `GOOGLE_ADS_CUSTOMER_ID`
- Your app will work with real accounts!

## Troubleshooting

### "No test account option"

- You need a **Google Ads Manager Account** (MCC account)
- Create one at: https://ads.google.com/aw/manager

### "Test account not showing in dropdown"

- Make sure you're selecting the test account, not your production account
- Test accounts are marked with a "Test" label

### "Still getting permission denied"

- Double-check the Customer ID format (remove dashes in code)
- Ensure you're using the OAuth2 credentials that match your developer token
- Verify your refresh token is still valid

## Need Help?

- [Google Ads API Documentation](https://developers.google.com/google-ads/api)
- [Test Accounts Guide](https://developers.google.com/google-ads/api/docs/best-practices/testing)
- [API Support](https://developers.google.com/google-ads/api/support)

---

**Last Updated**: January 2026

