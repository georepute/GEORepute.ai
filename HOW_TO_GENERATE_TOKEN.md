# How to Generate Google Ads Refresh Token

## Current Status
❌ **Cannot run yet** - You need to add your Google Cloud credentials first

## Step-by-Step Process

### STEP 1: Get OAuth Credentials from Google Cloud

1. Open: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add redirect URI: `http://localhost:8080`
5. Click "Create"
6. **Copy the Client ID and Client Secret**

### STEP 2: Update the Script

Open: `scripts/generate-google-ads-token.js`

Find these lines (around line 26-27):
```javascript
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET_HERE';
```

Replace with your actual values:
```javascript
const CLIENT_ID = '123456789.apps.googleusercontent.com';  // Your actual Client ID
const CLIENT_SECRET = 'GOCSPX-xxxxxxxxxxxxx';  // Your actual Client Secret
```

**Save the file**

### STEP 3: Run the Script

Open PowerShell in the project root and run:
```powershell
node scripts/generate-google-ads-token.js
```

### STEP 4: Follow the Instructions

1. The script will show you a URL
2. Copy and paste it into your browser
3. Sign in with your Google account
4. Click "Allow" to grant permissions
5. Google will redirect to localhost (page may not load - that's OK!)
6. Copy the FULL URL from your browser address bar
   - It will look like: `http://localhost:8080/?code=4/0AY0e-g7xxxxx...`
7. Paste the entire URL (or just the code part) back into the terminal
8. Press Enter

### STEP 5: Save the Refresh Token

The script will output your refresh token. Copy it!

Add to `.env.local`:
```env
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret  
GOOGLE_ADS_REFRESH_TOKEN=1//your_refresh_token_here
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
```

## OR: Use Mock Data Mode (No Setup)

**Want to test right now without any setup?**

The KF2 feature already works with mock data!

Just:
1. Run: `npm run dev`
2. Go to: Dashboard → Google Ads Manager
3. Start using it!

No API credentials needed for testing.

---

**Need more details?** See: `GOOGLE_ADS_SETUP_GUIDE.md`

