/**
 * Shopify Integration Service
 * Handles OAuth authentication and blog publishing to Shopify stores
 */

export interface ShopifyConfig {
  accessToken: string;
  shopDomain: string; // e.g., "mystore.myshopify.com" or just "mystore"
}

export interface ShopifyBlog {
  id: number;
  handle: string;
  title: string;
  commentable: string;
  feedburner: string | null;
  feedburner_location: string | null;
  created_at: string;
  updated_at: string;
  template_suffix: string | null;
  tags: string;
  admin_graphql_api_id: string;
}

export interface ShopifyArticle {
  id?: number;
  title: string;
  author: string;
  body_html: string;
  tags?: string;
  published?: boolean;
  published_at?: string;
  image?: {
    src: string;
    alt?: string;
  };
  metafields?: Array<{
    key: string;
    value: string;
    type: string;
    namespace: string;
  }>;
  summary_html?: string;
}

export interface ShopifyPublishResult {
  success: boolean;
  url?: string;
  articleId?: number;
  blogId?: number;
  error?: string;
}

/**
 * Normalize shop domain to ensure consistent format
 */
function normalizeShopDomain(domain: string): string {
  // Remove protocol if present
  let normalized = domain.replace(/^https?:\/\//, '');
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  // Add .myshopify.com if not present
  if (!normalized.includes('.myshopify.com')) {
    normalized = `${normalized}.myshopify.com`;
  }
  return normalized;
}

/**
 * Get API URL for Shopify store
 */
function getApiUrl(shopDomain: string, endpoint: string): string {
  const domain = normalizeShopDomain(shopDomain);
  // Use 2024-01 API version (stable)
  return `https://${domain}/admin/api/2024-01/${endpoint}`;
}

/**
 * Get all blogs from the Shopify store
 */
export async function getShopifyBlogs(config: ShopifyConfig): Promise<{
  success: boolean;
  blogs?: ShopifyBlog[];
  error?: string;
}> {
  try {
    const url = getApiUrl(config.shopDomain, 'blogs.json');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify get blogs error:', response.status, errorData);
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Unauthorized. Please reconnect your Shopify store.',
        };
      }
      
      return {
        success: false,
        error: errorData.errors || `Failed to fetch blogs (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      blogs: data.blogs || [],
    };
  } catch (error: any) {
    console.error('Shopify get blogs error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch Shopify blogs',
    };
  }
}

/**
 * Create a new blog in the Shopify store
 */
export async function createShopifyBlog(
  config: ShopifyConfig,
  title: string = 'Blog'
): Promise<{
  success: boolean;
  blog?: ShopifyBlog;
  error?: string;
}> {
  try {
    const url = getApiUrl(config.shopDomain, 'blogs.json');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blog: {
          title,
          commentable: 'moderate',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify create blog error:', response.status, errorData);
      return {
        success: false,
        error: errorData.errors || `Failed to create blog (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      blog: data.blog,
    };
  } catch (error: any) {
    console.error('Shopify create blog error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create Shopify blog',
    };
  }
}

/**
 * Publish an article (blog post) to Shopify
 */
export async function publishToShopify(
  config: ShopifyConfig,
  article: ShopifyArticle,
  blogId?: number
): Promise<ShopifyPublishResult> {
  try {
    // If no blog ID provided, get or create a default blog
    let targetBlogId = blogId;
    
    if (!targetBlogId) {
      const blogsResult = await getShopifyBlogs(config);
      
      if (!blogsResult.success) {
        return {
          success: false,
          error: blogsResult.error,
        };
      }
      
      if (blogsResult.blogs && blogsResult.blogs.length > 0) {
        // Use the first existing blog
        targetBlogId = blogsResult.blogs[0].id;
        console.log(`Using existing blog: ${blogsResult.blogs[0].title} (ID: ${targetBlogId})`);
      } else {
        // Create a new blog if none exists
        const createResult = await createShopifyBlog(config, 'Blog');
        if (!createResult.success || !createResult.blog) {
          return {
            success: false,
            error: createResult.error || 'Failed to create blog',
          };
        }
        targetBlogId = createResult.blog.id;
        console.log(`Created new blog: ${createResult.blog.title} (ID: ${targetBlogId})`);
      }
    }

    // Create the article
    const url = getApiUrl(config.shopDomain, `blogs/${targetBlogId}/articles.json`);
    
    const articlePayload: any = {
      article: {
        title: article.title,
        author: article.author || 'GeoRepute.ai',
        body_html: article.body_html,
        published: article.published !== false, // Default to published
        ...(article.tags && { tags: article.tags }),
        ...(article.summary_html && { summary_html: article.summary_html }),
      },
    };

    // Add image if provided
    if (article.image?.src) {
      articlePayload.article.image = {
        src: article.image.src,
        ...(article.image.alt && { alt: article.image.alt }),
      };
    }

    // Add metafields for SEO if provided
    if (article.metafields && article.metafields.length > 0) {
      articlePayload.article.metafields = article.metafields;
    }

    console.log('Publishing article to Shopify:', {
      blogId: targetBlogId,
      title: article.title,
      hasImage: !!article.image?.src,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(articlePayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify publish article error:', response.status, errorData);
      
      let errorMessage = `Failed to publish article (${response.status})`;
      if (errorData.errors) {
        if (typeof errorData.errors === 'string') {
          errorMessage = errorData.errors;
        } else if (typeof errorData.errors === 'object') {
          errorMessage = Object.entries(errorData.errors)
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ');
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    const createdArticle = data.article;

    // Construct the public URL - use myshopify.com domain (always works)
    const shopDomain = normalizeShopDomain(config.shopDomain);
    const blogHandle = createdArticle.blog_id ? 
      (await getShopifyBlogs(config)).blogs?.find(b => b.id === createdArticle.blog_id)?.handle || 'news' 
      : 'news';
    const articleUrl = `https://${shopDomain}/blogs/${blogHandle}/${createdArticle.handle}`;

    console.log('Successfully published to Shopify:', {
      articleId: createdArticle.id,
      url: articleUrl,
    });

    return {
      success: true,
      url: articleUrl,
      articleId: createdArticle.id,
      blogId: targetBlogId,
    };
  } catch (error: any) {
    console.error('Shopify publish error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error publishing to Shopify',
    };
  }
}

/**
 * Update an existing article in Shopify
 */
export async function updateShopifyArticle(
  config: ShopifyConfig,
  blogId: number,
  articleId: number,
  updates: Partial<ShopifyArticle>
): Promise<ShopifyPublishResult> {
  try {
    const url = getApiUrl(config.shopDomain, `blogs/${blogId}/articles/${articleId}.json`);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ article: updates }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify update article error:', response.status, errorData);
      return {
        success: false,
        error: errorData.errors || `Failed to update article (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      articleId: data.article.id,
      blogId,
    };
  } catch (error: any) {
    console.error('Shopify update error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update Shopify article',
    };
  }
}

/**
 * Delete an article from Shopify
 */
export async function deleteShopifyArticle(
  config: ShopifyConfig,
  blogId: number,
  articleId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = getApiUrl(config.shopDomain, `blogs/${blogId}/articles/${articleId}.json`);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.errors || `Failed to delete article (${response.status})`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete Shopify article',
    };
  }
}

/**
 * Verify Shopify connection is valid
 */
export async function verifyShopifyConnection(config: ShopifyConfig): Promise<{
  success: boolean;
  shopName?: string;
  error?: string;
}> {
  try {
    const url = getApiUrl(config.shopDomain, 'shop.json');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid or expired access token. Please reconnect your Shopify store.',
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
      shopName: data.shop?.name,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify Shopify connection',
    };
  }
}

// ============================================================================
// OAuth Helper Functions
// ============================================================================

/**
 * Generate Shopify OAuth authorization URL
 */
export function generateShopifyAuthUrl(
  shopDomain: string,
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[] = ['read_content', 'write_content']
): string {
  const normalizedDomain = normalizeShopDomain(shopDomain);
  const scopeString = scopes.join(',');
  
  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopeString,
    redirect_uri: redirectUri,
    state: state,
  });

  return `https://${normalizedDomain}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeShopifyCode(
  shopDomain: string,
  clientId: string,
  clientSecret: string,
  code: string
): Promise<{
  success: boolean;
  accessToken?: string;
  scope?: string;
  error?: string;
}> {
  try {
    const normalizedDomain = normalizeShopDomain(shopDomain);
    const url = `https://${normalizedDomain}/admin/oauth/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify token exchange error:', response.status, errorData);
      return {
        success: false,
        error: errorData.error_description || errorData.error || 'Failed to exchange authorization code',
      };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      scope: data.scope,
    };
  } catch (error: any) {
    console.error('Shopify token exchange error:', error);
    return {
      success: false,
      error: error.message || 'Failed to exchange authorization code',
    };
  }
}

/**
 * Verify HMAC signature from Shopify callback
 */
export function verifyShopifyHmac(
  query: Record<string, string>,
  clientSecret: string
): boolean {
  // This would require crypto module - implementation depends on environment
  // For now, return true and implement proper HMAC verification as needed
  // In production, always verify HMAC for security
  console.warn('HMAC verification not implemented - implement for production');
  return true;
}
