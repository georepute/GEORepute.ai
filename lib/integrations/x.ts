/**
 * X (Twitter) Integration Service
 * OAuth 2.0 + API v2 for posting tweets
 */

export interface XConfig {
  accessToken: string;
  refreshToken?: string;
  username?: string;
  userId?: string;
}

export interface XPublishContent {
  text: string;
  /** Optional media ID from X Upload API (uploaded first, then pass here) */
  mediaIds?: string[];
}

export interface XPublishResult {
  success: boolean;
  url?: string;
  tweetId?: string;
  error?: string;
}

const X_API_BASE = "https://api.x.com/2";
const X_TWEET_BASE_URL = "https://x.com/i/status";

/**
 * Strip HTML and truncate to 280 characters for a tweet
 */
function tweetTextFromContent(htmlOrText: string, maxLength = 280): string {
  const stripped = htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength - 3) + "...";
}

/**
 * Publish a tweet to X using API v2
 * https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 */
export async function publishToX(
  config: XConfig,
  content: XPublishContent
): Promise<XPublishResult> {
  if (!config.accessToken) {
    return { success: false, error: "Missing X access token" };
  }

  const text = content.text ? tweetTextFromContent(content.text) : "";
  if (!text) {
    return { success: false, error: "Tweet text is required" };
  }

  const body: { text: string; media?: { media_ids: string[] } } = { text };
  if (content.mediaIds && content.mediaIds.length > 0) {
    body.media = { media_ids: content.mediaIds };
  }

  const res = await fetch(`${X_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // X API v2 error shape: { detail, title, errors: [{ message }], type }
    const errMsg =
      data?.errors?.[0]?.message ||
      data?.detail ||
      data?.title ||
      (typeof data?.error === "string" ? data.error : null) ||
      res.statusText;
    const fullError = typeof errMsg === "string" ? errMsg : JSON.stringify(data || errMsg);
    console.error("X API post tweet failed:", res.status, fullError, data);
    return {
      success: false,
      error: fullError,
    };
  }

  const tweetId = data?.data?.id;
  const tweetText = data?.data?.text;
  const url = tweetId ? `${X_TWEET_BASE_URL}/${tweetId}` : undefined;

  return {
    success: true,
    url,
    tweetId: tweetId?.toString(),
  };
}

/**
 * Get authenticated user (for display name / username)
 * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
 */
export async function getXCurrentUser(accessToken: string): Promise<{
  success: boolean;
  username?: string;
  id?: string;
  name?: string;
  error?: string;
}> {
  const res = await fetch(`${X_API_BASE}/users/me?user.fields=username,name,id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      error: data?.detail || data?.title || res.statusText,
    };
  }
  return {
    success: true,
    username: data?.data?.username,
    id: data?.data?.id,
    name: data?.data?.name,
  };
}
