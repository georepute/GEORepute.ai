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
const X_UPLOAD_V1 = "https://upload.twitter.com/1.1/media/upload.json";
const X_TWEET_BASE_URL = "https://x.com/i/status";

/** X allowed image types for tweet_image */
const X_IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/**
 * Upload an image to X and return media_id for use in create tweet.
 * Tries v2 first; if 403 (OAuth2 not allowed), falls back to v1.1 upload.
 * https://docs.x.com/x-api/media/upload-media
 */
export async function uploadMediaToX(
  config: XConfig,
  imageUrl: string
): Promise<{ mediaId: string } | { error: string }> {
  if (!config.accessToken) {
    return { error: "Missing X access token" };
  }
  if (!imageUrl || !imageUrl.trim()) {
    return { error: "Image URL is required" };
  }

  let buffer: ArrayBuffer;
  let mediaType: string = "image/jpeg";
  let bytes: Buffer;

  try {
    if (imageUrl.startsWith("data:image/")) {
      const match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/i);
      if (!match) return { error: "Invalid data URL for image" };
      const ext = match[1].toLowerCase();
      mediaType = ext === "jpeg" || ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      if (!X_IMAGE_MEDIA_TYPES.includes(mediaType as any)) mediaType = "image/jpeg";
      bytes = Buffer.from(match[2], "base64");
      buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    } else {
      const res = await fetch(imageUrl, { method: "GET" });
      if (!res.ok) {
        return { error: `Failed to fetch image: ${res.status}` };
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("png")) mediaType = "image/png";
      else if (contentType.includes("webp")) mediaType = "image/webp";
      else if (contentType.includes("gif")) mediaType = "image/gif";
      else mediaType = "image/jpeg";
      if (!X_IMAGE_MEDIA_TYPES.includes(mediaType as any)) mediaType = "image/jpeg";
      const ab = await res.arrayBuffer();
      buffer = ab;
      bytes = Buffer.from(ab);
    }
  } catch (e: any) {
    console.error("X media fetch error:", e);
    return { error: e?.message || "Failed to fetch image" };
  }

  const ext = mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
  const filename = `image.${ext}`;

  // Try v2 upload first (OAuth 2.0 Bearer – may return 403)
  const blob = new Blob([buffer], { type: mediaType });
  const formV2 = new FormData();
  formV2.append("media", blob, filename);
  formV2.append("media_category", "tweet_image");
  formV2.append("media_type", mediaType);

  const resV2 = await fetch(`${X_API_BASE}/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: formV2,
  });

  const dataV2 = await resV2.json().catch(() => ({}));

  if (resV2.ok) {
    const id = dataV2?.data?.id?.toString();
    if (id) return { mediaId: id };
  }

  if (resV2.status === 401) {
    return {
      error: "X connection expired or invalid. Reconnect X in Settings → Integrations.",
    };
  }

  const is403 = resV2.status === 403;
  const isOAuth2Blocked =
    is403 &&
    (String(dataV2?.detail || dataV2?.title || "").toLowerCase().includes("oauth2") ||
     String(JSON.stringify(dataV2)).toLowerCase().includes("oauth2"));

  // Fallback: v1.1 multipart upload (sometimes accepts Bearer in practice)
  if (is403 || !resV2.ok) {
    const formV1 = new FormData();
    formV1.append("media_data", bytes.toString("base64"));
    const resV1 = await fetch(X_UPLOAD_V1, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}` },
      body: formV1,
    });
    const dataV1 = await resV1.json().catch(() => ({}));
    if (resV1.ok && dataV1?.media_id_string) {
      return { mediaId: String(dataV1.media_id_string) };
    }
  }

  const errMsg =
    dataV2?.errors?.[0]?.detail ||
    dataV2?.errors?.[0]?.message ||
    dataV2?.detail ||
    dataV2?.title ||
    resV2.statusText;
  const message =
    typeof errMsg === "string" ? errMsg : "Media upload failed";
  console.error("X media upload failed:", resV2.status, message, dataV2);

  if (isOAuth2Blocked) {
    return {
      error:
        "X image upload requires OAuth 1.0a; this app uses OAuth 2.0. Tweet was published without image. To attach images, use X Developer Portal to enable OAuth 1.0a for your app.",
    };
  }
  return { error: message };
}

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
    if (res.status === 401) {
      return {
        success: false,
        error: "X connection expired or invalid. Reconnect X in Settings → Integrations.",
      };
    }
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
