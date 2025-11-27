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

    let response;
    let endpoint;

    // Check if we have an image to post
    if (content.metadata?.imageUrl) {
      // Use /photos endpoint to post as actual photo (not link preview)
      console.log(`📤 Publishing photo to Facebook Page ${config.pageId}...`);
      console.log(`🖼️ Image URL: ${content.metadata.imageUrl}`);
      
      endpoint = `https://graph.facebook.com/v18.0/${config.pageId}/photos`;
      
      const photoData: any = {
        url: content.metadata.imageUrl, // Direct image URL
        caption: message, // Post text as caption
        access_token: config.pageAccessToken,
      };

      // Add link if provided (will be included in caption)
      if (content.metadata?.link) {
        // Facebook doesn't support separate links in photo posts
        // We'll append it to the caption instead
        photoData.caption = `${message}\n\n🔗 ${content.metadata.link}`;
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(photoData),
      });
    } else {
      // No image - use /feed endpoint for text post
      console.log(`📤 Publishing text post to Facebook Page ${config.pageId}...`);
      
      endpoint = `https://graph.facebook.com/v18.0/${config.pageId}/feed`;
      
    const postData: any = {
      message: message,
        access_token: config.pageAccessToken,
    };

      // Add link if provided (will show as link preview)
    if (content.metadata?.link) {
      postData.link = content.metadata.link;
    }

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
    }

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
    const postId = result.id || result.post_id;
    
    console.log(`✅ Successfully published to Facebook!`);
    console.log(`   Post ID: ${postId}`);
    console.log(`   Type: ${content.metadata?.imageUrl ? 'Photo Post' : 'Text Post'}`);
    
    // Construct Facebook post URL
    // For photo posts, the ID format is: {page-id}_{photo-id}
    // For regular posts: {page-id}_{post-id}
    // URL format: https://www.facebook.com/{page-id}/posts/{post-id}
    const url = postId 
      ? `https://www.facebook.com/${postId.replace('_', '/posts/')}`
      : undefined;

    console.log(`   URL: ${url}`);

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
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🔍 FACEBOOK PAGE ACCESS DIAGNOSTIC                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    // First, check what permissions this token has
    console.log('📋 Step 1: Checking token permissions...');
    try {
      const permUrl = `https://graph.facebook.com/v18.0/me/permissions?access_token=${userAccessToken}`;
      const permResponse = await fetch(permUrl);
      const permData = await permResponse.json();
      
      if (permData.data) {
        const granted = permData.data.filter((p: any) => p.status === 'granted');
        const declined = permData.data.filter((p: any) => p.status === 'declined');
        
        console.log(`   ✅ Granted permissions (${granted.length}):`);
        granted.forEach((p: any) => console.log(`      - ${p.permission}`));
        
        if (declined.length > 0) {
          console.log(`   ❌ Declined permissions (${declined.length}):`);
          declined.forEach((p: any) => console.log(`      - ${p.permission}`));
        }
        
        const hasPagesShowList = granted.some((p: any) => p.permission === 'pages_show_list');
        if (!hasPagesShowList) {
          console.error('\n   ❌ CRITICAL: pages_show_list permission is MISSING!');
          console.error('   User may have clicked "Skip" or "Don\'t Allow" during OAuth');
        }
      }
    } catch (permError) {
      console.warn('   ⚠️ Could not check permissions:', permError);
    }
    
    // Get user info
    console.log('\n📋 Step 2: Getting user account info...');
    try {
      const userUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${userAccessToken}`;
      const userResponse = await fetch(userUrl);
      const userData = await userResponse.json();
      
      console.log(`   User ID: ${userData.id}`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Email: ${userData.email || 'N/A'}`);
    } catch (userError) {
      console.warn('   ⚠️ Could not get user info:', userError);
    }
    
    // Now try to get pages
    console.log('\n📋 Step 3: Fetching Pages from /me/accounts...');
    let apiUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category&access_token=${userAccessToken}`;
    console.log('   API URL:', apiUrl.replace(userAccessToken, '***TOKEN***'));
    
    let response = await fetch(apiUrl);
    let result = await response.json();
    console.log('   Response:', JSON.stringify(result, null, 2));
    
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
    console.log(`✅ Found ${pages.length} personal Facebook page(s)`);

    // Step 4: Check for Business Portfolio Pages (if business_management permission granted)
    console.log('\n📋 Step 4: Checking for Business Portfolio Pages...');
    let businessPages: any[] = [];
    
    try {
      const permUrl = `https://graph.facebook.com/v18.0/me/permissions?access_token=${userAccessToken}`;
      const permResponse = await fetch(permUrl);
      const permData = await permResponse.json();
      const hasBusinessManagement = permData.data?.some((p: any) => 
        p.permission === 'business_management' && p.status === 'granted'
      );
      
      if (hasBusinessManagement) {
        console.log('   ✅ business_management permission granted - fetching Business Pages...');
        
        // Get user's businesses
        const businessesUrl = `https://graph.facebook.com/v18.0/me/businesses?fields=id,name&access_token=${userAccessToken}`;
        const businessesResponse = await fetch(businessesUrl);
        const businessesData = await businessesResponse.json();
        
        if (businessesData.data && businessesData.data.length > 0) {
          console.log(`   📊 Found ${businessesData.data.length} Business Portfolio(s)`);
          
          // Fetch pages from each business
          for (const business of businessesData.data) {
            console.log(`   🔍 Fetching pages from Business: ${business.name} (${business.id})`);
            
            const businessPagesUrl = `https://graph.facebook.com/v18.0/${business.id}/owned_pages?fields=id,name,access_token,category&access_token=${userAccessToken}`;
            const businessPagesResponse = await fetch(businessPagesUrl);
            const businessPagesData = await businessPagesResponse.json();
            
            if (businessPagesData.data && businessPagesData.data.length > 0) {
              console.log(`   ✅ Found ${businessPagesData.data.length} page(s) in ${business.name}`);
              businessPages.push(...businessPagesData.data);
            } else {
              console.log(`   ℹ️  No pages found in ${business.name}`);
            }
          }
        } else {
          console.log('   ℹ️  No Business Portfolios found');
        }
      } else {
        console.log('   ℹ️  business_management permission not granted - skipping Business Pages');
      }
    } catch (businessError: any) {
      console.warn('   ⚠️  Error fetching Business Pages:', businessError.message);
    }
    
    // Combine personal and business pages
    const allPages = [...pages, ...businessPages];
    console.log(`\n📊 TOTAL PAGES: ${allPages.length} (${pages.length} personal + ${businessPages.length} business)`);

    if (allPages.length === 0) {
      console.error('\n╔═══════════════════════════════════════════════════════════╗');
      console.error('║  ❌ ZERO PAGES FOUND - SOMETHING CHANGED                 ║');
      console.error('╚═══════════════════════════════════════════════════════════╝');
      console.error('\n🔍 WHAT COULD HAVE CHANGED:');
      console.error('   1. ❌ Account was REMOVED as Admin from the Page');
      console.error('   2. ❌ Page was UNPUBLISHED or DELETED');
      console.error('   3. ❌ User REVOKED app permissions');
      console.error('   4. ❌ Logging in with DIFFERENT account than before');
      console.error('   5. ❌ Facebook changed Page settings/visibility');
      console.error('\n💡 TO DEBUG:');
      console.error('   A. Log into facebook.com with the SAME account you used before');
      console.error('   B. Go to: https://www.facebook.com/pages/');
      console.error('   C. Do you see YOUR Page listed?');
      console.error('      ✅ YES → Check your role (must be Admin, not Editor)');
      console.error('      ❌ NO  → Someone removed you OR you\'re using wrong account');
      console.error('\n   D. If Page is there but role changed:');
      console.error('      → Have Page owner make you Admin again');
      console.error('\n   E. If using different account than before:');
      console.error('      → Use the ORIGINAL account that worked');
      console.error('\n   F. Check Page status:');
      console.error('      → Page Settings → General → Page Visibility');
      console.error('      → Must be "Page published"');
      console.error('\n🧪 QUICK TEST:');
      console.error('   - Graph API Explorer: https://developers.facebook.com/tools/explorer/');
      console.error('   - Query: me/accounts');
      console.error('   - If empty → No Admin access to any Page');
      console.error('   - If has data → Permission issue in your app');
      console.error('╚═══════════════════════════════════════════════════════════╝\n');
      
      return {
        success: false,
        error: 'No Facebook Pages found. This account does not have Admin access to any personal Pages or Business Portfolio Pages. Either create a personal Page at facebook.com/pages/create, or ensure you have Admin access to a Page in your Business Portfolio.',
      };
    }

    return {
      success: true,
      pages: allPages,
    };
  } catch (error: any) {
    console.error('❌ Exception getting user pages:', error);
    return {
      success: false,
      error: error.message || 'Failed to get user pages',
    };
  }
}

