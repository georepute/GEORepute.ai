/**
 * Test Cloudflare bypass on Medium
 * This script will actually click the "Verify you are human" checkbox
 */

import { SeleniumBaseService } from '../lib/integrations/selenium-base';

async function testCloudflareBypass() {
  console.log('🧪 Testing Cloudflare bypass on Medium...\n');
  
  const service = new SeleniumBaseService({
    headless: false, // MUST be visible to see what's happening
    browser: 'chrome',
    timeout: 90000,
  });

  try {
    console.log('1️⃣ Initializing browser with Cloudflare bypass...');
    await service.initialize();
    console.log('✅ Browser initialized\n');

    console.log('2️⃣ Navigating to https://medium.com/...');
    await service.navigateTo('https://medium.com/');
    await service.humanDelay(3000, 4000);
    
    console.log('2️⃣.5 Navigating to https://medium.com/new-story (where Cloudflare appears)...');
    await service.navigateTo('https://medium.com/new-story');
    console.log('✅ Navigation complete\n');

    // Wait for page to load
    console.log('3️⃣ Waiting for page to load (10 seconds)...');
    await service.humanDelay(10000, 12000);

    // Check for Cloudflare challenge
    console.log('4️⃣ Checking for Cloudflare challenge...');
    let challengeDetected = false;
    
    const initialCheck = await service.executeScript(`
      return {
        title: document.title,
        hasChallenge: document.title.includes('Just a moment') || 
                      document.body.innerHTML.includes('challenges.cloudflare.com') ||
                      document.body.innerHTML.includes('cf-turnstile') ||
                      document.body.innerHTML.includes('Verify you are human'),
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500)
      };
    `);

    console.log('📊 Initial Check:', {
      title: initialCheck.title,
      hasChallenge: initialCheck.hasChallenge,
      url: initialCheck.url
    });

    if (initialCheck.hasChallenge) {
      challengeDetected = true;
      console.log('\n⚠️ CLOUDFLARE CHALLENGE DETECTED!');
      console.log('🔍 Looking for "Verify you are human" checkbox...\n');

      // Wait for checkbox to appear and be clickable
      let checkboxClicked = false;
      const checkboxSelectors = [
        'input[type="checkbox"]',
        'label:contains("Verify you are human")',
        '[class*="ctp-checkbox"]',
        '[id*="turnstile"]',
        '[class*="cf-turnstile"]',
        'label[for*="turnstile"]',
        '.ctp-checkbox-label',
        '[aria-label*="Verify"]',
        '[aria-label*="human"]'
      ];

      // Try to find and click the checkbox
      for (let attempt = 0; attempt < 10; attempt++) {
        console.log(`\n🔍 Attempt ${attempt + 1}/10: Looking for checkbox...`);
        
        for (const selector of checkboxSelectors) {
          try {
            // Check if element exists and is visible
            const elementInfo = await service.executeScript(`
              const element = document.querySelector('${selector}');
              if (!element) return null;
              
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              
              return {
                exists: true,
                visible: style.display !== 'none' && 
                        style.visibility !== 'hidden' && 
                        style.opacity !== '0' &&
                        rect.width > 0 && 
                        rect.height > 0,
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                text: element.innerText || element.textContent || '',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              };
            `);

            if (elementInfo && elementInfo.visible) {
              console.log(`✅ Found clickable element with selector: ${selector}`);
              console.log(`   Tag: ${elementInfo.tagName}, Text: "${elementInfo.text.substring(0, 50)}"`);
              console.log(`   Position: (${elementInfo.x}, ${elementInfo.y}), Size: ${elementInfo.width}x${elementInfo.height}`);
              
              // Try to click it
              try {
                await service.clickElement(selector, { by: 'css', waitForVisible: true });
                console.log('✅ CLICKED THE CHECKBOX!');
                checkboxClicked = true;
                
                // Wait after clicking
                console.log('⏳ Waiting for Turnstile to verify (15 seconds)...');
                await service.humanDelay(15000, 18000);
                break;
              } catch (clickError: any) {
                console.log(`⚠️ Could not click with selector ${selector}: ${clickError.message}`);
                // Try JavaScript click as fallback
                try {
                  await service.executeScript(`
                    const element = document.querySelector('${selector}');
                    if (element) {
                      element.click();
                      return true;
                    }
                    return false;
                  `);
                  console.log('✅ Clicked via JavaScript!');
                  checkboxClicked = true;
                  await service.humanDelay(15000, 18000);
                  break;
                } catch (jsError) {
                  console.log(`⚠️ JavaScript click also failed`);
                }
              }
            }
          } catch (e: any) {
            // Element not found, try next selector
          }
        }

        if (checkboxClicked) break;

        // If checkbox not found, try to find any clickable element with "Verify" text
        try {
          const verifyElements = await service.executeScript(`
            const allElements = document.querySelectorAll('*');
            const verifyElements = [];
            
            for (const el of allElements) {
              const text = (el.innerText || el.textContent || '').toLowerCase();
              const hasVerify = text.includes('verify') || text.includes('human');
              
              if (hasVerify && el.offsetWidth > 0 && el.offsetHeight > 0) {
                const rect = el.getBoundingClientRect();
                verifyElements.push({
                  tagName: el.tagName,
                  text: el.innerText || el.textContent || '',
                  className: el.className,
                  id: el.id,
                  x: rect.x,
                  y: rect.y,
                  clickable: el.onclick !== null || el.tagName === 'BUTTON' || el.tagName === 'LABEL'
                });
              }
            }
            
            return verifyElements.slice(0, 5); // Return first 5 matches
          `);

          if (verifyElements && verifyElements.length > 0) {
            console.log('📋 Found elements with "Verify" text:');
            verifyElements.forEach((el: any, i: number) => {
              console.log(`   ${i + 1}. ${el.tagName}: "${el.text.substring(0, 50)}" (clickable: ${el.clickable})`);
            });

            // Try to click the first clickable one
            for (const el of verifyElements) {
              if (el.clickable || el.tagName === 'LABEL' || el.tagName === 'BUTTON') {
                try {
                  await service.executeScript(`
                    const elements = document.querySelectorAll('*');
                    for (const elem of elements) {
                      const text = (elem.innerText || elem.textContent || '').toLowerCase();
                      if (text.includes('verify') && elem.offsetWidth > 0 && elem.offsetHeight > 0) {
                        elem.click();
                        return true;
                      }
                    }
                    return false;
                  `);
                  console.log('✅ Clicked "Verify" element via JavaScript!');
                  checkboxClicked = true;
                  await service.humanDelay(15000, 18000);
                  break;
                } catch (e) {
                  // Continue
                }
              }
            }
          }
        } catch (e) {
          // Ignore
        }

        if (checkboxClicked) break;

        await service.humanDelay(3000, 4000);
      }

      if (!checkboxClicked) {
        console.log('\n❌ Could not find or click the checkbox automatically');
        console.log('⏸️  PAUSING FOR 60 SECONDS - PLEASE MANUALLY CLICK THE CHECKBOX IN THE BROWSER WINDOW');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      // Check if challenge passed
      console.log('\n5️⃣ Checking if challenge passed...');
      for (let i = 0; i < 10; i++) {
        await service.humanDelay(3000, 4000);
        
        const status = await service.executeScript(`
          const isChallenge = document.title.includes('Just a moment') || 
                              document.body.innerHTML.includes('challenges.cloudflare.com') ||
                              document.body.innerHTML.includes('cf-turnstile');
          
          const hasMediumContent = document.body.innerHTML.includes('medium.com') && 
                                  !document.body.innerHTML.includes('challenges.cloudflare.com') &&
                                  document.body.innerHTML.length > 10000; // Substantial content
          
          return {
            isChallenge,
            hasMediumContent,
            title: document.title,
            url: window.location.href,
            bodyLength: document.body.innerHTML.length
          };
        `);

        console.log(`📊 Check ${i + 1}/10 (${(i + 1) * 3}s):`, {
          isChallenge: status.isChallenge,
          hasMediumContent: status.hasMediumContent,
          title: status.title.substring(0, 60),
          bodyLength: status.bodyLength
        });

        if (!status.isChallenge && status.hasMediumContent) {
          console.log('\n✅✅✅ CLOUDFLARE BYPASSED SUCCESSFULLY! ✅✅✅');
          break;
        }
      }
    } else {
      console.log('\n✅ No Cloudflare challenge detected on homepage');
    }

    console.log('\n⏸️  Keeping browser open for 30 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

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
testCloudflareBypass().catch(console.error);
