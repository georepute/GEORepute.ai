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

Deno.serve(async (req) => {
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
        { status: 500, headers: { "Content-Type": "application/json" } }
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
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!scheduledContent || scheduledContent.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No scheduled content to publish",
          published: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
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
                        body: content.generated_content || "",
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

                // Prepare Reddit post data
                const postData = new URLSearchParams({
                  title: content.topic || "Untitled",
                  sr: subreddit,
                  kind: "self",
                  text: content.generated_content || "",
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

        // Create published_content record
        const { data: publishedRecord, error: publishError } = await supabase
          .from("published_content")
          .insert({
            user_id: content.user_id,
            content_strategy_id: content.id,
            platform: platform,
            published_url: publishUrl,
            published_at: new Date().toISOString(),
            status: publishUrl ? "published" : "pending",
            platform_post_id: (platform === "github" ? gitHubResult?.discussionNumber?.toString() : redditResult?.postId) || null,
            error_message: (gitHubResult?.error || redditResult?.error) || null,
            metadata: {
              auto_published: true,
              scheduled: true,
              scheduled_at: content.scheduled_at,
              github: gitHubResult || null,
              reddit: redditResult || null,
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
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Scheduled publish cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

