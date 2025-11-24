# Railway On-Demand Selenium Setup - Complete Guide

## 📋 Overview
This guide shows you how to set up Railway Selenium that **only runs when needed** (when Medium/Quora publishing is selected), saving costs by not running 24/7.

---

## 🎯 How It Works

### The Flow:
```
User selects Medium/Quora → Vercel API → Railway (wakes up) → Selenium → Publish → Railway (sleeps)
```

### Key Points:
1. **Railway Free Tier**: Services automatically **sleep after 5 minutes of inactivity**
2. **On First Request**: Railway **wakes up automatically** (takes 30-60 seconds)
3. **After Publishing**: Railway **sleeps again** after 5 minutes
4. **Cost**: You only pay for **actual usage time**, not 24/7

---

## 🚀 Step-by-Step Setup

### Step 1: Create Dockerfile for Railway

Create a new file: `Dockerfile` (in a new folder or separate repo)

```dockerfile
# Use official Selenium Standalone Chrome image
FROM selenium/standalone-chrome:latest

# Expose Selenium Grid port
EXPOSE 4444

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl --fail http://localhost:4444/wd/hub/status || exit 1
```

**Save this file** - you'll push it to GitHub.

---

### Step 2: Create GitHub Repository

1. Go to **GitHub.com**
2. Click **"New repository"**
3. Name: `selenium-railway` (or any name)
4. Make it **Public** or **Private**
5. **Don't** initialize with README
6. Click **"Create repository"**

---

### Step 3: Push Dockerfile to GitHub

```bash
# Create folder
mkdir selenium-railway
cd selenium-railway

# Create Dockerfile (copy content from Step 1)
# Save as: Dockerfile (no extension)

# Initialize git
git init
git add Dockerfile
git commit -m "Add Selenium Grid Dockerfile"

# Connect to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/selenium-railway.git
git branch -M main
git push -u origin main
```

---

### Step 4: Deploy to Railway

1. Go to **https://railway.app/**
2. Sign up/Login with **GitHub**
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Authorize Railway (if first time)
6. Select your `selenium-railway` repository
7. Railway will:
   - Auto-detect Dockerfile
   - Start building (2-3 minutes)
   - Deploy the container

8. **Wait for deployment** - Status will show "Active"

---

### Step 5: Get Your Railway URL

1. In Railway dashboard, click on your **service**
2. Go to **"Settings"** tab
3. Scroll to **"Networking"**
4. Click **"Generate Domain"**
5. Railway creates: `selenium-railway-production.up.railway.app`
6. **Copy this domain**

7. Your **Selenium Hub URL**:
   ```
   https://selenium-railway-production.up.railway.app/wd/hub
   ```

---

### Step 6: Test Railway (First Wake-Up)

Test that Railway wakes up correctly:

```bash
# This will wake up Railway (takes 30-60 seconds first time)
curl https://selenium-railway-production.up.railway.app/wd/hub/status
```

**Expected**:
- First request: Takes 30-60 seconds (waking up)
- Response: `{"value":{"ready":true,...}}`
- Subsequent requests: Fast (< 1 second)

---

### Step 7: Add Environment Variable to Vercel

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add:

   **Name**: `SELENIUM_HUB_URL`
   
   **Value**: `https://selenium-railway-production.up.railway.app/wd/hub`
   
   (Use your actual Railway URL)

5. Select environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. Click **"Save"**

7. **Important**: Redeploy Vercel app:
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**

---

## 🔄 How On-Demand Works

### Scenario 1: User Selects Medium/Quora

```
1. User clicks "Publish to Medium" in your app
   ↓
2. Vercel API route receives request
   ↓
3. Code checks: platform === "medium" || platform === "quora"
   ↓
4. Code tries to connect to Railway Selenium Hub
   ↓
5. Railway is SLEEPING (free tier)
   ↓
6. First request wakes Railway (30-60 seconds)
   ↓
7. Railway becomes ACTIVE
   ↓
8. Selenium connects successfully
   ↓
9. Publishing happens (Medium/Quora)
   ↓
10. After 5 minutes of inactivity, Railway SLEEPS again
```

### Scenario 2: User Selects Other Platform (LinkedIn, Facebook, etc.)

```
1. User clicks "Publish to LinkedIn"
   ↓
2. Vercel API route receives request
   ↓
3. Code checks: platform === "linkedin" (not medium/quora)
   ↓
4. Code uses LinkedIn API (no Selenium needed)
   ↓
5. Railway is NEVER called
   ↓
6. Railway stays SLEEPING (no cost)
```

---

## 💰 Cost Optimization

### Railway Free Tier Behavior:

1. **Sleep After Inactivity**: 5 minutes
2. **Wake on Request**: Automatic (30-60 second delay)
3. **Billing**: Only for **active time**
4. **Free Credit**: $5/month (~500 hours)

### Example Cost Calculation:

**Scenario**: You publish to Medium 10 times per day

- Each publish: ~2 minutes active time
- Daily: 10 × 2 = 20 minutes
- Monthly: 20 × 30 = 600 minutes = 10 hours
- **Cost**: Well within free tier ($5 = ~500 hours)

**Result**: **$0 cost** on free tier!

---

## 🔧 Code Flow (What Happens in Your Code)

### Current Flow in `app/api/geo-core/orchestrator/route.ts`:

```typescript
// When user approves content
if (platform === "medium" || actionData.autoPublishToMedium === true) {
  // This is where Selenium is called
  mediumResult = await publishToMedium(mediumConfig, {
    title: contentStrategy.topic,
    content: contentStrategy.generated_content,
  });
}

if (platform === "quora" || actionData.autoPublishToQuora === true) {
  // This is where Selenium is called
  quoraResult = await publishToQuora(quoraConfig, {
    title: contentStrategy.topic,
    content: contentStrategy.generated_content,
  });
}
```

### What Needs to Change:

In `lib/integrations/selenium-base.ts`, the `initialize()` method needs to:

1. Check if `SELENIUM_HUB_URL` environment variable exists
2. If yes → Connect to Railway (wakes it up automatically)
3. If no → Use local ChromeDriver (for local dev)

**The Railway wake-up happens automatically** - you don't need special code for it!

---

## ⚡ Railway Wake-Up Process

### How Railway Wakes Up:

1. **Your code** tries to connect: `new Builder().usingServer(railwayUrl)`
2. **Railway receives** the HTTP request
3. **Railway detects** service is sleeping
4. **Railway wakes up** the container (30-60 seconds)
5. **Selenium starts** inside the container
6. **Connection succeeds**
7. **Your code continues** with publishing

### Handling the Delay:

Your code should handle the 30-60 second wake-up delay:

```typescript
// In selenium-base.ts initialize()
async initialize(): Promise<void> {
  const seleniumHubUrl = process.env.SELENIUM_HUB_URL;
  
  if (seleniumHubUrl) {
    console.log('🔗 Connecting to Railway (may take 30-60s if sleeping)...');
    
    // Increase timeout for Railway wake-up
    const builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .usingServer(seleniumHubUrl);
    
    // Set longer timeout for first connection (Railway wake-up)
    this.driver = await builder.build();
    console.log('✅ Connected to Railway');
  }
}
```

---

## 📊 Monitoring Railway Status

### Check if Railway is Sleeping:

```bash
# If sleeping: Takes 30-60 seconds, then returns status
# If awake: Returns immediately (< 1 second)
curl https://your-railway-url.railway.app/wd/hub/status
```

### In Railway Dashboard:

1. Go to Railway dashboard
2. Click your service
3. Check **"Status"**:
   - **"Active"** = Running (billing active)
   - **"Sleeping"** = Not running (no billing)

---

## 🎯 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User Action: "Publish to Medium"                        │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Vercel API: /api/geo-core/orchestrator                  │
│ Checks: platform === "medium"                            │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ publishToMedium() called                                 │
│ → SeleniumBaseService.initialize()                      │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Checks: process.env.SELENIUM_HUB_URL exists?            │
│ YES → Connect to Railway                                │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Railway Service Status: SLEEPING                         │
│ First HTTP request received                             │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Railway: Waking up container (30-60 seconds)            │
│ → Starting Selenium Grid                                │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Railway: ACTIVE (Selenium ready)                        │
│ Connection established                                  │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Selenium: Login to Medium                               │
│ → Fill content form                                     │
│ → Publish                                               │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Return published URL to Vercel                          │
│ → Update database                                        │
└──────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│ Railway: No more requests                               │
│ → Sleeps after 5 minutes                                │
│ → No billing until next wake-up                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Testing the On-Demand Flow

### Test 1: First Request (Wake-Up)

```bash
# This will wake Railway (30-60 seconds)
time curl https://your-railway-url.railway.app/wd/hub/status
```

**Expected**: Takes 30-60 seconds, then returns status

### Test 2: Second Request (Already Awake)

```bash
# This should be fast (< 1 second)
time curl https://your-railway-url.railway.app/wd/hub/status
```

**Expected**: Returns immediately

### Test 3: After 5 Minutes (Should Sleep)

1. Wait 5+ minutes
2. Make request again
3. Should take 30-60 seconds (waking up again)

---

## 🐛 Troubleshooting

### Problem: Railway Takes Too Long to Wake Up

**Solution**: This is normal! First request after sleep takes 30-60 seconds. You can:
1. Accept the delay (it's free!)
2. Keep Railway awake with a health check ping (but costs more)
3. Upgrade to Railway Pro (always on, but costs $20/month)

### Problem: Connection Timeout

**Cause**: Railway might be taking longer to wake up

**Solution**: Increase timeout in your code:
```typescript
// In selenium-base.ts
const builder = new Builder()
  .forBrowser('chrome')
  .setChromeOptions(options)
  .usingServer(seleniumHubUrl)
  .setTimeout(120000); // 2 minutes timeout for wake-up
```

### Problem: Railway Not Sleeping

**Check**: Railway dashboard → Service status
- Should show "Sleeping" after 5 minutes of inactivity
- If always "Active", check for background requests

---

## 💡 Pro Tips

### 1. Accept the Wake-Up Delay
- 30-60 seconds is acceptable for cost savings
- User sees "Publishing..." message anyway
- Free tier is worth the small delay

### 2. Show User Feedback
```typescript
// In your UI
"Publishing to Medium... (This may take up to 60 seconds)"
```

### 3. Cache Railway Status (Optional)
- Check if Railway is awake before publishing
- Wake it up proactively if needed
- But this adds complexity - not necessary

---

## 📝 Summary

### What You Get:
✅ Railway only runs when Medium/Quora publishing is needed
✅ Automatically sleeps after 5 minutes
✅ Automatically wakes up on first request
✅ Only pay for actual usage time
✅ Free tier covers most use cases

### What You Need to Do:
1. ✅ Deploy Dockerfile to Railway
2. ✅ Get Railway URL
3. ✅ Add `SELENIUM_HUB_URL` to Vercel
4. ✅ Modify code to use Railway URL (see code changes doc)
5. ✅ Test publishing to Medium/Quora

### Cost:
- **Free Tier**: $5/month credit (~500 hours)
- **Your Usage**: ~10-20 hours/month (typical)
- **Cost**: **$0** (within free tier)

---

## 🎯 Next Steps

1. **Deploy Railway** (Steps 1-5 above)
2. **Add to Vercel** (Step 7 above)
3. **Modify Code** (See code changes document)
4. **Test** Medium/Quora publishing
5. **Monitor** Railway dashboard for sleep/wake cycles

---

## 📚 Resources

- Railway Docs: https://docs.railway.app/
- Railway Pricing: https://railway.app/pricing
- Selenium Grid: https://www.selenium.dev/documentation/grid/

