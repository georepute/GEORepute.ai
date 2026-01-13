// Domain Visibility Edge Function
// Checks domain visibility across multiple LLM platforms (GPT, Gemini, Claude, Perplexity, Groq)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// API Key Cache
const apiKeyCache: Record<string, string | null> = {};

// Helper: Get API key from Supabase secrets
async function getApiKey(keyType: string): Promise<string | null> {
  if (apiKeyCache[keyType]) {
    return apiKeyCache[keyType];
  }

  const envVarName = keyType === "openai" 
    ? "OPENAI_API_KEY"
    : `${keyType.toUpperCase()}_API_KEY`;
  
  const apiKey = Deno.env.get(envVarName);
  if (!apiKey) {
    console.error(`❌ No ${keyType} API key found in secrets (${envVarName})`);
    return null;
  }

  apiKeyCache[keyType] = apiKey;
  return apiKey;
}

// Helper: Fetch with retry
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || i === maxRetries - 1) {
        return response;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
  }
  throw new Error("Max retries exceeded");
}

// Helper: Extract domain name from URL
function extractDomainName(url: string): string {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}

// Helper: Normalize domain
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim().replace(/^www\./, "");
}

// Helper: Generate domain queries
function generateDomainQueries(domainName: string, language: "en" | "he" = "en"): string[] {
  const queries: string[] = [];

  if (language === "he") {
    queries.push(
      domainName,
      `מה זה ${domainName}`,
      `שירותי ${domainName}`,
      `ביקורות על ${domainName}`,
      `תכונות ${domainName}`
    );
  } else {
    queries.push(
      domainName,
      `what is ${domainName}`,
      `${domainName} services`,
      `${domainName} reviews`,
      `${domainName} features`
    );
  }

  return queries;
}

// Query AI Platform
async function queryAIPlatform(
  platform: string,
  prompt: string,
  language: "en" | "he" = "en"
): Promise<string | null> {
  try {
    console.log(`Querying ${platform} with prompt: ${prompt.substring(0, 50)}... (language: ${language})`);
    
    const systemMessage = language === "he"
      ? "אתה עוזר מחקר עסקי מועיל. ספק תגובות מפורטות ועובדתיות על חברות ומותגים. תגיב בעברית אם השאילתה בעברית."
      : "You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.";

    // Get API key
    let apiKey = apiKeyCache[platform];
    if (!apiKey) {
      apiKey = await getApiKey(platform === "chatgpt" ? "openai" : platform);
      if (!apiKey) {
        return null;
      }
      apiKeyCache[platform] = apiKey;
    }

    // GPT (OpenAI)
    if (platform === "chatgpt" && apiKey) {
      const response = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    }

    // Claude (Anthropic)
    if (platform === "claude" && apiKey) {
      const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 4000,
          system: systemMessage,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0].text;
    }

    // Gemini (Google)
    if (platform === "gemini" && apiKey) {
      const geminiPrompt = language === "he" ? `${systemMessage}\n\n${prompt}` : prompt;

      let response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: geminiPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        response = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
              },
            }),
          }
        );
      }

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const textParts = data.candidates[0].content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text);
        return textParts.join("");
      }
      throw new Error("Unexpected Gemini response format");
    }

    // Perplexity
    if (platform === "perplexity" && apiKey) {
      let response = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        response = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-small-online",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt },
            ],
            max_tokens: 4000,
            temperature: 0.7,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      throw new Error("Unexpected Perplexity response format");
    }

    // Groq
    if (platform === "groq" && apiKey) {
      const response = await fetchWithRetry("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      throw new Error("Unexpected Groq response format");
    }

    return null;
  } catch (error) {
    console.error(`Error querying ${platform}:`, error);
    return null;
  }
}

// Analyze domain mention in response
function analyzeDomainMention(response: string, domainName: string): {
  mentioned: boolean;
  position: number | null;
  context: string;
} {
  if (!response || !domainName) {
    return { mentioned: false, position: null, context: "" };
  }

  const lowerResponse = response.toLowerCase();
  const lowerDomain = domainName.toLowerCase();
  const domainVariations = [
    lowerDomain,
    lowerDomain.replace(/\./g, " "),
    lowerDomain.replace(/\./g, ""),
  ];

  for (const variation of domainVariations) {
    const index = lowerResponse.indexOf(variation);
    if (index !== -1) {
      // Calculate position (rough estimate: first 20% = position 1, next 20% = 2, etc.)
      const position = Math.min(5, Math.floor((index / response.length) * 5) + 1);
      const contextStart = Math.max(0, index - 50);
      const contextEnd = Math.min(response.length, index + variation.length + 50);
      const context = response.substring(contextStart, contextEnd);

      return { mentioned: true, position, context };
    }
  }

  return { mentioned: false, position: null, context: "" };
}

// Extract sources from response
function extractSourcesFromResponse(response: string): string[] {
  if (!response) return [];

  const sources: string[] = [];
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = response.match(urlPattern);

  if (matches) {
    matches.forEach((url) => {
      let cleanUrl = url.trim().replace(/[.,;:!?)]$/, "");
      try {
        const urlObj = new URL(cleanUrl);
        const excludedDomains = [
          "google.com",
          "bing.com",
          "yahoo.com",
          "duckduckgo.com",
          "facebook.com",
          "twitter.com",
          "linkedin.com",
          "instagram.com",
          "youtube.com",
        ];
        if (!excludedDomains.some((excluded) => urlObj.hostname.includes(excluded))) {
          sources.push(cleanUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    });
  }

  return [...new Set(sources)];
}

// Calculate visibility score
function calculateVisibilityScore(platformResults: Record<string, any>): number {
  if (!platformResults || Object.keys(platformResults).length === 0) {
    return 0;
  }

  const scores = Object.values(platformResults)
    .map((result: any) => result.visibilityScore || 0)
    .filter((score) => score > 0);

  if (scores.length === 0) {
    return 0;
  }

  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domainUrl, platforms = ["chatgpt", "gemini", "claude", "perplexity", "groq"], language = "en", userId } = await req.json();

    if (!domainUrl) {
      return new Response(
        JSON.stringify({ error: "domainUrl is required", success: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract and normalize domain
    const domainName = normalizeDomain(extractDomainName(domainUrl));
    console.log(`Checking domain visibility for: ${domainName}`);

    // Generate queries
    const queries = generateDomainQueries(domainName, language);
    console.log(`Generated ${queries.length} queries for ${domainName}`);

    // Initialize results structure
    const results: Record<string, any> = {};
    const validPlatforms = platforms.filter((p: string) => 
      ["chatgpt", "gemini", "claude", "perplexity", "groq"].includes(p)
    );

    // Query each platform
    for (const platform of validPlatforms) {
      console.log(`Processing platform: ${platform}`);
      const platformResults = {
        visibilityScore: 0,
        mentions: 0,
        totalQueries: queries.length,
        queries: [] as any[],
      };

      // Query each query for this platform
      for (const query of queries) {
        try {
          const response = await queryAIPlatform(platform, query, language);
          
          if (response) {
            const analysis = analyzeDomainMention(response, domainName);
            const sources = extractSourcesFromResponse(response);

            platformResults.queries.push({
              query,
              mentioned: analysis.mentioned,
              position: analysis.position,
              response: response.substring(0, 500), // Truncate for storage
              sources,
            });

            if (analysis.mentioned) {
              platformResults.mentions++;
            }
          } else {
            platformResults.queries.push({
              query,
              mentioned: false,
              position: null,
              error: "No response from platform",
            });
          }

          // Small delay between queries
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error: any) {
          console.error(`Error processing query "${query}" for ${platform}:`, error);
          platformResults.queries.push({
            query,
            mentioned: false,
            position: null,
            error: error.message || "Query failed",
          });
        }
      }

      // Calculate visibility score for this platform
      platformResults.visibilityScore = Math.round(
        (platformResults.mentions / platformResults.totalQueries) * 100
      );

      results[platform] = platformResults;
      console.log(`${platform} visibility: ${platformResults.visibilityScore}% (${platformResults.mentions}/${platformResults.totalQueries})`);

      // Delay between platforms
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Calculate overall score
    const overallScore = calculateVisibilityScore(results);

    const responseData = {
      success: true,
      domain: domainName,
      domainUrl,
      results,
      overallScore,
      timestamp: new Date().toISOString(),
    };

    // Store in database if userId provided
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("domain_visibility_checks").insert({
        user_id: userId,
        domain_url: domainUrl,
        domain_name: domainName,
        platforms: validPlatforms,
        language,
        results: responseData.results,
        overall_score: overallScore,
      });
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Domain visibility error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to check domain visibility",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
