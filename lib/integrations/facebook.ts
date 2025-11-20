/**
 * Facebook Integration Service
 * Uses Facebook Graph API to publish content to Facebook Pages
 * Note: Can only post to Pages, not personal profiles
 */

export interface FacebookConfig {
  pageAccessToken: string; // Page Access Token (not user access token)
  pageId: string; // Facebook Page ID
}

export interface PublishContent {
  title: string;
  content: string;
  tags?: string[];
  metadata?: {
    link?: string; // Optional link to include in post
    imageUrl?: string; // Optional image URL
    [key: string]: any;
  };
}

export interface FacebookPublishResult {
  success: boolean;
  url?: string;
  postId?: string;
  error?: string;
}

/**
 * Publish content to Facebook Page using Graph API
 */
export async function publishToFacebook(
  config: FacebookConfig,
  content: PublishContent
): Promise<FacebookPublishResult> {
  try {
    // Validate config first
    if (!config.pageAccessToken || !config.pageId) {
      return {
        success: false,
        error: 'Missing Facebook Page Access Token or Page ID. Please reconnect your Facebook integration.',
      };
    }

    // Verify the token is valid and is a Page Access Token before attempting to post
    console.log('🔍 Verifying Facebook Page Access Token before publishing...');
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/${config.pageId}?fields=id,name,access_token&access_token=${config.pageAccessToken}`
    );

    const verifyResult = await verifyResponse.json();

    if (!verifyResponse.ok) {
      const errorMessage = verifyResult.error?.message || 'Unknown Facebook API error';
      const errorCode = verifyResult.error?.code || verifyResponse.status;
      
      console.error('❌ Facebook token verification failed:', {
        status: verifyResponse.status,
        code: errorCode,
        message: errorMessage,
        type: verifyResult.error?.type,
      });

      // Provide helpful error messages based on error type
      if (errorCode === 200 || errorMessage.includes('Cannot call API')) {
        return {
          success: false,
          error: `Invalid or expired Facebook Page Access Token. The token may have expired or is not a valid Page Access Token. Please reconnect your Facebook integration in Settings. Error: ${errorMessage}`,
        };
      }

      if (errorCode === 190) {
        return {
          success: false,
          error: `Facebook Access Token has expired. Please reconnect your Facebook integration in Settings.`,
        };
      }

      return {
        success: false,
        error: `Facebook API Error (${errorCode}): ${errorMessage}. Please check your Facebook integration settings.`,
      };
    }

    console.log('✅ Facebook Page Access Token verified successfully');

    // Combine title and content for Facebook post
    // Facebook posts don't have separate title field, so we'll include it in the message
    let message = '';
    
    if (content.title && content.title.trim()) {
      message = `${content.title}\n\n${content.content}`;
    } else {
      message = content.content;
    }

    // Prepare post data
    const postData: any = {
      message: message,
    };

    // Add link if provided
    if (content.metadata?.link) {
      postData.link = content.metadata.link;
    }

    // Add image if provided (as attachment)
    if (content.metadata?.imageUrl) {
      // For images, we can either:
      // 1. Use the link with og:image (if link is provided)
      // 2. Upload image separately (more complex)
      // For now, if link is provided, Facebook will auto-fetch og:image
      if (!postData.link) {
        postData.link = content.metadata.imageUrl;
      }
    }

    // Post to Facebook Page using Graph API
    console.log(`📤 Publishing to Facebook Page ${config.pageId}...`);
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.pageId}/feed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...postData,
          access_token: config.pageAccessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      // Handle Facebook API errors
      const errorMessage = result.error?.message || result.error || 'Unknown Facebook API error';
      const errorCode = result.error?.code || response.status;
      
      console.error('Facebook API error:', {
        status: response.status,
        code: errorCode,
        message: errorMessage,
        type: result.error?.type,
      });

      // Provide helpful error messages based on error type
      if (errorCode === 200 || errorMessage.includes('Cannot call API')) {
        return {
          success: false,
          error: `Invalid or expired Facebook Page Access Token. The token may have expired or is not a valid Page Access Token. Please reconnect your Facebook integration in Settings. Error: ${errorMessage}`,
        };
      }

      if (errorCode === 190) {
        return {
          success: false,
          error: `Facebook Access Token has expired. Please reconnect your Facebook integration in Settings.`,
        };
      }

      return {
        success: false,
        error: `Facebook API Error (${errorCode}): ${errorMessage}`,
      };
    }

    // Success - extract post ID
    const postId = result.id;
    
    // Construct Facebook post URL
    // Format: https://www.facebook.com/{pageId}/posts/{postId}
    // Or: https://www.facebook.com/{postId}
    const url = postId 
      ? `https://www.facebook.com/${postId.replace('_', '/posts/')}`
      : undefined;

    return {
      success: true,
      url,
      postId,
    };
  } catch (error: any) {
    console.error('Facebook publish error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to Facebook',
    };
  }
}

/**
 * Verify Facebook Page Access Token and get page info
 */
export async function verifyFacebookConfig(
  config: FacebookConfig
): Promise<{ success: boolean; error?: string; pageInfo?: any }> {
  try {
    // Verify token and get page info
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.pageId}?fields=id,name,access_token&access_token=${config.pageAccessToken}`
    );

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error?.message || result.error || 'Unknown Facebook API error';
      const errorCode = result.error?.code || response.status;
      
      return {
        success: false,
        error: `Facebook API Error (${errorCode}): ${errorMessage}`,
      };
    }

    // Verify the page ID matches
    if (result.id !== config.pageId) {
      return {
        success: false,
        error: 'Page ID mismatch. Please verify your Page ID and Access Token.',
      };
    }

    return {
      success: true,
      pageInfo: {
        id: result.id,
        name: result.name,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify Facebook access',
    };
  }
}

/**
 * Get list of pages user manages (helper function)
 * Requires User Access Token with pages_show_list permission
 */
export async function getUserPages(
  userAccessToken: string
): Promise<{ success: boolean; pages?: any[]; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`
    );

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error?.message || result.error || 'Unknown Facebook API error';
      return {
        success: false,
        error: `Facebook API Error: ${errorMessage}`,
      };
    }

    return {
      success: true,
      pages: result.data || [],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get user pages',
    };
  }
}

