/**
 * Supabase Edge Function: Scheduled Publish
 * 
 * This function checks for scheduled content and publishes it to configured platforms.
 * Called by pg_cron every 5 minutes.
 * 
 * Setup:
 * 1. Deploy this function: supabase functions deploy scheduled-publish
 * 2. Set up pg_cron job (see database/supabase_cron_setup.sql)
 */

// @ts-ignore - Deno-style URL imports are valid in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno global is available in Supabase Edge Functions runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

interface RedditConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

interface FacebookConfig {
  pageAccessToken: string;
  pageId: string;
}

interface MediumConfig {
  accessToken: string;
  authorId: string;
}

interface QuoraConfig {
  sessionCookie: string;
  formkey: string;
}

interface ShopifyConfig {
  accessToken: string;
  shopDomain: string;
}

interface WordPressConfig {
  accessToken: string;
  siteId: string;
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    // Note: SUPABASE_URL is automatically available in Edge Functions
    // Use SERVICE_ROLE_KEY as the secret name (without SUPABASE_ prefix due to CLI restrictions)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const vercelUrl = Deno.env.get("VERCEL_URL") || Deno.env.get("NEXT_PUBLIC_VERCEL_URL");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Find all scheduled content that should be published now
    const { data: scheduledContent, error: fetchError } = await supabase
      .from("content_strategy")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching scheduled content:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!scheduledContent || scheduledContent.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No scheduled content to publish",
          published: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let publishedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    // Process each scheduled content
    for (const content of scheduledContent) {
      try {
        const platform = content.target_platform || "github";
        let publishUrl = null;
        let gitHubResult: any = null;
        let redditResult: any = null;
        let linkedInResult: any = null;
        let instagramResult: any = null;
        let facebookResult: any = null;
        let mediumResult: any = null;
        let quoraResult: any = null;
        let shopifyResult: any = null;
        let wordpressResult: any = null;

        // Get GitHub integration if platform is GitHub
        if (platform === "github") {
          try {
            const { data: githubIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "github")
              .eq("status", "connected")
              .maybeSingle();

            if (githubIntegration) {
              const githubConfig: GitHubConfig = {
                token: githubIntegration.access_token,
                owner: githubIntegration.metadata?.owner || githubIntegration.platform_user_id || "",
                repo: githubIntegration.metadata?.repo || "",
                branch: githubIntegration.metadata?.branch || "main",
              };

              if (githubConfig.token && githubConfig.owner && githubConfig.repo) {
                // Use GraphQL API for GitHub Discussions
                // Step 1: Get repository ID and categories
                const repoQuery = `
                  query GetRepository($owner: String!, $repo: String!) {
                    repository(owner: $owner, name: $repo) {
                      id
                      discussionCategories(first: 20) {
                        nodes {
                          id
                          name
                          slug
                        }
                      }
                    }
                  }
                `;

                const categoriesResponse = await fetch("https://api.github.com/graphql", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${githubConfig.token}`,
                    "Content-Type": "application/json",
                    "User-Agent": "GeoRepute.ai",
                  },
                  body: JSON.stringify({
                    query: repoQuery,
                    variables: {
                      owner: githubConfig.owner,
                      repo: githubConfig.repo,
                    },
                  }),
                });

                if (!categoriesResponse.ok) {
                  throw new Error(`Failed to fetch repository: ${categoriesResponse.status}`);
                }

                const categoriesResult = await categoriesResponse.json();
                
                if (categoriesResult.errors) {
                  throw new Error(`GraphQL error: ${categoriesResult.errors[0]?.message || "Unknown error"}`);
                }

                const repositoryId = categoriesResult.data?.repository?.id;
                if (!repositoryId) {
                  throw new Error("Repository not found or Discussions not enabled");
                }

                const categories = categoriesResult.data?.repository?.discussionCategories?.nodes || [];
                if (categories.length === 0) {
                  throw new Error("No discussion categories available. Please enable Discussions in your repository: Settings → General → Features → Discussions");
                }

                // Prefer "General" category, fallback to first available
                const generalCategory = categories.find((c: any) =>
                  c.name.toLowerCase() === "general" || c.slug === "general"
                );
                const categoryId = generalCategory?.id || categories[0].id;

                // Step 2: Create discussion using GraphQL
                const createMutation = `
                  mutation CreateDiscussion($input: CreateDiscussionInput!) {
                    createDiscussion(input: $input) {
                      discussion {
                        id
                        number
                        url
                      }
                    }
                  }
                `;

                const githubResponse = await fetch("https://api.github.com/graphql", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${githubConfig.token}`,
                    "Content-Type": "application/json",
                    "User-Agent": "GeoRepute.ai",
                  },
                  body: JSON.stringify({
                    query: createMutation,
                    variables: {
                      input: {
                        repositoryId: repositoryId,
                        categoryId: categoryId,
                        title: content.topic || "Untitled",
                        body: (() => {
                          // Strip schema from content - schema should only be on website, not in GitHub Discussions
                          let githubContent = content.generated_content || "";
                          // Remove any schema script tags (JSON-LD)
                          githubContent = githubContent.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "").trim();
                          // Remove any HTML comments related to schema
                          githubContent = githubContent.replace(/<!--\s*SEO Schema.*?-->/gis, "").trim();
                          return githubContent;
                        })(),
                      },
                    },
                  }),
                });

                if (!githubResponse.ok) {
                  const errorText = await githubResponse.text();
                  throw new Error(`GitHub API error: ${githubResponse.status} - ${errorText.substring(0, 200)}`);
                }

                const githubResult = await githubResponse.json();
                
                if (githubResult.errors) {
                  throw new Error(`GraphQL error: ${githubResult.errors[0]?.message || "Unknown error"}`);
                }

                const discussionData = githubResult.data?.createDiscussion?.discussion;
                if (!discussionData) {
                  throw new Error("Failed to create discussion - no data returned");
                }

                publishUrl = discussionData.url;
                gitHubResult = {
                  success: true,
                  url: discussionData.url,
                  discussionNumber: discussionData.number,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", githubIntegration.id);
              }
            }
          } catch (githubError: any) {
            console.error(`GitHub publish error for content ${content.id}:`, githubError);
            gitHubResult = {
              success: false,
              error: githubError.message || "GitHub publish failed",
            };
          }
        }

        // Get Reddit integration if platform is Reddit
        if (platform === "reddit") {
          try {
            const { data: redditIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "reddit")
              .eq("status", "connected")
              .maybeSingle();

            if (redditIntegration) {
              const redditConfig: RedditConfig = {
                clientId: redditIntegration.metadata?.clientId || "",
                clientSecret: redditIntegration.metadata?.clientSecret || "",
                accessToken: redditIntegration.access_token || "",
              };

              if (redditConfig.clientId && redditConfig.clientSecret && redditConfig.accessToken) {
                const subreddit = content.metadata?.subreddit || "test";
                const imageUrl = content.metadata?.imageUrl;

                // Prepare content with image if available
                let postContent = content.generated_content || "";
                if (imageUrl) {
                  // Add image link at the beginning of the post
                  postContent = `![Image](${imageUrl})\n\n${postContent}`;
                }

                // Prepare Reddit post data
                const postData = new URLSearchParams({
                  title: content.topic || "Untitled",
                  sr: subreddit,
                  kind: "self",
                  text: postContent,
                  api_type: "json",
                });

                // Publish to Reddit
                const redditResponse = await fetch("https://oauth.reddit.com/api/submit", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${redditConfig.accessToken}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "web:GeoRepute.ai:1.0.0 (by /u/georepute)",
                  },
                  body: postData.toString(),
                });

                if (redditResponse.ok) {
                  const redditData = await redditResponse.json();

                  if (redditData.json?.errors && redditData.json.errors.length > 0) {
                    const errorMessage = redditData.json.errors.map((e: any[]) => e.join(": ")).join(", ");
                    redditResult = {
                      success: false,
                      error: errorMessage,
                    };
                  } else if (redditData.json?.data?.name) {
                    const postId = redditData.json.data.name;
                    const permalink = redditData.json.data.permalink;

                    let postUrl: string;
                    if (permalink) {
                      const cleanPermalink = permalink.startsWith("/") ? permalink : `/${permalink}`;
                      postUrl = `https://www.reddit.com${cleanPermalink}`;
                    } else {
                      const postIdClean = postId.replace("t3_", "");
                      postUrl = `https://www.reddit.com/r/${subreddit}/comments/${postIdClean}`;
                    }

                    publishUrl = postUrl;
                    redditResult = {
                      success: true,
                      url: postUrl,
                      postId: postId.replace("t3_", ""),
                    };

                    // Update last_used_at
                    await supabase
                      .from("platform_integrations")
                      .update({ last_used_at: new Date().toISOString() })
                      .eq("id", redditIntegration.id);
                  }
                } else {
                  const errorText = await redditResponse.text();
                  redditResult = {
                    success: false,
                    error: `Reddit API error: ${redditResponse.status} - ${errorText}`,
                  };
                }
              }
            }
          } catch (redditError: any) {
            console.error(`Reddit publish error for content ${content.id}:`, redditError);
            redditResult = {
              success: false,
              error: redditError.message || "Reddit publish failed",
            };
          }
        }

        // Get LinkedIn integration if platform is LinkedIn
        if (platform === "linkedin") {
          try {
            const { data: linkedInIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "linkedin")
              .eq("status", "connected")
              .maybeSingle();

            if (linkedInIntegration && linkedInIntegration.access_token) {
              // Check if token is expired
              const expiresAt = linkedInIntegration.expires_at 
                ? new Date(linkedInIntegration.expires_at) 
                : null;
              const now = new Date();
              
              if (expiresAt && expiresAt < now) {
                throw new Error("LinkedIn access token has expired. Please reconnect your LinkedIn integration.");
              }

              const personUrn = linkedInIntegration.metadata?.personUrn || linkedInIntegration.platform_user_id;
              if (!personUrn) {
                throw new Error("LinkedIn Person URN not found. Please reconnect your LinkedIn integration.");
              }

              // Combine title and content
              let shareText = '';
              if (content.topic && content.topic.trim()) {
                shareText = `${content.topic}\n\n${content.generated_content || ""}`;
              } else {
                shareText = content.generated_content || "";
              }

              // LinkedIn has a 3000 character limit for posts
              const LINKEDIN_CHAR_LIMIT = 3000;
              if (shareText.length > LINKEDIN_CHAR_LIMIT) {
                console.log(`⚠️ LinkedIn post text exceeds ${LINKEDIN_CHAR_LIMIT} chars (${shareText.length} chars). Truncating...`);
                const truncateAt = LINKEDIN_CHAR_LIMIT - 3;
                let truncatedText = shareText.substring(0, truncateAt);
                
                // Try to break at last space to avoid cutting words
                const lastSpaceIndex = truncatedText.lastIndexOf(' ');
                if (lastSpaceIndex > truncateAt - 100) {
                  truncatedText = truncatedText.substring(0, lastSpaceIndex);
                }
                
                shareText = truncatedText + '...';
                console.log(`✅ Truncated to ${shareText.length} characters`);
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
              const imageUrl = content.metadata?.imageUrl;
              if (imageUrl) {
                console.log(`🖼️ Uploading image to LinkedIn: ${imageUrl}`);
                
                try {
                  // Step 1: Register the upload
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

                  const registerResponse = await fetch(
                    'https://api.linkedin.com/v2/assets?action=registerUpload',
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${linkedInIntegration.access_token}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': '2.0.0',
                      },
                      body: JSON.stringify(registerPayload),
                    }
                  );

                  if (!registerResponse.ok) {
                    const error = await registerResponse.json().catch(() => ({}));
                    throw new Error(`Failed to register media: ${error.message || registerResponse.statusText}`);
                  }

                  const registerResult = await registerResponse.json();
                  const mediaAsset = registerResult.value.asset;
                  const uploadUrl = registerResult.value.uploadMechanism[
                    'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
                  ].uploadUrl;

                  console.log(`✅ Registered LinkedIn media asset: ${mediaAsset}`);

                  // Step 2: Download and upload the image
                  const imageResponse = await fetch(imageUrl);
                  if (!imageResponse.ok) {
                    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
                  }
                  const imageBuffer = await imageResponse.arrayBuffer();

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

                  console.log(`✅ Image uploaded to LinkedIn`);

                  // Step 3: Use the asset URN in the post
                  ugcPost.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
                  ugcPost.specificContent['com.linkedin.ugc.ShareContent'].media = [
                    {
                      status: 'READY',
                      description: {
                        text: content.topic || 'Image',
                      },
                      media: mediaAsset,
                      title: {
                        text: content.topic || 'Shared Image',
                      },
                    },
                  ];
                  console.log(`✅ Image ready for LinkedIn post`);
                } catch (uploadError: any) {
                  console.error(`❌ Failed to upload image to LinkedIn:`, uploadError.message);
                  console.log(`⚠️ Falling back to text-only post without image`);
                }
              }
              // Add link if provided (only if no image)
              else if (content.metadata?.link) {
                ugcPost.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
                ugcPost.specificContent['com.linkedin.ugc.ShareContent'].media = [
                  {
                    status: 'READY',
                    description: {
                      text: shareText,
                    },
                    originalUrl: content.metadata.link,
                    title: {
                      text: content.topic || 'Shared Link',
                    },
                  },
                ];
              }

              // Publish to LinkedIn
              const linkedInResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${linkedInIntegration.access_token}`,
                  'Content-Type': 'application/json',
                  'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify(ugcPost),
              });

              const linkedInData = await linkedInResponse.json();

              if (linkedInResponse.ok && linkedInData.id) {
                const postId = linkedInData.id;
                // Use full URN format with trailing slash (required by LinkedIn)
                // Format: https://www.linkedin.com/feed/update/{fullUrn}/
                const url = postId 
                  ? `https://www.linkedin.com/feed/update/${postId}/`
                  : undefined;

                publishUrl = url;
                linkedInResult = {
                  success: true,
                  url: url,
                  postId: postId,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", linkedInIntegration.id);
              } else {
                const errorMessage = linkedInData.message || linkedInData.error?.message || 'Unknown LinkedIn API error';
                linkedInResult = {
                  success: false,
                  error: `LinkedIn API Error (${linkedInResponse.status}): ${errorMessage}`,
                };
              }
            } else {
              throw new Error("LinkedIn integration not found or not connected.");
            }
          } catch (linkedInError: any) {
            console.error(`LinkedIn publish error for content ${content.id}:`, linkedInError);
            linkedInResult = {
              success: false,
              error: linkedInError.message || "LinkedIn publish failed",
            };
          }
        }

        // Get Instagram integration if platform is Instagram
        if (platform === "instagram") {
          try {
            const { data: instagramIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "instagram")
              .eq("status", "connected")
              .maybeSingle();

            if (instagramIntegration && instagramIntegration.access_token) {
              // Check if token is expired
              const expiresAt = instagramIntegration.expires_at 
                ? new Date(instagramIntegration.expires_at) 
                : null;
              const now = new Date();
              
              if (expiresAt && expiresAt < now) {
                throw new Error("Instagram access token has expired. Please reconnect your Instagram integration.");
              }

              const pageId = instagramIntegration.metadata?.pageId || "";
              const instagramAccountId = instagramIntegration.metadata?.instagramAccountId || instagramIntegration.platform_user_id;

              if (!pageId || !instagramAccountId) {
                throw new Error("Instagram integration missing page ID or Instagram account ID. Please reconnect.");
              }

              // Instagram requires an image
              if (!content.metadata?.imageUrl) {
                throw new Error("Image URL is required for Instagram posts.");
              }

              // Prepare caption
              let caption = '';
              if (content.topic && content.topic.trim()) {
                caption = `${content.topic}\n\n${content.generated_content || ""}`;
              } else {
                caption = content.generated_content || "";
              }

              // Add hashtags if provided
              if (content.metadata?.tags && content.metadata.tags.length > 0) {
                const hashtags = content.metadata.tags.map((tag: string) => `#${tag.replace(/#/g, '').replace(/\s+/g, '')}`).join(' ');
                caption = `${caption}\n\n${hashtags}`;
              }

              // Limit caption to 2200 characters
              if (caption.length > 2200) {
                caption = caption.substring(0, 2197) + '...';
              }

              // Step 1: Create media container
              const mediaResponse = await fetch(
                `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    image_url: content.metadata.imageUrl,
                    caption: caption,
                    access_token: instagramIntegration.access_token,
                  }),
                }
              );

              if (!mediaResponse.ok) {
                const error = await mediaResponse.json().catch(() => ({ error: { message: 'Unknown error' } }));
                throw new Error(`Instagram API error: ${mediaResponse.status} - ${error.error?.message || 'Failed to create media container'}`);
              }

              const mediaData = await mediaResponse.json();
              const creationId = mediaData.id;

              // Step 2: Publish the media
              const publishResponse = await fetch(
                `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    creation_id: creationId,
                    access_token: instagramIntegration.access_token,
                  }),
                }
              );

              const publishData = await publishResponse.json();

              if (publishResponse.ok && publishData.id) {
                // Get permalink
                let permalink: string | undefined;
                try {
                  const permalinkResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${publishData.id}?fields=permalink&access_token=${instagramIntegration.access_token}`
                  );
                  if (permalinkResponse.ok) {
                    const permalinkData = await permalinkResponse.json();
                    permalink = permalinkData.permalink;
                  }
                } catch (e) {
                  // Permalink is optional
                }

                const url = permalink || `https://www.instagram.com/p/${publishData.id}/`;

                publishUrl = url;
                instagramResult = {
                  success: true,
                  url: url,
                  postId: publishData.id,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", instagramIntegration.id);
              } else {
                const errorMessage = publishData.error?.message || 'Unknown Instagram API error';
                instagramResult = {
                  success: false,
                  error: `Instagram API Error (${publishResponse.status}): ${errorMessage}`,
                };
              }
            } else {
              throw new Error("Instagram integration not found or not connected.");
            }
          } catch (instagramError: any) {
            console.error(`Instagram publish error for content ${content.id}:`, instagramError);
            instagramResult = {
              success: false,
              error: instagramError.message || "Instagram publish failed",
            };
          }
        }

        // Get Facebook integration if platform is Facebook
        if (platform === "facebook") {
          try {
            const { data: facebookIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "facebook")
              .eq("status", "connected")
              .maybeSingle();

            if (facebookIntegration && facebookIntegration.access_token) {
              const pageId = facebookIntegration.metadata?.pageId || facebookIntegration.platform_user_id;
              
              if (!pageId) {
                throw new Error("Facebook Page ID not found. Please reconnect your Facebook integration.");
              }

              // Combine title and content
              let message = '';
              if (content.topic && content.topic.trim()) {
                message = `${content.topic}\n\n${content.generated_content || ""}`;
              } else {
                message = content.generated_content || "";
              }

              let response;
              let endpoint;

              // Check if we have an image to post
              if (content.metadata?.imageUrl) {
                // Use /photos endpoint to post as actual photo
                endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
                
                const photoData: any = {
                  url: content.metadata.imageUrl,
                  caption: message,
                  access_token: facebookIntegration.access_token,
                };

                // Add link if provided
                if (content.metadata?.link) {
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
                endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
                
                const postData: any = {
                  message: message,
                  access_token: facebookIntegration.access_token,
                };

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

              if (response.ok && (result.id || result.post_id)) {
                const postId = result.id || result.post_id;
                const url = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

                publishUrl = url;
                facebookResult = {
                  success: true,
                  url: url,
                  postId: postId,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", facebookIntegration.id);
              } else {
                const errorMessage = result.error?.message || 'Unknown Facebook API error';
                facebookResult = {
                  success: false,
                  error: `Facebook API Error (${response.status}): ${errorMessage}`,
                };
              }
            } else {
              throw new Error("Facebook integration not found or not connected.");
            }
          } catch (facebookError: any) {
            console.error(`Facebook publish error for content ${content.id}:`, facebookError);
            facebookResult = {
              success: false,
              error: facebookError.message || "Facebook publish failed",
            };
          }
        }

        // Get Medium integration if platform is Medium
        if (platform === "medium") {
          try {
            const { data: mediumIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "medium")
              .eq("status", "connected")
              .maybeSingle();

            if (mediumIntegration && mediumIntegration.access_token) {
              const authorId = mediumIntegration.metadata?.authorId || mediumIntegration.platform_user_id;
              
              if (!authorId) {
                throw new Error("Medium Author ID not found. Please reconnect your Medium integration.");
              }

              // Prepare content for Medium (supports Markdown and HTML)
              let contentBody = content.generated_content || "";
              
              // Add image at the beginning if provided
              if (content.metadata?.imageUrl) {
                contentBody = `![${content.topic || 'Image'}](${content.metadata.imageUrl})\n\n${contentBody}`;
              }

              // Prepare tags
              const tags = content.metadata?.tags || content.target_keywords?.slice(0, 5) || [];

              // Publish to Medium
              const mediumResponse = await fetch(
                `https://api.medium.com/v1/users/${authorId}/posts`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${mediumIntegration.access_token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  body: JSON.stringify({
                    title: content.topic || 'Untitled',
                    contentFormat: 'markdown',
                    content: contentBody,
                    tags: tags.slice(0, 5), // Medium allows max 5 tags
                    publishStatus: 'public', // 'public', 'draft', or 'unlisted'
                    canonicalUrl: content.metadata?.canonicalUrl || undefined,
                  }),
                }
              );

              const mediumData = await mediumResponse.json();

              if (mediumResponse.ok && mediumData.data?.id) {
                const postUrl = mediumData.data.url;

                publishUrl = postUrl;
                mediumResult = {
                  success: true,
                  url: postUrl,
                  postId: mediumData.data.id,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", mediumIntegration.id);
              } else {
                const errorMessage = mediumData.errors?.[0]?.message || 'Unknown Medium API error';
                mediumResult = {
                  success: false,
                  error: `Medium API Error (${mediumResponse.status}): ${errorMessage}`,
                };
              }
            } else {
              throw new Error("Medium integration not found or not connected.");
            }
          } catch (mediumError: any) {
            console.error(`Medium publish error for content ${content.id}:`, mediumError);
            mediumResult = {
              success: false,
              error: mediumError.message || "Medium publish failed",
            };
          }
        }

        // Get Quora integration if platform is Quora
        if (platform === "quora") {
          try {
            const { data: quoraIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "quora")
              .eq("status", "connected")
              .maybeSingle();

            if (quoraIntegration) {
              // Quora doesn't have a public API, so we use session-based posting
              const sessionCookie = quoraIntegration.access_token || quoraIntegration.metadata?.sessionCookie;
              const formkey = quoraIntegration.metadata?.formkey;

              if (!sessionCookie) {
                throw new Error("Quora session not found. Please reconnect your Quora integration.");
              }

              // Prepare content for Quora
              let answerContent = content.generated_content || "";
              
              // Add image if provided (as markdown)
              if (content.metadata?.imageUrl) {
                answerContent = `![Image](${content.metadata.imageUrl})\n\n${answerContent}`;
              }

              // For Quora, we typically answer a question or create a post
              // Since Quora API is not public, we'll create a Space post if configured
              const spaceId = quoraIntegration.metadata?.spaceId;
              
              if (spaceId) {
                // Post to Quora Space using internal API
                const quoraResponse = await fetch('https://www.quora.com/graphql/gql_para_POST', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `m-s=${sessionCookie}`,
                    'Quora-Formkey': formkey || '',
                  },
                  body: JSON.stringify({
                    queryName: 'CreateTribePostMutation',
                    variables: {
                      input: {
                        tribeId: spaceId,
                        title: content.topic || '',
                        text: answerContent,
                      },
                    },
                  }),
                });

                if (quoraResponse.ok) {
                  const quoraData = await quoraResponse.json();
                  
                  if (quoraData.data?.createTribePost?.post?.url) {
                    const postUrl = `https://www.quora.com${quoraData.data.createTribePost.post.url}`;

                    publishUrl = postUrl;
                    quoraResult = {
                      success: true,
                      url: postUrl,
                      postId: quoraData.data.createTribePost.post.id,
                    };

                    // Update last_used_at
                    await supabase
                      .from("platform_integrations")
                      .update({ last_used_at: new Date().toISOString() })
                      .eq("id", quoraIntegration.id);
                  } else {
                    quoraResult = {
                      success: false,
                      error: 'Failed to get Quora post URL from response',
                    };
                  }
                } else {
                  quoraResult = {
                    success: false,
                    error: `Quora API Error (${quoraResponse.status})`,
                  };
                }
              } else {
                throw new Error("Quora Space ID not configured. Please set up a Space in your Quora integration.");
              }
            } else {
              throw new Error("Quora integration not found or not connected.");
            }
          } catch (quoraError: any) {
            console.error(`Quora publish error for content ${content.id}:`, quoraError);
            quoraResult = {
              success: false,
              error: quoraError.message || "Quora publish failed",
            };
          }
        }

        // Get Shopify integration if platform is Shopify
        if (platform === "shopify") {
          try {
            const { data: shopifyIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "shopify")
              .eq("status", "connected")
              .maybeSingle();

            if (shopifyIntegration && shopifyIntegration.access_token) {
              const shopDomain = shopifyIntegration.metadata?.shopDomain || shopifyIntegration.platform_user_id;
              
              if (!shopDomain) {
                throw new Error("Shopify shop domain not found. Please reconnect your Shopify integration.");
              }

              // Normalize shop domain
              let normalizedDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
              if (!normalizedDomain.includes('.myshopify.com')) {
                normalizedDomain = `${normalizedDomain}.myshopify.com`;
              }

              // Get or create blog
              const blogId = content.metadata?.shopifyBlogId;
              let targetBlogId = blogId;

              if (!targetBlogId) {
                // Get first available blog
                const blogsResponse = await fetch(
                  `https://${normalizedDomain}/admin/api/2024-01/blogs.json`,
                  {
                    method: 'GET',
                    headers: {
                      'X-Shopify-Access-Token': shopifyIntegration.access_token,
                      'Content-Type': 'application/json',
                    },
                  }
                );

                if (blogsResponse.ok) {
                  const blogsData = await blogsResponse.json();
                  if (blogsData.blogs && blogsData.blogs.length > 0) {
                    targetBlogId = blogsData.blogs[0].id;
                  }
                }

                if (!targetBlogId) {
                  throw new Error("No blog found in Shopify store. Please create a blog first.");
                }
              }

              // Prepare article payload
              const articlePayload = {
                article: {
                  title: content.topic || "Untitled",
                  author: content.metadata?.author || "GeoRepute.ai",
                  body_html: content.generated_content || "",
                  published: true,
                  tags: content.metadata?.tags || content.target_keywords?.join(", ") || "",
                  summary_html: content.metadata?.summary || "",
                  ...(content.metadata?.imageUrl && {
                    image: { src: content.metadata.imageUrl },
                  }),
                },
              };

              // Create article
              const articleResponse = await fetch(
                `https://${normalizedDomain}/admin/api/2024-01/blogs/${targetBlogId}/articles.json`,
                {
                  method: 'POST',
                  headers: {
                    'X-Shopify-Access-Token': shopifyIntegration.access_token,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(articlePayload),
                }
              );

              if (articleResponse.ok) {
                const articleData = await articleResponse.json();
                const article = articleData.article;

                // Get blog handle for URL
                let blogHandle = 'news';
                try {
                  const blogInfoResponse = await fetch(
                    `https://${normalizedDomain}/admin/api/2024-01/blogs/${targetBlogId}.json`,
                    {
                      method: 'GET',
                      headers: {
                        'X-Shopify-Access-Token': shopifyIntegration.access_token,
                        'Content-Type': 'application/json',
                      },
                    }
                  );
                  if (blogInfoResponse.ok) {
                    const blogInfo = await blogInfoResponse.json();
                    blogHandle = blogInfo.blog?.handle || 'news';
                  }
                } catch (e) {
                  // Use default handle
                }

                const articleUrl = `https://${normalizedDomain}/blogs/${blogHandle}/${article.handle}`;

                publishUrl = articleUrl;
                shopifyResult = {
                  success: true,
                  url: articleUrl,
                  articleId: article.id,
                  blogId: targetBlogId,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", shopifyIntegration.id);
              } else {
                const errorData = await articleResponse.json().catch(() => ({}));
                const errorMessage = errorData.errors 
                  ? (typeof errorData.errors === 'string' ? errorData.errors : JSON.stringify(errorData.errors))
                  : `Shopify API Error (${articleResponse.status})`;
                shopifyResult = {
                  success: false,
                  error: errorMessage,
                };
              }
            } else {
              throw new Error("Shopify integration not found or not connected.");
            }
          } catch (shopifyError: any) {
            console.error(`Shopify publish error for content ${content.id}:`, shopifyError);
            shopifyResult = {
              success: false,
              error: shopifyError.message || "Shopify publish failed",
            };
          }
        }

        // Get WordPress.com integration if platform is WordPress
        if (platform === "wordpress") {
          try {
            const { data: wordpressIntegration } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", content.user_id)
              .eq("platform", "wordpress")
              .eq("status", "connected")
              .maybeSingle();

            if (wordpressIntegration && wordpressIntegration.access_token) {
              const siteId = content.metadata?.wordpressSiteId || 
                             wordpressIntegration.platform_user_id || 
                             wordpressIntegration.metadata?.siteId;
              
              if (!siteId) {
                throw new Error("WordPress.com site ID not found. Please select a site in your WordPress integration.");
              }

              // Prepare post payload
              const postPayload: any = {
                title: content.topic || "Untitled",
                content: content.generated_content || "",
                status: 'publish',
              };

              // Add optional fields
              if (content.metadata?.summary) {
                postPayload.excerpt = content.metadata.summary;
              }
              if (content.metadata?.tags) {
                postPayload.tags = Array.isArray(content.metadata.tags) 
                  ? content.metadata.tags.join(',') 
                  : content.metadata.tags;
              }
              if (content.target_keywords && content.target_keywords.length > 0) {
                postPayload.tags = (postPayload.tags ? postPayload.tags + ',' : '') + content.target_keywords.join(',');
              }
              // WordPress featured_image must be an attachment ID; upload image URL first
              if (content.metadata?.imageUrl && /^https?:\/\//i.test(content.metadata.imageUrl)) {
                const mediaBody = new URLSearchParams();
                mediaBody.append('media_urls[]', content.metadata.imageUrl);
                const mediaRes = await fetch(
                  `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/media/new`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${wordpressIntegration.access_token}`,
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: mediaBody.toString(),
                  }
                );
                if (mediaRes.ok) {
                  const mediaData = await mediaRes.json();
                  const media = Array.isArray(mediaData.media) ? mediaData.media : (mediaData.media ? [mediaData.media] : []);
                  if (media.length > 0 && media[0].ID) {
                    postPayload.featured_image = String(media[0].ID);
                  }
                }
              }
              // WordPress-specific: Add categories
              if (content.metadata?.categories) {
                postPayload.categories = Array.isArray(content.metadata.categories)
                  ? content.metadata.categories.join(',')
                  : content.metadata.categories;
              }

              // Create post
              const postResponse = await fetch(
                `https://public-api.wordpress.com/rest/v1.1/sites/${siteId}/posts/new`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${wordpressIntegration.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(postPayload),
                }
              );

              if (postResponse.ok) {
                const postData = await postResponse.json();

                publishUrl = postData.URL;
                wordpressResult = {
                  success: true,
                  url: postData.URL,
                  postId: postData.ID,
                  siteId: siteId,
                };

                // Update last_used_at
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", wordpressIntegration.id);
              } else {
                const errorData = await postResponse.json().catch(() => ({}));
                wordpressResult = {
                  success: false,
                  error: errorData.message || `WordPress API Error (${postResponse.status})`,
                };
              }
            } else {
              throw new Error("WordPress.com integration not found or not connected.");
            }
          } catch (wordpressError: any) {
            console.error(`WordPress publish error for content ${content.id}:`, wordpressError);
            wordpressResult = {
              success: false,
              error: wordpressError.message || "WordPress publish failed",
            };
          }
        }

        // Get platform post ID based on platform
        const getPlatformPostId = () => {
          switch (platform) {
            case "github": return gitHubResult?.discussionNumber?.toString();
            case "reddit": return redditResult?.postId;
            case "linkedin": return linkedInResult?.postId?.replace('urn:li:ugcPost:', '');
            case "instagram": return instagramResult?.postId;
            case "facebook": return facebookResult?.postId;
            case "medium": return mediumResult?.postId;
            case "quora": return quoraResult?.postId;
            case "shopify": return shopifyResult?.articleId?.toString();
            case "wordpress": return wordpressResult?.postId?.toString();
            default: return null;
          }
        };

        // Get error message from platform result
        const getErrorMessage = () => {
          return gitHubResult?.error || redditResult?.error || linkedInResult?.error || 
                 instagramResult?.error || facebookResult?.error || mediumResult?.error || 
                 quoraResult?.error || shopifyResult?.error || wordpressResult?.error || null;
        };

        // Check if schema exists in content metadata
        const schemaData = content.metadata?.schema;
        if (schemaData) {
          console.log(`✅ Schema found for content ${content.id}`);
          console.log(`📋 Schema Type: ${Array.isArray(schemaData.jsonLd) ? schemaData.jsonLd[0]?.["@type"] : schemaData.jsonLd?.["@type"] || "Article"}`);
        } else {
          console.log(`⚠️ No schema found for content ${content.id}`);
        }

        // Create published_content record with schema
        const { data: publishedRecord, error: publishError } = await supabase
          .from("published_content")
          .insert({
            user_id: content.user_id,
            content_strategy_id: content.id,
            platform: platform,
            published_url: publishUrl,
            published_at: new Date().toISOString(),
            status: publishUrl ? "published" : "pending",
            platform_post_id: getPlatformPostId() || null,
            error_message: getErrorMessage(),
            metadata: {
              auto_published: true,
              scheduled: true,
              scheduled_at: content.scheduled_at,
              // Platform results
              github: gitHubResult || null,
              reddit: redditResult || null,
              linkedin: linkedInResult || null,
              instagram: instagramResult || null,
              facebook: facebookResult || null,
              medium: mediumResult || null,
              quora: quoraResult || null,
              shopify: shopifyResult || null,
              wordpress: wordpressResult || null,
              // Schema data (for SEO)
              schema: schemaData ? {
                jsonLd: schemaData.jsonLd,
                scriptTags: schemaData.scriptTags,
                generatedAt: schemaData.generatedAt || new Date().toISOString(),
              } : null,
              schema_included: !!schemaData,
              schema_type: schemaData?.jsonLd 
                ? (Array.isArray(schemaData.jsonLd) 
                  ? schemaData.jsonLd[0]?.["@type"] 
                  : schemaData.jsonLd["@type"])
                : null,
              // Include all other metadata (imageUrl, structuredSEO, etc.)
              ...content.metadata,
            },
          })
          .select()
          .single();

        if (publishError) {
          console.error(`Error creating published_content for ${content.id}:`, publishError);
          throw publishError;
        }

        // Update content_strategy status to published
        const { error: updateError } = await supabase
          .from("content_strategy")
          .update({
            status: "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", content.id)
          .eq("user_id", content.user_id);

        if (updateError) {
          console.error(`Error updating content_strategy for ${content.id}:`, updateError);
          throw updateError;
        }

        publishedCount++;
        results.push({
          contentId: content.id,
          title: content.topic,
          success: true,
          url: publishUrl,
        });
      } catch (error: any) {
        console.error(`Failed to publish scheduled content ${content.id}:`, error);
        failedCount++;
        results.push({
          contentId: content.id,
          title: content.topic,
          success: false,
          error: error.message,
        });

        // Update content status to show error
        await supabase
          .from("content_strategy")
          .update({
            metadata: {
              ...content.metadata,
              scheduled_publish_error: error.message,
            },
          })
          .eq("id", content.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${scheduledContent.length} scheduled content items`,
        published: publishedCount,
        failed: failedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Scheduled publish cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

