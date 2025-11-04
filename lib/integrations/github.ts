/**
 * GitHub Integration Service
 * Handles auto-publishing content to GitHub Issues
 */

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string; // Optional, defaults to "main" if not provided
}

export interface PublishContent {
  title: string;
  content: string;
  filename?: string;
  metadata?: {
    keywords?: string[];
    platform?: string;
    contentType?: string;
    [key: string]: any;
  };
  labels?: string[]; // Optional labels for the issue
}

export interface GitHubPublishResult {
  success: boolean;
  url?: string;
  issueNumber?: number;
  error?: string;
}

/**
 * Publish content to GitHub Issues
 */
export async function publishToGitHub(
  config: GitHubConfig,
  content: PublishContent
): Promise<GitHubPublishResult> {
  try {
    // Format content as markdown for issue body
    const issueBody = formatAsMarkdown(content);

    // Create GitHub Issue
    const issue = await createIssue(config, {
      title: content.title,
      body: issueBody,
      labels: content.labels || ["content", "auto-published"],
    });

    if (!issue.success || !issue.data) {
      return {
        success: false,
        error: issue.error || "Failed to create GitHub issue",
      };
    }

    // Return GitHub Issue URL
    const url = issue.data.html_url;

    return {
      success: true,
      url,
      issueNumber: issue.data.number,
    };
  } catch (error: any) {
    console.error("GitHub publish error:", error);
    return {
      success: false,
      error: error.message || "Unknown error publishing to GitHub",
    };
  }
}

/**
 * Format content as markdown for GitHub Issue
 * Returns only the content without metadata
 */
function formatAsMarkdown(content: PublishContent): string {
  // Return only the content, no metadata
  return content.content;
}

/**
 * Create a GitHub Issue
 */
async function createIssue(
  config: GitHubConfig,
  issue: { title: string; body: string; labels?: string[] }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await apiRequest(
      config,
      `/repos/${config.owner}/${config.repo}/issues`,
      "POST",
      {
        title: issue.title,
        body: issue.body,
        labels: issue.labels || [],
      }
    );
    return { success: true, data: response };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * GitHub API Helper Functions
 */

async function apiRequest(
  config: GitHubConfig,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const url = `https://api.github.com${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "GeoRepute.ai",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `GitHub API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      // Include full error details for debugging
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    } catch (parseError) {
      // If JSON parsing fails, try text
      const errorText = await response.text();
      throw new Error(`${errorMessage} - ${errorText}`);
    }
  }

  return response.json();
}


/**
 * Verify GitHub configuration and access
 */
export async function verifyGitHubConfig(
  config: GitHubConfig
): Promise<{ success: boolean; error?: string; repo?: any }> {
  try {
    const repo = await apiRequest(
      config,
      `/repos/${config.owner}/${config.repo}`
    );
    return { success: true, repo };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to verify GitHub access",
    };
  }
}

