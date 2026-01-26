# Google Ads API - Setup & Token Generation Guide

## Prerequisites Checklist

Before running the token generator, complete these steps:

### ☐ Step 1: Create/Access Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Note your project name

### ☐ Step 2: Enable Google Ads API

1. In your Google Cloud project, go to: https://console.cloud.google.com/apis/library
2. Search for "Google Ads API"
3. Click "Enable"
4. Wait for confirmation

### ☐ Step 3: Create OAuth 2.0 Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (or Internal if using Workspace)
   - App name: GeoRepute.ai Google Ads Integration
   - Support email: Your email
   - Scopes: Add https://www.googleapis.com/auth/adwords
4. Return to Create OAuth client ID:
   - Application type: **Web application**
   - Name: GeoRepute Google Ads Client
   - Authorized redirect URIs: Add `urn:ietf:wg:oauth:2.0:oob`
5. Click "Create"
6. **SAVE YOUR CREDENTIALS:**
   - Client ID (looks like: xxxxx.apps.googleusercontent.com)
   - Client Secret (random string)

### ☐ Step 4: Get Google Ads Developer Token

1. Sign in to your Google Ads account: https://ads.google.com/
2. Click "Tools & Settings" (wrench icon)
3. Under "Setup", click "API Center"
4. Click "Apply for API access" (if not already applied)
5. **Note**: Developer token approval can take 24-48 hours
6. Once approved, copy your developer token

### ☐ Step 5: Update Token Generator Script

1. Open: `scripts/generate-google-ads-token.js`
2. Replace these lines (around line 26-27):
   ```javascript
   const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
   const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
   ```
   With your actual credentials:
   ```javascript
   const CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
   const CLIENT_SECRET = 'your-actual-client-secret';
   ```
3. Save the file

## Running the Token Generator

Once you've completed the setup above, run:

```powershell
# Navigate to project root (if not already there)
cd D:\office\GEORepute.ai

# Run the token generator
node scripts/generate-google-ads-token.js
```

### What Happens Next:

1. The script will display an authorization URL
2. Copy and paste the URL into your browser
3. Sign in with your Google account
4. Grant permissions to the app
5. Google will display an authorization code
6. Copy the authorization code
7. Paste it back into the terminal when prompted
8. The script will exchange it for a refresh token
9. Copy the refresh token to your `.env.local` file

## Expected Output

```
============================================================
Google Ads API - OAuth2 Refresh Token Generator
============================================================

Step 1: Authorize this application
------------------------------------------------------------
Visit this URL in your browser:

https://accounts.google.com/o/oauth2/v2/auth?client_id=...

------------------------------------------------------------

Step 2: Enter the authorization code: [paste code here]

Exchanging authorization code for tokens...

✅ Success! Your tokens:
============================================================

REFRESH TOKEN (save this to .env.local):
1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

ACCESS TOKEN (temporary, expires in 1 hour):
ya29.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

============================================================

Add this to your .env.local file:

GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CUSTOMER_ID=your_customer_id
```

## Update .env.local

Create or update `D:\office\GEORepute.ai\.env.local`:

```env
# Google Ads API Configuration
GOOGLE_ADS_CLIENT_ID=your_client_id_here
GOOGLE_ADS_CLIENT_SECRET=your_client_secret_here
GOOGLE_ADS_REFRESH_TOKEN=1//your_refresh_token_here
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token_here
GOOGLE_ADS_CUSTOMER_ID=123-456-7890

# Existing Supabase variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note**: 
- `GOOGLE_ADS_CUSTOMER_ID` is your Google Ads customer ID (found in Google Ads dashboard, format: 123-456-7890)
- Never commit `.env.local` to git (it should be in `.gitignore`)

## Troubleshooting

### Error: "CLIENT_ID not updated"
- You need to edit the script and replace the placeholder values

### Error: "Invalid authorization code"
- The code may have expired (they expire in ~10 minutes)
- Generate a new authorization URL and try again

### Error: "redirect_uri_mismatch"
- Make sure you added `urn:ietf:wg:oauth:2.0:oob` as an authorized redirect URI in Google Cloud Console

### Error: "Access denied"
- Check that you granted all requested permissions
- Make sure you're signed in with the correct Google account

### Developer Token Pending
- You can still test with mock data while waiting for approval
- The KF2 feature works without Google Ads API credentials

## Testing the Integration

After adding credentials to `.env.local`:

1. Restart your Next.js server
2. Navigate to Dashboard → Google Ads Manager
3. Try generating keyword ideas
4. Check the console for any API errors

## Need Help?

- Review: `docs/KF2_GOOGLE_ADS_INTEGRATION.md` for detailed API setup
- Review: `docs/KF2_QUICK_START.md` for feature usage
- Check Google Ads API docs: https://developers.google.com/google-ads/api/docs/start

---

**Important**: Keep your credentials secure and never share them publicly!

