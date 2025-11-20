# Selenium Troubleshooting Guide

## Common Errors & Solutions

### Error: "Unable to obtain browser driver" / "Unable to obtain Selenium Manager"

This error occurs when Selenium can't find ChromeDriver. Here are solutions:

#### Solution 1: Set CHROMEDRIVER_PATH Environment Variable

```bash
# Find ChromeDriver location
which chromedriver
# Or
ls -la node_modules/chromedriver/bin/chromedriver

# Set environment variable (add to .env.local)
export CHROMEDRIVER_PATH=/path/to/chromedriver

# For Next.js, add to .env.local:
CHROMEDRIVER_PATH=/Users/apple/Projects/GEORepute.ai/node_modules/chromedriver/bin/chromedriver
```

#### Solution 2: Install ChromeDriver via Homebrew (macOS)

```bash
brew install chromedriver

# Verify installation
chromedriver --version
```

#### Solution 3: Install ChromeDriver via npm

```bash
npm install --save-dev chromedriver

# Verify it's installed
ls -la node_modules/chromedriver/bin/chromedriver
```

#### Solution 4: Manual Download

1. Check your Chrome version: `google-chrome --version`
2. Download matching ChromeDriver from: https://chromedriver.chromium.org/downloads
3. Extract and add to PATH or set CHROMEDRIVER_PATH

---

### Error: "options.setExcludeSwitches is not a function"

**Fixed!** This was a version compatibility issue. The code now uses `addArguments('--exclude-switches=enable-automation')` instead.

---

### Error: "Failed to initialize WebDriver" in Production (Vercel)

**This is expected!** Selenium cannot run on Vercel serverless functions because:
- Chrome/ChromeDriver must be installed on the system
- Serverless functions don't support browser automation
- You need an external service (Docker, EC2, etc.)

**Solutions:**
1. Use external Selenium service (Docker container)
2. Use Browserless.io (managed service)
3. Deploy to a VPS/EC2 that supports Selenium

---

## Quick Test

Test if ChromeDriver is working:

```bash
# Test ChromeDriver directly
chromedriver --version

# Test in Node.js
node -e "const {Builder} = require('selenium-webdriver'); const chrome = require('selenium-webdriver/chrome'); const options = new chrome.Options(); options.addArguments('--headless'); new Builder().forBrowser('chrome').setChromeOptions(options).build().then(d => { console.log('✅ Success!'); d.quit(); }).catch(e => console.error('❌ Error:', e.message));"
```

---

## Environment Variables

Add to `.env.local`:

```env
# ChromeDriver path (optional, will auto-detect if not set)
CHROMEDRIVER_PATH=/path/to/chromedriver

# Selenium configuration (optional)
SELENIUM_HEADLESS=true
SELENIUM_BROWSER=chrome
```

---

## Verification Steps

1. ✅ ChromeDriver installed: `chromedriver --version`
2. ✅ Chrome browser installed: `google-chrome --version`
3. ✅ node_modules has chromedriver: `ls node_modules/chromedriver/bin/chromedriver`
4. ✅ Environment variable set (if needed): `echo $CHROMEDRIVER_PATH`

---

## Still Having Issues?

1. Check console logs for the exact ChromeDriver path being used
2. Verify ChromeDriver matches your Chrome version
3. Try running ChromeDriver manually: `chromedriver`
4. Check file permissions: `chmod +x /path/to/chromedriver`

