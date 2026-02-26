/**
 * Shared Google Ads Keyword Ideas API
 * Fetches CPC and metrics for keywords via generateKeywordIdeas.
 * Used by: keyword-forecast, opportunity-blind-spots report
 */

export interface KeywordCpcResult {
  keyword: string;
  avgCpc: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cost?: number;
}

/**
 * Get CPC and metrics for keywords using Google Ads generateKeywordIdeas API
 */
export async function getKeywordCpcFromGoogleAds(
  accessToken: string,
  developerToken: string,
  customerId: string,
  keywords: string[]
): Promise<KeywordCpcResult[]> {
  const results: KeywordCpcResult[] = [];

  for (const keyword of keywords) {
    try {
      const response = await fetch(
        `https://googleads.googleapis.com/v23/customers/${customerId}:generateKeywordIdeas`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
            'login-customer-id': customerId,
          },
          body: JSON.stringify({
            keywordSeed: { keywords: [keyword] },
            geoTargetConstants: ['geoTargetConstants/2840'],
            language: 'languageConstants/1000',
            keywordPlanNetwork: 'GOOGLE_SEARCH',
            includeAdultKeywords: false,
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Google Ads: failed for "${keyword}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data.results || [];
      const result = items.find((r: { text?: string }) =>
        r.text?.toLowerCase() === keyword.toLowerCase()
      ) || items[0];

      if (!result) continue;

      const metrics = result.keywordIdeaMetrics || {};
      const avgMonthlySearches = parseInt(metrics.avgMonthlySearches) || 0;
      const lowBidMicros = parseFloat(metrics.lowTopOfPageBidMicros) || 1000000;
      const highBidMicros = parseFloat(metrics.highTopOfPageBidMicros) || 2000000;
      const avgCpc = (lowBidMicros + highBidMicros) / 2 / 1000000;

      const estimatedImpressions = Math.round(avgMonthlySearches * 0.8);
      const estimatedCtr = (metrics.competition === 'HIGH' ? 0.05 :
        metrics.competition === 'MEDIUM' ? 0.035 : 0.025) as number;
      const estimatedClicks = Math.round(estimatedImpressions * estimatedCtr);
      const cost = estimatedClicks * avgCpc;

      results.push({
        keyword,
        avgCpc: parseFloat(avgCpc.toFixed(2)),
        impressions: estimatedImpressions,
        clicks: estimatedClicks,
        ctr: estimatedCtr,
        cost: parseFloat(cost.toFixed(2)),
      });
    } catch (err) {
      console.warn(`Google Ads: error for "${keyword}":`, err);
    }
  }

  return results;
}
