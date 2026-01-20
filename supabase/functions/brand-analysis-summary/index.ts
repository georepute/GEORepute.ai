import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY') || Deno.env.get('admin_perplexity_key');

function extractDomain(url: string): string | null {
  try { return new URL(url).origin; } catch { return null; }
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { 
      ...opts, 
      signal: controller.signal, 
      headers: { 
        'user-agent': 'Mozilla/5.0', 
        ...(opts.headers || {}) 
      } 
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function getSiteMetadata(url: string) {
  const res = await fetchWithTimeout(url);
  const html = await res.text();

  const getMatch = (regex: RegExp) => {
    const m = regex.exec(html);
    return m ? m[1].trim() : null;
  };

  const title =
    getMatch(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    getMatch(/<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    getMatch(/<title[^>]*>([^<]+)<\/title>/i);

  const description =
    getMatch(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    getMatch(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    getMatch(/<meta[^>]+name=["']twitter:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);

  let icon: string | null = null;
  const iconMatch = /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon[^"']*)["'][^>]*href=["']([^"']+)["'][^>]*>/i.exec(html);
  if (iconMatch) {
    const href = iconMatch[1];
    icon = href.startsWith('http') ? href : new URL(href, extractDomain(url) || url).toString();
  } else {
    try {
      icon = new URL('/favicon.ico', extractDomain(url) || url).toString();
    } catch {
      icon = null;
    }
  }

  return { title, description, icon };
}

async function searchBrandInformation(brandName: string, website: string, industry?: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    console.warn('PERPLEXITY_API_KEY not available, skipping web search');
    return '';
  }

  try {
    const searchQuery = `Provide comprehensive, accurate, and up-to-date information about ${brandName}${website ? ` (${website})` : ''}${industry ? `, a company in the ${industry} industry` : ''}. Include: company overview, founded year, headquarters location, company size, revenue/valuation, key markets, main competitors, key partnerships, recent achievements, key executives, mission statement, values and culture, target audience, market position, technology stack, certifications and awards, business model, and key offerings. Use current, factual information from reliable sources.`;

    const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a professional business research assistant. Provide accurate, factual information about companies and brands. Always cite sources and use current data from reliable sources like company websites, news articles, and industry reports.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      })
    });

    if (!perplexityRes.ok) {
      const errorText = await perplexityRes.text();
      console.error(`Perplexity API error: ${perplexityRes.status} - ${errorText}`);
      return '';
    }

    const perplexityJson = await perplexityRes.json();
    const searchContent = perplexityJson?.choices?.[0]?.message?.content || '';
    
    console.log(`✅ Fetched brand information from Perplexity for ${brandName} (${searchContent.length} chars)`);
    return searchContent;
  } catch (error) {
    console.error(`Error fetching brand information from Perplexity:`, error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY secret' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url, brandName, industry, keywords, projectId } = await req.json();
    if (!url || !brandName) {
      return new Response(JSON.stringify({ error: 'url and brandName are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If projectId is provided, check if summary already exists in database
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('brand_analysis_projects')
        .select('brand_summary, brand_summary_updated_at')
        .eq('id', projectId)
        .single();

      if (!projectError && project?.brand_summary) {
        console.log(`✅ Using cached brand summary for project: ${projectId}`);
        return new Response(
          JSON.stringify({
            summary: project.brand_summary.summary || project.brand_summary,
            favicon: project.brand_summary.favicon || null,
            sourceUrl: project.brand_summary.sourceUrl || url,
            lastUpdated: project.brand_summary_updated_at || project.brand_summary.lastUpdated || new Date().toISOString(),
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const meta = await getSiteMetadata(url);
    
    // Fetch accurate brand information from Google and other sources via Perplexity
    console.log(`🔍 Fetching brand information for ${brandName} from web sources...`);
    const webSearchResults = await searchBrandInformation(brandName, url, industry || undefined);

    const system = `You are a brand analyst. Return ONLY valid compact JSON with these fields:\n{
      "overview": string (CONCISE but comprehensive - must be 250-300 words that includes key information: company size, revenue/valuation, key markets, main competitors, key partnerships, recent achievements, social media presence, key executives, mission statement, values & culture, target audience, market position, technology stack, certifications & awards. Make it informative but concise),
      "industry": string,
      "typical_clients": string,
      "business_model": string,
      "brand_essence": string,
      "key_offerings": string,
      "founded_year": string,
      "headquarters": string
    }`;

    // Enhance user prompt with web search results
    const userPrompt = webSearchResults 
      ? `Brand name: ${brandName}
Website: ${url}
Website title: ${meta.title || ''}
Website description: ${meta.description || ''}
Industry: ${industry || ''}
Target keywords: ${(keywords || []).join(', ')}

RESEARCH DATA FROM WEB SOURCES (Google, news articles, company profiles):
${webSearchResults}

Task: Produce a comprehensive brand profile using the RESEARCH DATA above as the primary source of information. Prioritize facts from the web search results over the website metadata. The "overview" field MUST be 250-300 words (not more, not less) that naturally integrates key information about: company size, revenue/valuation, key markets, main competitors, key partnerships, recent achievements, social media presence, key executives, mission statement, values & culture, target audience, market position, technology stack, and certifications & awards. Write it as a cohesive, informative but concise overview. For other fields, extract specific facts from the research data. If information is truly unknown or not available in the research data, put "unknown". Be specific and detailed where information is available.`
      : `Brand name: ${brandName}
Website title: ${meta.title || ''}
Website description: ${meta.description || ''}
Industry: ${industry || ''}
Target keywords: ${(keywords || []).join(', ')}
Task: Produce a comprehensive brand profile. The "overview" field MUST be 250-300 words (not more, not less) that naturally integrates key information about: company size, revenue/valuation, key markets, main competitors, key partnerships, recent achievements, social media presence, key executives, mission statement, values & culture, target audience, market position, technology stack, and certifications & awards. Write it as a cohesive, informative but concise overview. For other fields, if data is unknown or not applicable, put "unknown". Be specific and detailed where information is available.`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      })
    });

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content || '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const summary = {
      overview: parsed.overview || meta.description || 'unknown',
      industry: parsed.industry || industry || 'unknown',
      typical_clients: parsed.typical_clients || 'unknown',
      business_model: parsed.business_model || 'unknown',
      brand_essence: parsed.brand_essence || 'unknown',
      key_offerings: parsed.key_offerings || 'unknown',
      founded_year: parsed.founded_year || 'unknown',
      headquarters: parsed.headquarters || 'unknown',
    };

    const response = {
      summary,
      favicon: meta.icon || null,
      sourceUrl: url,
      lastUpdated: new Date().toISOString(),
    };

    // Save to database if projectId is provided
    if (projectId) {
      try {
        const { error: updateError } = await supabase
          .from('brand_analysis_projects')
          .update({
            brand_summary: response,
            brand_summary_updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (updateError) {
          console.error('Error saving brand summary to database:', updateError);
        } else {
          console.log(`✅ Brand summary saved to database for project: ${projectId}`);
        }
      } catch (dbError) {
        console.error('Error saving brand summary:', dbError);
        // Continue even if save fails
      }
    }

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('generate-brand-summary error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
