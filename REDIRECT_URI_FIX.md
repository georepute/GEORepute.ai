# Quick Fix: Redirect URI Issue

## ✅ What I Fixed

Changed the redirect URI from the deprecated OOB flow to localhost:
- ❌ Old: `urn:ietf:wg:oauth:2.0:oob` (deprecated by Google)
- ✅ New: `http://localhost:8080`

## 🔧 Steps to Fix in Google Cloud Console

### 1. Open Google Cloud Console
Go to: https://console.cloud.google.com/apis/credentials

### 2. Edit Your OAuth Client
- Find and click: `228938923426-srngl0vhiifcupfklg2enaq64tpt5dpk`

### 3. Update Redirect URIs
Under "Authorized redirect URIs" section:

**Remove** (if present):
```
urn:ietf:wg:oauth:2.0:oob
```

**Add**:
```
http://localhost:8080
```

### 4. Save
Click the "SAVE" button at the bottom

### 5. Wait
Wait 1-2 minutes for changes to propagate

## 🚀 Run the Script

```powershell
node scripts\generate-google-ads-token.js
```

## 📝 What Will Happen

1. Script displays an authorization URL
2. You visit the URL in your browser
3. Sign in and click "Allow"
4. Google redirects to `http://localhost:8080/?code=xxx...`
5. **The page won't load (that's normal!)**
6. Copy the FULL URL from your browser address bar
7. Paste it into the terminal
8. Script extracts the code and generates your refresh token

## 💡 Example

After clicking "Allow", your browser will show a URL like:
```
http://localhost:8080/?code=4/0AY0e-g7abc123def456ghi789jkl...&scope=https://www.googleapis.com/auth/adwords
```

Just copy and paste that entire URL into the terminal when prompted. The script will automatically extract the code part.

## ✨ That's It!

Once you have the refresh token, add it to your `.env.local` file and you're ready to use the real Google Ads API!

---

**Still having issues?** Make sure:
- The redirect URI is EXACTLY `http://localhost:8080` (no trailing slash)
- You've saved the changes in Google Cloud Console
- You've waited at least 1 minute after saving

