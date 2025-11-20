import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
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
async function queryAIPlatform(platform, prompt) {
  try {
    console.log(`Querying ${platform} with prompt: ${prompt.substring(0, 50)}...`);
    // Get API key from cache or load it
    let apiKey = apiKeyCache[platform];
    if (!apiKey) {
      apiKey = await getApiKey(platform === 'chatgpt' ? 'openai' : platform);
      apiKeyCache[platform] = apiKey;
    }
    if (platform === 'chatgpt' && apiKey) {
      try {
        const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.'
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
            model: 'claude-3-haiku-20240307',
            max_tokens: 4000,
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
        // Try gemini-1.5-pro first
        let response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
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
        // If that fails, try gemini-pro
        if (!response.ok) {
          console.log('Gemini 1.5 Pro failed, trying gemini-pro...');
          response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt
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
        // Use 'sonar' - the official model from Perplexity docs
        let response = await fetchWithRetry('https://api.perplexity.ai/chat/completions', {
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
                content: 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.'
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
        // If that fails, try sonar-small-online
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
                  content: 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.'
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
                  content: 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.'
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
                content: 'You are a helpful business research assistant. Provide detailed, factual responses about companies and brands.'
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
  // Enhanced brand detection - check for variations and partial matches
  const brandVariations = [
    lowerBrandName,
    lowerBrandName.replace(/\s+/g, ''),
    lowerBrandName.replace(/[^\w\s]/g, ''),
    ...lowerBrandName.split(' ') // Individual words
  ].filter((v)=>v.length > 2); // Only consider variations longer than 2 characters
  const brandMentioned = brandVariations.some((variation)=>lowerResponse.includes(variation));
  // Find competitor mentions with more context
  const competitorsFound = [];
  const competitorContexts = {};
  if (competitors && competitors.length > 0) {
    for (const competitor of competitors){
      const lowerCompetitor = competitor.toLowerCase();
      // Enhanced competitor detection - check for variations
      const competitorVariations = [
        lowerCompetitor,
        lowerCompetitor.replace(/\s+/g, ''),
        lowerCompetitor.replace(/[^\w\s]/g, ''),
        ...lowerCompetitor.split(' ') // Individual words
      ].filter((v)=>v.length > 2);
      const competitorMentioned = competitorVariations.some((variation)=>lowerResponse.includes(variation));
      if (competitorMentioned) {
        competitorsFound.push(competitor);
        // Find context for competitor mentions
        const sentences = response.split(/[.!?]+/).filter((s)=>s.trim().length > 0);
        const competitorSentences = sentences.filter((s)=>competitorVariations.some((variation)=>s.toLowerCase().includes(variation)));
        if (competitorSentences.length > 0) {
          // Detect comparison language
          const directComparisonSentences = competitorSentences.filter((s)=>brandVariations.some((brandVar)=>s.toLowerCase().includes(brandVar)) && (s.toLowerCase().includes(' vs ') || s.toLowerCase().includes(' versus ') || s.toLowerCase().includes(' compared to ') || s.toLowerCase().includes(' better than ') || s.toLowerCase().includes(' worse than ') || s.toLowerCase().includes(' similar to ') || s.toLowerCase().includes(' like ') || s.toLowerCase().includes(' alternative to ') || s.toLowerCase().includes(' include ') || s.toLowerCase().includes(' such as ') || s.toLowerCase().includes(' along with ') || s.toLowerCase().includes(' alongside ')));
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
              const competitorIndex = competitorVariations.map((v)=>sentence.indexOf(v)).find((i)=>i !== -1) || -1;
              // Check if positive word is near competitor mention (within 10 words)
              return wordIndex !== -1 && competitorIndex !== -1 && Math.abs(wordIndex - competitorIndex) < 50;
            }));
          const competitorNegative = negativeWords.some((word)=>competitorSentences.some((s)=>{
              const sentence = s.toLowerCase();
              const wordIndex = sentence.indexOf(word);
              const competitorIndex = competitorVariations.map((v)=>sentence.indexOf(v)).find((i)=>i !== -1) || -1;
              return wordIndex !== -1 && competitorIndex !== -1 && Math.abs(wordIndex - competitorIndex) < 50;
            }));
          // Determine if competitor is positioned as better or worse than the brand
          let comparisonResult = 'neutral';
          if (directComparisonSentences.length > 0) {
            const comparisonSentence = directComparisonSentences[0].toLowerCase();
            const brandIndex = brandVariations.map((v)=>comparisonSentence.indexOf(v)).find((i)=>i !== -1) || -1;
            const competitorIndex = competitorVariations.map((v)=>comparisonSentence.indexOf(v)).find((i)=>i !== -1) || -1;
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
            position: sentences.findIndex((s)=>competitorVariations.some((v)=>s.toLowerCase().includes(v))) + 1,
            mentioned_with_brand: competitorSentences.some((s)=>brandVariations.some((v)=>s.toLowerCase().includes(v))),
            direct_comparison: directComparisonSentences.length > 0,
            comparison_result: comparisonResult,
            sentiment: competitorPositive && !competitorNegative ? 'positive' : competitorNegative && !competitorPositive ? 'negative' : 'mixed',
            all_contexts: competitorSentences.map((s)=>s.trim()).slice(0, 3),
            in_ranking_list: isInList,
            ranking_position: isInList ? sentences.findIndex((s)=>competitorVariations.some((v)=>s.toLowerCase().includes(v))) + 1 : null
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
    if (brandVariations.some((variation)=>sentences[i].toLowerCase().includes(variation))) {
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
  const featureMentions = sentences.filter((s)=>brandVariations.some((variation)=>s.toLowerCase().includes(variation)) && featureKeywords.some((keyword)=>s.toLowerCase().includes(keyword))).map((s)=>s.trim()).slice(0, 3); // Up to 3 feature mentions
  return {
    brand_mentioned: brandMentioned,
    mention_position: mentionPosition,
    sentiment_score: sentimentScore,
    competitors_found: competitorsFound,
    competitor_contexts: competitorContexts,
    mention_context: mentionContext,
    all_brand_mentions: allBrandMentions.slice(0, 5),
    feature_mentions: featureMentions,
    total_brand_mentions: allBrandMentions.length,
    total_competitor_mentions: competitorsFound.reduce((acc, comp)=>acc + (competitorContexts[comp]?.mentions || 0), 0),
    comparative_analysis: competitorsFound.length > 0 && brandMentioned,
    query_relevance: queryRelevance,
    brand_variations_detected: brandVariations.filter((v)=>lowerResponse.includes(v)),
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
async function generateRealisticUserQueries(brandName, industry, keywords = [], competitors = [], websiteUrl = '') {
  const openAIApiKey = await getApiKey('openai');
  if (!openAIApiKey) {
    console.log('No OpenAI API key available for query generation, using fallback queries');
    return generateFallbackQueries(brandName, industry, keywords, competitors);
  }
  try {
    console.log(`Generating realistic user queries for ${brandName} in ${industry}`);
    // Fetch website content if URL is provided
    let websiteContent = '';
    if (websiteUrl) {
      websiteContent = await fetchWebsiteContent(websiteUrl);
    }
    const keywordContext = keywords.length > 0 ? `Key features/keywords: ${keywords.join(', ')}` : '';
    const competitorContext = competitors.length > 0 ? `Main competitors: ${competitors.join(', ')}` : '';
    const websiteContext = websiteContent ? `Website content summary: ${websiteContent}` : '';
    const prompt = `Generate 50 realistic, conversational search queries that real users would type when looking for solutions like ${brandName} offers. These should sound like natural human messages, NOT direct brand mentions.

Brand context: ${brandName} (${industry})
${keywordContext}
${competitorContext}
${websiteContext}

Based on the brand's industry, website content, and keywords, generate highly relevant search queries that potential customers would actually use. Make sure all queries are directly relevant to what this brand offers.

Generate queries in these categories around the given brand, and industry, which could be actually/potentially searched by some real actual users.
1. General product searches (8 queries) like for a management tool brand, those could be "What are the best project management software options?" or "Top CRM tools in 2024."
2. Problem-solving searches (8 queries), like for a management tool brand, those could be "How can I better manage my team's projects?" or "What's a good solution for customer tracking?"
3. Comparison searches (8 queries), like for a management tool brand, those could be "What's the difference between project management and task management?" or "Free vs paid CRM - is it worth upgrading?"
4. Feature-specific searches (8 queries), like for a management tool brand, those could be "Software with built-in time tracking features." or "CRM with email integration capabilities."
5. Use case searches (8 queries), like for a management tool brand, those could be "Project management solutions for small teams." or "CRM systems designed for startups."
6. Alternative searches (5 queries), like for a management tool brand, those could be "What are some alternatives to expensive project management software?" or "Open source project management tools worth trying."
7. Review/recommendation related searches (5 queries), like for a management tool brand, those could be "What are the best-rated project management tools?" or "Recommended CRM software for small businesses."

- Queries should be 1-3 sentences long
- Format each query as a proper sentence or question with capitalization and punctuation
- Make the queries conversational, as if asking a real person or AI assistant
- Use natural language that real users would type
- Include variations with years (2024, 2025) but just in 3-4 queries
- Include budget-conscious queries ("free", "cheap", "affordable") in few queries
- Include business size variations ("small business", "enterprise", "startup") if applies, but in few queries
- NO direct brand mentions
- Focus on problems users are trying to solve
- Include both formal and casual language styles
- ENSURE all queries are directly relevant to the brand's actual products/services
- Use language and terms found on the brand's website when possible

IMPORTANT: Return EXACTLY 50 queries in a valid JSON array format. No markdown formatting, no backticks, just a clean JSON array of strings.`;
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
            content: 'You are an expert in user search behavior and query generation. Generate realistic, conversational search queries that real users would type into search engines or AI assistants. Always format queries as proper sentences or questions with appropriate capitalization and punctuation. You always return properly formatted JSON arrays without any markdown formatting or explanation.'
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
          // Ensure first letter is capitalized
          let formattedQuery = query.trim();
          if (formattedQuery.length > 0) {
            formattedQuery = formattedQuery.charAt(0).toUpperCase() + formattedQuery.slice(1);
          }
          // Ensure query ends with punctuation
          if (!/[.?!]$/.test(formattedQuery)) {
            // If it's a question (contains question words or has question-like structure), add question mark
            if (/\b(what|how|why|where|when|which|who|can|should|will|is|are|do|does|did)\b/i.test(formattedQuery) && !formattedQuery.includes('?')) {
              formattedQuery += '?';
            } else {
              // Otherwise add period
              formattedQuery += '.';
            }
          }
          return formattedQuery;
        });
        // Ensure we have at least 50 queries by duplicating and modifying if needed
        if (formattedQueries.length < 50) {
          console.log(`Only generated ${formattedQueries.length} queries, adding variations to reach 50`);
          // Create variations by adding year or modifiers
          const years = [
            new Date().getFullYear(),
            new Date().getFullYear() + 1
          ];
          const modifiers = [
            'Best',
            'Top',
            'Affordable',
            'Recommended',
            'Popular'
          ];
          while(formattedQueries.length < 50){
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
            // Avoid infinite loop if we can't add more variations
            if (formattedQueries.length >= 95) break;
          }
        }
        return formattedQueries.slice(0, 50); // Ensure we don't exceed 50 queries
      } else {
        console.error('Generated content is not a valid array:', cleanedContent);
        throw new Error('Generated content is not a valid array');
      }
    } catch (parseError) {
      console.error('Failed to parse generated queries:', parseError, 'Content:', generatedContent);
      return generateFallbackQueries(brandName, industry, keywords, competitors);
    }
  } catch (error) {
    console.error('Query generation failed:', error);
    return generateFallbackQueries(brandName, industry, keywords, competitors);
  }
}
function generateFallbackQueries(brandName, industry, keywords = [], competitors = []) {
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
  if (baseQueries.length > 50) {
    return baseQueries.slice(0, 50);
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
    // Create a new query with the modifier
    queries.push(`${modifier} ${originalQuery.charAt(0).toLowerCase() + originalQuery.slice(1)}`);
    // Avoid infinite loop
    if (queries.length >= 95) break;
  }
  return queries.slice(0, 50);
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
], existingSessionId) {
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
    // Generate realistic user queries using AI
    const realisticQueries = await generateRealisticUserQueries(project.brand_name, project.industry, project.target_keywords || [], project.competitors || [], project.website_url || '');
    console.log(`Generated ${realisticQueries.length} realistic user queries for analysis`);
    // Log some sample queries for debugging
    console.log("Sample queries:", realisticQueries.slice(0, 5));
    // Use all generated queries for each platform
    const selectedQueries = realisticQueries;
    console.log(`Using all ${selectedQueries.length} queries for analysis across each platform`);
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
            const response = await queryAIPlatform(platform, query);
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
              // Store the response with metadata
              await supabase.from('ai_platform_responses').insert({
                project_id: projectId,
                session_id: session.id,
                platform: platform,
                prompt: query,
                response: response,
                response_metadata: analysis
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
    // Update session completion with cross-platform analysis
    await supabase.from('brand_analysis_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_queries: completedQueries,
      results_summary: {
        total_queries: totalQueries,
        successful_queries: completedQueries,
        total_mentions: totalMentions,
        mention_rate: completedQueries > 0 ? totalMentions / completedQueries : 0,
        platforms_analyzed: workingPlatforms,
        failed_platforms: failedPlatforms,
        platform_comparison: platformComparison
      }
    }).eq('id', session.id);
    // Update project last analysis timestamp
    await supabase.from('brand_analysis_projects').update({
      last_analysis_at: new Date().toISOString()
    }).eq('id', projectId);
    console.log(`Analysis completed: ${completedQueries}/${totalQueries} queries successful, ${totalMentions} mentions found`);
    console.log(`Working platforms: ${workingPlatforms.join(', ')}`);
    if (failedPlatforms.length > 0) {
      console.log(`Failed platforms: ${failedPlatforms.join(', ')}`);
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
async function processAnalysisInBackground(projectId, platforms, sessionId) {
  try {
    console.log(`Starting background processing for session: ${sessionId}`);
    await runEnhancedBrandAnalysis(projectId, platforms, sessionId);
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
// Process a small batch of queries to avoid timeout
async function processBatchOfQueries(projectId, platforms, sessionId, queries, batchStartIndex = 0, batchSize = 3 // Reduced default batch size from 5 to 3
) {
  try {
    console.log(`Processing batch starting at index ${batchStartIndex} for session: ${sessionId}`);
    // Get project details
    const { data: project, error: projectError } = await supabase.from('brand_analysis_projects').select('*').eq('id', projectId).single();
    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }
    // Get the current batch of queries
    const currentBatch = queries.slice(batchStartIndex, batchStartIndex + batchSize);
    console.log(`Processing ${currentBatch.length} queries for ${platforms.length} platforms`);
    let processedQueries = 0;
    let totalMentions = 0;
    // Process each query in the batch
    for (const query of currentBatch){
      console.log(`Processing query: "${query.substring(0, 30)}..." across all platforms`);
      // Process this query across all platforms before moving to the next query
      for (const platform of platforms){
        try {
          const response = await queryAIPlatform(platform, query);
          if (response) {
            console.log(`Got response from ${platform} for query "${query.substring(0, 30)}..."`);
            // Extract sources from the response
            const extractedSources = extractSourcesFromResponse(response);
            // Analyze the response for brand mentions
            const analysis = await analyzeBrandMention(response, project.brand_name, project.competitors || []);
            // Add sources to the analysis if they exist
            if (analysis && extractedSources.length > 0) {
              analysis.sources = extractedSources;
            }
            if (analysis?.brand_mentioned) {
              totalMentions++;
              console.log(`✓ Brand mentioned in ${platform} response to: "${query}"`);
            }
            // Store the response with metadata
            await supabase.from('ai_platform_responses').insert({
              project_id: projectId,
              session_id: sessionId,
              platform: platform,
              prompt: query,
              response: response,
              response_metadata: analysis
            });
            processedQueries++;
          } else {
            console.log(`No response received from ${platform} for query: "${query}"`);
          }
        } catch (error) {
          console.error(`Error processing query "${query}" for ${platform}:`, error);
        // Continue with next platform
        }
        // Small delay between requests to avoid rate limiting
        // Use a longer delay for the first few batches to ensure they complete quickly
        const delayTime = batchStartIndex < 5 ? 500 : 300;
        await new Promise((resolve)=>setTimeout(resolve, delayTime));
      }
      // Update progress after each query is processed across all platforms
      const { data: currentSession } = await supabase.from('brand_analysis_sessions').select('completed_queries, total_queries').eq('id', sessionId).single();
      if (currentSession) {
        const queriesProcessed = platforms.length; // Each query is processed across all platforms
        const newCompletedQueries = (currentSession.completed_queries || 0) + queriesProcessed;
        await supabase.from('brand_analysis_sessions').update({
          completed_queries: newCompletedQueries
        }).eq('id', sessionId);
        console.log(`Progress updated: ${newCompletedQueries}/${currentSession.total_queries} queries processed`);
      }
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
      // Calculate adaptive batch size - start small and increase gradually
      // First batch: 1 query, second batch: 2 queries, then 3 queries (max)
      let nextBatchSize = 3; // Default max batch size
      if (batchStartIndex === 0) {
        // We just finished the first batch (which was very small)
        nextBatchSize = 1; // Process just 1 query in the second batch
      } else if (batchStartIndex <= 3) {
        // For the next few batches, keep it small
        nextBatchSize = 2;
      }
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
          platformsCount: platformsToUse.length // Add explicit count for debugging
        })
      }).catch((error)=>{
        console.error('Error scheduling next batch:', error);
      });
    } else {
      // All queries processed, mark session as complete
      console.log('All batches completed, finalizing session');
      // Analyze cross-platform comparison
      const { data: allResponses } = await supabase.from('ai_platform_responses').select('*').eq('session_id', sessionId);
      await supabase.from('brand_analysis_sessions').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_queries: newCompletedQueries,
        results_summary: {
          total_queries: totalQueries,
          successful_queries: newCompletedQueries,
          total_mentions: totalMentions,
          mention_rate: newCompletedQueries > 0 ? totalMentions / newCompletedQueries : 0,
          platforms_analyzed: platforms,
          completed_at: new Date().toISOString()
        }
      }).eq('id', sessionId);
      // Update project last analysis timestamp
      await supabase.from('brand_analysis_projects').update({
        last_analysis_at: new Date().toISOString()
      }).eq('id', projectId);
      console.log(`Analysis fully completed for session: ${sessionId}`);
    }
    return {
      success: true,
      processedQueries,
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
    ], sessionId, queries, batchStartIndex = 0, batchSize = 3, continueProcessing = false } = body;
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
        const result = await processBatchOfQueries(projectId, platformsToUse, sessionId, queries, batchStartIndex, batchSize);
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
        }
      } catch (error) {
        console.error(`Error fetching website content: ${error.message}`);
      // Continue with the analysis even if website content fetch fails
      }
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
    // Create analysis session immediately
    const totalQueries = availablePlatforms.length * 50; // Assuming 50 queries per platform
    const { data: session, error: sessionError } = await supabase.from('brand_analysis_sessions').insert({
      project_id: projectId,
      session_name: `AI-Generated Queries Analysis ${new Date().toLocaleDateString()}`,
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
    // Generate realistic user queries using AI
    const realisticQueries = await generateRealisticUserQueries(project.brand_name, project.industry, project.target_keywords || [], project.competitors || [], project.website_url || '');
    console.log(`Generated ${realisticQueries.length} realistic user queries for analysis`);
    // Start the first batch immediately (this will chain to subsequent batches)
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
      // Use a very small initial batch size (2 queries) to ensure the first batch completes quickly
      // Subsequent batches will use the default batch size defined in the function (3)
      await processBatchOfQueries(projectId, platformsToUse, session.id, realisticQueries, 0, 2);
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