import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { publishToGitHub, GitHubConfig } from "@/lib/integrations/github";
import { publishToReddit, RedditConfig } from "@/lib/integrations/reddit";

/**
 * Content Orchestrator API
 * Handles workflow: Preview → Audit → Approve → Schedule → Publish
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    let query = supabase
      .from("content_strategy")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Get published_content records
    const contentIds = data?.map((item) => item.id) || [];
    let publishedData: any = {};

    if (contentIds.length > 0) {
      const { data: published } = await supabase
        .from("published_content")
        .select("*")
        .in("content_strategy_id", contentIds)
        .eq("user_id", session.user.id);

      if (published) {
        published.forEach((pub) => {
          if (!publishedData[pub.content_strategy_id]) {
            publishedData[pub.content_strategy_id] = [];
          }
          publishedData[pub.content_strategy_id].push(pub);
        });
      }
    }

    // Get keyword forecast data for keywords used in content
    const allKeywords = new Set<string>();
    data?.forEach((item) => {
      if (item.target_keywords && Array.isArray(item.target_keywords)) {
        item.target_keywords.forEach((kw: string) => allKeywords.add(kw));
      }
    });

    let keywordForecastData: any = {};
    if (allKeywords.size > 0) {
      const { data: forecasts } = await supabase
        .from("keyword_forecast")
        .select("keyword, opportunity_score, metadata")
        .in("keyword", Array.from(allKeywords))
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (forecasts) {
        // Get latest forecast for each keyword
        const seenKeywords = new Set<string>();
        forecasts.forEach((forecast: any) => {
          if (!seenKeywords.has(forecast.keyword)) {
            seenKeywords.add(forecast.keyword);
            const trend = forecast.metadata?.trend || forecast.metadata?.difficulty || "Stable";
            const isRising = trend === "Rising" || trend?.toLowerCase().includes("rising");
            const isDeclining = trend === "Declining" || trend?.toLowerCase().includes("declining");
            
            keywordForecastData[forecast.keyword] = {
              score: forecast.opportunity_score || 0,
              trend: trend,
              rise: isRising ? "up" : isDeclining ? "down" : "stable",
              percent: forecast.opportunity_score || 0,
            };
          }
        });
      }
    }

    // Calculate stats
    const allContent = data || [];
    const stats = {
      total: allContent.length,
      published: allContent.filter((c) => c.status === "published").length,
      scheduled: allContent.filter((c) => c.status === "scheduled").length,
      review: allContent.filter((c) => c.status === "review").length,
      draft: allContent.filter((c) => c.status === "draft").length,
    };

    // Format data for UI
    const formattedData = allContent.map((item) => {
      // Get keyword metrics for this content's keywords
      const keywords = item.target_keywords || [];
      const keywordMetrics = keywords.map((kw: string) => ({
        keyword: kw,
        ...(keywordForecastData[kw] || {
          score: 0,
          trend: "stable",
          rise: "stable",
          percent: 0,
        }),
      }));

      return {
        id: item.id,
        title: item.topic || "Untitled",
        type: item.metadata?.contentType || "Article",
        status: item.status || "draft",
        platforms: item.target_platform ? [item.target_platform] : [],
        publishDate: item.scheduled_at || item.created_at,
        performance: {
          views: item.metadata?.performance?.views || 0,
          engagement: item.metadata?.performance?.engagement || 0,
        },
        // Raw data for details
        raw: item,
        published_records: publishedData[item.id] || [],
        keywordMetrics: keywordMetrics,
      };
    });

    return NextResponse.json(
      {
        content: formattedData,
        stats,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Orchestrator GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, contentId, ...actionData } = body;

    if (!action || !contentId) {
      return NextResponse.json(
        { error: "action and contentId are required" },
        { status: 400 }
      );
    }

    // Get content strategy
    const { data: contentStrategy, error: fetchError } = await supabase
      .from("content_strategy")
      .select("*")
      .eq("id", contentId)
      .eq("user_id", session.user.id)
      .single();

    if (fetchError || !contentStrategy) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    let result: any = {};

    switch (action) {
      case "approve":
        // Determine status based on action data
        let newStatus: string;
        if (actionData.scheduledAt) {
          newStatus = "scheduled";
        } else if (actionData.autoPublish === true) {
          newStatus = "published";
        } else {
          newStatus = "review"; // Default to review if no specific option
        }

        const { data: updatedContent, error: updateError } = await supabase
          .from("content_strategy")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
            ...(actionData.scheduledAt && {
              scheduled_at: actionData.scheduledAt,
            }),
          })
          .eq("id", contentId)
          .eq("user_id", session.user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // If publishing, create published_content record and auto-publish to GitHub if enabled
        if (newStatus === "published") {
          const platform = actionData.platform || contentStrategy.target_platform;
          const platformPostId = actionData.platformPostId || null;
          let publishUrl = actionData.publishedUrl || null;
          let gitHubResult = null;
          let redditResult = null;
          let githubIntegration: any = null;
          let redditIntegration: any = null;

          // Auto-publish to GitHub if enabled
          try {
            const { data: githubIntegrationData } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", session.user.id)
              .eq("platform", "github")
              .eq("status", "connected")
              .maybeSingle();

            githubIntegration = githubIntegrationData;

            let githubConfig = githubIntegration
              ? {
                  token: githubIntegration.access_token,
                  owner: githubIntegration.metadata?.owner || githubIntegration.platform_user_id || "",
                  repo: githubIntegration.metadata?.repo || "",
                  branch: githubIntegration.metadata?.branch || "main",
                  verified: githubIntegration.status === "connected",
                }
              : null;

            // Validate GitHub config before attempting to publish
            if (githubConfig && (!githubConfig.token || !githubConfig.owner || !githubConfig.repo)) {
              console.warn("GitHub config incomplete:", {
                hasToken: !!githubConfig.token,
                hasOwner: !!githubConfig.owner,
                hasRepo: !!githubConfig.repo,
              });
              githubConfig = null;
            }

            const autoPublishToGitHub = actionData.autoPublishToGitHub !== false && githubConfig?.verified && githubConfig?.token;

            if (autoPublishToGitHub && githubConfig?.token && githubConfig?.owner && githubConfig?.repo) {
              const gitHubPublishConfig: GitHubConfig = {
                token: githubConfig.token,
                owner: githubConfig.owner,
                repo: githubConfig.repo,
                branch: githubConfig.branch || "main",
              };

              console.log("Attempting GitHub publish with config:", {
                owner: gitHubPublishConfig.owner,
                repo: gitHubPublishConfig.repo,
                hasToken: !!gitHubPublishConfig.token,
              });

              // Discussions don't use labels, but will automatically select "General" category or first available
              gitHubResult = await publishToGitHub(gitHubPublishConfig, {
                title: contentStrategy.topic || "Untitled",
                content: contentStrategy.generated_content || "",
                // categoryId is optional - will auto-select "General" or first available
              });

              console.log("GitHub publish result:", {
                success: gitHubResult.success,
                url: gitHubResult.url,
                discussionNumber: gitHubResult.discussionNumber,
                error: gitHubResult.error,
              });

              if (gitHubResult.success && gitHubResult.url) {
                const urlString = String(gitHubResult.url).trim();
                if (urlString && urlString.length > 0) {
                  publishUrl = urlString;
                  console.log("✅ Published URL set successfully:", publishUrl);
                  console.log("URL type:", typeof publishUrl, "Length:", publishUrl.length);
                  console.log("URL value check:", {
                    original: gitHubResult.url,
                    converted: urlString,
                    isEmpty: urlString.length === 0,
                  });
                } else {
                  console.error("❌ GitHub URL is empty or invalid:", gitHubResult.url);
                  publishUrl = null;
                }
                
                // Update last_used_at for the integration
                if (githubIntegration?.id) {
                  await supabase
                    .from("platform_integrations")
                    .update({ last_used_at: new Date().toISOString() })
                    .eq("id", githubIntegration.id);
                }
              } else {
                console.error("❌ GitHub publish failed:", {
                  success: gitHubResult.success,
                  url: gitHubResult.url,
                  urlType: typeof gitHubResult.url,
                  error: gitHubResult.error,
                });
                publishUrl = null; // Explicitly set to null if failed
              }
            } else {
              console.log("GitHub publishing skipped:", {
                autoPublishToGitHub,
                hasGitHubConfig: !!githubConfig,
                hasToken: !!githubConfig?.token,
                hasOwner: !!githubConfig?.owner,
                hasRepo: !!githubConfig?.repo,
                verified: githubConfig?.verified,
              });
            }
          } catch (githubError: any) {
            console.error("GitHub publish error (approve case):", {
              error: githubError,
              message: githubError.message,
              stack: githubError.stack,
              currentPublishUrl: publishUrl, // Log current value before resetting
            });
            gitHubResult = {
              success: false,
              url: undefined, // Explicitly set to undefined
              discussionNumber: undefined,
              error: githubError.message || "GitHub publish failed",
            };
            
            // Update integration with error
            if (githubIntegration?.id) {
              await supabase
                .from("platform_integrations")
                .update({
                  error_message: githubError.message || "GitHub publish failed",
                  status: "disconnected",
                })
                .eq("id", githubIntegration.id);
            }
            
            // Only reset publishUrl if it wasn't already set from a successful publish
            // This handles the case where publish succeeded but a later error occurred
            if (!publishUrl || publishUrl === actionData.publishedUrl) {
              publishUrl = null;
            } else {
              console.log("⚠️ Keeping publishUrl despite error:", publishUrl);
            }
          }

          // Auto-publish to Reddit if platform is Reddit or if auto-publish is enabled
          if (platform === "reddit" || actionData.autoPublishToReddit === true) {
            try {
              const { data: redditIntegrationData } = await supabase
                .from("platform_integrations")
                .select("*")
                .eq("user_id", session.user.id)
                .eq("platform", "reddit")
              .eq("status", "connected")
              .maybeSingle();

              redditIntegration = redditIntegrationData;

              const redditConfig = redditIntegration
                ? {
                    clientId: redditIntegration.metadata?.clientId || "",
                    clientSecret: redditIntegration.metadata?.clientSecret || "",
                    accessToken: redditIntegration.access_token || "",
                    username: redditIntegration.platform_username || redditIntegration.platform_user_id || "",
                    verified: redditIntegration.status === "connected",
                  }
                : null;

              if (redditConfig && redditConfig.clientId && redditConfig.clientSecret && redditConfig.accessToken) {
                const redditPublishConfig: RedditConfig = {
                  clientId: redditConfig.clientId,
                  clientSecret: redditConfig.clientSecret,
                  accessToken: redditConfig.accessToken,
                  username: redditConfig.username || undefined,
                };

                // Get subreddit from metadata or use default
                const subreddit = actionData.subreddit || contentStrategy.metadata?.subreddit || "test";
                
                redditResult = await publishToReddit(redditPublishConfig, {
                  title: contentStrategy.topic || "Untitled",
                  content: contentStrategy.generated_content || "",
                  subreddit: subreddit,
                  kind: "self", // Text post
                });

                if (redditResult.success && redditResult.url) {
                  // Use Reddit URL if GitHub didn't provide one, or if Reddit is the primary platform
                  if (!publishUrl || platform === "reddit") {
                    publishUrl = redditResult.url;
                  }
                  
                  // Update last_used_at for the integration
                  if (redditIntegration?.id) {
                    await supabase
                      .from("platform_integrations")
                      .update({ last_used_at: new Date().toISOString() })
                      .eq("id", redditIntegration.id);
                  }
                }
              }
            } catch (redditError: any) {
              console.error("Reddit publish error (approve case):", redditError);
              redditResult = {
                success: false,
                error: redditError.message || "Reddit publish failed",
              };
              
              // Update integration with error
              if (redditIntegration?.id) {
                await supabase
                  .from("platform_integrations")
                  .update({
                    error_message: redditError.message || "Reddit publish failed",
                    status: "disconnected",
                  })
                  .eq("id", redditIntegration.id);
              }
            }
          }
          
          console.log("📝 Creating published_content record:", {
            contentId,
            platform,
            publishUrl,
            publishUrlType: typeof publishUrl,
            publishUrlLength: publishUrl?.length,
            hasUrl: !!publishUrl,
            gitHubResult: gitHubResult ? {
              success: gitHubResult.success,
              url: gitHubResult.url,
              discussionNumber: gitHubResult.discussionNumber,
            } : null,
            redditResult: redditResult ? {
              success: redditResult.success,
              url: redditResult.url,
              postId: redditResult.postId,
            } : null,
          });

          // Prepare insert data - ensure published_url is explicitly set
          const insertData: any = {
            user_id: session.user.id,
            content_strategy_id: contentId,
            platform: platform === "github" ? "github" : (platform === "reddit" ? "reddit" : platform),
            published_at: new Date().toISOString(),
            platform_post_id: (platform === "github" ? gitHubResult?.discussionNumber?.toString() : redditResult?.postId) || platformPostId || null,
            error_message: ((gitHubResult && !gitHubResult.success && gitHubResult.error) || (redditResult && !redditResult.success && redditResult.error)) ? (gitHubResult?.error || redditResult?.error) : null,
            metadata: {
              auto_published: true,
              approved_by: session.user.id,
              github: gitHubResult ? {
                success: gitHubResult.success,
                url: gitHubResult.url,
                discussionNumber: gitHubResult.discussionNumber,
                error: gitHubResult.error,
              } : null,
            },
          };

          // Explicitly set published_url - this is critical
          // Double-check publishUrl value before inserting
          console.log("🔍 Final publishUrl check before insert:", {
            publishUrl,
            publishUrlType: typeof publishUrl,
            publishUrlLength: publishUrl?.length,
            isTruthy: !!publishUrl,
            isString: typeof publishUrl === "string",
            isEmptyString: publishUrl === "",
          });

          if (publishUrl && typeof publishUrl === "string" && publishUrl.trim().length > 0) {
            insertData.published_url = publishUrl.trim();
            insertData.status = "published";
            console.log("✅ Setting published_url to:", insertData.published_url);
          } else {
            insertData.published_url = null;
            insertData.status = "pending";
            console.warn("⚠️ publishUrl is invalid, setting published_url to null");
          }

          console.log("📦 Insert data prepared:", {
            user_id: insertData.user_id,
            content_strategy_id: insertData.content_strategy_id,
            platform: insertData.platform,
            published_url: insertData.published_url,
            published_url_type: typeof insertData.published_url,
            published_url_length: insertData.published_url?.length,
            published_url_preview: insertData.published_url?.substring(0, 80),
            status: insertData.status,
            platform_post_id: insertData.platform_post_id,
          });

          const { data: publishedRecord, error: publishError } = await supabase
            .from("published_content")
            .insert(insertData)
            .select()
            .single();

          if (publishError) {
            console.error("Error creating published_content record:", {
              error: publishError,
              code: publishError.code,
              message: publishError.message,
              details: publishError.details,
              hint: publishError.hint,
              publishUrl,
              contentId,
              platform,
              gitHubResult: gitHubResult ? {
                success: gitHubResult.success,
                url: gitHubResult.url,
                error: gitHubResult.error,
              } : null,
            });
            // Throw error so user knows the record wasn't created
            throw new Error(`Failed to save published content record: ${publishError.message}`);
          } else {
            console.log("Published content record created successfully:", {
              id: publishedRecord?.id,
              published_url: publishedRecord?.published_url,
              platform_post_id: publishedRecord?.platform_post_id,
              status: publishedRecord?.status,
            });
            
            // Verify the URL was actually saved
            if (publishUrl && !publishedRecord?.published_url) {
              console.error("WARNING: publishUrl was set but not saved to database!", {
                publishUrl,
                saved_url: publishedRecord?.published_url,
                record_id: publishedRecord?.id,
              });
            }
          }

          result = {
            success: true,
            content: updatedContent,
            published_record: publishedRecord,
            github: gitHubResult,
            reddit: redditResult,
            message: (gitHubResult?.success || redditResult?.success)
              ? (gitHubResult?.success ? "Content approved and published to GitHub" : "Content approved and published to Reddit")
              : publishUrl 
              ? "Content approved and published" 
              : "Content approved (publish failed)",
          };
        } else {
          const statusMessages = {
            scheduled: "Content scheduled successfully",
            review: "Content moved to review",
          };
          result = {
            success: true,
            content: updatedContent,
            message: statusMessages[newStatus as keyof typeof statusMessages] || "Content approved",
          };
        }
        break;

      case "reject":
        const { data: rejectedContent, error: rejectError } = await supabase
          .from("content_strategy")
          .update({
            status: "draft",
            updated_at: new Date().toISOString(),
            metadata: {
              ...contentStrategy.metadata,
              rejection_reason: actionData.reason || null,
              rejected_at: new Date().toISOString(),
            },
          })
          .eq("id", contentId)
          .eq("user_id", session.user.id)
          .select()
          .single();

        if (rejectError) throw rejectError;

        result = {
          success: true,
          content: rejectedContent,
          message: "Content rejected and moved back to draft",
        };
        break;

      case "delete":
        // Delete published_content records first
        await supabase
          .from("published_content")
          .delete()
          .eq("content_strategy_id", contentId)
          .eq("user_id", session.user.id);

        // Delete content_strategy record
        const { error: deleteError } = await supabase
          .from("content_strategy")
          .delete()
          .eq("id", contentId)
          .eq("user_id", session.user.id);

        if (deleteError) throw deleteError;

        result = {
          success: true,
          message: "Content deleted successfully",
        };
        break;

      case "publish":
        // Publish content and create published_content record
        const publishPlatform = actionData.platform || contentStrategy.target_platform;
        let publishUrl = actionData.publishedUrl || null;
        const platformPostId = actionData.platformPostId || null;
        let gitHubResult = null;
        let redditResult = null;
        let githubIntegration: any = null;
        let redditIntegration: any = null;

        // Auto-publish to GitHub if platform is GitHub or if auto-publish is enabled
        if (publishPlatform === "github" || actionData.autoPublishToGitHub === true) {
          try {
            // Get GitHub integration from platform_integrations table
            const { data: githubIntegrationData } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", session.user.id)
              .eq("platform", "github")
              .eq("status", "connected")
              .maybeSingle();

            githubIntegration = githubIntegrationData;

            const githubConfig = githubIntegration
              ? {
                  token: githubIntegration.access_token,
                  owner: githubIntegration.metadata?.owner || githubIntegration.platform_user_id || "",
                  repo: githubIntegration.metadata?.repo || "",
                  branch: githubIntegration.metadata?.branch || "main",
                  verified: githubIntegration.status === "connected",
                }
              : null;
            
            if (githubConfig && githubConfig.token && githubConfig.owner && githubConfig.repo) {
              const gitHubPublishConfig: GitHubConfig = {
                token: githubConfig.token,
                owner: githubConfig.owner,
                repo: githubConfig.repo,
                branch: githubConfig.branch || "main",
              };

              // Discussions don't use labels, but will automatically select "General" category or first available
              gitHubResult = await publishToGitHub(gitHubPublishConfig, {
                title: contentStrategy.topic || "Untitled",
                content: contentStrategy.generated_content || "",
                // categoryId is optional - will auto-select "General" or first available
              });

              if (gitHubResult.success && gitHubResult.url) {
                publishUrl = gitHubResult.url;
                
                // Update last_used_at for the integration
                if (githubIntegration?.id) {
                  await supabase
                    .from("platform_integrations")
                    .update({ last_used_at: new Date().toISOString() })
                    .eq("id", githubIntegration.id);
                }
              }
            }
          } catch (githubError: any) {
            console.error("GitHub publish error:", githubError);
            // Don't fail the entire publish if GitHub fails
            gitHubResult = {
              success: false,
              error: githubError.message || "GitHub publish failed",
            };
            
            // Update integration with error
            if (githubIntegration?.id) {
              await supabase
                .from("platform_integrations")
                .update({
                  error_message: githubError.message || "GitHub publish failed",
                  status: "disconnected",
                })
                .eq("id", githubIntegration.id);
            }
          }
        }

        // Auto-publish to Reddit if platform is Reddit or if auto-publish is enabled
        if (publishPlatform === "reddit" || actionData.autoPublishToReddit === true) {
          try {
            // Get Reddit integration from platform_integrations table
            const { data: redditIntegrationData } = await supabase
              .from("platform_integrations")
              .select("*")
              .eq("user_id", session.user.id)
              .eq("platform", "reddit")
              .eq("status", "connected")
              .maybeSingle();

            redditIntegration = redditIntegrationData;

            const redditConfig = redditIntegration
              ? {
                  clientId: redditIntegration.metadata?.clientId || "",
                  clientSecret: redditIntegration.metadata?.clientSecret || "",
                  accessToken: redditIntegration.access_token || "",
                  username: redditIntegration.platform_username || redditIntegration.platform_user_id || "",
                  verified: redditIntegration.status === "connected",
                }
              : null;
            
            if (redditConfig && redditConfig.clientId && redditConfig.clientSecret && redditConfig.accessToken) {
              const redditPublishConfig: RedditConfig = {
                clientId: redditConfig.clientId,
                clientSecret: redditConfig.clientSecret,
                accessToken: redditConfig.accessToken,
                username: redditConfig.username || undefined,
              };

              // Get subreddit from metadata or use default
              const subreddit = actionData.subreddit || contentStrategy.metadata?.subreddit || "test"; // Default to "test" for safety
              
              redditResult = await publishToReddit(redditPublishConfig, {
                title: contentStrategy.topic || "Untitled",
                content: contentStrategy.generated_content || "",
                subreddit: subreddit,
                kind: "self", // Text post
              });

              if (redditResult.success && redditResult.url) {
                // Use Reddit URL if GitHub didn't provide one, or if Reddit is the primary platform
                if (!publishUrl || publishPlatform === "reddit") {
                  publishUrl = redditResult.url;
                }
                
                // Update last_used_at for the integration
                if (redditIntegration?.id) {
                  await supabase
                    .from("platform_integrations")
                    .update({ last_used_at: new Date().toISOString() })
                    .eq("id", redditIntegration.id);
                }
              }
            }
          } catch (redditError: any) {
            console.error("Reddit publish error:", redditError);
            // Don't fail the entire publish if Reddit fails
            redditResult = {
              success: false,
              error: redditError.message || "Reddit publish failed",
            };
            
            // Update integration with error
            if (redditIntegration?.id) {
              await supabase
                .from("platform_integrations")
                .update({
                  error_message: redditError.message || "Reddit publish failed",
                  status: "disconnected",
                })
                .eq("id", redditIntegration.id);
            }
          }
        }

        console.log("Creating published_content record (publish case):", {
          contentId,
          platform: publishPlatform,
          publishUrl,
          hasUrl: !!publishUrl,
          gitHubResult: gitHubResult ? {
            success: gitHubResult.success,
            url: gitHubResult.url,
            discussionNumber: gitHubResult.discussionNumber,
          } : null,
          redditResult: redditResult ? {
            success: redditResult.success,
            url: redditResult.url,
            postId: redditResult.postId,
          } : null,
        });

        const { data: publishedRecord, error: publishRecordError } = await supabase
          .from("published_content")
          .insert({
            user_id: session.user.id,
            content_strategy_id: contentId,
            platform: publishPlatform,
            published_url: publishUrl,
            published_at: new Date().toISOString(),
            status: publishUrl ? "published" : "pending",
            platform_post_id: (publishPlatform === "github" ? gitHubResult?.discussionNumber?.toString() : redditResult?.postId) || platformPostId || null,
            error_message: (gitHubResult?.error || redditResult?.error) || actionData.errorMessage || null,
            metadata: {
              ...contentStrategy.metadata,
              published_by: session.user.id,
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
            },
          })
          .select()
          .single();

        if (publishRecordError) {
          console.error("Error creating published_content record (publish case):", {
            error: publishRecordError,
            code: publishRecordError.code,
            message: publishRecordError.message,
            details: publishRecordError.details,
            hint: publishRecordError.hint,
            publishUrl,
            contentId,
          });
          throw publishRecordError;
        } else {
          console.log("Published content record created successfully (publish case):", {
            id: publishedRecord?.id,
            published_url: publishedRecord?.published_url,
            platform_post_id: publishedRecord?.platform_post_id,
          });
        }

        // Update content_strategy status
        const { data: publishedContent, error: statusError } = await supabase
          .from("content_strategy")
          .update({
            status: "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", contentId)
          .eq("user_id", session.user.id)
          .select()
          .single();

        if (statusError) {
          console.error("Error updating content_strategy:", statusError);
        }

        result = {
          success: true,
          published_record: publishedRecord,
          content: publishedContent,
          github: gitHubResult,
          message: gitHubResult?.success 
            ? "Content published successfully to GitHub" 
            : publishUrl 
            ? "Content published successfully" 
            : "Content published (GitHub publish failed)",
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Orchestrator POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

