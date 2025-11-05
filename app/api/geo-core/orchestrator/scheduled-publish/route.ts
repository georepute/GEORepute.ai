import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { publishToGitHub, GitHubConfig } from "@/lib/integrations/github";
import { publishToReddit, RedditConfig } from "@/lib/integrations/reddit";

/**
 * Scheduled Publish Cron Job
 * Runs periodically to check and publish scheduled content
 * Called by Vercel Cron or external cron service
 * 
 * For Vercel Cron: Runs every 5 minutes
 * For local dev: Use npm run check-scheduled
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Vercel Cron automatically adds this header
    const vercelCron = request.headers.get("x-vercel-cron");
    
    // Allow requests from browser (no auth required for client-side calls)
    // Only require auth for external cron services
    if (cronSecret && !vercelCron && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role key for admin access (no RLS restrictions)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
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
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (!scheduledContent || scheduledContent.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No scheduled content to publish",
          published: 0,
        },
        { status: 200 }
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
        let gitHubResult = null;
        let redditResult = null;

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
                // Publish to GitHub Discussions (uses categories automatically)
                gitHubResult = await publishToGitHub(githubConfig, {
                  title: content.topic || "Untitled",
                  content: content.generated_content || "",
                });

                if (gitHubResult.success && gitHubResult.url) {
                  publishUrl = gitHubResult.url;
                }

                // Update last_used_at for the integration
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
                username: redditIntegration.platform_username || redditIntegration.platform_user_id || undefined,
              };

              if (redditConfig.clientId && redditConfig.clientSecret && redditConfig.accessToken) {
                // Get subreddit from metadata or use default
                const subreddit = content.metadata?.subreddit || "test";
                
                redditResult = await publishToReddit(redditConfig, {
                  title: content.topic || "Untitled",
                  content: content.generated_content || "",
                  subreddit: subreddit,
                  kind: "self", // Text post
                });

                if (redditResult.success && redditResult.url) {
                  publishUrl = redditResult.url;
                }

                // Update last_used_at for the integration
                await supabase
                  .from("platform_integrations")
                  .update({ last_used_at: new Date().toISOString() })
                  .eq("id", redditIntegration.id);
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
              github: gitHubResult ? {
                success: gitHubResult.success,
                url: gitHubResult.url,
                discussionNumber: gitHubResult.discussionNumber,
                error: gitHubResult.error,
              } : null,
              reddit: redditResult ? {
                success: redditResult.success,
                url: redditResult.url,
                postId: redditResult.postId,
                error: redditResult.error,
              } : null,
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

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${scheduledContent.length} scheduled content items`,
        published: publishedCount,
        failed: failedCount,
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Scheduled publish cron error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

