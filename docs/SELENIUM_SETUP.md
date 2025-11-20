# Selenium Setup Guide for Medium & Quora

## 📦 Installation

### 1. Install Dependencies

```bash
npm install selenium-webdriver
npm install --save-dev @types/selenium-webdriver
```

### 2. Install ChromeDriver

#### Option A: Using npm (Recommended)
```bash
npm install --save-dev chromedriver
```

#### Option B: Using Homebrew (macOS)
```bash
brew install chromedriver
```

#### Option C: Manual Download
1. Download ChromeDriver from: https://chromedriver.chromium.org/
2. Extract and add to PATH

### 3. Install Chrome/Chromium

Selenium requires Chrome browser to be installed:
- **macOS**: `brew install --cask google-chrome`
- **Linux**: `sudo apt-get install google-chrome-stable`
- **Windows**: Download from https://www.google.com/chrome/

---

## 🐳 Docker Setup (Recommended for Production)

### Dockerfile for Selenium

```dockerfile
FROM node:18-slim

# Install Chrome and ChromeDriver
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && CHROMEDRIVER_VERSION=$(curl -s https://chromedriver.storage.googleapis.com/LATEST_RELEASE) \
    && wget -O /tmp/chromedriver.zip https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip \
    && unzip /tmp/chromedriver.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver \
    && rm /tmp/chromedriver.zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "run", "dev"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CHROME_BIN=/usr/bin/google-chrome
      - CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
    volumes:
      - .:/app
```

---

## ⚙️ Environment Variables

Add to `.env.local`:

```env
# Selenium Configuration
SELENIUM_HEADLESS=true
SELENIUM_BROWSER=chrome
SELENIUM_TIMEOUT=30000

# Chrome Options (optional)
CHROME_BIN=/usr/bin/google-chrome
CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
```

---

## 🧪 Testing Selenium

### Test Script

Create `test-selenium.ts`:

```typescript
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

async function testSelenium() {
  const options = new chrome.Options();
  options.addArguments('--headless');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    await driver.get('https://www.google.com');
    const title = await driver.getTitle();
    console.log('Page title:', title);
    console.log('✅ Selenium is working!');
  } finally {
    await driver.quit();
  }
}

testSelenium().catch(console.error);
```

Run:
```bash
npx ts-node test-selenium.ts
```

---

## 🚀 Vercel Deployment

### Important Notes for Vercel

**Vercel Serverless Functions have limitations:**
- ❌ Cannot run headless browsers directly
- ❌ No Chrome/ChromeDriver in serverless environment
- ❌ Timeout limits (10s for Hobby, 60s for Pro)

### Solutions:

#### Option 1: External Selenium Service (Recommended)
- Run Selenium in a separate service (Docker container, EC2, etc.)
- Call via HTTP API from Vercel
- Use services like:
  - **Browserless.io** (paid)
  - **Selenium Grid** (self-hosted)
  - **AWS Lambda with Puppeteer** (alternative)

#### Option 2: Vercel Edge Functions + External API
- Use Vercel Edge Functions to call external Selenium service
- Keep main app on Vercel
- Selenium runs elsewhere

#### Option 3: Use Puppeteer on Vercel (Alternative)
- Puppeteer works better on serverless
- Still has limitations but more feasible
- Consider switching from Selenium to Puppeteer

---

## 🔧 Troubleshooting

### ChromeDriver Version Mismatch
```bash
# Check Chrome version
google-chrome --version

# Download matching ChromeDriver
# https://chromedriver.chromium.org/downloads
```

### Permission Denied
```bash
chmod +x /usr/local/bin/chromedriver
```

### Headless Mode Issues
- Try `--headless=new` (new headless mode)
- Or use `--headless=old` (legacy mode)

### Timeout Issues
- Increase timeout in config
- Add explicit waits
- Check network connectivity

---

## 📝 Next Steps

1. ✅ Install dependencies
2. ✅ Test Selenium locally
3. ✅ Set up Docker (if using)
4. ✅ Configure environment variables
5. ✅ Test Medium/Quora publishing
6. ⚠️ Plan for production deployment (external service)

---

## 🔗 Resources

- [Selenium WebDriver Docs](https://www.selenium.dev/documentation/)
- [ChromeDriver Downloads](https://chromedriver.chromium.org/)
- [Selenium Docker Images](https://github.com/SeleniumHQ/docker-selenium)
- [Browserless.io](https://www.browserless.io/) - Managed browser service

