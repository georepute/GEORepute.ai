# Troubleshooting: Error 403 - Access Denied

## 🚨 Problem

When trying to connect Google Search Console at `/dashboard/google-search-console`, you receive:

```
GeoRepute has not completed the Google verification process. 
The app is currently being tested, and can only be accessed by developer-approved testers.
Error 403: access_denied
```

---

## 🔍 Root Cause

This error occurs when your **Google OAuth app is in "Testing" mode** and the user trying to authenticate is **not added as a Test User** in the Google Cloud Console.

When a Google OAuth application is in testing/development mode, Google restricts access to only users explicitly added to the "Test Users" list.

---

## ✅ Solution 1: Add Test Users (Recommended for Development)

### Step-by-Step Instructions:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Select Your Project**
   - Click the project selector at the top
   - Choose your GEORepute project (e.g., `GEORepute-GSC`)

3. **Navigate to OAuth Consent Screen**
   - In the left sidebar, go to **"APIs & Services"**
   - Click **"OAuth consent screen"**

4. **Add Test Users**
   - Scroll down to the **"Test users"** section
   - Click **"+ ADD USERS"** button
   - Enter the email addresses that need access:
     - Your development email
     - Any other team member emails
     - Client test accounts (if applicable)
   - Click **"Add"**
   - Click **"Save"** at the bottom

5. **Test the Connection**
   - Wait 1-2 minutes for changes to propagate
   - Go back to your app: `/dashboard/google-search-console`
   - Click **"Connect Google Search Console"**
   - You should now be able to authenticate successfully

### Important Notes:
- ✅ You can add up to **100 test users** while in testing mode
- ✅ Test users must have Google accounts
- ✅ Changes take effect immediately (1-2 minutes max)
- ⚠️ In testing mode, only these users can access your OAuth app

---

## ✅ Solution 2: Publish Your App (For Production)

If you want **anyone** to be able to use your app without restrictions:

### Step-by-Step Instructions:

1. **Go to OAuth Consent Screen**
   - Navigate to **"APIs & Services"** → **"OAuth consent screen"**

2. **Review App Information**
   - Ensure all required fields are complete:
     - App name
     - User support email
     - Developer contact information
     - Privacy policy URL (if required)
     - Terms of service URL (if required)

3. **Click "Publish App"**
   - Click the **"PUBLISH APP"** button at the top
   - Confirm by clicking **"CONFIRM"**

4. **Verification Process**
   - For the scopes you're using, Google **may require verification**
   - Verification can take **3-7 business days**
   - You'll receive an email when verification is complete

### Scopes That May Require Verification:
```
https://www.googleapis.com/auth/webmasters
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/siteverification
https://www.googleapis.com/auth/siteverification.verify_only
```

### Verification Requirements:
- ✅ Verified domain ownership
- ✅ Privacy policy
- ✅ Terms of service
- ✅ Video demonstration of OAuth flow
- ✅ Homepage URL

---

## ✅ Solution 3: Use Internal User Type (Google Workspace Only)

If you have a **Google Workspace account**, you can restrict access to your organization:

### Step-by-Step Instructions:

1. **Go to OAuth Consent Screen**
   - Navigate to **"APIs & Services"** → **"OAuth consent screen"**

2. **Change User Type**
   - If currently set to "External", click **"EDIT APP"**
   - Change **User Type** from **"External"** to **"Internal"**
   - Click **"Save"**

3. **Benefits**
   - ✅ All users in your Google Workspace organization can access the app
   - ✅ No need to add individual test users
   - ✅ No Google verification required
   - ⚠️ Only works if you have Google Workspace (not free Gmail accounts)

---

## 🔧 Additional Checks

### 1. Verify OAuth Credentials

Make sure your environment variables are correctly set:

**`.env.local`**:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-search-console/callback
```

**For Production (Vercel)**:
```env
GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/google-search-console/callback
```

### 2. Verify Authorized Redirect URIs

In Google Cloud Console:
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click on your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, ensure you have:
   - Development: `http://localhost:3000/api/integrations/google-search-console/callback`
   - Production: `https://your-domain.com/api/integrations/google-search-console/callback`

### 3. Check Required APIs are Enabled

Ensure these APIs are enabled:
1. Go to **"APIs & Services"** → **"Library"**
2. Search and verify these are enabled:
   - ✅ **Google Search Console API**
   - ✅ **Site Verification API**

### 4. Verify Scopes in OAuth Consent Screen

1. Go to **"OAuth consent screen"**
2. Click **"EDIT APP"**
3. Go to **"Scopes"** section
4. Ensure these scopes are added:
   ```
   https://www.googleapis.com/auth/webmasters
   https://www.googleapis.com/auth/webmasters.readonly
   https://www.googleapis.com/auth/siteverification
   https://www.googleapis.com/auth/siteverification.verify_only
   ```

---

## 🐛 Still Having Issues?

### Check Server Logs

Look for detailed error messages:

**Local Development**:
```bash
# Check your terminal where `npm run dev` is running
```

**Vercel Production**:
```bash
# Use Vercel CLI
vercel logs

# Or check in Vercel Dashboard → Your Project → Deployments → [Latest] → Functions
```

### Common Error Messages:

| Error | Cause | Solution |
|-------|-------|----------|
| `access_denied` | User not added as test user | Add user to Test Users list |
| `redirect_uri_mismatch` | Redirect URI not authorized | Add URI to authorized list |
| `invalid_client` | Wrong Client ID/Secret | Check environment variables |
| `unauthorized_client` | Client not authorized for scope | Add scopes to OAuth consent screen |

---

## 📝 Quick Reference: Which Solution to Choose?

### Choose Solution 1 (Add Test Users) if:
- ✅ You're in development/testing phase
- ✅ You only need a few specific users to access the app
- ✅ You want the quickest solution
- ✅ You're not ready for public release

### Choose Solution 2 (Publish App) if:
- ✅ You're ready for production
- ✅ You want any user to be able to connect
- ✅ You can wait 3-7 days for verification
- ✅ You have privacy policy and terms of service

### Choose Solution 3 (Internal User Type) if:
- ✅ You have Google Workspace
- ✅ Only your organization needs access
- ✅ You don't want to manage test users individually
- ✅ You don't need external users

---

## ✨ After Fixing

Once you've added test users or published your app:

1. **Clear browser cache and cookies** (or use incognito mode)
2. Go to `/dashboard/google-search-console`
3. Click **"Connect Google Search Console"**
4. You should now see the Google OAuth consent screen
5. Click **"Allow"** to grant permissions
6. You'll be redirected back with a success message

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen Setup](https://support.google.com/cloud/answer/10311615)
- [OAuth Verification Process](https://support.google.com/cloud/answer/9110914)
- [Google Search Console API](https://developers.google.com/webmaster-tools/search-console-api-original)

---

## 🆘 Need More Help?

If you're still experiencing issues:

1. Check the detailed setup guide: `docs/GOOGLE_SEARCH_CONSOLE_SETUP.md`
2. Review the implementation: `docs/GSC_IMPLEMENTATION_SUMMARY.md`
3. Check environment variables: `docs/ENV_VARIABLES_TEMPLATE.md`

---

**Last Updated**: December 2024  
**Issue**: Error 403: access_denied  
**Status**: ✅ Resolved


