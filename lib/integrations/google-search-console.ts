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

/** ISO 3166-1 alpha-2 (UI) → GSC API country code (lowercase alpha-3) for SEO-level segmentation */
const COUNTRY_ALPHA2_TO_GSC: Record<string, string> = {
  US: 'usa', GB: 'gbr', CA: 'can', AU: 'aus', DE: 'deu', FR: 'fra',
  IN: 'ind', IT: 'ita', ES: 'esp', NL: 'nld', BR: 'bra', MX: 'mex',
  JP: 'jpn', CN: 'chn', KR: 'kor', PL: 'pol', SE: 'swe', BE: 'bel',
  CH: 'che', AT: 'aut', IE: 'irl', PT: 'prt', ZA: 'zaf', RU: 'rus',
  TR: 'tur', ID: 'idn', TH: 'tha', VN: 'vnm', MY: 'mys', SG: 'sgp',
  PH: 'phl', NZ: 'nzl', AR: 'arg', CL: 'chl', CO: 'col', SA: 'sau',
  AE: 'are', IL: 'isr', EG: 'egy', NG: 'nga', KE: 'ken',
};

function toGscCountryCode(alpha2: string): string {
  const code = COUNTRY_ALPHA2_TO_GSC[alpha2.toUpperCase()];
  if (code) return code;
  const a = alpha2.toLowerCase();
  return a.length >= 3 ? a.slice(0, 3) : a.padEnd(3, a[0] || 'x');
}

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
   * @param options - Optional: { countries: string[] } for SEO-level segmentation (alpha-2, e.g. US, GB). When set, only data for these countries is fetched and merged.
   */
  async fetchKeywords(
    siteUrl: string,
    limit: number = 100,
    options?: { countries?: string[] }
  ): Promise<GSCKeyword[]> {
    try {
      const searchconsole = google.searchconsole({
        version: 'v1',
        auth: this.oauth2Client,
      });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const countries = options?.countries?.filter(Boolean) ?? [];
      if (countries.length > 0) {
        const gscCodes = countries.map((c) => toGscCountryCode(c));
        const mergedByQuery = new Map<string, { impressions: number; clicks: number; positionSum: number; positionWeight: number }>();

        for (const gscCountry of gscCodes) {
          try {
            const response = await searchconsole.searchanalytics.query({
              siteUrl,
              requestBody: {
                startDate: startStr,
                endDate: endStr,
                dimensions: ['query'],
                rowLimit: limit,
                dimensionFilterGroups: [
                  {
                    groupType: 'and',
                    filters: [
                      { dimension: 'country', operator: 'equals', expression: gscCountry },
                    ],
                  },
                ],
              },
            });
            const rows = response.data.rows || [];
            for (const row of rows) {
              const q = (row.keys && row.keys[0]) ? String(row.keys[0]).trim() : '';
              if (!q) continue;
              const imp = Number(row.impressions) || 0;
              const clk = Number(row.clicks) || 0;
              const pos = Number(row.position) || 0;
              const existing = mergedByQuery.get(q);
              if (existing) {
                existing.impressions += imp;
                existing.clicks += clk;
                existing.positionSum += pos * imp;
                existing.positionWeight += imp;
              } else {
                mergedByQuery.set(q, {
                  impressions: imp,
                  clicks: clk,
                  positionSum: pos * imp,
                  positionWeight: imp,
                });
              }
            }
          } catch (err) {
            console.warn(`GSC fetch for country ${gscCountry} failed:`, err);
          }
        }

        const merged: GSCKeyword[] = Array.from(mergedByQuery.entries()).map(([keyword, agg]) => ({
          keyword,
          impressions: agg.impressions,
          clicks: agg.clicks,
          position: agg.positionWeight > 0 ? Math.round((agg.positionSum / agg.positionWeight) * 10) / 10 : 0,
          ctr: agg.impressions > 0 ? agg.clicks / agg.impressions : 0,
        }));
        merged.sort((a, b) => b.impressions - a.impressions);
        const out = merged.slice(0, limit);
        console.log(`✅ Fetched ${out.length} GSC keywords (SEO-level: ${countries.join(', ')})`);
        return out;
      }

      console.log(`📊 Fetching GSC keywords for ${siteUrl}`);
      console.log(`📅 Date range: ${startStr} to ${endStr}`);

      const response = await searchconsole.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
          startDate: startStr,
          endDate: endStr,
          dimensions: ['query'],
          rowLimit: limit,
        },
      });

      const rows = response.data.rows || [];
      console.log(`✅ Fetched ${rows.length} keywords from GSC`);

      return rows.map((row: any) => ({
        keyword: row.keys[0],
        position: Math.round(row.position * 10) / 10,
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
   * Throws an error if verification fails
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
    } catch (error: any) {
      console.error('❌ Error verifying site:', error);
      // Throw the error so the caller knows verification failed
      throw new Error(error.message || 'Failed to verify domain. Please ensure the DNS record is correctly added.');
    }
  }

  /**
   * Verify URL site (alias for verifySite)
   * Throws an error if verification fails
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
