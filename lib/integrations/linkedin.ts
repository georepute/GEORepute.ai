/**
 * LinkedIn Integration Service
 * Uses LinkedIn API v2 to publish content to LinkedIn profiles
 * Note: Posts appear on the authenticated user's LinkedIn profile
 */

export interface LinkedInConfig {
  accessToken: string; // User's LinkedIn Access Token (from OAuth)
  personUrn?: string; // LinkedIn Person URN (e.g., "urn:li:person:123456")
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

export interface LinkedInPublishResult {
  success: boolean;
  url?: string;
  postId?: string;
  error?: string;
}

/**
 * Register media upload with LinkedIn (Step 1 of image upload)
 */
async function registerLinkedInMedia(
  personUrn: string,
  accessToken: string
): Promise<{ asset: string; uploadUrl: string }> {
  try {
    const registerPayload = {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    };

    const response = await fetch(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(registerPayload),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to register media: ${error.message || response.statusText}`
      );
    }

    const result = await response.json();
    const asset = result.value.asset;
    const uploadUrl = result.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;

    return { asset, uploadUrl };
  } catch (error: any) {
    throw new Error(`Failed to register LinkedIn media: ${error.message}`);
  }
}

/**
 * Upload image binary to LinkedIn (Step 2 of image upload)
 */
async function uploadImageToLinkedIn(
  imageUrl: string,
  uploadUrl: string
): Promise<void> {
  try {
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to LinkedIn's upload URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image: ${uploadResponse.status}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to upload image to LinkedIn: ${error.message}`);
  }
}

/**
 * Get LinkedIn Person URN from access token
 */
async function getPersonUrn(accessToken: string): Promise<string> {
  try {
    // Try OpenID Connect userinfo endpoint first (works with openid scope)
    let response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If userinfo fails, try v2/me with projection
    if (!response.ok) {
      response = await fetch('https://api.linkedin.com/v2/me?projection=(id)', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`LinkedIn API error: ${response.status} - ${error.error?.message || error.message || 'Failed to get user info'}`);
    }

    const data = await response.json();
    // LinkedIn returns URN in format "urn:li:person:xxxxx"
    // userinfo uses 'sub', v2/me uses 'id'
    let personUrn = data.sub || data.id || '';
    
    // Ensure Person URN is in correct format
    if (personUrn && !personUrn.startsWith('urn:li:person:')) {
      // If it's just an ID or partial URN, format it correctly
      const personId = personUrn.replace('urn:li:person:', '').trim();
      personUrn = `urn:li:person:${personId}`;
    }
    
    return personUrn;
  } catch (error: any) {
    throw new Error(`Failed to get LinkedIn Person URN: ${error.message}`);
  }
}

/**
 * Publish content to LinkedIn using UGC Posts API
 */
export async function publishToLinkedIn(
  config: LinkedInConfig,
  content: PublishContent
): Promise<LinkedInPublishResult> {
  try {
    // Validate config
    if (!config.accessToken) {
      return {
        success: false,
        error: 'Missing LinkedIn Access Token. Please reconnect your LinkedIn integration.',
      };
    }

    // Get Person URN if not provided
    let personUrn = config.personUrn;
    if (!personUrn) {
      console.log('🔍 Getting LinkedIn Person URN...');
      personUrn = await getPersonUrn(config.accessToken);
      console.log('✅ Got Person URN:', personUrn);
    }

    // Validate and format Person URN
    if (!personUrn || personUrn.trim().length === 0) {
      return {
        success: false,
        error: 'LinkedIn Person URN is missing. Please reconnect your LinkedIn integration.',
      };
    }

    // Trim whitespace
    personUrn = personUrn.trim();

    // Ensure URN is in correct format (urn:li:person:xxxxx)
    if (!personUrn.startsWith('urn:li:person:')) {
      // If it's just an ID, format it as URN
      if (personUrn && !personUrn.includes(':')) {
        personUrn = `urn:li:person:${personUrn}`;
      } else {
        console.error('❌ Invalid LinkedIn Person URN format:', personUrn);
        return {
          success: false,
          error: `Invalid LinkedIn Person URN format. Expected format: urn:li:person:xxxxx. Please reconnect your LinkedIn integration.`,
        };
      }
    }

    // Validate URN has a person ID after the prefix
    const personId = personUrn.replace('urn:li:person:', '').trim();
    if (!personId || personId.length === 0) {
      console.error('❌ LinkedIn Person URN missing person ID:', personUrn);
      return {
        success: false,
        error: 'LinkedIn Person URN is incomplete. Please reconnect your LinkedIn integration.',
      };
    }

    console.log('📋 Using Person URN:', personUrn, '(length:', personUrn.length, ')');

    // Combine title and content for LinkedIn post
    // LinkedIn posts don't have separate title field, so we'll include it in the text
    let shareText = '';
    
    if (content.title && content.title.trim()) {
      shareText = `${content.title}\n\n${content.content}`;
    } else {
      shareText = content.content;
    }

    // Prepare UGC Post payload
    const ugcPost: any = {
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: shareText,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    // Add image if provided (requires upload to LinkedIn first)
    if (content.metadata?.imageUrl) {
      console.log(`🖼️  Uploading image to LinkedIn: ${content.metadata.imageUrl}`);
      
      try {
        // Step 1: Register the upload
        const mediaAsset = await registerLinkedInMedia(personUrn, config.accessToken);
        console.log(`✅ Registered LinkedIn media asset: ${mediaAsset.asset}`);
        
        // Step 2: Upload the image binary
        await uploadImageToLinkedIn(content.metadata.imageUrl, mediaAsset.uploadUrl);
        console.log(`✅ Image uploaded to LinkedIn`);
        
        // Step 3: Use the asset URN in the post
        ugcPost.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        ugcPost.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: content.title || 'Image',
            },
            media: mediaAsset.asset, // LinkedIn media URN
            title: {
              text: content.title || 'Shared Image',
            },
          },
        ];
        console.log(`✅ Image ready for LinkedIn post`);
      } catch (uploadError: any) {
        console.error(`❌ Failed to upload image to LinkedIn:`, uploadError.message);
        // Fall back to text-only post
        console.log(`⚠️  Falling back to text-only post without image`);
      }
    }
    // Add link if provided (only if no image)
    else if (content.metadata?.link) {
      console.log(`🔗 Adding link to LinkedIn post: ${content.metadata.link}`);
      ugcPost.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      ugcPost.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          description: {
            text: shareText,
          },
          originalUrl: content.metadata.link,
          title: {
            text: content.title || 'Shared Link',
          },
        },
      ];
    }

    // Post to LinkedIn using UGC Posts API
    const postType = content.metadata?.imageUrl ? 'Image Post' : 
                     content.metadata?.link ? 'Link Post' : 'Text Post';
    console.log(`📤 Publishing ${postType} to LinkedIn for ${personUrn}...`);
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPost),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle LinkedIn API errors
      const errorMessage = result.message || result.error?.message || 'Unknown LinkedIn API error';
      const errorCode = result.status || response.status;
      
      console.error('LinkedIn API error:', {
        status: response.status,
        code: errorCode,
        message: errorMessage,
        details: result,
      });

      // Provide helpful error messages based on error type
      if (response.status === 401) {
        return {
          success: false,
          error: 'LinkedIn Access Token has expired or is invalid. Please reconnect your LinkedIn integration in Settings.',
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'LinkedIn API permission denied. Please ensure your app has the "w_member_social" permission.',
        };
      }

      return {
        success: false,
        error: `LinkedIn API Error (${errorCode}): ${errorMessage}`,
      };
    }

    // Success - extract post ID
    const postId = result.id;
    
    console.log(`✅ Successfully published to LinkedIn!`);
    console.log(`   Post ID: ${postId}`);
    console.log(`   Type: ${postType}`);
    
    // Construct LinkedIn post URL
    // Format: https://www.linkedin.com/feed/update/{postId}
    // Note: LinkedIn doesn't always return a direct URL, so we'll construct it
    const url = postId 
      ? `https://www.linkedin.com/feed/update/${postId.replace('urn:li:ugcPost:', '')}`
      : undefined;

    console.log(`   URL: ${url}`);

    return {
      success: true,
      url,
      postId,
    };
  } catch (error: any) {
    console.error('LinkedIn publish error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to LinkedIn',
    };
  }
}

/**
 * Verify LinkedIn Access Token and get user info
 */
export async function verifyLinkedInConfig(
  config: LinkedInConfig
): Promise<{ success: boolean; error?: string; userInfo?: any }> {
  try {
    // Get Person URN if not provided
    let personUrn = config.personUrn;
    if (!personUrn) {
      personUrn = await getPersonUrn(config.accessToken);
    }

    // Try OpenID Connect userinfo endpoint first
    let response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    // If userinfo fails, try v2/me with projection
    if (!response.ok) {
      response = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
        },
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errorMessage = error.error?.message || error.message || 'Unknown LinkedIn API error';
      const errorCode = response.status;
      
      if (errorCode === 401) {
        return {
          success: false,
          error: 'LinkedIn Access Token has expired or is invalid. Please reconnect your LinkedIn integration.',
        };
      }

      return {
        success: false,
        error: `LinkedIn API Error (${errorCode}): ${errorMessage}`,
      };
    }

    const userInfo = await response.json();

    // Handle both userinfo and v2/me response formats
    return {
      success: true,
      userInfo: {
        id: userInfo.sub || userInfo.id,
        firstName: userInfo.given_name || userInfo.localizedFirstName,
        lastName: userInfo.family_name || userInfo.localizedLastName,
        name: userInfo.name,
        profilePicture: userInfo.picture || userInfo.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify LinkedIn access',
    };
  }
}

