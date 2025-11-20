# How to Get Session Cookies for Medium and Quora

This guide explains how to extract session cookies from your browser to use with the Selenium integrations.

## Why Use Cookies?

Using session cookies is **recommended** over email/password because:
- ✅ More secure (no password storage)
- ✅ Less likely to trigger 2FA or security checks
- ✅ Faster authentication
- ✅ More reliable

---

## Method 1: Chrome/Edge Browser

### Step 1: Log into Medium or Quora
1. Open Chrome or Edge browser
2. Go to [medium.com](https://medium.com) or [quora.com](https://quora.com)
3. **Log in** with your credentials
4. Make sure you're fully logged in (you can see your profile, etc.)

### Step 2: Open Developer Tools
- **Windows/Linux**: Press `F12` or `Ctrl + Shift + I`
- **Mac**: Press `Cmd + Option + I`
- Or right-click on the page → "Inspect"

### Step 3: Navigate to Application Tab
1. Click on the **"Application"** tab (or **"Storage"** in some browsers)
2. In the left sidebar, expand **"Cookies"**
3. Click on the domain:
   - For Medium: Click on `https://medium.com`
   - For Quora: Click on `https://www.quora.com`

### Step 4: Export Cookies
Click the **"Export"** button → Select **"JSON"** format → Copy the entire JSON array.

**Note:** Cookie-Editor exports cookies with extra fields (like `expirationDate`, `hostOnly`, etc.). Our system automatically handles this format, so you can paste it directly!

**For Medium:**
- `sid` (session ID - most important)
- `uid` (user ID)
- `__cf_bm` (Cloudflare bot management)
- Any other cookies that look important

**For Quora:**
- `m-b` (main session cookie)
- `m-s` (session cookie)
- `__cf_bm` (Cloudflare)
- Any other authentication cookies

### Step 5: Paste Cookies
Simply paste the JSON array directly into the settings page. The system will automatically:
- ✅ Handle Cookie-Editor format (with `expirationDate`, `hostOnly`, etc.)
- ✅ Transform it to the correct format for Selenium
- ✅ Filter out unnecessary fields

**Example Cookie-Editor export format (automatically supported):**
```json
[
  {
    "domain": ".medium.com",
    "expirationDate": 1796904075.964687,
    "hostOnly": false,
    "httpOnly": true,
    "name": "sid",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "value": "your-session-value"
  }
]
```

**Or use simplified format (also supported):**
```json
[
  {
    "name": "sid",
    "value": "your-session-id-value-here",
    "domain": ".medium.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  }
]
```

**Required fields:**
- `name`: Cookie name (required)
- `value`: Cookie value (required)
- `domain`: Cookie domain (optional, defaults to `.medium.com` or `.quora.com`)

---

## Method 2: Using Browser Extension (Easier)

### Chrome Extension: "Cookie-Editor"

1. Install [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) from Chrome Web Store
2. Log into Medium/Quora
3. Click the Cookie-Editor icon
4. Click **"Export"** → **"JSON"**
5. Copy the JSON array
6. Paste it into the settings page

This is much easier than manually copying cookies!

---

## Method 3: Firefox Browser

### Step 1: Log in
1. Open Firefox
2. Log into Medium or Quora

### Step 2: Open Developer Tools
- Press `F12` or `Ctrl + Shift + I` (Windows/Linux)
- Press `Cmd + Option + I` (Mac)

### Step 3: Storage Tab
1. Click **"Storage"** tab
2. Expand **"Cookies"**
3. Click on the domain (`medium.com` or `quora.com`)
4. Right-click on cookies → **"Copy"** or manually note them down

### Step 4: Format as JSON
Same format as Chrome (see Method 1, Step 5)

---

## Quick Copy Script (Chrome Console)

You can also run this in the browser console to automatically extract cookies:

### For Medium:
```javascript
// Open Medium.com, log in, then open Console (F12) and run:
const cookies = document.cookie.split(';').map(c => {
  const [name, value] = c.trim().split('=');
  return {
    name: name,
    value: value,
    domain: '.medium.com',
    path: '/',
    secure: true,
    httpOnly: false
  };
}).filter(c => c.name && c.value);

console.log(JSON.stringify(cookies, null, 2));
// Copy the output and paste into settings
```

### For Quora:
```javascript
// Open Quora.com, log in, then open Console (F12) and run:
const cookies = document.cookie.split(';').map(c => {
  const [name, value] = c.trim().split('=');
  return {
    name: name,
    value: value,
    domain: '.quora.com',
    path: '/',
    secure: true,
    httpOnly: false
  };
}).filter(c => c.name && c.value);

console.log(JSON.stringify(cookies, null, 2));
// Copy the output and paste into settings
```

**Note:** This method only gets cookies accessible via JavaScript. Some cookies (httpOnly) won't be included, but the important session cookies usually are.

---

## Important Notes

### ⚠️ Security Warnings
1. **Never share your cookies** - They give full access to your account
2. **Cookies expire** - You may need to refresh them periodically
3. **Use secure storage** - The app stores them encrypted, but be careful

### 🔄 Cookie Expiration
- Session cookies typically last:
  - **Medium**: 30 days (if "Remember me" is checked)
  - **Quora**: 30-90 days
- If cookies expire, you'll need to extract new ones

### ✅ Which Cookies to Include
**Include:**
- Session IDs (`sid`, `m-b`, `m-s`)
- User IDs (`uid`)
- Authentication tokens
- Any cookie with "session", "auth", or "token" in the name

**You can skip:**
- Analytics cookies (`_ga`, `_gid`)
- Preference cookies (unless needed)
- Marketing cookies

### 🧪 Testing
After pasting cookies:
1. Click "Save Configuration"
2. The system will verify the cookies work
3. If verification fails, try:
   - Extracting cookies again (they may have expired)
   - Including more cookies
   - Checking that you're logged in when extracting

---

## Troubleshooting

### "Cookies not working"
- Make sure you extracted cookies **while logged in**
- Check that cookie `domain` includes the dot (`.medium.com` not `medium.com`)
- Try extracting cookies again (they may have expired)
- Include more cookies (especially httpOnly ones if possible)

### "Can't find session cookies"
- Make sure you're looking at the right domain
- Try the Cookie-Editor extension (easier method)
- Check that cookies aren't blocked by browser settings

### "Cookies expired"
- Extract fresh cookies
- Make sure "Remember me" is checked when logging in
- Some cookies expire quickly - extract them right before using

---

## Example: Complete Cookie Set for Medium

```json
[
  {
    "name": "sid",
    "value": "1:AbCdEf1234567890...",
    "domain": ".medium.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  },
  {
    "name": "uid",
    "value": "1234567890abcdef",
    "domain": ".medium.com",
    "path": "/",
    "secure": true
  },
  {
    "name": "__cf_bm",
    "value": "xyz123...",
    "domain": ".medium.com",
    "path": "/",
    "secure": true
  }
]
```

---

## Need Help?

If you're having trouble:
1. Try the Cookie-Editor extension (easiest method)
2. Use the browser console script (Method 3)
3. Check that you're logged in when extracting
4. Make sure cookie format is correct JSON

