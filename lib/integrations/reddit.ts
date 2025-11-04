/**
 * Reddit Integration Service
 * Handles auto-publishing content to Reddit posts
 */

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string; // Use access token directly instead of refresh token
  username?: string;
}

export interface PublishContent {
  title: string;
  content: string;
  subreddit: string;
  kind?: "self" | "link"; // "self" for text posts, "link" for URL posts
  url?: string; // Required if kind is "link"
}

export interface RedditPublishResult {
  success: boolean;
  url?: string;
  postId?: string;
  error?: string;
}

/**
 * Get Reddit access token - use directly from config
 * Note: Access tokens expire after ~1 hour, so you'll need to get a new one periodically
 */
async function getAccessToken(config: RedditConfig): Promise<string> {
  // Validate inputs
  if (!config.accessToken) {
    throw new Error("Missing required Reddit access token");
  }

  // Return the access token directly (no refresh needed)
  const trimmedToken = config.accessToken.trim();
  
  if (!trimmedToken) {
    throw new Error("Access token cannot be empty");
  }

  return trimmedToken;
}

/**
 * Publish content to Reddit
 */
export async function publishToReddit(
  config: RedditConfig,
  content: PublishContent
): Promise<RedditPublishResult> {
  try {
    // Get access token
    const accessToken = await getAccessToken(config);

    // Prepare post data
    const postData = new URLSearchParams({
      title: content.title,
      sr: content.subreddit,
      kind: content.kind || "self",
      text: content.content,
      ...(content.kind === "link" && content.url ? { url: content.url } : {}),
      api_type: "json",
    });

    // Submit post to Reddit
    const userAgent = `web:GeoRepute.ai:1.0.0 (by /u/georepute)`;
    const response = await fetch("https://oauth.reddit.com/api/submit", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: postData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Reddit API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    console.log("Reddit API response:", JSON.stringify(data, null, 2));

    if (data.json?.errors && data.json.errors.length > 0) {
      const errorMessage = data.json.errors.map((e: any[]) => e.join(": ")).join(", ");
      return {
        success: false,
        error: errorMessage,
      };
    }

    if (data.json?.data?.name) {
      const postId = data.json.data.name;
      const permalink = data.json.data.permalink;
      
      // Construct URL from permalink if available, otherwise from post ID
      let postUrl: string;
      if (permalink) {
        // Ensure permalink starts with / (Reddit sometimes returns it without)
        const cleanPermalink = permalink.startsWith("/") ? permalink : `/${permalink}`;
        postUrl = `https://www.reddit.com${cleanPermalink}`;
      } else {
        // Fallback: construct URL from post ID
        // Post ID format is "t3_xxxxx", we need to extract the ID part
        const postIdClean = postId.replace("t3_", "");
        postUrl = `https://www.reddit.com/r/${content.subreddit}/comments/${postIdClean}`;
        console.warn("Reddit permalink missing, constructed URL from post ID:", postUrl);
      }

      console.log("Reddit post created successfully:", {
        postId,
        permalink,
        url: postUrl,
      });

      return {
        success: true,
        url: postUrl,
        postId: postId.replace("t3_", ""), // Remove Reddit's "t3_" prefix
      };
    }

    console.error("Reddit API response missing post data:", data);
    return {
      success: false,
      error: "Unknown error: No post ID returned from Reddit. Response: " + JSON.stringify(data),
    };
  } catch (error: any) {
    console.error("Reddit publish error:", error);
    return {
      success: false,
      error: error.message || "Unknown error publishing to Reddit",
    };
  }
}

/**
 * Verify Reddit configuration and access
 */
export async function verifyRedditConfig(
  config: RedditConfig
): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    // Validate inputs first
    if (!config.accessToken) {
      return {
        success: false,
        error: "Missing required access token",
      };
    }

    // Check if access token looks valid (should not be empty and have reasonable length)
    const trimmedToken = config.accessToken.trim();
    if (trimmedToken.length < 20) {
      return {
        success: false,
        error: "Invalid access token format. Please ensure you copied the full access token.",
      };
    }

    const accessToken = await getAccessToken(config);
    
    // Verify token by getting user info
    const userAgent = `web:GeoRepute.ai:1.0.0 (by /u/georepute)`;
    const response = await fetch("https://oauth.reddit.com/api/v1/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": userAgent,
      },
    });

    if (!response.ok) {
      let errorMessage = `Reddit API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error("Reddit API error details:", errorData);
      } catch (parseError) {
        const errorText = await response.text();
        errorMessage += ` - ${errorText}`;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    const user = await response.json();
    return { success: true, user };
  } catch (error: any) {
    console.error("Reddit verification error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify Reddit access",
    };
  }
}

