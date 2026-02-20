/**
 * WordPress Integration Service
 * WordPress.com (OAuth authentication) only.
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
  /** URL (will be uploaded) or attachment ID */
  featured_image?: string | number;
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
 * Upload media from URLs to WordPress.com (sideload).
 * Returns array of uploaded media objects with ID and URL.
 */
export async function uploadWordPressMediaFromUrls(
  config: WordPressConfig,
  urls: string[]
): Promise<{ success: boolean; media?: Array<{ ID: number; URL: string }>; error?: string }> {
  if (!urls.length) {
    return { success: true, media: [] };
  }
  try {
    const mediaUrl = getApiUrl(`/sites/${config.siteId}/media/new`);
    // WordPress.com API accepts form-urlencoded media_urls (array)
    const body = new URLSearchParams();
    urls.forEach((u) => body.append('media_urls[]', u));

    const response = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress media upload error:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `Failed to upload media (${response.status})`,
      };
    }

    const data = await response.json();
    const media = Array.isArray(data.media) ? data.media : (data.media ? [data.media] : []);
    const mediaErrors = data.media_errors || data.errors;
    if (mediaErrors && mediaErrors.length > 0) {
      console.warn('WordPress media upload partial errors:', mediaErrors);
    }
    return {
      success: true,
      media: media.map((m: any) => ({ ID: m.ID, URL: m.URL || m.guid || '' })),
    };
  } catch (error: any) {
    console.error('WordPress media upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload media to WordPress.com',
    };
  }
}

/** One image source extracted from HTML (exact string + type for upload). */
type ExtractedImage = { raw: string; type: 'http' | 'data' };

/**
 * Extract all img src values from HTML in document order (both http(s) and data URLs).
 * Editor-inserted images are often data URLs (base64); WordPress needs them uploaded.
 */
function extractImageSourcesFromHtml(html: string): ExtractedImage[] {
  const items: ExtractedImage[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) !== null) {
    const raw = m[1];
    if (!raw || raw.trim().length === 0) continue;
    if (/^https?:\/\//i.test(raw)) {
      items.push({ raw, type: 'http' });
    } else if (/^data:image\/[^;]+;base64,/i.test(raw)) {
      items.push({ raw, type: 'data' });
    }
  }
  return items;
}

/** Replace the first occurrence of `search` in `str` with `replace`. */
function replaceFirst(str: string, search: string, replace: string): string {
  const i = str.indexOf(search);
  return i === -1 ? str : str.slice(0, i) + replace + str.slice(i + search.length);
}

/**
 * Upload image buffers (e.g. from data URLs) to WordPress.com via multipart/form-data.
 */
async function uploadWordPressMediaFromBuffers(
  config: WordPressConfig,
  files: Array<{ buffer: Buffer; filename: string; mimeType: string }>
): Promise<{ success: boolean; media?: Array<{ ID: number; URL: string }>; error?: string }> {
  if (!files.length) {
    return { success: true, media: [] };
  }
  try {
    const mediaUrl = getApiUrl(`/sites/${config.siteId}/media/new`);
    const form = new FormData();
    files.forEach((f) => {
      const blobPart = new Uint8Array(f.buffer);
      form.append('media[]', new Blob([blobPart], { type: f.mimeType }), f.filename);
    });

    const response = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WordPress media upload (buffers) error:', response.status, errorData);
      return {
        success: false,
        error: errorData.message || `Failed to upload media (${response.status})`,
      };
    }

    const data = await response.json();
    const media = Array.isArray(data.media) ? data.media : (data.media ? [data.media] : []);
    return {
      success: true,
      media: media.map((m: any) => ({ ID: m.ID, URL: m.URL || m.guid || '' })),
    };
  } catch (error: any) {
    console.error('WordPress media upload (buffers) error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload media to WordPress.com',
    };
  }
}

/**
 * Publish a post to WordPress.com.
 * featured_image can be a URL (will be uploaded and set as featured image) or an attachment ID (number).
 * Content img src (both http URLs and data URLs from the editor) are uploaded and replaced so images display.
 */
export async function publishToWordPress(
  config: WordPressConfig,
  post: WordPressPost
): Promise<WordPressPublishResult> {
  try {
    let content = post.content || '';
    let featuredImageId: number | string | undefined;

    // Resolve featured_image: if it's a URL, upload and get attachment ID
    if (post.featured_image) {
      if (typeof post.featured_image === 'number') {
        featuredImageId = post.featured_image;
      } else if (typeof post.featured_image === 'string' && /^https?:\/\//i.test(post.featured_image)) {
        const upload = await uploadWordPressMediaFromUrls(config, [post.featured_image]);
        if (upload.success && upload.media && upload.media.length > 0) {
          featuredImageId = upload.media[0].ID;
        } else {
          console.warn('WordPress featured image upload failed:', upload.error);
        }
      } else {
        featuredImageId = post.featured_image;
      }
    }

    // Upload in-content images (editor-inserted: both http URLs and data URLs) and replace so they display
    const extracted = extractImageSourcesFromHtml(content);
    if (extracted.length > 0) {
      const httpItems = extracted.filter((x) => x.type === 'http');
      const dataItems = extracted.filter((x) => x.type === 'data');

      const httpUrls = httpItems.map((x) => x.raw);
      let mediaHttp: Array<{ ID: number; URL: string }> = [];
      if (httpUrls.length > 0) {
        const upload = await uploadWordPressMediaFromUrls(config, httpUrls);
        if (upload.success && upload.media) mediaHttp = upload.media;
      }

      let mediaData: Array<{ ID: number; URL: string }> = [];
      if (dataItems.length > 0) {
        const files: Array<{ buffer: Buffer; filename: string; mimeType: string }> = [];
        for (const item of dataItems) {
          const match = item.raw.match(/^data:image\/(\w+);base64,(.+)$/i);
          if (match) {
            const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
            const mimeType = `image/${match[1]}`;
            const buffer = Buffer.from(match[2], 'base64');
            files.push({
              buffer,
              filename: `inline-${Date.now()}-${files.length}.${ext}`,
              mimeType,
            });
          }
        }
        if (files.length > 0) {
          const upload = await uploadWordPressMediaFromBuffers(config, files);
          if (upload.success && upload.media) mediaData = upload.media;
        }
      }

      let httpIdx = 0;
      let dataIdx = 0;
      for (const item of extracted) {
        const newUrl = item.type === 'http'
          ? (mediaHttp[httpIdx++]?.URL)
          : (mediaData[dataIdx++]?.URL);
        if (newUrl) {
          content = replaceFirst(content, item.raw, newUrl);
        }
      }
    }

    const url = getApiUrl(`/sites/${config.siteId}/posts/new`);
    const postPayload: any = {
      title: post.title,
      content,
      status: post.status || 'publish',
    };

    if (post.excerpt) postPayload.excerpt = post.excerpt;
    if (post.date) postPayload.date = post.date;
    if (post.categories && post.categories.length > 0) {
      postPayload.categories = post.categories.join(',');
    }
    if (post.tags && post.tags.length > 0) {
      postPayload.tags = post.tags.join(',');
    }
    if (featuredImageId !== undefined) postPayload.featured_image = String(featuredImageId);
    if (post.format) postPayload.format = post.format;
    if (post.slug) postPayload.slug = post.slug;
    if (post.publicize !== undefined) postPayload.publicize = post.publicize;

    console.log('Publishing post to WordPress.com:', {
      siteId: config.siteId,
      title: post.title,
      status: post.status,
      hasFeaturedImage: !!featuredImageId,
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

// ============================================================================
// Self-Hosted WordPress (Application Passwords)
// ============================================================================

export interface SelfHostedWordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

/**
 * Normalize site URL: ensure https://, no trailing slash
 */
export function normalizeSelfHostedSiteUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  u = u.replace(/^http:\/\//i, 'https://');
  u = u.replace(/\/+$/, '');
  return u;
}

/**
 * Get self-hosted WordPress REST API base URL
 */
function getSelfHostedApiBase(siteUrl: string): string {
  const normalized = normalizeSelfHostedSiteUrl(siteUrl);
  return `${normalized}/wp-json/wp/v2`;
}

/**
 * Verify self-hosted WordPress connection via Application Passwords.
 * Uses GET /wp-json/wp/v2/users/me with HTTP Basic Auth.
 */
export async function verifySelfHostedWordPress(config: SelfHostedWordPressConfig): Promise<{
  success: boolean;
  user?: { id: number; name: string; slug: string };
  error?: string;
}> {
  try {
    const base = getSelfHostedApiBase(config.siteUrl);
    const credentials = Buffer.from(
      `${config.username}:${config.applicationPassword}`,
      'utf8'
    ).toString('base64');

    const response = await fetch(`${base}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.message || errorData.code || response.statusText;

      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid username or Application Password. Please check your credentials.',
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          error: 'REST API not found. Ensure your WordPress site supports REST API (WordPress 4.7+).',
        };
      }

      return {
        success: false,
        error: msg || `Verification failed (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      user: {
        id: data.id,
        name: data.name || data.slug || config.username,
        slug: data.slug || config.username,
      },
    };
  } catch (error: any) {
    console.error('Self-hosted WordPress verification error:', error);
    const msg = error?.cause?.code === 'ECONNREFUSED' || error?.message?.includes('fetch')
      ? 'Could not reach the site. Check the URL and ensure it is publicly accessible.'
      : error.message || 'Failed to verify connection';
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Publish a post to self-hosted WordPress via REST API.
 */
export async function publishToSelfHostedWordPress(
  config: SelfHostedWordPressConfig,
  post: WordPressPost
): Promise<WordPressPublishResult> {
  try {
    const base = getSelfHostedApiBase(config.siteUrl);
    const credentials = Buffer.from(
      `${config.username}:${config.applicationPassword}`,
      'utf8'
    ).toString('base64');

    const postPayload: Record<string, unknown> = {
      title: post.title,
      content: post.content || '',
      status: post.status || 'publish',
    };
    if (post.excerpt) postPayload.excerpt = post.excerpt;
    if (post.date) postPayload.date = post.date;
    if (post.slug) postPayload.slug = post.slug;
    // Self-hosted REST API accepts category/tag names as strings (they get created/matched automatically)
    if (post.categories && post.categories.length > 0) {
      postPayload.categories = post.categories;
    }
    if (post.tags && post.tags.length > 0) {
      postPayload.tags = post.tags;
    }

    // Featured image: upload via media endpoint if URL
    if (post.featured_image && typeof post.featured_image === 'string' && /^https?:\/\//i.test(post.featured_image)) {
      const mediaRes = await fetch(`${base.replace('/wp/v2', '')}/wp/v2/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Disposition': `attachment; filename="featured.jpg"`,
        },
        body: await fetch(post.featured_image).then(r => r.blob()),
      });
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        if (mediaData.id) postPayload.featured_media = mediaData.id;
      }
    } else if (typeof post.featured_image === 'number') {
      postPayload.featured_media = post.featured_image;
    }

    const response = await fetch(`${base}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Failed to publish (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.link || data.guid?.rendered,
      postId: data.id,
    };
  } catch (error: any) {
    console.error('Self-hosted WordPress publish error:', error);
    return {
      success: false,
      error: error.message || 'Failed to publish to self-hosted WordPress',
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

