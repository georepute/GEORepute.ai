/**
 * WordPress Integration Service
 * Supports both:
 * 1. WordPress.com (OAuth authentication)
 * 2. Self-hosted WordPress (Application Passwords authentication)
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * WordPress.com configuration (OAuth)
 */
export interface WordPressConfig {
  accessToken: string;
  siteId: string; // WordPress.com site ID or domain
}

/**
 * Self-hosted WordPress configuration (Application Passwords)
 */
export interface SelfHostedWordPressConfig {
  siteUrl: string;      // e.g., "https://example.com"
  username: string;     // WordPress username
  applicationPassword: string; // Application password (not regular password)
}

/**
 * Unified WordPress configuration that works with both types
 */
export interface UnifiedWordPressConfig {
  type: 'wordpress_com' | 'self_hosted';
  // WordPress.com specific
  accessToken?: string;
  siteId?: string;
  // Self-hosted specific
  siteUrl?: string;
  username?: string;
  applicationPassword?: string;
}

export interface WordPressSite {
  ID: number;
  name: string;
  description: string;
  URL: string;
  jetpack: boolean;
  is_private: boolean;
  visible: boolean;
  is_coming_soon: boolean;
  icon?: {
    img: string;
    ico: string;
  };
}

export interface WordPressPost {
  ID?: number;
  title: string;
  content: string;
  excerpt?: string;
  status?: 'publish' | 'draft' | 'pending' | 'private' | 'future';
  date?: string;
  categories?: string[];
  tags?: string[];
  featured_image?: string;
  format?: 'standard' | 'aside' | 'chat' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio';
  slug?: string;
  author?: number;
  publicize?: boolean;
}

export interface WordPressPublishResult {
  success: boolean;
  url?: string;
  postId?: number;
  siteId?: string;
  error?: string;
}

const WORDPRESS_API_BASE = 'https://public-api.wordpress.com';

/**
 * Get WordPress.com REST API URL
 */
function getApiUrl(endpoint: string, version: string = 'v1.1'): string {
  return `${WORDPRESS_API_BASE}/rest/${version}${endpoint}`;
}

/**
 * Get current user's WordPress.com sites
 */
export async function getWordPressSites(accessToken: string): Promise<{
  success: boolean;
  sites?: WordPressSite[];
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl('/me/sites'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress get sites error:', response.status, errorData);
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Unauthorized. Please reconnect your WordPress.com account.',
        };
      }
      
      return {
        success: false,
        error: errorData.message || `Failed to fetch sites (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      sites: data.sites || [],
    };
  } catch (error: any) {
    console.error('WordPress get sites error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch WordPress sites',
    };
  }
}

/**
 * Get a specific site's information
 */
export async function getWordPressSite(config: WordPressConfig): Promise<{
  success: boolean;
  site?: WordPressSite;
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl(`/sites/${config.siteId}`), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress get site error:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `Failed to fetch site (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      site: data,
    };
  } catch (error: any) {
    console.error('WordPress get site error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch WordPress site',
    };
  }
}

/**
 * Get posts from a WordPress.com site
 */
export async function getWordPressPosts(
  config: WordPressConfig,
  options: { number?: number; status?: string } = {}
): Promise<{
  success: boolean;
  posts?: any[];
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (options.number) params.append('number', options.number.toString());
    if (options.status) params.append('status', options.status);

    const url = getApiUrl(`/sites/${config.siteId}/posts?${params.toString()}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress get posts error:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `Failed to fetch posts (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      posts: data.posts || [],
    };
  } catch (error: any) {
    console.error('WordPress get posts error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch WordPress posts',
    };
  }
}

/**
 * Publish a post to WordPress.com
 */
export async function publishToWordPress(
  config: WordPressConfig,
  post: WordPressPost
): Promise<WordPressPublishResult> {
  try {
    const url = getApiUrl(`/sites/${config.siteId}/posts/new`);
    
    const postPayload: any = {
      title: post.title,
      content: post.content,
      status: post.status || 'publish',
    };

    // Add optional fields
    if (post.excerpt) postPayload.excerpt = post.excerpt;
    if (post.date) postPayload.date = post.date;
    if (post.categories && post.categories.length > 0) {
      postPayload.categories = post.categories.join(',');
    }
    if (post.tags && post.tags.length > 0) {
      postPayload.tags = post.tags.join(',');
    }
    if (post.featured_image) postPayload.featured_image = post.featured_image;
    if (post.format) postPayload.format = post.format;
    if (post.slug) postPayload.slug = post.slug;
    if (post.publicize !== undefined) postPayload.publicize = post.publicize;

    console.log('Publishing post to WordPress.com:', {
      siteId: config.siteId,
      title: post.title,
      status: post.status,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress publish error:', response.status, errorData);
      
      return {
        success: false,
        error: errorData.message || `Failed to publish post (${response.status})`,
      };
    }

    const data = await response.json();

    console.log('Successfully published to WordPress.com:', {
      postId: data.ID,
      url: data.URL,
    });

    return {
      success: true,
      url: data.URL,
      postId: data.ID,
      siteId: config.siteId,
    };
  } catch (error: any) {
    console.error('WordPress publish error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to WordPress.com',
    };
  }
}

/**
 * Update an existing post on WordPress.com
 */
export async function updateWordPressPost(
  config: WordPressConfig,
  postId: number,
  updates: Partial<WordPressPost>
): Promise<WordPressPublishResult> {
  try {
    const url = getApiUrl(`/sites/${config.siteId}/posts/${postId}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress update post error:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `Failed to update post (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.URL,
      postId: data.ID,
      siteId: config.siteId,
    };
  } catch (error: any) {
    console.error('WordPress update error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update WordPress post',
    };
  }
}

/**
 * Delete a post from WordPress.com
 */
export async function deleteWordPressPost(
  config: WordPressConfig,
  postId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = getApiUrl(`/sites/${config.siteId}/posts/${postId}/delete`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to delete post (${response.status})`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete WordPress post',
    };
  }
}

/**
 * Verify WordPress.com connection is valid
 */
export async function verifyWordPressConnection(accessToken: string): Promise<{
  success: boolean;
  user?: {
    ID: number;
    display_name: string;
    username: string;
    email: string;
    avatar_URL: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl('/me'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Try to get error details from response
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress.com /me API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid or expired access token. Please reconnect your WordPress.com account.',
        };
      }
      
      if (response.status === 403) {
        // 403 usually means the app needs approval or scope issues
        const errorMessage = errorData.message || errorData.error || '';
        if (errorMessage.includes('not approved') || errorMessage.includes('approval')) {
          return {
            success: false,
            error: 'WordPress.com app needs approval. Please submit your app for review at developer.wordpress.com',
          };
        }
        return {
          success: false,
          error: `Access denied (403). ${errorMessage || 'Your WordPress.com app may need approval or additional permissions.'}`,
        };
      }
      
      return {
        success: false,
        error: `Failed to verify connection (${response.status}): ${errorData.message || errorData.error || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      user: {
        ID: data.ID,
        display_name: data.display_name,
        username: data.username,
        email: data.email,
        avatar_URL: data.avatar_URL,
      },
    };
  } catch (error: any) {
    console.error('WordPress.com verification exception:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify WordPress.com connection',
    };
  }
}

// ============================================================================
// OAuth Helper Functions
// ============================================================================

/**
 * Generate WordPress.com OAuth authorization URL
 */
export function generateWordPressAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[] = ['auth', 'posts', 'media', 'sites'],
  blog?: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state: state,
  });

  // If a specific blog is requested
  if (blog) {
    params.append('blog', blog);
  }

  return `https://public-api.wordpress.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeWordPressCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<{
  success: boolean;
  accessToken?: string;
  blogId?: string;
  blogUrl?: string;
  tokenType?: string;
  error?: string;
}> {
  try {
    const response = await fetch('https://public-api.wordpress.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress token exchange error:', response.status, errorData);
      return {
        success: false,
        error: errorData.error_description || errorData.error || 'Failed to exchange authorization code',
      };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      blogId: data.blog_id,
      blogUrl: data.blog_url,
      tokenType: data.token_type,
    };
  } catch (error: any) {
    console.error('WordPress token exchange error:', error);
    return {
      success: false,
      error: error.message || 'Failed to exchange authorization code',
    };
  }
}

/**
 * Get categories from a WordPress.com site
 */
export async function getWordPressCategories(config: WordPressConfig): Promise<{
  success: boolean;
  categories?: Array<{ ID: number; name: string; slug: string; post_count: number }>;
  error?: string;
}> {
  try {
    const response = await fetch(getApiUrl(`/sites/${config.siteId}/categories`), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to fetch categories (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      categories: data.categories || [],
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch WordPress categories',
    };
  }
}

/**
 * Upload media to WordPress.com
 */
export async function uploadWordPressMedia(
  config: WordPressConfig,
  file: { name: string; type: string; data: ArrayBuffer | Blob }
): Promise<{
  success: boolean;
  media?: { ID: number; URL: string; guid: string };
  error?: string;
}> {
  try {
    const formData = new FormData();
    const blobData = file.data instanceof Blob ? file.data : new Blob([file.data], { type: file.type });
    formData.append('media[]', blobData, file.name);

    const response = await fetch(getApiUrl(`/sites/${config.siteId}/media/new`), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to upload media (${response.status})`,
      };
    }

    const data = await response.json();
    const media = data.media?.[0];
    
    return {
      success: true,
      media: media ? {
        ID: media.ID,
        URL: media.URL,
        guid: media.guid,
      } : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload WordPress media',
    };
  }
}

// ============================================================================
// Self-Hosted WordPress Functions (Application Passwords)
// ============================================================================

/**
 * Get Basic Auth header for self-hosted WordPress
 */
function getSelfHostedAuthHeader(username: string, applicationPassword: string): string {
  const credentials = Buffer.from(`${username}:${applicationPassword}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Normalize site URL (ensure it has protocol and no trailing slash)
 */
function normalizeSiteUrl(url: string): string {
  let normalized = url.trim();
  
  // Add https:// if no protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');
  
  return normalized;
}

/**
 * Verify self-hosted WordPress connection using Application Password
 */
export async function verifySelfHostedWordPressConnection(config: SelfHostedWordPressConfig): Promise<{
  success: boolean;
  user?: {
    id: number;
    name: string;
    username: string;
    email?: string;
    avatar_urls?: { [key: string]: string };
  };
  siteInfo?: {
    name: string;
    description: string;
    url: string;
    home: string;
  };
  error?: string;
}> {
  try {
    const siteUrl = normalizeSiteUrl(config.siteUrl);
    const authHeader = getSelfHostedAuthHeader(config.username, config.applicationPassword);

    // First, verify the connection by getting current user info
    const userResponse = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json().catch(() => ({}));
      console.error('Self-hosted WordPress auth error:', userResponse.status, errorData);
      
      if (userResponse.status === 401) {
        return {
          success: false,
          error: 'Invalid username or application password. Please check your credentials.',
        };
      }
      
      if (userResponse.status === 403) {
        return {
          success: false,
          error: 'Access forbidden. Make sure the Application Password has the correct permissions.',
        };
      }
      
      if (userResponse.status === 404) {
        return {
          success: false,
          error: 'WordPress REST API not found. Make sure the site URL is correct and REST API is enabled.',
        };
      }
      
      return {
        success: false,
        error: errorData.message || `Connection failed (${userResponse.status})`,
      };
    }

    const userData = await userResponse.json();

    // Get site info
    let siteInfo = null;
    try {
      const siteResponse = await fetch(`${siteUrl}/wp-json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (siteResponse.ok) {
        siteInfo = await siteResponse.json();
      }
    } catch (e) {
      // Site info is optional, continue without it
      console.warn('Could not fetch site info:', e);
    }

    return {
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        username: userData.slug,
        email: userData.email,
        avatar_urls: userData.avatar_urls,
      },
      siteInfo: siteInfo ? {
        name: siteInfo.name,
        description: siteInfo.description,
        url: siteInfo.url,
        home: siteInfo.home,
      } : undefined,
    };
  } catch (error: any) {
    console.error('Self-hosted WordPress verification error:', error);
    
    // Check for common network errors
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      return {
        success: false,
        error: 'Site not found. Please check the URL is correct.',
      };
    }
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: 'Connection refused. The site may be down or blocking connections.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to verify self-hosted WordPress connection',
    };
  }
}

/**
 * Publish a post to self-hosted WordPress using Application Password
 */
export async function publishToSelfHostedWordPress(
  config: SelfHostedWordPressConfig,
  post: WordPressPost
): Promise<WordPressPublishResult> {
  try {
    const siteUrl = normalizeSiteUrl(config.siteUrl);
    const authHeader = getSelfHostedAuthHeader(config.username, config.applicationPassword);

    // Build the post payload for WordPress REST API
    const postPayload: any = {
      title: post.title,
      content: post.content,
      status: post.status || 'publish',
    };

    // Add optional fields
    if (post.excerpt) postPayload.excerpt = post.excerpt;
    if (post.date) postPayload.date = post.date;
    if (post.slug) postPayload.slug = post.slug;
    
    // Tags need to be tag IDs in self-hosted WP, but we can pass names and let WP create them
    if (post.tags && post.tags.length > 0) {
      // For self-hosted WP, we need to get/create tag IDs or use tag names if REST API supports it
      postPayload.tags = []; // We'll handle tags separately
    }
    
    // Categories need to be category IDs
    if (post.categories && post.categories.length > 0) {
      postPayload.categories = []; // We'll handle categories separately
    }

    console.log('Publishing post to self-hosted WordPress:', {
      siteUrl,
      title: post.title,
      status: post.status,
    });

    const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Self-hosted WordPress publish error:', response.status, errorData);
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check your Application Password.',
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          error: 'Permission denied. Your user may not have permission to create posts.',
        };
      }
      
      return {
        success: false,
        error: errorData.message || `Failed to publish post (${response.status})`,
      };
    }

    const data = await response.json();

    console.log('Successfully published to self-hosted WordPress:', {
      postId: data.id,
      url: data.link,
    });

    // Handle tags after post creation (if any)
    if (post.tags && post.tags.length > 0) {
      try {
        await addTagsToSelfHostedPost(config, data.id, post.tags);
      } catch (tagError) {
        console.warn('Failed to add tags to post:', tagError);
      }
    }

    return {
      success: true,
      url: data.link,
      postId: data.id,
      siteId: siteUrl,
    };
  } catch (error: any) {
    console.error('Self-hosted WordPress publish error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to self-hosted WordPress',
    };
  }
}

/**
 * Add tags to a self-hosted WordPress post
 */
async function addTagsToSelfHostedPost(
  config: SelfHostedWordPressConfig,
  postId: number,
  tagNames: string[]
): Promise<void> {
  const siteUrl = normalizeSiteUrl(config.siteUrl);
  const authHeader = getSelfHostedAuthHeader(config.username, config.applicationPassword);
  
  const tagIds: number[] = [];
  
  for (const tagName of tagNames) {
    // First, try to find existing tag
    const searchResponse = await fetch(
      `${siteUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (searchResponse.ok) {
      const existingTags = await searchResponse.json();
      const exactMatch = existingTags.find((t: any) => 
        t.name.toLowerCase() === tagName.toLowerCase()
      );
      
      if (exactMatch) {
        tagIds.push(exactMatch.id);
        continue;
      }
    }
    
    // Create new tag if not found
    const createResponse = await fetch(`${siteUrl}/wp-json/wp/v2/tags`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: tagName }),
    });
    
    if (createResponse.ok) {
      const newTag = await createResponse.json();
      tagIds.push(newTag.id);
    }
  }
  
  // Update post with tag IDs
  if (tagIds.length > 0) {
    await fetch(`${siteUrl}/wp-json/wp/v2/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: tagIds }),
    });
  }
}

/**
 * Get posts from self-hosted WordPress
 */
export async function getSelfHostedWordPressPosts(
  config: SelfHostedWordPressConfig,
  options: { per_page?: number; status?: string } = {}
): Promise<{
  success: boolean;
  posts?: any[];
  error?: string;
}> {
  try {
    const siteUrl = normalizeSiteUrl(config.siteUrl);
    const authHeader = getSelfHostedAuthHeader(config.username, config.applicationPassword);
    
    const params = new URLSearchParams();
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.status) params.append('status', options.status);
    
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to fetch posts (${response.status})`,
      };
    }

    const posts = await response.json();
    return {
      success: true,
      posts,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch self-hosted WordPress posts',
    };
  }
}

/**
 * Update a post on self-hosted WordPress
 */
export async function updateSelfHostedWordPressPost(
  config: SelfHostedWordPressConfig,
  postId: number,
  updates: Partial<WordPressPost>
): Promise<WordPressPublishResult> {
  try {
    const siteUrl = normalizeSiteUrl(config.siteUrl);
    const authHeader = getSelfHostedAuthHeader(config.username, config.applicationPassword);
    
    const updatePayload: any = {};
    if (updates.title) updatePayload.title = updates.title;
    if (updates.content) updatePayload.content = updates.content;
    if (updates.excerpt) updatePayload.excerpt = updates.excerpt;
    if (updates.status) updatePayload.status = updates.status;
    if (updates.slug) updatePayload.slug = updates.slug;
    
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to update post (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.link,
      postId: data.id,
      siteId: siteUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update self-hosted WordPress post',
    };
  }
}

/**
 * Delete a post from self-hosted WordPress
 */
export async function deleteSelfHostedWordPressPost(
  config: SelfHostedWordPressConfig,
  postId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const siteUrl = normalizeSiteUrl(config.siteUrl);
    const authHeader = getSelfHostedAuthHeader(config.username, config.applicationPassword);
    
    const response = await fetch(`${siteUrl}/wp-json/wp/v2/posts/${postId}?force=true`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to delete post (${response.status})`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete self-hosted WordPress post',
    };
  }
}

// ============================================================================
// Unified Publishing Function (Works with both WordPress.com and Self-Hosted)
// ============================================================================

/**
 * Publish to WordPress - automatically detects type and uses appropriate method
 */
export async function publishToWordPressUnified(
  config: UnifiedWordPressConfig,
  post: WordPressPost
): Promise<WordPressPublishResult> {
  if (config.type === 'self_hosted') {
    if (!config.siteUrl || !config.username || !config.applicationPassword) {
      return {
        success: false,
        error: 'Missing self-hosted WordPress credentials (siteUrl, username, or applicationPassword)',
      };
    }
    
    return publishToSelfHostedWordPress({
      siteUrl: config.siteUrl,
      username: config.username,
      applicationPassword: config.applicationPassword,
    }, post);
  } else {
    // WordPress.com
    if (!config.accessToken || !config.siteId) {
      return {
        success: false,
        error: 'Missing WordPress.com credentials (accessToken or siteId)',
      };
    }
    
    return publishToWordPress({
      accessToken: config.accessToken,
      siteId: config.siteId,
    }, post);
  }
}
