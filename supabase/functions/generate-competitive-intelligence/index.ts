import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get API key from Supabase Edge Function secrets
// Secrets are set using: supabase secrets set OPENAI_API_KEY=your_key
function getApiKey(keyType: string): string | null {
  // Map key types to environment variable names
  const envVarName = `${keyType.toUpperCase()}_API_KEY`;
  const apiKey = Deno.env.get(envVarName);
  
  if (apiKey) {
    console.log(`✅ ${keyType} API key loaded from secrets`);
    return apiKey;
  }
  
  console.log(`❌ No ${keyType} API key found in secrets (${envVarName})`);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, websiteUrl, industry, language, companyContext } = await req.json();

    // Validate input
    if (!brandName || !websiteUrl || !industry) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: brandName, websiteUrl, and industry are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine language preference (from body or cookie)
    const preferredLanguage = language || req.headers.get('cookie')?.split('; ').find(row => row.startsWith('preferred-language='))?.split('=')[1] || 'en';

    // Get OpenAI API key from secrets (same pattern as brand-analysis)
    const openaiApiKey = getApiKey('openai');
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured. Please set it in Supabase secrets: supabase secrets set OPENAI_API_KEY=your_key',
          success: false 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🤖 Generating competitive intelligence for: ${brandName}`);
    console.log(`   Industry: ${industry}`);
    console.log(`   Website: ${websiteUrl}`);
    console.log(`   Language: ${preferredLanguage}`);

    // Create language-specific instructions
    const languageInstruction = preferredLanguage === 'he' ? `
⚠️ CRITICAL: Generate ALL keywords in HEBREW.
- Use Hebrew script (Right-to-Left).
- Keywords should be natural Hebrew terms that people would search for or ask AI about.
- Use Hebrew industry terminology and expressions.
- Competitors can remain in their original language (brand names are typically kept as-is).
- Keywords should be in lowercase Hebrew.
` : '';

    // Create prompt for OpenAI
    const systemPrompt = preferredLanguage === 'he' 
      ? `אתה אנליסט מודיעין תחרותי המתמחה בשיווק דיגיטלי וניתוח מותגים. המשימה שלך היא לספק מתחרים ומילות מפתח מדויקות ורלוונטיות בהתבסס על מידע המותג שסופק. החזר רק JSON תקין ללא טקסט נוסף או הסבר.`
      : `You are a competitive intelligence analyst specialized in digital marketing and brand analysis. 
Your task is to provide accurate, relevant competitors and keywords based on the brand information provided. 
Return only valid JSON with no additional text or explanation.`;

    // Build context-aware prompt for fair competitor identification
    let contextInstructions = "";
    let competitorRules = "";
    
    if (companyContext) {
      const { trafficLevel, companyStage, marketPosition, estimatedTraffic } = companyContext;
      
      contextInstructions = `\n\nIMPORTANT CONTEXT FOR FAIR COMPETITOR IDENTIFICATION:
- Company Stage: ${companyStage.charAt(0).toUpperCase() + companyStage.slice(1)}
- Traffic Level: ${trafficLevel.charAt(0).toUpperCase() + trafficLevel.slice(1)} (estimated: ${estimatedTraffic})
- Market Position: ${marketPosition.charAt(0).toUpperCase() + marketPosition.slice(1)}

CRITICAL: You MUST identify competitors that are at a SIMILAR level to ensure fair comparison.`;

      // Stage-specific rules
      if (companyStage === "startup") {
        competitorRules = `
COMPETITOR SELECTION RULES FOR STARTUP:
- ONLY include other startups, early-stage companies, or small businesses
- DO NOT include large enterprises, Fortune 500 companies, or market leaders
- Examples of what NOT to include: Apple, Google, Microsoft, Amazon, Samsung, IBM, Oracle, Salesforce, Adobe, etc.
- Focus on companies that are also in early stages (founded within last 5-7 years)
- Include companies with similar team sizes and funding stages
- Prioritize companies that are direct competitors at the same growth stage`;
      } else if (companyStage === "smb") {
        competitorRules = `
COMPETITOR SELECTION RULES FOR SMB (Small-Medium Business):
- Include other small to medium-sized businesses
- May include some mid-market companies but NOT large enterprises
- DO NOT include Fortune 500 or global market leaders
- Focus on companies with similar scale (20-200 employees typically)
- Include regional or local competitors if market position is regional`;
      } else if (companyStage === "mid-market") {
        competitorRules = `
COMPETITOR SELECTION RULES FOR MID-MARKET:
- Include other mid-market companies and established SMBs
- May include some smaller enterprise companies
- DO NOT include only the largest global enterprises unless they're direct competitors
- Focus on companies with similar market share and scale`;
      } else {
        competitorRules = `
COMPETITOR SELECTION RULES FOR ENTERPRISE:
- Include other enterprise-level companies
- May include market leaders and established players
- Focus on companies with similar scale and market position`;
      }

      // Traffic-level rules
      if (trafficLevel === "low") {
        competitorRules += `
- Traffic Level Consideration: This company has LOW traffic (<10K/month)
- ONLY compare with competitors that also have low to medium traffic
- DO NOT include high-traffic market leaders as direct competitors`;
      } else if (trafficLevel === "medium") {
        competitorRules += `
- Traffic Level Consideration: This company has MEDIUM traffic (10K-100K/month)
- Compare with competitors that have similar traffic levels
- Avoid comparing with very high-traffic market leaders unless they're direct competitors`;
      }

      // Market position rules
      if (marketPosition === "niche") {
        competitorRules += `
- Market Position: This is a NICHE player
- Focus on other niche players in the same specialized area
- DO NOT include broad-market generalists as direct competitors`;
      } else if (marketPosition === "regional") {
        competitorRules += `
- Market Position: This is a REGIONAL player
- Prioritize other regional competitors in the same geographic area
- Include some national players only if they compete directly in this region`;
      }
    }

    const userPrompt = `${languageInstruction}Based on the following brand information, generate a comprehensive competitive intelligence analysis:

Brand Name: ${brandName}
Website: ${websiteUrl}
Industry: ${industry}${contextInstructions}${competitorRules}

Please provide:
1. A list of 8-12 main competitors (company/brand names) that operate in the same industry and market space. ${companyContext ? 'CRITICAL: These competitors MUST be at a similar company stage, traffic level, and market position as described above. This ensures fair comparison.' : 'Include both direct competitors and notable alternative solutions.'}
2. A list of 15-20 relevant target keywords that would be important for brand monitoring, SEO, and AI visibility in this industry. Include:
   - Product/service keywords
   - Industry-specific terms
   - Problem-solving keywords
   - Comparison keywords (e.g., "best [solution] for..." or in Hebrew: "הפתרון הטוב ביותר ל...")

Format your response as JSON with this exact structure:
{
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3", ...],
  "keywords": ["keyword 1", "keyword 2", "keyword 3", ...]
}

Rules:
- Competitors should be actual brand/company names (can remain in original language)
- ${companyContext ? 'MOST IMPORTANT: Only suggest competitors that are at a SIMILAR level (same stage, similar traffic, similar market position). This is critical for fair analysis.' : ''}
- Keywords should be ${preferredLanguage === 'he' ? 'in Hebrew script and lowercase' : 'lowercase and relevant to the industry'}
- Focus on keywords that people would search for or ask AI about
- Only return valid JSON, no additional text`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to generate competitive intelligence');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || '';

    console.log('📄 OpenAI response received');

    // Parse JSON response
    let parsedData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        console.error('No JSON found in OpenAI response:', content);
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // Validate and clean the data
    const competitors = Array.isArray(parsedData.competitors)
      ? parsedData.competitors
          .filter((c: unknown) => typeof c === 'string' && c.trim())
          .map((c: string) => c.trim())
      : [];

    const keywords = Array.isArray(parsedData.keywords)
      ? parsedData.keywords
          .filter((k: unknown) => typeof k === 'string' && k.trim())
          .map((k: string) => k.trim().toLowerCase())
      : [];

    if (competitors.length === 0 && keywords.length === 0) {
      throw new Error('No competitors or keywords were generated');
    }

    console.log(`✅ Generated ${competitors.length} competitors and ${keywords.length} keywords`);

    return new Response(
      JSON.stringify({
        success: true,
        competitors,
        keywords,
        count: {
          competitors: competitors.length,
          keywords: keywords.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error generating competitive intelligence:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

