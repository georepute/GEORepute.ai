/**
 * Performance Tracker Service
 * Fetches live engagement metrics from Instagram and Facebook APIs
 */

export interface InstagramMetrics {
  likes: number;
  comments: number;
  reach?: number;
  impressions?: number;
  engagement?: number; // Calculated: (likes + comments) / impressions * 100
  saved?: number;
  shares?: number;
}

export interface FacebookMetrics {
  likes: number;
  comments: number;
  shares: number;
  reactions: number; // Total reactions (like, love, wow, etc.)
  views?: number; // Video views (if video post)
  clicks?: number; // Link clicks (if link post)
  impressions?: number;
  engagement?: number; // Calculated: (likes + comments + shares) / impressions * 100
}

/**
 * Fetch Instagram post metrics using Graph API
 * 
 * @param mediaId - Instagram Media ID (from platform_post_id)
 * @param accessToken - Facebook Page Access Token
 * @param instagramAccountId - Instagram Business Account ID
 * @returns Instagram metrics (likes, comments, reach, impressions, etc.)
 */
export async function fetchInstagramMetrics(
  mediaId: string,
  accessToken: string,
  instagramAccountId: string
): Promise<InstagramMetrics> {
  try {
    console.log(`📊 Fetching Instagram metrics for media ID: ${mediaId}`);

    // Get basic metrics (likes, comments) - always available
    const basicMetricsUrl = `https://graph.facebook.com/v18.0/${mediaId}?fields=like_count,comments_count&access_token=${accessToken}`;
    
    const basicResponse = await fetch(basicMetricsUrl);
    if (!basicResponse.ok) {
      const errorData = await basicResponse.json().catch(() => ({}));
      throw new Error(`Instagram API error: ${basicResponse.status} - ${errorData.error?.message || 'Failed to fetch basic metrics'}`);
    }
    
    const basicData = await basicResponse.json();
    const likes = basicData.like_count || 0;
    const comments = basicData.comments_count || 0;

    console.log(`✅ Basic metrics: ${likes} likes, ${comments} comments`);

    // Get insights (reach, impressions) - requires instagram_manage_insights permission
    // Note: Insights might not be available immediately after posting (can take a few hours)
    let reach: number | undefined = undefined;
    let impressions: number | undefined = undefined;
    let saved: number | undefined = undefined;
    let shares: number | undefined = undefined;

    try {
      const insightsUrl = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=impressions,reach,engagement,saved,shares&access_token=${accessToken}`;
      const insightsResponse = await fetch(insightsUrl);
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        
        // Parse insights (they come as array of metric objects)
        if (insightsData.data && Array.isArray(insightsData.data)) {
          insightsData.data.forEach((metric: any) => {
            const value = metric.values?.[0]?.value || 0;
            
            switch (metric.name) {
              case 'impressions':
                impressions = value;
                break;
              case 'reach':
                reach = value;
                break;
              case 'saved':
                saved = value;
                break;
              case 'shares':
                shares = value;
                break;
              case 'engagement':
                // Engagement metric includes likes, comments, shares, saves combined
                // We already have likes and comments separately, so we can use this for total engagement
                break;
            }
          });
        }

        console.log(`✅ Insights: ${impressions || 0} impressions, ${reach || 0} reach`);
      } else {
        // Insights might not be available (permissions, timing, etc.)
        const errorData = await insightsResponse.json().catch(() => ({}));
        console.warn(`⚠️ Could not fetch Instagram insights: ${errorData.error?.message || 'Unknown error'}`);
        console.warn(`   This is normal if the post is very new or insights permission is not granted`);
      }
    } catch (insightsError: any) {
      // Insights might not be available immediately or require permissions
      console.warn('⚠️ Could not fetch Instagram insights:', insightsError.message);
      console.warn('   This is normal if the post is very new or insights permission is not granted');
    }

    // Calculate engagement rate (if we have impressions)
    const engagement = impressions && impressions > 0 
      ? Number((((likes + comments) / impressions) * 100).toFixed(2))
      : undefined;

    const metrics: InstagramMetrics = {
      likes,
      comments,
      reach,
      impressions,
      engagement,
      saved,
      shares,
    };

    console.log(`✅ Instagram metrics fetched successfully:`, {
      likes,
      comments,
      impressions: impressions || 'N/A',
      reach: reach || 'N/A',
      engagement: engagement ? `${engagement}%` : 'N/A',
    });

    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching Instagram metrics:', error);
    throw new Error(`Failed to fetch Instagram metrics: ${error.message}`);
  }
}

/**
 * Fetch Facebook post metrics using Graph API
 * 
 * @param postId - Facebook Post ID (from platform_post_id)
 * @param accessToken - Facebook Page Access Token
 * @param pageId - Facebook Page ID
 * @returns Facebook metrics (likes, comments, shares, reactions, etc.)
 */
export async function fetchFacebookMetrics(
  postId: string,
  accessToken: string,
  pageId: string
): Promise<FacebookMetrics> {
  try {
    console.log(`📊 Fetching Facebook metrics for post ID: ${postId}`);

    // Get post metrics with insights
    // Note: Facebook requires different fields for different post types
    // Photo posts don't support 'shares' field, so we'll fetch it conditionally
    let metricsUrl = `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),reactions.summary(true),type&access_token=${accessToken}`;
    
    // First, get post type to determine if we can request shares
    const typeResponse = await fetch(metricsUrl);
    if (!typeResponse.ok) {
      const errorData = await typeResponse.json().catch(() => ({}));
      throw new Error(`Facebook API error: ${typeResponse.status} - ${errorData.error?.message || 'Failed to fetch metrics'}`);
    }
    
    const typeData = await typeResponse.json();
    const postType = typeData.type || 'unknown';
    
    // Photo posts don't have 'shares' field, so only request it for non-photo posts
    // Also request insights if available
    if (postType !== 'photo') {
      metricsUrl = `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_engaged_users,post_clicks)&access_token=${accessToken}`;
    } else {
      // For photo posts, don't request shares, but still try insights
      metricsUrl = `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),reactions.summary(true),insights.metric(post_impressions,post_engaged_users,post_clicks)&access_token=${accessToken}`;
    }
    
    const response = await fetch(metricsUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Facebook API error: ${response.status} - ${errorData.error?.message || 'Failed to fetch metrics'}`);
    }
    
    const data = await response.json();
    
    // Extract basic metrics
    const likes = data.likes?.summary?.total_count || data.likes?.data?.length || 0;
    const comments = data.comments?.summary?.total_count || data.comments?.data?.length || 0;
    // Photo posts don't have shares, so default to 0 if not available
    const shares = data.shares?.count || 0;
    const reactions = data.reactions?.summary?.total_count || likes; // Fallback to likes if reactions not available
    
    console.log(`✅ Basic metrics: ${likes} likes, ${comments} comments, ${shares} shares, ${reactions} reactions`);

    // Parse insights
    let impressions: number | undefined = undefined;
    let engagedUsers: number | undefined = undefined;
    let clicks: number | undefined = undefined;
    
    if (data.insights?.data && Array.isArray(data.insights.data)) {
      data.insights.data.forEach((insight: any) => {
        const value = insight.values?.[0]?.value || 0;
        
        switch (insight.name) {
          case 'post_impressions':
            impressions = value;
            break;
          case 'post_engaged_users':
            engagedUsers = value;
            break;
          case 'post_clicks':
            clicks = value;
            break;
        }
      });
    }

    console.log(`✅ Insights: ${impressions || 0} impressions, ${engagedUsers || 0} engaged users, ${clicks || 0} clicks`);

    // Calculate engagement rate (if we have impressions)
    const engagement = impressions && impressions > 0
      ? Number((((likes + comments + shares) / impressions) * 100).toFixed(2))
      : undefined;

    const metrics: FacebookMetrics = {
      likes,
      comments,
      shares,
      reactions,
      views: undefined, // Video views would need separate API call with video-specific fields
      clicks,
      impressions,
      engagement,
    };

    console.log(`✅ Facebook metrics fetched successfully:`, {
      likes,
      comments,
      shares,
      reactions,
      impressions: impressions || 'N/A',
      engagement: engagement ? `${engagement}%` : 'N/A',
    });

    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching Facebook metrics:', error);
    throw new Error(`Failed to fetch Facebook metrics: ${error.message}`);
  }
}

/**
 * Helper function to check if metrics are available for a post
 * Some metrics might not be available immediately after posting
 */
export function areMetricsAvailable(metrics: InstagramMetrics | FacebookMetrics): boolean {
  if ('impressions' in metrics) {
    return metrics.impressions !== undefined && metrics.impressions > 0;
  }
  return false;
}

