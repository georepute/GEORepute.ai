/**
 * WordPress.com Integration Service
 * Handles OAuth authentication and blog publishing to WordPress.com sites
 * 
 * Note: This only works with WordPress.com hosted sites, not self-hosted WordPress.org sites
 */

export interface WordPressConfig {
  accessToken: string;
  siteId: string; // WordPress.com site ID or domain
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
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid or expired access token. Please reconnect your WordPress.com account.',
        };
      }
      return {
        success: false,
        error: `Failed to verify connection (${response.status})`,
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
  scopes: string[] = ['posts', 'media'],
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
