import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import performance tracker functions (adapted for Deno)
// Since we can't directly import from lib/, we'll implement them inline

interface InstagramMetrics {
  likes: number;
  comments: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  saved?: number;
  shares?: number;
}

interface FacebookMetrics {
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  views?: number;
  clicks?: number;
  impressions?: number;
  engagement?: number;
}

/**
 * Fetch Instagram post metrics using Graph API
 */
async function fetchInstagramMetrics(
  mediaId: string,
  accessToken: string,
  instagramAccountId: string
): Promise<InstagramMetrics> {
  try {
    console.log(`📊 Fetching Instagram metrics for media ID: ${mediaId}`);

    // Get basic metrics (likes, comments)
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

    // Get insights (reach, impressions, saved, shares)
    // Note: Instagram insights may have delays - saves and shares can take hours to update
    let reach: number | undefined = undefined;
    let impressions: number | undefined = undefined;
    let saved: number | undefined = undefined;
    let shares: number | undefined = undefined;

    try {
      // Request insights metrics - saved and shares are only available through insights endpoint
      // Note: Even with correct permissions, Instagram insights can take 24-48 hours to update
      const insightsUrl = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=impressions,reach,engagement,saved,shares&access_token=${accessToken}`;
      console.log(`📊 Fetching Instagram insights (saved & shares require insights endpoint)...`);
      console.log(`📊 URL: ${insightsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
      
      const insightsResponse = await fetch(insightsUrl);
      const responseStatus = insightsResponse.status;
      console.log(`📊 Insights API response status: ${responseStatus}`);
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        
        console.log(`📊 Raw Instagram insights response:`, JSON.stringify(insightsData, null, 2));
        
        if (insightsData.data && Array.isArray(insightsData.data)) {
          console.log(`📊 Found ${insightsData.data.length} insight metrics`);
          
          // Track which metrics we found
          const foundMetrics: string[] = [];
          
          insightsData.data.forEach((metric: any) => {
            const value = metric.values?.[0]?.value || 0;
            const metricName = metric.name;
            foundMetrics.push(metricName);
            
            console.log(`📊 Processing metric: ${metricName} = ${value} (title: ${metric.title || 'N/A'}, description: ${metric.description || 'N/A'})`);
            
            switch (metricName) {
              case 'impressions':
                impressions = value;
                break;
              case 'reach':
                reach = value;
                break;
              case 'saved':
                saved = value;
                console.log(`✅ Found saved metric: ${saved}`);
                break;
              case 'shares':
                shares = value;
                console.log(`✅ Found shares metric: ${shares}`);
                break;
              case 'engagement':
                // Engagement is a combined metric, we calculate our own
                break;
              default:
                console.log(`ℹ️ Unknown metric: ${metricName} = ${value}`);
            }
          });
          
          console.log(`📊 Metrics found in response: ${foundMetrics.join(', ')}`);
          
          // Check if saved/shares were requested but not returned
          if (!foundMetrics.includes('saved')) {
            console.warn(`⚠️ 'saved' metric was requested but not found in response`);
            console.warn(`   This is normal - Instagram may not have processed saves yet (can take 24-48 hours)`);
          }
          if (!foundMetrics.includes('shares')) {
            console.warn(`⚠️ 'shares' metric was requested but not found in response`);
            console.warn(`   This is normal - Instagram may not have processed shares yet (can take 24-48 hours)`);
          }
        } else {
          console.warn(`⚠️ Instagram insights data is not in expected format:`, insightsData);
        }

        console.log(`✅ Insights summary: ${impressions || 0} impressions, ${reach || 0} reach, ${saved !== undefined ? saved : 'N/A (not available yet)'} saved, ${shares !== undefined ? shares : 'N/A (not available yet)'} shares`);
      } else {
        const errorData = await insightsResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        const errorCode = errorData.error?.code;
        const errorType = errorData.error?.type;
        
        console.warn(`⚠️ Instagram insights API error:`, {
          status: responseStatus,
          code: errorCode,
          type: errorType,
          message: errorMessage,
          fullError: errorData
        });
        
        // Check if it's a permission issue
        if (errorCode === 10 || errorCode === 200 || errorMessage.includes('permission') || errorMessage.includes('insights') || errorMessage.includes('OAuthException')) {
          console.warn(`⚠️ Instagram insights permission issue detected`);
          console.warn(`⚠️ Verify that 'instagram_manage_insights' scope is granted and user has re-authenticated`);
        }
        
        // Check if insights aren't available yet (common for new posts)
        if (errorCode === 100 || errorCode === 190 || errorMessage.includes('not available') || errorMessage.includes('too early') || errorMessage.includes('insufficient')) {
          console.warn(`ℹ️ Instagram insights not available yet - this is normal for new posts`);
          console.warn(`ℹ️ Saves and shares typically update within 24-48 hours after posting`);
          console.warn(`ℹ️ Likes and comments are available immediately, but saves/shares require insights processing`);
        }
      }
    } catch (insightsError: any) {
      console.warn('⚠️ Exception while fetching Instagram insights:', insightsError.message);
      console.warn('ℹ️ This is normal if the post is very new or insights are still processing');
      console.warn('ℹ️ Instagram insights (saves/shares) can take 24-48 hours to become available');
    }

    // Calculate engagement rate
    const engagement = impressions && impressions > 0 
      ? Number((((likes + comments) / impressions) * 100).toFixed(2))
      : undefined;

    // Return metrics
    // Note: saved and shares may be undefined if insights aren't available yet
    // Instagram insights can take 24-48 hours to update for new posts
    const metrics = {
      likes,
      comments,
      reach,
      impressions,
      engagement,
      saved: saved !== undefined ? saved : undefined, // Keep undefined if not available (not 0)
      shares: shares !== undefined ? shares : undefined, // Keep undefined if not available (not 0)
    };
    
    console.log(`📊 Final Instagram metrics:`, {
      likes: metrics.likes,
      comments: metrics.comments,
      saved: metrics.saved !== undefined ? metrics.saved : 'Not available yet',
      shares: metrics.shares !== undefined ? metrics.shares : 'Not available yet',
      note: 'Saves and shares may take 24-48 hours to appear in Instagram insights'
    });
    
    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching Instagram metrics:', error);
    throw new Error(`Failed to fetch Instagram metrics: ${error.message}`);
  }
}

/**
 * Fetch Facebook post metrics using Graph API
 */
async function fetchFacebookMetrics(
  postId: string,
  accessToken: string,
  pageId: string
): Promise<FacebookMetrics> {
  try {
    console.log(`📊 Fetching Facebook metrics for post ID: ${postId}`);
    console.log(`📊 Facebook Page ID: ${pageId}`);

    // Try to get post type to determine if we can request shares
    // Note: Photo posts don't have a 'type' field, so if we get an error, it's likely a Photo
    let postType = 'unknown';
    let metricsUrl: string;
    
    try {
      const typeCheckUrl = `https://graph.facebook.com/v18.0/${postId}?fields=type&access_token=${accessToken}`;
      console.log(`📊 Step 1: Checking post type...`);
      
      const typeResponse = await fetch(typeCheckUrl);
      if (typeResponse.ok) {
        const typeData = await typeResponse.json();
        postType = typeData.type || 'unknown';
        console.log(`📊 Post type detected: ${postType}`);
      } else {
        // If we can't get type, check if it's the "type field doesn't exist" error (Photo post) or permissions error
        const errorData = await typeResponse.json().catch(() => ({}));
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || '';
        const errorType = errorData.error?.type || '';
        
        // Check if it's a permissions error (403 or code 200)
        if (typeResponse.status === 403 || errorCode === 200 || errorMessage.includes('Missing Permissions') || errorMessage.includes('permission')) {
          console.error(`❌ PERMISSION ERROR when checking post type`);
          console.error(`   Status: ${typeResponse.status}, Code: ${errorCode}, Type: ${errorType}`);
          console.error(`   Message: ${errorMessage}`);
          console.error(`   The access token does not have 'pages_read_engagement' permission.`);
          console.error(`   Solution: User needs to re-authenticate in Settings → Integrations → Facebook`);
          throw new Error(`Facebook API error: Missing Permissions. The access token was likely generated before 'pages_read_engagement' scope was added. User needs to re-authenticate to get a new token with updated permissions.`);
        }
        
        // Check if this is the specific error for Photo posts (type field doesn't exist)
        if (errorCode === 100 && (errorMessage.includes('nonexisting field (type)') || errorMessage.includes('node type (Photo)'))) {
          console.log(`📊 Post type check: Photo post detected (type field not available for Photo posts)`);
          postType = 'photo'; // It's a Photo post - this is expected behavior
        } else {
          // Some other error occurred
          console.warn(`⚠️ Could not determine post type:`, errorMessage);
          console.warn(`   Error code: ${errorCode}, Type: ${errorType}`);
          // Continue with unknown type - we'll try without shares to be safe
          postType = 'unknown';
        }
      }
    } catch (typeError: any) {
      // If there's an exception, check if it mentions Photo posts
      const errorMessage = typeError.message || '';
      if (errorMessage.includes('nonexisting field (type)') || errorMessage.includes('node type (Photo)')) {
        console.log(`📊 Post type check: Photo post detected via exception (type field not available)`);
        postType = 'photo';
      } else {
        console.warn(`⚠️ Exception while checking post type:`, typeError.message);
        // Continue with unknown type - we'll try without shares to be safe
        postType = 'unknown';
      }
    }
    
    // Step 1: Fetch basic metrics (likes, comments, shares, reactions)
    // Don't include insights here - we'll fetch them separately to avoid failing if scope is missing
    let basicMetricsUrl: string;
    if (postType === 'photo' || postType === 'unknown') {
      // For photo posts or unknown type, don't request shares or reactions
      basicMetricsUrl = `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true)&access_token=${accessToken}`;
      console.log(`📊 Step 2a: Fetching basic metrics for ${postType === 'photo' ? 'photo' : 'unknown type'} post`);
    } else {
      // For non-photo posts, include shares and reactions
      basicMetricsUrl = `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${accessToken}`;
      console.log(`📊 Step 2a: Fetching basic metrics for ${postType} post (includes shares and reactions)`);
    }
    
    console.log(`📊 Fetching basic metrics from Facebook API...`);
    const basicResponse = await fetch(basicMetricsUrl);
    
    if (!basicResponse.ok) {
      const errorData = await basicResponse.json().catch(() => ({}));
      const errorCode = errorData.error?.code;
      const errorMessage = errorData.error?.message || '';
      const errorType = errorData.error?.type || '';
      
      console.error(`❌ Facebook API error (basic metrics):`, {
        status: basicResponse.status,
        code: errorCode,
        type: errorType,
        message: errorMessage,
        fullError: errorData
      });
      
      // Check if it's a permissions error
      if (basicResponse.status === 403 || errorCode === 200 || errorMessage.includes('Missing Permissions') || errorMessage.includes('permission')) {
        console.error(`❌ PERMISSION ERROR DETECTED`);
        console.error(`   The access token does not have the required permissions.`);
        console.error(`   Required scopes: pages_read_engagement, pages_show_list`);
        console.error(`   Solution: User needs to re-authenticate to get a new token with updated scopes.`);
        throw new Error(`Facebook API error: Missing Permissions. The access token was likely generated before scopes were added. User needs to re-authenticate in Settings → Integrations → Facebook to get a new token with updated permissions.`);
      }
      
      throw new Error(`Facebook API error: ${basicResponse.status} - ${errorMessage || 'Failed to fetch basic metrics'}`);
    }
    
    const basicData = await basicResponse.json();
    console.log(`📊 Raw Facebook API response (basic):`, JSON.stringify(basicData, null, 2));
    
    const likes = basicData.likes?.summary?.total_count || basicData.likes?.data?.length || 0;
    const comments = basicData.comments?.summary?.total_count || basicData.comments?.data?.length || 0;
    // Photo posts don't have shares, so default to 0 if not available
    const shares = basicData.shares?.count || 0;
    // Photo posts don't have reactions field, so check if it exists before accessing
    // If reactions not available, use likes as fallback (reactions include likes)
    const reactions = basicData.reactions?.summary?.total_count || likes;
    
    console.log(`✅ Basic metrics extracted: ${likes} likes, ${comments} comments, ${shares} shares, ${reactions} reactions`);
    if (postType === 'photo') {
      console.log(`ℹ️ Photo post: reactions field not available, using likes count (${likes}) as reactions`);
    }

    // Step 2: Try to fetch insights separately (optional - may fail if pages_read_user_content scope is missing)
    let impressions: number | undefined = undefined;
    let engagedUsers: number | undefined = undefined;
    let clicks: number | undefined = undefined;
    
    try {
      const insightsUrl = `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`;
      console.log(`📊 Step 2b: Attempting to fetch insights (optional - requires pages_read_user_content scope)`);
      
      const insightsResponse = await fetch(insightsUrl);
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        console.log(`📊 Insights response:`, JSON.stringify(insightsData, null, 2));
        
        if (insightsData.data && Array.isArray(insightsData.data)) {
          console.log(`📊 Found ${insightsData.data.length} insight metrics`);
          insightsData.data.forEach((insight: any) => {
            const value = insight.values?.[0]?.value || 0;
            console.log(`📊 Processing insight: ${insight.name} = ${value}`);
            
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
        console.log(`✅ Insights fetched successfully: ${impressions || 0} impressions, ${engagedUsers || 0} engaged users, ${clicks || 0} clicks`);
      } else {
        const errorData = await insightsResponse.json().catch(() => ({}));
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || '';
        
        // Check if it's a permission/scope issue
        if (errorCode === 10 || errorCode === 200 || errorMessage.includes('permission') || errorMessage.includes('scope') || errorMessage.includes('pages_read_user_content')) {
          console.warn(`⚠️ Insights not available: Missing 'pages_read_user_content' scope`);
          console.warn(`   Basic metrics (likes, comments, shares, reactions) are still available`);
        } else {
          console.warn(`⚠️ Could not fetch insights:`, errorMessage);
          console.warn(`   Error code: ${errorCode}`);
        }
      }
    } catch (insightsError: any) {
      console.warn(`⚠️ Exception while fetching insights:`, insightsError.message);
      console.warn(`   This is okay - basic metrics are still available`);
    }

    const engagement = impressions && impressions > 0
      ? Number((((likes + comments + shares) / impressions) * 100).toFixed(2))
      : undefined;

    const metrics = {
      likes,
      comments,
      shares,
      reactions,
      views: undefined,
      clicks,
      impressions,
      engagement,
    };
    
    console.log(`📊 Final Facebook metrics:`, metrics);

    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching Facebook metrics:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to fetch Facebook metrics: ${error.message}`);
  }
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Parse request body to check for specific contentStrategyId
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      // Body might be empty, that's okay
    }

    const contentStrategyId = requestBody.contentStrategyId || null;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Starting automatic performance tracking...");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    if (contentStrategyId) {
      console.log(`🎯 Tracking specific content: ${contentStrategyId}`);
    }

    // Build query for published content
    let query = supabase
      .from("published_content")
      .select(`
        id,
        content_strategy_id,
        platform,
        platform_post_id,
        published_at,
        user_id,
        metadata
      `)
      .in("platform", ["instagram", "facebook"])
      .eq("status", "published")
      .not("platform_post_id", "is", null);

    // If contentStrategyId is provided, filter to that specific content
    if (contentStrategyId) {
      query = query.eq("content_strategy_id", contentStrategyId);
    }

    const { data: publishedContent, error: fetchError } = await query;

    if (fetchError) {
      console.error("❌ Error fetching published content:", fetchError);
      throw fetchError;
    }

    if (!publishedContent || publishedContent.length === 0) {
      console.log("ℹ️ No content to track");
      return new Response(
        JSON.stringify({ 
          message: "No content to track", 
          tracked: 0,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

    console.log(`📊 Found ${publishedContent.length} posts to track`);

    let tracked = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    // Process each post
    for (const post of publishedContent) {
      try {
        console.log(`\n📝 Processing ${post.platform} post:`);
        console.log(`   - Published Content ID: ${post.id}`);
        console.log(`   - Content Strategy ID: ${post.content_strategy_id}`);
        console.log(`   - Platform Post ID: ${post.platform_post_id}`);
        console.log(`   - Published At: ${post.published_at}`);

        // Validate platform_post_id exists - try to get it from metadata if missing
        let platformPostId = post.platform_post_id;
        if (!platformPostId && post.metadata) {
          // Try to extract from metadata (for posts published before the fix)
          if (post.platform === "instagram" && post.metadata.instagram?.postId) {
            platformPostId = post.metadata.instagram.postId;
            console.log(`📋 Found Instagram post ID in metadata: ${platformPostId}`);
          } else if (post.platform === "facebook" && post.metadata.facebook?.postId) {
            platformPostId = post.metadata.facebook.postId;
            console.log(`📋 Found Facebook post ID in metadata: ${platformPostId}`);
          }
        }

        if (!platformPostId) {
          console.warn(`⚠️ Skipping ${post.platform} post: platform_post_id is missing`);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: "Missing platform_post_id - post may not have been published correctly",
          });
          errors++;
          continue;
        }

        // Get platform integration (for access token)
        const { data: integration, error: integrationError } = await supabase
          .from("platform_integrations")
          .select("*")
          .eq("user_id", post.user_id)
          .eq("platform", post.platform)
          .eq("status", "connected")
          .maybeSingle();

        if (integrationError || !integration) {
          console.warn(`⚠️ No integration found for ${post.platform} (user: ${post.user_id})`);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: "No integration found",
          });
          errors++;
          continue;
        }

        // Check if token is expired
        if (integration.expires_at) {
          const expiresAt = new Date(integration.expires_at);
          const now = new Date();
          if (expiresAt < now) {
            console.warn(`⚠️ Access token expired for ${post.platform} (user: ${post.user_id})`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "Access token expired",
            });
            errors++;
            continue;
          }
        }

        // Get access token (decrypt if needed - adjust based on your encryption method)
        const accessToken = integration.access_token;

        if (!accessToken) {
          console.warn(`⚠️ No access token for ${post.platform} (user: ${post.user_id})`);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: "No access token",
          });
          errors++;
          continue;
        }

        let metrics: any = {};

        // Fetch metrics based on platform
        if (post.platform === "instagram") {
          const instagramAccountId = integration.metadata?.instagramAccountId || integration.platform_user_id;
          
          if (!instagramAccountId) {
            console.warn(`⚠️ No Instagram account ID found`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "No Instagram account ID",
            });
            errors++;
            continue;
          }

          console.log(`📱 Fetching Instagram metrics for post ID: ${post.platform_post_id}`);
          console.log(`📱 Instagram Account ID: ${instagramAccountId}`);

          const instagramMetrics = await fetchInstagramMetrics(
            platformPostId,
            accessToken,
            instagramAccountId
          );

          console.log(`✅ Instagram metrics fetched:`, {
            likes: instagramMetrics.likes,
            comments: instagramMetrics.comments,
            reach: instagramMetrics.reach,
            impressions: instagramMetrics.impressions,
            engagement: instagramMetrics.engagement,
            saved: instagramMetrics.saved || 0,
            shares: instagramMetrics.shares || 0,
          });

          metrics = {
            engagement: instagramMetrics.engagement,
            traffic: instagramMetrics.impressions || instagramMetrics.reach || 0,
            likes: instagramMetrics.likes,
            comments: instagramMetrics.comments,
            reach: instagramMetrics.reach,
            impressions: instagramMetrics.impressions,
            // Store as 0 if undefined - Instagram insights may take 24-48 hours to update
            saved: instagramMetrics.saved !== undefined ? instagramMetrics.saved : 0,
            shares: instagramMetrics.shares !== undefined ? instagramMetrics.shares : 0,
            lastUpdated: new Date().toISOString(),
          };
          
          if (instagramMetrics.saved === undefined || instagramMetrics.shares === undefined) {
            console.log(`ℹ️ Note: Saves and/or shares are not available yet. Instagram insights can take 24-48 hours to update.`);
            console.log(`   Current values: saved=${instagramMetrics.saved !== undefined ? instagramMetrics.saved : 'N/A'}, shares=${instagramMetrics.shares !== undefined ? instagramMetrics.shares : 'N/A'}`);
          }
          
          console.log(`💾 Saving metrics to database:`, metrics);
        } else if (post.platform === "facebook") {
          const pageId = integration.metadata?.pageId || integration.platform_user_id;
          
          if (!pageId) {
            console.warn(`⚠️ No Facebook page ID found`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "No Facebook page ID",
            });
            errors++;
            continue;
          }

          console.log(`📱 Fetching Facebook metrics for post ID: ${platformPostId}`);
          console.log(`📱 Facebook Page ID: ${pageId}`);

          const facebookMetrics = await fetchFacebookMetrics(
            platformPostId,
            accessToken,
            pageId
          );

          console.log(`✅ Facebook metrics fetched:`, {
            likes: facebookMetrics.likes,
            comments: facebookMetrics.comments,
            shares: facebookMetrics.shares,
            reactions: facebookMetrics.reactions,
            impressions: facebookMetrics.impressions,
            clicks: facebookMetrics.clicks,
            engagement: facebookMetrics.engagement,
          });

          metrics = {
            engagement: facebookMetrics.engagement,
            traffic: facebookMetrics.impressions || facebookMetrics.views || 0,
            likes: facebookMetrics.likes,
            comments: facebookMetrics.comments,
            shares: facebookMetrics.shares,
            reactions: facebookMetrics.reactions,
            clicks: facebookMetrics.clicks,
            impressions: facebookMetrics.impressions,
            lastUpdated: new Date().toISOString(),
          };
          
          console.log(`💾 Saving Facebook metrics to database:`, metrics);
        }

        // Get current content_strategy metadata
        const { data: contentStrategy, error: contentError } = await supabase
          .from("content_strategy")
          .select("metadata")
          .eq("id", post.content_strategy_id)
          .single();

        if (contentError) {
          console.error(`❌ Error fetching content strategy:`, contentError);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: `Content strategy error: ${contentError.message}`,
          });
          errors++;
          continue;
        }

        // Update metadata with performance data
        const currentMetadata = contentStrategy.metadata || {};
        const currentPerformance = currentMetadata.performance || {};
        
        const updatedMetadata = {
          ...currentMetadata,
          performance: {
            ...currentPerformance,
            // Platform-specific metrics
            [post.platform]: {
              ...currentPerformance[post.platform],
              ...metrics,
            },
            // Aggregate values (average across platforms, or use latest)
            engagement: metrics.engagement || currentPerformance.engagement,
            traffic: metrics.traffic || currentPerformance.traffic,
            // Keep existing platform data
            ...Object.keys(currentPerformance)
              .filter(key => key !== post.platform && key !== 'engagement' && key !== 'traffic')
              .reduce((acc, key) => {
                acc[key] = currentPerformance[key];
                return acc;
              }, {} as any),
          },
        };

        // Update content_strategy
        console.log(`💾 Updating content_strategy ${post.content_strategy_id} with metrics:`, {
          platform: post.platform,
          likes: metrics.likes,
          comments: metrics.comments,
          engagement: metrics.engagement,
        });
        
        const { error: updateError } = await supabase
          .from("content_strategy")
          .update({
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.content_strategy_id);

        if (updateError) {
          console.error(`❌ Error updating content strategy:`, updateError);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: `Update error: ${updateError.message}`,
          });
          errors++;
          continue;
        }
        
        console.log(`✅ Successfully updated content_strategy ${post.content_strategy_id} with ${post.platform} metrics`);

        // Create performance snapshot (for history tracking)
        // Note: This table needs to be created via migration
        console.log(`💾 Creating performance snapshot for ${post.platform} post...`);
        console.log(`   Content Strategy ID: ${post.content_strategy_id}`);
        console.log(`   Platform: ${post.platform}`);
        console.log(`   Metrics:`, metrics);
        
        const { error: snapshotError, data: snapshotData } = await supabase
          .from("performance_snapshots")
          .insert({
            content_strategy_id: post.content_strategy_id,
            platform: post.platform,
            snapshot_date: new Date().toISOString(),
            metrics: metrics,
          })
          .select();

        if (snapshotError) {
          // Table might not exist yet, log but don't fail
          console.error(`❌ Could not create snapshot:`, snapshotError);
          console.error(`   Error details:`, {
            message: snapshotError.message,
            code: snapshotError.code,
            details: snapshotError.details,
            hint: snapshotError.hint,
          });
          console.warn(`⚠️ Continuing without snapshot - metrics are still saved in content_strategy metadata`);
        } else {
          console.log(`✅ Created performance snapshot successfully:`, snapshotData);
        }

        tracked++;
        console.log(`✅ Successfully tracked ${post.platform} post ${post.platform_post_id}`);

      } catch (error: any) {
        console.error(`❌ Error tracking post ${post.id}:`, error);
        errorDetails.push({
          postId: post.id,
          platform: post.platform,
          error: error.message || "Unknown error",
        });
        errors++;
      }
    }

    const result = {
      message: "Performance tracking completed",
      tracked,
      errors,
      total: publishedContent.length,
      timestamp: new Date().toISOString(),
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    };

    console.log(`\n✅ Tracking complete: ${tracked} successful, ${errors} errors`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );

  } catch (error: any) {
    console.error("❌ Performance tracking error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );
  }
});

