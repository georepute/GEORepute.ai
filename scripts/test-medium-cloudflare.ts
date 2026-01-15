/**
 * Test script to verify Cloudflare bypass on Medium
 * Run with: npx ts-node scripts/test-medium-cloudflare.ts
 */

import { SeleniumBaseService } from '../lib/integrations/selenium-base';

async function testMediumCloudflare() {
  console.log('🧪 Testing Cloudflare bypass on Medium...\n');
  
  const service = new SeleniumBaseService({
    headless: false, // Show browser to see what's happening
    browser: 'chrome',
    timeout: 60000,
  });

  try {
    console.log('1️⃣ Initializing browser...');
    await service.initialize();
    console.log('✅ Browser initialized\n');

    console.log('2️⃣ Navigating to Medium homepage...');
    await service.navigateTo('https://medium.com/');
    console.log('✅ Homepage navigation complete\n');
    
    await service.humanDelay(3000, 5000);
    
    console.log('2️⃣.5 Navigating to Medium new-story page (where publishing happens)...');
    await service.navigateTo('https://medium.com/new-story');
    console.log('✅ New-story navigation complete\n');

    console.log('3️⃣ Waiting for page to load...');
    await service.humanDelay(5000, 7000);

    console.log('4️⃣ Checking for Cloudflare challenge...');
    const challengeStatus = await service.executeScript(`
      return {
        title: document.title,
        hasChallenge: document.title.includes('Just a moment') || 
                      document.body.innerHTML.includes('challenges.cloudflare.com') ||
                      document.body.innerHTML.includes('cf-turnstile'),
        url: window.location.href,
        hasTurnstile: typeof window.turnstile !== 'undefined'
      };
    `);

    console.log('📊 Challenge Status:', JSON.stringify(challengeStatus, null, 2));

    if (challengeStatus.hasChallenge) {
      console.log('\n⚠️ Cloudflare challenge detected!');
      console.log('⏳ Waiting for challenge to complete (45 seconds)...\n');
      
      let passed = false;
      const startTime = Date.now();
      const maxWait = 45000; // 45 seconds

      while (!passed && (Date.now() - startTime) < maxWait) {
        await service.humanDelay(3000, 4000);
        
        const status = await service.executeScript(`
          const isChallenge = document.title.includes('Just a moment') || 
                              document.body.innerHTML.includes('challenges.cloudflare.com') ||
                              document.body.innerHTML.includes('cf-turnstile') ||
                              window.location.href.includes('challenges.cloudflare.com');
          
          // More strict check - must NOT be challenge page AND must have Medium content
          const hasMediumContent = document.body.innerHTML.includes('medium.com') && 
                                  !document.body.innerHTML.includes('challenges.cloudflare.com');
          
          const passed = (document.body.innerHTML.includes('Verification successful') || 
                         document.body.innerHTML.includes('challenge-success-text') ||
                         document.body.innerHTML.includes('Waiting for medium.com to respond')) &&
                        !isChallenge &&
                        hasMediumContent;
          
          // Check for Turnstile response token
          const turnstileResponse = document.querySelector('input[name="cf-turnstile-response"]');
          const hasResponse = turnstileResponse && turnstileResponse.value && turnstileResponse.value.length > 0;
          
          return { 
            isChallenge, 
            passed, 
            hasMediumContent,
            hasTurnstileResponse: !!hasResponse,
            title: document.title, 
            url: window.location.href,
            bodyPreview: document.body.innerText.substring(0, 200)
          };
        `);

        console.log(`⏳ Status check (${Math.round((Date.now() - startTime) / 1000)}s):`, {
          isChallenge: status.isChallenge,
          passed: status.passed,
          hasMediumContent: status.hasMediumContent,
          hasTurnstileResponse: status.hasTurnstileResponse,
          title: status.title.substring(0, 50),
          url: status.url
        });

        if (status.passed && status.hasMediumContent && !status.isChallenge) {
          console.log('\n✅ Cloudflare challenge passed and Medium content loaded!');
          passed = true;
          break;
        }
      }

      if (!passed) {
        console.log('\n❌ Cloudflare challenge did not complete automatically');
        console.log('💡 You may need to manually complete it in the browser window');
        console.log('⏸️  Pausing for 60 seconds - complete the challenge manually if needed...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        // Final check after manual wait
        const finalCheck = await service.executeScript(`
          const isChallenge = document.title.includes('Just a moment') || 
                              document.body.innerHTML.includes('challenges.cloudflare.com');
          const hasMediumContent = document.body.innerHTML.includes('medium.com') && 
                                  !document.body.innerHTML.includes('challenges.cloudflare.com');
          return { isChallenge, hasMediumContent, title: document.title, url: window.location.href };
        `);
        
        console.log('\n📊 Final check after manual wait:', finalCheck);
        
        if (!finalCheck.isChallenge && finalCheck.hasMediumContent) {
          console.log('✅ Challenge completed manually!');
          passed = true;
        }
      }
    } else {
      console.log('\n✅ No Cloudflare challenge detected!');
    }

    console.log('\n5️⃣ Final page check...');
    const finalStatus = await service.executeScript(`
      return {
        title: document.title,
        url: window.location.href,
        hasMediumContent: document.body.innerHTML.includes('medium.com') && 
                         !document.body.innerHTML.includes('challenges.cloudflare.com')
      };
    `);

    console.log('📊 Final Status:', JSON.stringify(finalStatus, null, 2));

    if (finalStatus.hasMediumContent) {
      console.log('\n✅ Successfully bypassed Cloudflare!');
    } else {
      console.log('\n⚠️ Still on challenge page or error page');
    }

    console.log('\n⏸️  Keeping browser open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🔚 Closing browser...');
    try {
      const driver = service.getDriver();
      if (driver) {
        await driver.quit();
      }
    } catch (e) {
      console.warn('Error closing browser:', e);
    }
    console.log('✅ Test complete');
  }
}

// Run the test
testMediumCloudflare().catch(console.error);
