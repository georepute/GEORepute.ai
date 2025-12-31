/**
 * Google Search Console Integration Service
 * Handles OAuth authentication and keyword data fetching from GSC API
 */

import { google } from 'googleapis';

export interface GSCKeyword {
  keyword: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

export interface GSCConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Type alias for backward compatibility
export type GSCTokens = GSCConfig;

export class GoogleSearchConsoleService {
  private oauth2Client;

  constructor(config: GSCConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: config.accessToken,
      refresh_token: config.refreshToken,
      expiry_date: config.expiresAt,
    });
  }

  /**
   * Fetch keywords from Google Search Console
   * @param siteUrl - The verified GSC property URL
   * @param limit - Number of keywords to fetch (default 100)
   * @returns Array of keywords with metrics
   */
  async fetchKeywords(
    siteUrl: string,
    limit: number = 100
  ): Promise<GSCKeyword[]> {
    try {
      const searchconsole = google.searchconsole({
        version: 'v1',
        auth: this.oauth2Client,
      });

      // Get data from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      console.log(`📊 Fetching GSC keywords for ${siteUrl}`);
      console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

      const response = await searchconsole.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: limit,
        },
      });

      const rows = response.data.rows || [];
      console.log(`✅ Fetched ${rows.length} keywords from GSC`);

      return rows.map((row: any) => ({
        keyword: row.keys[0],
        position: Math.round(row.position * 10) / 10, // Round to 1 decimal
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
      }));
    } catch (error) {
      console.error('❌ Error fetching GSC keywords:', error);
      throw error;
    }
  }

  /**
   * Get list of verified sites for this user
   */
  async getVerifiedSites(): Promise<string[]> {
    try {
      const searchconsole = google.searchconsole({
        version: 'v1',
        auth: this.oauth2Client,
      });

      const response = await searchconsole.sites.list();
      const sites = response.data.siteEntry || [];

      // Only return verified sites where user has owner permission
      return sites
        .filter((site: any) => site.permissionLevel === 'siteOwner')
        .map((site: any) => site.siteUrl);
    } catch (error) {
      console.error('❌ Error fetching verified sites:', error);
      throw error;
    }
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(): Promise<{ accessToken: string; expiresAt: number }> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      return {
        accessToken: credentials.access_token!,
        expiresAt: credentials.expiry_date!,
      };
    } catch (error) {
      console.error('❌ Error refreshing GSC token:', error);
      throw error;
    }
  }

  /**
   * Get verification token for a site using Site Verification API
   */
  async getVerificationToken(siteUrl: string, method: string): Promise<string> {
    try {
      const siteVerification = google.siteVerification({
        version: 'v1',
        auth: this.oauth2Client,
      });

      const response = await siteVerification.webResource.getToken({
        requestBody: {
          verificationMethod: method,
          site: {
            type: method === 'DNS_TXT' || method === 'DNS_CNAME' ? 'INET_DOMAIN' : 'SITE',
            identifier: siteUrl.replace(/^sc-domain:/, ''),
          },
        },
      });

      return response.data.token || '';
    } catch (error) {
      console.error('❌ Error getting verification token:', error);
      throw error;
    }
  }

  /**
   * Get URL verification token (alias for getVerificationToken)
   */
  async getUrlVerificationToken(siteUrl: string, method: string): Promise<string> {
    return this.getVerificationToken(siteUrl, method);
  }

  /**
   * Verify a site with Google Site Verification API
   */
  async verifySite(siteUrl: string, method: string): Promise<boolean> {
    try {
      const siteVerification = google.siteVerification({
        version: 'v1',
        auth: this.oauth2Client,
      });

      await siteVerification.webResource.insert({
        verificationMethod: method,
        requestBody: {
          site: {
            type: method === 'DNS_TXT' || method === 'DNS_CNAME' ? 'INET_DOMAIN' : 'SITE',
            identifier: siteUrl.replace(/^sc-domain:/, ''),
          },
        },
      });

      return true;
    } catch (error) {
      console.error('❌ Error verifying site:', error);
      return false;
    }
  }

  /**
   * Verify URL site (alias for verifySite)
   */
  async verifyUrlSite(siteUrl: string, method: string): Promise<boolean> {
    return this.verifySite(siteUrl, method);
  }

  /**
   * Add a site to Google Search Console
   */
  async addSite(siteUrl: string): Promise<void> {
    try {
      const searchconsole = google.searchconsole({
        version: 'v1',
        auth: this.oauth2Client,
      });

      await searchconsole.sites.add({
        siteUrl,
      });
      
      console.log(`✅ Site ${siteUrl} added to Search Console`);
    } catch (error) {
      console.error('❌ Error adding site to GSC:', error);
      throw error;
    }
  }
}

/**
 * Normalize URL for comparison
 * Removes protocol, www, trailing slash, and converts to lowercase
 */
export function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '')        // Remove www
    .replace(/\/$/, '')           // Remove trailing slash
    .toLowerCase();               // Lowercase
}

// Alias for backwards compatibility
export const normalizeSiteUrl = normalizeUrl;

/**
 * Check if two URLs match (considering different formats)
 */
export function urlsMatch(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2);
}

/**
 * Helper function to create GSC client from stored tokens
 */
export function createGSCClientFromTokens(tokens: {
  access_token: string;
  refresh_token: string;
  expires_at: string | number;
}) {
  const expiresAt = typeof tokens.expires_at === 'string' 
    ? new Date(tokens.expires_at).getTime() 
    : tokens.expires_at;

  return new GoogleSearchConsoleService({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
  });
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
export function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get the properly formatted Search Console site URL
 * Handles both domain properties (sc-domain:) and URL-prefix properties
 */
export function getSearchConsoleSiteUrl(url: string, verificationMethod?: string): string {
  // If it's already a domain property format, return as-is
  if (url.startsWith('sc-domain:')) {
    return url;
  }
  
  // If verification method is DNS-based, use sc-domain: prefix
  if (verificationMethod === 'DNS_TXT' || verificationMethod === 'DNS_CNAME') {
    // Remove protocol and www if present
    const cleanDomain = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
    return `sc-domain:${cleanDomain}`;
  }
  
  // Otherwise, ensure it has the proper URL-prefix format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
}

// Class/type alias for backward compatibility
export { GoogleSearchConsoleService as GoogleSearchConsoleClient };
export type { GoogleSearchConsoleService as GoogleSearchConsoleClientType };
