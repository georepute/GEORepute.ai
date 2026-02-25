/**
 * Google Business Profile Integration Service
 * Handles OAuth authentication and data fetching from GBP API
 */

import { google } from 'googleapis';

export interface GBPConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GoogleBusinessProfileService {
  private oauth2Client;

  constructor(config: GBPConfig) {
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
   * Execute an API call with rate-limit awareness:
   * disables the built-in gaxios retry for 429s (which is too aggressive)
   * and does a single manual retry after a longer wait.
   */
  private async withRateLimitRetry<T>(
    fn: () => Promise<T>,
    label: string,
    retryDelayMs = 10_000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.code === 429 || err?.status === 429 || err?.response?.status === 429;
      if (!is429) throw err;

      console.warn(`⏳ ${label}: rate-limited (429). Waiting ${retryDelayMs / 1000}s before retry…`);
      await sleep(retryDelayMs);

      return await fn();
    }
  }

  /**
   * Get list of locations for this user
   */
  async getLocations(): Promise<any[]> {
    try {
      const mybusiness = google.mybusinessaccountmanagement({
        version: 'v1',
        auth: this.oauth2Client,
        retryConfig: { retry: 0 },
      } as any);

      const accountsResponse = await this.withRateLimitRetry(
        () => mybusiness.accounts.list(),
        'accounts.list',
      );
      const accounts = accountsResponse.data.accounts || [];

      if (accounts.length === 0) {
        return [];
      }

      const locations: any[] = [];
      for (const account of accounts) {
        try {
          await sleep(1000);

          const mybusinessInfo = google.mybusinessbusinessinformation({
            version: 'v1',
            auth: this.oauth2Client,
            retryConfig: { retry: 0 },
          } as any);

          const locationsResponse = await this.withRateLimitRetry(
            () => mybusinessInfo.accounts.locations.list({
              parent: account.name,
              readMask: 'name,title,categories,storefrontAddress,phoneNumbers,websiteUri,regularHours',
            } as any),
            `locations.list(${account.name})`,
          );

          const accountLocations = locationsResponse.data.locations || [];
          locations.push(...accountLocations.map((loc: any) => ({
            accountId: account.name,
            accountName: account.accountName,
            locationId: loc.name,
            locationName: loc.title,
            address: loc.storefrontAddress,
            phone: loc.phoneNumbers?.[0]?.phoneNumber,
            website: loc.websiteUri,
            categories: loc.categories?.map((c: any) => c.displayName),
            hours: loc.regularHours,
          })));
        } catch (error: any) {
          console.error(`Error fetching locations for account ${account.name}:`, error?.message || error);
        }
      }

      return locations;
    } catch (error) {
      console.error('❌ Error fetching GBP locations:', error);
      throw error;
    }
  }

  /**
   * Get location insights
   */
  async getLocationInsights(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      // TODO: Implement with correct Google Business Profile API client
      // The googleapis package may not have direct support for insights API
      // This may need to use REST API calls directly or a different client
      const mybusiness = (google as any).mybusiness?.({
        version: 'v4',
        auth: this.oauth2Client,
      });

      if (!mybusiness) {
        console.warn('⚠️ Google Business Profile insights API not available');
        return {};
      }

      const response = await mybusiness.accounts.locations.reportInsights({
        name: locationId,
        requestBody: {
          locationNames: [locationId],
          basicRequest: {
            metricRequests: [
              { metric: 'QUERIES_DIRECT' },
              { metric: 'QUERIES_INDIRECT' },
              { metric: 'VIEWS_MAPS' },
              { metric: 'VIEWS_SEARCH' },
              { metric: 'ACTIONS_WEBSITE' },
              { metric: 'ACTIONS_PHONE' },
              { metric: 'ACTIONS_DRIVING_DIRECTIONS' },
            ],
            timeRange: {
              startTime: `${startDate}T00:00:00Z`,
              endTime: `${endDate}T23:59:59Z`,
            },
          },
        },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching GBP insights:', error);
      throw error;
    }
  }

  /**
   * Get reviews
   */
  async getReviews(locationId: string): Promise<any[]> {
    try {
      // TODO: Implement with correct Google Business Profile API client
      // The googleapis package may not have direct support for reviews API
      // This may need to use REST API calls directly or a different client
      const mybusiness = (google as any).mybusiness?.({
        version: 'v4',
        auth: this.oauth2Client,
      });

      if (!mybusiness) {
        console.warn('⚠️ Google Business Profile reviews API not available');
        return [];
      }

      const response = await mybusiness.accounts.locations.reviews.list({
        name: locationId,
        pageSize: 50,
      });

      return (response.data.reviews || []).map((review: any) => ({
        id: review.reviewId,
        reviewer: review.reviewer?.displayName,
        rating: review.starRating,
        comment: review.comment,
        createTime: review.createTime,
        updateTime: review.updateTime,
        reply: review.reply?.comment,
      }));
    } catch (error) {
      console.error('❌ Error fetching GBP reviews:', error);
      throw error;
    }
  }

  /**
   * Get location metrics summary
   */
  async getMetricsSummary(
    locationId: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      const insights = await this.getLocationInsights(locationId, startDate, endDate);
      const reviews = await this.getReviews(locationId);

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0;

      return {
        insights,
        reviews: {
          total: reviews.length,
          averageRating: avgRating,
          recent: reviews.slice(0, 10),
        },
      };
    } catch (error) {
      console.error('❌ Error fetching GBP metrics:', error);
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
      console.error('❌ Error refreshing GBP token:', error);
      throw error;
    }
  }
}
