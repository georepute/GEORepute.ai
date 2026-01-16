export interface DomainEnrichmentData {
  domain: string;
  description?: string;
  metadata?: {
    title?: string;
    metaDescription?: string;
    ogDescription?: string;
  };
  websiteContent?: string; // First 2000 chars of content for AI context
  hasContent: boolean;
}

/**
 * Enrich domain data by crawling the website
 * Uses the existing crawl-website API endpoint
 */
export async function enrichDomainData(
  domain: string
): Promise<DomainEnrichmentData | null> {
  try {
    if (!domain || domain.trim().length === 0) {
      return null;
    }

    // Normalize domain URL
    let normalizedDomain = domain.trim();
    if (!normalizedDomain.startsWith('http://') && !normalizedDomain.startsWith('https://')) {
      normalizedDomain = 'https://' + normalizedDomain;
    }

    console.log(`🌐 Enriching domain data for: ${normalizedDomain}`);

    // Call the crawl-website API
    // In server context, try to determine the base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                    'http://localhost:3000';

    const apiUrl = `${baseUrl}/api/crawl-website`;
    console.log(`📡 Calling crawler API: ${apiUrl}`);

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const crawlResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedDomain }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!crawlResponse.ok) {
        console.error(`Domain crawl failed: ${crawlResponse.status} ${crawlResponse.statusText}`);
        // Graceful fallback - return basic domain info
        return {
          domain: normalizedDomain,
          hasContent: false,
        };
      }

      const crawlData = await crawlResponse.json();

    if (!crawlData.success) {
      console.error('Crawler returned error:', crawlData.error);
      return {
        domain: normalizedDomain,
        hasContent: false,
      };
    }

    // Extract website content from description and metadata
    const websiteContent = [
      crawlData.description || '',
      crawlData.metadata?.title || '',
      crawlData.metadata?.metaDescription || '',
      crawlData.metadata?.ogDescription || '',
    ]
      .filter(text => text.trim().length > 0)
      .join(' ')
      .substring(0, 2000); // Limit to 2000 chars for AI context

    return {
      domain: normalizedDomain,
      description: crawlData.description,
      metadata: crawlData.metadata || {},
      websiteContent: websiteContent || undefined,
      hasContent: !!(crawlData.description || websiteContent),
    };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Domain crawl timeout after 30 seconds');
      } else {
        console.error('Domain crawl fetch failed:', fetchError);
      }
      // Graceful fallback
      return {
        domain: normalizedDomain,
        hasContent: false,
      };
    }
  } catch (error) {
    console.error('Domain enrichment failed:', error);
    // Graceful fallback
    return {
      domain: domain,
      hasContent: false,
    };
  }
}

/**
 * Format domain enrichment data for AI prompts
 */
export function formatDomainDataForPrompt(
  enrichment: DomainEnrichmentData | null
): string {
  if (!enrichment || !enrichment.hasContent) {
    return '';
  }

  const parts: string[] = [];

  if (enrichment.metadata?.title) {
    parts.push(`Website Title: ${enrichment.metadata.title}`);
  }

  if (enrichment.description) {
    parts.push(`Website Summary: ${enrichment.description}`);
  }

  if (enrichment.metadata?.metaDescription) {
    parts.push(`Meta Description: ${enrichment.metadata.metaDescription}`);
  }

  if (enrichment.websiteContent && enrichment.websiteContent.length > 100) {
    parts.push(`Website Content (first 2000 chars): ${enrichment.websiteContent}`);
  }

  return parts.join('\n');
}
