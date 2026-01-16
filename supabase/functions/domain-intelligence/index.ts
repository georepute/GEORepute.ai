// Domain Intelligence Edge Function
// Orchestrates comprehensive domain analysis including crawling, SEO, keywords, competitors, AI visibility

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as cheerio from "https://deno.land/x/cheerio@1.0.0-rc.12/mod.ts";
// Playwright for Deno - for JavaScript-rendered sites
import { chromium } from "https://esm.sh/playwright@1.40.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Update job progress
async function updateJobProgress(
  supabase: any,
  jobId: string,
  step: string,
  percentage: number,
  stepStatus: "pending" | "processing" | "completed" | "failed" = "processing"
) {
  const { data: job } = await supabase
    .from("domain_intelligence_jobs")
    .select("progress")
    .eq("id", jobId)
    .single();

  const currentProgress = job?.progress || {
    currentStep: "initializing",
    percentage: 0,
    steps: {},
  };

  const updatedProgress = {
    ...currentProgress,
    currentStep: step,
    percentage: Math.min(100, percentage),
    steps: {
      ...currentProgress.steps,
      [step]: {
        status: stepStatus,
        percentage: stepStatus === "completed" ? 100 : stepStatus === "failed" ? 0 : percentage,
        updatedAt: new Date().toISOString(),
      },
    },
  };

  await supabase
    .from("domain_intelligence_jobs")
    .update({ progress: updatedProgress, status: "processing" })
    .eq("id", jobId);
}

// Extract domain name from URL
function extractDomainName(url: string): string {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}

// Normalize URL to avoid duplicates
function normalizeUrl(url: string, baseUrl: string): string {
  try {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return new URL(url).href;
    }
    if (url.startsWith("//")) {
      return new URL(url, baseUrl).href;
    }
    if (url.startsWith("/")) {
      return new URL(url, baseUrl).href;
    }
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

// Check if URL is same domain
function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    const urlObj = new URL(url);
    const urlDomain = urlObj.hostname.replace("www.", "");
    return urlDomain === baseDomain || urlDomain.endsWith("." + baseDomain);
  } catch {
    return false;
  }
}

// Fetch website content
async function fetchWebsiteContent(url: string, timeout = 10000): Promise<{ html: string; statusCode: number }> {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DomainIntelligenceBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { html: "", statusCode: response.status };
    }
    
    const html = await response.text();
    return { html, statusCode: response.status };
  } catch (error: any) {
    if (error.name === "AbortError") {
      return { html: "", statusCode: 408 };
    }
    return { html: "", statusCode: 500 };
  }
}

// Extract text from HTML using Cheerio for better parsing
function extractTextFromHTML(html: string): string {
  try {
    // Use Cheerio for better HTML parsing and text extraction
    const $ = cheerio.load(html);
    
    // Remove script, style, and other non-content elements
    $("script, style, noscript, iframe, embed, object").remove();
    
    // Get text content from body (or html if no body)
    const bodyText = $("body").length > 0 ? $("body").text() : $.text();
    
    // Clean up whitespace
    return bodyText.replace(/\s+/g, " ").trim();
  } catch (error) {
    // Fallback to regex-based extraction if Cheerio fails
    console.warn("Cheerio text extraction failed, using regex fallback:", error);
    try {
      let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
      text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");
      text = text.replace(/<[^>]*>/g, " ");
      text = text.replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
      text = text.replace(/\s+/g, " ").trim();
      return text;
    } catch {
      return "";
    }
  }
}

// Extract links from HTML using Cheerio for better parsing
function extractLinks(html: string, baseUrl: string, baseDomain: string): string[] {
  const links: string[] = [];
  
  try {
    // Use Cheerio for better HTML parsing
    const $ = cheerio.load(html);
    
    // Extract all anchor tags
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (href && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:")) {
        const normalized = normalizeUrl(href, baseUrl);
        if (normalized && isSameDomain(normalized, baseDomain)) {
          links.push(normalized);
        }
      }
    });
  } catch (error) {
    // Fallback to regex if Cheerio fails
    console.warn("Cheerio parsing failed, using regex fallback:", error);
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (href && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:")) {
        const normalized = normalizeUrl(href, baseUrl);
        if (normalized && isSameDomain(normalized, baseDomain)) {
          links.push(normalized);
        }
      }
    }
  }
  
  return [...new Set(links)]; // Remove duplicates
}

// Fetch website content with JavaScript rendering support using Playwright
// Note: Playwright requires browser binaries. For Supabase Edge Functions,
// you may need to use a headless browser service API instead (Browserless.io, ScrapingBee)
// or deploy Playwright in a separate service. Set USE_PLAYWRIGHT=false to disable.
async function fetchWebsiteContentWithJS(
  url: string,
  usePlaywright: boolean = true,
  waitForSelector?: string,
  waitTime: number = 2000
): Promise<{ html: string; statusCode: number }> {
  // Check if Playwright is enabled via environment variable
  const playwrightEnabled = Deno.env.get("USE_PLAYWRIGHT") !== "false" && usePlaywright;
  
  // If Playwright is disabled or not available, use basic fetch
  if (!playwrightEnabled) {
    return fetchWebsiteContent(url);
  }

  try {
    console.log(`🎭 Using Playwright to render JavaScript for: ${url}`);
    
    // Launch Playwright browser
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
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--use-mock-keychain',
      ]
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (compatible; DomainIntelligenceBot/1.0; +https://georepute.ai)",
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    
    // Navigate to URL with timeout
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for specific selector if provided, otherwise wait for content
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 10000 });
      } catch {
        // Selector not found, continue anyway
      }
    } else {
      // Wait a bit for JavaScript to render
      await page.waitForTimeout(waitTime);
    }

    // Get fully rendered HTML
    const html = await page.content();
    const statusCode = response?.status() || 200;

    await browser.close();

    console.log(`✅ Playwright successfully rendered: ${url}`);
    return { html, statusCode };
  } catch (error) {
    console.warn(`⚠️ Playwright failed for ${url}, falling back to fetch:`, error);
    // Fallback to regular fetch if Playwright fails
    return fetchWebsiteContent(url);
  }
}

// Multi-page crawler with parallel crawling and robots.txt support
async function crawlDomain(
  startUrl: string,
  maxPages: number = 75, // Increased from 20 to 75
  maxDepth: number = 4, // Increased from 3 to 4
  parallelRequests: number = 5 // Number of parallel requests
): Promise<Array<{ url: string; html: string; statusCode: number; depth: number }>> {
  const visited = new Set<string>();
  const toVisit: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const results: Array<{ url: string; html: string; statusCode: number; depth: number }> = [];
  const baseDomain = extractDomainName(startUrl);
  const baseUrl = new URL(startUrl).origin;
  
  // Check robots.txt once at the start
  const robotsAllowed = await checkRobotsTxt(baseUrl, "/");
  if (!robotsAllowed) {
    console.warn("⚠️ robots.txt disallows crawling root path");
    // Still try to crawl, but respect individual path rules
  }
  
  // Parallel crawling queue
  const crawlingQueue: Array<Promise<void>> = [];
  
  while (toVisit.length > 0 || crawlingQueue.length > 0) {
    // Start parallel requests up to the limit
    while (crawlingQueue.length < parallelRequests && toVisit.length > 0 && results.length < maxPages) {
      const { url, depth } = toVisit.shift()!;
      
      if (visited.has(url) || depth > maxDepth) continue;
      visited.add(url);
      
      // Check robots.txt for this specific path
      const urlPath = new URL(url).pathname;
      const isAllowed = await checkRobotsTxt(baseUrl, urlPath);
      
      if (!isAllowed) {
        console.log(`🚫 robots.txt disallows: ${urlPath}`);
        continue;
      }
      
      // Add to parallel crawling queue
      const crawlPromise = (async () => {
        try {
          // Use Playwright for JavaScript-rendered sites (depth 0 and 1 for main pages)
          // Use regular fetch for deeper pages to save resources
          const usePlaywright = depth <= 1 && Deno.env.get("USE_PLAYWRIGHT") !== "false";
          const { html, statusCode } = usePlaywright 
            ? await fetchWebsiteContentWithJS(url, true, undefined, 2000)
            : await fetchWebsiteContent(url);
          
          if (statusCode === 200 && html) {
            results.push({ url, html, statusCode, depth });
            
            // Extract links for next depth level
            if (depth < maxDepth && results.length < maxPages) {
              const links = extractLinks(html, url, baseDomain);
              for (const link of links) {
                if (!visited.has(link) && results.length < maxPages) {
                  toVisit.push({ url: link, depth: depth + 1 });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error crawling ${url}:`, error);
        }
      })();
      
      crawlingQueue.push(crawlPromise);
      
      // Remove completed promises
      crawlPromise.finally(() => {
        const index = crawlingQueue.indexOf(crawlPromise);
        if (index > -1) {
          crawlingQueue.splice(index, 1);
        }
      });
    }
    
    // Wait for at least one request to complete before continuing
    if (crawlingQueue.length >= parallelRequests) {
      await Promise.race(crawlingQueue);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Wait for all remaining requests to complete
  await Promise.all(crawlingQueue);
  
  console.log(`✅ Crawled ${results.length} pages (max: ${maxPages}, depth: ${maxDepth})`);
  return results;
}

// Extract sitemap URLs
async function findSitemap(baseUrl: string): Promise<string[]> {
  const sitemapUrls: string[] = [];
  const commonSitemaps = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap1.xml",
    "/robots.txt",
  ];
  
  for (const path of commonSitemaps) {
    try {
      const url = new URL(path, baseUrl).href;
      const { html, statusCode } = await fetchWebsiteContent(url);
      if (statusCode === 200 && html) {
        if (path === "/robots.txt") {
          // Extract sitemap URLs from robots.txt
          const sitemapMatches = html.match(/Sitemap:\s*(.+)/gi);
          if (sitemapMatches) {
            sitemapMatches.forEach(match => {
              const sitemapUrl = match.replace(/Sitemap:\s*/i, "").trim();
              if (sitemapUrl) sitemapUrls.push(sitemapUrl);
            });
          }
        } else {
          sitemapUrls.push(url);
        }
      }
    } catch {
      // Continue if sitemap not found
    }
  }
  
  return sitemapUrls;
}

// Detect geography from content
function detectGeography(text: string, html: string, domain: string): { primary: string; secondary: string[] } {
  const geography: { primary: string; secondary: string[] } = {
    primary: "",
    secondary: [],
  };
  
  // Common country indicators
  const countryPatterns: Record<string, RegExp[]> = {
    "United States": [/usa\b/i, /\bunited states\b/i, /\bamerica\b/i, /\bus\b/i, /\bnew york\b/i, /\blos angeles\b/i, /\bchicago\b/i],
    "United Kingdom": [/uk\b/i, /\bunited kingdom\b/i, /\bbritain\b/i, /\blondon\b/i, /\bmanchester\b/i, /\bbirmingham\b/i],
    "Canada": [/canada\b/i, /\btoronto\b/i, /\bvancouver\b/i, /\bmontreal\b/i, /\bottawa\b/i],
    "Australia": [/australia\b/i, /\bsydney\b/i, /\bmelbourne\b/i, /\bbrisbane\b/i, /\baustralian\b/i],
    "Germany": [/germany\b/i, /\bdeutschland\b/i, /\bberlin\b/i, /\bmunich\b/i, /\bhamburg\b/i, /\bgerman\b/i],
    "France": [/france\b/i, /\bparis\b/i, /\blyon\b/i, /\bmarseille\b/i, /\bfrench\b/i],
    "Spain": [/spain\b/i, /\bespaña\b/i, /\bmadrid\b/i, /\bbarcelona\b/i, /\bspanish\b/i],
    "Italy": [/italy\b/i, /\bitalia\b/i, /\brome\b/i, /\bmilan\b/i, /\bitalian\b/i],
    "India": [/india\b/i, /\bmumbai\b/i, /\bdelhi\b/i, /\bbangalore\b/i, /\bindian\b/i],
    "China": [/china\b/i, /\bbeijing\b/i, /\bshanghai\b/i, /\bchinese\b/i],
  };
  
  const combinedText = (text + " " + html).toLowerCase();
  const scores: Record<string, number> = {};
  
  for (const [country, patterns] of Object.entries(countryPatterns)) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = combinedText.match(pattern);
      if (matches) score += matches.length;
    }
    if (score > 0) scores[country] = score;
  }
  
  // Check domain TLD
  const tldPatterns: Record<string, string> = {
    ".us": "United States",
    ".uk": "United Kingdom",
    ".ca": "Canada",
    ".au": "Australia",
    ".de": "Germany",
    ".fr": "France",
    ".es": "Spain",
    ".it": "Italy",
    ".in": "India",
    ".cn": "China",
  };
  
  for (const [tld, country] of Object.entries(tldPatterns)) {
    if (domain.endsWith(tld)) {
      scores[country] = (scores[country] || 0) + 5;
    }
  }
  
  // Find primary and secondary
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    geography.primary = sorted[0][0];
    geography.secondary = sorted.slice(1, 3).map(([country]) => country);
  }
  
  return geography;
}

// Check robots.txt and determine if URL is allowed to crawl
async function checkRobotsTxt(baseUrl: string, path: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    const { html, statusCode } = await fetchWebsiteContent(robotsUrl);
    
    if (statusCode !== 200 || !html) {
      // If robots.txt doesn't exist, allow crawling
      return true;
    }
    
    // Parse robots.txt
    const lines = html.split("\n");
    let inUserAgent = false;
    let userAgentMatches = false;
    const disallowedPaths: string[] = [];
    const allowedPaths: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      
      const lowerLine = trimmed.toLowerCase();
      
      if (lowerLine.startsWith("user-agent:")) {
        const userAgent = trimmed.substring(11).trim();
        // Check if it's for all agents (*) or our bot
        inUserAgent = userAgent === "*" || userAgent.includes("DomainIntelligenceBot");
        userAgentMatches = inUserAgent;
      } else if (inUserAgent) {
        if (lowerLine.startsWith("disallow:")) {
          const disallowPath = trimmed.substring(9).trim();
          if (disallowPath) {
            disallowedPaths.push(disallowPath);
          }
        } else if (lowerLine.startsWith("allow:")) {
          const allowPath = trimmed.substring(6).trim();
          if (allowPath) {
            allowedPaths.push(allowPath);
          }
        } else if (lowerLine.startsWith("user-agent:")) {
          // New user-agent block, reset
          inUserAgent = false;
          disallowedPaths.length = 0;
          allowedPaths.length = 0;
        }
      }
    }
    
    // If no specific rules for our user-agent, allow
    if (!userAgentMatches) {
      return true;
    }
    
    // Check if path is explicitly allowed
    for (const allowed of allowedPaths) {
      if (path.startsWith(allowed.replace(/\*/g, ""))) {
        return true;
      }
    }
    
    // Check if path is disallowed
    for (const disallowed of disallowedPaths) {
      const pattern = disallowed.replace(/\*/g, ".*");
      if (new RegExp(`^${pattern}`).test(path)) {
        return false;
      }
    }
    
    // Default: allow if no disallow rules, or if there are allow rules
    return disallowedPaths.length === 0 || allowedPaths.length > 0;
  } catch (error) {
    console.warn("Error checking robots.txt:", error);
    // On error, allow crawling (fail open)
    return true;
  }
}

// Detect toxic patterns
function detectToxicPatterns(html: string, text: string): string[] {
  const toxicPatterns: string[] = [];
  const combined = (html + " " + text).toLowerCase();
  
  // Spam indicators
  if ((combined.match(/buy now|click here|limited time|act now/gi) || []).length > 10) {
    toxicPatterns.push("Aggressive sales language detected");
  }
  
  // Keyword stuffing
  const words = text.split(/\s+/);
  const wordCounts: Record<string, number> = {};
  words.forEach(word => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length > 3) {
      wordCounts[clean] = (wordCounts[clean] || 0) + 1;
    }
  });
  const maxRepeats = Math.max(...Object.values(wordCounts));
  if (maxRepeats > 50) {
    toxicPatterns.push("Potential keyword stuffing detected");
  }
  
  // Hidden text
  if (html.match(/style=["'][^"']*display\s*:\s*none/gi)) {
    toxicPatterns.push("Hidden text detected (potential cloaking)");
  }
  
  // Doorway pages
  if (html.match(/<meta[^>]*refresh[^>]*>/gi)) {
    toxicPatterns.push("Meta refresh detected (potential doorway page)");
  }
  
  // Thin content
  if (text.split(/\s+/).length < 100) {
    toxicPatterns.push("Thin content detected");
  }
  
  // Broken links (basic check)
  if ((html.match(/href=["'][^"']*404|href=["'][^"']*error/gi) || []).length > 5) {
    toxicPatterns.push("Multiple broken links detected");
  }
  
  return toxicPatterns;
}

// Analyze SEO baseline (enhanced)
function analyzeSEOBaseline(html: string, url: string) {
  const seoAnalysis = {
    seoScore: 0,
    metaTags: {
      hasTitle: false,
      titleLength: 0,
      title: "",
      hasDescription: false,
      descriptionLength: 0,
      description: "",
      hasKeywords: false,
      ogTags: false,
      twitterTags: false,
      canonicalUrl: "",
    },
    headings: {
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      h4Count: 0,
      issues: [] as string[],
    },
    links: {
      internal: 0,
      external: 0,
      broken: 0,
      nofollow: 0,
    },
    images: {
      total: 0,
      withAlt: 0,
      missingAlt: 0,
      oversized: 0,
    },
    schema: {
      present: false,
      types: [] as string[],
    },
    performance: {
      hasMinifiedCSS: false,
      hasMinifiedJS: false,
      hasCompressedImages: false,
    },
    mobile: {
      hasViewport: false,
      isResponsive: false,
    },
    security: {
      hasHTTPS: url.startsWith("https://"),
      hasHSTS: false,
    },
    issues: [] as string[],
    recommendations: [] as string[],
  };

  try {
    // Use Cheerio for better HTML parsing
    const $ = cheerio.load(html);

    // Extract title
    const title = $("title").text().trim();
    if (title) {
      seoAnalysis.metaTags.hasTitle = true;
      seoAnalysis.metaTags.title = title;
      seoAnalysis.metaTags.titleLength = title.length;
    }

    // Extract meta description
    const description = $('meta[name="description"]').attr("content") || "";
    if (description) {
      seoAnalysis.metaTags.hasDescription = true;
      seoAnalysis.metaTags.description = description.trim();
      seoAnalysis.metaTags.descriptionLength = seoAnalysis.metaTags.description.length;
    }

    // Check meta keywords
    seoAnalysis.metaTags.hasKeywords = $('meta[name="keywords"]').length > 0;

    // Check Open Graph tags
    seoAnalysis.metaTags.ogTags = $('meta[property^="og:"]').length > 0;

    // Check Twitter tags
    seoAnalysis.metaTags.twitterTags = $('meta[name^="twitter:"]').length > 0;

    // Extract canonical URL
    const canonical = $('link[rel="canonical"]').attr("href") || "";
    if (canonical) {
      seoAnalysis.metaTags.canonicalUrl = canonical;
    }

    // Extract headings using Cheerio
    seoAnalysis.headings.h1Count = $("h1").length;
    seoAnalysis.headings.h2Count = $("h2").length;
    seoAnalysis.headings.h3Count = $("h3").length;
    seoAnalysis.headings.h4Count = $("h4").length;

    // Heading issues
    if (seoAnalysis.headings.h1Count === 0) {
      seoAnalysis.headings.issues.push("Missing H1 tag");
    } else if (seoAnalysis.headings.h1Count > 1) {
      seoAnalysis.headings.issues.push(`Multiple H1 tags (${seoAnalysis.headings.h1Count})`);
    }

    // Extract links using Cheerio
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href") || "";
      const rel = $(element).attr("rel") || "";
      
      if (href.startsWith("/") || href.startsWith("./") || (href.startsWith("http") && new URL(href).hostname === new URL(url).hostname)) {
        seoAnalysis.links.internal++;
      } else if (href.startsWith("http")) {
        seoAnalysis.links.external++;
      }
      
      if (rel.toLowerCase().includes("nofollow")) {
        seoAnalysis.links.nofollow++;
      }
    });

    // Extract images using Cheerio
    $("img").each((_, element) => {
      seoAnalysis.images.total++;
      const alt = $(element).attr("alt");
      if (alt && alt.trim()) {
        seoAnalysis.images.withAlt++;
      } else {
        seoAnalysis.images.missingAlt++;
      }
    });

    // Check schema markup
    $('script[type="application/ld+json"]').each((_, element) => {
      seoAnalysis.schema.present = true;
      try {
        const schemaText = $(element).html() || "";
        const schemaMatch = schemaText.match(/"@type"\s*:\s*"([^"]+)"/);
        if (schemaMatch && schemaMatch[1]) {
          seoAnalysis.schema.types.push(schemaMatch[1]);
        }
      } catch {
        // Skip invalid JSON
      }
    });
    seoAnalysis.schema.types = [...new Set(seoAnalysis.schema.types)];

    // Check mobile viewport
    seoAnalysis.mobile.hasViewport = $('meta[name="viewport"]').length > 0;
    seoAnalysis.mobile.isResponsive = html.includes('max-width') || html.includes('responsive') || $('meta[name="viewport"]').attr("content")?.includes("width=device-width") || false;
  } catch (error) {
    // Fallback to regex-based parsing if Cheerio fails
    console.warn("Cheerio SEO analysis failed, using regex fallback:", error);
    
    // Extract title (fallback)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      seoAnalysis.metaTags.hasTitle = true;
      seoAnalysis.metaTags.title = titleMatch[1].trim();
      seoAnalysis.metaTags.titleLength = seoAnalysis.metaTags.title.length;
    }

    // Extract meta description (fallback)
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      seoAnalysis.metaTags.hasDescription = true;
      seoAnalysis.metaTags.description = descMatch[1].trim();
      seoAnalysis.metaTags.descriptionLength = seoAnalysis.metaTags.description.length;
    }

    // Check meta keywords (fallback)
    seoAnalysis.metaTags.hasKeywords = html.includes('name="keywords"');

    // Check Open Graph tags (fallback)
    seoAnalysis.metaTags.ogTags = html.includes('property="og:');

    // Check Twitter tags (fallback)
    seoAnalysis.metaTags.twitterTags = html.includes('name="twitter:');

    // Extract canonical URL (fallback)
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (canonicalMatch) {
      seoAnalysis.metaTags.canonicalUrl = canonicalMatch[1];
    }

    // Extract headings (fallback)
    seoAnalysis.headings.h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
    seoAnalysis.headings.h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
    seoAnalysis.headings.h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
    seoAnalysis.headings.h4Count = (html.match(/<h4[^>]*>/gi) || []).length;

    // Heading issues (fallback)
    if (seoAnalysis.headings.h1Count === 0) {
      seoAnalysis.headings.issues.push("Missing H1 tag");
    } else if (seoAnalysis.headings.h1Count > 1) {
      seoAnalysis.headings.issues.push(`Multiple H1 tags (${seoAnalysis.headings.h1Count})`);
    }

    // Extract links (fallback)
    const internalLinks = html.match(/href=["'](\/[^"']*|.*?\/[^"']*)/gi) || [];
    const externalLinks = html.match(/href=["']https?:\/\/(?!.*?\/\/)/gi) || [];
    const nofollowLinks = html.match(/rel=["'][^"']*nofollow/gi) || [];
    
    seoAnalysis.links.internal = internalLinks.length;
    seoAnalysis.links.external = externalLinks.length;
    seoAnalysis.links.nofollow = nofollowLinks.length;

    // Extract images (fallback)
    const allImages = html.match(/<img[^>]*>/gi) || [];
    const imagesWithAlt = html.match(/<img[^>]*alt=["'][^"']+["']/gi) || [];
    
    seoAnalysis.images.total = allImages.length;
    seoAnalysis.images.withAlt = imagesWithAlt.length;
    seoAnalysis.images.missingAlt = seoAnalysis.images.total - seoAnalysis.images.withAlt;

    // Check schema markup (fallback)
    if (html.includes('application/ld+json')) {
      seoAnalysis.schema.present = true;
      const schemaMatches = html.match(/"@type"\s*:\s*"([^"]+)"/gi) || [];
      seoAnalysis.schema.types = [...new Set(schemaMatches.map(m => m.match(/"([^"]+)"/)?.[1] || "").filter(Boolean))];
    }

    // Check mobile viewport (fallback)
    seoAnalysis.mobile.hasViewport = html.includes('name="viewport"');
    seoAnalysis.mobile.isResponsive = html.includes('max-width') || html.includes('responsive');
  }

  // Calculate SEO score
  let score = 0;
  if (seoAnalysis.metaTags.hasTitle) {
    score += 10;
    if (seoAnalysis.metaTags.titleLength >= 30 && seoAnalysis.metaTags.titleLength <= 60) {
      score += 5;
    }
  }
  if (seoAnalysis.metaTags.hasDescription) {
    score += 10;
    if (seoAnalysis.metaTags.descriptionLength >= 120 && seoAnalysis.metaTags.descriptionLength <= 160) {
      score += 5;
    }
  }
  if (seoAnalysis.headings.h1Count === 1) score += 10;
  if (seoAnalysis.headings.h2Count > 0) score += 5;
  if (seoAnalysis.metaTags.ogTags) score += 5;
  if (seoAnalysis.schema.present) score += 10;
  if (seoAnalysis.images.withAlt > seoAnalysis.images.total * 0.8) score += 10;
  if (seoAnalysis.mobile.hasViewport) score += 5;
  if (seoAnalysis.security.hasHTTPS) score += 10;
  if (seoAnalysis.metaTags.canonicalUrl) score += 5;
  if (seoAnalysis.links.internal > 0) score += 5;
  
  seoAnalysis.seoScore = Math.min(100, score);

  // Generate recommendations
  if (!seoAnalysis.metaTags.hasTitle) {
    seoAnalysis.recommendations.push("Add a title tag (30-60 characters)");
  }
  if (!seoAnalysis.metaTags.hasDescription) {
    seoAnalysis.recommendations.push("Add a meta description (120-160 characters)");
  }
  if (seoAnalysis.headings.h1Count === 0) {
    seoAnalysis.recommendations.push("Add exactly one H1 tag");
  }
  if (seoAnalysis.images.missingAlt > 0) {
    seoAnalysis.recommendations.push(`Add alt text to ${seoAnalysis.images.missingAlt} images`);
  }
  if (!seoAnalysis.schema.present) {
    seoAnalysis.recommendations.push("Add structured data (Schema.org markup)");
  }
  if (!seoAnalysis.metaTags.ogTags) {
    seoAnalysis.recommendations.push("Add Open Graph tags for social sharing");
  }
  if (!seoAnalysis.security.hasHTTPS) {
    seoAnalysis.recommendations.push("Enable HTTPS for better security and rankings");
  }

  return seoAnalysis;
}

// Extract headings from HTML (per page)
function extractHeadings(html: string, url: string) {
  const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  const h3Matches = html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
  
  return {
    h1: h1Matches.map((h, i) => ({
      page: url,
      text: h.replace(/<[^>]*>/g, "").trim(),
      position: i,
    })),
    h2: h2Matches.map((h, i) => ({
      page: url,
      text: h.replace(/<[^>]*>/g, "").trim(),
      position: i,
    })),
    h3: h3Matches.map((h, i) => ({
      page: url,
      text: h.replace(/<[^>]*>/g, "").trim(),
      position: i,
    })),
  };
}

// Analyze site structure
function analyzeSiteStructure(
  crawledPages: Array<{ url: string; depth: number }>,
  links: Record<string, string[]>
): any {
  const structure = {
    totalPages: crawledPages.length,
    maxDepth: Math.max(...crawledPages.map(p => p.depth), 0),
    pagesByDepth: {} as Record<number, number>,
    navigation: {
      mainMenu: [] as string[],
      footer: [] as string[],
    },
    sitemap: {
      found: false,
      urls: [] as string[],
    },
    internalLinks: {
      total: 0,
      averagePerPage: 0,
    },
    urlStructure: {
      hasCleanUrls: true,
      hasParameters: false,
    },
  };

  // Group pages by depth
  crawledPages.forEach(page => {
    structure.pagesByDepth[page.depth] = (structure.pagesByDepth[page.depth] || 0) + 1;
  });

  // Analyze URL structure
  const hasParams = crawledPages.some(p => p.url.includes("?"));
  structure.urlStructure.hasParameters = hasParams;
  
  const hasCleanUrls = crawledPages.every(p => {
    const path = new URL(p.url).pathname;
    return !path.includes("?") && !path.match(/[^a-z0-9\/\-_]/i);
  });
  structure.urlStructure.hasCleanUrls = hasCleanUrls;

  // Calculate internal links
  const allLinks = Object.values(links).flat();
  structure.internalLinks.total = allLinks.length;
  structure.internalLinks.averagePerPage = crawledPages.length > 0 
    ? allLinks.length / crawledPages.length 
    : 0;

  return structure;
}

// Estimate traffic level based on SEO metrics and site structure
function estimateTrafficLevel(
  seoAnalysis: any,
  siteStructure: any,
  crawledPages: any[],
  domainAge?: number
): "low" | "medium" | "high" {
  let score = 0;
  
  // SEO score contributes (0-40 points)
  score += Math.floor(seoAnalysis.seoScore / 2.5);
  
  // Page count contributes (0-20 points)
  const pageCount = siteStructure.totalPages || crawledPages.length;
  if (pageCount > 50) score += 20;
  else if (pageCount > 20) score += 15;
  else if (pageCount > 10) score += 10;
  else if (pageCount > 5) score += 5;
  
  // Internal links contribute (0-15 points)
  if (seoAnalysis.links.internal > 100) score += 15;
  else if (seoAnalysis.links.internal > 50) score += 10;
  else if (seoAnalysis.links.internal > 20) score += 5;
  
  // External links contribute (0-10 points)
  if (seoAnalysis.links.external > 20) score += 10;
  else if (seoAnalysis.links.external > 10) score += 5;
  
  // Schema markup contributes (0-10 points)
  if (seoAnalysis.schema.present) score += 10;
  
  // Domain age contributes (0-5 points) - older domains tend to have more traffic
  if (domainAge && domainAge > 5) score += 5;
  else if (domainAge && domainAge > 2) score += 3;
  
  // Categorize based on total score
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

// Detect company stage from website content
function detectCompanyStage(
  html: string,
  text: string,
  siteStructure: any
): "startup" | "smb" | "mid-market" | "enterprise" {
  const lowerText = text.toLowerCase();
  const lowerHtml = html.toLowerCase();
  
  // Indicators for startup
  const startupIndicators = [
    /founded in (20\d{2})/i,
    /established in (20\d{2})/i,
    /started in (20\d{2})/i,
    /\b(startup|start-up|early stage|seed|pre-seed|angel|bootstrapped)\b/i,
    /\b(founded|launched|established) (in |)(20\d{2})/i,
    /team of \d{1,2}/i,
    /\b(we are|we're) a (small|new|young|emerging) (company|team|startup)/i,
  ];
  
  // Indicators for SMB
  const smbIndicators = [
    /\b(small business|local business|family-owned|independent)\b/i,
    /\b(serving|serves) (the|our) (local|community|area|region)/i,
    /\b(established|operating) (since|for) (over |more than |)\d{1,2} (years|year)/i,
  ];
  
  // Indicators for enterprise
  const enterpriseIndicators = [
    /\b(enterprise|corporation|corp|inc\.|llc|global|worldwide|international)\b/i,
    /\b(established|founded) (in |)(19\d{2}|20[0-1]\d)/i,
    /\b(thousands|hundreds) of (employees|staff|team members)/i,
    /\b(multi-?national|fortune|publicly traded|listed on)/i,
    /(revenue|annual revenue|turnover) (of |exceeding |over )(\$|€|£)?[\d,]+ (million|billion)/i,
  ];
  
  // Check for enterprise indicators first (most specific)
  for (const indicator of enterpriseIndicators) {
    if (indicator.test(lowerText) || indicator.test(lowerHtml)) {
      return "enterprise";
    }
  }
  
  // Check for startup indicators
  let startupScore = 0;
  for (const indicator of startupIndicators) {
    if (indicator.test(lowerText) || indicator.test(lowerHtml)) {
      startupScore++;
      // Check if founded recently (within last 3 years)
      const yearMatch = lowerText.match(/(founded|established|started|launched) (in |)(20\d{2})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[3]);
        const currentYear = new Date().getFullYear();
        if (currentYear - year <= 3) {
          startupScore += 2; // Strong startup indicator
        }
      }
    }
  }
  
  // Check for SMB indicators
  let smbScore = 0;
  for (const indicator of smbIndicators) {
    if (indicator.test(lowerText) || indicator.test(lowerHtml)) {
      smbScore++;
    }
  }
  
  // Small site structure suggests startup
  if (siteStructure.totalPages < 10) {
    startupScore += 1;
  }
  
  // Determine stage based on scores
  if (startupScore >= 2) return "startup";
  if (smbScore >= 1 || (startupScore === 0 && smbScore === 0 && siteStructure.totalPages < 30)) {
    return "smb";
  }
  if (siteStructure.totalPages > 100) {
    return "enterprise";
  }
  
  return "mid-market";
}

// Detect market position/scope
function detectMarketPosition(
  text: string,
  html: string,
  geography: any
): "niche" | "regional" | "national" | "global" {
  const lowerText = text.toLowerCase();
  const lowerHtml = html.toLowerCase();
  
  // Global indicators
  if (
    /\b(global|worldwide|international|world-class|serving (the )?world|across (the )?globe)\b/i.test(lowerText) ||
    /\b(multiple countries|worldwide|international presence)\b/i.test(lowerText)
  ) {
    return "global";
  }
  
  // National indicators
  if (
    /\b(nationwide|national|across (the )?(country|usa|uk|canada|australia))\b/i.test(lowerText) ||
    /\b(serving (the )?(entire )?(country|nation))\b/i.test(lowerText)
  ) {
    return "national";
  }
  
  // Regional indicators
  if (
    geography.primary ||
    /\b(regional|local|area|region|serving (the )?(local|regional))\b/i.test(lowerText) ||
    /\b(near me|in your area|local business)\b/i.test(lowerText)
  ) {
    return "regional";
  }
  
  // Niche indicators (specific industry focus, specialized)
  if (
    /\b(specialized|specialist|niche|focused on|expert in|dedicated to)\b/i.test(lowerText) ||
    /\b(leading (provider|solution|company) (for|in))\b/i.test(lowerText)
  ) {
    return "niche";
  }
  
  // Default based on geography
  if (geography.primary) return "regional";
  return "niche";
}

// Analyze strengths and weaknesses
function analyzeStrengthsWeaknesses(
  seoAnalysis: any,
  siteStructure: any,
  crawledPages: any[],
  toxicPatterns: string[]
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Strengths
  if (seoAnalysis.seoScore >= 70) {
    strengths.push("Strong SEO foundation");
  }
  if (seoAnalysis.metaTags.hasTitle && seoAnalysis.metaTags.hasDescription) {
    strengths.push("Complete meta tags");
  }
  if (seoAnalysis.schema.present) {
    strengths.push("Structured data implemented");
  }
  if (seoAnalysis.security.hasHTTPS) {
    strengths.push("Secure HTTPS connection");
  }
  if (seoAnalysis.mobile.hasViewport) {
    strengths.push("Mobile-friendly configuration");
  }
  if (siteStructure.totalPages >= 10) {
    strengths.push("Comprehensive site structure");
  }
  if (seoAnalysis.images.withAlt > seoAnalysis.images.total * 0.8) {
    strengths.push("Well-optimized images");
  }

  // Weaknesses
  if (seoAnalysis.seoScore < 50) {
    weaknesses.push("Low SEO score - needs optimization");
  }
  if (!seoAnalysis.metaTags.hasTitle) {
    weaknesses.push("Missing title tag");
  }
  if (!seoAnalysis.metaTags.hasDescription) {
    weaknesses.push("Missing meta description");
  }
  if (seoAnalysis.headings.h1Count === 0) {
    weaknesses.push("Missing H1 tag");
  }
  if (seoAnalysis.images.missingAlt > seoAnalysis.images.total * 0.3) {
    weaknesses.push("Many images missing alt text");
  }
  if (!seoAnalysis.schema.present) {
    weaknesses.push("No structured data");
  }
  if (!seoAnalysis.metaTags.ogTags) {
    weaknesses.push("Missing social media tags");
  }
  if (toxicPatterns.length > 0) {
    weaknesses.push(`Toxic patterns detected: ${toxicPatterns.length} issues`);
  }
  if (siteStructure.totalPages < 5) {
    weaknesses.push("Limited content depth");
  }
  if (!seoAnalysis.security.hasHTTPS) {
    weaknesses.push("Site not using HTTPS");
  }

  return { strengths, weaknesses };
}

// Fetch GSC data if integration is enabled
async function fetchGSCData(
  supabase: any,
  userId: string,
  domainUrl: string
): Promise<any> {
  try {
    const { data: integration } = await supabase
      .from("platform_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", "google_search_console")
      .eq("status", "connected")
      .single();

    if (!integration || !integration.metadata) {
      return null;
    }

    // Get GSC site URL
    const siteUrl = integration.metadata.selected_site || integration.metadata.site_urls?.[0];
    
    if (!siteUrl) {
      return null;
    }

    // Return basic GSC info (full data fetching would require googleapis in Deno)
    // For now, return integration status and site info
    return {
      connected: true,
      siteUrl: siteUrl,
      sites: integration.metadata.site_urls || [],
      message: "GSC integration connected - data available via API endpoints",
    };
  } catch (error) {
    console.error("Error fetching GSC data:", error);
  }

  return null;
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      jobId,
      domainUrl,
      domainName,
      userId,
      language = "en",
      integrations = {},
      crawlData, // Crawled data from separate crawler service
      keywords, // Extracted keywords from crawler
    } = await req.json();

    if (!jobId || !domainUrl) {
      return new Response(
        JSON.stringify({ error: "jobId and domainUrl are required", success: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting domain intelligence analysis for: ${domainName}`);

    // Initialize results
    const results: any = {
      domain: { url: domainUrl, name: domainName },
      crawl: { pages: [], totalPages: 0 },
      seo: {},
      keywords: { all: [], branded: [], nonBranded: [], geo: [] },
      competitors: { all: [], organic: [], geo: [], local: [] },
      geography: { primary: "", secondary: [] },
      siteStructure: {},
      headings: { h1: [], h2: [], h3: [], statistics: {} },
      strengths: [],
      weaknesses: [],
      toxicPatterns: [],
      aiVisibility: {},
      recommendedActions: [],
      gscData: null,
    };

    try {
      // Step 1: Use crawled data from separate crawler service
      let crawledPages: Array<{ url: string; html: string; statusCode: number; depth: number }> = [];
      
      if (crawlData && crawlData.htmlContent) {
        // Use provided crawl data
        console.log("📥 Using crawled data from crawler service");
        crawledPages = crawlData.htmlContent.map((page: any) => ({
          url: page.url,
          html: page.html,
          statusCode: 200, // Assume success if provided
          depth: crawlData.pages.find((p: any) => p.url === page.url)?.depth || 0,
        }));
        
        results.crawl = {
          pages: crawlData.pages,
          totalPages: crawlData.totalPages,
        };
        
        // Use provided keywords
        if (keywords && keywords.all) {
          results.keywords.all = keywords.all;
          console.log(`✅ Using ${keywords.all.length} keywords from crawler`);
        }
      } else {
        // Fallback: crawl if no data provided (for backward compatibility)
        console.log("⚠️ No crawl data provided, falling back to edge function crawling");
        await updateJobProgress(supabase, jobId, "crawl", 10);
        crawledPages = await crawlDomain(domainUrl, 20, 3, 3); // Reduced limits for edge function
        
        results.crawl = {
          pages: crawledPages.map(p => ({
            url: p.url,
            statusCode: p.statusCode,
            depth: p.depth,
            contentLength: p.html.length,
          })),
          totalPages: crawledPages.length,
        };
      }
      
      // Build link graph from crawled pages
      const linkGraph: Record<string, string[]> = {};
      for (const page of crawledPages) {
        if (page.statusCode === 200 && page.html) {
          linkGraph[page.url] = extractLinks(page.html, page.url, domainName);
        }
      }

      await updateJobProgress(supabase, jobId, "crawl", 100, "completed");

      // Step 2: Site Structure Discovery
      await updateJobProgress(supabase, jobId, "siteStructure", 20);
      console.log("Step 2: Analyzing site structure...");
      
      const sitemapUrls = await findSitemap(domainUrl);
      const siteStructure = analyzeSiteStructure(crawledPages, linkGraph);
      siteStructure.sitemap = {
        found: sitemapUrls.length > 0,
        urls: sitemapUrls,
      };
      results.siteStructure = siteStructure;

      await updateJobProgress(supabase, jobId, "siteStructure", 100, "completed");

      // Step 3: Enhanced SEO Analysis (aggregate across pages)
      await updateJobProgress(supabase, jobId, "seo", 30);
      console.log("Step 3: Analyzing SEO baseline (enhanced)...");

      const allHeadings = { h1: [] as any[], h2: [] as any[], h3: [] as any[] };
      let totalSEOScore = 0;
      let seoCount = 0;
      const aggregateSEO = analyzeSEOBaseline(crawledPages[0]?.html || "", domainUrl);

      for (const page of crawledPages) {
        if (page.statusCode === 200 && page.html) {
          const seo = analyzeSEOBaseline(page.html, page.url);
          totalSEOScore += seo.seoScore;
          seoCount++;
          
          const headings = extractHeadings(page.html, page.url);
          allHeadings.h1.push(...headings.h1);
          allHeadings.h2.push(...headings.h2);
          allHeadings.h3.push(...headings.h3);
        }
      }

      aggregateSEO.seoScore = seoCount > 0 ? Math.round(totalSEOScore / seoCount) : aggregateSEO.seoScore;
      results.seo = aggregateSEO;
      results.headings = {
        ...allHeadings,
        statistics: {
          totalH1: allHeadings.h1.length,
          totalH2: allHeadings.h2.length,
          totalH3: allHeadings.h3.length,
          pagesWithH1: new Set(allHeadings.h1.map(h => h.page)).size,
          pagesWithoutH1: crawledPages.length - new Set(allHeadings.h1.map(h => h.page)).size,
          uniqueH1s: new Set(allHeadings.h1.map(h => h.text.toLowerCase())).size,
        },
      };

      await updateJobProgress(supabase, jobId, "seo", 100, "completed");

      // Step 3.5: Analyze Company Context (for fair competitor matching)
      console.log("Step 3.5: Analyzing company context for fair competitor matching...");
      
      // Prepare combined text for analysis (will reuse for geography)
      const combinedText = crawledPages
        .filter(p => p.statusCode === 200)
        .map(p => extractTextFromHTML(p.html))
        .join(" ");
      const combinedHTML = crawledPages
        .filter(p => p.statusCode === 200)
        .map(p => p.html)
        .join(" ");
      
      // Estimate traffic level
      const trafficLevel = estimateTrafficLevel(
        aggregateSEO,
        siteStructure,
        crawledPages
      );
      
      // Detect company stage
      const companyStage = detectCompanyStage(
        combinedHTML,
        combinedText,
        siteStructure
      );
      
      console.log(`📊 Company Context: ${companyStage} stage, ${trafficLevel} traffic`);
      
      // Store context for later use (will update market position after geography)
      results.companyContext = {
        trafficLevel,
        companyStage,
        marketPosition: "niche", // Will be updated after geography detection
        estimatedTraffic: trafficLevel === "high" ? ">100K/month" : trafficLevel === "medium" ? "10K-100K/month" : "<10K/month",
      };

      // Step 4: Geography Detection
      await updateJobProgress(supabase, jobId, "geography", 40);
      console.log("Step 4: Detecting geography...");
      
      results.geography = detectGeography(combinedText, combinedHTML, domainName);
      
      // Update market position based on geography
      if (results.companyContext) {
        results.companyContext.marketPosition = detectMarketPosition(
          combinedText,
          combinedHTML,
          results.geography
        );
        console.log(`🌍 Market Position: ${results.companyContext.marketPosition}`);
      }

      await updateJobProgress(supabase, jobId, "geography", 100, "completed");

      // Step 5: Toxic Pattern Detection
      await updateJobProgress(supabase, jobId, "toxicPatterns", 50);
      console.log("Step 5: Detecting toxic patterns...");
      
      const allToxicPatterns: string[] = [];
      for (const page of crawledPages) {
        if (page.statusCode === 200 && page.html) {
          const text = extractTextFromHTML(page.html);
          const patterns = detectToxicPatterns(page.html, text);
          allToxicPatterns.push(...patterns);
        }
      }
      results.toxicPatterns = [...new Set(allToxicPatterns)];

      await updateJobProgress(supabase, jobId, "toxicPatterns", 100, "completed");

      // Step 6: Strengths/Weaknesses Analysis
      await updateJobProgress(supabase, jobId, "analysis", 60);
      console.log("Step 6: Analyzing strengths and weaknesses...");
      
      const { strengths, weaknesses } = analyzeStrengthsWeaknesses(
        aggregateSEO,
        siteStructure,
        crawledPages,
        results.toxicPatterns
      );
      results.strengths = strengths;
      results.weaknesses = weaknesses;

      await updateJobProgress(supabase, jobId, "analysis", 100, "completed");

      // Step 7: Keyword Extraction & Fair Competitor Identification
      // Check if keywords were already provided from crawler
      if (keywords && keywords.all && keywords.all.length > 0) {
        console.log(`✅ Using ${keywords.all.length} keywords from crawler`);
        results.keywords.all = keywords.all;
        await updateJobProgress(supabase, jobId, "keywords", 80);
      } else {
        await updateJobProgress(supabase, jobId, "keywords", 70);
        console.log("Step 7: Extracting keywords and identifying fair competitors...");

        // Prepare context for fair competitor identification
        const companyContext = results.companyContext || {
          trafficLevel: "low",
          companyStage: "startup",
          marketPosition: "niche",
          estimatedTraffic: "<10K/month",
        };

        try {
          const keywordResponse = await fetch(
            `${supabaseUrl}/functions/v1/generate-competitive-intelligence`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                brandName: domainName.split(".")[0],
                websiteUrl: domainUrl,
                industry: "Technology", // Could be enhanced to detect industry
                language,
                // Add context for fair competitor matching
                companyContext: {
                  trafficLevel: companyContext.trafficLevel,
                  companyStage: companyContext.companyStage,
                  marketPosition: companyContext.marketPosition,
                  estimatedTraffic: companyContext.estimatedTraffic,
                },
              }),
            }
          );

          if (keywordResponse.ok) {
            const keywordData = await keywordResponse.json();
            console.log("Keyword extraction response:", JSON.stringify(keywordData).substring(0, 500));
            
            if (keywordData.success && keywordData.data) {
              results.keywords.all = keywordData.data.keywords || [];
              results.competitors.all = keywordData.data.competitors || [];
              
              console.log(`✅ Extracted ${results.keywords.all.length} keywords and ${results.competitors.all.length} competitors`);
            } else {
              console.warn("⚠️ Keyword extraction returned no data:", keywordData);
            }
          } else {
            const errorText = await keywordResponse.text();
            console.error("❌ Keyword extraction failed:", keywordResponse.status, errorText);
          }
        } catch (error) {
          console.error("❌ Keyword extraction error:", error);
        }

        await updateJobProgress(supabase, jobId, "keywords", 90);
      }
      
      // Classify keywords (whether from crawler or LLM extraction)
      if (results.keywords.all && results.keywords.all.length > 0) {
        const brandName = domainName.split(".")[0].toLowerCase();
        results.keywords.branded = results.keywords.all.filter((k: string) =>
          k.toLowerCase().includes(brandName)
        );
        results.keywords.nonBranded = results.keywords.all.filter(
          (k: string) => !k.toLowerCase().includes(brandName)
        );
        
        const geoKeywords = results.keywords.all.filter((k: string) => {
          const lower = k.toLowerCase();
          return /^(in|at|near|around|local|city|area|region|location)/i.test(k) ||
            /(near me|local|city|area|region)/i.test(lower);
        });
        results.keywords.geo = geoKeywords;
      }

      await updateJobProgress(supabase, jobId, "keywords", 100, "completed");

      // Step 8: Enhanced Competitor Mapping & Validation
      await updateJobProgress(supabase, jobId, "competitors", 80);
      console.log("Step 8: Mapping and validating competitors for fairness...");

      if (results.competitors.all.length > 0) {
        // Filter out obviously unfair competitors (large enterprises for startups/SMBs)
        const companyContext = results.companyContext || { companyStage: "startup", trafficLevel: "low" };
        const unfairCompetitors = [
          "apple", "google", "microsoft", "amazon", "meta", "facebook", "samsung", 
          "ibm", "oracle", "salesforce", "adobe", "intel", "nvidia", "cisco",
          "hp", "dell", "lenovo", "sony", "panasonic", "lg", "huawei", "xiaomi",
          "netflix", "uber", "airbnb", "tesla", "spacex", "twitter", "linkedin"
        ];
        
        let filteredCompetitors = results.competitors.all;
        
        // If company is startup or SMB, filter out large enterprises
        if (companyContext.companyStage === "startup" || companyContext.companyStage === "smb") {
          filteredCompetitors = results.competitors.all.filter((competitor: string) => {
            const lowerCompetitor = competitor.toLowerCase();
            // Check if competitor name contains any unfair competitor keywords
            const isUnfair = unfairCompetitors.some(unfair => 
              lowerCompetitor.includes(unfair) || 
              lowerCompetitor === unfair ||
              lowerCompetitor.startsWith(unfair + " ") ||
              lowerCompetitor.endsWith(" " + unfair)
            );
            return !isUnfair;
          });
          
          if (filteredCompetitors.length < results.competitors.all.length) {
            console.log(`✅ Filtered out ${results.competitors.all.length - filteredCompetitors.length} unfair competitors (large enterprises)`);
            results.competitors.all = filteredCompetitors;
          }
        }
        
        results.competitors.organic = results.competitors.all.slice(0, 10);
        
        // Classify competitors by type
        results.competitors.geo = results.competitors.all.filter((c: string) =>
          results.geography.primary && 
          (c.toLowerCase().includes(results.geography.primary.toLowerCase()) ||
           c.toLowerCase().includes(results.geography.secondary.join(" ").toLowerCase()))
        ).slice(0, 5);
        
        results.competitors.local = results.competitors.all.filter((c: string) =>
          /local|near me|area|region/i.test(c)
        ).slice(0, 5);
        
        console.log(`✅ Final competitor list: ${results.competitors.all.length} fair competitors identified`);
      }

      await updateJobProgress(supabase, jobId, "competitors", 100, "completed");

      // Step 9: GSC Data Fetching (if enabled)
      if (integrations.gsc) {
        await updateJobProgress(supabase, jobId, "gscData", 85);
        console.log("Step 9: Fetching GSC data...");
        
        try {
          const gscData = await fetchGSCData(supabase, userId, domainUrl);
          if (gscData) {
            results.gscData = gscData;
          }
        } catch (error) {
          console.error("GSC data fetching error:", error);
        }
        
        await updateJobProgress(supabase, jobId, "gscData", 100, "completed");
      }

      // Step 10: AI Visibility Scan
      await updateJobProgress(supabase, jobId, "aiVisibility", 90);
      console.log("Step 10: Scanning AI visibility...");

      try {
        const visibilityResponse = await fetch(
          `${supabaseUrl}/functions/v1/domain-visibility`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              domainUrl,
              platforms: ["claude", "gemini", "perplexity"], // Only 3 platforms for faster scanning
              language,
              userId,
            }),
          }
        );

        if (visibilityResponse.ok) {
          const visibilityData = await visibilityResponse.json();
          if (visibilityData.success) {
            // Calculate totals from platform results
            const platformResults = visibilityData.results || {};
            let totalQueries = 0;
            let totalMentions = 0;
            const platformResultsFormatted: Record<string, any> = {};

            Object.entries(platformResults).forEach(([platform, data]: [string, any]) => {
              const platformData = data as any;
              totalQueries += platformData.totalQueries || 0;
              totalMentions += platformData.mentions || 0;
              platformResultsFormatted[platform] = {
                mentions: platformData.mentions || 0,
                totalQueries: platformData.totalQueries || 0,
                visibilityScore: platformData.visibilityScore || 0,
                queries: platformData.queries || [],
              };
            });

            results.aiVisibility = {
              platforms: platformResultsFormatted,
              platform_results: platformResultsFormatted, // Alias for compatibility
              overallScore: visibilityData.overallScore || 0,
              total_queries: totalQueries,
              total_mentions: totalMentions,
              avg_sentiment: 0, // Not calculated yet
            };

            console.log(`✅ AI Visibility results: ${totalMentions} mentions out of ${totalQueries} queries`);
          }
        }
      } catch (error) {
        console.error("AI visibility scan error:", error);
      }

      await updateJobProgress(supabase, jobId, "aiVisibility", 100, "completed");

      // Step 11: Generate Recommendations
      await updateJobProgress(supabase, jobId, "recommendations", 95);
      console.log("Step 11: Generating recommendations...");

      const recommendedActions: any[] = [];
      
      // SEO recommendations
      if (results.weaknesses.some(w => w.includes("SEO score"))) {
        recommendedActions.push({
          priority: "high",
          category: "SEO",
          action: "Improve overall SEO score - focus on meta tags, headings, and structured data",
          impact: "High",
          effort: "Medium",
        });
      }
      if (results.weaknesses.some(w => w.includes("H1"))) {
        recommendedActions.push({
          priority: "high",
          category: "SEO",
          action: "Add H1 tags to all pages",
          impact: "High",
          effort: "Low",
        });
      }
      if (results.weaknesses.some(w => w.includes("images"))) {
        recommendedActions.push({
          priority: "medium",
          category: "SEO",
          action: "Add alt text to images for better accessibility and SEO",
          impact: "Medium",
          effort: "Low",
        });
      }
      
      // Toxic patterns
      if (results.toxicPatterns.length > 0) {
        recommendedActions.push({
          priority: "high",
          category: "Quality",
          action: `Address ${results.toxicPatterns.length} toxic pattern(s) detected`,
          impact: "High",
          effort: "High",
        });
      }
      
      // Site structure
      if (results.siteStructure.totalPages < 10) {
        recommendedActions.push({
          priority: "medium",
          category: "Content",
          action: "Expand site content depth for better coverage",
          impact: "Medium",
          effort: "High",
        });
      }
      
      // AI Visibility
      if (results.aiVisibility.overallScore && results.aiVisibility.overallScore < 50) {
        recommendedActions.push({
          priority: "medium",
          category: "AI Visibility",
          action: "Improve content for AI platform visibility",
          impact: "Medium",
          effort: "Medium",
        });
      }

      results.recommendedActions = recommendedActions.length > 0 
        ? recommendedActions 
        : [
            {
              priority: "low",
              category: "Maintenance",
              action: "Continue monitoring and optimizing",
              impact: "Low",
              effort: "Low",
            },
          ];

      await updateJobProgress(supabase, jobId, "recommendations", 100, "completed");

      // Update job as completed
      await supabase
        .from("domain_intelligence_jobs")
        .update({
          status: "completed",
          results,
          completed_at: new Date().toISOString(),
          progress: {
            currentStep: "completed",
            percentage: 100,
            steps: {
              crawl: { status: "completed", percentage: 100 },
              siteStructure: { status: "completed", percentage: 100 },
              seo: { status: "completed", percentage: 100 },
              geography: { status: "completed", percentage: 100 },
              toxicPatterns: { status: "completed", percentage: 100 },
              analysis: { status: "completed", percentage: 100 },
              keywords: { status: "completed", percentage: 100 },
              competitors: { status: "completed", percentage: 100 },
              ...(integrations.gsc ? { gscData: { status: "completed", percentage: 100 } } : {}),
              aiVisibility: { status: "completed", percentage: 100 },
              recommendations: { status: "completed", percentage: 100 },
            },
          },
        })
        .eq("id", jobId);

      console.log(`Domain intelligence analysis completed for: ${domainName}`);

      return new Response(
        JSON.stringify({
          success: true,
          jobId,
          status: "completed",
          message: "Domain intelligence analysis completed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Domain intelligence error:", error);
      
      await supabase
        .from("domain_intelligence_jobs")
        .update({
          status: "failed",
          error_message: error.message || "Analysis failed",
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({
          error: error.message || "Failed to analyze domain",
          success: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
