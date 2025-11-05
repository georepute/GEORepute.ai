/**
 * GitHub Integration Service
 * Handles auto-publishing content to GitHub Discussions
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
  categoryId?: string; // Optional category ID (GraphQL node ID) for the discussion
}

export interface GitHubPublishResult {
  success: boolean;
  url?: string;
  discussionNumber?: number; // Discussion number (replaces issueNumber)
  error?: string;
}

/**
 * Publish content to GitHub Discussions
 */
export async function publishToGitHub(
  config: GitHubConfig,
  content: PublishContent
): Promise<GitHubPublishResult> {
  try {
    // Format content as markdown for discussion body
    const discussionBody = formatAsMarkdown(content);

    // Get repository ID and category ID using GraphQL
    const categories = await getDiscussionCategories(config);
    console.log("Discussion categories fetched:", categories.length, "categories");
    
    if (categories.length === 0) {
      return {
        success: false,
        error: "No discussion categories found. Please ensure Discussions are enabled AND at least one category exists. Go to: Settings → General → Features → Discussions → Create a category (e.g., 'General')",
      };
    }

    // Prefer "General" category, fallback to first available
    const generalCategory = categories.find((c: any) => 
      c.name.toLowerCase() === "general" || c.slug === "general"
    );
    const categoryId = content.categoryId || (generalCategory?.id || categories[0].id);
    console.log("Selected category ID:", categoryId, generalCategory ? "(General)" : `(${categories[0].name})`);
    
    // Get repository ID (needed for GraphQL mutation)
    const repositoryId = await getRepositoryId(config);
    if (!repositoryId) {
      return {
        success: false,
        error: "Failed to get repository ID. Please verify your repository name and access token.",
      };
    }

    // Create GitHub Discussion using GraphQL
    const discussion = await createDiscussion(config, {
      repositoryId: repositoryId,
      categoryId: categoryId,
      title: content.title,
      body: discussionBody,
    });

    if (!discussion.success || !discussion.data) {
      return {
        success: false,
        error: discussion.error || "Failed to create GitHub discussion",
      };
    }

    // Return GitHub Discussion URL
    const url = discussion.data.url;
    const number = discussion.data.number;

    return {
      success: true,
      url,
      discussionNumber: number,
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
 * Format content as markdown for GitHub Discussion
 * Returns only the content without metadata
 */
function formatAsMarkdown(content: PublishContent): string {
  // Return only the content, no metadata
  return content.content;
}

/**
 * Get available discussion categories for the repository
 * Uses GitHub GraphQL API (required for Discussions)
 */
async function getDiscussionCategories(
  config: GitHubConfig
): Promise<any[]> {
  try {
    // First, get the repository ID using GraphQL
    const repoQuery = `
      query GetRepository($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          id
          discussionCategories(first: 20) {
            nodes {
              id
              name
              slug
              description
            }
          }
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": "GeoRepute.ai",
      },
      body: JSON.stringify({
        query: repoQuery,
        variables: {
          owner: config.owner,
          repo: config.repo,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`GraphQL API error (status ${response.status}):`, errorText);
      return [];
    }

    const result = await response.json();
    
    if (result.errors) {
      console.warn("GraphQL errors:", JSON.stringify(result.errors, null, 2));
      return [];
    }

    if (!result.data?.repository) {
      console.warn("Repository not found or Discussions not enabled");
      return [];
    }

    const categories = result.data.repository.discussionCategories?.nodes || [];
    console.log("Fetched discussion categories:", categories.length, "categories");
    return categories;
  } catch (error: any) {
    console.warn("Failed to fetch discussion categories:", error.message);
    return [];
  }
}

/**
 * Get repository ID using GraphQL (required for creating discussions)
 */
async function getRepositoryId(config: GitHubConfig): Promise<string | null> {
  try {
    const query = `
      query GetRepository($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          id
        }
      }
    `;

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": "GeoRepute.ai",
      },
      body: JSON.stringify({
        query: query,
        variables: {
          owner: config.owner,
          repo: config.repo,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data?.repository?.id || null;
  } catch (error: any) {
    console.error("Failed to get repository ID:", error);
    return null;
  }
}

/**
 * Create a GitHub Discussion using GraphQL
 */
async function createDiscussion(
  config: GitHubConfig,
  discussion: { repositoryId: string; categoryId: string; title: string; body: string }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const mutation = `
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

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": "GeoRepute.ai",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            repositoryId: discussion.repositoryId,
            categoryId: discussion.categoryId,
            title: discussion.title,
            body: discussion.body,
          },
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
      return { success: false, error: errorMessage };
    }

    const discussionData = result.data?.createDiscussion?.discussion;
    if (!discussionData) {
      return { success: false, error: "Failed to create discussion - no data returned" };
    }

    return { 
      success: true, 
      data: {
        url: discussionData.url,
        number: discussionData.number,
      }
    };
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
    // Read response body once and store it
    const responseText = await response.text();
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
      // Include full error details for debugging
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    } catch (parseError) {
      // If JSON parsing fails, use the text we already read
      throw new Error(`${errorMessage} - ${responseText.substring(0, 200)}`);
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

