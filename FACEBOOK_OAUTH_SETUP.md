# Facebook OAuth Setup Guide

## Overview
This guide explains how to set up Facebook OAuth for your GEORepute.ai application. With OAuth, users can connect their Facebook accounts with one click instead of manually entering tokens.

## Step 1: Create Facebook App (One-Time Setup)

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Click **"Create App"**
3. Choose **"Business"** as the app type
4. Fill in:
   - **App Name**: `GEORepute.ai` (or your brand name)
   - **App Contact Email**: Your email
   - **Business Account**: (Optional)
5. Click **"Create App"**

## Step 2: Add Facebook Login Product

1. In your app dashboard, click **"Add Product"**
2. Find **"Facebook Login"** and click **"Set Up"**
3. Choose **"Web"** as the platform

## Step 3: Configure OAuth Settings

### For Local Development (localhost):

1. Go to **Settings** → **Basic**
2. Under **"App Domains"**, you can leave this empty for localhost (or add `localhost`)
3. Click **"Add Platform"** → **"Website"** (if not already added)
4. Enter your **Site URL**:
   - For localhost: `http://localhost:3000`
   - For production: `https://yourdomain.com`

### Find "Valid OAuth Redirect URIs":

The redirect URI setting is in **Facebook Login** product settings, NOT in Basic settings:

1. In your app dashboard, go to **Products** → **Facebook Login** → **Settings**
2. Scroll down to **"Valid OAuth Redirect URIs"** section
3. Click **"Add URI"** and add:
   - **For localhost**: `http://localhost:3000/api/auth/facebook/callback`
   - **For production**: `https://geo-repute-ai.vercel.app/api/auth/facebook/callback`
4. Click **"Save Changes"**

**Important**: 
- For localhost, use `http://` (not `https://`)
- The URI must match EXACTLY (including protocol, port, and path)
- You can add multiple URIs (one for localhost, one for production)

## Step 4: Add Permissions to Your App

**Important**: You need to ADD permissions to your app first, then you can request them for review (if needed).

### Step 4a: Add Permissions (Required)

**In Graph API Explorer (for testing):**

**Good News**: You don't need `pages_manage_posts` if you use a **Page Access Token**!

1. In the **"User or Page"** dropdown, select **"Get Page Access Token"** (NOT "Get User Access Token")
2. In the **"page"** dropdown below, select your Facebook Page
3. **Important**: When you select a Page and get a Page Access Token, it automatically has permission to post to that page - you don't need `pages_manage_posts`!
4. Your current permissions are fine:
   - `pages_read_engagement` ✅ (you have this)
   - `pages_show_list` ✅ (you have this)
   - `business_management` ✅ (you have this - optional but good)
   - `publish_video` ✅ (you have this - optional, for videos)

**How to generate Page Access Token:**
1. Select **"Get Page Access Token"** in "User or Page" dropdown
2. Select your Page in the "page" dropdown
3. Click **"Generate Access Token"**
4. Authorize and copy the token
5. This token can post to your page directly!

**Note**: 
- Page Access Token = Can post to that specific page (no extra permission needed)
- User Access Token = Needs `pages_manage_posts` permission to post
- Since we're using Page Access Token, we don't need `pages_manage_posts`!

**In Facebook App Settings (for OAuth):**

Since `pages_manage_posts` is not available, we'll use a different approach:

1. Go to **Products** → **Facebook Login** → **Settings**
2. Scroll down to **"App Review for Permissions and Features"** section
3. The permissions you already have are sufficient:
   - `pages_read_engagement` ✅ (you have this - allows reading page data)
   - `pages_show_list` ✅ (you have this - allows listing user's pages)
   - `business_management` ✅ (you have this - optional but helpful)

**How OAuth will work:**
- User authorizes with `pages_show_list` permission
- We get their pages using `/me/accounts` endpoint
- Each page in the response includes a **Page Access Token**
- We use that Page Access Token to post (no `pages_manage_posts` needed!)
- Page Access Tokens have built-in posting permissions

**Note about your existing permissions:**
- `publish_video` - For posting videos (optional, not needed for text posts)
- `business_management` - For managing business assets (optional, but you have it)
- `pages_read_engagement` - Required ✅
- `pages_show_list` - Required ✅ (to get user's pages)

### Step 4b: Request Permissions for Review (Optional for Development)

**For Development/Testing** (Your Own Account):
- ✅ You can use these permissions immediately with YOUR OWN Facebook account
- ✅ No App Review needed for testing with your account
- ✅ Just add the permissions (Step 4a) and they'll work for you

**For Production** (Other Users):
- ⚠️ You need App Review approval to use these permissions with other users
- ⚠️ Go to **App Review** → **Permissions and Features**
- ⚠️ Click on each permission → **"Request"** or **"Submit for Review"**
- ⚠️ Fill out the review form explaining why you need each permission

**Note**: 
- For **development**, you only need Step 4a (add permissions)
- For **production with other users**, you need both Step 4a and Step 4b (add + request review)

## Step 5: Get App Credentials

1. Go to **Settings** → **Basic**
2. Copy:
   - **App ID**: `1234567890123456`
   - **App Secret**: `abc123def456...` (click "Show" to reveal)

## Step 6: Add Environment Variables

Add these to your `.env.local` file:

### For Local Development (localhost):

```env
# Facebook OAuth Configuration
FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=abc123def456...
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback

# For Next.js frontend (public) - used in OAuth button
NEXT_PUBLIC_FACEBOOK_APP_ID=1234567890123456
```

### For Production:

```env
# Facebook OAuth Configuration
FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=abc123def456...
FACEBOOK_REDIRECT_URI=https://yourdomain.com/api/auth/facebook/callback

# For Next.js frontend (public)
NEXT_PUBLIC_FACEBOOK_APP_ID=1234567890123456
```

**Important**:
- For **localhost**: Use `http://localhost:3000` (not https)
- For **production**: Use `https://yourdomain.com` (must be https)
- `FACEBOOK_APP_SECRET` should NEVER be exposed to the frontend
- `NEXT_PUBLIC_FACEBOOK_APP_ID` is safe to expose (used in OAuth URL)
- The redirect URI must match EXACTLY what you entered in Facebook App settings

## Step 7: Test the Integration (Localhost)

### Quick Setup for Localhost:

1. **In Facebook App Settings**:
   - Go to **Products** → **Facebook Login** → **Settings**
   - Add redirect URI: `http://localhost:3000/api/auth/facebook/callback`
   - Save changes

2. **In your `.env.local` file**:
   ```env
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback
   NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id
   ```

3. **Start your development server**:
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

4. **Test the flow**:
   - Go to `http://localhost:3000/dashboard/settings`
   - Scroll to Facebook Integration section
   - Click **"Connect Facebook"**
   - You should be redirected to Facebook login
   - After authorizing, you'll be redirected back to `http://localhost:3000/dashboard/settings?facebook=connected`
   - Your Facebook Page should be automatically connected

### Common Localhost Issues:

**"Invalid redirect URI"**:
- Make sure you added `http://localhost:3000/api/auth/facebook/callback` in Facebook App settings
- Check that `.env.local` has the same URI
- Restart your dev server after changing env vars

**"App ID not found"**:
- Make sure `NEXT_PUBLIC_FACEBOOK_APP_ID` is in `.env.local`
- Restart dev server: `npm run dev`

## How It Works

### User Flow:
1. User clicks "Connect Facebook" button
2. Redirected to Facebook OAuth page
3. User logs in and authorizes your app
4. Facebook redirects back with authorization code
5. Your app exchanges code for access token
6. Your app gets user's pages automatically
7. Token and page info saved to Supabase
8. User sees "Connected" status

### Data Storage:
- All data stored in Supabase `platform_integrations` table
- Each user has their own row
- Access tokens stored securely
- Page information stored in metadata JSONB field

## Troubleshooting

### "Facebook App ID not configured"
- Make sure `NEXT_PUBLIC_FACEBOOK_APP_ID` is set in `.env.local`
- Restart your development server after adding env vars

### "Invalid redirect URI"
- Check that your redirect URI in `.env.local` matches exactly what's in Facebook App settings
- Must include protocol (https://) and full path
- No trailing slashes

### "No pages found"
- User must have at least one Facebook Page
- User must grant `pages_show_list` permission
- Make sure you added `pages_show_list` permission to your app (Step 4a)
- For development: Permissions work with your own account without App Review
- For production: Check that permissions are approved in App Review (if required)

### "Permissions not showing in App Review"
- First, you must ADD permissions to your app (Step 4a)
- Permissions appear in App Review only after you've added them to your app
- Go to **Products** → **Facebook Login** → **Settings** and add permissions first
- Then they'll appear in **App Review** → **Permissions and Features**

### "Token expired"
- Short-lived tokens expire in ~1 hour
- The system automatically exchanges for long-lived tokens (60 days)
- Users can reconnect if token expires

## Security Notes

1. **App Secret**: Never commit to git, never expose to frontend
2. **Access Tokens**: Stored securely in Supabase, never exposed to frontend
3. **HTTPS**: Always use HTTPS in production
4. **Redirect URI**: Validate redirect URIs to prevent attacks
5. **State Parameter**: Consider implementing state parameter for CSRF protection

## Production Checklist

- [ ] Facebook App created and configured
- [ ] OAuth redirect URIs set correctly
- [ ] Permissions requested and approved (if needed)
- [ ] Environment variables set in production
- [ ] HTTPS enabled
- [ ] Test OAuth flow end-to-end
- [ ] Monitor token expiration and refresh logic

## Support

If you encounter issues:
1. Check Facebook App Dashboard for error messages
2. Review server logs for API errors
3. Verify environment variables are set correctly
4. Test with Facebook Graph API Explorer to verify tokens work

