import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Note: brand-analysis-summary is now called from the frontend when user clicks "Launch Analysis"
// It runs BEFORE the brand-analysis process starts, not after completion
// Helper to get API key from Supabase Edge Function secrets
// Secrets are set using: supabase secrets set OPENAI_API_KEY=your_key
function getApiKey(keyType) {
  // Map key types to environment variable names
  const envVarName = `${keyType.toUpperCase()}_API_KEY`;
  const apiKey = Deno.env.get(envVarName);
  
  if (apiKey) {
    console.log(`✅ ${keyType} key loaded from secrets`);
    return apiKey;
  }
  
  console.log(`❌ No ${keyType} key found in secrets (${envVarName})`);
  return null;
}
// Cache for API keys (loaded once per invocation)
const apiKeyCache = {};
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for(let i = 0; i < retries; i++){
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // Don't retry on client errors
      if (response.status >= 400 && response.status < 500) {
        console.error(`Client error on fetch: ${response.status} ${response.statusText}. Aborting retries.`);
        return response; // Let the caller handle the error response
      }
      console.warn(`Request to ${url} failed with status ${response.status}. Retrying (${i + 1}/${retries})...`);
    } catch (error) {
      console.warn(`Request to ${url} failed with error: ${error.message}. Retrying (${i + 1}/${retries})...`);
    }
    if (i < retries - 1) {
      await new Promise((res)=>setTimeout(res, delay * Math.pow(2, i))); // Exponential backoff
    }
  }
  // After all retries, throw an error
  throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}

// ════════════════════════════════════════════════════════════════════════
// Google Search Console Integration
// ════════════════════════════════════════════════════════════════════════

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * Refresh GSC access token
 */
async function refreshGSCToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh GSC token: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
}

/** Alpha-2 (UI) → GSC API country code (lowercase alpha-3) for SEO-level segmentation */
const GSC_COUNTRY_ALPHA2_TO_ALPHA3: Record<string, string> = {
  US: 'usa', GB: 'gbr', CA: 'can', AU: 'aus', DE: 'deu', FR: 'fra',
  IN: 'ind', IT: 'ita', ES: 'esp', NL: 'nld', BR: 'bra', MX: 'mex',
  JP: 'jpn', CN: 'chn', KR: 'kor', PL: 'pol', SE: 'swe', BE: 'bel',
  CH: 'che', AT: 'aut', IE: 'irl', PT: 'prt', ZA: 'zaf', RU: 'rus',
  TR: 'tur', ID: 'idn', TH: 'tha', VN: 'vnm', MY: 'mys', SG: 'sgp',
  PH: 'phl', NZ: 'nzl', AR: 'arg', CL: 'chl', CO: 'col', SA: 'sau',
  AE: 'are', IL: 'isr', EG: 'egy', NG: 'nga', KE: 'ken',
};
function toGscCountryCode(alpha2: string): string {
  const code = GSC_COUNTRY_ALPHA2_TO_ALPHA3[alpha2.toUpperCase()];
  if (code) return code;
  const a = alpha2.toLowerCase();
  return a.length >= 3 ? a.slice(0, 3) : a.padEnd(3, a[0] || 'x');
}

/**
 * Fetch keywords from Google Search Console API
 * @param countries - Optional alpha-2 codes (e.g. ['US','GB']). When set, fetches per country and merges (SEO-level).
 */
async function fetchFromGSCAPI(accessToken: string, siteUrl: string, countries?: string[]) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  const rowLimit = 100;

  const runOne = async (body: Record<string, unknown>) => {
  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify(body),
      }
    );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GSC API error: ${response.status} - ${errorText}`);
  }
    return response.json();
  };

  const countriesFiltered = Array.isArray(countries) && countries.length > 0
    ? countries.map((c) => toGscCountryCode(c))
    : null;

  if (countriesFiltered && countriesFiltered.length > 0) {
    const mergedByQuery = new Map<string, { impressions: number; clicks: number; positionSum: number; positionWeight: number }>();
    for (const gscCountry of countriesFiltered) {
      try {
        const data = await runOne({
          startDate: startStr,
          endDate: endStr,
          dimensions: ['query'],
          rowLimit,
          dimensionFilterGroups: [
            { groupType: 'and', filters: [{ dimension: 'country', operator: 'equals', expression: gscCountry }] },
          ],
        });
  const rows = data.rows || [];
        for (const row of rows) {
          const q = (row.keys && row.keys[0]) ? String(row.keys[0]).trim() : '';
          if (!q) continue;
          const imp = Number(row.impressions) || 0;
          const clk = Number(row.clicks) || 0;
          const pos = Number(row.position) || 0;
          const existing = mergedByQuery.get(q);
          if (existing) {
            existing.impressions += imp;
            existing.clicks += clk;
            existing.positionSum += pos * imp;
            existing.positionWeight += imp;
          } else {
            mergedByQuery.set(q, { impressions: imp, clicks: clk, positionSum: pos * imp, positionWeight: imp });
          }
        }
      } catch (err) {
        console.warn(`GSC fetch for country ${gscCountry} failed:`, err);
      }
    }
    const merged = Array.from(mergedByQuery.entries()).map(([keyword, agg]) => ({
      keyword,
      position: agg.positionWeight > 0 ? Math.round((agg.positionSum / agg.positionWeight) * 10) / 10 : 0,
      clicks: agg.clicks,
      impressions: agg.impressions,
      ctr: agg.impressions > 0 ? agg.clicks / agg.impressions : 0,
    }));
    merged.sort((a, b) => b.impressions - a.impressions);
    return merged.slice(0, rowLimit);
  }

  const data = await runOne({
    startDate: startStr,
    endDate: endStr,
    dimensions: ['query'],
    rowLimit,
  });
  const rows = data.rows || [];
  return rows.map((row: any) => ({
    keyword: row.keys[0],
    position: Math.round(row.position * 10) / 10,
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
  }));
}

/**
 * Fetch GSC keywords and save to database
 * Returns array of keyword strings for use in query generation
 */
async function fetchGSCKeywords(project: any): Promise<string[]> {
  try {
    console.log('🔍 Checking GSC integration...');

    // Check if user has GSC connected
    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('user_id', project.user_id)
      .eq('platform', 'google_search_console')
      .eq('enabled', true)
      .single();

    if (!integration) {
      console.log('ℹ️ No GSC integration found for user');
      return [];
    }

    // Check if project website matches GSC site
    const selectedSite = integration.metadata.selected_site;
    const projectUrl = normalizeUrl(project.website_url);
    const gscUrl = normalizeUrl(selectedSite);

    if (projectUrl !== gscUrl) {
      console.log(`ℹ️ Website mismatch: ${projectUrl} !== ${gscUrl}`);
      return [];
    }

    console.log(`✅ Website matches GSC property: ${selectedSite}`);

    // Check token expiry and refresh if needed
    let accessToken = integration.metadata.access_token;
    let refreshToken = integration.metadata.refresh_token;
    let expiresAt = integration.metadata.expires_at;

    if (Date.now() > expiresAt) {
      console.log('🔄 Refreshing GSC access token...');
      
      const newTokens = await refreshGSCToken(refreshToken);
      accessToken = newTokens.accessToken;
      expiresAt = newTokens.expiresAt;

      // Update tokens in database
      await supabase
        .from('platform_integrations')
        .update({
          metadata: {
            ...integration.metadata,
            access_token: accessToken,
            expires_at: expiresAt,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', project.user_id)
        .eq('platform', 'google_search_console');
      
      console.log('✅ Token refreshed successfully');
    }

    // Fetch keywords from GSC (SEO-level: filter by project countries when set)
    const analysisCountries = Array.isArray(project.analysis_countries) && project.analysis_countries.length > 0
      ? project.analysis_countries
      : undefined;
    if (analysisCountries?.length) {
      console.log(`📊 Fetching GSC keywords (SEO-level: ${analysisCountries.join(', ')})...`);
    } else {
    console.log('📊 Fetching keywords from GSC API...');
    }
    const keywords = await fetchFromGSCAPI(accessToken, selectedSite, analysisCountries);

    console.log(`✅ Fetched ${keywords.length} keywords from GSC`);

    // Save to database
    const today = new Date().toISOString().split('T')[0];
    const keywordsToInsert = keywords.map((kw: any) => ({
      project_id: project.id,
      keyword: kw.keyword,
      position: kw.position,
      clicks: kw.clicks,
      impressions: kw.impressions,
      ctr: kw.ctr,
      date: today,
    }));

    if (keywordsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('gsc_keywords')
        .upsert(keywordsToInsert, {
          onConflict: 'project_id,keyword,date',
        });

      if (insertError) {
        console.error('❌ Error saving GSC keywords:', insertError);
      } else {
        console.log(`✅ Saved ${keywordsToInsert.length} keywords to database`);
        
        // Update project with GSC info
        await supabase
          .from('brand_analysis_projects')
          .update({
            gsc_enabled: true,
            gsc_keywords_count: keywordsToInsert.length,
            last_gsc_sync: new Date().toISOString(),
          })
          .eq('id', project.id);
      }
    }

    // Return just keyword strings for LLM
    return keywords.map((kw: any) => kw.keyword);

  } catch (error) {
    console.error('❌ Error in fetchGSCKeywords:', error);
    return []; // Don't break analysis if GSC fails
  }
}
async function queryAIPlatform(platform, prompt, language = 'en') {
  try {
    console.log(`Querying ${platform} with prompt: ${prompt.substring(0, 50)}... (language: ${language})`);
    // Get API key from cache or load it
    let apiKey = apiKeyCache[platform];
    if (!apiKey) {
      apiKey = await getApiKey(platform === 'chatgpt' ? 'openai' : platform);
      apiKeyCache[platform] = apiKey;
    }
    
    // System message based on language — instruct the AI to respond in the query's language
    const langCode = (language || 'en').toLowerCase().split('-')[0];
    const systemMessage = langCode === 'en'
      ? 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.'
      : 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands. CRITICAL: You MUST respond in the SAME language as the user\'s query. If the query is in French, respond in French. If in German, respond in German. Always match the language of the query exactly.';
    
    if (platform === 'chatgpt' && apiKey) {
      try {
        const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-5.2',
            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_completion_tokens: 4000,
            temperature: 0.7
          })
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
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 4000,
            system: systemMessage,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });
        if (!response.ok) {
          throw new Error(`Claude API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.content[0].text;
      } catch (error) {
        console.error(`Error with Claude API:`, error);
        throw error;
      }
    }
    if (platform === 'gemini' && apiKey) {
      try {
        // Prepend system message for non-English languages so Gemini responds in the correct language
        const geminiPrompt = langCode !== 'en'
          ? `${systemMessage}\n\n${prompt}`
          : prompt;
        
        // Try gemini-3.1-pro-preview first (v1beta API)
        let response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: geminiPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          })
        });
        // If that fails, fall back to gemini-2.0-flash (v1 API)
        if (!response.ok) {
          console.log('Gemini 3.1 Pro failed, trying gemini-2.0-flash (v1)...');
          response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: geminiPrompt
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
              }
            })
          });
        }
        // If that also fails, try gemini-1.5-pro (v1 API)
        if (!response.ok) {
          console.log('Gemini 2.0 Flash failed, trying gemini-1.5-pro (v1)...');
          response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: geminiPrompt
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
              }
            })
          });
        }
        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.statusText}`);
        }
        const data = await response.json();
        // Handle different response formats
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const textParts = data.candidates[0].content.parts.filter((part)=>part.text).map((part)=>part.text);
          return textParts.join('');
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
        // Use 'sonar-pro' - Pro model from Perplexity
        let response = await fetchWithRetry('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 4000,
            temperature: 0.7
          })
        });
        // If that fails, try sonar (online)
        if (!response.ok) {
          console.log('Perplexity sonar-pro failed, trying sonar...');
          response = await fetchWithRetry('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: systemMessage
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 4000,
              temperature: 0.7
            })
          });
        }
        // If that also fails, try sonar-small-online
        if (!response.ok) {
          console.log('Perplexity sonar failed, trying sonar-small-online...');
          response = await fetchWithRetry('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar-small-online',
              messages: [
                {
                  role: 'system',
                  content: systemMessage
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 4000,
              temperature: 0.7
            })
          });
        }
        // If that also fails, try mistral-7b-instruct
        if (!response.ok) {
          console.log('Perplexity sonar-small-online failed, trying mistral-7b-instruct...');
          response = await fetchWithRetry('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'mistral-7b-instruct',
              messages: [
                {
                  role: 'system',
                  content: systemMessage
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 4000,
              temperature: 0.7
            })
          });
        }
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Perplexity API error details: ${errorText}`);
          throw new Error(`Perplexity API error: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          return data.choices[0].message.content;
        } else {
          console.error('Unexpected Perplexity response format:', JSON.stringify(data).substring(0, 200));
          throw new Error('Unexpected Perplexity response format');
        }
      } catch (error) {
        console.error(`Error with Perplexity API:`, error);
        throw error;
      }
    }
    if (platform === 'groq' && apiKey) {
      try {
        const requestBody = {
          model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: systemMessage
              },
              {
                role: 'user',
                content: prompt
              }
            ],
          max_tokens: 2048,
            temperature: 0.7
        };
        
        console.log(`Groq API request - Model: ${requestBody.model}, Prompt length: ${prompt.length}, Max tokens: ${requestBody.max_tokens}`);
        
        const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log(`Groq API response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          // Read error response body
          const errorText = await response.text();
          console.error(`Groq API error response body:`, errorText);
          
          let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              if (errorData.error.message) {
                errorMessage = `Groq API error: ${errorData.error.message}`;
              } else if (errorData.error.code) {
                errorMessage = `Groq API error: ${errorData.error.code} - ${errorData.error.message || 'Unknown error'}`;
              } else {
                errorMessage = `Groq API error: ${JSON.stringify(errorData.error)}`;
              }
            } else {
              errorMessage = `Groq API error: ${errorText}`;
            }
          } catch (e) {
            // If parsing fails, use the raw error text
            errorMessage = `Groq API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 500)}`;
          }
          console.error(`Groq API error details (parsed):`, errorMessage);
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          console.log(`Groq API success - Response length: ${data.choices[0].message.content.length}`);
        return data.choices[0].message.content;
        } else {
          console.error('Unexpected Groq response format:', JSON.stringify(data).substring(0, 500));
          throw new Error('Unexpected Groq response format');
        }
      } catch (error) {
        console.error(`Error with Groq API:`, error);
        // Re-throw with more context
        if (error.message && !error.message.includes('Groq API error:')) {
          throw new Error(`Groq API error: ${error.message}`);
        }
        throw error;
      }
    }
    throw new Error(`No API key available for platform: ${platform}`);
  } catch (error) {
    console.error(`Error querying AI platform:`, error);
    throw error;
  }
}
function extractSourcesFromResponse(response) {
  if (!response) return [];
  const sources = [];
  // Enhanced URL extraction patterns
  const urlPatterns = [
    // Standard HTTP/HTTPS URLs
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
    // URLs without protocol but with www
    /www\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?/gi,
    // Domain.com patterns (common domains)
    /\b[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.(?:com|org|net|edu|gov|io|co|ai|tech|app)(?:\/[^\s<>"{}|\\^`[\]]*)?/gi
  ];
  // Extract URLs using all patterns
  const foundUrls = new Set();
  for (const pattern of urlPatterns){
    const matches = response.match(pattern);
    if (matches) {
      matches.forEach((url)=>{
        // Clean and normalize URL
        let cleanUrl = url.trim().replace(/[.,;:!?)]$/, ''); // Remove trailing punctuation
        // Add protocol if missing
        if (!cleanUrl.match(/^https?:\/\//)) {
          cleanUrl = 'https://' + cleanUrl;
        }
        // Validate URL format
        try {
          const urlObj = new URL(cleanUrl);
          // Filter out common non-source domains
          const domain = urlObj.hostname.toLowerCase();
          const excludedDomains = [
            'google.com',
            'bing.com',
            'yahoo.com',
            'duckduckgo.com',
            'facebook.com',
            'twitter.com',
            'linkedin.com',
            'instagram.com',
            'youtube.com'
          ];
          if (!excludedDomains.some((excluded)=>domain.includes(excluded))) {
            foundUrls.add(cleanUrl);
          }
        } catch (e) {
        // Invalid URL, skip
        }
      });
    }
  }
  // Convert to source objects
  foundUrls.forEach((url)=>{
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      // Try to extract title from context
      const urlIndex = response.indexOf(url);
      let title = undefined;
      if (urlIndex !== -1) {
        // Look for title patterns around the URL
        const contextStart = Math.max(0, urlIndex - 100);
        const contextEnd = Math.min(response.length, urlIndex + url.length + 100);
        const context = response.substring(contextStart, contextEnd);
        // Common title patterns
        const titlePatterns = [
          // "Title" (URL)
          /"([^"]+)"\s*\([^)]*\)/g,
          // [Title](URL) - markdown style
          /\[([^\]]+)\]\([^)]*\)/g,
          // Title - URL
          /([^-\n]+)\s*-\s*https?:\/\//g,
          // Title: URL
          /([^:\n]+):\s*https?:\/\//g
        ];
        for (const pattern of titlePatterns){
          const match = context.match(pattern);
          if (match && match[1]) {
            title = match[1].trim();
            break;
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
  return sources;
}
async function analyzeBrandMention(response, brandName, competitors = []) {
  if (!response || !brandName) return null;
  const lowerResponse = response.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();

  // Common words that should never count as a brand match on their own
  const commonWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','up','about','into','through','during','before','after',
    'above','below','between','out','off','over','under','again','further','then','once','here','there','when','where','why','how','all',
    'both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','can','will',
    'just','should','now','also','new','one','two','way','may','like','time','has','look','find','use','her','his','its','our','what',
    'make','get','go','good','great','best','top','high','big','long','right','well','back','old','first','last','next','still','even',
    'any','day','work','part','take','come','made','live','run','set','try','ask','need','keep','let','help','show','start','call','move',
    'play','turn','give','point','read','change','small','large','hand','home','world','life','group','number','open','close','real',
    'free','full','clear','end','side','data','plan','service','system','software','tool','tools','platform','app','web','digital',
    'online','cloud','mobile','tech','technology','media','social','business','company','market','marketing','management','project',
    'solution','solutions','product','products','team','user','users','customer','customers','client','clients','support','review',
    'design','development','build','code','test','search','content','brand','site','pro','plus','smart','blue','green','red','black',
    'white','light','dark','global','local','fast','easy','simple','power','energy','star','sun','moon','fire','air','water','earth',
    'net','link','core','hub','lab','labs','bit','max','key','box'
  ]);

  // Build strict brand variations: full name, no-space, no-special-char only
  // Individual words are only included if the brand is a single word
  const brandWords = lowerBrandName.split(/\s+/).filter(Boolean);
  const brandVariations = [
    lowerBrandName,
    lowerBrandName.replace(/\s+/g, ''),
    lowerBrandName.replace(/[^\w\s]/g, '').trim(),
  ];
  // Only add individual words if brand is a single word or if the word is long+unique enough
  if (brandWords.length === 1) {
    brandVariations.push(brandWords[0]);
  } else {
    // For multi-word brands, only add words that are >= 5 chars AND not common
    for (const word of brandWords) {
      if (word.length >= 5 && !commonWords.has(word)) {
        brandVariations.push(word);
      }
    }
  }
  // Dedupe and filter out very short strings
  const uniqueBrandVariations = [...new Set(brandVariations)].filter((v) => v.length > 2);

  // Use word-boundary matching to avoid partial matches inside other words
  const brandMentioned = uniqueBrandVariations.some((variation) => {
    // For short variations (<=4 chars), require word boundaries
    if (variation.length <= 4) {
      const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(response);
    }
    return lowerResponse.includes(variation);
  });
  // Find competitor mentions with more context
  const competitorsFound = [];
  const competitorContexts = {};
  if (competitors && competitors.length > 0) {
    for (const competitor of competitors){
      const lowerCompetitor = competitor.toLowerCase();
      const compWords = lowerCompetitor.split(/\s+/).filter(Boolean);
      const competitorVariations = [
        lowerCompetitor,
        lowerCompetitor.replace(/\s+/g, ''),
        lowerCompetitor.replace(/[^\w\s]/g, '').trim(),
      ];
      if (compWords.length === 1) {
        competitorVariations.push(compWords[0]);
      } else {
        for (const word of compWords) {
          if (word.length >= 5 && !commonWords.has(word)) {
            competitorVariations.push(word);
          }
        }
      }
      const uniqueCompVariations = [...new Set(competitorVariations)].filter((v) => v.length > 2);
      const competitorMentioned = uniqueCompVariations.some((variation) => {
        if (variation.length <= 4) {
          const regex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          return regex.test(response);
        }
        return lowerResponse.includes(variation);
      });
      if (competitorMentioned) {
        competitorsFound.push(competitor);
        // Find context for competitor mentions
        const sentences = response.split(/[.!?]+/).filter((s)=>s.trim().length > 0);
        const competitorSentences = sentences.filter((s)=>uniqueCompVariations.some((variation)=>s.toLowerCase().includes(variation)));
        if (competitorSentences.length > 0) {
          // Detect comparison language
          const directComparisonSentences = competitorSentences.filter((s)=>uniqueBrandVariations.some((brandVar)=>s.toLowerCase().includes(brandVar)) && (s.toLowerCase().includes(' vs ') || s.toLowerCase().includes(' versus ') || s.toLowerCase().includes(' compared to ') || s.toLowerCase().includes(' better than ') || s.toLowerCase().includes(' worse than ') || s.toLowerCase().includes(' similar to ') || s.toLowerCase().includes(' like ') || s.toLowerCase().includes(' alternative to ') || s.toLowerCase().includes(' include ') || s.toLowerCase().includes(' such as ') || s.toLowerCase().includes(' along with ') || s.toLowerCase().includes(' alongside ')));
          // Enhanced sentiment detection
          const positiveWords = [
            'better',
            'best',
            'superior',
            'excellent',
            'recommended',
            'preferred',
            'leading',
            'top',
            'great',
            'outstanding',
            'popular',
            'trusted',
            'reliable'
          ];
          const negativeWords = [
            'worse',
            'worst',
            'inferior',
            'poor',
            'avoid',
            'problematic',
            'overpriced',
            'disappointing',
            'limited',
            'lacking',
            'outdated',
            'expensive'
          ];
          const competitorPositive = positiveWords.some((word)=>competitorSentences.some((s)=>{
              const sentence = s.toLowerCase();
              const wordIndex = sentence.indexOf(word);
              const competitorIndex = uniqueCompVariations.map((v)=>sentence.indexOf(v)).find((i)=>i !== -1) || -1;
              // Check if positive word is near competitor mention (within 10 words)
              return wordIndex !== -1 && competitorIndex !== -1 && Math.abs(wordIndex - competitorIndex) < 50;
            }));
          const competitorNegative = negativeWords.some((word)=>competitorSentences.some((s)=>{
              const sentence = s.toLowerCase();
              const wordIndex = sentence.indexOf(word);
              const competitorIndex = uniqueCompVariations.map((v)=>sentence.indexOf(v)).find((i)=>i !== -1) || -1;
              return wordIndex !== -1 && competitorIndex !== -1 && Math.abs(wordIndex - competitorIndex) < 50;
            }));
          // Determine if competitor is positioned as better or worse than the brand
          let comparisonResult = 'neutral';
          if (directComparisonSentences.length > 0) {
            const comparisonSentence = directComparisonSentences[0].toLowerCase();
            const brandIndex = uniqueBrandVariations.map((v)=>comparisonSentence.indexOf(v)).find((i)=>i !== -1) || -1;
            const competitorIndex = uniqueCompVariations.map((v)=>comparisonSentence.indexOf(v)).find((i)=>i !== -1) || -1;
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
          const isInList = competitorSentences.some((s)=>{
            const sentence = s.toLowerCase();
            return sentence.includes('top ') || sentence.includes('best ') || sentence.includes('leading ') || sentence.includes('popular ') || sentence.includes('include ') || sentence.includes('such as ') || /\d+\./.test(sentence) || // Numbered lists
            sentence.includes('•') || sentence.includes('-'); // Bullet points
          });
          competitorContexts[competitor] = {
            mentions: competitorSentences.length,
            context: competitorSentences[0].trim(),
            position: sentences.findIndex((s)=>uniqueCompVariations.some((v)=>s.toLowerCase().includes(v))) + 1,
            mentioned_with_brand: competitorSentences.some((s)=>uniqueBrandVariations.some((v)=>s.toLowerCase().includes(v))),
            direct_comparison: directComparisonSentences.length > 0,
            comparison_result: comparisonResult,
            sentiment: competitorPositive && !competitorNegative ? 'positive' : competitorNegative && !competitorPositive ? 'negative' : 'mixed',
            all_contexts: competitorSentences.map((s)=>s.trim()).slice(0, 3),
            in_ranking_list: isInList,
            ranking_position: isInList ? sentences.findIndex((s)=>uniqueCompVariations.some((v)=>s.toLowerCase().includes(v))) + 1 : null
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
  const sentences = response.split(/[.!?]+/).filter((s)=>s.trim().length > 0);
  let mentionPosition = null;
  let mentionContext = null;
  let allBrandMentions = [];
  for(let i = 0; i < sentences.length; i++){
    if (uniqueBrandVariations.some((variation)=>sentences[i].toLowerCase().includes(variation))) {
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
  // Simple sentiment analysis using OpenAI
  let sentimentScore = null;
  const openAIApiKey = await getApiKey('openai');
  if (openAIApiKey && (mentionContext || competitorsFound.length > 0)) {
    try {
      const textToAnalyze = mentionContext || (competitorsFound.length > 0 ? competitorContexts[competitorsFound[0]].context : "No specific context available");
      const targetName = mentionContext ? brandName : competitorsFound[0];
      const sentimentResponse = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
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
          temperature: 0.1
        })
      });
      if (sentimentResponse.ok) {
        const sentimentData = await sentimentResponse.json();
        const sentimentText = sentimentData.choices[0].message.content.trim();
        const parsedSentiment = parseFloat(sentimentText);
        if (!isNaN(parsedSentiment) && parsedSentiment >= -1 && parsedSentiment <= 1) {
          sentimentScore = parsedSentiment;
        }
      }
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      // Fallback: simple keyword-based sentiment
      const textToAnalyze = mentionContext || (competitorsFound.length > 0 ? competitorContexts[competitorsFound[0]].context : "");
      if (textToAnalyze) {
        const positiveWords = [
          'good',
          'great',
          'excellent',
          'best',
          'leading',
          'innovative',
          'reliable',
          'trusted',
          'recommended',
          'popular',
          'top'
        ];
        const negativeWords = [
          'bad',
          'poor',
          'worst',
          'problematic',
          'issues',
          'concerns',
          'disappointing',
          'avoid',
          'limited',
          'expensive'
        ];
        const positive = positiveWords.some((word)=>textToAnalyze.toLowerCase().includes(word));
        const negative = negativeWords.some((word)=>textToAnalyze.toLowerCase().includes(word));
        if (positive && !negative) sentimentScore = 0.7;
        else if (negative && !positive) sentimentScore = -0.3;
        else sentimentScore = 0.1; // Neutral with slight positive bias for mentions
      }
    }
  }
  // Extract feature mentions
  const featureKeywords = [
    'feature',
    'functionality',
    'capability',
    'tool',
    'integration',
    'api',
    'interface',
    'dashboard',
    'reporting',
    'analytics',
    'security',
    'performance',
    'pricing',
    'cost',
    'support',
    'customer service',
    'usability',
    'user experience',
    'ux',
    'ui',
    'mobile',
    'cloud',
    'automation',
    'workflow',
    'collaboration'
  ];
  const featureMentions = sentences.filter((s)=>uniqueBrandVariations.some((variation)=>s.toLowerCase().includes(variation)) && featureKeywords.some((keyword)=>s.toLowerCase().includes(keyword))).map((s)=>s.trim()).slice(0, 3);
  // Extract the sentence containing the brand mention for verification
  let verifiedMentionText: string | null = null;
  if (brandMentioned) {
    for (const variation of uniqueBrandVariations) {
      const idx = lowerResponse.indexOf(variation);
      if (idx !== -1) {
        // Find sentence boundaries around the mention
        const textBefore = response.substring(0, idx);
        const textAfter = response.substring(idx);
        const sentenceStart = Math.max(
          textBefore.lastIndexOf('. ') + 2,
          textBefore.lastIndexOf('? ') + 2,
          textBefore.lastIndexOf('! ') + 2,
          textBefore.lastIndexOf('\n') + 1,
          0
        );
        const afterMatch = textAfter.search(/[.!?\n]/);
        const sentenceEnd = afterMatch !== -1 ? idx + afterMatch + 1 : Math.min(response.length, idx + variation.length + 100);
        verifiedMentionText = response.substring(sentenceStart, sentenceEnd).trim();
        if (verifiedMentionText.length > 300) {
          verifiedMentionText = verifiedMentionText.substring(0, 300) + '...';
        }
        break;
      }
    }
  }

  return {
    brand_mentioned: brandMentioned,
    mention_position: mentionPosition,
    sentiment_score: sentimentScore,
    competitors_found: competitorsFound,
    competitor_contexts: competitorContexts,
    mention_context: mentionContext,
    verified_mention_text: verifiedMentionText,
    all_brand_mentions: allBrandMentions.slice(0, 5),
    feature_mentions: featureMentions,
    total_brand_mentions: allBrandMentions.length,
    total_competitor_mentions: competitorsFound.reduce((acc, comp)=>acc + (competitorContexts[comp]?.mentions || 0), 0),
    comparative_analysis: competitorsFound.length > 0 && brandMentioned,
    query_relevance: queryRelevance,
    brand_variations_detected: uniqueBrandVariations.filter((v)=>lowerResponse.includes(v)),
    competitor_variations_detected: competitors.reduce((acc, comp)=>{
      const variations = [
        comp.toLowerCase(),
        comp.toLowerCase().replace(/\s+/g, ''),
        comp.toLowerCase().replace(/[^\w\s]/g, '')
      ];
      const detected = variations.filter((v)=>lowerResponse.includes(v));
      if (detected.length > 0) acc[comp] = detected;
      return acc;
    }, {})
  };
}
// Classify query commercial intent and estimate revenue opportunity
function classifyQueryIntent(query: string): { intent: string; intent_score: number; revenue_potential: string; opportunity_label: string } {
  const lowerQuery = query.toLowerCase();

  // High commercial intent signals
  const buySignals = ['buy', 'purchase', 'pricing', 'price', 'cost', 'quote', 'demo', 'trial', 'subscribe', 'sign up', 'signup', 'get started', 'order', 'plan', 'plans', 'tier', 'license', 'pay', 'payment', 'checkout', 'billing', 'upgrade', 'downgrade', 'affordable', 'cheap', 'expensive', 'worth it', 'worth the money', 'roi', 'return on investment', 'investment', 'budget'];
  const comparisonSignals = ['vs', 'versus', 'compared to', 'comparison', 'compare', 'better than', 'best', 'top', 'alternative', 'alternatives', 'switch', 'switching', 'migrate', 'migration', 'replace', 'instead of', 'or', 'which one', 'which is', 'should i choose', 'should i use', 'should i pick', 'recommend', 'recommendation', 'rated', 'ranking', 'review', 'reviews'];
  const evaluationSignals = ['reliable', 'trusted', 'support', 'uptime', 'security', 'compliant', 'compliance', 'enterprise', 'scalable', 'integrate', 'integration', 'api', 'features', 'pros and cons', 'advantages', 'disadvantages', 'limitations', 'drawbacks'];
  const informationalSignals = ['what is', 'what are', 'how does', 'how to', 'explain', 'definition', 'meaning', 'guide', 'tutorial', 'learn', 'understand', 'basics', 'beginner', 'introduction', 'overview', 'history', 'why do', 'why is', 'difference between'];

  const hasBuy = buySignals.some(s => lowerQuery.includes(s));
  const hasComparison = comparisonSignals.some(s => lowerQuery.includes(s));
  const hasEvaluation = evaluationSignals.some(s => lowerQuery.includes(s));
  const hasInformational = informationalSignals.some(s => lowerQuery.includes(s));

  // Score: 0-100, higher = more commercial intent
  let score = 30; // base
  if (hasBuy) score += 40;
  if (hasComparison) score += 25;
  if (hasEvaluation) score += 15;
  if (hasInformational && !hasBuy && !hasComparison) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let intent: string;
  let revenuePotential: string;
  let opportunityLabel: string;

  if (score >= 70) {
    intent = 'transactional';
    revenuePotential = 'high';
    opportunityLabel = 'Direct revenue opportunity — buyer is ready to purchase';
  } else if (score >= 45) {
    intent = 'commercial_investigation';
    revenuePotential = 'medium';
    opportunityLabel = 'Decision-stage — buyer is comparing options';
  } else if (score >= 25) {
    intent = 'consideration';
    revenuePotential = 'low';
    opportunityLabel = 'Early-stage — potential buyer exploring solutions';
  } else {
    intent = 'informational';
    revenuePotential = 'minimal';
    opportunityLabel = 'Informational — no immediate purchase intent';
  }

  return { intent, intent_score: score, revenue_potential: revenuePotential, opportunity_label: opportunityLabel };
}

async function fetchWebsiteContent(url) {
  if (!url) return '';
  try {
    // Make sure URL has proper protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    console.log(`Fetching website content from ${url}`);
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalysisBot/1.0)'
      },
      redirect: 'follow'
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
function extractTextFromHTML(html) {
  try {
    // Simple regex-based extraction of text content
    // Remove scripts and style tags
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
    // Remove all HTML tags
    text = text.replace(/<[^>]*>/g, ' ');
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  } catch (error) {
    console.error(`Error extracting text from HTML: ${error}`);
    return '';
  }
}
async function generateRealisticUserQueries(brandName, industry, keywords = [], competitors = [], websiteUrl = '', language = 'en', options = {}) {
  const { languages: analysisLanguages = [], countries: analysisCountries = [], maxQueries: requestedMax = 50 } = options;
  const maxQueries = Math.min(50, Math.max(1, requestedMax));
  const openAIApiKey = await getApiKey('openai');
  if (!openAIApiKey) {
    console.log('No OpenAI API key available for query generation, using fallback queries');
    return generateFallbackQueries(brandName, industry, keywords, competitors, language, analysisCountries);
  }
  try {
    console.log(`Generating realistic user queries for ${brandName} in ${industry} (language: ${language}${analysisCountries?.length ? `, countries: ${analysisCountries.join(', ')}` : ''})`);
    // Fetch website content if URL is provided
    let websiteContent = '';
    if (websiteUrl) {
      websiteContent = await fetchWebsiteContent(websiteUrl);
    }
    const keywordContext = keywords.length > 0 ? `Key features/keywords: ${keywords.join(', ')}` : '';
    const competitorContext = competitors.length > 0 ? `Main competitors: ${competitors.join(', ')}` : '';
    const websiteContext = websiteContent ? `Website content summary: ${websiteContent}` : '';
    
    // Language instruction: default is English; Hebrew and the other 10 UI languages have explicit, proper blocks
    const langCode = (language || 'en').toLowerCase().split('-')[0];
    const languageNames: Record<string, string> = { he: 'Hebrew (עברית)', ur: 'Urdu', en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ja: 'Japanese', zh: 'Chinese', pl: 'Polish', ru: 'Russian', ko: 'Korean', ar: 'Arabic', tr: 'Turkish', hi: 'Hindi', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', sv: 'Swedish', no: 'Norwegian', da: 'Danish', fi: 'Finnish' };
    const languageName = languageNames[langCode] || langCode;
    let languageInstruction = '';
    if (langCode === 'he') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in HEBREW (עברית).
- Write queries naturally in Hebrew, as native Hebrew speakers would search
- Use Hebrew question words: מה, איך, למה, איפה, מתי, מי, איזה
- Use natural Hebrew expressions and phrasing
- Maintain conversational Hebrew style
- All ${maxQueries} queries must be in Hebrew\n`;
    } else if (langCode === 'ur') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in URDU.
- Write queries naturally in Urdu, as native Urdu speakers would search (use Urdu script)
- Use natural Urdu question words and expressions (کیا، کیسے، کہاں، کب، کون، etc.)
- Maintain conversational Urdu style; use common search phrasing
- All ${maxQueries} queries must be in Urdu\n`;
    } else if (langCode === 'de') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in GERMAN.
- Write queries naturally in German, as native German speakers would search
- Use natural German question words: was, wie, warum, wo, wann, wer, welcher
- Use formal (Sie) or informal (du) phrasing as appropriate for search
- Maintain conversational German style; all ${maxQueries} queries must be in German\n`;
    } else if (langCode === 'fr') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in FRENCH.
- Write queries naturally in French, as native French speakers would search
- Use natural French question words: quoi, comment, pourquoi, où, quand, qui, quel(le)
- Use natural French expressions and phrasing; maintain conversational style
- All ${maxQueries} queries must be in French\n`;
    } else if (langCode === 'es') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in SPANISH.
- Write queries naturally in Spanish, as native Spanish speakers would search
- Use natural Spanish question words: qué, cómo, por qué, dónde, cuándo, quién, cuál
- Maintain conversational Spanish style; all ${maxQueries} queries must be in Spanish\n`;
    } else if (langCode === 'it') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in ITALIAN.
- Write queries naturally in Italian, as native Italian speakers would search
- Use natural Italian question words: cosa, come, perché, dove, quando, chi, quale
- Maintain conversational Italian style; all ${maxQueries} queries must be in Italian\n`;
    } else if (langCode === 'pt') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in PORTUGUESE.
- Write queries naturally in Portuguese, as native speakers would search
- Use natural question words: o que, como, por que, onde, quando, quem, qual
- Maintain conversational Portuguese style; all ${maxQueries} queries must be in Portuguese\n`;
    } else if (langCode === 'nl') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in DUTCH.
- Write queries naturally in Dutch, as native Dutch speakers would search
- Use natural Dutch question words: wat, hoe, waarom, waar, wanneer, wie, welk
- Maintain conversational Dutch style; all ${maxQueries} queries must be in Dutch\n`;
    } else if (langCode === 'ja') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in JAPANESE.
- Write queries naturally in Japanese, as native Japanese speakers would search
- Use natural Japanese question words and phrasing (何、どのように、なぜ、どこ、いつ、誰、どれ)
- Use appropriate script (Kanji, Hiragana, Katakana) as used in real search queries
- All ${maxQueries} queries must be in Japanese\n`;
    } else if (langCode === 'zh') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in CHINESE.
- Write queries naturally in Chinese, as native Chinese speakers would search
- Use natural Chinese question words and phrasing (什么、怎么、为什么、哪里、什么时候、谁、哪个)
- Use Simplified Chinese (简体) unless the context clearly requires Traditional
- All ${maxQueries} queries must be in Chinese\n`;
    } else if (langCode !== 'en') {
      languageInstruction = `\n🌐 LANGUAGE REQUIREMENT: Generate ALL queries in ${languageName}.
- Write queries naturally as native speakers of this language would search
- Use natural expressions, question words, and phrasing in that language
- All ${maxQueries} queries must be in ${languageName}\n`;
    }

    const countryNamesMap = { US: 'United States', GB: 'UK', CA: 'Canada', AU: 'Australia', IE: 'Ireland', NZ: 'New Zealand', ZA: 'South Africa', IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', SG: 'Singapore', MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam', TH: 'Thailand', ID: 'Indonesia', HK: 'Hong Kong', TW: 'Taiwan', KR: 'South Korea', JP: 'Japan', CN: 'China', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', CH: 'Switzerland', PL: 'Poland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PT: 'Portugal', GR: 'Greece', CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary', RU: 'Russia', UA: 'Ukraine', TR: 'Turkey', IL: 'Israel', AE: 'United Arab Emirates', SA: 'Saudi Arabia', EG: 'Egypt', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', JO: 'Jordan', LB: 'Lebanon', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Peru', VE: 'Venezuela', EC: 'Ecuador', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana', ET: 'Ethiopia', MA: 'Morocco', EU: 'European Union' };
    const countryNames = (analysisCountries || []).length ? analysisCountries.map((c) => countryNamesMap[c] || c) : [];
    const geographyInstruction = countryNames.length > 0
      ? `\n🌍 GEOGRAPHY REQUIREMENT: Generate queries as they would be asked by users in these countries/regions: ${countryNames.join(', ')}.
- Include region-specific phrasing where natural (e.g. "in the UK", "for the German market", "best X in Germany", "US-based", "available in Australia")
- Distribute queries across these regions so the set reflects a mix of geographic perspectives
- Keep the same ${maxQueries}-query total; vary the region angle across the list\n`
      : '';
    
    const prompt = `Generate ${maxQueries} realistic, conversational search queries that real users would type when looking for solutions like ${brandName} offers. These should sound like natural human messages, NOT direct brand mentions.
${languageInstruction}
${geographyInstruction}

Brand context: ${brandName} (${industry})
${keywordContext}
${competitorContext}
${websiteContext}

Based on the brand's industry, website content, and keywords, generate highly relevant search queries that potential BUYERS would actually use. Focus on queries with COMMERCIAL INTENT — these are the searches people make when they are actively considering a purchase, comparing solutions, or ready to buy.

Generate queries in these categories. Prioritize purchase-intent and decision-stage queries:

1. PURCHASE-READY searches (8 queries) — Queries from users ready to buy or sign up:
   Examples: "Best ${industry} software to buy right now", "Which ${industry} tool should I switch to?", "Top rated ${industry} platform for my business"
2. COMPARISON & DECISION searches (8 queries) — Head-to-head comparisons and decision-stage queries:
   Examples: "${industry} tool A vs tool B which is better?", "Is it worth paying for premium ${industry} software?", "Best value ${industry} solution for the price"
3. PROBLEM-TO-SOLUTION searches (6 queries) — Users with a pain point looking for a product to solve it:
   Examples: "I need a better way to handle ${industry} tasks", "What's the fastest ${industry} solution?", "How to fix ${industry} problems with automation"
4. ROI & PRICING searches (6 queries) — Cost-benefit and budget-driven queries:
   Examples: "${industry} software pricing comparison", "Is ${industry} tool worth the investment?", "Affordable ${industry} solutions that actually work", "Free vs paid ${industry} — what do I get for my money?"
5. VENDOR EVALUATION searches (6 queries) — Due-diligence queries before purchase:
   Examples: "${industry} software reviews from real users", "Most trusted ${industry} platform", "Which ${industry} companies have the best support?", "${industry} tool reliability and uptime"
6. USE CASE / SEGMENT searches (6 queries) — Queries by specific buyer segments:
   Examples: "Best ${industry} for startups in 2026", "${industry} for enterprise teams", "${industry} tools for agencies", "Which ${industry} is best for small business?"
7. ALTERNATIVE & SWITCHING searches (5 queries) — Users looking to switch from a current solution:
   Examples: "Better alternatives to my current ${industry} tool", "Switching ${industry} providers — what to consider", "Top ${industry} alternatives for migration"
8. COMPETITIVE INTELLIGENCE searches (5 queries) — Queries that benchmark the market:
   Examples: "Who is the market leader in ${industry}?", "Fastest growing ${industry} companies", "Which ${industry} platforms are gaining market share?"

CRITICAL RULES:
- Every query must reflect BUYER INTENT — the person searching is spending money or making a business decision
- Queries should be 1-3 sentences long, conversational, as if asking an AI assistant for a recommendation
- Format each query as a proper sentence or question with capitalization and punctuation
- NO direct brand mentions — these are generic searches
- Include variations with years (2025, 2026) in 3-4 queries
- Include business size/budget variations naturally
- ENSURE all queries are directly relevant to the brand's actual products/services
- Use language and terms found on the brand's website when possible
- Think like a buyer, not a researcher — focus on DECISION queries, not informational ones

IMPORTANT: Return EXACTLY ${maxQueries} queries in a valid JSON array format. No markdown formatting, no backticks, just a clean JSON array of strings.`;
    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: langCode === 'he'
              ? 'אתה מומחה בהתנהגות חיפוש משתמשים ויצירת שאילתות. צור שאילתות חיפוש מציאותיות ושיחה שהמשתמשים האמיתיים היו מקלידים למנועי חיפוש או עוזרי AI. תמיד עטוף שאילתות כמשפטים או שאלות תקינים עם רישיות וסימני פיסוק מתאימים. תמיד החזר מערכים JSON מעוצבים כראוי ללא עיצוב markdown או הסבר. כל השאילתות חייבות להיות בעברית.'
              : langCode !== 'en'
                ? `You are an expert in user search behavior and query generation. Generate realistic, conversational search queries that real users would type into search engines or AI assistants. All queries MUST be in ${languageName}. Write as a native speaker would search. Always format queries as proper sentences or questions with appropriate capitalization and punctuation. Return a valid JSON array of strings only, no markdown or explanation.`
              : 'You are an expert in user search behavior and query generation. Generate realistic, conversational search queries that real users would type into search engines or AI assistants. Always format queries as proper sentences or questions with appropriate capitalization and punctuation. You always return properly formatted JSON arrays without any markdown formatting or explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.8
      })
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
        const formattedQueries = queries.map((query)=>{
          let formattedQuery = query.trim();
          if (formattedQuery.length > 0) {
            formattedQuery = formattedQuery.charAt(0).toUpperCase() + formattedQuery.slice(1);
          }
          // Ensure query ends with punctuation — detect questions in multiple languages
          if (!/[.?!？。！]$/.test(formattedQuery)) {
            const isQuestion =
              // English
              /\b(what|how|why|where|when|which|who|can|should|will|is|are|do|does|did)\b/i.test(formattedQuery) ||
              // German
              /\b(was|wie|warum|wo|wann|wer|welch|kann|soll)\b/i.test(formattedQuery) ||
              // French
              /\b(quoi|comment|pourquoi|où|quand|qui|quel|quelle|est-ce)\b/i.test(formattedQuery) ||
              // Spanish
              /[¿]/.test(formattedQuery) || /\b(qué|cómo|por qué|dónde|cuándo|quién|cuál)\b/i.test(formattedQuery) ||
              // Italian
              /\b(cosa|come|perché|dove|quando|chi|quale)\b/i.test(formattedQuery) ||
              // Portuguese
              /\b(o que|como|por que|onde|quando|quem|qual)\b/i.test(formattedQuery) ||
              // Dutch
              /\b(wat|hoe|waarom|waar|wanneer|wie|welk)\b/i.test(formattedQuery) ||
              // Japanese / Chinese question markers
              /[か？吗呢]/.test(formattedQuery) ||
              // Hebrew question words
              /\b(מה|איך|למה|איפה|מתי|מי|האם)\b/.test(formattedQuery) ||
              // Urdu question words
              /\b(کیا|کیسے|کہاں|کب|کون)\b/.test(formattedQuery);
            if (isQuestion && !formattedQuery.includes('?') && !formattedQuery.includes('？')) {
              formattedQuery += '?';
            } else if (!/[.。]$/.test(formattedQuery)) {
              formattedQuery += '.';
            }
          }
          return formattedQuery;
        });
        // Ensure we have at least maxQueries by duplicating and modifying if needed
        if (formattedQueries.length < maxQueries) {
          console.log(`Only generated ${formattedQueries.length} queries, adding variations to reach ${maxQueries}`);
          const years = [
            new Date().getFullYear(),
            new Date().getFullYear() + 1
          ];
          // For non-English languages, just duplicate existing queries with year variations
          // to avoid injecting English text into non-English query sets
          while(formattedQueries.length < maxQueries){
            const originalQuery = formattedQueries[Math.floor(Math.random() * formattedQueries.length)];
            const year = years[Math.floor(Math.random() * years.length)];
            if (!originalQuery.includes(year.toString())) {
              formattedQueries.push(`${originalQuery.replace(/[.?!？。！]$/, '')} ${year}.`);
            } else {
              // Re-use existing query as-is to avoid English contamination
              const altQuery = formattedQueries[Math.floor(Math.random() * Math.min(formattedQueries.length, 10))];
              if (!formattedQueries.includes(altQuery + ' ')) {
                formattedQueries.push(altQuery);
              }
            }
            if (formattedQueries.length >= 95) break;
          }
        }
        return formattedQueries.slice(0, maxQueries); // Ensure we don't exceed requested count
      } else {
        console.error('Generated content is not a valid array:', cleanedContent);
        throw new Error('Generated content is not a valid array');
      }
    } catch (parseError) {
      console.error('Failed to parse generated queries:', parseError, 'Content:', generatedContent);
      return generateFallbackQueries(brandName, industry, keywords, competitors, language, analysisCountries);
    }
  } catch (error) {
    console.error('Query generation failed:', error);
    return generateFallbackQueries(brandName, industry, keywords, competitors, language, analysisCountries);
  }
}
function generateFallbackQueries(brandName, industry, keywords = [], competitors = [], language = 'en', countries = []) {
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
  const regionLabels = { US: 'the US', GB: 'the UK', CA: 'Canada', AU: 'Australia', IE: 'Ireland', NZ: 'New Zealand', ZA: 'South Africa', IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', SG: 'Singapore', MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam', TH: 'Thailand', ID: 'Indonesia', HK: 'Hong Kong', TW: 'Taiwan', KR: 'South Korea', JP: 'Japan', CN: 'China', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands', BE: 'Belgium', AT: 'Austria', CH: 'Switzerland', PL: 'Poland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PT: 'Portugal', GR: 'Greece', CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary', RU: 'Russia', UA: 'Ukraine', TR: 'Turkey', IL: 'Israel', AE: 'UAE', SA: 'Saudi Arabia', EG: 'Egypt', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', JO: 'Jordan', LB: 'Lebanon', BR: 'Brazil', MX: 'Mexico', AR: 'Argentina', CO: 'Colombia', CL: 'Chile', PE: 'Peru', VE: 'Venezuela', EC: 'Ecuador', NG: 'Nigeria', KE: 'Kenya', GH: 'Ghana', ET: 'Ethiopia', MA: 'Morocco', EU: 'the EU' };
  if (countries && countries.length > 0) {
    countries.slice(0, 5).forEach((c) => {
      const label = regionLabels[c] || c;
      baseQueries.push(`Best ${industry} tools available in ${label}.`);
      baseQueries.push(`What are good ${industry} options for the ${label} market?`);
      baseQueries.push(`${industry} software that works well in ${label}.`);
    });
  }
  // Ensure we have exactly 50 queries
  if (baseQueries.length > 50) {
    baseQueries.length = 50;
  }
  // If we have fewer than 50, add some variations
  const queries = [
    ...baseQueries
  ];
  const modifiers = [
    'Really need help with',
    'Looking for advice on',
    'Can anyone recommend',
    'Need suggestions for',
    'Trying to find'
  ];
  while(queries.length < 50){
    const originalQuery = baseQueries[Math.floor(Math.random() * baseQueries.length)];
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    queries.push(`${modifier} ${originalQuery.charAt(0).toLowerCase() + originalQuery.slice(1)}`);
    if (queries.length >= 95) break;
  }
  const final = queries.slice(0, 50);

  // For non-English languages, prepend a language instruction so AI platforms respond accordingly
  const langCode = (language || 'en').toLowerCase().split('-')[0];
  if (langCode !== 'en') {
    const fallbackLangNames: Record<string, string> = {
      he: 'Hebrew', ur: 'Urdu', de: 'German', fr: 'French', es: 'Spanish',
      it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ja: 'Japanese', zh: 'Chinese',
      pl: 'Polish', ru: 'Russian', ko: 'Korean', ar: 'Arabic', tr: 'Turkish',
      hi: 'Hindi', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', sv: 'Swedish',
      no: 'Norwegian', da: 'Danish', fi: 'Finnish',
    };
    const langName = fallbackLangNames[langCode] || langCode;
    return final.map(q => `[Answer in ${langName}] ${q}`);
  }
  return final;
}
const MAX_QUERIES = 50;

// Option A: equal split across (language × region) buckets. Returns list of (lang, country) with country null for "general".
function getLanguageRegionBuckets(analysisLangs, analysisCountriesRun, queryLanguage) {
  const L = (analysisLangs && analysisLangs.length) ? analysisLangs.length : 1;
  const R = (analysisCountriesRun && analysisCountriesRun.length) ? analysisCountriesRun.length : 1;
  const langs = (analysisLangs && analysisLangs.length) ? analysisLangs : [queryLanguage || 'en'];
  const countries = (analysisCountriesRun && analysisCountriesRun.length) ? analysisCountriesRun : [null];
  const buckets = [];
  for (const lang of langs) {
    for (const country of countries) {
      buckets.push({ lang: lang.split('-')[0].toLowerCase(), country });
    }
  }
  return buckets;
}

async function getQueriesForAnalysis(project, queryLanguage, analysisLangs, analysisCountriesRun, mergedKeywords = null) {
  const keywords = mergedKeywords != null ? mergedKeywords : (project.target_keywords || []);
  let mode = project.query_mode || 'auto';
  const manualList = Array.isArray(project.manual_queries) ? project.manual_queries : [];
  const manualTexts = manualList.map((q) => (q && typeof q.text === 'string' ? q.text.trim() : '')).filter(Boolean);
  const N = Math.min(Number(project.queries_per_platform) || MAX_QUERIES, MAX_QUERIES);

  // When non-English analysis languages are selected and mode is manual,
  // upgrade to auto_manual so new language-specific queries are generated
  if (mode === 'manual' && analysisLangs && analysisLangs.length > 0) {
    const hasNonEnglish = analysisLangs.some(l => !l.toLowerCase().startsWith('en'));
    if (hasNonEnglish && manualTexts.length > 0) {
      console.log(`Manual mode with non-English analysis languages detected; upgrading to auto_manual for language-specific query generation`);
      mode = 'auto_manual';
    }
  }

  if (mode === 'manual') {
    if (manualTexts.length === 0) {
      console.log(`Manual mode but no manual queries; using fallback generated queries (max ${N})`);
      return generateFallbackQueries(project.brand_name, project.industry, keywords, project.competitors || [], queryLanguage, analysisCountriesRun).slice(0, N);
    }
    return manualTexts.slice(0, N);
  }

  // Option A: distribute N across (language × region) buckets
  const buckets = getLanguageRegionBuckets(analysisLangs, analysisCountriesRun, queryLanguage);
  const bucketCount = buckets.length;
  const perBucket = Math.floor(N / bucketCount);
  const remainder = N - perBucket * bucketCount;
  const allQueries = [];

  if (mode === 'auto_manual') {
    const combined = [...manualTexts];
    const bucketPromises = buckets.map((b, i) => {
      const count = perBucket + (i < remainder ? 1 : 0);
      if (count <= 0) return Promise.resolve([]);
      const { lang, country } = b;
      return generateRealisticUserQueries(project.brand_name, project.industry, keywords, project.competitors || [], project.website_url || '', lang, { languages: [lang], countries: country ? [country] : [], maxQueries: count });
    });
    const bucketResults = await Promise.all(bucketPromises);
    for (const generated of bucketResults) {
      for (const q of generated) {
        if (combined.length >= N) break;
        if (!combined.includes(q)) combined.push(q);
      }
    }
    console.log(`Auto+manual: ${manualTexts.length} manual + generated, total ${combined.length} (cap ${N}, ${bucketCount} buckets)`);
    return combined.slice(0, N);
  }

  const bucketPromises = buckets.map((b, i) => {
    const count = perBucket + (i < remainder ? 1 : 0);
    if (count <= 0) return Promise.resolve([]);
    const { lang, country } = b;
    return generateRealisticUserQueries(project.brand_name, project.industry, keywords, project.competitors || [], project.website_url || '', lang, { languages: [lang], countries: country ? [country] : [], maxQueries: count });
  });
  const bucketResults = await Promise.all(bucketPromises);
  for (const generated of bucketResults) allQueries.push(...generated);
  console.log(`Option A: ${allQueries.length} queries across ${bucketCount} (lang×region) buckets (parallel generation)`);
  return allQueries.slice(0, N);
}
async function recordRunHistory(supabaseClient: any, projectId: string, sessionId: string) {
  try {
    const { data: allResponses } = await supabaseClient
      .from('ai_platform_responses')
      .select('platform, response_metadata')
      .eq('session_id', sessionId);

    if (!allResponses || allResponses.length === 0) return;

    const totalQueries = allResponses.length;
    const withMention = allResponses.filter((r: any) => r.response_metadata?.brand_mentioned === true);
    const mentionRate = totalQueries > 0 ? (withMention.length / totalQueries) * 100 : 0;

    const positive = withMention.filter((r: any) => (r.response_metadata?.sentiment_score || 0) > 0.3).length;
    const negative = withMention.filter((r: any) => (r.response_metadata?.sentiment_score || 0) < -0.3).length;
    const neutral = withMention.length - positive - negative;

    // Per-platform scores
    const platformMap: Record<string, { total: number; mentions: number }> = {};
    for (const r of allResponses) {
      if (!platformMap[r.platform]) platformMap[r.platform] = { total: 0, mentions: 0 };
      platformMap[r.platform].total++;
      if (r.response_metadata?.brand_mentioned) platformMap[r.platform].mentions++;
    }
    const platformScores: Record<string, number> = {};
    for (const [p, v] of Object.entries(platformMap)) {
      platformScores[p] = v.total > 0 ? Math.round((v.mentions / v.total) * 100) : 0;
    }

    const overallVisibility = mentionRate;

    // Get previous run for delta calculation
    const { data: prevRun } = await supabaseClient
      .from('analysis_run_history')
      .select('overall_visibility_score, brand_mention_rate')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const visibilityDelta = prevRun ? overallVisibility - (prevRun.overall_visibility_score || 0) : 0;
    const mentionDelta = prevRun ? mentionRate - (prevRun.brand_mention_rate || 0) : 0;

    // Count existing runs
    const { count: runCount } = await supabaseClient
      .from('analysis_run_history')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // Check if a run history record already exists for this session (created by scheduled-analysis)
    const { data: existingRun } = await supabaseClient
      .from('analysis_run_history')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)
      .single();

    if (existingRun) {
      await supabaseClient.from('analysis_run_history').update({
        overall_visibility_score: Math.round(overallVisibility * 100) / 100,
        platform_scores: platformScores,
        total_queries: totalQueries,
        queries_with_brand_mention: withMention.length,
        brand_mention_rate: Math.round(mentionRate * 100) / 100,
        positive_mentions: positive,
        neutral_mentions: neutral,
        negative_mentions: negative,
        visibility_delta: Math.round(visibilityDelta * 100) / 100,
        mention_rate_delta: Math.round(mentionDelta * 100) / 100,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', existingRun.id);
      console.log(`📊 Updated existing run history record: ${existingRun.id}`);
    } else {
      await supabaseClient.from('analysis_run_history').insert({
        project_id: projectId,
        session_id: sessionId,
        run_number: (runCount || 0) + 1,
        run_type: 'manual',
        overall_visibility_score: Math.round(overallVisibility * 100) / 100,
        platform_scores: platformScores,
        total_queries: totalQueries,
        queries_with_brand_mention: withMention.length,
        brand_mention_rate: Math.round(mentionRate * 100) / 100,
        positive_mentions: positive,
        neutral_mentions: neutral,
        negative_mentions: negative,
        visibility_delta: Math.round(visibilityDelta * 100) / 100,
        mention_rate_delta: Math.round(mentionDelta * 100) / 100,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      console.log(`📊 Created new run history record for session: ${sessionId}`);
    }
  } catch (err) {
    console.error('Failed to record run history:', err);
  }
}

function analyzeCrossPlatformResults(platformResults, brandName, competitors) {
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
  const brandMentionByQuery = {};
  const competitorMentionByQuery = {};
  // Initialize competitor tracking
  const competitorTracking = {};
  competitors.forEach((competitor)=>{
    competitorTracking[competitor] = {
      total_mentions: 0,
      platform_count: 0,
      consistent_mentions: 0
    };
  });
  // Collect all queries that were run across all platforms
  const allQueries = new Set();
  for (const platform of platforms){
    Object.keys(platformResults[platform]).forEach((query)=>allQueries.add(query));
  }
  // Analyze each query across platforms
  for (const query of allQueries){
    brandMentionByQuery[query] = [];
    competitorMentionByQuery[query] = {};
    for (const competitor of competitors){
      competitorMentionByQuery[query][competitor] = [];
    }
    for (const platform of platforms){
      const result = platformResults[platform][query];
      if (!result) continue;
      // Track brand mentions
      if (result.analysis?.brand_mentioned) {
        brandMentionByQuery[query].push(platform);
      }
      // Track competitor mentions
      if (result.analysis?.competitors_found) {
        for (const competitor of result.analysis.competitors_found){
          competitorMentionByQuery[query][competitor]?.push(platform);
          competitorTracking[competitor].total_mentions++;
        }
      }
    }
  }
  // Calculate brand mention consistency
  let totalBrandConsistency = 0;
  let queryCount = 0;
  for(const query in brandMentionByQuery){
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
  const competitorConsistency = {};
  for (const competitor of competitors){
    let totalConsistency = 0;
    let competitorQueryCount = 0;
    for(const query in competitorMentionByQuery){
      const mentioningPlatforms = competitorMentionByQuery[query][competitor]?.length || 0;
      if (mentioningPlatforms > 0) {
        const consistency = mentioningPlatforms / platforms.length;
        totalConsistency += consistency;
        competitorQueryCount++;
        // Track platforms that mentioned this competitor
        const platformsSet = new Set(competitorMentionByQuery[query][competitor]);
        if (platformsSet.size > 0) {
          competitorTracking[competitor].platform_count = Math.max(competitorTracking[competitor].platform_count, platformsSet.size);
        }
        // Track consistent mentions (mentioned by all platforms)
        if (mentioningPlatforms === platforms.length) {
          competitorTracking[competitor].consistent_mentions++;
        }
      }
    }
    competitorConsistency[competitor] = competitorQueryCount > 0 ? totalConsistency / competitorQueryCount : 0;
  }
  // Calculate platform agreement on brand mentions
  const platformAgreement = {};
  for (const platform1 of platforms){
    platformAgreement[platform1] = {};
    for (const platform2 of platforms){
      if (platform1 === platform2) continue;
      let agreementCount = 0;
      let totalQueries = 0;
      for(const query in platformResults[platform1]){
        if (!platformResults[platform2][query]) continue;
        const result1 = platformResults[platform1][query];
        const result2 = platformResults[platform2][query];
        if (result1?.analysis?.brand_mentioned === result2?.analysis?.brand_mentioned) {
          agreementCount++;
        }
        totalQueries++;
      }
      platformAgreement[platform1][platform2] = totalQueries > 0 ? agreementCount / totalQueries : 0;
    }
  }
  // Calculate query consistency (how consistently each query produces the same result)
  const queryConsistency = {};
  for (const query of allQueries){
    let mentionCount = 0;
    let platformCount = 0;
    for (const platform of platforms){
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
  const overallConsistencyScore = Object.values(queryConsistency).reduce((sum, val)=>sum + val, 0) / Object.keys(queryConsistency).length || 0;
  return {
    consistency_score: overallConsistencyScore,
    platform_agreement: platformAgreement,
    query_consistency: queryConsistency,
    brand_mention_consistency: brandMentionConsistency,
    competitor_mention_consistency: competitorConsistency,
    competitor_tracking: competitorTracking,
    most_consistent_queries: Object.entries(queryConsistency).sort(([, a], [, b])=>b - a).slice(0, 5).map(([query, score])=>({
        query,
        score
      })),
    least_consistent_queries: Object.entries(queryConsistency).sort(([, a], [, b])=>a - b).slice(0, 5).map(([query, score])=>({
        query,
        score
      }))
  };
}
async function runEnhancedBrandAnalysis(projectId, platforms = [
  'chatgpt'
], existingSessionId, language = 'en') {
  console.log(`Starting enhanced brand analysis for project ${projectId} across platforms: ${platforms.join(', ')}`);
  // Load API keys
  const openAIApiKey = await getApiKey('openai');
  const claudeApiKey = await getApiKey('claude');
  const geminiApiKey = await getApiKey('gemini');
  const perplexityApiKey = await getApiKey('perplexity');
  const groqApiKey = await getApiKey('groq');
  
  // Quick OpenAI API test if ChatGPT is requested
  if (platforms.includes('chatgpt') && openAIApiKey) {
    console.log('Testing OpenAI API connection...');
    try {
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`
        }
      });
      console.log(`OpenAI API test result: ${testResponse.status} ${testResponse.statusText}`);
      if (!testResponse.ok) {
        console.error('OpenAI API test failed - this may cause ChatGPT queries to fail');
      }
    } catch (error) {
      console.error('OpenAI API test error:', error.message);
    }
  }
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase.from('brand_analysis_projects').select('*').eq('id', projectId).single();
    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }
    const brandName = project.brand_name;
    const websiteUrl = project.website_url;
    const industry = project.industry || 'Technology';
    const competitors = project.competitors || [];
    const keywords = project.keywords || [];
    // Fetch website content if URL is provided
    let websiteContent = '';
    if (websiteUrl) {
      try {
        websiteContent = await fetchWebsiteContent(websiteUrl);
        console.log(`Fetched website content: ${websiteContent.length} characters`);
        // Also analyze the website content directly
        try {
          const analyzeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json'
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
            await supabase.from('brand_analysis_website_analysis').insert({
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
      } catch (error) {
        console.error(`Error fetching website content: ${error.message}`);
      }
    }
    console.log(`Found project: ${project.brand_name} in ${project.industry}`);
    // Check if any API keys are configured (already loaded above)
    const apiKeysAvailable = {
      chatgpt: !!openAIApiKey,
      claude: !!claudeApiKey,
      gemini: !!geminiApiKey,
      perplexity: !!perplexityApiKey,
      groq: !!groqApiKey
    };
    console.log('API keys available:', Object.entries(apiKeysAvailable).filter(([_, available])=>available).map(([platform])=>platform).join(', '));
    console.log(`DEBUG: Raw OpenAI API Key check - exists: ${!!openAIApiKey}, length: ${openAIApiKey ? openAIApiKey.length : 0}`);
    if (openAIApiKey) {
      console.log(`DEBUG: OpenAI Key starts with: ${openAIApiKey.substring(0, 10)}...`);
    }
    // Filter platforms that have API keys configured
    let availablePlatforms = platforms.filter((platform)=>{
      const available = platform === 'chatgpt' && apiKeysAvailable.chatgpt || platform === 'claude' && apiKeysAvailable.claude || platform === 'gemini' && apiKeysAvailable.gemini || platform === 'perplexity' && apiKeysAvailable.perplexity || platform === 'groq' && apiKeysAvailable.groq;
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
        availablePlatforms = [
          'chatgpt'
        ];
        console.log('Using ChatGPT as fallback platform');
      } else {
        // Use any available platform
        availablePlatforms = Object.entries(apiKeysAvailable).filter(([_, available])=>available).map(([platform])=>platform);
        if (availablePlatforms.length > 0) {
          console.log(`Using available platforms: ${availablePlatforms.join(', ')}`);
        } else {
          throw new Error('No API keys configured for any AI platform. Please configure at least one API key.');
        }
      }
    }
    // Build query list from project query_mode and optional manual_queries (cap 50)
    const analysisLangs = project.analysis_languages || [];
    const analysisCountriesRun = project.analysis_countries || [];
    const queryLanguage = analysisLangs.length > 0
      ? (analysisLangs[0].toLowerCase().startsWith('he') ? 'he' : analysisLangs[0].split('-')[0].toLowerCase() || 'en')
      : 'en';
    const selectedQueries = await getQueriesForAnalysis(project, queryLanguage, analysisLangs, analysisCountriesRun);
    console.log(`Using ${selectedQueries.length} queries for analysis across each platform (mode: ${project.query_mode || 'auto'})`);
    console.log("Sample queries:", selectedQueries.slice(0, 5));
    // Use existing session or create a new one
    let session;
    const totalQueries = availablePlatforms.length * selectedQueries.length;
    if (existingSessionId) {
      // Use the existing session
      const { data: existingSession, error: fetchError } = await supabase.from('brand_analysis_sessions').select('*').eq('id', existingSessionId).single();
      if (fetchError || !existingSession) {
        throw new Error(`Failed to find session: ${fetchError?.message}`);
      }
      session = existingSession;
      console.log(`Using existing session: ${session.id}`);
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase.from('brand_analysis_sessions').insert({
        project_id: projectId,
        session_name: `AI-Generated Queries Analysis ${new Date().toLocaleDateString()}`,
        status: 'running',
        started_at: new Date().toISOString(),
        total_queries: totalQueries
      }).select().single();
      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }
      session = newSession;
    }
    // Initialize tracking variables
    let completedQueries = 0;
    let totalMentions = 0;
    let workingPlatforms = [];
    let failedPlatforms = [];
    // Store results for comparison across platforms
    const platformResults = {};
    availablePlatforms.forEach((platform)=>{
      platformResults[platform] = {};
    });
    // Batch size for processing queries to avoid timeouts
    const BATCH_SIZE = 10;
    // Split queries into batches
    const queryBatches = [];
    for(let i = 0; i < selectedQueries.length; i += BATCH_SIZE){
      queryBatches.push(selectedQueries.slice(i, i + BATCH_SIZE));
    }
    console.log(`Split ${selectedQueries.length} queries into ${queryBatches.length} batches of ${BATCH_SIZE}`);
    // Process each batch of queries across all platforms
    for(let batchIndex = 0; batchIndex < queryBatches.length; batchIndex++){
      const queryBatch = queryBatches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${queryBatches.length} with ${queryBatch.length} queries`);
      // Process each platform for this batch
      for (const platform of availablePlatforms){
        console.log(`Processing batch ${batchIndex + 1} for platform: ${platform}`);
        let platformSuccess = false;
        let batchQueries = 0;
        // Process each query in the batch for this platform
        for (const query of queryBatch){
          try {
            const response = await queryAIPlatform(platform, query, language);
            if (response) {
              console.log(`Got response from ${platform} for query "${query.substring(0, 50)}...": ${response.substring(0, 50)}...`);
              platformSuccess = true;
              batchQueries++;
              // Extract sources from the response
              const extractedSources = extractSourcesFromResponse(response);
              // Analyze the response for brand mentions
              const analysis = await analyzeBrandMention(response, project.brand_name, project.competitors || []);
              // Add sources to the analysis if they exist
              if (analysis && extractedSources.length > 0) {
                analysis.sources = extractedSources;
              }
              // Store results for cross-platform comparison
              platformResults[platform][query] = {
                response: response,
                analysis: analysis
              };
              if (analysis?.brand_mentioned) {
                totalMentions++;
                console.log(`✓ Brand mentioned in response to: "${query}"`);
              }
              // Classify query commercial intent
              const queryIntent = classifyQueryIntent(query);
              const enrichedAnalysis = analysis ? { ...analysis, ...queryIntent } : queryIntent;
              // Store the response with metadata
              await supabase.from('ai_platform_responses').insert({
                project_id: projectId,
                session_id: session.id,
                platform: platform,
                prompt: query,
                response: response,
                response_metadata: enrichedAnalysis
              });
              completedQueries++;
              // Update session progress periodically (not on every query to reduce DB writes)
              if (completedQueries % 5 === 0 || completedQueries === totalQueries) {
                await supabase.from('brand_analysis_sessions').update({
                  completed_queries: completedQueries
                }).eq('id', session.id);
              }
            } else {
              console.log(`No response received from ${platform} for query: "${query}"`);
            }
          } catch (error) {
            console.error(`Error processing query "${query}" for ${platform}:`, error);
          // Continue with next query
          }
          // Small delay between requests to avoid rate limiting
          await new Promise((resolve)=>setTimeout(resolve, 300));
        }
        // Track platform success after each batch
        if (platformSuccess) {
          if (!workingPlatforms.includes(platform)) {
            workingPlatforms.push(platform);
          }
          console.log(`Platform ${platform} completed ${batchQueries}/${queryBatch.length} queries in batch ${batchIndex + 1}`);
        } else if (batchIndex === 0) {
          // Only mark as failed if the first batch fails completely
          failedPlatforms.push(platform);
          console.log(`Platform ${platform} failed completely in first batch`);
        }
      }
      // Update session after each batch
      await supabase.from('brand_analysis_sessions').update({
        completed_queries: completedQueries
      }).eq('id', session.id);
      console.log(`Completed batch ${batchIndex + 1}/${queryBatches.length}, total queries processed: ${completedQueries}/${totalQueries}`);
    }
    // Analyze cross-platform comparison
    const platformComparison = analyzeCrossPlatformResults(platformResults, project.brand_name, project.competitors || []);
    
    // Calculate average sentiment from all responses
    const { data: allResponsesForSentiment } = await supabase
      .from('ai_platform_responses')
      .select('response_metadata')
      .eq('session_id', session.id);
    
    const responsesWithSentiment = (allResponsesForSentiment || []).filter(
      r => r.response_metadata?.brand_mentioned && r.response_metadata?.sentiment_score !== null && r.response_metadata?.sentiment_score !== undefined
    );
    const avgSentiment = responsesWithSentiment.length > 0
      ? responsesWithSentiment.reduce((sum, r) => sum + (r.response_metadata?.sentiment_score || 0), 0) / responsesWithSentiment.length
      : 0;
    
    // Keep session as "running" - competitor-analysis-engine will mark it "completed"
    await supabase.from('brand_analysis_sessions').update({
      completed_queries: completedQueries,
      results_summary: {
        total_queries: totalQueries,
        successful_queries: completedQueries,
        total_mentions: totalMentions,
        mention_rate: completedQueries > 0 ? totalMentions / completedQueries : 0,
        avg_sentiment: Math.round(avgSentiment * 100), // Store as percentage
        platforms_analyzed: workingPlatforms,
        failed_platforms: failedPlatforms,
        platform_comparison: platformComparison,
        brand_analysis_completed_at: new Date().toISOString()
      }
    }).eq('id', session.id);
    
    console.log(`Brand analysis completed: ${completedQueries}/${totalQueries} queries successful, ${totalMentions} mentions found`);
    console.log(`Working platforms: ${workingPlatforms.join(', ')}`);
    if (failedPlatforms.length > 0) {
      console.log(`Failed platforms: ${failedPlatforms.join(', ')}`);
    }
    
    // Run competitor analysis engine - it will mark session as "completed" when done
    try {
      console.log(`🔍 Starting competitor analysis for session: ${session.id}`);
      const competitorResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/competitor-analysis-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'full-analysis',
          sessionId: session.id,
          projectId: projectId,
          brandName: project.brand_name,
          competitors: project.competitors || []
        })
      });
      
      if (competitorResponse.ok) {
        console.log(`✅ Competitor analysis completed for session: ${session.id}`);
      } else {
        console.error(`❌ Competitor analysis failed: ${competitorResponse.status}`);
        // If competitor analysis fails, mark session as completed anyway
        await supabase.from('brand_analysis_sessions').update({
          status: 'completed',
          completed_at: new Date().toISOString()
        }).eq('id', session.id);
        await supabase.from('brand_analysis_projects').update({
          last_analysis_at: new Date().toISOString()
        }).eq('id', projectId);
      }
      await recordRunHistory(supabase, projectId, session.id);
    } catch (competitorError) {
      console.error('Error running competitor analysis:', competitorError);
      // If competitor analysis fails, mark session as completed anyway
      await supabase.from('brand_analysis_sessions').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', session.id);
      await supabase.from('brand_analysis_projects').update({
        last_analysis_at: new Date().toISOString()
      }).eq('id', projectId);
      await recordRunHistory(supabase, projectId, session.id);
    }
    
    return {
      success: true,
      session_id: session.id,
      completed_queries: completedQueries,
      total_mentions: totalMentions,
      mention_rate: completedQueries > 0 ? totalMentions / completedQueries : 0,
      platforms_analyzed: workingPlatforms,
      failed_platforms: failedPlatforms,
      skipped_platforms: platforms.filter((p)=>!availablePlatforms.includes(p))
    };
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
// Background processing function that runs without blocking the response
async function processAnalysisInBackground(projectId, platforms, sessionId, language = 'en') {
  try {
    console.log(`Starting background processing for session: ${sessionId}`);
    await runEnhancedBrandAnalysis(projectId, platforms, sessionId, language);
    console.log(`Completed background processing for session: ${sessionId}`);
  } catch (error) {
    console.error('Background analysis failed:', error);
    // Update session with error status
    await supabase.from('brand_analysis_sessions').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      results_summary: {
        error: error.message,
        failed_at: new Date().toISOString()
      }
    }).eq('id', sessionId);
  }
}

// Run async tasks with a concurrency limit for faster analysis without overwhelming APIs
const PARALLEL_CONCURRENCY = 6;
async function runWithConcurrency(tasks, concurrency = PARALLEL_CONCURRENCY) {
  const results = [];
  let index = 0;
  async function runNext() {
    const i = index++;
    if (i >= tasks.length) return;
    const task = tasks[i];
    try {
      const value = await task();
      results[i] = { ok: true, value };
    } catch (err) {
      results[i] = { ok: false, error: err };
    }
    await runNext();
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

// Process a batch of queries with parallel API calls for faster results
async function processBatchOfQueries(projectId, platforms, sessionId, queries, batchStartIndex = 0, batchSize = 6, language = 'en') {
  try {
    console.log(`Processing batch starting at index ${batchStartIndex} for session: ${sessionId} (language: ${language}), batch size: ${batchSize}`);
    
    // Check if session is paused before processing
    const { data: sessionCheck, error: sessionCheckError } = await supabase
      .from('brand_analysis_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();
    
    if (sessionCheck?.status === 'paused') {
      console.log(`⏸️ Session ${sessionId} is paused. Stopping batch processing.`);
      return {
        paused: true,
        message: 'Analysis is paused',
        batchStartIndex,
        totalQueries: queries.length
      };
    }
    
    if (sessionCheck?.status === 'cancelled') {
      console.log(`🛑 Session ${sessionId} is cancelled. Stopping batch processing.`);
      return {
        cancelled: true,
        message: 'Analysis was cancelled',
        batchStartIndex,
        totalQueries: queries.length
      };
    }
    
    // Get project details
    const { data: project, error: projectError } = await supabase.from('brand_analysis_projects').select('*').eq('id', projectId).single();
    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }
    const currentBatch = queries.slice(batchStartIndex, batchStartIndex + batchSize);
    console.log(`Processing ${currentBatch.length} queries × ${platforms.length} platforms in parallel (concurrency: ${PARALLEL_CONCURRENCY})`);
    
    // Build one task per (query, platform) pair for parallel execution
    const tasks = [];
    for (const query of currentBatch) {
      for (const platform of platforms) {
        tasks.push(async () => {
          const response = await queryAIPlatform(platform, query, language);
          if (!response) {
            console.log(`No response from ${platform} for query "${query.substring(0, 30)}..."`);
            return { stored: false };
          }
          const extractedSources = extractSourcesFromResponse(response);
          const analysis = await analyzeBrandMention(response, project.brand_name, project.competitors || []);
          if (analysis && extractedSources.length > 0) analysis.sources = extractedSources;
          const queryIntent = classifyQueryIntent(query);
          const enrichedAnalysis = analysis ? { ...analysis, ...queryIntent } : queryIntent;
          await supabase.from('ai_platform_responses').insert({
            project_id: projectId,
            session_id: sessionId,
            platform,
            prompt: query,
            response,
            response_metadata: enrichedAnalysis
          });
          return { stored: true, brandMentioned: analysis?.brand_mentioned };
        });
      }
    }
    
    const results = await runWithConcurrency(tasks);
    const storedCount = results.filter((r) => r?.ok && r?.value?.stored).length;
    const totalMentions = results.filter((r) => r?.ok && r?.value?.brandMentioned).length;
    results.filter((r) => r?.ok === false).forEach((r, i) => console.error(`Task ${i} failed:`, r?.error));
    
    const { data: currentSession } = await supabase.from('brand_analysis_sessions').select('completed_queries, total_queries').eq('id', sessionId).single();
    if (currentSession) {
      const newCompletedQueries = (currentSession.completed_queries || 0) + storedCount;
      await supabase.from('brand_analysis_sessions').update({
        completed_queries: newCompletedQueries
      }).eq('id', sessionId);
      console.log(`Progress updated: ${newCompletedQueries}/${currentSession.total_queries} (stored ${storedCount} in this batch)`);
    }
    // Get final session state after processing this batch
    const { data: finalSessionState } = await supabase.from('brand_analysis_sessions').select('completed_queries, total_queries').eq('id', sessionId).single();
    if (!finalSessionState) {
      throw new Error(`Could not retrieve session state for ${sessionId}`);
    }
    const newCompletedQueries = finalSessionState.completed_queries || 0;
    const totalQueries = finalSessionState.total_queries || 0;
    console.log(`Batch completed: ${newCompletedQueries}/${totalQueries} total queries processed`);
    // Check if we need to process more batches
    const nextBatchStartIndex = batchStartIndex + batchSize;
    const hasMoreQueries = nextBatchStartIndex < queries.length;
    if (hasMoreQueries && newCompletedQueries < totalQueries) {
      const nextBatchSize = 6;
      // Schedule next batch by calling the edge function again
      console.log(`Scheduling next batch starting at index ${nextBatchStartIndex} with ${platforms.length} platforms: ${platforms.join(', ')}, batch size: ${nextBatchSize}`);
      // Use the platforms passed in the request for continuation batches
      const platformsToUse = [
        ...platforms
      ];
      console.log(`Platforms being passed to next batch: ${platformsToUse.join(', ')}`);
      // Call ourselves again for the next batch (this creates a new execution context)
      fetchWithRetry(`${Deno.env.get('SUPABASE_URL')}/functions/v1/brand-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          platforms: platformsToUse,
          sessionId,
          queries,
          batchStartIndex: nextBatchStartIndex,
          batchSize: nextBatchSize,
          continueProcessing: true,
          platformsCount: platformsToUse.length, // Add explicit count for debugging
          language: language // Pass language to next batch
        })
      }).catch((error)=>{
        console.error('Error scheduling next batch:', error);
      });
    } else {
      // All queries processed, mark session as complete
      console.log('All batches completed, finalizing session');
      // Analyze cross-platform comparison
      const { data: allResponses } = await supabase.from('ai_platform_responses').select('*').eq('session_id', sessionId);
      
      // CRITICAL FIX: Count total mentions from ALL responses in the database, not just this batch
      // The local `totalMentions` variable only counts the current batch, not all batches
      const actualTotalMentions = (allResponses || []).filter(
        (r: any) => r.response_metadata && r.response_metadata.brand_mentioned === true
      ).length;
      
      console.log(`📊 Final stats: ${actualTotalMentions} total mentions from ${(allResponses || []).length} responses`);
      
      // Calculate average sentiment from all responses with brand mentions
      const responsesWithSentiment = (allResponses || []).filter(
        r => r.response_metadata?.brand_mentioned && r.response_metadata?.sentiment_score !== null && r.response_metadata?.sentiment_score !== undefined
      );
      const avgSentiment = responsesWithSentiment.length > 0
        ? responsesWithSentiment.reduce((sum, r) => sum + (r.response_metadata?.sentiment_score || 0), 0) / responsesWithSentiment.length
        : 0;
      
      console.log(`📊 Average sentiment: ${Math.round(avgSentiment * 100)}% from ${responsesWithSentiment.length} responses`);
      
      // Keep session as "running" - competitor-analysis-engine will mark it "completed"
      await supabase.from('brand_analysis_sessions').update({
        completed_queries: newCompletedQueries,
        results_summary: {
          total_queries: totalQueries,
          successful_queries: newCompletedQueries,
          total_mentions: actualTotalMentions,
          mention_rate: newCompletedQueries > 0 ? actualTotalMentions / newCompletedQueries : 0,
          avg_sentiment: Math.round(avgSentiment * 100), // Store as percentage
          platforms_analyzed: platforms,
          brand_analysis_completed_at: new Date().toISOString()
        }
      }).eq('id', sessionId);
      
      console.log(`Brand analysis queries completed for session: ${sessionId}, starting competitor analysis...`);
      
      // Run competitor analysis engine - it will mark session as "completed" when done
      try {
        console.log(`🔍 Starting competitor analysis for session: ${sessionId}`);
        const competitorResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/competitor-analysis-engine`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'full-analysis',
            sessionId: sessionId,
            projectId: projectId,
            brandName: project.brand_name,
            competitors: project.competitors || []
          })
        });
        
        if (competitorResponse.ok) {
          console.log(`✅ Competitor analysis completed for session: ${sessionId}`);
        } else {
          console.error(`❌ Competitor analysis failed: ${competitorResponse.status}`);
          // If competitor analysis fails, mark session as completed anyway
          await supabase.from('brand_analysis_sessions').update({
            status: 'completed',
          completed_at: new Date().toISOString()
          }).eq('id', sessionId);
          await supabase.from('brand_analysis_projects').update({
            last_analysis_at: new Date().toISOString()
          }).eq('id', projectId);
        }
        await recordRunHistory(supabase, projectId, sessionId);
      } catch (competitorError) {
        console.error('Error running competitor analysis:', competitorError);
        // If competitor analysis fails, mark session as completed anyway
        await supabase.from('brand_analysis_sessions').update({
          status: 'completed',
          completed_at: new Date().toISOString()
      }).eq('id', sessionId);
      await supabase.from('brand_analysis_projects').update({
        last_analysis_at: new Date().toISOString()
      }).eq('id', projectId);
      await recordRunHistory(supabase, projectId, sessionId);
      }
    }
    return {
      success: true,
      processedQueries: storedCount,
      totalMentions,
      hasMoreQueries,
      nextBatchStartIndex: hasMoreQueries ? nextBatchStartIndex : -1
    };
  } catch (error) {
    console.error('Batch processing failed:', error);
    // Update session with error status
    await supabase.from('brand_analysis_sessions').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      results_summary: {
        error: error.message,
        failed_at: new Date().toISOString()
      }
    }).eq('id', sessionId);
    throw error;
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { projectId, platforms = [
      'chatgpt',
      'claude',
      'gemini',
      'perplexity',
      'groq'
    ], sessionId, queries, batchStartIndex = 0, batchSize = 6, continueProcessing = false, language, action, languages: bodyLanguages, countries: bodyCountries, rerunQueries } = body;
    
    // Handle resume action
    if (action === 'resume' && sessionId) {
      console.log(`🔄 Resuming analysis for session: ${sessionId}`);
      
      // Get session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('brand_analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError || !sessionData) {
        throw new Error(`Failed to fetch session: ${sessionError?.message}`);
      }
      
      // Get project data
      const { data: projectData, error: projectError } = await supabase
        .from('brand_analysis_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projectError || !projectData) {
        throw new Error(`Failed to fetch project: ${projectError?.message}`);
      }
      
      // Get already processed query indices
      const { data: existingResponses, error: responsesError } = await supabase
        .from('ai_platform_responses')
        .select('query')
        .eq('session_id', sessionId);
      
      const processedQueries = new Set((existingResponses || []).map(r => r.query));
      const allQueries = sessionData.queries || [];
      
      // Find remaining queries that haven't been processed
      const remainingQueries = allQueries.filter((q: string) => !processedQueries.has(q));
      
      console.log(`📊 Total queries: ${allQueries.length}, Already processed: ${processedQueries.size}, Remaining: ${remainingQueries.length}`);
      
      if (remainingQueries.length === 0) {
        // All queries already processed, mark as completed
        await supabase
          .from('brand_analysis_sessions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', sessionId);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'All queries already processed',
          completed: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Resume processing with remaining queries, using the project's configured language
      const platformsToUse = projectData.active_platforms || platforms;
      const resumeLanguages = projectData.analysis_languages || [];
      const resumeLang = resumeLanguages.length > 0
        ? resumeLanguages[0].toLowerCase().split('-')[0]
        : (language || 'en');
      const result = await processBatchOfQueries(
        projectId,
        platformsToUse,
        sessionId,
        remainingQueries,
        0,
        6,
        resumeLang
      );
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Analysis resumed successfully',
        remaining_queries: remainingQueries.length,
        ...result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get language preference: from request body, or from cookies as fallback
    let preferredLanguage: string = language || "en";
    if (!language) {
      // Try to get from cookies
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
          const [key, value] = cookie.split("=");
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        const cookieLanguage = cookies["preferred-language"];
        if (cookieLanguage && /^[a-z]{2}(-[A-Z]{2})?$/.test(cookieLanguage)) {
          preferredLanguage = cookieLanguage;
        }
      }
    }
    if (!projectId) {
      return new Response(JSON.stringify({
        error: 'Project ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Handle batch continuation requests
    if (continueProcessing && sessionId && queries) {
      console.log(`Continuing batch processing for session: ${sessionId}, batch index: ${batchStartIndex}`);
      console.log(`Requested platforms: ${platforms.length > 0 ? platforms.join(', ') : 'none'}`);
      console.log(`Platform count from request: ${body.platformsCount || 'not specified'}`);
      // Ensure we have platforms to process
      if (!platforms || platforms.length === 0) {
        return new Response(JSON.stringify({
          error: 'No platforms specified for batch continuation',
          success: false
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      try {
        // Ensure we're using all the platforms that were passed in
        const platformsToUse = [
          ...platforms
        ]; // Create a copy to ensure we don't modify the original
        console.log(`Processing batch with ${platformsToUse.length} platforms: ${platformsToUse.join(', ')}`);
        const result = await processBatchOfQueries(projectId, platformsToUse, sessionId, queries, batchStartIndex, batchSize, preferredLanguage);
        return new Response(JSON.stringify({
          success: true,
          message: 'Batch processed successfully',
          platforms_used: platformsToUse,
          platforms_count: platformsToUse.length,
          ...result
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Batch processing failed:', error);
        return new Response(JSON.stringify({
          error: error.message,
          success: false
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Handle initial analysis requests
    console.log('Starting brand analysis for project:', projectId, 'platforms:', platforms);
    // Get project details first
    const { data: project, error: projectError } = await supabase.from('brand_analysis_projects').select('*').eq('id', projectId).single();
    if (projectError || !project) {
      return new Response(JSON.stringify({
        error: `Project not found: ${projectError?.message}`,
        success: false
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const analysisLanguages = Array.isArray(bodyLanguages) && bodyLanguages.length > 0 ? bodyLanguages : (project.analysis_languages || []);
    const analysisCountries = Array.isArray(bodyCountries) && bodyCountries.length > 0 ? bodyCountries : (project.analysis_countries || []);
    // For query generation: use first selected analysis language when set; otherwise default to English (never Hebrew or other)
    if (analysisLanguages.length > 0) {
      preferredLanguage = analysisLanguages[0].toLowerCase().split('-')[0];
    } else {
      preferredLanguage = 'en';
    }
    // Use platforms from request first (user's current selection), fallback to database if none provided
    let platformsToAnalyze = platforms && platforms.length > 0 ? platforms : project.active_platforms && Array.isArray(project.active_platforms) && project.active_platforms.length > 0 ? project.active_platforms : [
      'chatgpt',
      'claude',
      'gemini',
      'perplexity',
      'groq'
    ];
    console.log(`Request platforms: ${platforms ? platforms.join(', ') : 'none'}`);
    console.log(`Database platforms: ${project.active_platforms ? project.active_platforms.join(', ') : 'none'}`);
    console.log(`Final platforms to analyze: ${platformsToAnalyze.join(', ')}`);
    
    // ════════════════════════════════════════════════════════════════════════
    // PARALLEL EXECUTION: Website Crawler + Google Search Console
    // ════════════════════════════════════════════════════════════════════════
    
    console.log('⚡ Starting parallel actions: Website Crawler + GSC');
    const websiteUrl = project.website_url;
    
    const [crawlerResult, gscResult] = await Promise.allSettled([
      // Action 1: Website Crawler (existing)
      websiteUrl ? (async () => {
        console.log(`Fetching website content for ${websiteUrl}`);
        const websiteContent = await fetchWebsiteContent(websiteUrl);
        if (websiteContent) {
          console.log(`Successfully fetched website content (${websiteContent.length} bytes)`);
          // Analyze content
          try {
            const analyzeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-content`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: websiteUrl,
                html: websiteContent
              })
            });
            if (analyzeResponse.ok) {
              const analysisResult = await analyzeResponse.json();
              console.log('Website analysis completed successfully');
              await supabase.from('brand_analysis_website_analysis').insert({
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
        return websiteContent;
      })() : Promise.resolve(null),
      
      // Action 2: Google Search Console (NEW)
      fetchGSCKeywords(project),
    ]);
    
    // Handle crawler result
    if (crawlerResult.status === 'fulfilled') {
      console.log('✅ Crawler completed');
    } else {
      console.error('❌ Crawler failed:', crawlerResult.reason);
    }
    
    // Handle GSC result
    let gscKeywords: string[] = [];
    if (gscResult.status === 'fulfilled') {
      gscKeywords = gscResult.value;
      console.log(`✅ GSC completed: ${gscKeywords.length} keywords fetched`);
    } else {
      console.log('⚠️ GSC skipped or failed:', gscResult.reason);
    }
    // Load API keys
    const openAIApiKey = await getApiKey('openai');
    const claudeApiKey = await getApiKey('claude');
    const geminiApiKey = await getApiKey('gemini');
    const perplexityApiKey = await getApiKey('perplexity');
    const groqApiKey = await getApiKey('groq');
    
    // Check available platforms
    const apiKeysAvailable = {
      chatgpt: !!openAIApiKey,
      claude: !!claudeApiKey,
      gemini: !!geminiApiKey,
      perplexity: !!perplexityApiKey,
      groq: !!groqApiKey
    };
    console.log('Available API keys:', Object.entries(apiKeysAvailable).filter(([_, available])=>available).map(([platform])=>platform));
    console.log('Platforms to analyze:', platformsToAnalyze);
    // Filter platforms based on available API keys
    let availablePlatforms = platformsToAnalyze.filter((platform)=>{
      const isAvailable = platform === 'chatgpt' && apiKeysAvailable.chatgpt || platform === 'claude' && apiKeysAvailable.claude || platform === 'gemini' && apiKeysAvailable.gemini || platform === 'perplexity' && apiKeysAvailable.perplexity || platform === 'groq' && apiKeysAvailable.groq;
      if (!isAvailable) {
        console.log(`Platform ${platform} is not available (no API key)`);
      }
      return isAvailable;
    });
    console.log('Filtered available platforms:', availablePlatforms);
    // If no platforms are available from the requested ones, show clear error
    if (availablePlatforms.length === 0) {
      const missingKeys = platformsToAnalyze.filter((platform)=>!apiKeysAvailable[platform]).map((platform)=>platform.toUpperCase());
      console.log('No requested platforms are available - missing API keys for:', missingKeys.join(', '));
      return new Response(JSON.stringify({
        error: `Analysis failed: Missing API keys for selected platforms: ${missingKeys.join(', ')}. Please configure the API keys or select different platforms.`,
        success: false,
        missing_api_keys: missingKeys,
        requested_platforms: platformsToAnalyze,
        available_platforms: Object.entries(apiKeysAvailable).filter(([_, available])=>available).map(([platform])=>platform)
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Prevent duplicate running sessions: one running analysis per project at a time
    const { data: existingRunningList } = await supabase
      .from('brand_analysis_sessions')
      .select('id, status')
      .eq('project_id', projectId)
      .in('status', ['running', 'pending'])
      .limit(1);
    const existingRunning = existingRunningList?.[0];
    if (existingRunning) {
      return new Response(JSON.stringify({
        success: true,
        alreadyRunning: true,
        sessionId: existingRunning.id,
        message: 'Analysis already running for this project. Wait for it to finish or stop it before starting another.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // MERGE KEYWORDS: Manual + GSC
    // ════════════════════════════════════════════════════════════════════════
    
    const manualKeywords = project.target_keywords || [];
    const allKeywords = [...new Set([...manualKeywords, ...gscKeywords])]; // Remove duplicates
    
    console.log(`📊 Keyword Summary:`);
    console.log(`   Manual: ${manualKeywords.length}`);
    console.log(`   GSC: ${gscKeywords.length}`);
    console.log(`   Total (merged): ${allKeywords.length}`);
    
    // Build query list: use rerunQueries if provided (scheduled re-run), otherwise generate/select
    const preferredLangForQueries = analysisLanguages.length > 0
      ? (analysisLanguages[0].toLowerCase().startsWith('he') ? 'he' : analysisLanguages[0].split('-')[0].toLowerCase() || 'en')
      : 'en';
    let selectedQueriesForRun: string[];
    if (Array.isArray(rerunQueries) && rerunQueries.length > 0) {
      selectedQueriesForRun = rerunQueries;
      console.log(`♻️ Re-run mode: using ${selectedQueriesForRun.length} queries from previous session`);
    } else {
      selectedQueriesForRun = await getQueriesForAnalysis(project, preferredLangForQueries, analysisLanguages, analysisCountries, allKeywords);
    }
    const totalQueries = availablePlatforms.length * selectedQueriesForRun.length;
    console.log(`Query mode: ${rerunQueries ? 'rerun' : (project.query_mode || 'auto')}, ${selectedQueriesForRun.length} queries, ${availablePlatforms.length} platforms, ${totalQueries} total runs`);
    const sessionLabel = rerunQueries ? 'Scheduled Re-run' : 'AI-Generated Queries Analysis';
    const { data: session, error: sessionError } = await supabase.from('brand_analysis_sessions').insert({
      project_id: projectId,
      session_name: `${sessionLabel} ${new Date().toLocaleDateString()}`,
      status: 'running',
      started_at: new Date().toISOString(),
      total_queries: totalQueries
    }).select().single();
    if (sessionError) {
      return new Response(JSON.stringify({
        error: `Failed to create session: ${sessionError.message}`,
        success: false
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Start the first batch immediately
    try {
      console.log(`Starting first batch with ${availablePlatforms.length} platforms: ${availablePlatforms.join(', ')}`);
      // Ensure we're using all available platforms
      if (availablePlatforms.length === 0) {
        throw new Error('No platforms available for analysis');
      }
      // Make a copy of the platforms array to ensure we don't modify it
      const platformsToUse = [
        ...availablePlatforms
      ];
      console.log(`Platforms being used for first batch: ${platformsToUse.join(', ')}`);
      // Do NOT overwrite user's selected active_platforms; keep user's selection intact
      await processBatchOfQueries(projectId, platformsToUse, session.id, selectedQueriesForRun, 0, 6, preferredLanguage);
      // Return immediately with session info
      return new Response(JSON.stringify({
        success: true,
        session_id: session.id,
        message: 'Analysis started in background with batch processing',
        platforms_analyzed: platformsToUse,
        platforms_count: platformsToUse.length,
        total_queries: totalQueries,
        estimated_completion: new Date(Date.now() + totalQueries * 1000).toISOString() // Rough estimate
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error starting first batch:', error);
      // Mark session as failed
      await supabase.from('brand_analysis_sessions').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        results_summary: {
          error: error.message,
          failed_at: new Date().toISOString()
        }
      }).eq('id', session.id);
      throw error;
    }
  } catch (error) {
    console.error('Brand analysis initialization failed:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});