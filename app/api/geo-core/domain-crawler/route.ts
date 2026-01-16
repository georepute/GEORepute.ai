import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import * as cheerio from "cheerio";

// Playwright crawler - crawls up to 20 pages and extracts keywords
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domainUrl, jobId } = body;

    if (!domainUrl || !jobId) {
      return NextResponse.json(
        { error: "domainUrl and jobId are required" },
        { status: 400 }
      );
    }

    // Validate domain URL
    let normalizedUrl = domainUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid domain URL format" },
        { status: 400 }
      );
    }

    console.log(`🕷️ Starting Playwright crawl for: ${normalizedUrl}`);

    // Import Playwright dynamically (Node.js environment)
    const { chromium } = await import("playwright");

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (compatible; DomainIntelligenceBot/1.0; +https://georepute.ai)",
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const crawledPages: Array<{
      url: string;
      html: string;
      statusCode: number;
      depth: number;
      text: string;
    }> = [];

    const visited = new Set<string>();
    const toVisit: Array<{ url: string; depth: number }> = [
      { url: normalizedUrl, depth: 0 },
    ];
    const baseDomain = new URL(normalizedUrl).hostname.replace("www.", "");

    // Crawl up to 20 pages, max depth 3
    const maxPages = 20;
    const maxDepth = 3;

    while (toVisit.length > 0 && crawledPages.length < maxPages) {
      const { url, depth } = toVisit.shift()!;

      if (visited.has(url) || depth > maxDepth) continue;
      visited.add(url);

      try {
        const page = await context.newPage();
        const response = await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // Wait a bit for JavaScript to render
        await page.waitForTimeout(2000);

        const html = await page.content();
        const statusCode = response?.status() || 200;

        // Extract text content
        const text = await page.evaluate(() => {
          return document.body?.innerText || "";
        });

        await page.close();

        if (statusCode === 200 && html) {
          crawledPages.push({ url, html, statusCode, depth, text });

          // Extract links for next depth level
          if (depth < maxDepth && crawledPages.length < maxPages) {
            const $ = cheerio.load(html);
            $("a[href]").each((_, element) => {
              const href = $(element).attr("href");
              if (href && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:")) {
                try {
                  const absoluteUrl = new URL(href, url).href;
                  const linkDomain = new URL(absoluteUrl).hostname.replace("www.", "");
                  if (linkDomain === baseDomain && !visited.has(absoluteUrl)) {
                    toVisit.push({ url: absoluteUrl, depth: depth + 1 });
                  }
                } catch {
                  // Invalid URL, skip
                }
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
      }
    }

    await browser.close();

    console.log(`✅ Crawled ${crawledPages.length} pages`);

    // Extract keywords from all crawled content
    const allText = crawledPages.map((p) => p.text).join(" ");
    const keywords = extractKeywords(allText, baseDomain);

    // Prepare crawl data
    const crawlData = {
      pages: crawledPages.map((p) => ({
        url: p.url,
        statusCode: p.statusCode,
        depth: p.depth,
        contentLength: p.html.length,
      })),
      totalPages: crawledPages.length,
      htmlContent: crawledPages.map((p) => ({
        url: p.url,
        html: p.html,
        text: p.text,
      })),
    };

    // Store crawled data and keywords in the job record
    const { error: updateError } = await supabase
      .from("domain_intelligence_jobs")
      .update({
        progress: {
          currentStep: "crawl",
          percentage: 100,
          steps: {
            crawl: {
              status: "completed",
              percentage: 100,
              updatedAt: new Date().toISOString(),
            },
          },
        },
        // Store crawl data in results.crawl
        results: {
          crawl: crawlData,
          keywords: {
            all: keywords,
            extractedAt: new Date().toISOString(),
          },
        },
      })
      .eq("id", jobId)
      .eq("user_id", session.user.id);

    if (updateError) {
      console.error("Error storing crawl data:", updateError);
      return NextResponse.json(
        { error: "Failed to store crawl data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      crawlData: {
        pages: crawlData.pages,
        totalPages: crawlData.totalPages,
      },
      keywords: {
        all: keywords,
        count: keywords.length,
      },
      message: `Successfully crawled ${crawledPages.length} pages and extracted ${keywords.length} keywords`,
    });
  } catch (error: any) {
    console.error("Crawler error:", error);
    return NextResponse.json(
      { error: error.message || "Crawler failed" },
      { status: 500 }
    );
  }
}

// Extract keywords from text content
function extractKeywords(text: string, domainName: string): string[] {
  const keywords = new Set<string>();

  // Remove common stop words
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "must", "can", "this", "that", "these", "those",
    "i", "you", "he", "she", "it", "we", "they", "what", "which", "who",
    "when", "where", "why", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "no", "nor", "not", "only",
    "own", "same", "so", "than", "too", "very", "just", "now",
  ]);

  // Extract words (2-4 words phrases)
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Single word keywords (important terms)
  words.forEach((word) => {
    if (word.length >= 4) {
      keywords.add(word);
    }
  });

  // Two-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length >= 5 && !stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      keywords.add(phrase);
    }
  }

  // Three-word phrases (less common, more specific)
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    if (phrase.length >= 8) {
      keywords.add(phrase);
    }
  }

  // Filter and return top keywords (by frequency or importance)
  return Array.from(keywords).slice(0, 200); // Limit to 200 keywords
}
