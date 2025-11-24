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
    console.log('🔍 Fetching user pages from Facebook API...');
    
    // Try multiple endpoints to get pages
    // Method 1: /me/accounts (standard way)
    let apiUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category&access_token=${userAccessToken}`;
    console.log('📡 Trying /me/accounts endpoint...');
    console.log('📡 API URL (without token):', apiUrl.replace(userAccessToken, '***TOKEN***'));
    
    let response = await fetch(apiUrl);
    let result = await response.json();
    console.log('📥 /me/accounts Response:', JSON.stringify(result, null, 2));
    
    // If no pages found, try alternative method
    if (!result.data || result.data.length === 0) {
      console.log('⚠️ No pages from /me/accounts, trying /me?fields=accounts...');
      
      // Method 2: Get user info first, then pages
      const userInfoUrl = `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${userAccessToken}`;
      const userInfoResponse = await fetch(userInfoUrl);
      const userInfo = await userInfoResponse.json();
      console.log('👤 User info:', JSON.stringify(userInfo, null, 2));
      
      // Method 3: Try with different fields
      apiUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,perms&access_token=${userAccessToken}`;
      console.log('📡 Trying /me/accounts with extended fields...');
      response = await fetch(apiUrl);
      result = await response.json();
      console.log('📥 Extended fields Response:', JSON.stringify(result, null, 2));
    }

    if (!response.ok) {
      const errorMessage = result.error?.message || result.error || 'Unknown Facebook API error';
      const errorCode = result.error?.code || response.status;
      const errorType = result.error?.type || 'Unknown';
      
      console.error('❌ Facebook API error getting pages:', {
        status: response.status,
        code: errorCode,
        type: errorType,
        message: errorMessage,
      });

      // Provide helpful error messages
      if (errorCode === 200 || errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        return {
          success: false,
          error: `Missing permission: pages_show_list. Please grant this permission when authorizing the app. Error: ${errorMessage}`,
        };
      }

      if (errorCode === 190) {
        return {
          success: false,
          error: `Access token expired or invalid. Please reconnect your account.`,
        };
      }

      return {
        success: false,
        error: `Facebook API Error (${errorCode}): ${errorMessage}`,
      };
    }

    const pages = result.data || [];
    console.log(`✅ Found ${pages.length} Facebook page(s)`);

    if (pages.length === 0) {
      // Provide more helpful error message
      return {
        success: false,
        error: 'No Facebook Pages found. Possible reasons: 1) You don\'t have admin access to any Pages, 2) The Page is in a different Facebook account, 3) The Page needs to be reconnected. Please verify: a) You are Admin of the Facebook Page, b) The Page exists and is published, c) You\'re logged in with the correct Facebook account that owns the Page.',
      };
    }

    return {
      success: true,
      pages: pages,
    };
  } catch (error: any) {
    console.error('❌ Exception getting user pages:', error);
    return {
      success: false,
      error: error.message || 'Failed to get user pages',
    };
  }
}

