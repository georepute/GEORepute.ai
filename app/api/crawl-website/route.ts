import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

// Dynamic import for cheerio (install with: npm install cheerio)
let cheerio: any;
try {
  cheerio = require('cheerio');
} catch (e) {
  console.warn('cheerio not installed. Install with: npm install cheerio');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Get crawler service URL from environment variable
// If set, use external service (production). If not, use local Playwright (development)
const CRAWLER_SERVICE_URL = process.env.CRAWLER_SERVICE_URL;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // If CRAWLER_SERVICE_URL is set, use external service (production)
    if (CRAWLER_SERVICE_URL) {
      console.log(`🌐 Using external crawler service: ${CRAWLER_SERVICE_URL}/crawl`);
      console.log(`📝 Target URL: ${normalizedUrl}`);

      const crawlResponse = await fetch(`${CRAWLER_SERVICE_URL}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!crawlResponse.ok) {
        const errorText = await crawlResponse.text();
        console.error(`❌ Crawler service error (${crawlResponse.status}):`, errorText);
        return NextResponse.json(
          { 
            error: `Crawler service error: ${crawlResponse.status} - ${errorText.substring(0, 200)}`,
            success: false 
          },
          { status: crawlResponse.status }
        );
      }

      const crawlData = await crawlResponse.json();
      
      if (!crawlData.success) {
        console.error('❌ Crawler service returned error:', crawlData.error);
        return NextResponse.json(
          { 
            error: crawlData.error || 'Failed to crawl website',
            success: false 
          },
          { status: 500 }
        );
      }

      console.log('✅ Crawler service success:', {
        hasDescription: !!crawlData.description,
        hasImageUrl: !!crawlData.imageUrl,
        descriptionLength: crawlData.description?.length || 0,
      });

      // Return the data in the same format expected by the frontend
      return NextResponse.json({
        success: true,
        description: crawlData.description || '',
        imageUrl: crawlData.imageUrl || null,
        metadata: crawlData.metadata || {
          title: crawlData.title || '',
          metaDescription: crawlData.metaDescription || '',
          ogDescription: crawlData.ogDescription || '',
        },
      });
    }

    // Local development: Use Playwright directly
    console.log(`🏠 Using local Playwright crawler: ${normalizedUrl}`);
    return await crawlWithPlaywright(normalizedUrl);
  } catch (error: any) {
    console.error('Error crawling website:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to crawl website',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Local Playwright crawler function (for development)
async function crawlWithPlaywright(normalizedUrl: string) {
  let browser: any = null;
  
  try {
    console.log(`Crawling website with Playwright: ${normalizedUrl}`);

    // Launch Playwright browser to bypass Cloudflare and bot protection
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    const page = await context.newPage();

    // Navigate to the URL and wait for network to be idle
    // This will handle Cloudflare challenges automatically
    await page.goto(normalizedUrl, {
      waitUntil: 'networkidle',
      timeout: 30000, // 30 second timeout
    });

    // Wait a bit more for any JavaScript to finish rendering
    await page.waitForTimeout(2000);

    // Get the fully rendered HTML
    const html = await page.content();
    
    if (!cheerio) {
      // Fallback: simple text extraction without cheerio
      return NextResponse.json({
        success: true,
        description: 'Please install cheerio: npm install cheerio',
        imageUrl: null,
        metadata: {},
      });
    }
    
    const $ = cheerio.load(html);

    // Extract metadata
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const title = $('title').text() || '';

    // Extract about/company content
    const aboutSections = [
      $('section.about').text(),
      $('.company-info').text(),
      $('#about').text(),
      $('[class*="about"]').first().text(),
      $('main').text().substring(0, 2000), // First 2000 chars of main content
    ].filter(text => text.trim().length > 50);

    const rawContent = aboutSections[0] || metaDescription || ogDescription || title || '';

    // Extract brand logo image (prioritize logo-specific sources)
    let imageUrl = null;
    
    // Priority 1: Logo-specific meta tags
    const logoMeta = $('meta[property="og:logo"]').attr('content') || 
                     $('meta[name="logo"]').attr('content');
    if (logoMeta) {
      imageUrl = logoMeta.startsWith('http') ? logoMeta : new URL(logoMeta, normalizedUrl).href;
    }
    
    // Priority 2: Open Graph image (often the logo)
    if (!imageUrl) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, normalizedUrl).href;
      }
    }
    
    // Priority 3: Logo from HTML elements with logo-specific selectors
    if (!imageUrl) {
      const logoSelectors = [
        'img[class*="logo" i]',
        'img[id*="logo" i]',
        'img[alt*="logo" i]',
        'img[alt*="brand" i]',
        'header img',
        'nav img',
        '.logo img',
        '#logo img',
        '[class*="brand"] img',
        '[class*="header"] img',
      ];
      
      for (const selector of logoSelectors) {
        const logoImg = $(selector).first();
        if (logoImg.length) {
          const src = logoImg.attr('src') || logoImg.attr('data-src') || logoImg.attr('data-lazy-src');
          if (src) {
            try {
              imageUrl = src.startsWith('http') ? src : new URL(src, normalizedUrl).href;
              break;
            } catch (e) {
              // Continue to next selector
            }
          }
        }
      }
    }
    
    // Priority 4: Logo from common file paths
    if (!imageUrl) {
      const logoPaths = [
        '/logo.png',
        '/logo.svg',
        '/logo.jpg',
        '/logo.jpeg',
        '/images/logo.png',
        '/images/logo.svg',
        '/assets/logo.png',
        '/assets/logo.svg',
        '/img/logo.png',
        '/img/logo.svg',
        '/static/logo.png',
        '/static/logo.svg',
        '/brand/logo.png',
        '/brand/logo.svg',
      ];
      
      for (const path of logoPaths) {
        try {
          const logoUrl = new URL(path, normalizedUrl).href;
          const logoResponse = await fetch(logoUrl, { method: 'HEAD' });
          if (logoResponse.ok) {
            imageUrl = logoUrl;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
    }
    
    // Priority 5: Twitter card image (often logo)
    if (!imageUrl) {
      const twitterImage = $('meta[name="twitter:image"]').attr('content') || 
                          $('meta[property="twitter:image"]').attr('content');
      if (twitterImage) {
        imageUrl = twitterImage.startsWith('http') ? twitterImage : new URL(twitterImage, normalizedUrl).href;
      }
    }
    
    // Priority 6: Favicon (as last resort, usually not ideal for brand logo)
    if (!imageUrl) {
      const favicon = $('link[rel="icon"]').attr('href') || 
                     $('link[rel="shortcut icon"]').attr('href') ||
                     $('link[rel="apple-touch-icon"]').attr('href') ||
                     '/favicon.ico';
      try {
        const faviconUrl = new URL(favicon, normalizedUrl).href;
        const faviconResponse = await fetch(faviconUrl, { method: 'HEAD' });
        if (faviconResponse.ok) {
          imageUrl = faviconUrl;
        }
      } catch (e) {
        // Continue to next option
      }
    }

    // Generate AI summary using GPT
    const openAIApiKey = process.env.OPENAI_API_KEY;
    let description = '';
    
    if (openAIApiKey && rawContent) {
      try {
        const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a business analyst. Summarize what this company does in exactly 5 concise lines. Each line should be a complete sentence. Focus on what the company offers, its main products/services, and its value proposition.',
              },
              {
                role: 'user',
                content: `Based on this website content, provide a 5-line summary of what this company does:\n\n${rawContent.substring(0, 3000)}`,
              },
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          description = summaryData.choices[0].message.content.trim();
        } else {
          console.error('GPT summary failed:', await summaryResponse.text());
        // Fallback to meta description or first paragraph
        description = metaDescription || ogDescription || rawContent.split('\n').filter((line: string) => line.trim().length > 20).slice(0, 5).join('\n');
        }
      } catch (error) {
        console.error('Error generating AI summary:', error);
        // Fallback
        description = metaDescription || ogDescription || rawContent.split('\n').filter((line: string) => line.trim().length > 20).slice(0, 5).join('\n');
      }
    } else {
      // Fallback if no OpenAI key
      description = metaDescription || ogDescription || rawContent.split('\n').filter((line: string) => line.trim().length > 20).slice(0, 5).join('\n');
    }

    return NextResponse.json({
      success: true,
      description: description,
      imageUrl: imageUrl,
      metadata: {
        title: title || ogTitle,
        metaDescription: metaDescription,
        ogDescription: ogDescription,
      },
    });
  } catch (error: any) {
    console.error('Error crawling website with Playwright:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to crawl website',
        success: false 
      },
      { status: 500 }
    );
  } finally {
    // Always close the browser, even if there's an error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

