# ⚡ Quick Fix: Error 403 Access Denied

## 🎯 The Error
```
GeoRepute has not completed the Google verification process.
Error 403: access_denied
```

## ✅ 5-Minute Fix

### Step 1: Go to Google Cloud Console
https://console.cloud.google.com/

### Step 2: Navigate to OAuth Settings
1. Click on your project (e.g., `GEORepute-GSC`)
2. Left sidebar: **APIs & Services** → **OAuth consent screen**

### Step 3: Add Test Users
1. Scroll down to **"Test users"** section
2. Click **"+ ADD USERS"**
3. Enter your email address (the one you're trying to connect with)
4. Click **"Add"**
5. Click **"SAVE"** at the bottom

### Step 4: Try Again
1. Wait 1-2 minutes
2. Go to: `/dashboard/google-search-console`
3. Click **"Connect Google Search Console"**
4. ✅ Should work now!

---

## 🤔 Why This Happens

Your Google OAuth app is in **"Testing" mode**, which means only users you explicitly add can use it. This is Google's security feature to protect apps during development.

---

## 🚀 For Production

When you're ready to let anyone connect:

1. OAuth consent screen → Click **"PUBLISH APP"**
2. Complete verification (takes 3-7 days)
3. Anyone can then connect

---

## 📖 Full Documentation

For more details, see: `docs/TROUBLESHOOTING_403_ACCESS_DENIED.md`

---

**Quick Reference**: Add your email to Test Users in Google Cloud Console OAuth consent screen.


