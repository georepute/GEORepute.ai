import { google } from 'googleapis';

export interface GSCConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GSCTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

export interface GSCAnalyticsQuery {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  startRow?: number;
  filters?: Array<{
    dimension: string;
    operator: string;
    expression: string;
  }>;
}

export interface GSCAnalyticsRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GoogleSearchConsoleClient {
  private oauth2Client;
  
  constructor(config: GSCConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters',
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/siteverification',
        'https://www.googleapis.com/auth/siteverification.verify_only',
      ],
      prompt: 'consent', // Force consent to get refresh token
      state: state, // For CSRF protection
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string): Promise<GSCTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      token_type: tokens.token_type || undefined,
      scope: tokens.scope || undefined,
    };
  }

  /**
   * Set credentials for authenticated requests
   */
  setCredentials(tokens: GSCTokens) {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
  }

  /**
   * Get Search Console API client
   */
  getSearchConsoleClient() {
    return google.webmasters({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get Site Verification API client
   */
  getSiteVerificationClient() {
    return google.siteVerification({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GSCTokens> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || refreshToken,
      expiry_date: credentials.expiry_date || undefined,
      token_type: credentials.token_type || undefined,
      scope: credentials.scope || undefined,
    };
  }

  /**
   * List all sites the user has access to
   */
  async listSites() {
    const searchConsole = this.getSearchConsoleClient();
    const response = await searchConsole.sites.list();
    return response.data.siteEntry || [];
  }

  /**
   * Add a site to Search Console
   */
  async addSite(siteUrl: string) {
    const searchConsole = this.getSearchConsoleClient();
    const response = await searchConsole.sites.add({ siteUrl });
    return response.data;
  }

  /**
   * Delete a site from Search Console
   */
  async deleteSite(siteUrl: string) {
    const searchConsole = this.getSearchConsoleClient();
    await searchConsole.sites.delete({ siteUrl });
  }

  /**
   * Get verification token for domain verification using Site Verification API
   * This method requests a DNS_TXT or DNS_CNAME token for domain verification
   * @param domain - The domain to verify (e.g., "example.com")
   * @param method - Verification method: 'DNS_TXT' or 'DNS_CNAME'
   * @returns The verification token string to be added to DNS records
   */
  async getVerificationToken(domain: string, method: 'DNS_TXT' | 'DNS_CNAME' = 'DNS_TXT'): Promise<string> {
    const siteVerification = this.getSiteVerificationClient();
    
    try {
      // POST https://www.googleapis.com/siteVerification/v1/token
      const response = await siteVerification.webResource.getToken({
        requestBody: {
          site: {
            type: 'INET_DOMAIN',
            identifier: domain,
          },
          verificationMethod: method,
        },
      });
      return response.data.token || '';
    } catch (error: any) {
      console.error('Site Verification API error:', error);
      console.error('Request details:', { domain, method });
      console.error('Error response:', error?.response?.data);
      throw error;
    }
  }

  /**
   * Verify site ownership after DNS record is in place
   * This method instructs Google to check for the token and verify the domain
   * @param domain - The domain to verify (e.g., "example.com")
   * @param method - Verification method: 'DNS_TXT' or 'DNS_CNAME'
   * @returns Verification response data
   */
  async verifySite(domain: string, method: 'DNS_TXT' | 'DNS_CNAME' = 'DNS_TXT') {
    const siteVerification = this.getSiteVerificationClient();
    
    try {
      // POST https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT
      const response = await siteVerification.webResource.insert({
        verificationMethod: method,
        requestBody: {
          site: {
            type: 'INET_DOMAIN',
            identifier: domain,
          },
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Site verification failed:', error);
      console.error('Request details:', { domain, method });
      console.error('Error response:', error?.response?.data);
      throw error;
    }
  }

  /**
   * Get verification token for URL-prefix site verification
   * This is different from domain verification and works for URL properties
   * @param siteUrl - The full URL to verify (e.g., "https://example.com" or "https://example.com/")
   * @param method - Verification method: 'DNS_TXT', 'META', 'FILE', 'ANALYTICS', 'TAG_MANAGER'
   * @returns The verification token or HTML meta tag
   */
  async getUrlVerificationToken(siteUrl: string, method: string = 'META'): Promise<string> {
    const siteVerification = this.getSiteVerificationClient();
    
    try {
      const response = await siteVerification.webResource.getToken({
        requestBody: {
          site: {
            type: 'SITE',
            identifier: siteUrl,
          },
          verificationMethod: method,
        },
      });
      return response.data.token || '';
    } catch (error: any) {
      console.error('URL Site Verification API error:', error);
      console.error('Request details:', { siteUrl, method });
      console.error('Error response:', error?.response?.data);
      throw error;
    }
  }

  /**
   * Verify URL-prefix site ownership
   * @param siteUrl - The full URL to verify (e.g., "https://example.com")
   * @param method - Verification method used
   */
  async verifyUrlSite(siteUrl: string, method: string = 'META') {
    const siteVerification = this.getSiteVerificationClient();
    
    try {
      const response = await siteVerification.webResource.insert({
        verificationMethod: method,
        requestBody: {
          site: {
            type: 'SITE',
            identifier: siteUrl,
          },
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('URL site verification failed:', error);
      console.error('Request details:', { siteUrl, method });
      console.error('Error response:', error?.response?.data);
      throw error;
    }
  }

  /**
   * Query Search Console analytics data
   */
  async queryAnalytics(
    siteUrl: string,
    query: GSCAnalyticsQuery
  ): Promise<GSCAnalyticsRow[]> {
    const searchConsole = this.getSearchConsoleClient();
    const response = await searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: query.startDate,
        endDate: query.endDate,
        dimensions: query.dimensions || ['date'],
        rowLimit: query.rowLimit || 25000,
        startRow: query.startRow || 0,
        dimensionFilterGroups: query.filters ? [{
          filters: query.filters,
        }] : undefined,
      },
    });
    return (response.data.rows || []) as GSCAnalyticsRow[];
  }

  /**
   * Get sitemap data
   */
  async listSitemaps(siteUrl: string) {
    const searchConsole = this.getSearchConsoleClient();
    const response = await searchConsole.sitemaps.list({ siteUrl });
    return response.data.sitemap || [];
  }

  /**
   * Submit a sitemap
   */
  async submitSitemap(siteUrl: string, feedpath: string) {
    const searchConsole = this.getSearchConsoleClient();
    await searchConsole.sitemaps.submit({ siteUrl, feedpath });
  }

  /**
   * Delete a sitemap
   */
  async deleteSitemap(siteUrl: string, feedpath: string) {
    const searchConsole = this.getSearchConsoleClient();
    await searchConsole.sitemaps.delete({ siteUrl, feedpath });
  }
}

/**
 * Helper to create GSC client from stored tokens
 */
export function createGSCClientFromTokens(tokens: GSCTokens): GoogleSearchConsoleClient {
  const config: GSCConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
  };

  const client = new GoogleSearchConsoleClient(config);
  client.setCredentials(tokens);
  return client;
}

/**
 * Helper to format date for GSC API (YYYY-MM-DD)
 */
export function formatGSCDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Helper to get date N days ago
 */
export function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatGSCDate(date);
}

/**
 * Helper to normalize site URL for GSC
 * For now, we'll use URL-prefix properties as they're easier to verify programmatically
 */
export function normalizeSiteUrl(domainUrl: string): string {
  // Remove protocol and trailing slashes
  let normalized = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Always use URL-prefix properties with https://
  // This is easier to verify than domain properties
  if (!normalized.startsWith('http')) {
    normalized = `https://${normalized}`;
  }
  
  return normalized;
}

/**
 * Helper to get the correct Search Console site URL format based on verification method
 * 
 * @param domainUrl - The domain URL (e.g., "perfection.marketing" or "https://perfection.marketing")
 * @param verificationMethod - The verification method used (DNS_TXT, DNS_CNAME, META, FILE, etc.)
 * @returns The correctly formatted site URL for Search Console API calls
 * 
 * @example
 * // For DNS verification
 * getSearchConsoleSiteUrl('perfection.marketing', 'DNS_TXT')
 * // Returns: 'sc-domain:perfection.marketing'
 * 
 * @example
 * // For META verification
 * getSearchConsoleSiteUrl('https://perfection.marketing', 'META')
 * // Returns: 'https://perfection.marketing'
 */
export function getSearchConsoleSiteUrl(domainUrl: string, verificationMethod: string): string {
  // Clean domain name (remove protocol and trailing slashes)
  const cleanDomain = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // DNS_TXT and DNS_CNAME use domain properties (sc-domain:)
  // These verify the entire domain including all subdomains and protocols
  if (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME') {
    return `sc-domain:${cleanDomain}`;
  }
  
  // META, FILE, ANALYTICS, TAG_MANAGER use URL-prefix properties
  // These verify only the specific URL
  return normalizeSiteUrl(domainUrl);
}

/**
 * Check if tokens are expired or expiring soon
 */
export function isTokenExpired(expiryDate: number | Date, bufferMinutes: number = 5): boolean {
  const expiry = typeof expiryDate === 'number' ? expiryDate : expiryDate.getTime();
  const now = Date.now();
  const buffer = bufferMinutes * 60 * 1000; // Convert minutes to milliseconds
  return expiry - buffer <= now;
}

/**
 * Verify GSC configuration exists
 */
export function verifyGSCConfig(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  );
}

