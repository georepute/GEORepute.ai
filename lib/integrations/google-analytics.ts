/**
 * Google Analytics 4 Integration Service
 * Handles OAuth authentication and data fetching from GA4 API
 */

import { google } from 'googleapis';

export interface GA4Config {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface GA4Metric {
  name: string;
  value: string | number;
}

export interface GA4Dimension {
  name: string;
  value: string;
}

export class GoogleAnalyticsService {
  private oauth2Client;

  constructor(config: GA4Config) {
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
   * Get list of GA4 properties for this user
   */
  async getProperties(): Promise<any[]> {
    try {
      const analyticsadmin = google.analyticsadmin({
        version: 'v1beta',
        auth: this.oauth2Client,
      });

      const accountResponse = await analyticsadmin.accounts.list();
      const accounts = accountResponse.data.accounts || [];

      if (accounts.length === 0) {
        return [];
      }

      const properties: any[] = [];
      for (const account of accounts) {
        const propertiesResponse = await analyticsadmin.properties.list({
          filter: `parent:${account.name}`,
        });
        const accountProperties = propertiesResponse.data.properties || [];
        properties.push(...accountProperties.map((p: any) => ({
          accountId: account.name,
          accountName: account.displayName,
          propertyId: p.name,
          propertyName: p.displayName,
          propertyIdNum: p.propertyId,
        })));
      }

      return properties;
    } catch (error) {
      console.error('❌ Error fetching GA4 properties:', error);
      throw error;
    }
  }

  /**
   * Run a report query
   */
  async runReport(
    propertyId: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = [],
    metrics: string[] = ['sessions', 'users', 'pageviews'],
    limit: number = 100
  ): Promise<any> {
    try {
      const analyticsdata = google.analyticsdata({
        version: 'v1beta',
        auth: this.oauth2Client,
      });

      const response = await analyticsdata.properties.runReport({
        property: `properties/${String(propertyId)}`,
        requestBody: {
          dateRanges: [
            {
              startDate,
              endDate,
            },
          ],
          dimensions: dimensions.map(name => ({ name })),
          metrics: metrics.map(name => ({ name })),
          limit,
        },
      } as any);

      return response.data;
    } catch (error) {
      console.error('❌ Error running GA4 report:', error);
      throw error;
    }
  }

  /**
   * Get top pages
   */
  async getTopPages(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const report = await this.runReport(
        propertyId,
        startDate,
        endDate,
        ['pagePath'],
        ['screenPageViews', 'sessions', 'averageSessionDuration'],
        limit
      );

      return (report.rows || []).map((row: any) => ({
        page: row.dimensionValues[0].value,
        pageviews: parseInt(row.metricValues[0].value || '0'),
        sessions: parseInt(row.metricValues[1].value || '0'),
        avgDuration: parseFloat(row.metricValues[2].value || '0'),
      }));
    } catch (error) {
      console.error('❌ Error fetching top pages:', error);
      throw error;
    }
  }

  /**
   * Get traffic sources
   */
  async getTrafficSources(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const report = await this.runReport(
        propertyId,
        startDate,
        endDate,
        ['sessionSource'],
        ['sessions', 'users', 'bounceRate'],
        limit
      );

      return (report.rows || []).map((row: any) => ({
        source: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value || '0'),
        users: parseInt(row.metricValues[1].value || '0'),
        bounceRate: parseFloat(row.metricValues[2].value || '0'),
      }));
    } catch (error) {
      console.error('❌ Error fetching traffic sources:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  async getSummary(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      const report = await this.runReport(
        propertyId,
        startDate,
        endDate,
        [],
        [
          'sessions',
          'users',
          'newUsers',
          'screenPageViews',
          'averageSessionDuration',
          'bounceRate',
        ]
      );

      const row = report.rows?.[0];
      if (!row) {
        return null;
      }

      return {
        sessions: parseInt(row.metricValues[0].value || '0'),
        users: parseInt(row.metricValues[1].value || '0'),
        newUsers: parseInt(row.metricValues[2].value || '0'),
        pageviews: parseInt(row.metricValues[3].value || '0'),
        avgSessionDuration: parseFloat(row.metricValues[4].value || '0'),
        bounceRate: parseFloat(row.metricValues[5].value || '0'),
      };
    } catch (error) {
      console.error('❌ Error fetching GA4 summary:', error);
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
      console.error('❌ Error refreshing GA4 token:', error);
      throw error;
    }
  }
}
