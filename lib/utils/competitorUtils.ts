/**
 * Utility functions for competitor domain and logo handling
 */

/**
 * Normalize domain (remove http://, https://, trailing slashes)
 */
export function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0];
}

/**
 * Extract domain from company name (best guess)
 * This is a fallback when domain is not provided
 * Works universally for all regions and industries
 */
export function extractDomainFromName(name: string): string {
  // Remove common suffixes and clean up (works for all countries)
  let cleaned = name
    .toLowerCase()
    .replace(/\s+(inc|llc|corp|corporation|ltd|limited|co|company|pvt|private|gmbh|ag|sa|bv|spa|srl|oy|ab|as|plc|llp|group|holdings|international|global|worldwide)$/i, '')
    .trim();
  
  // Remove country names (common in company names)
  cleaned = cleaned.replace(/\s+(pakistan|india|usa|uk|united states|united kingdom|canada|australia|germany|france|spain|italy|japan|china|south korea|brazil|mexico|argentina|south africa|uae|saudi arabia|egypt|turkey|russia|singapore|malaysia|indonesia|thailand|vietnam|philippines|bangladesh|sri lanka|nepal)$/i, '');
  
  // Handle well-known international companies
  const knownDomains: Record<string, string> = {
    // Food & Beverage
    'pepsico': 'pepsico.com',
    'coca-cola': 'coca-cola.com',
    'coca cola': 'coca-cola.com',
    'nestle': 'nestle.com',
    'unilever': 'unilever.com',
    'danone': 'danone.com',
    'kellogg': 'kelloggs.com',
    'kraft': 'kraftheinz.com',
    'mondelez': 'mondelez.com',
    // Tech
    'microsoft': 'microsoft.com',
    'apple': 'apple.com',
    'google': 'google.com',
    'amazon': 'amazon.com',
    'meta': 'meta.com',
    'facebook': 'meta.com',
    'tesla': 'tesla.com',
    'samsung': 'samsung.com',
    'sony': 'sony.com',
    'lg': 'lg.com',
    'huawei': 'huawei.com',
    'xiaomi': 'mi.com',
    // Retail
    'walmart': 'walmart.com',
    'target': 'target.com',
    'ikea': 'ikea.com',
    // Automotive
    'toyota': 'toyota.com',
    'ford': 'ford.com',
    'bmw': 'bmw.com',
    'mercedes': 'mercedes-benz.com',
    'volkswagen': 'volkswagen.com',
    // Add more as needed
  };
  
  const normalizedName = cleaned.replace(/[^a-z0-9]/g, '');
  for (const [key, domain] of Object.entries(knownDomains)) {
    if (normalizedName.includes(key.replace(/[^a-z0-9]/g, ''))) {
      return domain;
    }
  }
  
  // Remove special characters, keep hyphens and dots
  cleaned = cleaned
    .replace(/[^a-z0-9.\-]/g, '') // Keep only alphanumeric, dots, and hyphens
    .replace(/\s+/g, '') // Remove spaces
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
  
  // If already looks like a domain, return it
  if (cleaned.includes('.') && cleaned.match(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i)) {
    return cleaned;
  }
  
  // Default to .com (most common TLD)
  return `${cleaned}.com`;
}

/**
 * Get Clearbit logo URL (higher quality company logos)
 */
export function getClearbitLogoUrl(domain: string): string {
  const cleanDomain = normalizeDomain(domain);
  return `https://logo.clearbit.com/${cleanDomain}`;
}

/**
 * Get Google favicon URL (more reliable fallback)
 */
export function getFaviconUrl(domain: string, size: number = 64): string {
  const cleanDomain = normalizeDomain(domain);
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`;
}

/**
 * Get Logo.dev API URL (alternative logo source)
 */
export function getLogoDevUrl(domain: string): string {
  const cleanDomain = normalizeDomain(domain);
  return `https://logo.dev/${cleanDomain}?token=${process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || ''}`;
}

/**
 * Get Favicon.io API URL (another fallback)
 */
export function getFaviconIoUrl(domain: string): string {
  const cleanDomain = normalizeDomain(domain);
  return `https://api.favicon.io/v1/favicon?domain=${cleanDomain}`;
}

/**
 * Get all possible logo URLs for a domain (for fallback chain)
 */
export function getLogoUrls(domain: string): string[] {
  const cleanDomain = normalizeDomain(domain);
  return [
    // Clearbit Logo API (high quality, but may not have all companies)
    `https://logo.clearbit.com/${cleanDomain}`,
    // Google Favicon API (larger size)
    `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`,
    // Direct favicon from domain
    `https://${cleanDomain}/favicon.ico`,
  ];
}

/**
 * Get domain variations for better logo matching
 * Tries different TLDs and variations - works for all regions
 */
export function getDomainVariations(domain: string): string[] {
  const cleanDomain = normalizeDomain(domain);
  
  // Extract base domain (remove TLD)
  const tldMatch = cleanDomain.match(/\.([a-z]{2,}(\.[a-z]{2,})?)$/i);
  const baseDomain = tldMatch ? cleanDomain.slice(0, tldMatch.index) : cleanDomain.replace(/\.(com|net|org|co|io|ai|tech|app|dev|info|biz|us|uk|ca|au|de|fr|es|it|jp|cn|kr|in|br|mx|ar|za|ae|sa|eg|tr|ru|sg|my|id|th|vn|ph|bd|lk|np|pk|co\.pk|co\.uk|co\.za|co\.nz|co\.jp|com\.au|com\.br|com\.mx|com\.ar|com\.sg|com\.my|com\.ph|com\.vn|com\.th|com\.id|com\.in|com\.cn|com\.kr|com\.jp|com\.tr|com\.ae|com\.sa|com\.eg|com\.ru)$/i, '');
  
  const variations: string[] = [cleanDomain]; // Original first (highest priority)
  
  // Common international TLDs to try
  const commonTlds = [
    'com',      // Most common
    'net',      // Common alternative
    'org',      // Organizations
    'co',       // Many countries use .co
    'io',       // Tech companies
    'ai',       // AI/Tech
  ];
  
  // Country-specific TLDs (try if base domain suggests a country)
  const countryTlds: Record<string, string[]> = {
    'pk': ['com.pk', 'pk', 'co.pk'],
    'in': ['co.in', 'in', 'com.in'],
    'uk': ['co.uk', 'uk', 'com.uk'],
    'us': ['com', 'us', 'co.us'],
    'ca': ['ca', 'com.ca', 'co.ca'],
    'au': ['com.au', 'au', 'co.au'],
    'de': ['de', 'com.de', 'co.de'],
    'fr': ['fr', 'com.fr', 'co.fr'],
    'es': ['es', 'com.es', 'co.es'],
    'it': ['it', 'com.it', 'co.it'],
    'jp': ['co.jp', 'jp', 'com.jp'],
    'cn': ['com.cn', 'cn', 'co.cn'],
    'kr': ['co.kr', 'kr', 'com.kr'],
    'br': ['com.br', 'br', 'co.br'],
    'mx': ['com.mx', 'mx', 'co.mx'],
    'ar': ['com.ar', 'ar', 'co.ar'],
    'za': ['co.za', 'za', 'com.za'],
    'ae': ['ae', 'com.ae', 'co.ae'],
    'sa': ['sa', 'com.sa', 'co.sa'],
    'eg': ['eg', 'com.eg', 'co.eg'],
    'tr': ['com.tr', 'tr', 'co.tr'],
    'ru': ['ru', 'com.ru', 'co.ru'],
    'sg': ['com.sg', 'sg', 'co.sg'],
    'my': ['com.my', 'my', 'co.my'],
    'id': ['co.id', 'id', 'com.id'],
    'th': ['co.th', 'th', 'com.th'],
    'vn': ['com.vn', 'vn', 'co.vn'],
    'ph': ['com.ph', 'ph', 'co.ph'],
    'bd': ['com.bd', 'bd', 'co.bd'],
    'lk': ['lk', 'com.lk', 'co.lk'],
    'np': ['com.np', 'np', 'co.np'],
    'nz': ['co.nz', 'nz', 'com.nz'],
  };
  
  // Detect potential country code from domain or try common ones
  let detectedCountry: string | null = null;
  if (tldMatch) {
    const tld = tldMatch[1].toLowerCase();
    // Check if TLD matches a country code
    for (const [country, tlds] of Object.entries(countryTlds)) {
      if (tlds.some(t => tld.includes(t.replace(/\./g, '')))) {
        detectedCountry = country;
        break;
      }
    }
  }
  
  // Add common TLD variations
  for (const tld of commonTlds) {
    const variation = `${baseDomain}.${tld}`;
    if (variation !== cleanDomain) {
      variations.push(variation);
    }
  }
  
  // Add country-specific variations if detected
  if (detectedCountry && countryTlds[detectedCountry]) {
    for (const tld of countryTlds[detectedCountry]) {
      const variation = `${baseDomain}.${tld}`;
      if (variation !== cleanDomain && !variations.includes(variation)) {
        variations.push(variation);
      }
    }
  }
  
  // Remove duplicates and return (max 10 variations to avoid too many requests)
  return [...new Set(variations)].slice(0, 10);
}
