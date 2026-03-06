import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import performance tracker functions (adapted for Deno)
// Since we can't directly import from lib/, we'll implement them inline

interface InstagramMetrics {
  likes: number;
  comments: number;
  reach?: number;
  impressions?: number;
  engagement?: number;
  saved?: number;
  shares?: number;
}

interface FacebookMetrics {
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  views?: number;
  clicks?: number;
  impressions?: number;
  engagement?: number;
}

interface LinkedInMetrics {
  likes: number;
  comments: number;
  shares: number;
  engagement?: number;
}

interface GitHubMetrics {
  reactions: number;
  comments: number;
  upvotes: number;
  engagement?: number;
}

interface XMetrics {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  engagement?: number;
}

/** Shopify: article info + optional store-level sessions from analytics (read_reports scope). */
interface ShopifyMetrics {
  views: number;
  engagement: number;
  published_at?: string;
  updated_at?: string;
  /** Store-level sessions (e.g. last 30d) when read_reports scope is granted. */
  store_sessions?: number;
  note?: string;
}

/** WordPress.com post stats: views (stats API), likes + comments (post + replies API). */
interface WordPressComMetrics {
  views: number;
  likes: number;
  comments: number;
  engagement?: number;
  note?: string;
}

/**
 * Fetch WordPress.com post views via Stats API, then likes and comment count via Post + Replies APIs.
 */
async function fetchWordPressComMetrics(
  siteId: string,
  postId: string,
  accessToken: string
): Promise<WordPressComMetrics> {
  const base = `https://public-api.wordpress.com/rest/v1.1/sites/${encodeURIComponent(siteId)}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // 1) Views from stats/post
  const statsUrl = `${base}/stats/post/${encodeURIComponent(postId)}`;
  const statsRes = await fetch(statsUrl, { method: "GET", headers });
  if (!statsRes.ok) {
    const errBody = await statsRes.text();
    let errMsg = `WordPress.com stats API error: ${statsRes.status}`;
    try {
      const errJson = JSON.parse(errBody);
      errMsg = errJson.message || errJson.error || errMsg;
    } catch (_) {
      if (errBody) errMsg += ` - ${errBody.substring(0, 200)}`;
    }
    throw new Error(errMsg);
  }
  const statsData = await statsRes.json();
  let totalViews = 0;
  if (statsData.years && Array.isArray(statsData.years)) {
    for (const y of statsData.years) {
      if (y.months && Array.isArray(y.months)) {
        for (const m of y.months) {
          if (typeof m.views === "number") totalViews += m.views;
          if (m.days && Array.isArray(m.days)) {
            for (const d of m.days) {
              if (typeof d.views === "number") totalViews += d.views;
            }
          }
        }
      }
    }
  }
  if (statsData.weeks && Array.isArray(statsData.weeks)) {
    for (const w of statsData.weeks) {
      if (w.days && Array.isArray(w.days)) {
        for (const d of w.days) {
          if (typeof d.views === "number") totalViews += d.views;
        }
      }
    }
  }

  // 2) Likes from post object (like_count)
  let likes = 0;
  const postUrl = `${base}/posts/${encodeURIComponent(postId)}`;
  const postRes = await fetch(postUrl, { method: "GET", headers });
  if (postRes.ok) {
    const postData = await postRes.json();
    if (typeof postData.like_count === "number") likes = postData.like_count;
  }

  // 3) Comment count from post replies (found)
  let comments = 0;
  const repliesUrl = `${base}/posts/${encodeURIComponent(postId)}/replies/?number=1`;
  const repliesRes = await fetch(repliesUrl, { method: "GET", headers });
  if (repliesRes.ok) {
    const repliesData = await repliesRes.json();
    if (typeof repliesData.found === "number") comments = repliesData.found;
  }

  const engagement = totalViews + likes + comments;
  console.log(
    `✅ WordPress.com post ${postId}: views=${totalViews} likes=${likes} comments=${comments}`
  );
  return { views: totalViews, likes, comments, engagement };
}

/**
 * Resolve WordPress.com site ID for a Jetpack-connected self-hosted site by URL.
 * Calls GET /me/sites and returns the site ID whose URL/domain/slug matches (by hostname).
 */
async function getWordPressComSiteIdByUrl(
  accessToken: string,
  siteUrl: string
): Promise<string | null> {
  const url = "https://public-api.wordpress.com/rest/v1.1/me/sites";
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errText = await response.text();
    console.warn(
      `WordPress.com /me/sites failed: ${response.status}`,
      errText?.substring?.(0, 200)
    );
    return null;
  }
  const data = await response.json();
  const sites = data.sites || [];
  const normalize = (u: string) => {
    if (!u || typeof u !== "string") return "";
    try {
      const s = String(u).trim().toLowerCase();
      const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
      const host = new URL(withScheme).hostname.replace(/^www\./, "");
      return host;
    } catch {
      return "";
    }
  };
  const targetHost = normalize(siteUrl);
  if (!targetHost) {
    console.warn("WordPress.com Jetpack resolve: empty target host from", siteUrl);
    return null;
  }
  console.log(
    `WordPress.com Jetpack resolve: targetHost=${targetHost}, sites count=${sites.length}`
  );
  for (const site of sites) {
    const siteUrlRaw = site.URL ?? site.url ?? site.domain ?? site.slug ?? "";
    const siteHost = normalize(siteUrlRaw);
    if (siteHost && siteHost === targetHost && site.ID != null) {
      console.log(
        `WordPress.com Jetpack resolve: matched site ID=${site.ID} (URL=${site.URL ?? site.url ?? siteUrlRaw})`
      );
      return String(site.ID);
    }
  }
  const sampleUrls = sites.slice(0, 5).map((s: any) => s.URL ?? s.url ?? s.domain ?? s.slug ?? "");
  console.warn(
    `WordPress.com Jetpack resolve: no match for ${targetHost}. Sample site URLs:`,
    sampleUrls
  );
  return null;
}

/**
 * Resolve blog Id and article Id from a Shopify published_url (e.g. https://store.myshopify.com/blogs/news/my-post).
 * Uses REST: list blogs (match handle), then list articles for that blog (match handle).
 */
async function resolveShopifyIdsFromUrl(
  shopDomain: string,
  accessToken: string,
  publishedUrl: string
): Promise<{ blogId: number; articleId: number } | null> {
  try {
    const url = publishedUrl.replace(/^https?:\/\//, "").split("/");
    const blogsIdx = url.findIndex((s) => s === "blogs");
    if (blogsIdx < 0 || blogsIdx + 2 > url.length) return null;
    const blogHandle = url[blogsIdx + 1];
    const articleHandle = url[blogsIdx + 2]?.split("?")[0];
    if (!blogHandle || !articleHandle) return null;

    const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const base = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

    const blogsRes = await fetch(`https://${base}/admin/api/2024-01/blogs.json?limit=250`, {
      method: "GET",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
    });
    if (!blogsRes.ok) return null;
    const blogsData = await blogsRes.json();
    const blogs = blogsData.blogs || [];
    const blog = blogs.find((b: any) => (b.handle || "").toLowerCase() === blogHandle.toLowerCase());
    if (!blog) return null;

    const articlesRes = await fetch(
      `https://${base}/admin/api/2024-01/blogs/${blog.id}/articles.json?limit=250`,
      {
        method: "GET",
        headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      }
    );
    if (!articlesRes.ok) return null;
    const articlesData = await articlesRes.json();
    const articles = articlesData.articles || [];
    const article = articles.find((a: any) => (a.handle || "").toLowerCase() === articleHandle.toLowerCase());
    if (!article) return null;

    return { blogId: blog.id, articleId: article.id };
  } catch (_) {
    return null;
  }
}

/**
 * Fetch store-level sessions via ShopifyQL (requires read_reports scope). Returns undefined if scope missing or query fails.
 */
async function fetchShopifySessionsViaAnalytics(
  shopDomain: string,
  accessToken: string
): Promise<number | undefined> {
  const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const base = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;
  const graphqlUrl = `https://${base}/admin/api/2024-01/graphql.json`;
  const query = `FROM sessions
  SHOW sessions
  SINCE -30d`;
  const gql = `query { shopifyqlQuery(query: ${JSON.stringify(query)}) { tableData { columns { name dataType displayName } rows } parseErrors } }`;

  try {
    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: gql }),
    });
    if (!response.ok) return undefined;
    const data = await response.json();
    const errors = data?.errors || data?.data?.shopifyqlQuery?.parseErrors;
    if (errors?.length) {
      console.log("ShopifyQL parse/errors:", errors);
      return undefined;
    }
    const rows = data?.data?.shopifyqlQuery?.tableData?.rows as unknown[] | undefined;
    const columns = data?.data?.shopifyqlQuery?.tableData?.columns as { name: string }[] | undefined;
    if (!Array.isArray(rows) || rows.length === 0) return undefined;
    const sessionsIdx = columns?.findIndex((c) => c.name === "sessions") ?? 0;
    let total = 0;
    for (const row of rows) {
      const arr = Array.isArray(row) ? row : Object.values(row as object);
      const val = Number(arr[sessionsIdx]);
      if (!Number.isNaN(val)) total += val;
    }
    return total;
  } catch (e) {
    console.warn("Shopify analytics (sessions) failed:", e);
    return undefined;
  }
}

/**
 * Fetch Shopify blog article (REST) and optionally store-level sessions (GraphQL ShopifyQL when read_reports is granted).
 */
async function fetchShopifyMetrics(
  shopDomain: string,
  blogId: number,
  articleId: string,
  accessToken: string
): Promise<ShopifyMetrics> {
  try {
    const shop = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const base = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;
    const url = `https://${base}/admin/api/2024-01/blogs/${blogId}/articles/${articleId}.json`;
    console.log(`📊 Fetching Shopify article: blog ${blogId}, article ${articleId}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `Shopify API error: ${response.status}`;
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.errors || errJson.error || errMsg;
      } catch (_) {
        if (errBody) errMsg += ` - ${errBody.substring(0, 200)}`;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const article = data?.article;
    if (!article) throw new Error("Shopify API did not return article data");

    const published_at = article.published_at ?? article.created_at;
    const updated_at = article.updated_at;

    let store_sessions: number | undefined;
    try {
      store_sessions = await fetchShopifySessionsViaAnalytics(shopDomain, accessToken);
      if (store_sessions !== undefined) console.log(`✅ Shopify store sessions (last 30d): ${store_sessions}`);
    } catch (_) {
      // ignore
    }

    const note = store_sessions !== undefined
      ? "Per-article view counts are not available; store sessions (last 30d) shown when analytics scope is granted."
      : undefined;

    return {
      views: 0,
      engagement: 0,
      published_at: published_at || undefined,
      updated_at: updated_at || undefined,
      store_sessions,
      note,
    };
  } catch (error: any) {
    console.error("❌ Error fetching Shopify article:", error);
    throw error;
  }
}

/**
 * Fetch X (Twitter) tweet metrics using API v2 (public_metrics: likes, retweets, replies, quotes)
 */
async function fetchXMetrics(tweetId: string, accessToken: string): Promise<XMetrics> {
  try {
    const id = tweetId.trim();
    if (!id) throw new Error("Tweet ID is required");
    console.log(`📊 Fetching X (Twitter) metrics for tweet ID: ${id}`);

    const url = `https://api.x.com/2/tweets/${encodeURIComponent(id)}?tweet.fields=public_metrics`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `X API error: ${response.status}`;
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.detail || errJson.title || errJson.error?.message || errMsg;
      } catch (_) {
        if (errBody) errMsg += ` - ${errBody.substring(0, 200)}`;
      }
      throw new Error(errMsg);
    }

    const result = await response.json();
    const tweet = result?.data;
    if (!tweet) throw new Error("X API did not return tweet data");

    const pm = tweet.public_metrics || {};
    const like_count = typeof pm.like_count === "number" ? pm.like_count : 0;
    const retweet_count = typeof pm.retweet_count === "number" ? pm.retweet_count : 0;
    const reply_count = typeof pm.reply_count === "number" ? pm.reply_count : 0;
    const quote_count = typeof pm.quote_count === "number" ? pm.quote_count : 0;
    const engagement = like_count + retweet_count + reply_count + quote_count;

    console.log(`✅ X metrics: likes=${like_count} retweets=${retweet_count} replies=${reply_count} quotes=${quote_count} engagement=${engagement}`);

    return {
      like_count,
      retweet_count,
      reply_count,
      quote_count,
      engagement,
    };
  } catch (error: any) {
    console.error("❌ Error fetching X metrics:", error);
    throw error;
  }
}

/**
 * Fetch GitHub Discussion metrics using GraphQL API
 */
async function fetchGitHubMetrics(
  discussionNumber: string,
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubMetrics> {
  try {
    console.log(`📊 Fetching GitHub metrics for Discussion #${discussionNumber}`);
    console.log(`📊 Repository: ${owner}/${repo}`);

    // GitHub GraphQL query to get discussion metrics
    const query = `
      query GetDiscussion($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          discussion(number: $number) {
            id
            number
            reactions {
              totalCount
            }
            comments {
              totalCount
            }
            upvoteCount
          }
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "GeoRepute.ai",
      },
      body: JSON.stringify({
        query,
        variables: {
          owner,
          repo,
          number: parseInt(discussionNumber, 10),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `${errorMessage} - ${errorText.substring(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (result.errors) {
      const errorMessage = result.errors[0]?.message || "GraphQL error";
      console.error("GraphQL errors:", JSON.stringify(result.errors, null, 2));
      throw new Error(errorMessage);
    }

    const discussion = result.data?.repository?.discussion;
    if (!discussion) {
      throw new Error(`Discussion #${discussionNumber} not found in repository ${owner}/${repo}`);
    }

    // Log the full discussion object for debugging
    console.log(`📊 Full discussion object:`, JSON.stringify(discussion, null, 2));

    const reactions = discussion.reactions?.totalCount || 0;
    const comments = discussion.comments?.totalCount || 0;
    // upvoteCount might be null or undefined, handle both cases
    const upvotes = discussion.upvoteCount !== null && discussion.upvoteCount !== undefined 
      ? discussion.upvoteCount 
      : 0;

    console.log(`📊 Raw values:`, {
      reactions: discussion.reactions?.totalCount,
      comments: discussion.comments?.totalCount,
      upvoteCount: discussion.upvoteCount,
      upvoteCountType: typeof discussion.upvoteCount,
    });

    console.log(`✅ GitHub metrics extracted: ${reactions} reactions, ${comments} comments, ${upvotes} upvotes`);

    // Calculate engagement (reactions + comments + upvotes)
    const totalEngagement = reactions + comments + upvotes;
    const engagement = totalEngagement > 0 ? Number(totalEngagement.toFixed(2)) : 0;

    const metrics: GitHubMetrics = {
      reactions,
      comments,
      upvotes,
      engagement,
    };

    console.log(`📊 Final GitHub metrics:`, metrics);

    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching GitHub metrics:', error);
    throw new Error(`Failed to fetch GitHub metrics: ${error.message}`);
  }
}

/**
 * Fetch LinkedIn post metrics using Social Actions API
 */
async function fetchLinkedInMetrics(
  ugcPostId: string,
  accessToken: string,
  authorUrn?: string,
  tokenAuthorUrn?: string
): Promise<LinkedInMetrics> {
  try {
    console.log(`📊 Fetching LinkedIn metrics for Post ID: ${ugcPostId}`);

    // ✅ 1️⃣ ONLY support UGC posts (hard rule)
    // Extract URN from URL if needed, then validate
    let postId = ugcPostId.trim();
    
    // Extract URN from LinkedIn URL if it's a full URL
    if (postId.includes('linkedin.com/feed/update/')) {
      const urlMatch = postId.match(/linkedin\.com\/feed\/update\/(urn:li:(?:ugcPost|share):[^\/]+)/);
      if (urlMatch && urlMatch[1]) {
        postId = urlMatch[1];
        console.log(`📋 Extracted URN from URL: ${postId}`);
      } else {
        const numericMatch = postId.match(/linkedin\.com\/feed\/update\/(\d+)/);
        if (numericMatch && numericMatch[1]) {
          postId = `urn:li:ugcPost:${numericMatch[1]}`;
          console.log(`📋 Extracted numeric ID from URL and formatted as UGC Post URN: ${postId}`);
        }
      }
    } else if (postId && !postId.includes(':')) {
      // Plain numeric ID - format as UGC Post
      postId = `urn:li:ugcPost:${postId}`;
      console.log(`📋 Formatted plain ID to UGC Post URN: ${postId}`);
    }

    // HARD RULE: Only UGC posts are supported
    if (!postId.startsWith("urn:li:ugcPost:")) {
      throw new Error(
        "LinkedIn metrics are only available for UGC posts created via API. Share posts (urn:li:share:) cannot be tracked."
      );
    }

    console.log(`✅ Validated UGC Post ID: ${postId}`);

    // ✅ 4️⃣ Ensure token owner = post author
    if (authorUrn && tokenAuthorUrn) {
      if (tokenAuthorUrn !== authorUrn) {
        throw new Error(
          `Access token does not belong to post author. Token owner: ${tokenAuthorUrn}, Post author: ${authorUrn}`
        );
      }
      console.log(`✅ Token owner matches post author: ${authorUrn}`);
    } else {
      console.warn(`⚠️ Author URN validation skipped (authorUrn or tokenAuthorUrn not provided)`);
    }

    // Note: LinkedIn metrics may take time to populate after posting
    // If metrics return 0, they may not be available yet (try again later)

    // Fetch social actions (likes, comments) using Social Actions REST API
    // Note: w_member_social scope allows reading social actions for posts created via UGC Posts API
    // Use separate REST API endpoints for each metric type
    
    // Use REST API endpoints (not v2) - separate calls for each metric type
    const encodedPostId = encodeURIComponent(postId);
    const baseUrl = `https://api.linkedin.com/rest/socialActions/${encodedPostId}`;
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202409', // Use latest API version
    };
    
    let likes = 0;
    let comments = 0;
    let shares = 0;
    
    // Fetch likes
    try {
      const likesUrl = `${baseUrl}/likes`;
      console.log(`📊 Fetching likes from: ${likesUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
      
      const likesResponse = await fetch(likesUrl, { headers });
      
      if (likesResponse.ok) {
        const likesData = await likesResponse.json();
        console.log(`📊 Likes response:`, JSON.stringify(likesData, null, 2));
        
        // Handle paginated response - LinkedIn returns elements array with paging info
        if (likesData.elements && Array.isArray(likesData.elements)) {
          likes = likesData.paging?.total || likesData.elements.length;
        } else if (likesData.total !== undefined) {
          likes = likesData.total;
        } else if (typeof likesData === 'number') {
          likes = likesData;
        }
        console.log(`✅ Extracted ${likes} likes`);
      } else {
        const errorData = await likesResponse.json().catch(() => ({}));
        console.warn(`⚠️ Could not fetch likes: ${likesResponse.status} - ${errorData.message || errorData.error?.message || 'Unknown error'}`);
      }
    } catch (likesError: any) {
      console.warn(`⚠️ Error fetching likes:`, likesError.message);
    }
    
    // Fetch comments
    try {
      const commentsUrl = `${baseUrl}/comments`;
      console.log(`📊 Fetching comments from: ${commentsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
      
      const commentsResponse = await fetch(commentsUrl, { headers });
      
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        console.log(`📊 Comments response:`, JSON.stringify(commentsData, null, 2));
        
        // Handle paginated response
        if (commentsData.elements && Array.isArray(commentsData.elements)) {
          comments = commentsData.paging?.total || commentsData.elements.length;
        } else if (commentsData.total !== undefined) {
          comments = commentsData.total;
        } else if (typeof commentsData === 'number') {
          comments = commentsData;
        }
        console.log(`✅ Extracted ${comments} comments`);
      } else {
        const errorData = await commentsResponse.json().catch(() => ({}));
        const errorMsg = errorData.message || errorData.error?.message || 'Unknown error';
        console.warn(`⚠️ Could not fetch comments: ${commentsResponse.status} - ${errorMsg}`);
        
        // Check for permission errors
        if (commentsResponse.status === 403) {
          console.error(`❌ Permission denied for comments. Ensure w_member_social scope is granted.`);
        }
      }
    } catch (commentsError: any) {
      console.warn(`⚠️ Error fetching comments:`, commentsError.message);
    }
    
    // ✅ 2️⃣ STOP calling the shares endpoint
    // LinkedIn does not reliably expose share counts via Social Actions API
    shares = 0;
    console.log(`ℹ️ Shares set to 0 (LinkedIn does not reliably expose share counts)`);
    
    // ✅ 5️⃣ Treat comments as optional - already handled with try-catch above
    // Comments may return 403 or 0, which is acceptable
    
    // If all requests failed, provide helpful error message
    if (likes === 0 && comments === 0) {
      console.warn(`⚠️ All metric requests returned 0 or failed.`);
      console.warn(`   This might indicate:`);
      console.warn(`   1. Post is too new and metrics haven't populated yet (try again later)`);
      console.warn(`   2. w_member_social scope is not properly granted`);
      console.warn(`   3. Post was not created via UGC Posts API`);
    }

    console.log(`✅ LinkedIn metrics extracted: ${likes} likes, ${comments} comments, ${shares} shares`);

    // ✅ 6️⃣ Final expected output (REALISTIC)
    // Calculate engagement (likes + comments only - shares always 0)
    const totalEngagement = likes + comments;
    const engagement = totalEngagement > 0 ? Number((totalEngagement).toFixed(2)) : 0;

    const metrics: LinkedInMetrics = {
      likes,
      comments,
      shares,
      engagement,
    };

    console.log(`📊 Final LinkedIn metrics:`, metrics);
    
    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching LinkedIn metrics:', error);
    throw new Error(`Failed to fetch LinkedIn metrics: ${error.message}`);
  }
}

/**
 * Fetch Instagram post metrics using Graph API
 */
async function fetchInstagramMetrics(
  mediaId: string,
  accessToken: string,
  instagramAccountId: string
): Promise<InstagramMetrics> {
  try {
    console.log(`📊 Fetching Instagram metrics for media ID: ${mediaId}`);

    // Get basic metrics (likes, comments)
    const basicMetricsUrl = `https://graph.facebook.com/v24.0/${mediaId}?fields=like_count,comments_count&access_token=${accessToken}`;
    
    const basicResponse = await fetch(basicMetricsUrl);
    if (!basicResponse.ok) {
      const errorData = await basicResponse.json().catch(() => ({}));
      throw new Error(`Instagram API error: ${basicResponse.status} - ${errorData.error?.message || 'Failed to fetch basic metrics'}`);
    }
    
    const basicData = await basicResponse.json();
    const likes = basicData.like_count || 0;
    const comments = basicData.comments_count || 0;

    console.log(`✅ Basic metrics: ${likes} likes, ${comments} comments`);

    // Get insights (reach, impressions, saved, shares)
    // Note: Instagram insights may have delays - saves and shares can take hours to update
    let reach: number | undefined = undefined;
    let impressions: number | undefined = undefined;
    let saved: number | undefined = undefined;
    let shares: number | undefined = undefined;

    try {
      // Request insights metrics - saved and shares are only available through insights endpoint
      // Note: Even with correct permissions, Instagram insights can take 24-48 hours to update
      const insightsUrl = `https://graph.facebook.com/v24.0/${mediaId}/insights?metric=impressions,reach,engagement,saved,shares&access_token=${accessToken}`;
      console.log(`📊 Fetching Instagram insights (saved & shares require insights endpoint)...`);
      console.log(`📊 URL: ${insightsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
      
      const insightsResponse = await fetch(insightsUrl);
      const responseStatus = insightsResponse.status;
      console.log(`📊 Insights API response status: ${responseStatus}`);
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        
        console.log(`📊 Raw Instagram insights response:`, JSON.stringify(insightsData, null, 2));
        
        if (insightsData.data && Array.isArray(insightsData.data)) {
          console.log(`📊 Found ${insightsData.data.length} insight metrics`);
          
          // Track which metrics we found
          const foundMetrics: string[] = [];
          
          insightsData.data.forEach((metric: any) => {
            const value = metric.values?.[0]?.value || 0;
            const metricName = metric.name;
            foundMetrics.push(metricName);
            
            console.log(`📊 Processing metric: ${metricName} = ${value} (title: ${metric.title || 'N/A'}, description: ${metric.description || 'N/A'})`);
            
            switch (metricName) {
              case 'impressions':
                impressions = value;
                break;
              case 'reach':
                reach = value;
                break;
              case 'saved':
                saved = value;
                console.log(`✅ Found saved metric: ${saved}`);
                break;
              case 'shares':
                shares = value;
                console.log(`✅ Found shares metric: ${shares}`);
                break;
              case 'engagement':
                // Engagement is a combined metric, we calculate our own
                break;
              default:
                console.log(`ℹ️ Unknown metric: ${metricName} = ${value}`);
            }
          });
          
          console.log(`📊 Metrics found in response: ${foundMetrics.join(', ')}`);
          
          // Check if saved/shares were requested but not returned
          if (!foundMetrics.includes('saved')) {
            console.warn(`⚠️ 'saved' metric was requested but not found in response`);
            console.warn(`   This is normal - Instagram may not have processed saves yet (can take 24-48 hours)`);
          }
          if (!foundMetrics.includes('shares')) {
            console.warn(`⚠️ 'shares' metric was requested but not found in response`);
            console.warn(`   This is normal - Instagram may not have processed shares yet (can take 24-48 hours)`);
          }
        } else {
          console.warn(`⚠️ Instagram insights data is not in expected format:`, insightsData);
        }

        console.log(`✅ Insights summary: ${impressions || 0} impressions, ${reach || 0} reach, ${saved !== undefined ? saved : 'N/A (not available yet)'} saved, ${shares !== undefined ? shares : 'N/A (not available yet)'} shares`);
      } else {
        const errorData = await insightsResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        const errorCode = errorData.error?.code;
        const errorType = errorData.error?.type;
        
        console.warn(`⚠️ Instagram insights API error:`, {
          status: responseStatus,
          code: errorCode,
          type: errorType,
          message: errorMessage,
          fullError: errorData
        });
        
        // Check if it's a permission issue
        if (errorCode === 10 || errorCode === 200 || errorMessage.includes('permission') || errorMessage.includes('insights') || errorMessage.includes('OAuthException')) {
          console.warn(`⚠️ Instagram insights permission issue detected`);
          console.warn(`⚠️ Verify that 'instagram_manage_insights' scope is granted and user has re-authenticated`);
        }
        
        // Check if insights aren't available yet (common for new posts)
        if (errorCode === 100 || errorCode === 190 || errorMessage.includes('not available') || errorMessage.includes('too early') || errorMessage.includes('insufficient')) {
          console.warn(`ℹ️ Instagram insights not available yet - this is normal for new posts`);
          console.warn(`ℹ️ Saves and shares typically update within 24-48 hours after posting`);
          console.warn(`ℹ️ Likes and comments are available immediately, but saves/shares require insights processing`);
        }
      }
    } catch (insightsError: any) {
      console.warn('⚠️ Exception while fetching Instagram insights:', insightsError.message);
      console.warn('ℹ️ This is normal if the post is very new or insights are still processing');
      console.warn('ℹ️ Instagram insights (saves/shares) can take 24-48 hours to become available');
    }

    // Calculate engagement rate
    const engagement = impressions && impressions > 0 
      ? Number((((likes + comments) / impressions) * 100).toFixed(2))
      : undefined;

    // Return metrics
    // Note: saved and shares may be undefined if insights aren't available yet
    // Instagram insights can take 24-48 hours to update for new posts
    const metrics = {
      likes,
      comments,
      reach,
      impressions,
      engagement,
      saved: saved !== undefined ? saved : undefined, // Keep undefined if not available (not 0)
      shares: shares !== undefined ? shares : undefined, // Keep undefined if not available (not 0)
    };
    
    console.log(`📊 Final Instagram metrics:`, {
      likes: metrics.likes,
      comments: metrics.comments,
      saved: metrics.saved !== undefined ? metrics.saved : 'Not available yet',
      shares: metrics.shares !== undefined ? metrics.shares : 'Not available yet',
      note: 'Saves and shares may take 24-48 hours to appear in Instagram insights'
    });
    
    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching Instagram metrics:', error);
    throw new Error(`Failed to fetch Instagram metrics: ${error.message}`);
  }
}

/**
 * Fetch Facebook post metrics using Graph API
 */
async function fetchFacebookMetrics(
  postId: string,
  accessToken: string,
  pageId: string,
  fallbackToken?: string // User Access Token to use if Page Access Token lacks permissions
): Promise<FacebookMetrics> {
  try {
    console.log(`📊 Fetching Facebook metrics for post ID: ${postId}`);
    console.log(`📊 Facebook Page ID: ${pageId}`);
    
    // Validate post ID format
    // For photo posts: Facebook returns just the photo ID (e.g., "122109933585122775")
    // For regular posts: Format is {page-id}_{post-id} (e.g., "122108776185133055_1234567890")
    // Both formats are valid - photo IDs can be used directly with Graph API
    if (!postId.includes('_') && postId.match(/^\d+$/)) {
      console.log(`ℹ️ Post ID "${postId}" appears to be a photo ID (no underscore).`);
      console.log(`   This is correct for photo posts - Facebook returns photo IDs directly.`);
      console.log(`   Photo IDs can be used directly with Graph API for metrics.`);
    } else if (postId.includes('_')) {
      console.log(`ℹ️ Post ID "${postId}" appears to be a regular post ID (page-id_post-id format).`);
    }

    // First, verify we can access the post at all by checking basic fields
    // This will help us identify if it's a permissions issue or post ID issue
    console.log(`📊 Step 0: Verifying post access and token permissions...`);
    const verifyUrl = `https://graph.facebook.com/v24.0/${postId}?fields=id,created_time&access_token=${accessToken}`;
    const verifyResponse = await fetch(verifyUrl);
    
    if (!verifyResponse.ok) {
      const verifyError = await verifyResponse.json().catch(() => ({}));
      const errorCode = verifyError.error?.code;
      const errorMessage = verifyError.error?.message || '';
      const errorType = verifyError.error?.type || '';
      
      console.error(`❌ Cannot access Facebook post:`, {
        status: verifyResponse.status,
        code: errorCode,
        type: errorType,
        message: errorMessage,
        postId: postId,
        fullError: verifyError
      });
      
      // Check if it's a permissions error
      if (verifyResponse.status === 403 || errorCode === 200 || errorMessage.includes('Missing Permissions') || errorMessage.includes('permission')) {
        console.error(`❌ PERMISSION ERROR: The access token does not have 'pages_read_engagement' permission.`);
        console.error(`   Even basic post access requires this permission.`);
        console.error(`   Solution: User needs to re-authenticate in Settings → Integrations → Facebook`);
        throw new Error(`Facebook API error: Missing Permissions. The access token does not have 'pages_read_engagement' permission. User needs to re-authenticate to get a new token with updated permissions.`);
      }
      
      // Check if it's an invalid post ID
      if (errorCode === 100 || errorMessage.includes('Invalid OAuth') || errorMessage.includes('does not exist')) {
        console.error(`❌ INVALID POST ID: The post ID "${postId}" might be incorrect.`);
        console.error(`   Facebook post IDs should be in format: {page-id}_{post-id}`);
        console.error(`   Example: "122108776185133055_1234567890"`);
        throw new Error(`Facebook API error: Invalid post ID. The post ID "${postId}" might be incorrect or the post doesn't exist.`);
      }
      
      throw new Error(`Facebook API error: ${verifyResponse.status} - ${errorMessage || 'Cannot access post'}`);
    }
    
    const verifyData = await verifyResponse.json();
    console.log(`✅ Post access verified. Post ID: ${verifyData.id}, Created: ${verifyData.created_time}`);
    
    // Try to get post type to determine if we can request shares
    // Note: Photo posts don't have a 'type' field, so if we get an error, it's likely a Photo
    let postType = 'unknown';
    let metricsUrl: string;
    
    try {
      const typeCheckUrl = `https://graph.facebook.com/v24.0/${postId}?fields=type&access_token=${accessToken}`;
      console.log(`📊 Step 1: Checking post type...`);
      
      const typeResponse = await fetch(typeCheckUrl);
      if (typeResponse.ok) {
        const typeData = await typeResponse.json();
        postType = typeData.type || 'unknown';
        console.log(`📊 Post type detected: ${postType}`);
      } else {
        // If we can't get type, check if it's the "type field doesn't exist" error (Photo post) or permissions error
        const errorData = await typeResponse.json().catch(() => ({}));
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || '';
        const errorType = errorData.error?.type || '';
        
        // Check if it's a permissions error (403 or code 200)
        if (typeResponse.status === 403 || errorCode === 200 || errorMessage.includes('Missing Permissions') || errorMessage.includes('permission')) {
          console.error(`❌ PERMISSION ERROR when checking post type`);
          console.error(`   Status: ${typeResponse.status}, Code: ${errorCode}, Type: ${errorType}`);
          console.error(`   Message: ${errorMessage}`);
          console.error(`   The access token does not have 'pages_read_engagement' permission.`);
          console.error(`   Solution: User needs to re-authenticate in Settings → Integrations → Facebook`);
          throw new Error(`Facebook API error: Missing Permissions. The access token was likely generated before 'pages_read_engagement' scope was added. User needs to re-authenticate to get a new token with updated permissions.`);
        }
        
        // Check if this is the specific error for Photo posts (type field doesn't exist)
        if (errorCode === 100 && (errorMessage.includes('nonexisting field (type)') || errorMessage.includes('node type (Photo)'))) {
          console.log(`📊 Post type check: Photo post detected (type field not available for Photo posts)`);
          postType = 'photo'; // It's a Photo post - this is expected behavior
        } else {
          // Some other error occurred
          console.warn(`⚠️ Could not determine post type:`, errorMessage);
          console.warn(`   Error code: ${errorCode}, Type: ${errorType}`);
          // Continue with unknown type - we'll try without shares to be safe
          postType = 'unknown';
        }
      }
    } catch (typeError: any) {
      // If there's an exception, check if it mentions Photo posts
      const errorMessage = typeError.message || '';
      if (errorMessage.includes('nonexisting field (type)') || errorMessage.includes('node type (Photo)')) {
        console.log(`📊 Post type check: Photo post detected via exception (type field not available)`);
        postType = 'photo';
      } else {
        console.warn(`⚠️ Exception while checking post type:`, typeError.message);
        // Continue with unknown type - we'll try without shares to be safe
        postType = 'unknown';
      }
    }
    
    // Step 1: Fetch basic metrics (likes, comments, shares, reactions)
    // Don't include insights here - we'll fetch them separately to avoid failing if scope is missing
    // Try multiple comment field formats to ensure we get the count
    let basicMetricsUrl: string;
    if (postType === 'photo' || postType === 'unknown') {
      // For photo posts or unknown type, don't request shares or reactions
      // Try comments.limit(0).summary(true) which explicitly requests summary without data
      basicMetricsUrl = `https://graph.facebook.com/v24.0/${postId}?fields=likes.summary(true),comments.limit(0).summary(true)&access_token=${accessToken}`;
      console.log(`📊 Step 2a: Fetching basic metrics for ${postType === 'photo' ? 'photo' : 'unknown type'} post`);
      console.log(`📊 Using comments.limit(0).summary(true) to get comment count`);
    } else {
      // For non-photo posts, include shares and reactions
      basicMetricsUrl = `https://graph.facebook.com/v24.0/${postId}?fields=likes.summary(true),comments.limit(0).summary(true),shares,reactions.summary(true)&access_token=${accessToken}`;
      console.log(`📊 Step 2a: Fetching basic metrics for ${postType} post (includes shares and reactions)`);
      console.log(`📊 Using comments.limit(0).summary(true) to get comment count`);
    }
    
    console.log(`📊 Fetching basic metrics from Facebook API...`);
    let basicResponse = await fetch(basicMetricsUrl);
    let basicData: any;
    
    if (!basicResponse.ok) {
      const errorData = await basicResponse.json().catch(() => ({}));
      const errorCode = errorData.error?.code;
      const errorMessage = errorData.error?.message || '';
      const errorType = errorData.error?.type || '';
      
      console.error(`❌ Facebook API error (basic metrics):`, {
        status: basicResponse.status,
        code: errorCode,
        type: errorType,
        message: errorMessage,
        fullError: errorData
      });
      
      // Check if it's a permissions error
      if (basicResponse.status === 403 || errorCode === 200 || errorMessage.includes('Missing Permissions') || errorMessage.includes('permission')) {
        // Try fallback token if available
        if (fallbackToken && fallbackToken !== accessToken) {
          console.warn(`⚠️ Page Access Token missing permissions for basic metrics, trying User Access Token...`);
          accessToken = fallbackToken;
          // Retry with fallback token
          const retryBasicUrl = postType === 'photo' || postType === 'unknown'
            ? `https://graph.facebook.com/v24.0/${postId}?fields=likes.summary(true),comments.limit(0).summary(true)&access_token=${accessToken}`
            : `https://graph.facebook.com/v24.0/${postId}?fields=likes.summary(true),comments.limit(0).summary(true),shares,reactions.summary(true)&access_token=${accessToken}`;
          basicResponse = await fetch(retryBasicUrl);
          if (basicResponse.ok) {
            console.log(`✅ Fallback token works for basic metrics!`);
            basicData = await basicResponse.json();
          } else {
            console.error(`❌ PERMISSION ERROR: Even fallback token cannot access basic metrics.`);
            console.error(`   Required scopes: pages_read_engagement, pages_show_list`);
            console.error(`   Solution: User needs to re-authenticate to get a new token with updated scopes.`);
            throw new Error(`Facebook API error: Missing Permissions. Neither Page Access Token nor User Access Token has the required permissions. User needs to re-authenticate in Settings → Integrations → Facebook to get a new token with updated permissions.`);
          }
        } else {
          console.error(`❌ PERMISSION ERROR DETECTED`);
          console.error(`   The access token does not have the required permissions.`);
          console.error(`   Required scopes: pages_read_engagement, pages_show_list`);
          console.error(`   Solution: User needs to re-authenticate to get a new token with updated scopes.`);
          throw new Error(`Facebook API error: Missing Permissions. The access token was likely generated before scopes were added. User needs to re-authenticate in Settings → Integrations → Facebook to get a new token with updated permissions.`);
        }
      } else {
        throw new Error(`Facebook API error: ${basicResponse.status} - ${errorMessage || 'Failed to fetch basic metrics'}`);
      }
    }
    
    // If we haven't set basicData yet (from fallback), get it from the response
    if (!basicData) {
      try {
        basicData = await basicResponse.json();
      } catch (parseError: any) {
        console.error(`❌ Failed to parse Facebook API response as JSON:`, parseError);
        console.error(`   Response status: ${basicResponse.status}`);
        console.error(`   Response text: ${await basicResponse.text()}`);
        throw new Error(`Failed to parse Facebook API response: ${parseError.message}`);
      }
    }
    
    // Check if response contains an error
    if (basicData.error) {
      console.error(`❌ Facebook API returned an error in response:`, basicData.error);
      throw new Error(`Facebook API error: ${basicData.error.message || 'Unknown error'}`);
    }
    
    console.log(`📊 Raw Facebook API response (basic):`, JSON.stringify(basicData, null, 2));
    console.log(`📊 Response structure check:`, {
      hasLikes: !!basicData.likes,
      hasComments: !!basicData.comments,
      hasShares: !!basicData.shares,
      likesType: typeof basicData.likes,
      commentsType: typeof basicData.comments,
      likesKeys: basicData.likes ? Object.keys(basicData.likes) : [],
      commentsKeys: basicData.comments ? Object.keys(basicData.comments) : [],
    });
    
    // Extract likes - Facebook API returns likes.summary.total_count when using summary(true)
    let likes = 0;
    if (basicData.likes) {
      if (basicData.likes.summary && typeof basicData.likes.summary.total_count === 'number') {
        likes = basicData.likes.summary.total_count;
        console.log(`   ✅ Likes from summary.total_count: ${likes}`);
      } else if (Array.isArray(basicData.likes.data)) {
        likes = basicData.likes.data.length;
        console.log(`   ✅ Likes from data array length: ${likes}`);
      } else if (typeof basicData.likes === 'object' && 'count' in basicData.likes) {
        likes = basicData.likes.count || 0;
        console.log(`   ✅ Likes from count: ${likes}`);
      } else {
        console.warn(`   ⚠️ Unexpected likes structure:`, basicData.likes);
      }
    } else {
      console.warn(`   ⚠️ No likes field in response`);
    }
    
    // Extract comments - Facebook API returns comments.summary.total_count when using summary(true)
    let comments = 0;
    if (basicData.comments) {
      console.log(`   🔍 Comments field exists, structure:`, JSON.stringify(basicData.comments, null, 2));
      
      if (basicData.comments.summary && typeof basicData.comments.summary.total_count === 'number') {
        comments = basicData.comments.summary.total_count;
        console.log(`   ✅ Comments from summary.total_count: ${comments}`);
      } else if (basicData.comments.summary && typeof basicData.comments.summary.total_count === 'string') {
        // Sometimes Facebook returns it as a string
        comments = parseInt(basicData.comments.summary.total_count, 10) || 0;
        console.log(`   ✅ Comments from summary.total_count (string): ${comments}`);
      } else if (Array.isArray(basicData.comments.data)) {
        comments = basicData.comments.data.length;
        console.log(`   ✅ Comments from data array length: ${comments}`);
      } else if (typeof basicData.comments === 'object' && 'count' in basicData.comments) {
        comments = typeof basicData.comments.count === 'number' 
          ? basicData.comments.count 
          : parseInt(basicData.comments.count, 10) || 0;
        console.log(`   ✅ Comments from count: ${comments}`);
      } else if (typeof basicData.comments === 'number') {
        // Sometimes comments might be a direct number
        comments = basicData.comments;
        console.log(`   ✅ Comments as direct number: ${comments}`);
      } else {
        console.warn(`   ⚠️ Unexpected comments structure:`, JSON.stringify(basicData.comments, null, 2));
        console.warn(`   ⚠️ Comments object keys:`, Object.keys(basicData.comments));
        // Try to find any numeric value that might be the count
        if (typeof basicData.comments === 'object') {
          for (const [key, value] of Object.entries(basicData.comments)) {
            if (typeof value === 'number' && value > 0) {
              console.log(`   🔍 Found potential comment count in key "${key}": ${value}`);
            }
          }
        }
      }
    } else {
      console.warn(`   ⚠️ No comments field in response`);
      console.warn(`   ⚠️ Available fields in response:`, Object.keys(basicData));
      // Check if there's a comment_count field (alternative field name)
      if (typeof basicData.comment_count === 'number') {
        comments = basicData.comment_count;
        console.log(`   ✅ Found comment_count field: ${comments}`);
      } else if (typeof basicData.comments_count === 'number') {
        comments = basicData.comments_count;
        console.log(`   ✅ Found comments_count field: ${comments}`);
      }
    }
    
    // Fallback: If comments is still 0, try fetching from /comments endpoint
    // This is a separate API call that might work even if the main response doesn't include comments
    if (comments === 0) {
      console.log(`   🔄 Comments is 0, trying fallback: fetching from /comments endpoint...`);
      try {
        // Use limit(0) to get only the summary without fetching all comments
        const commentsUrl = `https://graph.facebook.com/v24.0/${postId}/comments?limit=0&summary=true&access_token=${accessToken}`;
        console.log(`   🔄 Fetching comments count from: ${commentsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
        
        const commentsResponse = await fetch(commentsUrl);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          console.log(`   📊 Comments endpoint response:`, JSON.stringify(commentsData, null, 2));
          
          if (commentsData.summary && typeof commentsData.summary.total_count === 'number') {
            comments = commentsData.summary.total_count;
            console.log(`   ✅ Comments from /comments endpoint summary.total_count: ${comments}`);
          } else if (Array.isArray(commentsData.data)) {
            // If summary not available, count the data array
            comments = commentsData.data.length;
            console.log(`   ✅ Comments from /comments endpoint data length: ${comments}`);
          }
        } else {
          const commentsError = await commentsResponse.json().catch(() => ({}));
          console.warn(`   ⚠️ Comments endpoint failed: ${commentsResponse.status} - ${commentsError.error?.message || 'Unknown error'}`);
        }
      } catch (commentsError: any) {
        console.warn(`   ⚠️ Exception fetching comments from /comments endpoint:`, commentsError.message);
      }
    }
    
    // Photo posts don't have shares, so default to 0 if not available
    const shares = basicData.shares?.count || 0;
    
    // Photo posts don't have reactions field, so check if it exists before accessing
    // If reactions not available, use likes as fallback (reactions include likes)
    let reactions = likes; // Default to likes
    if (basicData.reactions) {
      if (basicData.reactions.summary && typeof basicData.reactions.summary.total_count === 'number') {
        reactions = basicData.reactions.summary.total_count;
        console.log(`   ✅ Reactions from summary.total_count: ${reactions}`);
      } else if (Array.isArray(basicData.reactions.data)) {
        reactions = basicData.reactions.data.length;
        console.log(`   ✅ Reactions from data array length: ${reactions}`);
      }
    } else {
      console.log(`   ℹ️ No reactions field (photo post) - using likes (${likes}) as reactions`);
    }
    
    console.log(`✅ Basic metrics extracted: ${likes} likes, ${comments} comments, ${shares} shares, ${reactions} reactions`);
    if (postType === 'photo') {
      console.log(`ℹ️ Photo post: reactions field not available, using likes count (${likes}) as reactions`);
    }

    // Step 2: Try to fetch insights separately (optional - may fail if pages_read_user_content scope is missing)
    let impressions: number | undefined = undefined;
    let engagedUsers: number | undefined = undefined;
    let clicks: number | undefined = undefined;
    
    try {
      let insightsUrl = `https://graph.facebook.com/v24.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`;
      console.log(`📊 Step 2b: Attempting to fetch insights (optional - requires pages_read_user_content scope)`);
      
      let insightsResponse = await fetch(insightsUrl);
      
      // If insights fail with permission error and we have a fallback token, try it
      if (!insightsResponse.ok) {
        const insightsError = await insightsResponse.json().catch(() => ({}));
        const insightsErrorCode = insightsError.error?.code;
        const insightsErrorMessage = insightsError.error?.message || '';
        
        if ((insightsResponse.status === 403 || insightsErrorCode === 200 || insightsErrorMessage.includes('Missing Permissions') || insightsErrorMessage.includes('permission')) && fallbackToken && fallbackToken !== accessToken) {
          console.warn(`⚠️ Page Access Token missing permissions for insights, trying User Access Token...`);
          insightsUrl = `https://graph.facebook.com/v24.0/${postId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${fallbackToken}`;
          insightsResponse = await fetch(insightsUrl);
          if (insightsResponse.ok) {
            console.log(`✅ Fallback token works for insights!`);
          }
        }
      }
      
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        console.log(`📊 Insights response:`, JSON.stringify(insightsData, null, 2));
        
        if (insightsData.data && Array.isArray(insightsData.data)) {
          console.log(`📊 Found ${insightsData.data.length} insight metrics`);
          insightsData.data.forEach((insight: any) => {
            const value = insight.values?.[0]?.value || 0;
            console.log(`📊 Processing insight: ${insight.name} = ${value}`);
            
            switch (insight.name) {
              case 'post_impressions':
                impressions = value;
                break;
              case 'post_engaged_users':
                engagedUsers = value;
                break;
              case 'post_clicks':
                clicks = value;
                break;
            }
          });
        }
        console.log(`✅ Insights fetched successfully: ${impressions || 0} impressions, ${engagedUsers || 0} engaged users, ${clicks || 0} clicks`);
      } else {
        const errorData = await insightsResponse.json().catch(() => ({}));
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || '';
        
        // Check if it's a permission/scope issue
        if (errorCode === 10 || errorCode === 200 || errorMessage.includes('permission') || errorMessage.includes('scope') || errorMessage.includes('pages_read_user_content')) {
          console.warn(`⚠️ Insights not available: Missing 'pages_read_user_content' scope`);
          console.warn(`   Basic metrics (likes, comments, shares, reactions) are still available`);
        } else {
          console.warn(`⚠️ Could not fetch insights:`, errorMessage);
          console.warn(`   Error code: ${errorCode}`);
        }
      }
    } catch (insightsError: any) {
      console.warn(`⚠️ Exception while fetching insights:`, insightsError.message);
      console.warn(`   This is okay - basic metrics are still available`);
    }

    const engagement = impressions && impressions > 0
      ? Number((((likes + comments + shares) / impressions) * 100).toFixed(2))
      : undefined;

    const metrics = {
      likes,
      comments,
      shares,
      reactions,
      views: undefined,
      clicks,
      impressions,
      engagement,
    };
    
    console.log(`📊 Final Facebook metrics:`, metrics);

    return metrics;
  } catch (error: any) {
    console.error('❌ Error fetching Facebook metrics:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw new Error(`Failed to fetch Facebook metrics: ${error.message}`);
  }
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Parse request body to check for specific contentStrategyId
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      // Body might be empty, that's okay
    }

    const contentStrategyId = requestBody.contentStrategyId || null;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Starting automatic performance tracking...");
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    if (contentStrategyId) {
      console.log(`🎯 Tracking specific content: ${contentStrategyId}`);
    }

    // Build query for published content
    let query = supabase
      .from("published_content")
      .select(`
        id,
        content_strategy_id,
        platform,
        platform_post_id,
        published_at,
        published_url,
        user_id,
        metadata,
        status
      `)
      .in("platform", ["instagram", "facebook", "linkedin", "github", "x", "shopify", "wordpress", "wordpress_self_hosted"]);

    // If contentStrategyId is provided, filter to that specific content
    if (contentStrategyId) {
      query = query.eq("content_strategy_id", contentStrategyId);
      console.log(`🔍 Querying for content strategy ID: ${contentStrategyId}`);
    }

    const { data: publishedContent, error: fetchError } = await query;

    if (fetchError) {
      console.error("❌ Error fetching published content:", fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${publishedContent?.length || 0} published content records (before filtering)`);
    
    // Filter for published status and non-null platform_post_id
    const filteredContent = (publishedContent || []).filter((post: any) => {
      const hasStatus = post.status === "published";
      const hasPostId = post.platform_post_id !== null && post.platform_post_id !== undefined && post.platform_post_id !== "";
      
      // Also check metadata for post ID (for posts published before fix)
      let hasPostIdInMetadata = false;
      if (!hasPostId && post.metadata) {
        if (post.platform === "linkedin" && post.metadata.linkedin?.postId) {
          hasPostIdInMetadata = true;
        } else if (post.platform === "instagram" && post.metadata.instagram?.postId) {
          hasPostIdInMetadata = true;
        } else if (post.platform === "facebook" && post.metadata.facebook?.postId) {
          hasPostIdInMetadata = true;
        } else if (post.platform === "x" && (post.metadata?.x?.tweetId || post.metadata?.x?.postId)) {
          hasPostIdInMetadata = true;
        } else if (post.platform === "shopify") {
          if (post.metadata?.shopify?.articleId || post.metadata?.shopify?.blogId) {
            hasPostIdInMetadata = true;
          } else if (post.published_url && typeof post.published_url === "string" && post.published_url.includes("/blogs/")) {
            hasPostIdInMetadata = true;
          }
        } else if (post.platform === "wordpress" && post.metadata?.wordpress?.postId) {
          hasPostIdInMetadata = true;
        } else if (post.platform === "wordpress_self_hosted" && post.metadata?.wordpress_self_hosted?.postId) {
          hasPostIdInMetadata = true;
        }
      }
      
      if (!hasStatus) {
        console.log(`⚠️ Skipping ${post.platform} post ${post.id}: status is "${post.status}" (expected "published")`);
      }
      if (!hasPostId && !hasPostIdInMetadata) {
        console.log(`⚠️ Skipping ${post.platform} post ${post.id}: platform_post_id is null/empty`);
        if (post.metadata) {
          console.log(`   Metadata keys: ${Object.keys(post.metadata).join(', ')}`);
          if (post.platform === "linkedin") {
            console.log(`   LinkedIn metadata:`, JSON.stringify(post.metadata.linkedin || {}, null, 2));
          }
          if (post.platform === "shopify") {
            console.log(`   Shopify metadata:`, JSON.stringify(post.metadata.shopify || {}, null, 2));
          }
        }
      }
      
      return hasStatus && (hasPostId || hasPostIdInMetadata);
    });

    console.log(`📊 Filtered to ${filteredContent.length} posts with published status and valid platform_post_id`);

    if (!filteredContent || filteredContent.length === 0) {
      console.log("ℹ️ No content to track");
      return new Response(
        JSON.stringify({ 
          message: "No content to track", 
          tracked: 0,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );
    }

    console.log(`📊 Found ${filteredContent.length} posts to track`);

    let tracked = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    // Process each post
    for (const post of filteredContent) {
      try {
        console.log(`\n📝 Processing ${post.platform} post:`);
        console.log(`   - Published Content ID: ${post.id}`);
        console.log(`   - Content Strategy ID: ${post.content_strategy_id}`);
        console.log(`   - Platform Post ID: ${post.platform_post_id}`);
        console.log(`   - Published At: ${post.published_at}`);

        // Validate platform_post_id exists - try to get it from metadata if missing
        let platformPostId = post.platform_post_id;
        if (!platformPostId && post.metadata) {
          // Try to extract from metadata (for posts published before the fix)
          if (post.platform === "instagram" && post.metadata.instagram?.postId) {
            platformPostId = post.metadata.instagram.postId;
            console.log(`📋 Found Instagram post ID in metadata: ${platformPostId}`);
          } else if (post.platform === "facebook" && post.metadata.facebook?.postId) {
            platformPostId = post.metadata.facebook.postId;
            console.log(`📋 Found Facebook post ID in metadata: ${platformPostId}`);
          } else if (post.platform === "linkedin" && post.metadata.linkedin?.postId) {
            platformPostId = post.metadata.linkedin.postId;
            console.log(`📋 Found LinkedIn post ID in metadata: ${platformPostId}`);
          } else if (post.platform === "x" && (post.metadata?.x?.tweetId || post.metadata?.x?.postId)) {
            platformPostId = post.metadata.x.tweetId || post.metadata.x.postId;
            console.log(`📋 Found X tweet ID in metadata: ${platformPostId}`);
          } else if (post.platform === "shopify" && post.metadata?.shopify?.articleId) {
            platformPostId = String(post.metadata.shopify.articleId);
            console.log(`📋 Found Shopify article ID in metadata: ${platformPostId}, blogId: ${post.metadata.shopify.blogId}`);
          } else if (post.platform === "wordpress" && post.metadata?.wordpress?.postId) {
            platformPostId = String(post.metadata.wordpress.postId);
            console.log(`📋 Found WordPress.com post ID in metadata: ${platformPostId}`);
          } else if (post.platform === "wordpress_self_hosted" && post.metadata?.wordpress_self_hosted?.postId) {
            platformPostId = String(post.metadata.wordpress_self_hosted.postId);
            console.log(`📋 Found self-hosted WordPress post ID in metadata: ${platformPostId}`);
          }
        }

        if (!platformPostId) {
          if (post.platform === "shopify") {
            console.log(`📋 Shopify: platform_post_id not in metadata; will try to resolve from published_url in Shopify branch`);
          } else {
            console.warn(`⚠️ Skipping ${post.platform} post: platform_post_id is missing`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "Missing platform_post_id - post may not have been published correctly",
            });
            errors++;
            continue;
          }
        }

        // Get platform integration (for access token)
        const { data: integration, error: integrationError } = await supabase
          .from("platform_integrations")
          .select("*")
          .eq("user_id", post.user_id)
          .eq("platform", post.platform)
          .eq("status", "connected")
          .maybeSingle();

        if (integrationError || !integration) {
          console.warn(`⚠️ No integration found for ${post.platform} (user: ${post.user_id})`);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: "No integration found",
          });
          errors++;
          continue;
        }

        // Check if token is expired
        if (integration.expires_at) {
          const expiresAt = new Date(integration.expires_at);
          const now = new Date();
          if (expiresAt < now) {
            console.warn(`⚠️ Access token expired for ${post.platform} (user: ${post.user_id})`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "Access token expired",
            });
            errors++;
            continue;
          }
        }

        // Get access token (decrypt if needed - adjust based on your encryption method)
        // For Facebook: Try Page Access Token first, fallback to User Access Token for reading
        // Page Access Tokens don't always have pages_read_engagement, but User Access Tokens do
        let accessToken = integration.access_token;
        const userAccessToken = integration.metadata?.userAccessToken;
        
        // Log what tokens we have for debugging
        console.log(`🔑 Token availability for ${post.platform}:`, {
          hasPageAccessToken: !!accessToken,
          hasUserAccessToken: !!userAccessToken,
          pageTokenLength: accessToken?.length || 0,
          userTokenLength: userAccessToken?.length || 0,
          metadataKeys: integration.metadata ? Object.keys(integration.metadata) : [],
        });
        
        // For Facebook, if we have a User Access Token, we'll use it as fallback for reading
        // The Page Access Token is used for publishing, but User Access Token has all permissions for reading
        if (post.platform === "facebook" && userAccessToken) {
          console.log(`📋 Facebook: Have both Page Access Token and User Access Token`);
          console.log(`   Will use Page Access Token first, fallback to User Access Token if permission errors`);
        } else if (post.platform === "facebook" && !userAccessToken) {
          console.warn(`⚠️ Facebook: Only Page Access Token available, no User Access Token in metadata`);
          console.warn(`   This may cause permission errors if Page Access Token lacks 'pages_read_engagement'`);
          console.warn(`   User should re-authenticate via OAuth to store User Access Token in metadata`);
        }

        if (!accessToken) {
          console.warn(`⚠️ No access token for ${post.platform} (user: ${post.user_id})`);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: "No access token",
          });
          errors++;
          continue;
        }

        let metrics: any = {};
        let metricsFetched = false; // Track if we successfully fetched metrics

        // Fetch metrics based on platform
        if (post.platform === "instagram") {
          const instagramAccountId = integration.metadata?.instagramAccountId || integration.platform_user_id;
          
          if (!instagramAccountId) {
            console.warn(`⚠️ No Instagram account ID found`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "No Instagram account ID",
            });
            errors++;
            continue;
          }

          console.log(`📱 Fetching Instagram metrics for post ID: ${post.platform_post_id}`);
          console.log(`📱 Instagram Account ID: ${instagramAccountId}`);

          const instagramMetrics = await fetchInstagramMetrics(
            platformPostId,
            accessToken,
            instagramAccountId
          );

          console.log(`✅ Instagram metrics fetched:`, {
            likes: instagramMetrics.likes,
            comments: instagramMetrics.comments,
            reach: instagramMetrics.reach,
            impressions: instagramMetrics.impressions,
            engagement: instagramMetrics.engagement,
            saved: instagramMetrics.saved || 0,
            shares: instagramMetrics.shares || 0,
          });

          metrics = {
            engagement: instagramMetrics.engagement,
            traffic: instagramMetrics.impressions || instagramMetrics.reach || 0,
            likes: instagramMetrics.likes,
            comments: instagramMetrics.comments,
            reach: instagramMetrics.reach,
            impressions: instagramMetrics.impressions,
            // Store as 0 if undefined - Instagram insights may take 24-48 hours to update
            saved: instagramMetrics.saved !== undefined ? instagramMetrics.saved : 0,
            shares: instagramMetrics.shares !== undefined ? instagramMetrics.shares : 0,
            lastUpdated: new Date().toISOString(),
          };
          
          if (instagramMetrics.saved === undefined || instagramMetrics.shares === undefined) {
            console.log(`ℹ️ Note: Saves and/or shares are not available yet. Instagram insights can take 24-48 hours to update.`);
            console.log(`   Current values: saved=${instagramMetrics.saved !== undefined ? instagramMetrics.saved : 'N/A'}, shares=${instagramMetrics.shares !== undefined ? instagramMetrics.shares : 'N/A'}`);
          }
          
          console.log(`💾 Saving metrics to database:`, metrics);
          metricsFetched = true;
        } else if (post.platform === "facebook") {
          const pageId = integration.metadata?.pageId || integration.platform_user_id;
          
          if (!pageId) {
            console.warn(`⚠️ No Facebook page ID found`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "No Facebook page ID",
            });
            errors++;
            continue;
          }

          console.log(`📱 Fetching Facebook metrics for post ID: ${platformPostId}`);
          console.log(`📱 Facebook Page ID: ${pageId}`);
          console.log(`📱 Post metadata:`, JSON.stringify(post.metadata, null, 2));
          console.log(`📱 Published URL: ${post.published_url}`);
          
          // Validate post ID format
          if (!platformPostId || platformPostId.trim() === '') {
            console.error(`❌ ERROR: platform_post_id is empty or null`);
            
            // Try to extract post ID from published_url if available
            if (post.published_url) {
              console.log(`   Attempting to extract post ID from published_url: ${post.published_url}`);
              
              // Try different URL formats:
              // 1. fbid format: https://www.facebook.com/photo/?fbid=122109933585122775
              // 2. Regular post: https://www.facebook.com/{page-id}/posts/{post-id}
              // 3. Regular post (alternative): https://www.facebook.com/{page-id}_{post-id}
              
              const fbidMatch = post.published_url.match(/[?&]fbid=(\d+)/);
              const postsMatch = post.published_url.match(/\/(\d+)\/posts\/(\d+)/);
              const underscoreMatch = post.published_url.match(/(\d+)_(\d+)/);
              
              if (fbidMatch && fbidMatch[1]) {
                // Photo post with fbid format
                platformPostId = fbidMatch[1];
                console.log(`   ✅ Extracted photo post ID (fbid) from URL: ${platformPostId}`);
              } else if (postsMatch && postsMatch.length >= 3) {
                // Regular post with /posts/ format
                platformPostId = `${postsMatch[1]}_${postsMatch[2]}`;
                console.log(`   ✅ Extracted regular post ID from URL: ${platformPostId}`);
              } else if (underscoreMatch && underscoreMatch.length >= 3) {
                // Regular post with underscore format
                platformPostId = `${underscoreMatch[1]}_${underscoreMatch[2]}`;
                console.log(`   ✅ Extracted post ID (underscore format) from URL: ${platformPostId}`);
              } else {
                console.warn(`   ❌ Could not extract post ID from URL format`);
                errorDetails.push({
                  postId: post.id,
                  platform: post.platform,
                  error: "Empty platform_post_id and could not extract from published_url",
                });
                errors++;
                continue;
              }
            } else {
              console.warn(`   No published_url available to extract post ID from`);
              errorDetails.push({
                postId: post.id,
                platform: post.platform,
                error: "Empty platform_post_id - cannot fetch metrics",
              });
              errors++;
              continue;
            }
          }
          
          // Check if post ID is a photo ID (numeric only, no underscore) - this is valid for photo posts
          // Photo posts return just the photo ID (e.g., "122109948375122775")
          // This photo ID IS the fbid and is unique for each post
          // Regular posts return page-id_post-id format (e.g., "8966166763530326_1234567890")
          if (!platformPostId.includes('_') && /^\d+$/.test(platformPostId)) {
            console.log(`ℹ️ Post ID "${platformPostId}" is a photo ID (fbid) - numeric only, no underscore.`);
            console.log(`   ✅ This is correct for photo posts - Facebook returns photo IDs (fbid) directly.`);
            console.log(`   ✅ The fbid (${platformPostId}) is unique for each post and will fetch the exact post's insights.`);
            console.log(`   ✅ Photo IDs (fbid) can be used directly with Graph API: /v24.0/${platformPostId}`);
            
            // If we have a published_url, verify it matches the fbid format
            if (post.published_url && post.published_url.includes('fbid=')) {
              const fbidFromUrl = post.published_url.match(/[?&]fbid=(\d+)/)?.[1];
              if (fbidFromUrl && fbidFromUrl === platformPostId) {
                console.log(`   ✅ Post ID (${platformPostId}) matches fbid in published_url - confirmed photo post`);
                console.log(`   ✅ Using fbid (${platformPostId}) to fetch insights for this exact post`);
              } else if (fbidFromUrl && fbidFromUrl !== platformPostId) {
                console.warn(`   ⚠️ Post ID (${platformPostId}) doesn't match fbid in URL (${fbidFromUrl})`);
                console.warn(`   Using Post ID from database: ${platformPostId}`);
              }
            }
          } else if (platformPostId.includes('_')) {
            console.log(`ℹ️ Post ID "${platformPostId}" is a regular post ID (page-id_post-id format).`);
            console.log(`   ✅ Using this ID to fetch insights for this exact post`);
          } else {
            console.warn(`⚠️ Post ID "${platformPostId}" has unexpected format.`);
            console.warn(`   Expected: numeric only (photo/fbid) or page-id_post-id (regular post)`);
          }
          
          console.log(`📋 Final Post ID to use for API calls: ${platformPostId}`);
          console.log(`   This ID will be used directly with Facebook Graph API to fetch insights`);

          try {
          // Use User Access Token as fallback if Page Access Token lacks permissions
          const userAccessToken = integration.metadata?.userAccessToken;
          
          console.log(`🔑 Facebook token check before fetch:`, {
            hasPageAccessToken: !!accessToken,
            hasUserAccessToken: !!userAccessToken,
            pageTokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : 'N/A',
            userTokenPreview: userAccessToken ? `${userAccessToken.substring(0, 10)}...` : 'N/A',
            tokensAreDifferent: accessToken !== userAccessToken,
          });
          
          const facebookMetrics = await fetchFacebookMetrics(
            platformPostId,
            accessToken,
            pageId,
            userAccessToken // Pass as fallback
          );

            console.log(`✅ Facebook metrics fetched:`, {
              likes: facebookMetrics.likes,
              comments: facebookMetrics.comments,
              shares: facebookMetrics.shares,
              reactions: facebookMetrics.reactions,
              impressions: facebookMetrics.impressions,
              clicks: facebookMetrics.clicks,
              engagement: facebookMetrics.engagement,
            });

            metrics = {
              engagement: facebookMetrics.engagement,
              traffic: facebookMetrics.impressions || facebookMetrics.views || 0,
              likes: facebookMetrics.likes,
              comments: facebookMetrics.comments,
              shares: facebookMetrics.shares,
              reactions: facebookMetrics.reactions,
              clicks: facebookMetrics.clicks,
              impressions: facebookMetrics.impressions,
              lastUpdated: new Date().toISOString(),
            };
            
            console.log(`💾 Saving Facebook metrics to database:`, metrics);
          } catch (facebookError: any) {
            console.error(`❌ Error fetching Facebook metrics:`, facebookError);
            console.error(`   Error message: ${facebookError.message}`);
            console.error(`   ⚠️ Will preserve existing metrics and only update error state`);
            
            // Mark as error - actual metrics will be preserved from existing data
            // We'll fetch existing metrics later and preserve them
            metrics = {
              error: facebookError.message || "Failed to fetch Facebook metrics",
              lastUpdated: new Date().toISOString(),
              // Don't set metrics to 0 here - we'll preserve existing values later
              // This prevents overwriting good data with zeros
            };
            
            // Add to error details but don't throw - we want to preserve existing data
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: `Facebook metrics error: ${facebookError.message}`,
            });
            
            console.log(`⚠️ Error state marked - existing metrics will be preserved`);
          }
          metricsFetched = true; // Mark as fetched even if it failed (we have error state)
        } else if (post.platform === "linkedin") {
          console.log(`📱 Fetching LinkedIn metrics for post ID: ${platformPostId}`);
          
          // Note: LinkedIn metrics may take time to populate, but we fetch immediately
          // If metrics are 0, they may not be available yet (try again later)
          
          // Get author URN from metadata if available
          const authorUrn = post.metadata?.linkedin?.authorUrn || post.metadata?.linkedin?.personUrn;
          const tokenAuthorUrn = integration.metadata?.personUrn || integration.platform_user_id;
          
          try {
            const linkedInMetrics = await fetchLinkedInMetrics(
              platformPostId,
              accessToken,
              authorUrn,
              tokenAuthorUrn
            );

            console.log(`✅ LinkedIn metrics fetched:`, {
              likes: linkedInMetrics.likes,
              comments: linkedInMetrics.comments,
              shares: linkedInMetrics.shares,
              engagement: linkedInMetrics.engagement,
            });

            // ✅ 6️⃣ Final expected output (REALISTIC)
            metrics = {
              engagement: linkedInMetrics.engagement,
              traffic: 0, // LinkedIn does not provide views/impressions via Social Actions API
              likes: linkedInMetrics.likes, // reliable
              comments: linkedInMetrics.comments, // may be 0
              shares: 0, // always 0 - LinkedIn does not reliably expose share counts
              lastUpdated: new Date().toISOString(),
            };
            
            console.log(`💾 Saving LinkedIn metrics to database:`, metrics);
          } catch (linkedInError: any) {
            console.error(`❌ Error fetching LinkedIn metrics:`, linkedInError);
            console.error(`   Error message: ${linkedInError.message}`);
            console.error(`   ⚠️ Will preserve existing metrics and only update error state`);
            
            // Mark as error - actual metrics will be preserved from existing data
            metrics = {
              error: linkedInError.message || "Failed to fetch LinkedIn metrics",
              lastUpdated: new Date().toISOString(),
              // Don't set metrics to 0 here - we'll preserve existing values later
              // This prevents overwriting good data with zeros
            };
            
            // Add to error details but don't throw - we want to preserve existing data
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: `LinkedIn metrics error: ${linkedInError.message}`,
            });
            
            console.log(`⚠️ Error state marked - existing metrics will be preserved`);
          }
          metricsFetched = true; // Mark as fetched even if it failed (we have error state)
        } else if (post.platform === "github") {
          console.log(`📱 Fetching GitHub metrics for discussion #${platformPostId}`);
          
          // Get repository owner and name from integration metadata
          let owner = integration.metadata?.owner || integration.metadata?.github?.owner;
          let repo = integration.metadata?.repo || integration.metadata?.github?.repo;
          
          // Fallback: Try to extract from repositories list if available
          if ((!owner || !repo) && integration.metadata?.repositories && Array.isArray(integration.metadata.repositories) && integration.metadata.repositories.length > 0) {
            const firstRepo = integration.metadata.repositories[0];
            if (!owner) owner = firstRepo.owner;
            if (!repo) repo = firstRepo.name;
            console.log(`📋 Extracted owner/repo from repositories list: ${owner}/${repo}`);
          }
          
          if (!owner || !repo) {
            console.warn(`⚠️ No repository owner or name found for GitHub integration`);
            console.warn(`   Metadata keys: ${Object.keys(integration.metadata || {}).join(', ')}`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "No repository owner or name found in integration metadata",
            });
            errors++;
            continue;
          }
          
          if (!platformPostId) {
            console.warn(`⚠️ No discussion number found for GitHub discussion`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "No discussion number found",
            });
            errors++;
            continue;
          }
          
          try {
            const gitHubMetrics = await fetchGitHubMetrics(
              platformPostId,
              accessToken,
              owner,
              repo
            );

            console.log(`✅ GitHub metrics fetched:`, {
              reactions: gitHubMetrics.reactions,
              comments: gitHubMetrics.comments,
              upvotes: gitHubMetrics.upvotes,
              engagement: gitHubMetrics.engagement,
            });

            // Ensure upvotes is a number (handle null/undefined)
            const upvotesValue = typeof gitHubMetrics.upvotes === 'number' ? gitHubMetrics.upvotes : 0;
            console.log(`📊 Upvotes value after processing: ${upvotesValue} (type: ${typeof upvotesValue})`);

            metrics = {
              engagement: gitHubMetrics.engagement,
              traffic: 0, // GitHub doesn't provide view/impression metrics
              likes: gitHubMetrics.reactions, // Map reactions to likes for consistency
              comments: gitHubMetrics.comments,
              reactions: gitHubMetrics.reactions,
              upvotes: upvotesValue, // Ensure it's always a number
              lastUpdated: new Date().toISOString(),
            };
            
            console.log(`💾 Metrics to save:`, JSON.stringify(metrics, null, 2));
            
            console.log(`💾 Saving GitHub metrics to database:`, metrics);
          } catch (gitHubError: any) {
            console.error(`❌ Error fetching GitHub metrics:`, gitHubError);
            console.error(`   Error message: ${gitHubError.message}`);
            console.error(`   ⚠️ Will preserve existing metrics and only update error state`);
            
            // Mark as error - actual metrics will be preserved from existing data
            metrics = {
              error: gitHubError.message || "Failed to fetch GitHub metrics",
              lastUpdated: new Date().toISOString(),
              // Don't set metrics to 0 here - we'll preserve existing values later
              // This prevents overwriting good data with zeros
            };
            
            // Add to error details but don't throw - we want to preserve existing data
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: `GitHub metrics error: ${gitHubError.message}`,
            });
            
            console.log(`⚠️ Error state marked - existing metrics will be preserved`);
          }
          metricsFetched = true; // Mark as fetched even if it failed (we have error state)
        } else if (post.platform === "x") {
          console.log(`🐦 Fetching X (Twitter) metrics for tweet ID: ${platformPostId}`);
          try {
            const xMetrics = await fetchXMetrics(platformPostId, accessToken);
            console.log(`✅ X metrics fetched:`, {
              likes: xMetrics.like_count,
              retweets: xMetrics.retweet_count,
              replies: xMetrics.reply_count,
              quotes: xMetrics.quote_count,
              engagement: xMetrics.engagement,
            });
            metrics = {
              engagement: xMetrics.engagement,
              likes: xMetrics.like_count,
              comments: xMetrics.reply_count,
              shares: xMetrics.retweet_count,
              retweet_count: xMetrics.retweet_count,
              reply_count: xMetrics.reply_count,
              quote_count: xMetrics.quote_count,
              traffic: 0,
              impressions: 0,
              clicks: 0,
              reactions: xMetrics.like_count,
              lastUpdated: new Date().toISOString(),
            };
          } catch (xError: any) {
            console.error(`❌ Error fetching X metrics:`, xError);
            metrics = {
              error: xError.message || "Failed to fetch X metrics",
              lastUpdated: new Date().toISOString(),
            };
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: `X metrics error: ${xError.message}`,
            });
          }
          metricsFetched = true;
        } else if (post.platform === "shopify") {
          let blogId = post.metadata?.shopify?.blogId;
          let articleId = platformPostId || (post.metadata?.shopify?.articleId != null ? String(post.metadata.shopify.articleId) : null);
          const shopDomain = integration.metadata?.shopDomain || integration.platform_user_id;

          if ((!blogId || !articleId) && post.published_url && String(post.published_url).includes("/blogs/")) {
            const resolved = await resolveShopifyIdsFromUrl(shopDomain, accessToken, post.published_url);
            if (resolved) {
              blogId = resolved.blogId;
              articleId = String(resolved.articleId);
              console.log(`📋 Resolved Shopify IDs from URL: blogId=${blogId}, articleId=${articleId}`);
            }
          }

          if (!shopDomain) {
            console.warn(`⚠️ Shopify post missing shop domain`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "Missing shop domain in integration",
            });
            errors++;
            continue;
          }
          if (!blogId || !articleId) {
            console.warn(`⚠️ Shopify post missing blogId or articleId (and could not resolve from URL): blogId=${blogId}, articleId=${articleId}`);
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "Missing blogId or articleId. Re-publish the post or ensure published_url is a valid Shopify blog URL.",
            });
            errors++;
            continue;
          }
          console.log(`🛒 Fetching Shopify article metrics for blog ${blogId}, article ${articleId}`);
          try {
            const shopifyMetrics = await fetchShopifyMetrics(
              shopDomain,
              Number(blogId),
              String(articleId),
              accessToken
            );
            metrics = {
              views: shopifyMetrics.views,
              engagement: shopifyMetrics.engagement,
              impressions: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              traffic: 0,
              clicks: 0,
              reactions: 0,
              published_at: shopifyMetrics.published_at,
              updated_at: shopifyMetrics.updated_at,
              store_sessions: shopifyMetrics.store_sessions,
              note: shopifyMetrics.note,
              lastUpdated: new Date().toISOString(),
            };
            console.log(`✅ Shopify metrics: views=${shopifyMetrics.views} engagement=${shopifyMetrics.engagement} store_sessions=${shopifyMetrics.store_sessions} updated_at=${shopifyMetrics.updated_at}`);
          } catch (shopifyError: any) {
            console.error(`❌ Error fetching Shopify metrics:`, shopifyError);
            metrics = {
              error: shopifyError.message || "Failed to fetch Shopify article",
              lastUpdated: new Date().toISOString(),
            };
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: `Shopify metrics error: ${shopifyError.message}`,
            });
          }
          metricsFetched = true;
        } else if (post.platform === "wordpress") {
          const siteId =
            integration.platform_user_id ||
            (integration.metadata as Record<string, unknown>)?.siteId ||
            (post.metadata?.wordpress as Record<string, unknown>)?.siteId;
          if (!siteId) {
            console.warn(`⚠️ WordPress.com post ${post.id}: no siteId (platform_user_id or metadata.siteId)`);
            metrics = {
              error: "WordPress.com site ID not found",
              lastUpdated: new Date().toISOString(),
            };
            errorDetails.push({
              postId: post.id,
              platform: post.platform,
              error: "WordPress.com site ID not found",
            });
          } else {
            try {
              const wpMetrics = await fetchWordPressComMetrics(
                String(siteId),
                platformPostId!,
                accessToken
              );
              metrics = {
                views: wpMetrics.views,
                likes: wpMetrics.likes,
                comments: wpMetrics.comments,
                engagement: wpMetrics.engagement ?? wpMetrics.views + wpMetrics.likes + wpMetrics.comments,
                traffic: wpMetrics.views,
                impressions: 0,
                shares: 0,
                clicks: 0,
                reactions: wpMetrics.likes,
                lastUpdated: new Date().toISOString(),
              };
              console.log(`✅ WordPress.com metrics: views=${wpMetrics.views} likes=${wpMetrics.likes} comments=${wpMetrics.comments}`);
            } catch (wpError: any) {
              console.error(`❌ Error fetching WordPress.com metrics:`, wpError);
              metrics = {
                error: wpError.message || "Failed to fetch WordPress.com stats",
                lastUpdated: new Date().toISOString(),
              };
              errorDetails.push({
                postId: post.id,
                platform: post.platform,
                error: `WordPress.com metrics error: ${wpError.message}`,
              });
            }
          }
          metricsFetched = true;
        } else if (post.platform === "wordpress_self_hosted") {
          const selfHostedSiteUrl =
            integration.platform_user_id ||
            (integration.metadata as Record<string, unknown>)?.siteUrl ||
            "";
          let resolved = false;
          console.log(
            `WordPress self-hosted: siteUrl=${selfHostedSiteUrl}, user_id=${post.user_id}, platformPostId=${platformPostId}`
          );
          if (selfHostedSiteUrl) {
            const { data: wpComIntegration } = await supabase
              .from("platform_integrations")
              .select("access_token")
              .eq("user_id", post.user_id)
              .eq("platform", "wordpress")
              .eq("status", "connected")
              .maybeSingle();
            const wpComToken = wpComIntegration?.access_token;
            if (!wpComIntegration) {
              console.warn(
                "WordPress self-hosted: no WordPress.com integration for user (connect WordPress.com in Settings)"
              );
            } else if (!wpComToken) {
              console.warn(
                "WordPress self-hosted: WordPress.com integration has no access token"
              );
            }
            if (wpComToken) {
              const jetpackSiteId = await getWordPressComSiteIdByUrl(
                wpComToken,
                selfHostedSiteUrl
              );
              if (jetpackSiteId) {
                try {
                  const wpMetrics = await fetchWordPressComMetrics(
                    jetpackSiteId,
                    platformPostId!,
                    wpComToken
                  );
                  metrics = {
                    views: wpMetrics.views,
                    likes: wpMetrics.likes,
                    comments: wpMetrics.comments,
                    engagement: wpMetrics.engagement ?? wpMetrics.views + wpMetrics.likes + wpMetrics.comments,
                    traffic: wpMetrics.views,
                    impressions: 0,
                    shares: 0,
                    clicks: 0,
                    reactions: wpMetrics.likes,
                    note: "Jetpack stats via WordPress.com",
                    lastUpdated: new Date().toISOString(),
                  };
                  console.log(
                    `✅ WordPress (Jetpack) metrics: views=${wpMetrics.views} likes=${wpMetrics.likes} comments=${wpMetrics.comments}`
                  );
                  resolved = true;
                } catch (wpErr: any) {
                  console.error(
                    `❌ Error fetching Jetpack/WordPress.com metrics:`,
                    wpErr
                  );
                  metrics = {
                    error:
                      wpErr.message ||
                      "Failed to fetch Jetpack stats via WordPress.com",
                    lastUpdated: new Date().toISOString(),
                  };
                  errorDetails.push({
                    postId: post.id,
                    platform: post.platform,
                    error: `Jetpack metrics error: ${wpErr.message}`,
                  });
                  resolved = true;
                }
              }
            }
          }
          if (!resolved) {
            metrics = {
              views: 0,
              engagement: 0,
              traffic: 0,
              impressions: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              clicks: 0,
              reactions: 0,
              note:
                "Connect WordPress.com (same account as Jetpack) in Settings to see stats",
              lastUpdated: new Date().toISOString(),
            };
          }
          metricsFetched = true;
        }

        // Only proceed to save if we have metrics (either successful or error state)
        if (!metricsFetched || !metrics || Object.keys(metrics).length === 0) {
          console.error(`❌ No metrics to save for ${post.platform} post ${post.id}`);
          console.error(`   metricsFetched: ${metricsFetched}`);
          console.error(`   metrics:`, metrics);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: "No metrics fetched or metrics object is empty",
          });
          errors++;
          continue;
        }

        console.log(`📊 Proceeding to save metrics for ${post.platform}:`, {
          hasMetrics: !!metrics,
          metricsKeys: Object.keys(metrics),
          metricsFetched: metricsFetched,
        });

        // Get current content_strategy metadata BEFORE updating
        // This allows us to preserve existing metrics if API call fails
        const { data: contentStrategy, error: contentError } = await supabase
          .from("content_strategy")
          .select("metadata")
          .eq("id", post.content_strategy_id)
          .single();

        if (contentError) {
          console.error(`❌ Error fetching content strategy:`, contentError);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: `Content strategy error: ${contentError.message}`,
          });
          errors++;
          continue;
        }

        // Get existing metrics for this platform to preserve them on error
        const currentMetadata = contentStrategy.metadata || {};
        const currentPerformance = currentMetadata.performance || {};
        const existingPlatformMetrics = currentPerformance[post.platform] || {};
        
        // If metrics contain an error, preserve existing values and only update error/lastUpdated
        if (metrics.error) {
          console.warn(`⚠️ API call failed - preserving existing metrics and only updating error state`);
          console.log(`   Existing metrics:`, existingPlatformMetrics);
          console.log(`   Error: ${metrics.error}`);
          
          // Preserve existing metrics, only update error and lastUpdated
          metrics = {
            ...existingPlatformMetrics, // Preserve existing values
            error: metrics.error, // Update error message
            lastUpdated: new Date().toISOString(), // Update timestamp
            // Only set to 0 if no existing value (first time error)
            likes: existingPlatformMetrics.likes ?? 0,
            comments: existingPlatformMetrics.comments ?? 0,
            shares: existingPlatformMetrics.shares ?? 0,
            reactions: existingPlatformMetrics.reactions ?? 0,
            clicks: existingPlatformMetrics.clicks ?? 0,
            impressions: existingPlatformMetrics.impressions ?? 0,
            engagement: existingPlatformMetrics.engagement ?? 0,
            traffic: existingPlatformMetrics.traffic ?? 0,
          };
          
          console.log(`   Preserved metrics:`, {
            likes: metrics.likes,
            comments: metrics.comments,
            shares: metrics.shares,
            error: metrics.error,
          });
        } else {
          console.log(`✅ API call succeeded - updating with new metrics`);
        }
        
        const updatedMetadata = {
          ...currentMetadata,
          performance: {
            ...currentPerformance,
            // Platform-specific metrics
            [post.platform]: {
              ...existingPlatformMetrics, // Start with existing
              ...metrics, // Overwrite with new (successful) or preserved (error) metrics
            },
            // Aggregate values (average across platforms, or use latest)
            engagement: metrics.engagement || currentPerformance.engagement,
            traffic: metrics.traffic || currentPerformance.traffic,
            // Keep existing platform data
            ...Object.keys(currentPerformance)
              .filter(key => key !== post.platform && key !== 'engagement' && key !== 'traffic')
              .reduce((acc, key) => {
                acc[key] = currentPerformance[key];
                return acc;
              }, {} as any),
          },
        };

        // Update content_strategy
        console.log(`💾 Updating content_strategy ${post.content_strategy_id} with metrics:`, {
          platform: post.platform,
          likes: metrics.likes,
          comments: metrics.comments,
          engagement: metrics.engagement,
        });
        
        const { error: updateError } = await supabase
          .from("content_strategy")
          .update({
            metadata: updatedMetadata,
            updated_at: new Date().toISOString(),
          })
          .eq("id", post.content_strategy_id);

        if (updateError) {
          console.error(`❌ Error updating content strategy:`, updateError);
          errorDetails.push({
            postId: post.id,
            platform: post.platform,
            error: `Update error: ${updateError.message}`,
          });
          errors++;
          continue;
        }
        
        console.log(`✅ Successfully updated content_strategy ${post.content_strategy_id} with ${post.platform} metrics`);

        // Create performance snapshot (for history tracking)
        // Note: This table needs to be created via migration
        console.log(`💾 Creating performance snapshot for ${post.platform} post...`);
        console.log(`   Content Strategy ID: ${post.content_strategy_id}`);
        console.log(`   Platform: ${post.platform}`);
        console.log(`   Metrics object:`, JSON.stringify(metrics, null, 2));
        console.log(`   Metrics keys:`, Object.keys(metrics));
        console.log(`   Metrics values:`, Object.values(metrics));
        
        // Ensure metrics is a valid object before inserting
        if (!metrics || typeof metrics !== 'object') {
          console.error(`❌ Invalid metrics object:`, metrics);
          console.error(`   Metrics type: ${typeof metrics}`);
          metrics = {
            error: "Invalid metrics object",
            lastUpdated: new Date().toISOString(),
          };
        }
        
        try {
          const { error: snapshotError, data: snapshotData } = await supabase
            .from("performance_snapshots")
            .insert({
              content_strategy_id: post.content_strategy_id,
              platform: post.platform,
              snapshot_date: new Date().toISOString(),
              metrics: metrics,
            })
            .select();

          if (snapshotError) {
            // Table might not exist yet, log but don't fail
            console.error(`❌ Could not create snapshot for ${post.platform}:`, snapshotError);
            console.error(`   Error details:`, {
              message: snapshotError.message,
              code: snapshotError.code,
              details: snapshotError.details,
              hint: snapshotError.hint,
            });
            console.error(`   Content Strategy ID: ${post.content_strategy_id}`);
            console.error(`   Platform: ${post.platform}`);
            console.error(`   Metrics being inserted:`, JSON.stringify(metrics, null, 2));
            console.warn(`⚠️ Continuing without snapshot - metrics are still saved in content_strategy metadata`);
          } else {
            console.log(`✅ Created performance snapshot successfully for ${post.platform}:`, snapshotData);
            console.log(`   Snapshot ID: ${snapshotData?.[0]?.id || 'N/A'}`);
            console.log(`   Platform: ${snapshotData?.[0]?.platform || 'N/A'}`);
            console.log(`   Snapshot date: ${snapshotData?.[0]?.snapshot_date || 'N/A'}`);
          }
        } catch (snapshotException: any) {
          console.error(`❌ Exception creating snapshot for ${post.platform}:`, snapshotException);
          console.error(`   Exception message: ${snapshotException.message}`);
          console.error(`   Exception stack: ${snapshotException.stack}`);
          console.warn(`⚠️ Continuing without snapshot - metrics are still saved in content_strategy metadata`);
        }

        tracked++;
        console.log(`✅ Successfully tracked ${post.platform} post ${post.platform_post_id}`);

      } catch (error: any) {
        console.error(`❌ Error tracking post ${post.id}:`, error);
        errorDetails.push({
          postId: post.id,
          platform: post.platform,
          error: error.message || "Unknown error",
        });
        errors++;
      }
    }

    const result = {
      message: "Performance tracking completed",
      tracked,
      errors,
      total: publishedContent.length,
      timestamp: new Date().toISOString(),
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    };

    console.log(`\n✅ Tracking complete: ${tracked} successful, ${errors} errors`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );

  } catch (error: any) {
    console.error("❌ Performance tracking error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );
  }
});

