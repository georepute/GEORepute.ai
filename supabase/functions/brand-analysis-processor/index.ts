import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Cache for API keys (loaded once per invocation)
const apiKeyCache: Record<string, string | null> = {};

// Helper to get API key from database or environment with caching
async function getApiKey(keyType: string, useCache: boolean = true): Promise<string | null> {
  // Check cache first if enabled
  if (useCache && apiKeyCache[keyType] !== undefined) {
    return apiKeyCache[keyType];
  }

  try {
    // Based on validation results, prioritize the correct key naming conventions:
    // - openai: use "openai" (NOT admin_openai_key or openai_api_key)
    // - claude: use "admin_claude_key" 
    // - gemini: use "admin_gemini_key"
    // - grok: use "admin_grok_key"
    // - perplexity: try "admin_perplexity_key" first, then "perplexity" as fallback
    let keyVariants: string[] = [];
    
    if (keyType === 'openai' || keyType === 'chatgpt') {
      // OpenAI: prioritize "openai" (the working one), avoid admin_openai_key and openai_api_key
      keyVariants = ['openai', 'chatgpt']; // Both map to same key
    } else if (keyType === 'claude') {
      // Claude: use admin_claude_key (the working one)
      keyVariants = ['admin_claude_key', 'claude'];
    } else if (keyType === 'gemini') {
      // Gemini: use admin_gemini_key (the working one)
      keyVariants = ['admin_gemini_key', 'gemini'];
    } else if (keyType === 'grok') {
      // Grok: use 'grok' as main, 'admin_grok_key' as fallback
      keyVariants = ['grok', 'admin_grok_key'];
    } else if (keyType === 'perplexity') {
      // Perplexity: try both variants (was working at old commit)
      keyVariants = ['admin_perplexity_key', 'perplexity'];
    } else {
      // Default: try both formats for other types
      keyVariants = [`admin_${keyType}_key`, keyType];
    }
    
    // Try each variant in database
    for (const variant of keyVariants) {
      // Only log first lookup to reduce noise
      if (useCache && !(keyType in apiKeyCache)) {
        console.log(`🔍 Looking for API key: ${keyType}`);
      }
      const { data, error } = await supabase
        .from('admin_api_keys')
        .select('encrypted_key')
        .eq('key_type', variant)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Only log errors on first lookup
        if (useCache && !(keyType in apiKeyCache)) {
          console.error(`❌ Error fetching ${variant}:`, error.message);
        }
        continue;
      }

      if (data && data.encrypted_key) {
        // Handle base64 decoding - check if it contains '::' separator
        let decrypted: string;
        try {
          if (data.encrypted_key.includes('::')) {
            decrypted = atob(data.encrypted_key.split('::').pop() || '');
          } else {
            decrypted = atob(data.encrypted_key);
          }
          // Cache the result
          if (useCache) {
            apiKeyCache[keyType] = decrypted;
          }
          // Log successful load with variant used
          if (useCache && !(keyType in apiKeyCache)) {
            console.log(`✅ ${keyType} key loaded from database using key_type="${variant}", length: ${decrypted.length}`);
          }
          return decrypted;
        } catch (decodeError) {
          if (useCache && !(keyType in apiKeyCache)) {
            console.error(`❌ Error decoding ${variant}:`, decodeError);
          }
          continue;
        }
      }
    }

    // Fallback to environment variable (for backward compatibility)
    const envKey = Deno.env.get(`${keyType.toUpperCase()}_API_KEY`);
    if (envKey) {
      if (useCache) {
        apiKeyCache[keyType] = envKey;
      }
      if (useCache && Object.keys(apiKeyCache).length <= 1) {
        console.log(`✅ ${keyType} key loaded from environment`);
      }
      return envKey;
    }

    // Cache null result to avoid repeated lookups
    if (useCache) {
      apiKeyCache[keyType] = null;
    }
    if (useCache && !(keyType in apiKeyCache) || Object.keys(apiKeyCache).length <= 1) {
      console.log(`❌ No ${keyType} key found in database or environment`);
    }
    return null;
  } catch (error) {
    console.error(`Error retrieving ${keyType} API key:`, error);
    // Fallback to environment
    const envKey = Deno.env.get(`${keyType.toUpperCase()}_API_KEY`) || null;
    if (useCache) {
      apiKeyCache[keyType] = envKey;
    }
    return envKey;
  }
}

// Initialize API keys (lazy loading - will be loaded on first use)
let openAIApiKey: string | null = null;
let claudeApiKey: string | null = null;
let geminiApiKey: string | null = null;
let perplexityApiKey: string | null = null;
let grokApiKey: string | null = null; // Grok (xAI) - NOT Groq

// Load API keys on first use and sync with cache
async function ensureApiKeysLoaded() {
  if (openAIApiKey === null) {
    openAIApiKey = await getApiKey('openai');
    apiKeyCache['openai'] = openAIApiKey;
    apiKeyCache['chatgpt'] = openAIApiKey; // Map chatgpt to openai
  }
  if (claudeApiKey === null) {
    claudeApiKey = await getApiKey('claude');
    apiKeyCache['claude'] = claudeApiKey;
  }
  if (geminiApiKey === null) {
    geminiApiKey = await getApiKey('gemini');
    apiKeyCache['gemini'] = geminiApiKey;
  }
  if (perplexityApiKey === null) {
    perplexityApiKey = await getApiKey('perplexity');
    apiKeyCache['perplexity'] = perplexityApiKey;
  }
  if (grokApiKey === null) {
    grokApiKey = await getApiKey('grok'); // Grok (xAI) - NOT Groq
    apiKeyCache['grok'] = grokApiKey;
  }
}

async function fetchWithRetry(url: RequestInfo, options?: RequestInit, retries = 3, delay = 500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // Handle 429 (rate limit) with longer backoff
      // CRITICAL: Grok API has stricter rate limits - use longer backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const isGrokApi = typeof url === 'string' && url.includes('api.x.ai');
        const baseDelay = isGrokApi ? 5000 : delay; // Grok: 5s base, others: original delay
        const maxWait = isGrokApi ? 60000 : 30000; // Grok: 60s max, others: 30s max
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, i + 2);
        console.warn(`Rate limit (429) on ${url}. Waiting ${waitTime}ms before retry (${i + 1}/${retries})...`);
        if (i < retries - 1) {
          await new Promise(res => setTimeout(res, Math.min(waitTime, maxWait)));
          continue;
        }
      }
      
      // Don't retry on other client errors (4xx) except 429 - these are permanent failures
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // For 401 errors, log more clearly as this indicates API key issues
        if (response.status === 401) {
          console.error(`Client error on fetch: 401 Unauthorized - API key may be invalid or expired. Aborting retries.`);
        } else {
          console.error(`Client error on fetch: ${response.status} ${response.statusText}. Aborting retries.`);
        }
        return response; // Let the caller handle the error response
      }
      console.warn(`Request to ${url} failed with status ${response.status}. Retrying (${i + 1}/${retries})...`);
    } catch (error) {
      console.warn(`Request to ${url} failed with error: ${error.message}. Retrying (${i + 1}/${retries})...`);
    }
    if (i < retries - 1) {
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i))); // Exponential backoff (500ms, 1s, 2s)
    }
  }
  // After all retries, throw an error
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

interface BrandAnalysisRequest {
  projectId: string;
  platforms?: string[];
  keywords?: string[];
  competitors?: string[];
  brandName?: string;
  industry?: string;
}

async function queryAIPlatform(platform: string, prompt: string) {
  try {
    // Get API key from cache or load it
    const keyType = platform === 'chatgpt' ? 'openai' : platform;
    let apiKey = apiKeyCache[keyType] || apiKeyCache[platform];
    
    if (!apiKey) {
      apiKey = await getApiKey(keyType);
      apiKeyCache[keyType] = apiKey;
      apiKeyCache[platform] = apiKey; // Also cache by platform name
    }
    
    if (!apiKey) {
      throw new Error(`No API key available for platform: ${platform}`);
    }
    
    if (platform === 'chatgpt' && apiKey) {
      try {
      // Enhance prompt to request sources via web search
      const enhancedPrompt = `Use web search to answer the following question.
For every factual claim, provide the source URL.
If no web sources are used, respond with "No external sources used."

Question: ${prompt}`;

      const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful business research assistant. Always use web search when available. Provide detailed, factual responses about companies and brands. Include source URLs for all factual claims.' },
            { role: 'user', content: enhancedPrompt }
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
      } catch (error) {
        console.error(`Error with ChatGPT API:`, error);
        throw error;
      }
    }
    
    if (platform === 'claude' && apiKey) {
      try {
        const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 4000,
            // Anthropic Messages API expects content parts
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: prompt }],
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Handle 429 rate limit errors specifically
          if (response.status === 429) {
            const errorData = JSON.parse(errorText || '{}');
            const errorMsg = errorData.error?.message || errorText;
            throw new Error(
              `Claude API error: ${response.status} - ${errorMsg.substring(0, 300)}`,
            );
          }
          throw new Error(
            `Claude API error: ${response.status} - ${errorText.substring(0, 300)}`,
          );
        }

        const data = await response.json();
        // data.content is an array of content blocks
        const text = Array.isArray(data?.content)
          ? data.content
              .filter((b: any) => b?.type === 'text' && typeof b?.text === 'string')
              .map((b: any) => b.text)
              .join('')
          : '';
        return text;
      } catch (error) {
        console.error(`Error with Claude API:`, error);
        throw error;
      }
    }

    if (platform === 'gemini' && apiKey) {
      try {
        // Enhance prompt to request sources using Gemini's native Google Search integration
        const enhancedPrompt = `Answer using live web search.
Include a list of sources with URLs at the end.
If multiple sources are used, rank them by relevance.

Question: ${prompt}

Please provide your response in this format:
[Your answer here]

Sources:
1. [Title] - [URL]
2. [Title] - [URL]
...`;

        // Try gemini-2.0-flash first (latest fast model)
        console.log(`Calling Gemini API with key length: ${apiKey.length}`);
        let response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: enhancedPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192, // Increased from 1000 to allow complete responses
            }
          }),
        });

        // If that fails, try gemini-1.5-flash
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`Gemini 2.0 flash failed (${response.status}): ${errorText.substring(0, 200)}, trying gemini-1.5-flash...`);
          response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: enhancedPrompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192, // Increased from 1000 to allow complete responses
              }
            }),
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
          throw new Error(`Gemini API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const candidate = data.candidates[0];
          
          // Check if response was truncated due to token limits
          if (candidate.finishReason === 'MAX_TOKENS') {
            console.warn('⚠️ Gemini response may be truncated (MAX_TOKENS finish reason)');
          }
          
          // Extract all text parts and join them
          const textParts = candidate.content.parts
            .filter(part => part.text)
            .map(part => part.text);
          const fullResponse = textParts.join('');
          
          console.log(`✓ Gemini response length: ${fullResponse.length} characters`);
          
          return fullResponse;
        } else {
          console.error('Unexpected Gemini response format:', JSON.stringify(data).substring(0, 200));
          throw new Error('Unexpected Gemini response format');
        }
      } catch (error) {
        console.error(`Error with Gemini API:`, error);
        throw error;
      }
    }

    if (platform === 'perplexity' && apiKey) {
      try {
        // Perplexity is behind Cloudflare in some regions; send UA + Accept to avoid HTML auth pages
        console.log(`Calling Perplexity API with key length: ${apiKey.length}`);

        const makeRequest = (model: string) =>
          fetchWithRetry('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'LovableEdgeFunction/brand-analysis-processor',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.',
                },
                { role: 'user', content: prompt },
              ],
            }),
          });

        let response = await makeRequest('sonar');

        // If that fails, try sonar-pro
        if (!response.ok) {
          const errorText = await response.text();
          console.log(
            `Perplexity sonar failed (${response.status}): ${errorText.substring(0, 200)}, trying sonar-pro...`,
          );
          response = await makeRequest('sonar-pro');
        }

        if (!response.ok) {
          const errorText = await response.text();
          // If 401, the API key is invalid - mark it as such and skip
          if (response.status === 401) {
            console.error(`❌ Perplexity API returned 401 - API key is invalid or expired. Skipping this platform.`);
            // Invalidate the cache for this key so we don't keep trying
            apiKeyCache['perplexity'] = null;
            perplexityApiKey = null;
            throw new Error(`Perplexity API key invalid (401) - skipping platform`);
          }
          console.error(`Perplexity API error details: ${errorText.substring(0, 200)}`);
          throw new Error(`Perplexity API error: ${response.status} - ${errorText.substring(0, 300)}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          const content = data.choices[0].message.content;
          const citations = data.citations || [];

          return JSON.stringify({
            content,
            citations,
            platform: 'perplexity',
          });
        }

        console.error('Unexpected Perplexity response format:', JSON.stringify(data).substring(0, 200));
        throw new Error('Unexpected Perplexity response format');
      } catch (error) {
        console.error(`Error with Perplexity API:`, error);
        throw error;
      }
    }

    // Grok (xAI) - NOT Groq. Uses xAI API endpoint with grok-3 model
    if (platform === 'grok' && apiKey) {
      try {
        // Enhance prompt to request sources from live web and X (Twitter) data
        const enhancedPrompt = `Use live web and X data.
Cite the exact post or article used for each claim.
Include direct URLs.

Question: ${prompt}`;

        const response = await fetchWithRetry('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'grok-3',
            messages: [
              { role: 'system', content: 'You are a helpful business research assistant with access to live web data, X (Twitter), and trending news. Always cite sources with direct URLs when available. Provide detailed, factual responses about companies and brands.' },
              { role: 'user', content: enhancedPrompt }
            ],
            max_tokens: 4000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Handle 429 rate limit errors specifically
          if (response.status === 429) {
            throw new Error(`Grok (xAI) API error: Too Many Requests - Rate limit exceeded. Please wait before retrying.`);
          }
          throw new Error(`Grok (xAI) API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        console.error(`Error with Grok (xAI) API:`, error);
        throw error;
      }
    }
    
    throw new Error(`No API key available for platform: ${platform}`);
  } catch (error) {
    console.error(`Error querying AI platform:`, error);
    throw error;
  }
}

function extractSourcesFromResponse(response: string | any): Array<{url: string; title?: string; domain?: string}> {
  if (!response) return [];
  
  const sources: Array<{url: string; title?: string; domain?: string}> = [];
  
  // Handle Perplexity structured response with citations
  let responseText = '';
  let structuredCitations: any[] = [];
  
  if (typeof response === 'string') {
    // Try to parse as JSON (Perplexity returns structured data)
    try {
      const parsed = JSON.parse(response);
      if (parsed.content && parsed.citations) {
        responseText = parsed.content;
        structuredCitations = Array.isArray(parsed.citations) ? parsed.citations : [];
      } else {
        responseText = response;
      }
    } catch (e) {
      // Not JSON, treat as plain text
      responseText = response;
    }
  } else if (typeof response === 'object' && response !== null) {
    // Already parsed object
    if (response.content && response.citations) {
      responseText = response.content;
      structuredCitations = Array.isArray(response.citations) ? response.citations : [];
    } else {
      responseText = JSON.stringify(response);
    }
  } else {
    responseText = String(response);
  }
  
  // First, extract structured citations (from Perplexity and similar platforms)
  if (structuredCitations.length > 0) {
    structuredCitations.forEach((citation: any) => {
      try {
        let url = '';
        let title = '';
        
        if (typeof citation === 'string') {
          url = citation;
        } else if (typeof citation === 'object' && citation !== null) {
          url = citation.url || citation.link || citation.source || '';
          title = citation.title || citation.name || '';
        }
        
        if (url) {
          // Clean and normalize URL
          let cleanUrl = url.trim().replace(/[.,;:!?)\]\}]+$/, '');
          
          // Add protocol if missing
          if (!cleanUrl.match(/^https?:\/\//)) {
            cleanUrl = 'https://' + cleanUrl;
          }
          
          // Validate URL format
          try {
            const urlObj = new URL(cleanUrl);
            const domain = urlObj.hostname.toLowerCase();
            const excludedDomains = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'x.com'];
            
            if (!excludedDomains.some(excluded => domain.includes(excluded))) {
              sources.push({
                url: cleanUrl,
                title: title || undefined,
                domain: urlObj.hostname.replace(/^www\./, '')
              });
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      } catch (e) {
        // Skip invalid citation
      }
    });
  }
  
  // Also extract URLs from text using patterns (for platforms that don't provide structured citations)
  // Enhanced patterns to catch more URLs from ChatGPT, Claude, and other platforms
  const urlPatterns = [
    // Standard HTTP/HTTPS URLs (most comprehensive pattern)
    /https?:\/\/[^\s<>"{}|\\^`\[\]()]+/gi,
    // URLs without protocol but with www
    /www\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]()]*)?/gi,
    // Domain patterns with common TLDs (expanded list)
    /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.(?:com|org|net|edu|gov|io|co|ai|tech|app|dev|me|info|biz|uk|ca|au|de|fr|es|it|nl|se|no|dk|fi|pl|cz|at|ch|be|ie|nz|jp|cn|in|br|mx|ar|cl|co|pe|za|ae|sa|il|tr|kr|tw|sg|my|th|id|ph|vn|hk|mo|ru|ua|by|kz|az|ge|am|uz|tj|kg|tm|md|ro|bg|hr|rs|ba|mk|al|me|si|sk|hu|ee|lv|lt|is|mt|cy|lu|li|monaco|ad|mc|sm|va|va|gi|je|gg|im|fo|gl|ax|sj|bv|gs|hm|tf|aq|nu|nf|tk|pw|fm|mh|mp|gu|as|vi|pr|gp|mq|bl|mf|pm|re|yt|wf|pf|nc|vu|nc|ck|ws|to|ki|tv|nr|nz|fj|pg|sb|nc|vu|nc|ck|ws|to|ki|tv|nr|nz|fj|pg|sb|nc|vu|nc|ck|ws|to|ki|tv|nr|nz|fj|pg|sb)(?:\/[^\s<>"{}|\\^`\[\]()]*)?/gi,
    // Markdown-style links: [text](url) or [text](url "title")
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi,
    // Plain domain patterns (without www or protocol)
    /\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`\[\]()]*)?/gi
  ];
  
  const foundUrls = new Set<string>();
  
  // First, extract markdown-style links: [text](url)
  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi;
  let markdownMatch;
  while ((markdownMatch = markdownLinkPattern.exec(responseText)) !== null) {
    const url = markdownMatch[2];
    if (url && url.length > 4) {
      let cleanUrl = url.trim()
        .replace(/[.,;:!?)\]\}]+$/, '')
        .replace(/^[(\[]+/, '')
        .replace(/[)\]]+$/, '')
        .replace(/['"]+$/, '')
        .replace(/^['"]+/, '');
      
      if (cleanUrl.match(/^https?:\/\//i)) {
        try {
          const urlObj = new URL(cleanUrl);
          const domain = urlObj.hostname.toLowerCase();
          if (domain.length >= 3) {
            foundUrls.add(cleanUrl.toLowerCase());
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }
  }
  
  // Then extract URLs using other patterns
  for (const pattern of urlPatterns) {
    // Skip markdown pattern as we already handled it
    if (pattern === markdownLinkPattern) continue;
    
    let match;
    while ((match = pattern.exec(responseText)) !== null) {
      let url = match[0];
      
      // Clean and normalize URL - more aggressive cleaning
      let cleanUrl = url.trim()
        .replace(/[.,;:!?)\]\}]+$/, '') // Remove trailing punctuation
        .replace(/^[(\[]+/, '') // Remove leading brackets/parentheses
        .replace(/[)\]]+$/, '') // Remove trailing brackets/parentheses
        .replace(/['"]+$/, '') // Remove trailing quotes
        .replace(/^['"]+/, ''); // Remove leading quotes
      
      // Skip if too short or doesn't look like a URL
      if (cleanUrl.length < 4 || !cleanUrl.includes('.')) continue;
      
      // Add protocol if missing
      if (!cleanUrl.match(/^https?:\/\//i)) {
        // Only add https:// if it looks like a domain
        if (cleanUrl.match(/^[a-zA-Z0-9]/) && cleanUrl.includes('.')) {
          cleanUrl = 'https://' + cleanUrl;
        } else {
          continue; // Skip if it doesn't look like a valid domain
        }
      }
      
      // Validate URL format
      try {
        const urlObj = new URL(cleanUrl);
        const domain = urlObj.hostname.toLowerCase();
        
        // Skip if domain is too short
        if (domain.length < 3) continue;
        
        // Expanded list of excluded domains (social media, search engines, etc.)
        const excludedDomains = [
          'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com', 'yandex.com',
          'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'x.com',
          'reddit.com', 'tiktok.com', 'pinterest.com', 'snapchat.com', 'whatsapp.com',
          'telegram.org', 'discord.com', 'slack.com', 'microsoft.com', 'apple.com',
          'amazon.com', 'wikipedia.org', 'wikimedia.org'
        ];
        
        // Check if domain should be excluded
        const shouldExclude = excludedDomains.some(excluded => 
          domain === excluded || domain.endsWith('.' + excluded) || domain.includes('.' + excluded + '.')
        );
        
        if (!shouldExclude && !foundUrls.has(cleanUrl.toLowerCase())) {
          foundUrls.add(cleanUrl.toLowerCase());
        }
      } catch (e) {
        // Invalid URL, skip
        continue;
      }
    }
  }
  
  // Convert found URLs to source objects (avoid duplicates)
  foundUrls.forEach(url => {
    // Check if already added from structured citations
    if (sources.some(s => s.url.toLowerCase() === url.toLowerCase())) {
      return;
    }
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      
      // Try to extract title from context
      const urlIndex = responseText.indexOf(url);
      let title: string | undefined = undefined;
      
      if (urlIndex !== -1) {
        // Look for title patterns around the URL
        const contextStart = Math.max(0, urlIndex - 150);
        const contextEnd = Math.min(responseText.length, urlIndex + url.length + 150);
        const context = responseText.substring(contextStart, contextEnd);
        
        // Common title patterns
        const titlePatterns = [
          // "Title" (URL) or [Title](URL)
          /["'\[]([^"'\[\]]+?)["'\]][\s\(]*https?:\/\//gi,
          // Title - URL or Title: URL
          /([^-\n:]{3,50})\s*[-:]\s*https?:\/\//gi,
          // Numbered/bullet lists: 1. Title URL or - Title URL
          /(?:^\s*(?:\d+\.|[-•])\s*)([^\n]{3,50})\s+https?:\/\//gim
        ];
        
        for (const pattern of titlePatterns) {
          const match = context.match(pattern);
          if (match && match[1]) {
            const extractedTitle = match[1].trim();
            if (extractedTitle.length > 3 && extractedTitle.length < 200) {
              title = extractedTitle;
              break;
            }
          }
        }
      }
      
      sources.push({
        url: url,
        title: title,
        domain: domain
      });
    } catch (e) {
      // Skip invalid URLs
    }
  });
  
  // Remove duplicates based on URL (case-insensitive)
  const uniqueSources: Array<{url: string; title?: string; domain?: string}> = [];
  const seenUrls = new Set<string>();
  
  sources.forEach(source => {
    const lowerUrl = source.url.toLowerCase();
    if (!seenUrls.has(lowerUrl)) {
      seenUrls.add(lowerUrl);
      uniqueSources.push(source);
    }
  });
  
  return uniqueSources;
}

// =============================================================================
// HIGH-PRECISION BRAND MENTION DETECTION
// =============================================================================
// These helpers prevent false positives from generic tokens like "pro", "inc", etc.

// ONLY truly generic words - removed words that could be part of brand names
const GENERIC_TOKENS = new Set([
  'inc', 'llc', 'ltd', 'co', 'corp', 'company', 'group', 'official',
  'the', 'and', 'for', 'with', 'best', 'top', 'new', 'get', 'buy', 'free',
  'usa', 'uk', 'www', 'com', 'org', 'net', 'io'
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")  // Normalize quotes
    .replace(/[^\w\s'-]/g, ' ')  // Remove special chars except hyphens/apostrophes
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomainFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Split camelCase or PascalCase words (e.g., "HighLevel" -> ["high", "level"])
function splitCamelCase(word: string): string[] {
  const parts = word.split(/(?=[A-Z])/);
  if (parts.length > 1) {
    return parts.map(p => p.toLowerCase()).filter(p => p.length > 0);
  }
  return [];
}

interface BrandTokens {
  fullPhrase: string;           // "yalmeh pro" normalized
  fullPhraseNoSpaces: string;   // "yalmehpro"
  strongTokens: string[];       // ["yalmeh"] - tokens that are NOT generic
  allTokens: string[];          // ["yalmeh", "pro"] - all tokens
  domainCore: string | null;    // "yalmehpro" from "yalmehpro.com"
  domainVariations: string[];   // All domain variations to check
  camelCaseParts: string[];     // ["high", "level"] from "HighLevel"
}

function tokenizeBrand(brandName: string, websiteUrl?: string): BrandTokens {
  const normalized = normalizeText(brandName);
  const tokens = normalized.split(/[\s\-]+/).filter(t => t.length > 0);
  
  // Extract camelCase parts from original brand name (before normalization)
  const camelCaseParts: string[] = [];
  const words = brandName.split(/[\s\-]+/);
  for (const word of words) {
    const parts = splitCamelCase(word);
    if (parts.length > 1) {
      camelCaseParts.push(...parts);
    }
  }
  
  // Strong tokens = tokens that are NOT in the generic list
  // Lowered length requirement: 3 chars for single-token brands, 3 chars for multi-token
  const minLength = 3;
  const strongTokens = [
    ...tokens.filter(t => t.length >= minLength && !GENERIC_TOKENS.has(t)),
    // Also include camelCase parts as strong tokens if they're long enough
    ...camelCaseParts.filter(t => t.length >= minLength && !GENERIC_TOKENS.has(t))
  ];
  
  // Remove duplicates from strongTokens
  const uniqueStrongTokens = [...new Set(strongTokens)];
  
  // Extract domain variations
  let domainCore: string | null = null;
  const domainVariations: string[] = [];
  
  if (websiteUrl) {
    const domain = extractDomainFromUrl(websiteUrl);
    if (domain) {
      // Remove TLD (.com, .io, etc.)
      domainCore = domain.replace(/\.[a-z]{2,}$/i, '').replace(/[^a-z0-9]/g, '');
      domainVariations.push(domainCore);
      
      // Try to extract meaningful parts from domain
      // e.g., "gohighlevel" -> ["gohighlevel", "highlevel", "high", "level"]
      if (domainCore.length >= 6) {
        // Check if brand name appears as substring in domain
        const normalizedBrand = normalized.replace(/\s+/g, '');
        if (domainCore.includes(normalizedBrand) && normalizedBrand !== domainCore) {
          domainVariations.push(normalizedBrand);
        }
        
        // Try removing common prefixes like "go", "get", "try", "use"
        const prefixes = ['go', 'get', 'try', 'use', 'my', 'the', 'app'];
        for (const prefix of prefixes) {
          if (domainCore.startsWith(prefix) && domainCore.length > prefix.length + 3) {
            domainVariations.push(domainCore.slice(prefix.length));
          }
        }
      }
    }
  }
  
  return {
    fullPhrase: normalized,
    fullPhraseNoSpaces: normalized.replace(/\s+/g, ''),
    strongTokens: uniqueStrongTokens,
    allTokens: tokens,
    domainCore,
    domainVariations: [...new Set(domainVariations)],
    camelCaseParts
  };
}

interface MentionResult {
  mentioned: boolean;
  matchReason: 'exact_phrase' | 'strong_tokens' | 'domain' | 'fallback_substring' | 'none';
  matchedTokens: string[];
}

// Common English words that should NEVER trigger a brand match on their own
// These are words that appear frequently in normal text and cause false positives
const COMMON_ENGLISH_WORDS = new Set([
  'high', 'level', 'pro', 'max', 'plus', 'one', 'first', 'best', 'top', 'new',
  'smart', 'fast', 'quick', 'easy', 'simple', 'super', 'ultra', 'mega', 'mini',
  'global', 'world', 'open', 'free', 'prime', 'elite', 'premium', 'standard',
  'basic', 'advanced', 'professional', 'enterprise', 'cloud', 'digital', 'tech',
  'data', 'info', 'web', 'app', 'software', 'solution', 'platform', 'system',
  'hub', 'center', 'core', 'base', 'point', 'click', 'go', 'get', 'flow', 'lead',
  'sales', 'market', 'marketing', 'business', 'service', 'services', 'agency'
]);

function matchesBrandMention(
  responseText: string, 
  brandTokens: BrandTokens
): MentionResult {
  const normalizedResponse = normalizeText(responseText);
  const matchedTokens: string[] = [];
  
  // Rule 1: Exact phrase match with word boundaries (HIGHEST PRIORITY)
  // For camelCase brands like "HighLevel", check for the exact combined form
  const phraseRegex = new RegExp(`\\b${escapeRegex(brandTokens.fullPhrase)}\\b`, 'i');
  if (phraseRegex.test(normalizedResponse)) {
    return { mentioned: true, matchReason: 'exact_phrase', matchedTokens: [brandTokens.fullPhrase] };
  }
  
  // Rule 1b: No-space variant (e.g., "highlevel" for "HighLevel", "yalmehpro" for "Yalmeh Pro")
  // This is the primary match for camelCase brands
  if (brandTokens.fullPhraseNoSpaces.length >= 4) {
    const noSpaceRegex = new RegExp(`\\b${escapeRegex(brandTokens.fullPhraseNoSpaces)}\\b`, 'i');
    if (noSpaceRegex.test(normalizedResponse)) {
      return { mentioned: true, matchReason: 'exact_phrase', matchedTokens: [brandTokens.fullPhraseNoSpaces] };
    }
    // Also check for the joined form as a substring (for cases where it appears mid-word or in URLs)
    // e.g., "gohighlevel.com" should match "highlevel"
    if (brandTokens.fullPhraseNoSpaces.length >= 6 && normalizedResponse.includes(brandTokens.fullPhraseNoSpaces)) {
      return { mentioned: true, matchReason: 'exact_phrase', matchedTokens: [brandTokens.fullPhraseNoSpaces] };
    }
  }
  
  // Rule 2: Domain variations match
  for (const domainVar of brandTokens.domainVariations) {
    if (domainVar && domainVar.length >= 4) {
      const domainRegex = new RegExp(`\\b${escapeRegex(domainVar)}\\b`, 'i');
      if (domainRegex.test(normalizedResponse)) {
        return { mentioned: true, matchReason: 'domain', matchedTokens: [domainVar] };
      }
    }
  }
  
  // Rule 3: Strong token matching - BUT exclude common English words
  const foundStrongTokens: string[] = [];
  for (const token of brandTokens.strongTokens) {
    // Skip tokens that are common English words (they cause false positives)
    if (COMMON_ENGLISH_WORDS.has(token.toLowerCase())) {
      continue;
    }
    const tokenRegex = new RegExp(`\\b${escapeRegex(token)}\\b`, 'i');
    if (tokenRegex.test(normalizedResponse)) {
      foundStrongTokens.push(token);
    }
  }
  
  // For single-word brands (like "HighLevel"), we ONLY match on:
  // 1. The exact phrase/no-spaces form (checked above)
  // 2. A single strong token that is >= 7 chars AND not a common word
  if (brandTokens.allTokens.length === 1) {
    // Only match if we found a strong token that is 7+ chars (to avoid false positives)
    if (foundStrongTokens.length >= 1 && foundStrongTokens[0].length >= 7) {
      return { mentioned: true, matchReason: 'strong_tokens', matchedTokens: foundStrongTokens };
    }
    
    // REMOVED: camelCase parts matching - this caused "high" + "level" to match
    // phrases like "enterprise-level" + "high-quality" which is wrong
    // CamelCase brands like "HighLevel" should only match as "highlevel" (joined)
  } else {
    // For multi-word brands, require 2+ non-common strong tokens OR 1 very unique token (>= 7 chars)
    if (foundStrongTokens.length >= 2) {
      return { mentioned: true, matchReason: 'strong_tokens', matchedTokens: foundStrongTokens };
    }
    if (foundStrongTokens.length === 1 && foundStrongTokens[0].length >= 7) {
      return { mentioned: true, matchReason: 'strong_tokens', matchedTokens: foundStrongTokens };
    }
  }
  
  // Rule 4: Fallback - case-insensitive substring search for longer brand names
  // Only for brands with 7+ characters to avoid false positives (increased from 6)
  if (brandTokens.fullPhrase.length >= 7) {
    if (normalizedResponse.includes(brandTokens.fullPhrase)) {
      return { mentioned: true, matchReason: 'fallback_substring', matchedTokens: [brandTokens.fullPhrase] };
    }
  }
  if (brandTokens.fullPhraseNoSpaces.length >= 7) {
    if (normalizedResponse.includes(brandTokens.fullPhraseNoSpaces)) {
      return { mentioned: true, matchReason: 'fallback_substring', matchedTokens: [brandTokens.fullPhraseNoSpaces] };
    }
  }
  
  return { mentioned: false, matchReason: 'none', matchedTokens: [] };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// MAIN ANALYZE FUNCTION (UPDATED TO USE HIGH-PRECISION DETECTION)
// =============================================================================

async function analyzeBrandMention(response: string, brandName: string, competitors: string[] = [], websiteUrl?: string) {
  if (!response || !brandName) return null;

  const lowerResponse = response.toLowerCase();
  const brandTokens = tokenizeBrand(brandName, websiteUrl);
  
  // Use high-precision brand detection
  const brandResult = matchesBrandMention(response, brandTokens);
  const brandMentioned = brandResult.mentioned;
  
  // Keep brandVariations for backward compatibility with competitor analysis below
  // but these are now only used for context extraction, NOT for detection
  const brandVariations = [
    brandTokens.fullPhrase,
    brandTokens.fullPhraseNoSpaces,
    ...brandTokens.strongTokens
  ].filter(v => v.length > 2);
  
  console.log(`[Brand Detection] "${brandName}" -> mentioned: ${brandMentioned}, reason: ${brandResult.matchReason}, matched: [${brandResult.matchedTokens.join(', ')}]`);
  
  // Find competitor mentions with more context
  const competitorsFound: string[] = [];
  const competitorContexts: Record<string, any> = {};
  
  if (competitors && competitors.length > 0) {
    for (const competitor of competitors) {
      // Use high-precision detection for competitors too
      const competitorTokens = tokenizeBrand(competitor);
      const competitorResult = matchesBrandMention(response, competitorTokens);
      const competitorMentioned = competitorResult.mentioned;
      
      // Keep competitorVariations for context extraction only
      const competitorVariations = [
        competitorTokens.fullPhrase,
        competitorTokens.fullPhraseNoSpaces,
        ...competitorTokens.strongTokens
      ].filter(v => v.length > 2);
      
      if (competitorMentioned) {
        competitorsFound.push(competitor);
        
        // Find context for competitor mentions
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const competitorSentences = sentences.filter(s => 
          competitorVariations.some(variation => s.toLowerCase().includes(variation))
        );
        
        if (competitorSentences.length > 0) {
          // Detect comparison language
          const directComparisonSentences = competitorSentences.filter(s => 
            brandVariations.some(brandVar => s.toLowerCase().includes(brandVar)) && 
            (
              s.toLowerCase().includes(' vs ') || 
              s.toLowerCase().includes(' versus ') || 
              s.toLowerCase().includes(' compared to ') || 
              s.toLowerCase().includes(' better than ') || 
              s.toLowerCase().includes(' worse than ') ||
              s.toLowerCase().includes(' similar to ') ||
              s.toLowerCase().includes(' like ') ||
              s.toLowerCase().includes(' alternative to ') ||
              s.toLowerCase().includes(' include ') ||
              s.toLowerCase().includes(' such as ') ||
              s.toLowerCase().includes(' along with ') ||
              s.toLowerCase().includes(' alongside ')
            )
          );
          
          // Enhanced sentiment detection
          const positiveWords = ['better', 'best', 'superior', 'excellent', 'recommended', 'preferred', 'leading', 'top', 'great', 'outstanding', 'popular', 'trusted', 'reliable'];
          const negativeWords = ['worse', 'worst', 'inferior', 'poor', 'avoid', 'problematic', 'overpriced', 'disappointing', 'limited', 'lacking', 'outdated', 'expensive'];
          
          const competitorPositive = positiveWords.some(word => 
            competitorSentences.some(s => {
              const sentence = s.toLowerCase();
              const wordIndex = sentence.indexOf(word);
              const competitorIndex = competitorVariations.map(v => sentence.indexOf(v)).find(i => i !== -1) || -1;
              // Check if positive word is near competitor mention (within 10 words)
              return wordIndex !== -1 && competitorIndex !== -1 && Math.abs(wordIndex - competitorIndex) < 50;
            })
          );
          
          const competitorNegative = negativeWords.some(word => 
            competitorSentences.some(s => {
              const sentence = s.toLowerCase();
              const wordIndex = sentence.indexOf(word);
              const competitorIndex = competitorVariations.map(v => sentence.indexOf(v)).find(i => i !== -1) || -1;
              return wordIndex !== -1 && competitorIndex !== -1 && Math.abs(wordIndex - competitorIndex) < 50;
            })
          );
          
          // Determine if competitor is positioned as better or worse than the brand
          let comparisonResult = 'neutral';
          if (directComparisonSentences.length > 0) {
            const comparisonSentence = directComparisonSentences[0].toLowerCase();
            const brandIndex = brandVariations.map(v => comparisonSentence.indexOf(v)).find(i => i !== -1) || -1;
            const competitorIndex = competitorVariations.map(v => comparisonSentence.indexOf(v)).find(i => i !== -1) || -1;
            
            if (brandIndex !== -1 && competitorIndex !== -1) {
              const brandFirst = brandIndex < competitorIndex;
              
              if (comparisonSentence.includes('better than') || comparisonSentence.includes('superior to')) {
                comparisonResult = brandFirst ? 'brand_better' : 'competitor_better';
              } else if (comparisonSentence.includes('worse than') || comparisonSentence.includes('inferior to')) {
                comparisonResult = brandFirst ? 'brand_worse' : 'competitor_worse';
              }
            }
          }
          
          // Check for ranking/listing context
          const isInList = competitorSentences.some(s => {
            const sentence = s.toLowerCase();
            return sentence.includes('top ') || 
                   sentence.includes('best ') || 
                   sentence.includes('leading ') ||
                   sentence.includes('popular ') ||
                   sentence.includes('include ') ||
                   sentence.includes('such as ') ||
                   /\d+\./.test(sentence) || // Numbered lists
                   sentence.includes('•') || sentence.includes('-'); // Bullet points
          });
          
          competitorContexts[competitor] = {
            mentions: competitorSentences.length,
            context: competitorSentences[0].trim(), // First mention context
            position: sentences.findIndex(s => competitorVariations.some(v => s.toLowerCase().includes(v))) + 1,
            mentioned_with_brand: competitorSentences.some(s => brandVariations.some(v => s.toLowerCase().includes(v))),
            direct_comparison: directComparisonSentences.length > 0,
            comparison_result: comparisonResult,
            sentiment: competitorPositive && !competitorNegative ? 'positive' : 
                       competitorNegative && !competitorPositive ? 'negative' : 'mixed',
            all_contexts: competitorSentences.map(s => s.trim()).slice(0, 3), // Up to 3 contexts
            in_ranking_list: isInList,
            ranking_position: isInList ? sentences.findIndex(s => competitorVariations.some(v => s.toLowerCase().includes(v))) + 1 : null
          };
        }
      }
    }
  }
  
  if (!brandMentioned && competitorsFound.length === 0) {
    return {
      brand_mentioned: false,
      mention_position: null,
      sentiment_score: null,
      competitors_found: [],
      competitor_contexts: {},
      mention_context: null,
      query_relevance: 'low' // The response doesn't mention our brand or competitors
    };
  }

  // Find mention position (sentence number) for brand
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let mentionPosition: number | null = null;
  let mentionContext: string | null = null;
  let allBrandMentions: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    if (brandVariations.some(variation => sentences[i].toLowerCase().includes(variation))) {
      if (mentionPosition === null) {
        mentionPosition = i + 1;
        mentionContext = sentences[i].trim();
      }
      allBrandMentions.push(sentences[i].trim());
    }
  }

  // Determine query relevance
  let queryRelevance = 'high';
  if (!brandMentioned && competitorsFound.length > 0) {
    queryRelevance = 'medium'; // Competitors mentioned but not our brand
  } else if (!brandMentioned && competitorsFound.length === 0) {
    queryRelevance = 'low'; // Neither brand nor competitors mentioned
  }

  // Helper function for keyword-based sentiment fallback
  const calculateKeywordSentiment = (text: string): number => {
    const positiveWords = ['good', 'great', 'excellent', 'best', 'leading', 'innovative', 'reliable', 'trusted', 'recommended', 'popular', 'top', 'outstanding', 'superior', 'preferred', 'robust', 'comprehensive', 'powerful'];
    const negativeWords = ['bad', 'poor', 'worst', 'problematic', 'issues', 'concerns', 'disappointing', 'avoid', 'limited', 'expensive', 'lacking', 'outdated', 'inferior'];
    
    const lowerText = text.toLowerCase();
    const positive = positiveWords.some(word => lowerText.includes(word));
    const negative = negativeWords.some(word => lowerText.includes(word));
    
    if (positive && !negative) return 0.7;
    if (negative && !positive) return -0.3;
    if (positive && negative) return 0.2; // Mixed sentiment
    return 0.1; // Neutral with slight positive bias for mentions
  };

  // Sentiment analysis - ALWAYS calculate for brand mentions
  let sentimentScore: number | null = null;
  const textToAnalyze = mentionContext || 
    (competitorsFound.length > 0 ? 
      competitorContexts[competitorsFound[0]]?.context : 
      null);
  
  if (textToAnalyze) {
    // Try OpenAI sentiment analysis first
    let openAISucceeded = false;
    
    if (openAIApiKey) {
      try {
        const targetName = mentionContext ? brandName : competitorsFound[0];
        
        const sentimentResponse = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: 'You are a sentiment analysis expert. Analyze the sentiment of the given text about a brand. Respond with only a number between -1 (very negative) and 1 (very positive), with 0 being neutral.' 
              },
              { 
                role: 'user', 
                content: `Analyze the sentiment of this text about ${targetName}: "${textToAnalyze}"` 
              }
            ],
            max_tokens: 10,
            temperature: 0.1,
          }),
        });

        if (sentimentResponse.ok) {
          const sentimentData = await sentimentResponse.json();
          const sentimentText = sentimentData.choices[0]?.message?.content?.trim();
          if (sentimentText) {
            const parsedSentiment = parseFloat(sentimentText);
            if (!isNaN(parsedSentiment) && parsedSentiment >= -1 && parsedSentiment <= 1) {
              sentimentScore = parsedSentiment;
              openAISucceeded = true;
              console.log(`✓ OpenAI sentiment analysis: ${sentimentScore} for "${textToAnalyze.substring(0, 50)}..."`);
            }
          }
        } else {
          console.warn(`⚠️ OpenAI sentiment API returned ${sentimentResponse.status}, falling back to keyword analysis`);
        }
      } catch (error) {
        console.error('OpenAI sentiment analysis error:', error);
      }
    }
    
    // CRITICAL: Always fall back to keyword-based sentiment if OpenAI failed or unavailable
    if (!openAISucceeded) {
      sentimentScore = calculateKeywordSentiment(textToAnalyze);
      console.log(`✓ Keyword sentiment analysis: ${sentimentScore} for "${textToAnalyze.substring(0, 50)}..."`);
    }
  } else if (brandMentioned) {
    // Brand was mentioned but no specific context - assign neutral-positive sentiment
    sentimentScore = 0.3;
    console.log(`✓ Default positive sentiment for brand mention without context`);
  }

  // Extract feature mentions
  const featureKeywords = [
    'feature', 'functionality', 'capability', 'tool', 'integration', 
    'api', 'interface', 'dashboard', 'reporting', 'analytics', 
    'security', 'performance', 'pricing', 'cost', 'support',
    'customer service', 'usability', 'user experience', 'ux', 'ui',
    'mobile', 'cloud', 'automation', 'workflow', 'collaboration'
  ];
  
  const featureMentions = sentences
    .filter(s => 
      brandVariations.some(variation => s.toLowerCase().includes(variation)) && 
      featureKeywords.some(keyword => s.toLowerCase().includes(keyword))
    )
    .map(s => s.trim())
    .slice(0, 3); // Up to 3 feature mentions

  return {
    brand_mentioned: brandMentioned,
    mention_position: mentionPosition,
    sentiment_score: sentimentScore,
    competitors_found: competitorsFound,
    competitor_contexts: competitorContexts,
    mention_context: mentionContext,
    all_brand_mentions: allBrandMentions.slice(0, 5), // Up to 5 brand mentions
    feature_mentions: featureMentions,
    total_brand_mentions: allBrandMentions.length,
    total_competitor_mentions: competitorsFound.reduce((acc, comp) => 
      acc + (competitorContexts[comp]?.mentions || 0), 0),
    comparative_analysis: competitorsFound.length > 0 && brandMentioned,
    query_relevance: queryRelevance,
    brand_variations_detected: brandVariations.filter(v => lowerResponse.includes(v)),
    competitor_variations_detected: competitors.reduce((acc, comp) => {
      const variations = [comp.toLowerCase(), comp.toLowerCase().replace(/\s+/g, ''), comp.toLowerCase().replace(/[^\w\s]/g, '')];
      const detected = variations.filter(v => lowerResponse.includes(v));
      if (detected.length > 0) acc[comp] = detected;
      return acc;
    }, {} as Record<string, string[]>)
  };
}

async function fetchWebsiteContent(url: string): Promise<string> {
  if (!url) return '';
  
  try {
    // Make sure URL has proper protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    console.log(`Fetching website content from ${url}`);
    
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalysisBot/1.0)',
      },
      redirect: 'follow',
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      return '';
    }
    
    const html = await response.text();
    
    // Extract text content from HTML
    const textContent = extractTextFromHTML(html);
    console.log(`Extracted ${textContent.length} characters of text from website`);
    
    // Limit text length to avoid token issues
    return textContent.substring(0, 5000);
  } catch (error) {
    console.error(`Error fetching website content: ${error}`);
    return '';
  }
}

function extractTextFromHTML(html: string): string {
  try {
    // Simple regex-based extraction of text content
    // Remove scripts and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    
    // Remove all HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  } catch (error) {
    console.error(`Error extracting text from HTML: ${error}`);
    return '';
  }
}

// Language name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'ru': 'Russian',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
};

async function generateRealisticUserQueries(
  brandName: string, 
  industry: string, 
  keywords: string[] = [], 
  competitors: string[] = [], 
  websiteUrl: string = '',
  languageCode: string = 'en-US',
  countryCode?: string,
  countryName?: string,
  numQueries?: number // NEW: Allow specifying number of queries to generate
) {
  if (!openAIApiKey) {
    console.log('No OpenAI API key available for query generation, using fallback queries');
    return generateFallbackQueries(brandName, industry, keywords, competitors, languageCode);
  }

  try {
    // Calculate number of queries to generate (default based on whether country is specified)
    // Updated to 200 queries per platform as requested
    const defaultNumQueries = countryCode ? 200 : 200;
    const queriesToGenerate = numQueries || defaultNumQueries;
    
    const languageName = LANGUAGE_NAMES[languageCode] || languageCode;
    console.log(`Generating ${queriesToGenerate} realistic user queries for ${brandName} in ${industry} (${languageName}${countryName ? `, ${countryName}` : ''})`);
    
    // Fetch website content if URL is provided
    let websiteContent = '';
    if (websiteUrl) {
      websiteContent = await fetchWebsiteContent(websiteUrl);
    }
    
    const keywordContext = keywords.length > 0 ? `Key features/keywords: ${keywords.join(', ')}` : '';
    const competitorContext = competitors.length > 0 ? `Main competitors: ${competitors.join(', ')}` : '';
    const websiteContext = websiteContent ? `Website content summary: ${websiteContent.substring(0, 2000)}` : '';
    const geographyContext = countryCode && countryName ? `Target Geography: ${countryName} (${countryCode}) - Queries should be relevant to users in this country/region` : '';
    
    // CRITICAL: Generate GENERIC prompts that do NOT contain the brand name OR competitor names
    // The goal is to see if AI platforms organically recommend/mention the brand in their responses
    const prompt = `You are an expert in generating realistic search queries that people actually type when researching solutions in a specific industry.

Generate ${queriesToGenerate} GENERIC search queries in ${languageName}${countryName ? ` for users in ${countryName}` : ''} that real users would type when looking for ${industry} solutions.

IMPORTANT CONTEXT (for understanding the industry only - DO NOT mention these in queries):
- Industry: ${industry}
${keywordContext ? `- Relevant features: ${keywordContext}` : ''}
${websiteContext ? `- Industry context: ${websiteContext.substring(0, 500)}` : ''}
${geographyContext ? `- ${geographyContext}` : ''}

CRITICAL RULES - MUST FOLLOW:
1. NEVER include ANY specific company names, brand names, or product names in queries
2. NEVER include "${brandName}" or any competitor names in queries
3. Queries must be GENERIC - asking for recommendations, comparisons, or advice about the CATEGORY/INDUSTRY
4. The purpose is to see which brands AI platforms NATURALLY recommend in their responses

Query categories to generate (distribute evenly):
1. "Best/Top" queries - e.g., "What are the best ${industry} tools for small businesses?" or "Top 10 ${industry} software in 2024?"
2. Recommendation queries - e.g., "What do experts recommend for ${industry}?" or "Which ${industry} platform should I use for [use case]?"
3. Comparison queries (WITHOUT brand names) - e.g., "How do I compare ${industry} solutions?" or "What should I look for in a ${industry} tool?"
4. Feature-specific queries - e.g., "Which ${industry} tools have [specific feature]?" or "Best ${industry} software with automation features?"
5. Use-case queries - e.g., "What ${industry} tool is best for startups?" or "Which ${industry} platform works best for agencies?"
6. Problem-solving queries - e.g., "How to choose the right ${industry} software?" or "What ${industry} solution can help with [problem]?"

GUIDELINES:
- Write ALL queries in ${languageName}${countryName ? ` appropriate for ${countryName}` : ''}
- Queries should be 1-2 sentences, conversational and natural
- Use real industry terminology: ${keywords.length > 0 ? keywords.slice(0, 5).join(', ') : 'common industry terms'}
- Focus on queries where AI would naturally list or recommend specific companies
- NO company names, brand names, or product names allowed in queries
${countryName ? `- Include ${countryName}-specific context when relevant` : ''}

Return EXACTLY ${queriesToGenerate} queries as a JSON array of strings. No markdown, no backticks, just a clean JSON array.`;

    // Note: The number of queries per combination is calculated to ensure 200 queries per platform total
    // Formula: 200 / (languages × regions) = queries per combination

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert in user search behavior and query generation. Generate realistic, conversational search queries that real users would type into search engines or AI assistants. Always format queries as proper sentences or questions with appropriate capitalization and punctuation. You always return properly formatted JSON arrays without any markdown formatting or explanation. You MUST generate the exact number of queries requested.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000, // Increased to support 200 queries
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`Query generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();
    
    try {
      // Clean up the response to ensure it's valid JSON
      let cleanedContent = generatedContent;
      
      // Remove markdown code blocks if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/```$/, '');
      }
      
      // Try to parse the JSON
      const queries = JSON.parse(cleanedContent);
      
      if (Array.isArray(queries) && queries.length > 0) {
        console.log(`Generated ${queries.length} realistic user queries`);
        
        // Process queries to ensure proper formatting
        const formattedQueries = queries.map(query => {
          // Ensure first letter is capitalized
          let formattedQuery = query.trim();
          if (formattedQuery.length > 0) {
            formattedQuery = formattedQuery.charAt(0).toUpperCase() + formattedQuery.slice(1);
          }
          
          // Ensure query ends with punctuation
          if (!/[.?!]$/.test(formattedQuery)) {
            // If it's a question (contains question words or has question-like structure), add question mark
            if (/\b(what|how|why|where|when|which|who|can|should|will|is|are|do|does|did)\b/i.test(formattedQuery) && 
                !formattedQuery.includes('?')) {
              formattedQuery += '?';
            } else {
              // Otherwise add period
              formattedQuery += '.';
            }
          }
          
          return formattedQuery;
        });
        
        // TESTING: Reduced query count - comment out for production
        // ORIGINAL: Ensure we have at least 50 queries by duplicating and modifying if needed
        // if (formattedQueries.length < 50) {
        //   console.log(`Only generated ${formattedQueries.length} queries, adding variations to reach 50`);
        //   
        //   // Create variations by adding year or modifiers
        //   const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
        //   const modifiers = ['Best', 'Top', 'Affordable', 'Recommended', 'Popular'];
        //   
        //   while (formattedQueries.length < 50) {
        //     const originalQuery = formattedQueries[Math.floor(Math.random() * formattedQueries.length)];
        //     const year = years[Math.floor(Math.random() * years.length)];
        //     const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        //     
        //     // Create variation
        //     if (!originalQuery.includes(year.toString())) {
        //       formattedQueries.push(`${originalQuery.replace(/[.?!]$/, '')} in ${year}.`);
        //     } else if (!originalQuery.toLowerCase().includes(modifier.toLowerCase())) {
        //       formattedQueries.push(`${modifier} ${originalQuery.charAt(0).toLowerCase() + originalQuery.slice(1)}`);
        //     } else {
        //       formattedQueries.push(`${originalQuery.replace(/[.?!]$/, '')} for small businesses.`);
        //     }
        //     
        //     // Avoid infinite loop if we can't add more variations
        //     if (formattedQueries.length >= 95) break;
        //   }
        // }
        
        // Ensure we have at least the requested number of queries (200 per platform)
        const queryLimit = queriesToGenerate; // Use the requested number (200)
        if (formattedQueries.length < queryLimit) {
          console.log(`Only generated ${formattedQueries.length} queries, adding variations to reach ${queryLimit}`);
          
          // Create variations by adding year or modifiers
          const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
          const modifiers = ['Best', 'Top', 'Affordable', 'Recommended', 'Popular', 'Leading', 'Premium', 'Enterprise', 'Professional'];
          
          while (formattedQueries.length < queryLimit) {
            const originalQuery = formattedQueries[Math.floor(Math.random() * formattedQueries.length)];
            const year = years[Math.floor(Math.random() * years.length)];
            const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            
            // Create variation
            if (!originalQuery.includes(year.toString())) {
              formattedQueries.push(`${originalQuery.replace(/[.?!]$/, '')} in ${year}.`);
            } else if (!originalQuery.toLowerCase().includes(modifier.toLowerCase())) {
              formattedQueries.push(`${modifier} ${originalQuery.charAt(0).toLowerCase() + originalQuery.slice(1)}`);
            } else {
              formattedQueries.push(`${originalQuery.replace(/[.?!]$/, '')} for small businesses.`);
            }
            
            // Avoid infinite loop - cap at 250 to allow some buffer
            if (formattedQueries.length >= 250) break;
          }
        }
        
        // Return queries with language and country metadata
        // Return up to the requested number of queries (200 per platform)
        return formattedQueries.slice(0, queryLimit).map(query => ({
          query,
          language: languageCode,
          country: countryCode || undefined
        }));
      } else {
        console.error('Generated content is not a valid array:', cleanedContent);
        throw new Error('Generated content is not a valid array');
      }
    } catch (parseError) {
      console.error('Failed to parse generated queries:', parseError, 'Content:', generatedContent);
      return generateFallbackQueries(brandName, industry, keywords, competitors, languageCode);
    }

  } catch (error) {
    console.error('Query generation failed:', error);
    return generateFallbackQueries(brandName, industry, keywords, competitors, languageCode);
  }
}

function generateFallbackQueries(brandName: string, industry: string, keywords: string[] = [], competitors: string[] = [], languageCode: string = 'en-US', countryCode?: string, countryName?: string): Array<{query: string, language: string, country?: string}> {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Industry-specific base queries
  const industryTerms = industry.toLowerCase().split(/\s+/);
  const primaryIndustryTerm = industryTerms[industryTerms.length - 1]; // Last word in industry
  
  // Create base queries with proper sentence formatting
  const baseQueries = [
    // General searches
    `What are the best ${industry} software options?`,
    `Top ${industry} tools in ${currentYear}.`,
    `I need good ${industry} solutions. Any recommendations?`,
    `What are the leading ${industry} platforms right now?`,
    `Can anyone suggest popular ${industry} apps?`,
    `How do different ${industry} software options compare?`,
    `I'm looking for honest ${industry} tools reviews.`,
    `What's the best ${industry} for small business?`,
    `Which enterprise ${industry} software should we consider?`,
    `Are there affordable ${industry} tools that actually work well?`,
    `Can I find free ${industry} software that's actually good?`,
    `How much does typical ${industry} software cost?`,
    `What ${industry} tool would you recommend for a beginner?`,
    `Which ${industry} platforms are most widely used?`,
    `What features should I look for in ${industry} software?`,
    `Is there ${primaryIndustryTerm} software that's easy for beginners?`,
    `What professional ${primaryIndustryTerm} tools do experts use?`,
    `Does anyone know ${industry} software with good customer support?`,
    `Are there any ${industry} platforms with free trials worth checking out?`,
    `I need ${industry} tools with a mobile app. Suggestions?`,
    
    // Problem-solving queries
    `How do I choose the right ${industry} software for my needs?`,
    `What's the best way to implement ${industry} software in my company?`,
    `What are the ${industry} best practices everyone should follow?`,
    `What benefits will ${industry} software bring to my business?`,
    `Why should I use specialized ${industry} tools instead of spreadsheets?`,
    `What ${industry} solution works best for remote teams?`,
    `How can I optimize my ${industry} workflow?`,
    `Are there ${industry} automation tools that actually save time?`,
    `What ${industry} tools integrate well with my existing systems?`,
    `Which ${industry} software has the best reporting features?`,
    `How can I improve ${primaryIndustryTerm} efficiency in my organization?`,
    `What's the best way to solve common ${primaryIndustryTerm} challenges?`,
    `Can you share some ${primaryIndustryTerm} productivity tips?`,
    `What are the steps for implementing ${industry} software successfully?`,
    `Is there a good guide for setting up ${industry} systems?`,
    
    // Specific use cases
    `What ${industry} tools work best for startups?`,
    `Which ${industry} software is designed for remote teams?`,
    `What ${industry} solutions scale well for large companies?`,
    `Can you recommend ${industry} tools specifically for agencies?`,
    `What ${industry} software do consultants prefer?`,
    `Are there ${industry} tools with good mobile apps?`,
    `What are the best cloud-based ${industry} solutions?`,
    `Which ${industry} tools offer API access for customization?`,
    `I need ${industry} software with custom fields. Suggestions?`,
    `What ${industry} platforms include time tracking features?`,
    `Which ${industry} tool is best for ${primaryIndustryTerm} professionals?`,
    `What ${industry} software works well for small teams?`,
    `Are there ${industry} tools designed specifically for freelancers?`,
    `Can you recommend ${industry} software for non-profits with limited budgets?`,
    `What ${industry} tools are used in education?`,
    
    // Comparison and alternatives
    `What are the best alternatives to mainstream ${industry} tools?`,
    `Are there good open source ${industry} options available?`,
    `How does dedicated ${industry} software compare to using spreadsheets?`,
    `I need a simple, no-frills ${industry} solution. Suggestions?`,
    `Which ${industry} tools have the most advanced features?`,
    `What's the most comprehensive ${industry} tool comparison for ${currentYear}?`,
    `What should I consider when switching ${industry} platforms?`,
    `How difficult is it to migrate to a new ${industry} tool?`,
    `Which ${industry} software offers the best free trial experience?`,
    `How can I effectively compare ${industry} software demos?`,
    `What's the difference between various ${primaryIndustryTerm} software options?`,
    `How does dedicated ${industry} software compare to manual ${primaryIndustryTerm} processes?`,
    `Should I use a specialized ${industry} tool or build a custom ${primaryIndustryTerm} solution?`,
    `What are the pros and cons of cloud vs on-premise ${industry} software?`,
    `How do I calculate ROI when comparing different ${industry} software options?`,
    
    // Budget-conscious queries
    `What are the most affordable ${industry} software options?`,
    `Are there any budget-friendly ${industry} tools that actually work well?`,
    `Where can I find deals on ${industry} software?`,
    `Which ${industry} platforms offer the best free trials?`,
    `Do any ${industry} tools offer student discounts?`,
    `Are there special ${industry} pricing options for nonprofits?`,
    `What ${industry} software is affordable for small teams?`,
    `Which ${industry} tools let you pay per user?`,
    `Are there any ${industry} solutions with one-time payment instead of subscriptions?`,
    `How can I avoid ongoing subscriptions for ${industry} software?`,
    `What are the different pricing models for ${industry} tools?`,
    `Which ${industry} software offers the best value for money?`,
    `How do the costs of different ${industry} platforms compare?`,
    `Can you explain the typical pricing tiers for ${industry} software?`,
    `What's the real difference between free and paid ${industry} features?`,
    
    // Feature-specific queries
    `Which ${industry} tools have the best dashboard features?`,
    `I need ${industry} software with good notification systems. Suggestions?`,
    `What ${industry} platforms integrate well with calendar apps?`,
    `Which ${industry} tools have the best file sharing capabilities?`,
    `What ${industry} software is best for team collaboration?`,
    `Are there ${industry} tools with pre-built templates?`,
    `Which ${industry} software has the most robust analytics?`,
    `What ${industry} platforms offer flexible export options?`,
    `How important are backup features in ${industry} software?`,
    `Which ${industry} tools prioritize security features?`,
    `What ${industry} software offers the most customization options?`,
    `Which ${industry} platforms have the best automation features?`,
    `What ${industry} tools provide comprehensive reporting?`,
    `How do user permissions work in ${industry} software?`,
    `Which ${industry} platforms integrate well with other tools?`,
    
    // Year-specific queries
    `What are the best ${industry} tools to use in ${nextYear}?`,
    `What are the biggest ${industry} trends in ${currentYear}?`,
    `What new features are ${industry} tools adding in ${currentYear}?`,
    `Have there been significant ${industry} updates in ${currentYear}?`,
    `What's the latest in ${industry} software development?`,
    `What modern ${industry} solutions should I be considering?`,
    `What innovations are happening in ${industry} tools in ${currentYear}?`,
    `What's the future looking like for ${industry} tools?`,
    `What technology trends are affecting ${industry} software?`,
    `What will the next generation of ${industry} tools look like?`,
    `Is there a roadmap for ${industry} software development in ${currentYear}?`,
    `What upcoming features are ${industry} platforms planning?`,
    `What's the market forecast for ${industry} tools in ${nextYear}?`,
    `How is ${industry} technology evolving currently?`,
    `What future developments should we expect in ${industry} software?`,
    
    // Review and recommendation queries
    `What do the reviews say about different ${industry} software options?`,
    `How do user ratings compare for top ${industry} tools?`,
    `What's the customer feedback like for popular ${industry} platforms?`,
    `Where can I find honest testimonials about ${industry} tools?`,
    `Are there case studies showing ${industry} software in action?`,
    `What success stories exist for ${industry} implementations?`,
    `Can you share examples of successful ${industry} software deployments?`,
    `Is there an ROI calculator for ${industry} software?`,
    `What productivity gains can I expect from good ${industry} tools?`,
    `How much efficiency improvement do ${industry} solutions typically deliver?`,
    `What do experts recommend for ${industry} software?`,
    `Which ${industry} platforms won awards in ${currentYear}?`,
    `What are the top-rated ${industry} tools according to users?`,
    `Which ${industry} software has the highest customer satisfaction?`,
    `How reliable are different ${industry} software options?`
  ];
  
  // Ensure we have exactly 50 queries
  let queries = baseQueries.length > 50 ? baseQueries.slice(0, 50) : [...baseQueries];
  const modifiers = ['Really need help with', 'Looking for advice on', 'Can anyone recommend', 'Need suggestions for', 'Trying to find'];
  
  while (queries.length < 50) {
    const originalQuery = baseQueries[Math.floor(Math.random() * baseQueries.length)];
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
  
    // Create a new query with the modifier
    queries.push(`${modifier} ${originalQuery.charAt(0).toLowerCase() + originalQuery.slice(1)}`);
    
    // Avoid infinite loop
    if (queries.length >= 95) break;
  }
  
  // Return with language and country metadata
  // Updated to 200 queries per platform as requested
  const fallbackQueryLimit = 200; // Use 200 for all cases
  return queries.slice(0, fallbackQueryLimit).map(query => ({
    query,
    language: languageCode,
    country: (countryCode !== undefined && countryCode !== null) ? countryCode : undefined
  }));
}

function analyzeCrossPlatformResults(
  platformResults: Record<string, Record<string, any>>, 
  brandName: string, 
  competitors: string[]
): any {
  // Skip analysis if we have less than 2 platforms
  const platforms = Object.keys(platformResults);
  if (platforms.length < 2) {
    return {
      consistency_score: 0,
      platform_agreement: {},
      query_consistency: {},
      brand_mention_consistency: 0,
      competitor_mention_consistency: {}
    };
  }

  console.log(`Analyzing cross-platform consistency across ${platforms.length} platforms`);
  
  // Track brand mention consistency across platforms
  const brandMentionByQuery: Record<string, string[]> = {};
  const competitorMentionByQuery: Record<string, Record<string, string[]>> = {};
  
  // Initialize competitor tracking
  const competitorTracking: Record<string, Record<string, number>> = {};
  competitors.forEach(competitor => {
    competitorTracking[competitor] = {
      total_mentions: 0,
      platform_count: 0,
      consistent_mentions: 0
    };
  });
  
  // Collect all queries that were run across all platforms
  const allQueries = new Set<string>();
  for (const platform of platforms) {
    Object.keys(platformResults[platform]).forEach(query => allQueries.add(query));
  }
  
  // Analyze each query across platforms
  for (const query of allQueries) {
    brandMentionByQuery[query] = [];
    competitorMentionByQuery[query] = {};
    
    for (const competitor of competitors) {
      competitorMentionByQuery[query][competitor] = [];
    }
    
    for (const platform of platforms) {
      const result = platformResults[platform][query];
      if (!result) continue;
      
      // Track brand mentions
      if (result.analysis?.brand_mentioned) {
        brandMentionByQuery[query].push(platform);
      }
      
      // Track competitor mentions
      if (result.analysis?.competitors_found) {
        for (const competitor of result.analysis.competitors_found) {
          competitorMentionByQuery[query][competitor]?.push(platform);
          competitorTracking[competitor].total_mentions++;
        }
      }
    }
  }
  
  // Calculate brand mention consistency
  let totalBrandConsistency = 0;
  let queryCount = 0;
  
  for (const query in brandMentionByQuery) {
    const mentioningPlatforms = brandMentionByQuery[query].length;
    const consistency = mentioningPlatforms / platforms.length;
    
    // Only count queries where at least one platform mentioned the brand
    if (mentioningPlatforms > 0) {
      totalBrandConsistency += consistency;
      queryCount++;
    }
  }
  
  const brandMentionConsistency = queryCount > 0 ? totalBrandConsistency / queryCount : 0;
  
  // Calculate competitor mention consistency
  const competitorConsistency: Record<string, number> = {};
  
  for (const competitor of competitors) {
    let totalConsistency = 0;
    let competitorQueryCount = 0;
    
    for (const query in competitorMentionByQuery) {
      const mentioningPlatforms = competitorMentionByQuery[query][competitor]?.length || 0;
      
      if (mentioningPlatforms > 0) {
        const consistency = mentioningPlatforms / platforms.length;
        totalConsistency += consistency;
        competitorQueryCount++;
        
        // Track platforms that mentioned this competitor
        const platformsSet = new Set(competitorMentionByQuery[query][competitor]);
        if (platformsSet.size > 0) {
          competitorTracking[competitor].platform_count = Math.max(
            competitorTracking[competitor].platform_count,
            platformsSet.size
          );
        }
        
        // Track consistent mentions (mentioned by all platforms)
        if (mentioningPlatforms === platforms.length) {
          competitorTracking[competitor].consistent_mentions++;
        }
      }
    }
    
    competitorConsistency[competitor] = competitorQueryCount > 0 ? 
      totalConsistency / competitorQueryCount : 0;
  }
  
  // Calculate platform agreement on brand mentions
  const platformAgreement: Record<string, Record<string, number>> = {};
  
  for (const platform1 of platforms) {
    platformAgreement[platform1] = {};
    
    for (const platform2 of platforms) {
      if (platform1 === platform2) continue;
      
      let agreementCount = 0;
      let totalQueries = 0;
      
      for (const query in platformResults[platform1]) {
        if (!platformResults[platform2][query]) continue;
        
        const result1 = platformResults[platform1][query];
        const result2 = platformResults[platform2][query];
        
        if (result1?.analysis?.brand_mentioned === result2?.analysis?.brand_mentioned) {
          agreementCount++;
        }
        
        totalQueries++;
      }
      
      platformAgreement[platform1][platform2] = totalQueries > 0 ? 
        agreementCount / totalQueries : 0;
    }
  }
  
  // Calculate query consistency (how consistently each query produces the same result)
  const queryConsistency: Record<string, number> = {};
  
  for (const query of allQueries) {
    let mentionCount = 0;
    let platformCount = 0;
    
    for (const platform of platforms) {
      if (!platformResults[platform][query]) continue;
      
      if (platformResults[platform][query]?.analysis?.brand_mentioned) {
        mentionCount++;
      }
      
      platformCount++;
    }
    
    // Calculate consistency as how close to 100% or 0% the mentions are
    // 1.0 = all platforms agree (all mention or none mention)
    // 0.0 = perfect disagreement (half mention, half don't)
    const mentionRate = platformCount > 0 ? mentionCount / platformCount : 0;
    const consistency = Math.abs(mentionRate - 0.5) * 2; // Transform to 0-1 scale
    
    queryConsistency[query] = consistency;
  }
  
  // Calculate overall consistency score
  const overallConsistencyScore = Object.values(queryConsistency).reduce(
    (sum, val) => sum + val, 0
  ) / Object.keys(queryConsistency).length || 0;
  
  return {
    consistency_score: overallConsistencyScore,
    platform_agreement: platformAgreement,
    query_consistency: queryConsistency,
    brand_mention_consistency: brandMentionConsistency,
    competitor_mention_consistency: competitorConsistency,
    competitor_tracking: competitorTracking,
    most_consistent_queries: Object.entries(queryConsistency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([query, score]) => ({ query, score })),
    least_consistent_queries: Object.entries(queryConsistency)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 5)
      .map(([query, score]) => ({ query, score }))
  };
}

// Cancellation guard: if a session is marked as cancelled in DB, stop processing and never overwrite it.
async function isSessionCancelled(sessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('brand_analysis_sessions')
    .select('status')
    .eq('id', sessionId)
    .maybeSingle();

  return data?.status === 'cancelled';
}

async function runEnhancedBrandAnalysis(projectId: string, platforms: string[] = ['chatgpt'], existingSessionId?: string, forceRun: boolean = false) {
  console.log(`Starting enhanced brand analysis for project ${projectId} across platforms: ${platforms.join(', ')}`);
  
  // Load API keys if not already loaded
  await ensureApiKeysLoaded();
  
  // Removed blocking API test - will fail fast during actual queries if API is unavailable
  
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('brand_analysis_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }
    
    // Check if analysis should run based on frequency (unless forced)
    if (!forceRun && !existingSessionId) {
      const frequency = project.analysis_frequency || 'weekly';
      const lastAnalysis = project.last_analysis_at ? new Date(project.last_analysis_at) : null;
      const now = new Date();
      
      if (lastAnalysis) {
        const timeSinceLastAnalysis = now.getTime() - lastAnalysis.getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        
        let shouldRun = false;
        let reason = '';
        
        if (frequency === 'daily' && timeSinceLastAnalysis >= oneDay) {
          shouldRun = true;
          reason = 'Daily frequency - last analysis was more than 24 hours ago';
        } else if (frequency === 'weekly' && timeSinceLastAnalysis >= oneWeek) {
          shouldRun = true;
          reason = 'Weekly frequency - last analysis was more than 7 days ago';
        } else if (frequency === 'monthly' && timeSinceLastAnalysis >= oneMonth) {
          shouldRun = true;
          reason = 'Monthly frequency - last analysis was more than 30 days ago';
        } else {
          const hoursSince = Math.floor(timeSinceLastAnalysis / (60 * 60 * 1000));
          const daysSince = Math.floor(timeSinceLastAnalysis / oneDay);
          reason = `Analysis already run ${daysSince} day(s) ago (${hoursSince} hours). Frequency is set to ${frequency}. Use forceRun=true to override.`;
        }
        
        if (!shouldRun) {
          console.log(`⏭️ Skipping analysis for project ${projectId}: ${reason}`);
          return {
            success: false,
            skipped: true,
            reason: reason,
            last_analysis_at: project.last_analysis_at,
            frequency: frequency
          };
        }
        
        console.log(`✅ Analysis is due: ${reason}`);
      } else {
        console.log(`✅ First analysis for project ${projectId}`);
      }
    }

    const brandName = project.brand_name;
    const websiteUrl = project.website_url;
    const industry = project.industry || 'Technology';
    const competitors = project.competitors || [];
    const keywords = project.keywords || [];
    
    // Fetch website content in background (non-blocking) if URL is provided
    let websiteContent = '';
    if (websiteUrl) {
      // Start website content fetch in background, don't wait for it
      fetchWebsiteContent(websiteUrl).then(content => {
        websiteContent = content;
        console.log(`Fetched website content: ${content.length} characters`);
        
        // Analyze the website content in background
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-content`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: websiteUrl,
            html: content
          })
        }).then(async (analyzeResponse) => {
          if (analyzeResponse.ok) {
            const analysisResult = await analyzeResponse.json();
            console.log('Website analysis completed successfully');
            
            await supabase
              .from('brand_analysis_website_analysis')
              .insert({
                project_id: projectId,
                url: websiteUrl,
                analysis_result: analysisResult
              });
          }
        }).catch(err => console.error('Error during website analysis:', err));
      }).catch(error => {
        console.error(`Error fetching website content: ${error.message}`);
      });
    }

    console.log(`Found project: ${project.brand_name} in ${project.industry}`);

    // Check if any API keys are configured
    const apiKeysAvailable = {
      chatgpt: !!openAIApiKey,
      claude: !!claudeApiKey,
      gemini: !!geminiApiKey,
      perplexity: !!perplexityApiKey,
      grok: !!grokApiKey
    };

    console.log('API keys available:', Object.entries(apiKeysAvailable)
      .filter(([_, available]) => available)
      .map(([platform]) => platform)
      .join(', '));

    console.log(`DEBUG: Raw OpenAI API Key check - exists: ${!!openAIApiKey}, length: ${openAIApiKey ? openAIApiKey.length : 0}`);
    if (openAIApiKey) {
      console.log(`DEBUG: OpenAI Key starts with: ${openAIApiKey.substring(0, 10)}...`);
    }

    // Filter platforms that have API keys configured
    let availablePlatforms = platforms.filter(platform => {
      const available = (
        (platform === 'chatgpt' && apiKeysAvailable.chatgpt) ||
        (platform === 'claude' && apiKeysAvailable.claude) ||
        (platform === 'gemini' && apiKeysAvailable.gemini) ||
        (platform === 'perplexity' && apiKeysAvailable.perplexity) ||
        (platform === 'grok' && apiKeysAvailable.grok)
      );
      
      console.log(`DEBUG: Platform ${platform} - API key available: ${available}`);
      if (!available) {
        console.log(`Skipping ${platform} - no API key configured`);
      }
      return available;
    });

    // If no platforms from the requested list have API keys, use any available platform
    if (availablePlatforms.length === 0) {
      console.log('No API keys configured for requested platforms. Checking for any available platform...');
      
      // Try to use at least ChatGPT if available
      if (apiKeysAvailable.chatgpt) {
        availablePlatforms = ['chatgpt'];
        console.log('Using ChatGPT as fallback platform');
      } else {
        // Use any available platform
        availablePlatforms = Object.entries(apiKeysAvailable)
          .filter(([_, available]) => available)
          .map(([platform]) => platform);
        
        if (availablePlatforms.length > 0) {
          console.log(`Using available platforms: ${availablePlatforms.join(', ')}`);
        } else {
          throw new Error('No API keys configured for any AI platform. Please configure at least one API key.');
        }
      }
    }

    // Get target languages from project (default to en-US if not set)
    const targetLanguages: string[] = (project.target_languages && Array.isArray(project.target_languages) && project.target_languages.length > 0) 
      ? project.target_languages 
      : ['en-US'];
    
    // Get target countries from project (empty array means general queries, not country-specific)
    const targetCountries: string[] = (project.target_countries && Array.isArray(project.target_countries) && project.target_countries.length > 0) 
      ? project.target_countries 
      : [];
    
    console.log(`Generating queries for ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`);
    if (targetCountries.length > 0) {
      console.log(`Generating queries for ${targetCountries.length} countries: ${targetCountries.join(', ')}`);
    } else {
      console.log(`No countries selected - generating general queries`);
    }
    
    // Get country names from database if countries are selected
    const countryMap: Record<string, string> = {};
    if (targetCountries.length > 0) {
      const { data: countriesData } = await supabase
        .from('geo_countries_reference')
        .select('country_code, country_name')
        .in('country_code', targetCountries);
      
      if (countriesData) {
        countriesData.forEach(c => {
          countryMap[c.country_code] = c.country_name;
        });
      }
    }
    
    // Generate queries for each language and country combination in parallel
    const allQueriesWithLanguage: Array<{query: string, language: string, country?: string}> = [];
    
    // Calculate queries per combination to achieve 200 queries per platform
    const QUERIES_PER_PLATFORM = 200;
    const languageCount = targetLanguages.length;
    const regionCount = targetCountries.length > 0 ? targetCountries.length : 1;
    const totalCombinations = languageCount * regionCount;
    
    // Distribute 200 queries across all language-region combinations
    const queriesPerCombination = Math.floor(QUERIES_PER_PLATFORM / totalCombinations);
    
    // Ensure at least 1 query per combination
    const finalQueriesPerCombination = Math.max(1, queriesPerCombination);
    
    console.log(`Query distribution: ${QUERIES_PER_PLATFORM} queries per platform divided by ${languageCount} language(s) × ${regionCount} region(s) = ${finalQueriesPerCombination} queries per combination`);
    
    // Create all query generation tasks
    const queryGenerationTasks: Promise<Array<{query: string, language: string, country?: string}>>[] = [];
    
    if (targetCountries.length > 0) {
      // Generate queries for each language-country combination in parallel
      for (const langCode of targetLanguages) {
        for (const countryCode of targetCountries) {
          const countryName = countryMap[countryCode] || countryCode;
          queryGenerationTasks.push(
            generateRealisticUserQueries(
              project.brand_name,
              project.industry,
              project.target_keywords || [],
              project.competitors || [],
              project.website_url || '',
              langCode,
              countryCode,
              countryName,
              finalQueriesPerCombination // Pass the calculated number
            )
          );
        }
      }
    } else {
      // Generate general queries for each language (no country-specific) in parallel
      for (const langCode of targetLanguages) {
        queryGenerationTasks.push(
          generateRealisticUserQueries(
            project.brand_name,
            project.industry,
            project.target_keywords || [],
            project.competitors || [],
            project.website_url || '',
            langCode,
            undefined,
            undefined,
            finalQueriesPerCombination // Pass the calculated number
          )
        );
      }
    }
    
    // Wait for all query generation tasks to complete in parallel
    const generatedQueriesArrays = await Promise.all(queryGenerationTasks);
    generatedQueriesArrays.forEach(queries => {
      allQueriesWithLanguage.push(...queries);
    });

    console.log(`Generated ${allQueriesWithLanguage.length} queries across ${targetLanguages.length} languages${targetCountries.length > 0 ? ` and ${targetCountries.length} countries` : ''} (target: ${QUERIES_PER_PLATFORM} per platform)`);
    
    // Log some sample queries for debugging
    console.log("Sample queries:", allQueriesWithLanguage.slice(0, 5));
    
    // Use all generated queries for each platform
    const selectedQueries = allQueriesWithLanguage;
    
    console.log(`Using all ${selectedQueries.length} queries for analysis across each platform`);

    // Use existing session or create a new one
    let session;
    const totalQueries = availablePlatforms.length * selectedQueries.length;
    
    if (existingSessionId) {
      // Use the existing session
      const { data: existingSession, error: fetchError } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('id', existingSessionId)
        .single();
        
      if (fetchError || !existingSession) {
        throw new Error(`Failed to find session: ${fetchError?.message}`);
      }
      
      session = existingSession;
      console.log(`Using existing session: ${session.id}`);
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
      .from('brand_analysis_sessions')
      .insert({
        project_id: projectId,
          session_name: `AI-Generated Queries Analysis ${new Date().toLocaleDateString()}`,
        status: 'running',
        started_at: new Date().toISOString(),
          total_queries: totalQueries,
          target_languages: targetLanguages,
          target_countries: targetCountries
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

      session = newSession;
    }

    // Initialize tracking variables
    let completedQueries = 0;
    let totalMentions = 0;
    let workingPlatforms: string[] = [];
    let failedPlatforms: string[] = [];
    
    // Store results for comparison across platforms
    const platformResults: Record<string, Record<string, any>> = {};
    availablePlatforms.forEach(platform => {
      platformResults[platform] = {};
    });

    // OPTIMIZED: Process each platform independently with per-platform batching
    // Each platform processes its queries in batches of 10, and moves to next batch
    // as soon as it finishes, without waiting for other platforms
    console.log(`Processing ${selectedQueries.length} queries across ${availablePlatforms.length} platforms`);
    console.log(`Each platform will process queries independently in batches of 10`);
    
    const BATCH_SIZE = 10; // Process 10 queries at a time per platform
    
    // Helper function to process a single query for a platform
    const processQueryForPlatform = async (
      queryItem: string | {query: string, language: string, country?: string}, 
      platform: string
    ) => {
      const query = typeof queryItem === 'string' ? queryItem : queryItem.query;
      const languageCode = typeof queryItem === 'string' ? 'en-US' : queryItem.language;
      const countryCode = (typeof queryItem === 'object' && 'country' in queryItem && queryItem.country) 
        ? (queryItem as {query: string, language: string, country?: string}).country 
        : undefined;
      
      try {
        const response = await queryAIPlatform(platform, query);
        if (response) {
          console.log(`Got response from ${platform} for query "${query.substring(0, 30)}..."`);
          
          // Extract sources from the response
          let responseContent = response;
          let extractedSources: Array<{url: string; title?: string; domain?: string}> = [];
          
          // Check if response is Perplexity structured format
          try {
            const parsed = JSON.parse(response);
            if (parsed.content && parsed.citations) {
              responseContent = parsed.content;
              extractedSources = extractSourcesFromResponse(parsed);
            } else {
              extractedSources = extractSourcesFromResponse(response);
            }
          } catch (e) {
            // Not JSON, extract from plain text
            extractedSources = extractSourcesFromResponse(response);
          }
          
          // Analyze the response for brand mentions
          const analysis = await analyzeBrandMention(
            typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent), 
            project.brand_name, 
            project.competitors || [],
            project.website_url // Pass website URL for domain-based detection
          );
          
          // Add sources to the analysis if they exist
          if (analysis && extractedSources.length > 0) {
            (analysis as any).sources = extractedSources;
          }

          // Store results for cross-platform comparison
          platformResults[platform][query] = {
            response: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
            analysis: analysis,
            language: languageCode
          };

          const isMentioned = analysis?.brand_mentioned || false;
          if (isMentioned) {
            console.log(`✓ Brand mentioned in ${platform} response to: "${query}"`);
          }
        
          return {
            success: true,
            mentioned: isMentioned,
            platform,
            query,
            insertData: {
              project_id: projectId,
              session_id: session.id,
              platform: platform,
              prompt: query,
              response: typeof response === 'string' ? response : JSON.stringify(response),
              response_metadata: analysis,
              language_code: languageCode,
              country_code: countryCode || null
            },
            sources: extractedSources
          };
        } else {
          console.log(`No response received from ${platform} for query: "${query}"`);
          return { success: false, mentioned: false, platform, query };
        }
      } catch (error) {
        const errorMsg = error?.message || String(error);
        // Check if this is a 401 error (invalid API key)
        if (errorMsg.includes('401') || errorMsg.includes('invalid') || errorMsg.includes('Unauthorized')) {
          console.error(`❌ API key invalid for ${platform} - will skip this platform in future batches. Error: ${errorMsg}`);
          // Mark this platform as failed in cache to skip in future
          const keyType = platform === 'chatgpt' ? 'openai' : platform;
          apiKeyCache[keyType] = null;
          apiKeyCache[platform] = null;
        } else {
          console.error(`Error processing query "${query}" for ${platform}:`, error);
        }
        return { success: false, mentioned: false, platform, query, error: errorMsg };
      }
    };
    
    // Process each platform independently with its own batching
    // All platforms run in parallel, but each processes its queries in batches
    const platformProcessingPromises = availablePlatforms.map(async (platform) => {
      console.log(`🚀 Starting ${platform} processing for ${selectedQueries.length} queries...`);
      const platformStartTime = Date.now();
      
      const platformResults: Array<{success: boolean, mentioned: boolean, platform: string, query: string, insertData?: any, sources?: any[], error?: string}> = [];
      const platformBatchInsertData: any[] = [];
      const platformSources: Array<{url: string; title?: string; is_citation: boolean}> = [];
      
      // Process queries for this platform in batches
      for (let i = 0; i < selectedQueries.length; i += BATCH_SIZE) {
        // Stop immediately if user cancelled
        if (await isSessionCancelled(session.id)) {
          console.log(`🛑 ${platform}: Session ${session.id} was cancelled - stopping further batches.`);
          return platformResults;
        }

        const batch = selectedQueries.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(selectedQueries.length / BATCH_SIZE);

        console.log(`📦 ${platform}: Processing batch ${batchNumber}/${totalBatches} (${batch.length} queries)`);

        // Process this batch of queries for this platform simultaneously
        const batchResults = await Promise.allSettled(
          batch.map(queryItem => processQueryForPlatform(queryItem, platform))
        );

        // Collect results from this batch
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const value = result.value;
            platformResults.push(value);
            if (value.success && value.insertData) {
              platformBatchInsertData.push(value.insertData);
            }
            if (value.sources && value.sources.length > 0) {
              const isCitation = platform === 'perplexity';
              platformSources.push(...value.sources.map(s => ({
                url: s.url,
                title: s.title || undefined,
                is_citation: isCitation
              })));
            }
          } else {
            console.error(`Error in ${platform} batch:`, result.reason);
          }
        });

        // Insert this batch's results immediately (don't wait for other platforms)
        if (platformBatchInsertData.length > 0) {
          try {
            const { error: insertError } = await supabase
              .from('ai_platform_responses')
              .insert(platformBatchInsertData);

            if (insertError) {
              console.error(`Error inserting ${platform} batch:`, insertError);
            } else {
              console.log(`✓ ${platform}: Inserted batch ${batchNumber} (${platformBatchInsertData.length} responses)`);
            }
            platformBatchInsertData.length = 0; // Clear for next batch
          } catch (insertErr) {
            console.error(`Error in ${platform} batch insert:`, insertErr);
          }
        }

        // Stop before writing progress if user cancelled
        if (await isSessionCancelled(session.id)) {
          console.log(`🛑 ${platform}: Session ${session.id} was cancelled after batch ${batchNumber} - skipping progress update.`);
          return platformResults;
        }

        // Update progress for this platform (never overwrite cancelled)
        completedQueries += batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        await supabase
          .from('brand_analysis_sessions')
          .update({ completed_queries: completedQueries })
          .eq('id', session.id)
          .neq('status', 'cancelled');
      }
      
      // Upsert sources for this platform
      if (platformSources.length > 0) {
        try {
          const { error: sourcesError } = await supabase.rpc('upsert_brand_analysis_sources', {
            project_id_param: projectId,
            session_id_param: session.id,
            platform_param: platform,
            sources_param: platformSources
          });
          
          if (sourcesError) {
            console.error(`Error upserting ${platform} sources:`, sourcesError);
          } else {
            console.log(`✓ ${platform}: Upserted ${platformSources.length} sources`);
          }
        } catch (sourcesErr) {
          console.error(`Error in ${platform} source upsert:`, sourcesErr);
        }
      }
      
      const platformEndTime = Date.now();
      console.log(`✅ ${platform}: Completed all ${selectedQueries.length} queries in ${((platformEndTime - platformStartTime) / 1000).toFixed(2)} seconds`);
      
      return platformResults;
    });
    
    // Wait for all platforms to complete (they run in parallel but process independently)
    const allPlatformResults = await Promise.all(platformProcessingPromises);
    
    // Flatten results from all platforms
    const results: Array<{success: boolean, mentioned: boolean, platform: string, query: string, insertData?: any, sources?: any[], error?: string}> = [];
    allPlatformResults.forEach(platformResult => {
      results.push(...platformResult);
    });
    
    // Note: Sources and progress are already handled per-platform in the processing loop above
    // No need to do it again here
    
    // Aggregate results by platform (row-level metrics)
    results.forEach((result) => {
      if (result.success) {
        if (!workingPlatforms.includes(result.platform)) {
          workingPlatforms.push(result.platform);
        }
        if (result.mentioned) {
          totalMentions++;
        }
      } else if (results.indexOf(result) < availablePlatforms.length) {
        // Only mark as failed if it's in the first set of queries
        if (!failedPlatforms.includes(result.platform)) {
          failedPlatforms.push(result.platform);
        }
      }
    });
    
    // ============================================
    // PROMPT-LEVEL AGGREGATION (the TRUE visibility metric)
    // ============================================
    // A "prompt" is unique by: query + language + country
    // A prompt counts as "mentioned" if ANY platform mentioned the brand for it
    // This is what users expect when they see "X of Y prompts"
    
    const promptAggregation: Record<string, { success: boolean; mentioned: boolean }> = {};
    
    results.forEach((result) => {
      // Extract language and country from insertData if available
      const languageCode = result.insertData?.language_code || 'en-US';
      const countryCode = result.insertData?.country_code || '';
      
      // Unique prompt key: query||language||country
      const promptKey = `${result.query}||${languageCode}||${countryCode}`;
      
      if (!promptAggregation[promptKey]) {
        promptAggregation[promptKey] = { success: false, mentioned: false };
      }
      
      // A prompt is "successful" if at least one platform responded
      if (result.success) {
        promptAggregation[promptKey].success = true;
      }
      
      // A prompt is "mentioned" if at least one platform mentioned the brand
      if (result.success && result.mentioned) {
        promptAggregation[promptKey].mentioned = true;
      }
    });
    
    // Calculate prompt-level metrics
    // CRITICAL: Use the queries array to determine total unique prompts (not just successful ones)
    // This ensures we count all prompts that were supposed to be analyzed
    const uniqueQueriesSet = new Set<string>();
    for (const queryItem of selectedQueries) {
      const queryText = typeof queryItem === 'string' ? queryItem : queryItem.query;
      if (queryText && queryText.trim()) {
        uniqueQueriesSet.add(queryText.trim());
      }
    }
    const promptsTotal = uniqueQueriesSet.size; // Total unique prompts that should have been analyzed
    
    // Count prompts where brand was mentioned (from aggregation)
    const promptKeys = Object.keys(promptAggregation);
    const promptsMentioned = promptKeys.filter(k => promptAggregation[k].mentioned).length;
    const promptVisibilityScore = promptsTotal > 0 
      ? Math.round((promptsMentioned / promptsTotal) * 100) 
      : 0;
    
    // Row-level metrics (for diagnostics/platform comparison)
    const responsesTotal = completedQueries;
    const responsesMentioned = totalMentions;
    const responseVisibilityScore = responsesTotal > 0 
      ? Math.round((responsesMentioned / responsesTotal) * 100) 
      : 0;
    
    console.log(`📊 PROMPT-LEVEL: ${promptsMentioned}/${promptsTotal} prompts mentioned = ${promptVisibilityScore}%`);
    console.log(`📊 RESPONSE-LEVEL: ${responsesMentioned}/${responsesTotal} responses mentioned = ${responseVisibilityScore}%`);
    console.log(`Completed all queries: ${completedQueries}/${totalQueries} processed across ${workingPlatforms.length} platforms`);
    
    // Analyze cross-platform comparison
    const platformComparison = analyzeCrossPlatformResults(platformResults, project.brand_name, project.competitors || []);

    // Never overwrite a cancelled session with "completed"
    if (await isSessionCancelled(session.id)) {
      console.log(`🛑 Session ${session.id} was cancelled - skipping completion update.`);
      return {
        success: false,
        cancelled: true,
        session_id: session.id,
      };
    }

    // Update session completion with BOTH prompt-level and response-level metrics
    await supabase
      .from('brand_analysis_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_queries: completedQueries,
        results_summary: {
          // Prompt-level metrics (PRIMARY - what users care about)
          prompts_total: promptsTotal,
          prompts_mentioned: promptsMentioned,
          prompt_visibility_score: promptVisibilityScore,
          
          // Response-level metrics (SECONDARY - for diagnostics)
          responses_total: responsesTotal,
          responses_mentioned: responsesMentioned,
          response_visibility_score: responseVisibilityScore,
          
          // Legacy fields for backward compatibility
          total_queries: totalQueries,
          successful_queries: completedQueries,
          total_mentions: totalMentions,
          mention_rate: completedQueries > 0 ? totalMentions / completedQueries : 0,
          visibility_score: promptVisibilityScore, // Use prompt-level as primary
          
          // Platform analysis
          platforms_analyzed: workingPlatforms,
          failed_platforms: failedPlatforms,
          platform_comparison: platformComparison
        }
      })
      .eq('id', session.id)
      .neq('status', 'cancelled');

    // Update project with PROMPT-LEVEL visibility score (prompts mentioned / prompts total) as the primary metric
    // This shows how many unique prompts (queries) mention the brand, which is what users care about
    await supabase
      .from('brand_analysis_projects')
      .update({
        last_analysis_at: new Date().toISOString(),
        visibility_score: promptVisibilityScore, // Use prompt-level score (prompts mentioned / prompts total)
        prompts_total: promptsTotal, // Total unique prompts analyzed
        prompts_mentioned: promptsMentioned, // Prompts where brand was mentioned
        responses_total: responsesTotal, // Total responses across all platforms (diagnostic)
        responses_mentioned: responsesMentioned, // Total mentions across all platforms (diagnostic)
        total_mentions: responsesMentioned // Legacy field for backward compatibility
      })
      .eq('id', projectId);

    console.log(`Analysis completed: ${completedQueries}/${totalQueries} queries successful`);
    console.log(`Prompt visibility: ${promptsMentioned}/${promptsTotal} prompts = ${promptVisibilityScore}%`);
    console.log(`Working platforms: ${workingPlatforms.join(', ')}`);
    if (failedPlatforms.length > 0) {
      console.log(`Failed platforms: ${failedPlatforms.join(', ')}`);
    }
    
    return {
      success: true,
      session_id: session.id,
      // Primary metrics (prompt-level)
      prompts_total: promptsTotal,
      prompts_mentioned: promptsMentioned,
      prompt_visibility_score: promptVisibilityScore,
      // Secondary metrics (response-level)
      completed_queries: completedQueries,
      total_mentions: totalMentions,
      mention_rate: completedQueries > 0 ? totalMentions / completedQueries : 0,
      // Platform info
      platforms_analyzed: workingPlatforms,
      failed_platforms: failedPlatforms,
      skipped_platforms: platforms.filter(p => !availablePlatforms.includes(p))
    };

  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Background processing function that runs without blocking the response
async function processAnalysisInBackground(projectId: string, platforms: string[], sessionId: string) {
  try {
    console.log(`Starting background processing for session: ${sessionId}`);
    await runEnhancedBrandAnalysis(projectId, platforms, sessionId, false);
    console.log(`Completed background processing for session: ${sessionId}`);
  } catch (error) {
    console.error('Background analysis failed:', error);
    // Update session with error status
    await supabase
      .from('brand_analysis_sessions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        results_summary: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);
  }
}

// Process a batch of queries with optimized settings
async function processBatchOfQueries(
  projectId: string, 
  platforms: string[], 
  sessionId: string, 
  queries: Array<string | {query: string, language: string, country?: string}>, 
  batchStartIndex: number = 0,
  batchSize: number = 10 // Reduced to 10 queries per batch to prevent CPU timeout (10 queries × 3 platforms = 30 operations per invocation)
) {
  try {
    const batchStartTime = Date.now();
    const CPU_TIME_LIMIT_MS = 50000; // Exit at 50 seconds to leave buffer (Supabase typically has 60s CPU limit)
    
    console.log(`Processing batch starting at index ${batchStartIndex} for session: ${sessionId}`);
    
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('brand_analysis_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }

    // CRITICAL: Validate API keys first to know which platforms will actually process
    // This is needed before we check quotas, so we only check quotas for platforms that will run
    const validatedPlatforms: string[] = [];
    const failedPlatforms: string[] = [];
    
    // Ensure all API keys are loaded first
    await ensureApiKeysLoaded();
    
    console.log(`🔍 Validating API keys for ${platforms.length} platforms before processing...`);
    for (const platform of platforms) {
      try {
        // Get API key from cache (should be populated by ensureApiKeysLoaded)
        const keyType = platform === 'chatgpt' ? 'openai' : platform;
        let apiKey = apiKeyCache[keyType] || apiKeyCache[platform];
        
        if (!apiKey) {
          // Try one more time to get it
          apiKey = await getApiKey(keyType);
          apiKeyCache[keyType] = apiKey;
          apiKeyCache[platform] = apiKey;
        }
        
        if (!apiKey) {
          console.log(`⚠️ Platform ${platform} has no API key - skipping`);
          failedPlatforms.push(platform);
          continue;
        }
        
        validatedPlatforms.push(platform);
      } catch (error) {
        console.error(`❌ Platform ${platform} validation failed:`, error);
        failedPlatforms.push(platform);
      }
    }
    
    if (validatedPlatforms.length === 0) {
      throw new Error(`No valid platforms available. Failed platforms: ${failedPlatforms.join(', ')}`);
    }
    
    console.log(`✅ Validated ${validatedPlatforms.length} platforms: ${validatedPlatforms.join(', ')}`);
    if (failedPlatforms.length > 0) {
      console.log(`⚠️ Skipping ${failedPlatforms.length} platforms with invalid/missing API keys: ${failedPlatforms.join(', ')}`);
    }
    
    // CRITICAL FIX: Before creating currentBatch, check how many queries each VALIDATED platform can still process
    // This ensures we never send more queries than platforms can handle (max 200 per platform)
    // Example: If batchSize=100 but a platform has only 20 queries remaining, we only process 20 queries
    const { data: sessionInfo } = await supabase
      .from('brand_analysis_sessions')
      .select('total_queries')
      .eq('id', sessionId)
      .single();
    
    const sessionTotalQueries = sessionInfo?.total_queries || 0;
    const queriesPerPlatform = validatedPlatforms.length > 0 && sessionTotalQueries > 0
      ? Math.floor(sessionTotalQueries / validatedPlatforms.length)
      : 200; // Default fallback
    
    // CRITICAL FIX: Check remaining quota for each platform INDEPENDENTLY
    // Filter out platforms that have already completed their quota
    // Each platform will process queries independently from its own position
    const platformQuotas: Record<string, { processed: number; quota: number; remaining: number; queryIndex: number }> = {};
    const platformsWithQuota: string[] = [];
    
    for (const platform of validatedPlatforms) {
      const { count: platformProcessed } = await supabase
        .from('ai_platform_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('platform', platform);
      
      const processed = platformProcessed || 0;
      const remaining = Math.max(0, queriesPerPlatform - processed);
      
      // Track each platform's current query index (how many queries it has processed)
      // This allows each platform to continue from where it left off independently
      const queryIndex = processed; // Each platform starts from its processed count
      
      platformQuotas[platform] = { processed, quota: queriesPerPlatform, remaining, queryIndex };
      
      // Only include platforms that still have remaining quota
      if (remaining > 0) {
        platformsWithQuota.push(platform);
      } else {
        console.log(`✅ ${platform}: Already completed quota (${processed}/${queriesPerPlatform}) - excluding from batch`);
      }
    }
    
    console.log(`📊 Platform quota check before batch:`, platformQuotas);
    console.log(`📊 Platforms with remaining quota: ${platformsWithQuota.length}/${validatedPlatforms.length} (${platformsWithQuota.join(', ')})`);
    
    // If no platforms have remaining quota, return early
    if (platformsWithQuota.length === 0) {
      console.log(`✅ All validated platforms have reached their quota (${queriesPerPlatform} each) - no queries to process`);

      return {
        success: true,
        processedQueries: 0,
        totalMentions: 0,
        hasMoreQueries: false,
        nextBatchStartIndex: -1
      };
    }
    
    // CRITICAL: Use the full queries array - each platform will process from its own position
    // We don't use batchStartIndex anymore - each platform tracks its own query index
    const currentBatch = queries; // All queries available - platforms will slice based on their own index
    console.log(`Processing queries for ${platformsWithQuota.length} platforms independently (each platform processes from its own query index)`);

    let processedQueries = 0;
    let totalMentions = 0;

    // Helper function to process a single query-platform combination
    // Returns data for batch insert instead of inserting immediately
    const processQueryPlatform = async (queryItem: string | {query: string, language: string, country?: string}, platform: string, retryCount = 0) => {
      const query = typeof queryItem === 'string' ? queryItem : queryItem.query;
      const languageCode = typeof queryItem === 'string' ? 'en-US' : queryItem.language;
      const countryCode = (typeof queryItem === 'object' && 'country' in queryItem && queryItem.country) ? (queryItem as {query: string, language: string, country?: string}).country : undefined;
      
      const MAX_RETRIES = 3;
      
      try {
        // CRITICAL: Always call the AI platform API to get fresh results
        // This ensures we're not using cached/old responses from the database
        if (retryCount > 0) {
          console.log(`🔄 Retrying ${platform} API call (attempt ${retryCount + 1}/${MAX_RETRIES + 1}) for query: "${query.substring(0, 50)}..."`);
        } else {
          console.log(`🔄 Calling ${platform} API for fresh response to query: "${query.substring(0, 50)}..."`);
        }
        const response = await queryAIPlatform(platform, query);
        
        if (response) {
          console.log(`✓ Got fresh response from ${platform} for query "${query.substring(0, 30)}..." (length: ${typeof response === 'string' ? response.length : JSON.stringify(response).length} chars)`);
          
          // Extract sources from the response
          // Handle Perplexity structured response
          let responseContent = response;
          let extractedSources: Array<{url: string; title?: string; domain?: string}> = [];
          
          // Check if response is Perplexity structured format
          try {
            const parsed = JSON.parse(response);
            if (parsed.content && parsed.citations) {
              responseContent = parsed.content;
              extractedSources = extractSourcesFromResponse(parsed);
            } else {
              extractedSources = extractSourcesFromResponse(response);
            }
          } catch (e) {
            // Not JSON, extract from plain text
            extractedSources = extractSourcesFromResponse(response);
          }
          
          // Analyze the response for brand mentions (use content text, not structured JSON)
          const analysis = await analyzeBrandMention(
            typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent), 
            project.brand_name, 
            project.competitors || [],
            project.website_url // Pass website URL for domain-based detection
          );
          
          // Add sources to the analysis if they exist (for frontend access)
          if (analysis && extractedSources.length > 0) {
            (analysis as any).sources = extractedSources;
            (analysis as any).sources_count = extractedSources.length;
            console.log(`✓ Extracted ${extractedSources.length} sources from ${platform} response for query: "${query.substring(0, 30)}..."`);
          } else {
            console.log(`⚠ No sources extracted from ${platform} response for query: "${query.substring(0, 30)}..."`);
          }

          const isMentioned = analysis?.brand_mentioned || false;
          if (isMentioned) {
            console.log(`✓ Brand mentioned in ${platform} response to: "${query}"`);
          }
        
          // Return data for batch insert instead of inserting immediately
          return { 
            success: true, 
            mentioned: isMentioned, 
            platform, 
            query,
            insertData: {
              project_id: projectId,
              session_id: sessionId,
              platform: platform,
              prompt: query,
              response: typeof response === 'string' ? response : JSON.stringify(response),
              response_metadata: analysis,
              language_code: languageCode,
              country_code: countryCode || null
            },
            sources: extractedSources
          };
        } else {
          console.log(`No response received from ${platform} for query: "${query}"`);
          return { success: false, mentioned: false, platform, query };
        }
      } catch (error) {
        const errorMsg = error?.message || String(error);
        
        // Handle 429 rate limit errors - fail fast, don't retry (prevents blocking other platforms)
        // Rate limit retries are handled at the API level (fetchWithRetry), not here
        const isRateLimit = errorMsg.includes('429') || 
                          errorMsg.includes('rate limit') || 
                          errorMsg.includes('Too Many Requests') ||
                          errorMsg.includes('concurrent connections');
        
        // Don't retry here - just log and return failure
        // This prevents one platform's rate limit from blocking others
        if (isRateLimit) {
          console.warn(`⚠️ Rate limit (429) for ${platform} on query "${query.substring(0, 30)}...". Skipping retry to prevent blocking other platforms.`);
        }
        
        // Check if this is a 401 error (invalid API key)
        if (errorMsg.includes('401') || errorMsg.includes('invalid') || errorMsg.includes('Unauthorized')) {
          console.error(`❌ API key invalid for ${platform} - will skip this platform in future batches. Error: ${errorMsg}`);
          // Mark this platform as failed in cache to skip in future
          const keyType = platform === 'chatgpt' ? 'openai' : platform;
          apiKeyCache[keyType] = null;
          apiKeyCache[platform] = null;
        } else if (isRateLimit) {
          console.error(`❌ Rate limit exceeded for ${platform} after ${MAX_RETRIES} retries. Error: ${errorMsg}`);
        } else {
          console.error(`Error processing query "${query}" for ${platform}:`, error);
        }
        return { success: false, mentioned: false, platform, query, error: errorMsg };
      }
    };

    // No need to create queryPlatformTasks array anymore since we process platforms independently
    // Each platform will process all queries in the currentBatch

    console.log(`Processing ${currentBatch.length} queries across ${validatedPlatforms.length} platforms independently`);
    console.log(`Platforms being processed: ${validatedPlatforms.join(', ')}`);
    if (failedPlatforms.length > 0) {
      console.log(`⚠️ Skipped platforms (invalid API keys): ${failedPlatforms.join(', ')}`);
    }

    const startTime = Date.now();
    
    // NEW APPROACH: Process each platform independently in parallel
    // Each platform processes its queries in batches from its own query index
    // All platforms run simultaneously - if one fails/slow, others continue
    const PLATFORM_BATCH_SIZE = 10; // Increased back to 10 for better throughput
    const allResults: Array<PromiseSettledResult<any>> = [];
    
    // Also get unique query count from the queries array for logging
    const uniqueQueryCount = queries.length;
    const expectedTotalQueries = uniqueQueryCount * platformsWithQuota.length;
    
    console.log(`📊 Query allocation: ${uniqueQueryCount} unique queries in array, ${platformsWithQuota.length} platforms with remaining quota`);
    console.log(`📊 Session total_queries: ${sessionTotalQueries}, Expected total for this batch: ${expectedTotalQueries}`);
    console.log(`📊 Each platform quota: ${queriesPerPlatform} queries (calculated from session total_queries / platform count)`);
    
    // CRITICAL: Cap queriesPerPlatform to prevent exceeding intended limits
    // If queries array has fewer unique queries than intended, use that as the limit
    // This ensures we never process more queries than available or more than the quota
    const effectiveQueriesPerPlatform = Math.min(queriesPerPlatform, uniqueQueryCount);
    
    // WARNING: If queries array has more items than the quota, log a warning
    if (uniqueQueryCount > queriesPerPlatform && queriesPerPlatform > 0) {
      console.warn(`⚠️ WARNING: Queries array has ${uniqueQueryCount} items but quota is ${queriesPerPlatform} per platform. Platform will be limited to ${effectiveQueriesPerPlatform} queries.`);
    }
    
    console.log(`📊 Effective queriesPerPlatform (final limit): ${effectiveQueriesPerPlatform}`);
    
    // Create a function to process all queries for a single platform independently
    // CRITICAL: Each platform saves immediately after each batch completes (not wait for all batches)
    // CRITICAL: Each platform processes from its own query index position
    const processPlatformQueries = async (platform: string, platformIndex: number): Promise<Array<PromiseSettledResult<any>>> => {
      const platformResults: Array<PromiseSettledResult<any>> = [];
      
      // Get this platform's quota info (already calculated above)
      const platformQuota = platformQuotas[platform];
      if (!platformQuota) {
        console.log(`⚠️ ${platform}: No quota info found - skipping`);
        return platformResults;
      }
      
      const processedCount = platformQuota.processed;
      const remainingQuota = platformQuota.remaining;
      const startQueryIndex = platformQuota.queryIndex; // Start from where this platform left off
      
      if (remainingQuota <= 0) {
        console.log(`✅ ${platform}: Already completed quota (${processedCount}/${platformQuota.quota}) - skipping`);
        return platformResults;
      }
      
      // CRITICAL FIX: Each platform processes queries starting from its own query index
      // This allows platforms to process independently - if one completes, others continue
      // Calculate how many queries this platform should process in this batch
      const maxQueriesToProcess = Math.min(remainingQuota, effectiveQueriesPerPlatform - processedCount);
      
      // CRITICAL: Ensure startQueryIndex doesn't exceed queries array length
      // Each platform processes from its own index, but we need to make sure there are queries available
      const isGrok = platform === 'grok';
      const actualStartIndex = Math.min(startQueryIndex, queries.length); // Don't exceed array length
      const actualEndIndex = Math.min(actualStartIndex + maxQueriesToProcess, queries.length); // Don't exceed array length
      const queriesToProcess = queries.slice(actualStartIndex, actualEndIndex);
      
      const actualBatchSize = isGrok ? 1 : PLATFORM_BATCH_SIZE;
      console.log(`🚀 Starting ${platform} processing: Will process up to ${remainingQuota} queries starting from index ${actualStartIndex} (${processedCount}/${effectiveQueriesPerPlatform} already processed) in batches of ${actualBatchSize}`);
      console.log(`📊 ${platform}: queries.length=${queries.length}, actualStartIndex=${actualStartIndex}, actualEndIndex=${actualEndIndex}, queriesToProcess.length=${queriesToProcess.length}, remainingQuota=${remainingQuota}, maxQueriesToProcess=${maxQueriesToProcess}`);
      
      // Additional safety check: if queriesToProcess.length > remainingQuota, log warning
      if (queriesToProcess.length > remainingQuota) {
        console.warn(`⚠️ ${platform}: queriesToProcess has ${queriesToProcess.length} items but remaining quota is ${remainingQuota}. Limiting to quota.`);
      }
      
      // CRITICAL: If no queries to process, log and return early
      if (queriesToProcess.length === 0) {
        console.warn(`⚠️ ${platform}: No queries to process! This might indicate all queries have been processed or quota reached.`);
        console.warn(`⚠️ ${platform}: Debug info - queries.length=${queries.length}, startQueryIndex=${startQueryIndex}, actualStartIndex=${actualStartIndex}, maxQueriesToProcess=${maxQueriesToProcess}, remainingQuota=${remainingQuota}, processedCount=${processedCount}`);
        return platformResults;
      }
      
      // Helper to save batch results immediately after each batch completes
      const savePlatformBatchResults = async (
        batchResults: Array<PromiseSettledResult<any>>,
        batchNum: number
      ): Promise<void> => {
        const batchInsertData: any[] = [];
        const batchSources: Array<{url: string; title?: string; is_citation: boolean}> = [];
        let batchAttempted = 0;
        let batchProcessed = 0;
        
        batchResults.forEach((result) => {
          batchAttempted++;
          
          if (result.status === 'fulfilled') {
            const value = result.value;
            
            if (value.success && value.insertData) {
              batchInsertData.push(value.insertData);
              batchProcessed++;
              
              // Collect sources
              if (value.sources && value.sources.length > 0) {
                const isCitation = platform === 'perplexity';
                batchSources.push(...value.sources.map((s: any) => ({
                  url: s.url,
                  title: s.title || undefined,
                  is_citation: isCitation
                })));
              }
            } else {
              // Save failure entry
              const queryItem = typeof value.query === 'string' ? value.query : { query: value.query, language: 'en-US' };
              const prompt = typeof queryItem === 'string' ? queryItem : queryItem.query;
              const language_code = typeof queryItem === 'string' ? 'en-US' : (queryItem.language || 'en-US');
              const country_code = typeof queryItem === 'string' ? null : (queryItem.country || null);
              
              batchInsertData.push({
                project_id: projectId,
                session_id: sessionId,
                platform: platform,
                prompt: prompt,
                response: '',
                response_metadata: {
                  brand_mentioned: false,
                  competitors_found: [],
                  sources: [],
                  error: value.error || 'API call failed',
                  success: false,
                },
                language_code,
                country_code,
              });
            }
          }
        });
        
        // CRITICAL: Save immediately after this platform batch completes
        if (batchInsertData.length > 0) {
          try {
            console.log(`💾 ${platform}: Saving batch ${batchNum} results immediately (${batchInsertData.length} responses)...`);
            
            // Check for existing records to prevent duplicates (if same batch is retried)
            // This is a best-effort check - the database should have constraints to prevent true duplicates
            const promptsToCheck = batchInsertData.map(d => d.prompt);
            const existingCheck = await supabase
              .from('ai_platform_responses')
              .select('prompt')
              .eq('session_id', sessionId)
              .eq('platform', platform)
              .in('prompt', promptsToCheck);
            
            const existingPrompts = new Set((existingCheck.data || []).map(r => r.prompt));
            const newRecords = batchInsertData.filter(d => !existingPrompts.has(d.prompt));
            
            if (newRecords.length < batchInsertData.length) {
              const skipped = batchInsertData.length - newRecords.length;
              console.log(`⚠️ ${platform}: Skipping ${skipped} duplicate records in batch ${batchNum} (already exist in DB)`);
            }
            
            // Only insert records that don't already exist
            const recordsToInsert = newRecords.length > 0 ? newRecords : batchInsertData;
            
            if (recordsToInsert.length === 0) {
              console.log(`⚠️ ${platform}: All records in batch ${batchNum} already exist - skipping insert`);
            } else {
              // Add retry logic with exponential backoff for database inserts to prevent deadlocks
              let insertSuccess = false;
              let insertAttempt = 0;
              const maxInsertRetries = 5;
              
              while (!insertSuccess && insertAttempt < maxInsertRetries) {
                try {
                  const { error: insertError } = await supabase
                    .from('ai_platform_responses')
                    .insert(recordsToInsert);
                  
                  if (insertError) {
                    // Check if it's a deadlock error (40P01)
                    if (insertError.code === '40P01' || insertError.message?.includes('deadlock')) {
                      insertAttempt++;
                      if (insertAttempt < maxInsertRetries) {
                        const backoffDelay = Math.min(100 * Math.pow(2, insertAttempt), 2000); // Max 2s
                        console.warn(`⚠️ ${platform}: Deadlock detected on batch ${batchNum} insert (attempt ${insertAttempt}/${maxInsertRetries}), retrying in ${backoffDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        continue;
                      }
                    }
                    throw insertError;
                  }
                  insertSuccess = true;
                  console.log(`✓ ${platform}: Batch ${batchNum} saved to database (${recordsToInsert.length} new records, ${batchProcessed} success, ${batchAttempted - batchProcessed} failed)`);
                } catch (insertErr: any) {
                  if (insertErr.code === '40P01' && insertAttempt < maxInsertRetries - 1) {
                    insertAttempt++;
                    const backoffDelay = Math.min(100 * Math.pow(2, insertAttempt), 2000);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    continue;
                  }
                  // If not a deadlock or max retries reached, throw
                  console.error(`❌ ${platform}: Error saving batch ${batchNum}:`, insertErr);
                  return; // Don't update progress if insert failed
                }
              }
              
              if (!insertSuccess) {
                console.error(`❌ ${platform}: Failed to save batch ${batchNum} after ${maxInsertRetries} attempts`);
                return; // Don't update progress if insert failed
              }
            }
            
            // Update progress immediately so UI sees it (whether we inserted new records or skipped duplicates)
            // CRITICAL: Count actual saved records to prevent race conditions and double-counting
            // Instead of manually incrementing (which causes race conditions when multiple platforms update simultaneously),
            // we count the actual number of records in the database for this session
            try {
                const { count: savedCount, error: countError } = await supabase
                  .from('ai_platform_responses')
                  .select('*', { count: 'exact', head: true })
                  .eq('session_id', sessionId);
                
                if (!countError && savedCount !== null && savedCount !== undefined) {
                  // Get total_queries first to ensure we don't exceed it
                  const { data: sessionData } = await supabase
                    .from('brand_analysis_sessions')
                    .select('total_queries')
                    .eq('id', sessionId)
                    .single();
                  
                  const totalQueries = sessionData?.total_queries || 0;
                  
                  // CRITICAL: Cap completed_queries at total_queries to prevent showing >100%
                  // If actualCompleted > total_queries, it means either:
                  // 1. total_queries was calculated incorrectly initially
                  // 2. There are duplicate records (shouldn't happen with proper unique constraints)
                  // 3. The session was updated mid-run with different platform count
                  const actualCompleted = Math.min(savedCount, totalQueries || savedCount);
                  
                  // Update completed_queries to match the actual count (capped at total_queries)
                  // This prevents race conditions and double-counting when multiple platforms save simultaneously
                  // Add retry logic with exponential backoff to prevent deadlocks
                  let updateSuccess = false;
                  let updateAttempt = 0;
                  const maxUpdateRetries = 5;
                  
                  while (!updateSuccess && updateAttempt < maxUpdateRetries) {
                    try {
                      const { error: updateError } = await supabase
                        .from('brand_analysis_sessions')
                        .update({ completed_queries: actualCompleted })
                        .eq('id', sessionId)
                        .neq('status', 'cancelled');
                      
                      if (updateError) {
                        // Check if it's a deadlock error (40P01)
                        if (updateError.code === '40P01' || updateError.message?.includes('deadlock')) {
                          updateAttempt++;
                          if (updateAttempt < maxUpdateRetries) {
                            const backoffDelay = Math.min(100 * Math.pow(2, updateAttempt), 2000); // Max 2s
                            console.warn(`⚠️ ${platform}: Deadlock detected on progress update (attempt ${updateAttempt}/${maxUpdateRetries}), retrying in ${backoffDelay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, backoffDelay));
                            continue;
                          }
                        }
                        throw updateError;
                      }
                      updateSuccess = true;
                    } catch (updateErr: any) {
                      if (updateErr.code === '40P01' && updateAttempt < maxUpdateRetries - 1) {
                        updateAttempt++;
                        const backoffDelay = Math.min(100 * Math.pow(2, updateAttempt), 2000);
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        continue;
                      }
                      // If not a deadlock or max retries reached, throw
                      throw updateErr;
                    }
                  }
                  
                  if (!updateSuccess) {
                    console.error(`❌ ${platform}: Failed to update progress after ${maxUpdateRetries} attempts`);
                  }
                  
                  if (savedCount > totalQueries && totalQueries > 0) {
                    console.warn(`⚠️ ${platform}: Actual count (${savedCount}) exceeds total_queries (${totalQueries}) - capping at ${actualCompleted}. This may indicate duplicate records or incorrect total_queries calculation.`);
                  } else {
                    console.log(`📊 ${platform}: Progress updated to ${actualCompleted}/${totalQueries} after batch ${batchNum} (based on actual DB count, saved ${batchAttempted} in this batch)`);
                  }
                } else {
                  // Fallback: Use increment if count query fails
                  console.warn(`⚠️ Count query failed for ${platform} batch ${batchNum}, using increment fallback:`, countError);
                  const { data: currentSession } = await supabase
                    .from('brand_analysis_sessions')
                    .select('completed_queries, total_queries')
                    .eq('id', sessionId)
                    .single();
                  
                  if (currentSession) {
                    const newCompletedQueries = (currentSession.completed_queries || 0) + batchAttempted;
                    await supabase
                      .from('brand_analysis_sessions')
                      .update({ completed_queries: newCompletedQueries })
                      .eq('id', sessionId)
                      .neq('status', 'cancelled');
                    
                    console.log(`📊 ${platform}: Progress updated to ${newCompletedQueries}/${currentSession.total_queries} after batch ${batchNum} (incremented, may be inaccurate)`);
                  }
                }
            } catch (progressErr) {
              console.error(`❌ Error updating progress for ${platform} batch ${batchNum}:`, progressErr);
            }
            
            // Save sources if any
            if (batchSources.length > 0) {
              try {
                await supabase.rpc('upsert_brand_analysis_sources', {
                  project_id_param: projectId,
                  session_id_param: sessionId,
                  platform_param: platform,
                  sources_param: batchSources
                });
                console.log(`✓ ${platform}: Saved ${batchSources.length} sources from batch ${batchNum}`);
              } catch (sourceErr) {
                console.error(`Error saving sources for ${platform} batch ${batchNum}:`, sourceErr);
              }
            }
          } catch (saveErr) {
            console.error(`❌ ${platform}: Error saving batch ${batchNum}:`, saveErr);
          }
        }
      };
      
      // Process queries for this platform in batches of PLATFORM_BATCH_SIZE
      // CRITICAL: Each platform processes from its own query index, but stops when quota is reached
      let queryIndex = 0; // Track position within queriesToProcess array (relative to startQueryIndex)
      let batchNum = 0; // Track batch number
      
      while (queryIndex < queriesToProcess.length) {
        // Check current quota before each batch
        const { count: currentProcessed } = await supabase
          .from('ai_platform_responses')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('platform', platform);
        
        const processedCount = currentProcessed || 0;
        // Use effectiveQueriesPerPlatform to enforce the correct limit
        const remainingQuota = Math.max(0, effectiveQueriesPerPlatform - processedCount);
        
        if (remainingQuota <= 0) {
          console.log(`✅ ${platform}: Quota reached (${processedCount}/${effectiveQueriesPerPlatform}) - stopping processing`);
          break;
        }
        
        batchNum++;
        
        // CRITICAL: Only process up to remaining quota, but don't exceed available queries
        // Ensure we never process more than effectiveQueriesPerPlatform queries total
        const maxQueriesToProcessInBatch = Math.min(remainingQuota, queriesToProcess.length - queryIndex);
        
        // CRITICAL: Grok processes 1 query at a time due to strict rate limits
        // Other platforms can process in batches
        const isGrok = platform === 'grok';
        const batchSize = isGrok ? 1 : Math.min(PLATFORM_BATCH_SIZE, maxQueriesToProcessInBatch);
        
        // Additional safety check: if we've already processed effectiveQueriesPerPlatform, stop immediately
        if (processedCount >= effectiveQueriesPerPlatform) {
          console.log(`🛑 ${platform}: Already at quota limit (${processedCount}/${effectiveQueriesPerPlatform}) - stopping immediately`);
          break;
        }
        
        const batch = queriesToProcess.slice(queryIndex, queryIndex + batchSize);
        const totalBatches = Math.ceil(Math.min(remainingQuota, queriesToProcess.length) / (isGrok ? 1 : PLATFORM_BATCH_SIZE));
        
        console.log(`  ${platform}: Processing batch ${batchNum}/${totalBatches} (${batch.length} queries, ${processedCount}/${effectiveQueriesPerPlatform} processed, ${remainingQuota} remaining)`);
        
        try {
          // Check CPU time before processing batch - exit early if approaching limit
          const elapsedTime = Date.now() - batchStartTime;
          if (elapsedTime > CPU_TIME_LIMIT_MS) {
            console.log(`⏰ CPU time limit approaching (${elapsedTime}ms > ${CPU_TIME_LIMIT_MS}ms) - stopping ${platform} at batch ${batchNum} to prevent timeout`);
            console.log(`⏰ ${platform}: Processed ${queryIndex} queries so far (${processedCount}/${effectiveQueriesPerPlatform} total), will continue in next invocation`);
            break; // Exit early to trigger next batch
          }
          
          // Also check if we're getting close to the limit (80% threshold)
          if (elapsedTime > CPU_TIME_LIMIT_MS * 0.8) {
            console.log(`⚠️ ${platform}: CPU time at ${elapsedTime}ms (${((elapsedTime / CPU_TIME_LIMIT_MS) * 100).toFixed(1)}% of limit) - processing final batch before stopping`);
          }
          
          // CRITICAL: Grok processes queries sequentially (1 at a time) to avoid rate limits
          // Other platforms process concurrently
          let batchResults: Array<PromiseSettledResult<any>> = [];
          
          console.log(`  ${platform}: Processing batch ${batchNum} with ${batch.length} queries...`);
          
          if (isGrok) {
            // Process Grok queries one at a time sequentially
            for (let i = 0; i < batch.length; i++) {
              const queryItem = batch[i];
              const query = typeof queryItem === 'string' ? queryItem : queryItem.query;
              console.log(`  ${platform}: Processing query ${i + 1}/${batch.length}: "${query.substring(0, 50)}..."`);
              
              try {
                const result = await Promise.allSettled([processQueryPlatform(queryItem, platform)]);
                batchResults.push(...result);
                
                // Log result immediately
                if (result[0]?.status === 'fulfilled') {
                  const value = result[0].value;
                  if (value?.success) {
                    console.log(`  ✓ ${platform}: Query ${i + 1} succeeded`);
                  } else {
                    console.log(`  ✗ ${platform}: Query ${i + 1} failed: ${value?.error || 'Unknown error'}`);
                  }
                } else {
                  console.log(`  ✗ ${platform}: Query ${i + 1} rejected: ${result[0]?.reason || 'Unknown error'}`);
                }
              } catch (error) {
                console.error(`  ❌ ${platform}: Error processing query ${i + 1}:`, error);
                batchResults.push({
                  status: 'fulfilled',
                  value: {
                    success: false,
                    mentioned: false,
                    platform: platform,
                    query: query,
                    error: error?.message || String(error)
                  }
                });
              }
            }
          } else {
            // Process other platforms concurrently
            batchResults = await Promise.allSettled(
              batch.map(queryItem => processQueryPlatform(queryItem, platform))
            );
          }
          
          console.log(`  ${platform}: Batch ${batchNum} processing complete - ${batchResults.length} results collected`);
          platformResults.push(...batchResults);
          
          // CRITICAL: Save immediately after this batch completes (don't wait for other platforms)
          console.log(`  ${platform}: Saving batch ${batchNum} results to database...`);
          await savePlatformBatchResults(batchResults, batchNum);
          console.log(`  ${platform}: Batch ${batchNum} saved successfully`);
          
          // Log progress for this platform
          const successful = batchResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
          const failed = batchResults.length - successful;
          console.log(`  ${platform}: Batch ${batchNum} complete and saved - ${successful} success, ${failed} failed (elapsed: ${Date.now() - batchStartTime}ms)`);
          
          // Move to next batch position
          queryIndex += batchSize;
          
          // Check CPU time again after processing
          const elapsedTimeAfter = Date.now() - batchStartTime;
          if (elapsedTimeAfter > CPU_TIME_LIMIT_MS) {
            console.log(`⏰ CPU time limit reached (${elapsedTimeAfter}ms) - stopping ${platform} to prevent timeout`);
            break;
          }
          
          // Check if cancelled (but continue other platforms)
          if (await isSessionCancelled(sessionId)) {
            console.log(`  ${platform}: Session cancelled - stopping remaining queries for this platform`);
            break;
          }
          
          // Double-check quota after processing (to handle race conditions)
          const { count: checkProcessed } = await supabase
            .from('ai_platform_responses')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('platform', platform);
          
          const finalProcessedCount = checkProcessed || 0;
          if (finalProcessedCount >= effectiveQueriesPerPlatform) {
            console.log(`✅ ${platform}: Quota reached after batch ${batchNum} (${finalProcessedCount}/${effectiveQueriesPerPlatform}) - stopping`);
            break;
          }
          
          // Additional safety: if we processed more than quota in this batch, log warning and stop
          if (finalProcessedCount > effectiveQueriesPerPlatform) {
            console.warn(`⚠️ ${platform}: WARNING - Processed ${finalProcessedCount} queries but quota is ${effectiveQueriesPerPlatform}. This should not happen. Stopping immediately.`);
            break;
          }
        } catch (error) {
          console.error(`  ${platform}: Error in batch ${batchNum}:`, error);
          // Mark all queries in this batch as failed with proper error info
          const failureResults: Array<PromiseSettledResult<any>> = [];
          batch.forEach(queryItem => {
            const query = typeof queryItem === 'string' ? queryItem : queryItem.query;
            failureResults.push({
              status: 'fulfilled',
              value: {
                success: false,
                mentioned: false,
                platform: platform,
                query: query,
                error: error?.message || String(error)
              }
            });
          });
          // Save failure results immediately
          await savePlatformBatchResults(failureResults, batchNum);
          // Move to next batch even on error
          queryIndex += batchSize;
        }
      }
      
      // Check final quota status after all batches
      const { count: finalProcessed } = await supabase
        .from('ai_platform_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('platform', platform);
      
      const finalProcessedCount = finalProcessed || 0;
      const totalSuccessful = platformResults.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const totalFailed = platformResults.length - totalSuccessful;
      
      if (finalProcessedCount >= effectiveQueriesPerPlatform) {
        console.log(`✅ ${platform}: Completed quota - ${finalProcessedCount}/${effectiveQueriesPerPlatform} queries processed (${totalSuccessful} success, ${totalFailed} failed)`);
      } else if (finalProcessedCount > effectiveQueriesPerPlatform) {
        console.warn(`⚠️ ${platform}: EXCEEDED quota - ${finalProcessedCount}/${effectiveQueriesPerPlatform} queries processed. This indicates a bug in quota enforcement.`);
      } else {
        console.log(`⚠️ ${platform}: Partial completion - ${finalProcessedCount}/${effectiveQueriesPerPlatform} queries processed (${effectiveQueriesPerPlatform - finalProcessedCount} remaining, ${totalSuccessful} success, ${totalFailed} failed)`);
      }
      
      return platformResults;
    };
    
    // Process ALL platforms in parallel - they run independently
    // CRITICAL: Fire and forget - don't wait for all platforms to complete
    // Each platform processes independently and saves results immediately
    // If one platform fails or is slow, others continue
    console.log(`🔄 Starting parallel processing for ${platformsWithQuota.length} platforms with remaining quota...`);
    console.log(`📊 Platforms to process: ${platformsWithQuota.join(', ')}`);
    
    // Start all platforms but don't wait for them - they'll continue in background
    // Each platform saves results immediately after each batch
    const platformPromises = platformsWithQuota.map((platform, index) => {
      // Fire and forget - each platform runs independently
      const promise = processPlatformQueries(platform, index).catch(error => {
        console.error(`❌ ${platform}: Platform processing failed:`, error);
        // Return empty results array for this platform - but we still need to count the attempts
        // Create failure results for queries this platform was supposed to process
        const failureResults: Array<PromiseSettledResult<any>> = [];
        const platformQuota = platformQuotas[platform];
        if (platformQuota) {
          const queriesForPlatform = queries.slice(platformQuota.queryIndex, platformQuota.queryIndex + platformQuota.remaining);
          queriesForPlatform.forEach(queryItem => {
            const query = typeof queryItem === 'string' ? queryItem : queryItem.query;
            failureResults.push({
              status: 'fulfilled',
              value: {
                success: false,
                mentioned: false,
                platform: platform,
                query: query,
                error: error?.message || String(error)
              }
            });
          });
        }
        return failureResults;
      });
      
      // Don't await - let it run in background
      // Results are saved immediately by each platform after each batch
      promise.then(() => {
        console.log(`✅ ${platform}: Completed processing (results already saved)`);
      }).catch(err => {
        console.error(`❌ ${platform}: Processing failed:`, err);
      });
      
      return promise;
    });
    
    // Don't wait for platforms - they run independently and save results immediately
    // Just wait a moment to ensure they've started, then return
    // This prevents timeout while platforms continue processing in background
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for initial batch to start
    
    // Get results from platforms that have completed so far (non-blocking)
    // Most results are already saved to DB by each platform after each batch
    const allPlatformResults = await Promise.allSettled(
      platformPromises.map(p => Promise.race([
        p,
        new Promise<Array<PromiseSettledResult<any>>>(resolve => setTimeout(() => resolve([]), 1000)) // Timeout after 1s
      ]))
    );
    
    // Collect all results from all platforms
    allPlatformResults.forEach((platformResult, index) => {
      if (platformResult.status === 'fulfilled') {
        const results = platformResult.value as Array<PromiseSettledResult<any>>;
        allResults.push(...results);
      } else {
        const platform = platformsWithQuota[index];
        console.error(`Platform ${platform} promise rejected (unexpected):`, platformResult.reason);
        // Create failure results for queries this platform was supposed to process
        const platformQuota = platformQuotas[platform];
        if (platformQuota) {
          const queriesForPlatform = queries.slice(platformQuota.queryIndex, platformQuota.queryIndex + platformQuota.remaining);
          queriesForPlatform.forEach(queryItem => {
            const query = typeof queryItem === 'string' ? queryItem : queryItem.query;
            allResults.push({
              status: 'fulfilled',
              value: {
                success: false,
                mentioned: false,
                platform: platform,
                query: query,
                error: platformResult.reason?.message || String(platformResult.reason) || 'Unknown error'
              }
            });
          });
        }
      }
    });

    const endTime = Date.now();
    // Calculate expected results based on platforms with quota
    const expectedResults = platformsWithQuota.reduce((sum, platform) => {
      const quota = platformQuotas[platform];
      return sum + (quota ? Math.min(quota.remaining, PLATFORM_BATCH_SIZE * 2) : 0); // Estimate based on batch size
    }, 0);
    console.log(`✅ Completed ${allResults.length} API calls across ${platformsWithQuota.length} platforms in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);

    // Collect results and prepare batch insert data
    const results: Array<{success: boolean, mentioned: boolean, platform: string, query: string, error?: string}> = [];
    const batchInsertData: any[] = [];
    const batchSourcesByPlatform: Record<string, Array<{url: string; title?: string; is_citation: boolean}>> = {};

    // Helper: build a row for ai_platform_responses even when an API call fails.
    // This is CRITICAL for:
    // - accurate progress to 100%
    // - the UI showing every platform attempt (including failures)
    // - Mentioned/Missed prompts being computable
    const buildFailureInsertData = (
      platform: string,
      queryItem: string | { query: string; language: string; country?: string },
      errorMsg?: string
    ) => {
      const prompt = typeof queryItem === 'string' ? queryItem : queryItem.query;
      const language_code = typeof queryItem === 'string' ? 'en-US' : (queryItem.language || 'en-US');
      const country_code = typeof queryItem === 'string' ? null : (queryItem.country || null);

      return {
        project_id: projectId,
        session_id: sessionId,
        platform,
        prompt,
        response: '',
        response_metadata: {
          brand_mentioned: false,
          competitors_found: [],
          sources: [],
          error: errorMsg || 'Unknown error',
          success: false,
        },
        language_code,
        country_code,
      };
    };

    // CRITICAL FIX: Track ALL attempts (success or failure) for progress
    // This ensures the progress bar always reaches 100%
    // attemptedQueries should equal: sum of queries processed by each platform
    let attemptedQueries = 0;

    allResults.forEach((result) => {
      // ALWAYS increment attemptedQueries for every result (success or failure)
      // This ensures progress reaches 100% even if some platforms fail
      attemptedQueries++;

      if (result.status === 'fulfilled') {
        const value = result.value;
        results.push(value);

        if (value.success) {
          processedQueries++; // Track successful queries separately for metrics
          if (value.mentioned) {
            totalMentions++;
          }

          // Collect data for batch insert (success)
          if (value.insertData) {
            batchInsertData.push(value.insertData);
          }

          // Collect sources for batch upsert
          if (value.sources && value.sources.length > 0) {
            const platform = value.platform;
            if (!batchSourcesByPlatform[platform]) {
              batchSourcesByPlatform[platform] = [];
            }
            // For ChatGPT and Claude, sources are extracted from text (not citations)
            // For Perplexity, they are actual citations
            const isCitation = platform === 'perplexity';
            batchSourcesByPlatform[platform].push(...value.sources.map(s => ({
              url: s.url,
              title: s.title || undefined,
              is_citation: isCitation
            })));
          }
        } else {
          // ✅ IMPORTANT: still store a DB row for failures, so the UI shows platform attempts.
          // The value already contains the query info
          const queryItem = typeof value.query === 'string' ? value.query : { query: value.query, language: 'en-US' };
          batchInsertData.push(buildFailureInsertData(value.platform, queryItem, value.error || 'API call failed'));
        }
      } else {
        // Rejected promise - this shouldn't happen if processQueryPlatform catches all errors
        // But handle it just in case - create a failure entry
        const errorMsg = result.reason?.message || String(result.reason) || 'Unknown error';
        console.error(`Result promise rejected (unexpected):`, errorMsg);
        // We can't create a proper failure row without query info, so log and continue
        // The attemptedQueries count is already incremented
      }
    });
    
    console.log(`✓ Processed ${attemptedQueries} query-platform combinations across ${platformsWithQuota.length} platforms`);
    
    console.log(`📊 Batch stats: ${attemptedQueries} attempted, ${processedQueries} successful, ${attemptedQueries - processedQueries} failed`);
    
    // CRITICAL: Results are already saved individually by each platform after each batch completes
    // Each platform saves immediately after processing its batch (see processPlatformQueries function above)
    // This ensures UI updates incrementally as batches complete, not just at the end
    // Progress is also updated immediately after each platform batch saves
    // 
    // We don't need to save here because platforms already saved everything immediately.
    // The batchInsertData array is only used for collection/statistics, not for saving.
    // 
    // If batchInsertData has items, they were already saved by platforms - just verify counts match
    if (batchInsertData.length > 0) {
      // This is expected - platforms saved these already, so we don't save again
      console.log(`✓ All ${batchInsertData.length} results were already saved by platforms immediately after each batch completed`);
    }
    
    // Sources are also already saved by each platform after each batch completes
    if (Object.keys(batchSourcesByPlatform).length > 0) {
      // This is expected - platforms saved these already
      const totalSources = Object.values(batchSourcesByPlatform).reduce((sum, sources) => sum + sources.length, 0);
      console.log(`✓ All ${totalSources} sources were already saved by platforms immediately after each batch completed`);
    }
    
    // Stop immediately if session was cancelled
    if (await isSessionCancelled(sessionId)) {
      console.log(`🛑 Session ${sessionId} cancelled - stopping batch continuation.`);
      return {
        success: false,
        cancelled: true,
        session_id: sessionId,
      };
    }

    // NOTE: Progress is already updated by each platform after each batch saves
    // This is just a final check to ensure consistency
    const { data: currentSession } = await supabase
      .from('brand_analysis_sessions')
      .select('completed_queries, total_queries')
      .eq('id', sessionId)
      .single();

    if (currentSession) {
      console.log(`📊 Final progress check: ${currentSession.completed_queries}/${currentSession.total_queries} queries (updated incrementally by platforms)`);
    }

    // Get final session state after processing this batch
    const { data: finalSessionState } = await supabase
      .from('brand_analysis_sessions')
      .select('completed_queries, total_queries')
      .eq('id', sessionId)
      .single();
    
    if (!finalSessionState) {
      throw new Error(`Could not retrieve session state for ${sessionId}`);
    }
    
    const newCompletedQueries = finalSessionState.completed_queries || 0;
    const totalQueries = finalSessionState.total_queries || 0;
    
    console.log(`Batch completed: ${newCompletedQueries}/${totalQueries} total queries attempted`);

    // CRITICAL FIX: Check if ALL platforms have completed their quota before continuing
    // Reuse sessionTotalQueries from earlier fetch (already available in function scope)
    // If not available, fetch it again with a different variable name to avoid redeclaration
    let sessionTotalQueriesForCheck = sessionTotalQueries;
    if (sessionTotalQueriesForCheck === undefined || sessionTotalQueriesForCheck === 0) {
      const { data: sessionInfoCheck } = await supabase
        .from('brand_analysis_sessions')
        .select('total_queries')
        .eq('id', sessionId)
        .single();
      sessionTotalQueriesForCheck = sessionInfoCheck?.total_queries || 0;
    }
    // Get validated platforms from the current batch processing context
    // We need to check the actual platforms that were processed in this batch
    // Use the platforms parameter passed to this function (these are the platforms being processed)
    const platformsToCheck = platforms.length > 0 ? platforms : [];
    
    // If we don't have platforms from parameter, get them from database
    let platformsForCheck = platformsToCheck;
    if (platformsForCheck.length === 0) {
      const { data: platformResponses } = await supabase
        .from('ai_platform_responses')
        .select('platform')
        .eq('session_id', sessionId)
        .limit(1000);
      
      const uniquePlatforms = Array.from(new Set((platformResponses || []).map(r => r.platform))) as string[];
      platformsForCheck = uniquePlatforms.length > 0 ? uniquePlatforms : ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok']; // Fallback
    }
    
    // Reuse queriesPerPlatform from earlier in the function (already calculated at line 2854)
    // If we need to recalculate for different platforms, use a different variable name
    const queriesPerPlatformForCompletionCheck = platformsForCheck.length > 0 && sessionTotalQueriesForCheck > 0
      ? Math.floor(sessionTotalQueriesForCheck / platformsForCheck.length)
      : queriesPerPlatform || 200; // Use existing queriesPerPlatform if available, otherwise default
    
    // Check if all platforms have completed their quota
    let allPlatformsCompleted = true;
    const platformStatuses: Record<string, { processed: number; quota: number; completed: boolean }> = {};
    
    for (const platform of platformsForCheck) {
      const { count: platformProcessed } = await supabase
        .from('ai_platform_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('platform', platform);
      
      const processed = platformProcessed || 0;
      const completed = processed >= queriesPerPlatformForCompletionCheck;
      platformStatuses[platform] = { processed, quota: queriesPerPlatformForCompletionCheck, completed };
      
      if (!completed) {
        allPlatformsCompleted = false;
      }
    }
    
    console.log(`📊 Platform quota status:`, platformStatuses);
    console.log(`📊 All platforms completed quota: ${allPlatformsCompleted}`);

    // CRITICAL FIX: Check which platforms still have remaining quota after this batch
    // Only continue with platforms that haven't completed their quota
    const platformsStillProcessing: string[] = [];
    const updatedPlatformQuotas: Record<string, { processed: number; quota: number; remaining: number; queryIndex: number }> = {};
    
    for (const platform of platformsWithQuota) {
      const { count: currentProcessed } = await supabase
        .from('ai_platform_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('platform', platform);
      
      const processed = currentProcessed || 0;
      const remaining = Math.max(0, effectiveQueriesPerPlatform - processed);
      const queryIndex = processed;
      
      updatedPlatformQuotas[platform] = { processed, quota: effectiveQueriesPerPlatform, remaining, queryIndex };
      
      if (remaining > 0) {
        platformsStillProcessing.push(platform);
      } else {
        console.log(`✅ ${platform}: Completed quota after this batch (${processed}/${effectiveQueriesPerPlatform})`);
      }
    }
    
    // Check if any platforms still need to process more queries
    const shouldContinue = platformsStillProcessing.length > 0;
    
    console.log(`📊 Batch completion check: ${platformsStillProcessing.length} platforms still processing (${platformsStillProcessing.join(', ')})`);
    console.log(`📊 Updated platform quotas:`, updatedPlatformQuotas);

    // ONLY continue if there are actually more queries to process AND platforms haven't completed quota
    // The progress (completed_queries) will naturally reach total_queries when all batches complete
    if (shouldContinue) {
      // If user cancelled, do NOT schedule further batches.
      if (await isSessionCancelled(sessionId)) {
        console.log(`🛑 Session ${sessionId} cancelled - not scheduling next batch.`);
        return {
          success: false,
          cancelled: true,
          session_id: sessionId,
        };
      }

      // CRITICAL FIX: Only schedule next batch for platforms that still have remaining quota
      // Each platform will continue from its own query index independently
      const platformsToUse = platformsStillProcessing; // Only platforms with remaining quota
      
      // Validation: Ensure we have platforms
      if (platformsToUse.length === 0) {
        console.log(`✅ All platforms have completed their quota - no more batches needed`);
        return {
          success: true,
          processedQueries: attemptedQueries,
          totalMentions: totalMentions,
          hasMoreQueries: false,
          nextBatchStartIndex: -1
        };
      }
      
      // Use reasonable batch size for better throughput
      // Each platform processes independently, so batch size is per platform
      let nextBatchSize = 10; // Increased batch size for better throughput
      
      console.log(`📋 Scheduling next batch for ${platformsToUse.length} platforms: ${platformsToUse.join(', ')}, batch size: ${nextBatchSize} per platform`);
      console.log(`📋 Each platform will continue from its own query index independently`);
      
      // Log each platform's next query index
      platformsToUse.forEach(platform => {
        const quota = updatedPlatformQuotas[platform];
        if (quota) {
          console.log(`📋 ${platform}: Will process queries starting from index ${quota.queryIndex} (${quota.processed}/${quota.quota} processed, ${quota.remaining} remaining)`);
        }
      });
      
      // Call ourselves again for the next batch (this creates a new execution context)
      // CRITICAL: Ensure edge function stays alive and next batch starts reliably
      // Use multiple strategies to prevent shutdown:
      // 1. Wait for next batch to start before returning
      // 2. Use EdgeRuntime.waitUntil() if available
      // 3. Add retry logic with exponential backoff
      const triggerNextBatch = async (retries = 3): Promise<void> => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`📤 Triggering next batch for ${platformsToUse.length} platforms (attempt ${attempt}/${retries})...`);
            
            // Use a longer timeout for the fetch to ensure it completes
            // Don't use AbortController if it's causing issues - use a simpler timeout approach
            const fetchPromise = fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/brand-analysis-processor`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, // Use service role for reliability
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                projectId,
                platforms: platformsToUse, // CRITICAL: Only pass platforms with remaining quota
                sessionId,
                queries,
                batchStartIndex: 0, // Not used anymore - each platform tracks its own index
                batchSize: nextBatchSize,
                continueProcessing: true,
                platformsCount: platformsToUse.length
              })
            });
            
            // Use Promise.race with timeout instead of AbortController to avoid abort errors
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Next batch trigger timeout after 30s')), 30000)
            );
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Next batch request failed (${response.status}): ${errorText.substring(0, 200)}`);
            }
            
            // Wait a bit to ensure the next batch actually started
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`✅ Next batch successfully triggered for ${platformsToUse.length} platforms`);
            return; // Success, exit retry loop
          } catch (error: any) {
            // Don't log AbortError as critical - it's often just a timeout
            if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
              console.warn(`⚠️ Attempt ${attempt}/${retries} aborted (likely timeout) - retrying...`);
            } else {
              console.error(`❌ Attempt ${attempt}/${retries} failed to trigger next batch:`, error);
            }
            
            if (attempt === retries) {
              // Final attempt failed - mark session as failed only if it's not just a timeout
              if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
                console.error(`❌ CRITICAL: All ${retries} attempts failed to schedule next batch for ${platformsToUse.length} platforms`);
                try {
                  await supabase
                    .from('brand_analysis_sessions')
                    .update({
                      status: 'failed',
                      completed_at: new Date().toISOString(),
                      results_summary: {
                        error: `Batch continuation failed for ${platformsToUse.length} platforms after ${retries} attempts: ${error?.message || String(error)}`,
                        failed_at: new Date().toISOString(),
                        last_completed_batch: 0, // Not used anymore - each platform tracks its own index
                      },
                    })
                    .eq('id', sessionId);
                } catch (updateErr) {
                  console.error('Error updating session status:', updateErr);
                }
              } else {
                console.warn(`⚠️ Next batch trigger timed out after ${retries} attempts - batch may still start via other means`);
              }
              throw error;
            }
            
            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      // Start triggering next batch - wait for it to start to ensure function doesn't shut down
      const nextBatchPromise = triggerNextBatch().catch(err => {
        console.error('Failed to trigger next batch after all retries:', err);
        // Don't throw - log error but continue
      });
      
      // CRITICAL: Use EdgeRuntime.waitUntil() to keep function alive until next batch starts
      // Also await the promise to ensure next batch starts before function completes
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(nextBatchPromise);
        console.log(`✓ Next batch promise registered with EdgeRuntime.waitUntil() - function will stay alive`);
      } else {
        console.warn(`⚠️ EdgeRuntime.waitUntil() not available - awaiting next batch start directly`);
        // Wait for next batch to start (with timeout) before returning
        await Promise.race([
          nextBatchPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Next batch start timeout')), 25000))
        ]).catch(err => {
          console.warn(`⚠️ Next batch start timeout or error:`, err);
          // Continue anyway - next batch may still start
        });
      }
    } else {
      // All queries processed, mark session as complete
      console.log('All batches completed, finalizing session');
      
      // Analyze cross-platform comparison - get ALL responses for this session across ALL platforms
      const { data: allResponses } = await supabase
        .from('ai_platform_responses')
        .select('prompt, platform, response_metadata')
        .eq('session_id', sessionId);

      // Get session to determine intended total unique prompts
      const { data: sessionData } = await supabase
        .from('brand_analysis_sessions')
        .select('total_queries')
        .eq('id', sessionId)
        .single();
      
      // Never overwrite a cancelled session with "completed"
      if (await isSessionCancelled(sessionId)) {
        console.log(`🛑 Session ${sessionId} was cancelled - skipping final completion update.`);
        return;
      }

      // ========== CALCULATE PROMPT-LEVEL METRICS ==========
      // CRITICAL: Get ALL unique prompts from ALL responses in the session across ALL platforms
      // This ensures we count all prompts that were actually analyzed, not just from the queries array
      const uniquePromptsSet = new Set<string>();
      
      // Group responses by prompt to calculate which prompts mentioned the brand
      const promptMap = new Map<string, { mentioned: boolean; responseCount: number; mentionCount: number }>();
      
      let responsesTotal = 0;
      let responsesMentioned = 0;
      
      if (allResponses) {
        for (const response of allResponses) {
          responsesTotal++;
          const metadata = response.response_metadata || {};
          const wasMentioned = metadata.brand_mentioned === true;
          
          if (wasMentioned) {
            responsesMentioned++;
          }
          
          // Track by prompt (normalize to match query format)
          const promptKey = (response.prompt || '').trim();
          if (!promptKey) continue;
          
          // Add to unique prompts set (across ALL platforms)
          uniquePromptsSet.add(promptKey);
          
          if (!promptMap.has(promptKey)) {
            promptMap.set(promptKey, { mentioned: false, responseCount: 0, mentionCount: 0 });
          }
          
          const promptData = promptMap.get(promptKey)!;
          promptData.responseCount++;
          if (wasMentioned) {
            promptData.mentioned = true; // At least one platform mentioned the brand
            promptData.mentionCount++;
          }
        }
      }
      
      // Calculate total unique prompts: use all unique prompts from ALL responses across ALL platforms
      // This is the actual number of unique queries that were analyzed
      let promptsTotal = uniquePromptsSet.size;
      
      // If we have responses, use the count from responses (more accurate)
      // Otherwise, calculate from queries array as fallback
      if (promptsTotal === 0 && queries.length > 0) {
        // Fallback: use queries array if no responses exist yet
        for (const queryItem of queries) {
          const queryText = typeof queryItem === 'string' ? queryItem : queryItem.query;
          if (queryText && queryText.trim()) {
            uniquePromptsSet.add(queryText.trim());
          }
        }
        promptsTotal = uniquePromptsSet.size;
      }
      
      console.log(`📊 Calculated ${promptsTotal} unique prompts from ${responsesTotal} responses across all platforms`);
      
      // Calculate prompts mentioned (prompts where brand was mentioned in at least one platform response)
      let promptsMentioned = 0;
      for (const [, data] of promptMap) {
        if (data.mentioned) {
          promptsMentioned++;
        }
      }
      
      // Calculate visibility score (percentage of prompts where brand was mentioned)
      const promptVisibilityScore = promptsTotal > 0 
        ? Math.round((promptsMentioned / promptsTotal) * 100) 
        : 0;
      
      console.log(`📊 Session metrics: ${promptsMentioned}/${promptsTotal} prompts mentioned (${promptVisibilityScore}%), ${responsesMentioned}/${responsesTotal} responses mentioned`);

      await supabase
        .from('brand_analysis_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_queries: newCompletedQueries,
          results_summary: {
            // Legacy fields for backward compatibility
            total_queries: totalQueries,
            successful_queries: newCompletedQueries,
            total_mentions: responsesMentioned,
            mention_rate: responsesTotal > 0 ? responsesMentioned / responsesTotal : 0,
            platforms_analyzed: platforms,
            completed_at: new Date().toISOString(),
            // NEW: Prompt-level metrics (the correct metrics)
            prompts_total: promptsTotal,
            prompts_mentioned: promptsMentioned,
            prompt_visibility_score: promptVisibilityScore,
            // NEW: Response-level metrics (diagnostic)
            responses_total: responsesTotal,
            responses_mentioned: responsesMentioned,
          }
        })
        .eq('id', sessionId)
        .neq('status', 'cancelled');

      // Update project with latest metrics
      // CRITICAL: Use PROMPT-LEVEL visibility score (prompts mentioned / prompts total) as the primary metric
      // This shows how many unique prompts (queries) mention the brand, which is what users care about
      const projectVisibilityScore = promptsTotal > 0
        ? Math.round((promptsMentioned / promptsTotal) * 100)
        : 0;
      
      await supabase
        .from('brand_analysis_projects')
        .update({
          last_analysis_at: new Date().toISOString(),
          visibility_score: projectVisibilityScore, // Use prompt-level score (prompts mentioned / prompts total)
          prompts_total: promptsTotal, // Total unique prompts analyzed
          prompts_mentioned: promptsMentioned, // Prompts where brand was mentioned
          responses_total: responsesTotal, // Total responses across all platforms (diagnostic)
          responses_mentioned: responsesMentioned, // Total mentions across all platforms (diagnostic)
          total_mentions: responsesMentioned, // Legacy field for backward compatibility
        })
        .eq('id', projectId);

      console.log(`Analysis fully completed for session: ${sessionId}`);
    }
    
    // Check if all platforms completed quota (separate from the else block above)
    if (allPlatformsCompleted && !shouldContinue) {
      // All platforms have completed their quota - finalize the session
      console.log(`✅ All platforms have completed their quota - finalizing session ${sessionId}`);
      
      // Get all responses for final analysis
      const { data: allResponses } = await supabase
        .from('ai_platform_responses')
        .select('prompt, platform, response_metadata')
        .eq('session_id', sessionId);

      // Calculate final metrics
      const uniquePromptsSet = new Set<string>();
      const promptMap = new Map<string, { mentioned: boolean; responseCount: number; mentionCount: number }>();
      let responsesTotal = 0;
      let responsesMentioned = 0;

      if (allResponses) {
        for (const response of allResponses) {
          responsesTotal++;
          const metadata = response.response_metadata || {};
          const wasMentioned = metadata.brand_mentioned === true;
          
          if (wasMentioned) {
            responsesMentioned++;
          }
          
          const promptKey = (response.prompt || '').trim();
          if (!promptKey) continue;
          
          uniquePromptsSet.add(promptKey);
          
          if (!promptMap.has(promptKey)) {
            promptMap.set(promptKey, { mentioned: false, responseCount: 0, mentionCount: 0 });
          }
          
          const promptData = promptMap.get(promptKey)!;
          promptData.responseCount++;
          if (wasMentioned) {
            promptData.mentioned = true;
            promptData.mentionCount++;
          }
        }
      }

      const promptsTotal = uniquePromptsSet.size;
      let promptsMentioned = 0;
      for (const [, data] of promptMap) {
        if (data.mentioned) {
          promptsMentioned++;
        }
      }

      const promptVisibilityScore = promptsTotal > 0 
        ? Math.round((promptsMentioned / promptsTotal) * 100) 
        : 0;

      // Never overwrite a cancelled session
      if (!(await isSessionCancelled(sessionId))) {
        await supabase
          .from('brand_analysis_sessions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_queries: newCompletedQueries,
            results_summary: {
              total_queries: totalQueries,
              successful_queries: newCompletedQueries,
              total_mentions: responsesMentioned,
              mention_rate: responsesTotal > 0 ? responsesMentioned / responsesTotal : 0,
              platforms_analyzed: platformsForCheck,
              completed_at: new Date().toISOString(),
              prompts_total: promptsTotal,
              prompts_mentioned: promptsMentioned,
              prompt_visibility_score: promptVisibilityScore,
              responses_total: responsesTotal,
              responses_mentioned: responsesMentioned,
            }
          })
          .eq('id', sessionId)
          .neq('status', 'cancelled');

        // Update project with latest metrics
        const projectVisibilityScore = promptsTotal > 0
          ? Math.round((promptsMentioned / promptsTotal) * 100)
          : 0;
        
        await supabase
          .from('brand_analysis_projects')
          .update({
            last_analysis_at: new Date().toISOString(),
            visibility_score: projectVisibilityScore,
            prompts_total: promptsTotal,
            prompts_mentioned: promptsMentioned,
            responses_total: responsesTotal,
            responses_mentioned: responsesMentioned,
            total_mentions: responsesMentioned,
          })
          .eq('id', projectId);

        console.log(`✅ Session ${sessionId} finalized - all platforms completed quota`);
      }
    }
    
    return {
      success: true,
      processedQueries,
      totalMentions,
      hasMoreQueries: shouldContinue,
      nextBatchStartIndex: -1 // Not used anymore - each platform tracks its own index independently
    };

  } catch (error) {
    console.error('Batch processing failed:', error);
    
    // Update session with error status
    await supabase
      .from('brand_analysis_sessions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        results_summary: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', sessionId);
      
    throw error;
  }
}

// Scheduler function to check for projects due for analysis
async function checkAndRunScheduledAnalyses() {
  try {
    console.log('🔍 Checking for projects due for scheduled analysis...');
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('brand_analysis_projects')
      .select('id, brand_name, analysis_frequency, last_analysis_at, active_platforms, status')
      .eq('status', 'active');
    
    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return { success: false, error: projectsError.message };
    }
    
    if (!projects || projects.length === 0) {
      console.log('No active projects found');
      return { success: true, scheduled: 0 };
    }
    
    const dueProjects: any[] = [];
    
    for (const project of projects) {
      const lastAnalysis = project.last_analysis_at ? new Date(project.last_analysis_at) : null;
      const frequency = project.analysis_frequency || 'weekly';
      
      let isDue = false;
      
      if (!lastAnalysis) {
        // Never analyzed, schedule it
        isDue = true;
      } else {
        // Check based on frequency
        if (frequency === 'daily' && lastAnalysis < oneDayAgo) {
          isDue = true;
        } else if (frequency === 'weekly' && lastAnalysis < oneWeekAgo) {
          isDue = true;
        } else if (frequency === 'monthly' && lastAnalysis < oneMonthAgo) {
          isDue = true;
        }
      }
      
      if (isDue) {
        dueProjects.push(project);
        console.log(`📅 Project "${project.brand_name}" (${project.id}) is due for ${frequency} analysis`);
      }
    }
    
    if (dueProjects.length === 0) {
      console.log('No projects due for analysis');
      return { success: true, scheduled: 0 };
    }
    
    console.log(`🚀 Scheduling ${dueProjects.length} projects for analysis...`);
    
    // Start analysis for each due project (fire and forget)
    const analysisPromises = dueProjects.map(async (project) => {
      try {
        const platforms = project.active_platforms || ['chatgpt', 'claude', 'gemini'];
        console.log(`Starting analysis for project ${project.id} with platforms: ${platforms.join(', ')}`);
        
        // Call runEnhancedBrandAnalysis in background with forceRun=true for scheduled runs
        await runEnhancedBrandAnalysis(project.id, platforms, undefined, true);
        
        console.log(`✅ Completed analysis for project ${project.id}`);
      } catch (error) {
        console.error(`❌ Error analyzing project ${project.id}:`, error);
      }
    });
    
    // Wait for all analyses to start (they run in background)
    await Promise.allSettled(analysisPromises);
    
    console.log(`✅ Scheduled ${dueProjects.length} analyses`);
    return { success: true, scheduled: dueProjects.length, projects: dueProjects.map(p => p.id) };
    
  } catch (error) {
    console.error('Error in scheduler:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle scheduler requests (from cron job)
    const url = new URL(req.url);
    if (url.searchParams.get('scheduler') === 'true') {
      const result = await checkAndRunScheduledAnalyses();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Try to parse body, but handle empty body for scheduler
    let body: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch (e) {
      // If body parsing fails, check if it's a scheduler request
      if (req.method === 'GET' || url.searchParams.get('scheduler') === 'true') {
        const result = await checkAndRunScheduledAnalyses();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Invalid request body');
    }
    const { 
      projectId, 
      platforms = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok'],
      sessionId,
      queries,
      batchStartIndex = 0,
      batchSize = 10, // Reduced to 10 queries per batch to prevent CPU timeout (was 25)
      continueProcessing = false,
      customQueries,
      useAIGenerated = true,
      forceRun = false // Allow manual override of frequency check
    } = body as BrandAnalysisRequest & {
      sessionId?: string;
      queries?: string[];
      batchStartIndex?: number;
      batchSize?: number;
      continueProcessing?: boolean;
      customQueries?: Array<{query: string, language: string, country?: string}>;
      useAIGenerated?: boolean;
      forceRun?: boolean;
    };

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth: initial user-triggered runs require a JWT; internal batch continuations do not.
    // (verify_jwt is disabled for this function in config.toml, so we enforce auth here.)
    if (!continueProcessing && url.searchParams.get('scheduler') !== 'true') {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

      if (!token) {
        return new Response(JSON.stringify({ success: false, error: 'Missing Authorization token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle batch continuation requests
    if (continueProcessing && sessionId && queries) {
      console.log(`Continuing batch processing for session: ${sessionId}, batch index: ${batchStartIndex}`);
      console.log(`Requested platforms: ${platforms.length > 0 ? platforms.join(', ') : 'none'}`);
      console.log(`Platform count from request: ${body.platformsCount || 'not specified'}`);
      console.log(`Total queries to process: ${queries.length}, Batch size: ${batchSize}`);
      
      // Ensure we have platforms to process
      if (!platforms || platforms.length === 0) {
        console.error(`❌ ERROR: No platforms provided for batch continuation`);
        return new Response(JSON.stringify({ 
          error: 'No platforms specified for batch continuation',
          success: false 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      try {
        // Ensure we're using all the platforms that were passed in
        // CRITICAL: Do not filter or modify the platforms array - use exactly what was passed
        const platformsToUse = [...platforms]; // Create a copy to ensure we don't modify the original
        console.log(`✅ Processing batch with ${platformsToUse.length} platforms: ${platformsToUse.join(', ')}`);
        console.log(`✅ This batch will process ${Math.min(batchSize, queries.length - batchStartIndex)} queries for EACH of the ${platformsToUse.length} platforms`);
        
        const result = await processBatchOfQueries(projectId, platformsToUse, sessionId, queries, batchStartIndex, batchSize);
        
        if (!result) {
          throw new Error('processBatchOfQueries returned undefined');
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Batch processed successfully',
          platforms_used: platformsToUse,
          platforms_count: platformsToUse.length,
          processedQueries: result.processedQueries,
          totalMentions: result.totalMentions,
          hasMoreQueries: result.hasMoreQueries,
          nextBatchStartIndex: result.nextBatchStartIndex
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Batch processing failed:', error);
        return new Response(JSON.stringify({ 
          error: error.message,
          success: false 
        }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      }
    }

    // Handle initial analysis requests
    console.log('Starting brand analysis for project:', projectId, 'platforms:', platforms);
    
    // Get project details first
    const { data: project, error: projectError } = await supabase
      .from('brand_analysis_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ 
        error: `Project not found: ${projectError?.message}`,
        success: false 
      }), {
        status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    }

    // Use platforms from request first (user's current selection), fallback to database if none provided
    let platformsToAnalyze = platforms && platforms.length > 0 ? platforms : 
      (project.active_platforms && Array.isArray(project.active_platforms) && project.active_platforms.length > 0 ? 
        project.active_platforms : 
        ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok']);
    
    console.log(`Request platforms: ${platforms ? platforms.join(', ') : 'none'}`);
    console.log(`Database platforms: ${project.active_platforms ? project.active_platforms.join(', ') : 'none'}`);
    console.log(`Final platforms to analyze: ${platformsToAnalyze.join(', ')}`);

    // If this is a direct request with a website URL, fetch the content first
    const websiteUrl = project.website_url;
    if (websiteUrl) {
      try {
        console.log(`Fetching website content for ${websiteUrl}`);
        const websiteContent = await fetchWebsiteContent(websiteUrl);
        
        if (websiteContent) {
          console.log(`Successfully fetched website content (${websiteContent.length} bytes)`);
          
          // Make a direct request to analyze-content with the required fields
          try {
            const analyzeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-content`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: websiteUrl,
                html: websiteContent
              })
            });
            
            if (analyzeResponse.ok) {
              const analysisResult = await analyzeResponse.json();
              console.log('Website analysis completed successfully');
              
              // Store the analysis result
              await supabase
                .from('brand_analysis_website_analysis')
                .insert({
                  project_id: projectId,
                  url: websiteUrl,
                  analysis_result: analysisResult
                });
            } else {
              console.error('Website analysis failed:', await analyzeResponse.text());
            }
          } catch (analysisError) {
            console.error('Error during website analysis:', analysisError);
          }
        }
      } catch (error) {
        console.error(`Error fetching website content: ${error.message}`);
        // Continue with the analysis even if website content fetch fails
      }
    }

    // Ensure API keys are loaded
    await ensureApiKeysLoaded();
    
    // Load API keys if not already loaded
    await ensureApiKeysLoaded();
    
    // Check available platforms
    const apiKeysAvailable = {
      chatgpt: !!openAIApiKey,
      claude: !!claudeApiKey,
      gemini: !!geminiApiKey,
      perplexity: !!perplexityApiKey,
      grok: !!grokApiKey
    };

    console.log('Available API keys:', Object.entries(apiKeysAvailable)
      .filter(([_, available]) => available)
      .map(([platform]) => platform));
    console.log('Platforms to analyze:', platformsToAnalyze);

    // Filter platforms based on available API keys
    let availablePlatforms = platformsToAnalyze.filter(platform => {
      const isAvailable = (
        (platform === 'chatgpt' && apiKeysAvailable.chatgpt) ||
        (platform === 'claude' && apiKeysAvailable.claude) ||
        (platform === 'gemini' && apiKeysAvailable.gemini) ||
        (platform === 'perplexity' && apiKeysAvailable.perplexity) ||
        (platform === 'grok' && apiKeysAvailable.grok)
      );
      
      if (!isAvailable) {
        console.log(`Platform ${platform} is not available (no API key)`);
      }
      
      return isAvailable;
    });

    console.log('Filtered available platforms:', availablePlatforms);

    // If no platforms are available from the requested ones, show clear error
    if (availablePlatforms.length === 0) {
      const missingKeys = platformsToAnalyze
        .filter(platform => !apiKeysAvailable[platform])
        .map(platform => platform.toUpperCase());
      
      console.log('No requested platforms are available - missing API keys for:', missingKeys.join(', '));
      
      return new Response(JSON.stringify({ 
        error: `Analysis failed: Missing API keys for selected platforms: ${missingKeys.join(', ')}. Please configure the API keys or select different platforms.`,
        success: false,
        missing_api_keys: missingKeys,
        requested_platforms: platformsToAnalyze,
        available_platforms: Object.entries(apiKeysAvailable)
          .filter(([_, available]) => available)
          .map(([platform]) => platform)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target languages from project (default to en-US if not set)
    const targetLanguages: string[] = (project.target_languages && Array.isArray(project.target_languages) && project.target_languages.length > 0) 
      ? project.target_languages 
      : ['en-US'];
    
    // Get target countries from project (empty array means general queries, not country-specific)
    const targetCountries: string[] = (project.target_countries && Array.isArray(project.target_countries) && project.target_countries.length > 0) 
      ? project.target_countries 
      : [];
    
    // STEP 1: Generate all queries FIRST before calculating total_queries
    // This ensures total_queries matches the ACTUAL number of queries we have
    
    console.log(`Generating queries for ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`);
    if (targetCountries.length > 0) {
      console.log(`Generating queries for ${targetCountries.length} countries: ${targetCountries.join(', ')}`);
    } else {
      console.log(`No countries selected - generating general queries`);
    }
    
    // Get country names from database if countries are selected
    const countryMap: Record<string, string> = {};
    if (targetCountries.length > 0) {
      const { data: countriesData } = await supabase
        .from('geo_countries_reference')
        .select('country_code, country_name')
        .in('country_code', targetCountries);
      
      if (countriesData) {
        countriesData.forEach(c => {
          countryMap[c.country_code] = c.country_name;
        });
      }
    }
    
    // Generate queries for each language and country combination in parallel
    const allQueriesWithLanguage: Array<{query: string, language: string, country?: string}> = [];
    
    // Generate AI queries if useAIGenerated is true
    if (useAIGenerated) {
      // Calculate queries per combination to achieve 200 queries per platform
      const QUERIES_PER_PLATFORM = 200;
      const languageCount = targetLanguages.length;
      const regionCount = targetCountries.length > 0 ? targetCountries.length : 1;
      const totalCombinations = languageCount * regionCount;
      
      // Distribute 200 queries across all language-region combinations
      const queriesPerCombination = Math.floor(QUERIES_PER_PLATFORM / totalCombinations);
      
      // Ensure at least 1 query per combination
      const finalQueriesPerCombination = Math.max(1, queriesPerCombination);
      
      console.log(`Query distribution: ${QUERIES_PER_PLATFORM} queries per platform divided by ${languageCount} language(s) × ${regionCount} region(s) = ${finalQueriesPerCombination} queries per combination`);
      
      // Create all query generation tasks
      const queryGenerationTasks: Promise<Array<{query: string, language: string, country?: string}>>[] = [];
      
      if (targetCountries.length > 0) {
        // Generate queries for each language-country combination in parallel
        for (const langCode of targetLanguages) {
          for (const countryCode of targetCountries) {
            const countryName = countryMap[countryCode] || countryCode;
            queryGenerationTasks.push(
              generateRealisticUserQueries(
                project.brand_name,
                project.industry,
                project.target_keywords || [],
                project.competitors || [],
                project.website_url || '',
                langCode,
                countryCode,
                countryName,
                finalQueriesPerCombination // Pass the calculated number
              )
            );
          }
        }
      } else {
        // Generate general queries for each language (no country-specific) in parallel
        for (const langCode of targetLanguages) {
          queryGenerationTasks.push(
            generateRealisticUserQueries(
              project.brand_name,
              project.industry,
              project.target_keywords || [],
              project.competitors || [],
              project.website_url || '',
              langCode,
              undefined,
              undefined,
              finalQueriesPerCombination // Pass the calculated number
            )
          );
        }
      }
      
      // Wait for all query generation tasks to complete in parallel
      const generatedQueriesArrays = await Promise.all(queryGenerationTasks);
      generatedQueriesArrays.forEach(queries => {
        allQueriesWithLanguage.push(...queries);
      });
      console.log(`Generated ${allQueriesWithLanguage.length} AI queries across ${targetLanguages.length} languages${targetCountries.length > 0 ? ` and ${targetCountries.length} countries` : ''} (target: ${QUERIES_PER_PLATFORM} per platform)`);
    } else {
      console.log('Skipping AI query generation (useAIGenerated is false)');
    }
    
    // Add manual/custom queries if provided
    if (customQueries && Array.isArray(customQueries) && customQueries.length > 0) {
      console.log(`Adding ${customQueries.length} manual queries to the query list`);
      allQueriesWithLanguage.push(...customQueries);
    }
    
    console.log(`Total queries to process: ${allQueriesWithLanguage.length} (${useAIGenerated ? 'AI-generated' : 'none'} + ${customQueries?.length || 0} manual)`);
    
    // CRITICAL FIX: Calculate total_queries from ACTUAL generated query count × available platforms
    // This ensures total_queries EXACTLY matches what we will process
    const actualQueryCount = allQueriesWithLanguage.length;
    const totalQueries = availablePlatforms.length * actualQueryCount;
    
    console.log(`📊 ACTUAL total_queries: ${totalQueries} = ${actualQueryCount} queries × ${availablePlatforms.length} platforms`);
    
    // Ensure total_queries is never 0 - if it is, there's an issue with query generation
    if (totalQueries <= 0 || actualQueryCount <= 0) {
      return new Response(JSON.stringify({ 
        error: `Invalid query count: ${totalQueries} (${actualQueryCount} queries × ${availablePlatforms.length} platforms). Please ensure queries are configured correctly.`,
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Use existing session if sessionId provided, otherwise create new one
    let session;
    if (sessionId) {
      // Use existing session
      const { data: existingSession, error: fetchError } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('project_id', projectId) // Ensure it belongs to this project
        .single();
        
      if (fetchError || !existingSession) {
        return new Response(JSON.stringify({ 
          error: `Failed to find existing session: ${fetchError?.message || 'Session not found'}`,
          success: false 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      session = existingSession;
      // Update session status to running
      await supabase
        .from('brand_analysis_sessions')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          total_queries: totalQueries
        })
        .eq('id', sessionId);
      
      console.log(`Using existing session: ${sessionId}`);
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('brand_analysis_sessions')
        .insert({
          project_id: projectId,
          session_name: `AI-Generated Queries Analysis ${new Date().toLocaleDateString()}`,
          status: 'running',
          started_at: new Date().toISOString(),
          total_queries: totalQueries,
          target_languages: targetLanguages,
          target_countries: targetCountries
        })
        .select()
        .single();

      if (sessionError) {
        return new Response(JSON.stringify({ 
          error: `Failed to create session: ${sessionError.message}`,
          success: false 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      session = newSession;
    }
    
    // Start the first batch immediately (this will chain to subsequent batches)
    try {
      console.log(`Starting first batch with ${availablePlatforms.length} platforms: ${availablePlatforms.join(', ')}`);
      
      // Ensure we're using all available platforms
      if (availablePlatforms.length === 0) {
        throw new Error('No platforms available for analysis');
      }
      
      // Make a copy of the platforms array to ensure we don't modify it
      const platformsToUse = [...availablePlatforms];
      console.log(`Platforms being used for first batch: ${platformsToUse.join(', ')}`);
      console.log(`📊 Starting analysis: ${actualQueryCount} queries × ${platformsToUse.length} platforms = ${totalQueries} total tasks`);
      
      // Do NOT overwrite user's selected active_platforms; keep user's selection intact
      
      // CRITICAL FIX: Start first batch processing WITHOUT awaiting
      // This prevents the initial request from timing out, while still ensuring the work continues.
      // IMPORTANT: In Supabase Edge, "fire-and-forget" must use EdgeRuntime.waitUntil(), otherwise the function may shutdown.
      const firstBatchSize = 10; // Reduced to 10 queries per batch to prevent CPU timeout

      const backgroundTask = processBatchOfQueries(
        projectId,
        platformsToUse,
        session.id,
        allQueriesWithLanguage,
        0,
        firstBatchSize,
      ).catch((error) => {
        console.error('Error in first batch (background):', error);
        // Update session status if first batch fails
        return supabase
          .from('brand_analysis_sessions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            results_summary: {
              error: `First batch failed: ${error?.message || String(error)}`,
              failed_at: new Date().toISOString(),
            },
          })
          .eq('id', session.id);
      });

      // CRITICAL: Keep the worker alive after returning the HTTP response
      // EdgeRuntime.waitUntil() ensures the edge function stays alive until background task completes
      // This prevents the function from shutting down mid-processing
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(backgroundTask);
        console.log(`✓ Background task registered with EdgeRuntime.waitUntil() - function will stay alive`);
      } else {
        console.warn(`⚠️ EdgeRuntime.waitUntil() not available - background task may be terminated`);
        // Still don't await - return immediately
      }
      
      // Return immediately with session info - don't wait for batch processing
      return new Response(JSON.stringify({
        success: true,
        session_id: session.id,
        message: 'Analysis started in background with batch processing',
        platforms_analyzed: platformsToUse,
        platforms_count: platformsToUse.length,
        total_queries: totalQueries,
        actual_query_count: actualQueryCount,
        estimated_completion: new Date(Date.now() + (totalQueries * 1000)).toISOString() // Rough estimate
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error starting first batch:', error);
      
      // Mark session as failed
      await supabase
        .from('brand_analysis_sessions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          results_summary: {
            error: error.message,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', session.id);
        
      throw error;
    }

  } catch (error) {
    console.error('Brand analysis initialization failed:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});