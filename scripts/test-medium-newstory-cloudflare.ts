/**
 * Test Cloudflare bypass on Medium new-story page
 * This script will navigate to /new-story and click the "Verify you are human" checkbox
 */

import { SeleniumBaseService } from '../lib/integrations/selenium-base';

async function testMediumNewStoryCloudflare() {
  console.log('🧪 Testing Cloudflare bypass on Medium /new-story page...\n');
  
  const service = new SeleniumBaseService({
    headless: false, // MUST be visible to see and interact with Cloudflare
    browser: 'chrome',
    timeout: 120000, // 2 minutes timeout
  });

  try {
    console.log('1️⃣ Initializing browser...');
    await service.initialize();
    console.log('✅ Browser initialized\n');

    console.log('2️⃣ Navigating to https://medium.com/new-story...');
    await service.navigateTo('https://medium.com/new-story');
    console.log('✅ Navigation complete\n');

    // Wait for page to fully load
    console.log('3️⃣ Waiting for page to load (15 seconds)...');
    await service.humanDelay(15000, 18000);

    // Check for Cloudflare challenge
    console.log('4️⃣ Checking for Cloudflare challenge...');
    
    const checkChallenge = await service.executeScript(`
      return {
        title: document.title,
        hasChallenge: document.title.includes('Just a moment') || 
                      document.body.innerHTML.includes('challenges.cloudflare.com') ||
                      document.body.innerHTML.includes('cf-turnstile') ||
                      document.body.innerHTML.includes('Verify you are human') ||
                      document.body.innerHTML.includes('Verify you are human'),
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 300)
      };
    `);

    console.log('📊 Challenge Check:', {
      title: checkChallenge.title,
      hasChallenge: checkChallenge.hasChallenge,
      url: checkChallenge.url,
      bodyPreview: checkChallenge.bodyText.substring(0, 100)
    });

    if (checkChallenge.hasChallenge) {
      console.log('\n⚠️ CLOUDFLARE CHALLENGE DETECTED!');
      console.log('🔍 Now looking for the "Verify you are human" checkbox to click...\n');

      let checkboxClicked = false;
      const maxAttempts = 15;

      // Try multiple strategies to find and click the checkbox
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`\n🔍 Attempt ${attempt + 1}/${maxAttempts}: Searching for checkbox...`);

        // Strategy 1: Look for Turnstile iframe and click it
        try {
          const turnstileInfo = await service.executeScript(`
            const iframes = document.querySelectorAll('iframe');
            const turnstileIframes = [];
            
            for (const iframe of iframes) {
              const src = iframe.src || '';
              if (src.includes('challenges.cloudflare.com') || 
                  src.includes('turnstile') ||
                  iframe.getAttribute('data-sitekey')) {
                const rect = iframe.getBoundingClientRect();
                turnstileIframes.push({
                  src: src.substring(0, 100),
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  visible: rect.width > 0 && rect.height > 0
                });
              }
            }
            
            return turnstileIframes;
          `);

          if (turnstileInfo && turnstileInfo.length > 0) {
            console.log(`✅ Found ${turnstileInfo.length} Turnstile iframe(s)`);
            for (const iframe of turnstileInfo) {
              if (iframe.visible) {
                console.log(`   Clicking iframe at (${iframe.x}, ${iframe.y})`);
                try {
                  // Click on the iframe
                  await service.executeScript(`
                    const iframes = document.querySelectorAll('iframe');
                    for (const iframe of iframes) {
                      const src = iframe.src || '';
                      if (src.includes('challenges.cloudflare.com') || src.includes('turnstile')) {
                        iframe.click();
                        return true;
                      }
                    }
                    return false;
                  `);
                  
                  // Also try clicking at the iframe coordinates
                  const driver = service.getDriver();
                  if (driver) {
                    const actions = driver.actions();
                    await actions.move({ x: Math.round(iframe.x + iframe.width / 2), y: Math.round(iframe.y + iframe.height / 2) }).click().perform();
                  }
                  
                  console.log('✅ Clicked Turnstile iframe!');
                  checkboxClicked = true;
                  await service.humanDelay(10000, 15000);
                  break;
                } catch (e: any) {
                  console.log(`⚠️ Could not click iframe: ${e.message}`);
                }
              }
            }
          }
        } catch (e) {
          // Continue to next strategy
        }

        if (checkboxClicked) break;

        // Strategy 2: Look for checkbox input elements
        try {
          const checkboxes = await service.executeScript(`
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const visibleCheckboxes = [];
            
            for (const cb of checkboxes) {
              const rect = cb.getBoundingClientRect();
              const style = window.getComputedStyle(cb);
              if (rect.width > 0 && rect.height > 0 && 
                  style.display !== 'none' && 
                  style.visibility !== 'hidden') {
                visibleCheckboxes.push({
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  id: cb.id,
                  className: cb.className
                });
              }
            }
            
            return visibleCheckboxes;
          `);

          if (checkboxes && checkboxes.length > 0) {
            console.log(`✅ Found ${checkboxes.length} visible checkbox(es)`);
            for (const cb of checkboxes) {
              try {
                await service.executeScript(`
                  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                  for (const cb of checkboxes) {
                    const rect = cb.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                      cb.click();
                      return true;
                    }
                  }
                  return false;
                `);
                console.log('✅ Clicked checkbox!');
                checkboxClicked = true;
                await service.humanDelay(10000, 15000);
                break;
              } catch (e) {
                // Try next checkbox
              }
            }
          }
        } catch (e) {
          // Continue
        }

        if (checkboxClicked) break;

        // Strategy 3: Look for elements with "Verify" or "human" text
        try {
          const verifyElements = await service.executeScript(`
            const allElements = document.querySelectorAll('*');
            const verifyElements = [];
            
            for (const el of allElements) {
              const text = (el.innerText || el.textContent || '').toLowerCase();
              const hasVerify = text.includes('verify') && text.includes('human');
              
              if (hasVerify) {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                if (rect.width > 0 && rect.height > 0 && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden') {
                  verifyElements.push({
                    tagName: el.tagName,
                    text: (el.innerText || el.textContent || '').substring(0, 100),
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    clickable: el.onclick !== null || el.tagName === 'BUTTON' || el.tagName === 'LABEL' || el.tagName === 'A'
                  });
                }
              }
            }
            
            return verifyElements.slice(0, 10);
          `);

          if (verifyElements && verifyElements.length > 0) {
            console.log(`✅ Found ${verifyElements.length} element(s) with "Verify you are human" text:`);
            verifyElements.forEach((el: any, i: number) => {
              console.log(`   ${i + 1}. ${el.tagName}: "${el.text.substring(0, 60)}"`);
            });

            // Try clicking the first clickable one
            for (const el of verifyElements) {
              try {
                // Click using coordinates
                const driver = service.getDriver();
                if (driver) {
                  const actions = driver.actions();
                  await actions.move({ x: Math.round(el.x + el.width / 2), y: Math.round(el.y + el.height / 2) }).click().perform();
                  console.log(`✅ Clicked "${el.text.substring(0, 40)}" element!`);
                  checkboxClicked = true;
                  await service.humanDelay(10000, 15000);
                  break;
                }
              } catch (e: any) {
                console.log(`⚠️ Could not click element: ${e.message}`);
              }
            }
          }
        } catch (e) {
          // Continue
        }

        if (checkboxClicked) break;

        // Strategy 4: Try clicking anywhere in the challenge area
        if (attempt >= 5) {
          console.log('🖱️ Trying to click in the center of the page (challenge area)...');
          try {
            const driver = service.getDriver();
            if (driver) {
              const actions = driver.actions();
              // Click in center of viewport
              await actions.move({ x: 400, y: 400 }).click().perform();
              console.log('✅ Clicked center of page');
              await service.humanDelay(5000, 7000);
            }
          } catch (e) {
            // Continue
          }
        }

        // Wait before next attempt
        if (!checkboxClicked) {
          await service.humanDelay(3000, 4000);
        }
      }

      if (!checkboxClicked) {
        console.log('\n❌ Could not automatically click the checkbox');
        console.log('⏸️  PAUSING FOR 60 SECONDS - PLEASE MANUALLY CLICK THE "VERIFY YOU ARE HUMAN" CHECKBOX IN THE BROWSER WINDOW');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      // Now check if challenge passed
      console.log('\n5️⃣ Checking if Cloudflare challenge passed...');
      for (let i = 0; i < 12; i++) {
        await service.humanDelay(5000, 6000);
        
        const status = await service.executeScript(`
          const isChallenge = document.title.includes('Just a moment') || 
                              document.body.innerHTML.includes('challenges.cloudflare.com') ||
                              document.body.innerHTML.includes('cf-turnstile') ||
                              window.location.href.includes('challenges.cloudflare.com');
          
          const hasMediumContent = document.body.innerHTML.includes('medium.com') && 
                                  !document.body.innerHTML.includes('challenges.cloudflare.com') &&
                                  (document.body.innerHTML.includes('editor') || 
                                   document.body.innerHTML.includes('new-story') ||
                                   document.body.innerHTML.length > 50000);
          
          const hasSuccess = document.body.innerHTML.includes('Verification successful') ||
                            document.body.innerHTML.includes('challenge-success-text') ||
                            document.body.innerHTML.includes('Waiting for medium.com to respond');
          
          return {
            isChallenge,
            hasMediumContent,
            hasSuccess,
            title: document.title,
            url: window.location.href,
            bodyLength: document.body.innerHTML.length
          };
        `);

        console.log(`📊 Status check ${i + 1}/12 (${(i + 1) * 5}s):`, {
          isChallenge: status.isChallenge,
          hasMediumContent: status.hasMediumContent,
          hasSuccess: status.hasSuccess,
          title: status.title.substring(0, 60),
          bodyLength: status.bodyLength
        });

        if ((status.hasSuccess || !status.isChallenge) && status.hasMediumContent) {
          console.log('\n✅✅✅ CLOUDFLARE BYPASSED SUCCESSFULLY! ✅✅✅');
          console.log(`   Final URL: ${status.url}`);
          console.log(`   Page Title: ${status.title}`);
          break;
        }
      }

    } else {
      console.log('\n✅ No Cloudflare challenge detected');
      console.log(`   Title: ${checkChallenge.title}`);
      console.log(`   URL: ${checkChallenge.url}`);
    }

    console.log('\n⏸️  Keeping browser open for 30 seconds for final inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    console.log('\n⏸️  Keeping browser open for 30 seconds to see error...');
    await new Promise(resolve => setTimeout(resolve, 30000));
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
testMediumNewStoryCloudflare().catch(console.error);
