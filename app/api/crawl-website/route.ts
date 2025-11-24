import { NextRequest, NextResponse } from 'next/server';

// Dynamic import for cheerio (install with: npm install cheerio)
let cheerio: any;
try {
  cheerio = require('cheerio');
} catch (e) {
  console.warn('cheerio not installed. Install with: npm install cheerio');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    console.log(`Crawling website: ${normalizedUrl}`);

    // Fetch website HTML
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalysisBot/1.0)',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
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

    // Extract image
    let imageUrl = null;
    
    // Priority 1: Open Graph image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, normalizedUrl).href;
    }
    
    // Priority 2: Twitter card image
    if (!imageUrl) {
      const twitterImage = $('meta[name="twitter:image"]').attr('content') || 
                          $('meta[property="twitter:image"]').attr('content');
      if (twitterImage) {
        imageUrl = twitterImage.startsWith('http') ? twitterImage : new URL(twitterImage, normalizedUrl).href;
      }
    }
    
    // Priority 3: Logo from common paths
    if (!imageUrl) {
      const logoPaths = [
        '/logo.png',
        '/logo.svg',
        '/images/logo.png',
        '/images/logo.svg',
        '/assets/logo.png',
        '/assets/logo.svg',
        '/img/logo.png',
        '/img/logo.svg',
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
    
    // Priority 4: Favicon
    if (!imageUrl) {
      const favicon = $('link[rel="icon"]').attr('href') || 
                     $('link[rel="shortcut icon"]').attr('href') ||
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
    
    // Priority 5: First large image from homepage
    if (!imageUrl) {
      const images = $('img').toArray();
      for (const img of images) {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src) {
          try {
            const imgUrl = src.startsWith('http') ? src : new URL(src, normalizedUrl).href;
            // Check if image is reasonably sized (not a tiny icon)
            const width = parseInt($(img).attr('width') || '0');
            const height = parseInt($(img).attr('height') || '0');
            if (width > 100 || height > 100 || (!width && !height)) {
              imageUrl = imgUrl;
              break;
            }
          } catch (e) {
            // Continue
          }
        }
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

