// Domain Intelligence Edge Function
// Orchestrates comprehensive domain analysis including crawling, SEO, keywords, competitors, AI visibility

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

// Extract text from HTML
function extractTextFromHTML(html: string): string {
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

// Extract links from HTML
function extractLinks(html: string, baseUrl: string, baseDomain: string): string[] {
  const links: string[] = [];
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
  
  return [...new Set(links)]; // Remove duplicates
}

// Multi-page crawler
async function crawlDomain(
  startUrl: string,
  maxPages: number = 20,
  maxDepth: number = 3
): Promise<Array<{ url: string; html: string; statusCode: number; depth: number }>> {
  const visited = new Set<string>();
  const toVisit: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
  const results: Array<{ url: string; html: string; statusCode: number; depth: number }> = [];
  const baseDomain = extractDomainName(startUrl);
  
  while (toVisit.length > 0 && results.length < maxPages) {
    const { url, depth } = toVisit.shift()!;
    
    if (visited.has(url) || depth > maxDepth) continue;
    visited.add(url);
    
    const { html, statusCode } = await fetchWebsiteContent(url);
    
    if (statusCode === 200 && html) {
      results.push({ url, html, statusCode, depth });
      
      // Extract links for next depth level
      if (depth < maxDepth) {
        const links = extractLinks(html, url, baseDomain);
        for (const link of links) {
          if (!visited.has(link) && results.length < maxPages) {
            toVisit.push({ url: link, depth: depth + 1 });
          }
        }
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
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

  // Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    seoAnalysis.metaTags.hasTitle = true;
    seoAnalysis.metaTags.title = titleMatch[1].trim();
    seoAnalysis.metaTags.titleLength = seoAnalysis.metaTags.title.length;
  }

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) {
    seoAnalysis.metaTags.hasDescription = true;
    seoAnalysis.metaTags.description = descMatch[1].trim();
    seoAnalysis.metaTags.descriptionLength = seoAnalysis.metaTags.description.length;
  }

  // Check meta keywords
  seoAnalysis.metaTags.hasKeywords = html.includes('name="keywords"');

  // Check Open Graph tags
  seoAnalysis.metaTags.ogTags = html.includes('property="og:');

  // Check Twitter tags
  seoAnalysis.metaTags.twitterTags = html.includes('name="twitter:');

  // Extract canonical URL
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    seoAnalysis.metaTags.canonicalUrl = canonicalMatch[1];
  }

  // Extract headings
  seoAnalysis.headings.h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
  seoAnalysis.headings.h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  seoAnalysis.headings.h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
  seoAnalysis.headings.h4Count = (html.match(/<h4[^>]*>/gi) || []).length;

  // Heading issues
  if (seoAnalysis.headings.h1Count === 0) {
    seoAnalysis.headings.issues.push("Missing H1 tag");
  } else if (seoAnalysis.headings.h1Count > 1) {
    seoAnalysis.headings.issues.push(`Multiple H1 tags (${seoAnalysis.headings.h1Count})`);
  }

  // Extract links
  const internalLinks = html.match(/href=["'](\/[^"']*|.*?\/[^"']*)/gi) || [];
  const externalLinks = html.match(/href=["']https?:\/\/(?!.*?\/\/)/gi) || [];
  const nofollowLinks = html.match(/rel=["'][^"']*nofollow/gi) || [];
  
  seoAnalysis.links.internal = internalLinks.length;
  seoAnalysis.links.external = externalLinks.length;
  seoAnalysis.links.nofollow = nofollowLinks.length;

  // Extract images
  const allImages = html.match(/<img[^>]*>/gi) || [];
  const imagesWithAlt = html.match(/<img[^>]*alt=["'][^"']+["']/gi) || [];
  
  seoAnalysis.images.total = allImages.length;
  seoAnalysis.images.withAlt = imagesWithAlt.length;
  seoAnalysis.images.missingAlt = seoAnalysis.images.total - seoAnalysis.images.withAlt;

  // Check schema markup
  if (html.includes('application/ld+json')) {
    seoAnalysis.schema.present = true;
    const schemaMatches = html.match(/"@type"\s*:\s*"([^"]+)"/gi) || [];
    seoAnalysis.schema.types = [...new Set(schemaMatches.map(m => m.match(/"([^"]+)"/)?.[1] || "").filter(Boolean))];
  }

  // Check mobile viewport
  seoAnalysis.mobile.hasViewport = html.includes('name="viewport"');
  seoAnalysis.mobile.isResponsive = html.includes('max-width') || html.includes('responsive');

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
      // Step 1: Multi-page Crawl
      await updateJobProgress(supabase, jobId, "crawl", 10);
      console.log("Step 1: Crawling domain (multi-page)...");
      
      const crawledPages = await crawlDomain(domainUrl, 20, 3);
      console.log(`Crawled ${crawledPages.length} pages`);
      
      // Build link graph
      const linkGraph: Record<string, string[]> = {};
      for (const page of crawledPages) {
        if (page.statusCode === 200) {
          linkGraph[page.url] = extractLinks(page.html, page.url, domainName);
        }
      }
      
      results.crawl = {
        pages: crawledPages.map(p => ({
          url: p.url,
          statusCode: p.statusCode,
          depth: p.depth,
          contentLength: p.html.length,
        })),
        totalPages: crawledPages.length,
      };

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

      // Step 4: Geography Detection
      await updateJobProgress(supabase, jobId, "geography", 40);
      console.log("Step 4: Detecting geography...");
      
      const combinedText = crawledPages
        .filter(p => p.statusCode === 200)
        .map(p => extractTextFromHTML(p.html))
        .join(" ");
      const combinedHTML = crawledPages
        .filter(p => p.statusCode === 200)
        .map(p => p.html)
        .join(" ");
      
      results.geography = detectGeography(combinedText, combinedHTML, domainName);

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

      // Step 7: Keyword Extraction
      await updateJobProgress(supabase, jobId, "keywords", 70);
      console.log("Step 7: Extracting keywords...");

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
              industry: "Technology",
              language,
            }),
          }
        );

        if (keywordResponse.ok) {
          const keywordData = await keywordResponse.json();
          if (keywordData.success && keywordData.data) {
            results.keywords.all = keywordData.data.keywords || [];
            results.competitors.all = keywordData.data.competitors || [];
            
            // Classify keywords
            const brandName = domainName.split(".")[0].toLowerCase();
            results.keywords.branded = results.keywords.all.filter((k: string) =>
              k.toLowerCase().includes(brandName)
            );
            results.keywords.nonBranded = results.keywords.all.filter(
              (k: string) => !k.toLowerCase().includes(brandName)
            );
            
            // Extract geo keywords
            const geoKeywords = results.keywords.all.filter((k: string) => {
              const lower = k.toLowerCase();
              return /^(in|at|near|around|local|city|area|region|location)/i.test(k) ||
                /(near me|local|city|area|region)/i.test(lower);
            });
            results.keywords.geo = geoKeywords;
          }
        }
      } catch (error) {
        console.error("Keyword extraction error:", error);
      }

      await updateJobProgress(supabase, jobId, "keywords", 100, "completed");

      // Step 8: Enhanced Competitor Mapping
      await updateJobProgress(supabase, jobId, "competitors", 80);
      console.log("Step 8: Mapping competitors...");

      if (results.competitors.all.length > 0) {
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
              platforms: ["chatgpt", "gemini", "claude", "perplexity", "groq"],
              language,
              userId,
            }),
          }
        );

        if (visibilityResponse.ok) {
          const visibilityData = await visibilityResponse.json();
          if (visibilityData.success) {
            results.aiVisibility = {
              platforms: visibilityData.results,
              overallScore: visibilityData.overallScore,
            };
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
