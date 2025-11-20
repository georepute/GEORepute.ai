/**
 * Instagram Integration Service
 * Uses Instagram Graph API to publish content to Instagram Business Accounts
 * Note: Requires Instagram Business Account connected to a Facebook Page
 */

export interface InstagramConfig {
  accessToken: string; // Facebook Page Access Token
  pageId: string; // Facebook Page ID
  instagramBusinessAccountId?: string; // Instagram Business Account ID
}

export interface PublishContent {
  title: string;
  content: string;
  tags?: string[];
  metadata?: {
    link?: string; // Optional link (Instagram doesn't support links in posts, but can be in bio)
    imageUrl?: string; // Image URL (required for Instagram posts)
    [key: string]: any;
  };
}

export interface InstagramPublishResult {
  success: boolean;
  url?: string;
  postId?: string;
  error?: string;
}

/**
 * Get Instagram Business Account ID from Facebook Page
 */
async function getInstagramBusinessAccount(
  pageId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Facebook API error: ${response.status} - ${error.error?.message || 'Failed to get Instagram account'}`);
    }

    const data = await response.json();
    return data.instagram_business_account?.id || null;
  } catch (error: any) {
    throw new Error(`Failed to get Instagram Business Account: ${error.message}`);
  }
}

/**
 * Upload image to Instagram (Step 1: Create media container)
 */
async function createMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  try {
    // Download image from URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    // For Instagram, we need to upload the image
    // Since we have a URL, we'll use it directly in the media container
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Instagram API error: ${response.status} - ${error.error?.message || 'Failed to create media container'}`);
    }

    const data = await response.json();
    return data.id; // Returns creation_id
  } catch (error: any) {
    throw new Error(`Failed to create media container: ${error.message}`);
  }
}

/**
 * Publish media to Instagram (Step 2: Publish the container)
 */
async function publishMedia(
  instagramAccountId: string,
  accessToken: string,
  creationId: string
): Promise<{ id: string; permalink?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Instagram API error: ${response.status} - ${error.error?.message || 'Failed to publish media'}`);
    }

    const data = await response.json();
    
    // Get permalink
    let permalink: string | undefined;
    if (data.id) {
      try {
        const mediaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${data.id}?fields=permalink&access_token=${accessToken}`
        );
        if (mediaResponse.ok) {
          const mediaData = await mediaResponse.json();
          permalink = mediaData.permalink;
        }
      } catch (e) {
        // Permalink is optional, continue without it
      }
    }

    return {
      id: data.id,
      permalink,
    };
  } catch (error: any) {
    throw new Error(`Failed to publish media: ${error.message}`);
  }
}

/**
 * Publish content to Instagram using Graph API
 */
export async function publishToInstagram(
  config: InstagramConfig,
  content: PublishContent
): Promise<InstagramPublishResult> {
  try {
    // Validate config
    if (!config.accessToken || !config.pageId) {
      return {
        success: false,
        error: 'Missing Instagram Access Token or Page ID. Please reconnect your Instagram integration.',
      };
    }

    // Get Instagram Business Account ID if not provided
    let instagramAccountId = config.instagramBusinessAccountId;
    if (!instagramAccountId) {
      console.log('🔍 Getting Instagram Business Account ID...');
      instagramAccountId = await getInstagramBusinessAccount(config.pageId, config.accessToken);
      console.log('✅ Got Instagram Account ID:', instagramAccountId);
    }

    if (!instagramAccountId) {
      return {
        success: false,
        error: 'No Instagram Business Account found. Please ensure your Instagram account is connected to your Facebook Page and is a Business account.',
      };
    }

    // Validate image URL (required for Instagram posts)
    if (!content.metadata?.imageUrl) {
      return {
        success: false,
        error: 'Image URL is required for Instagram posts. Please provide an image in the content metadata.',
      };
    }

    // Prepare caption (Instagram doesn't support titles, so combine title and content)
    let caption = '';
    if (content.title && content.title.trim()) {
      caption = `${content.title}\n\n${content.content}`;
    } else {
      caption = content.content;
    }

    // Add hashtags if provided
    if (content.tags && content.tags.length > 0) {
      const hashtags = content.tags.map(tag => `#${tag.replace(/#/g, '').replace(/\s+/g, '')}`).join(' ');
      caption = `${caption}\n\n${hashtags}`;
    }

    // Limit caption to 2200 characters (Instagram limit)
    if (caption.length > 2200) {
      caption = caption.substring(0, 2197) + '...';
    }

    console.log(`📤 Publishing to Instagram for account ${instagramAccountId}...`);

    // Step 1: Create media container
    console.log('📦 Creating media container...');
    const creationId = await createMediaContainer(
      instagramAccountId,
      config.accessToken,
      content.metadata.imageUrl,
      caption
    );

    console.log('✅ Media container created:', creationId);

    // Step 2: Publish the media
    console.log('🚀 Publishing media...');
    const publishResult = await publishMedia(
      instagramAccountId,
      config.accessToken,
      creationId
    );

    console.log('✅ Media published:', publishResult.id);

    // Construct Instagram post URL
    const url = publishResult.permalink || `https://www.instagram.com/p/${publishResult.id}/`;

    return {
      success: true,
      url,
      postId: publishResult.id,
    };
  } catch (error: any) {
    console.error('Instagram publish error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to Instagram',
    };
  }
}

/**
 * Verify Instagram Access Token and get account info
 */
export async function verifyInstagramConfig(
  config: InstagramConfig
): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
  try {
    // Get Instagram Business Account ID if not provided
    let instagramAccountId = config.instagramBusinessAccountId;
    if (!instagramAccountId) {
      instagramAccountId = await getInstagramBusinessAccount(config.pageId, config.accessToken);
    }

    if (!instagramAccountId) {
      return {
        success: false,
        error: 'No Instagram Business Account found. Please ensure your Instagram account is connected to your Facebook Page and is a Business account.',
      };
    }

    // Get Instagram account info
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,account_type&access_token=${config.accessToken}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = error.error?.message || 'Unknown Instagram API error';
      const errorCode = response.status;
      
      if (errorCode === 401) {
        return {
          success: false,
          error: 'Instagram Access Token has expired or is invalid. Please reconnect your Instagram integration.',
        };
      }

      return {
        success: false,
        error: `Instagram API Error (${errorCode}): ${errorMessage}`,
      };
    }

    const accountInfo = await response.json();

    return {
      success: true,
      accountInfo: {
        id: instagramAccountId,
        username: accountInfo.username,
        accountType: accountInfo.account_type,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify Instagram access',
    };
  }
}

