import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface ResponseData {
  id: string;
  platform: string;
  response: string;
  response_metadata?: {
    brand_mentioned?: boolean;
    sentiment_score?: number;
    sources?: { url: string; domain: string }[];
  };
}

interface BrandVoice {
  id: string;
  brand_name: string;
  tone: string;
  personality_traits?: string[];
  sentence_length?: string;
  vocabulary_level?: string;
  use_emojis?: boolean;
  emoji_style?: string;
  preferred_words?: string[];
  avoid_words?: string[];
  signature_phrases?: string[];
  voice_examples?: string[];
}

interface SynthesizeRequest {
  prompt: string;
  responses: ResponseData[];
  brandName: string;
  industry: string;
  keywords: string[];
  competitors: string[];
  influenceLevel?: "subtle" | "moderate" | "strong";
  brandVoice?: BrandVoice | null;
  language?: "en" | "he";
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body: SynthesizeRequest = await request.json();
    const { prompt, responses, brandName, industry, keywords, competitors, influenceLevel = "subtle", brandVoice, language = "en" } = body;

    // Validation
    if (!prompt || !responses || responses.length === 0 || !brandName) {
      return NextResponse.json(
        { error: "Prompt, responses, and brandName are required" },
        { status: 400 }
      );
    }

    console.log('🔄 Synthesize Response Request:', {
      prompt: prompt.substring(0, 100) + '...',
      responseCount: responses.length,
      brandName,
      industry,
      influenceLevel,
      brandVoice: brandVoice?.brand_name || 'None'
    });

    // Format responses for the prompt
    const formattedResponses = responses.map((r, i) => {
      return `
### Response ${i + 1} (from ${r.platform.toUpperCase()}):
${r.response}
${r.response_metadata?.sources?.length ? `\nSources cited: ${r.response_metadata.sources.map(s => s.domain).join(', ')}` : ''}
`;
    }).join('\n---\n');

    // Build brand voice instructions if provided
    let brandVoiceInstructions = '';
    if (brandVoice) {
      brandVoiceInstructions = `
## Brand Voice Profile - CRITICAL: Follow this voice profile closely!
- Voice Name: ${brandVoice.brand_name}
- Tone: ${brandVoice.tone}
${brandVoice.personality_traits?.length ? `- Personality Traits: ${brandVoice.personality_traits.join(', ')}` : ''}
${brandVoice.sentence_length ? `- Sentence Length: ${brandVoice.sentence_length}` : ''}
${brandVoice.vocabulary_level ? `- Vocabulary Level: ${brandVoice.vocabulary_level}` : ''}
${brandVoice.use_emojis !== undefined ? `- Use Emojis: ${brandVoice.use_emojis ? 'Yes' : 'No'}${brandVoice.emoji_style ? ` (${brandVoice.emoji_style} style)` : ''}` : ''}
${brandVoice.preferred_words?.length ? `- Preferred Words/Phrases: ${brandVoice.preferred_words.join(', ')}` : ''}
${brandVoice.avoid_words?.length ? `- Words to Avoid: ${brandVoice.avoid_words.join(', ')}` : ''}
${brandVoice.signature_phrases?.length ? `- Signature Phrases (use naturally): ${brandVoice.signature_phrases.join(', ')}` : ''}
${brandVoice.voice_examples?.length ? `
### Voice Examples (match this style):
${brandVoice.voice_examples.slice(0, 2).map((ex, i) => `Example ${i + 1}: "${ex}"`).join('\n')}` : ''}

**IMPORTANT**: Your response MUST match this brand voice profile. Maintain the specified tone, personality, and writing style throughout.
`;
    }

    // Build the system prompt
    const systemPrompt = `You are an expert content synthesizer and brand visibility optimizer. Your task is to analyze multiple AI-generated responses and create the BEST possible synthesized answer that naturally incorporates brand mentions.

## Your Goals:
1. **Synthesize the Best Answer**: Extract the most accurate, helpful, and comprehensive information from all provided responses
2. **Natural Brand Integration**: Seamlessly incorporate "${brandName}" into the response where it genuinely adds value
3. **SEO Optimization**: Structure the response for optimal search engine visibility
4. **Maintain Authority**: The response should sound authoritative, helpful, and trustworthy
5. **Be Factual**: Only include information that is accurate and well-supported
${brandVoice ? '6. **Follow Brand Voice**: CRITICAL - Match the brand voice profile exactly!' : ''}

## Brand Context:
- Brand Name: ${brandName}
- Industry: ${industry || 'General'}
${keywords?.length ? `- Target Keywords: ${keywords.join(', ')}` : ''}
${competitors?.length ? `- Competitors (for context): ${competitors.join(', ')}` : ''}
${brandVoiceInstructions}
## Guidelines for Brand Integration:
- Mention "${brandName}" naturally, 1-3 times depending on context
- Position the brand as a valuable resource, solution, or authority
- Don't force the brand mention if it doesn't fit naturally
- The brand mention should feel organic and helpful, not like an advertisement
- Consider phrases like "platforms like ${brandName}", "solutions such as ${brandName}", or "${brandName}, a leading..."

## Response Format:
- Write in a clear, ${brandVoice?.tone || 'professional'} tone
- Use proper paragraph structure
- Include specific details and examples from the source responses
- If sources were cited, you may reference relevant ones
- Aim for comprehensive but concise (300-500 words typically)
${brandVoice?.use_emojis ? `- Include relevant emojis (${brandVoice.emoji_style || 'moderate'} usage)` : '- Avoid using emojis unless the brand voice requires it'}
${language === "he" ? `
## CRITICAL - Hebrew Output:
- The user's query is in Hebrew. You MUST write the ENTIRE synthesized response in HEBREW (עברית) only.
- Use Hebrew script (right-to-left). Do not mix in English or other languages.
- If any source response is in Hebrew, prefer and preserve Hebrew. If sources are in English, translate the synthesized answer into natural Hebrew.
- Brand name "${brandName}" can stay as-is if it is a proper noun; all other text must be in Hebrew.` : ""}`;

    const userPrompt = `## Original User Query:
"${prompt}"

## AI Responses to Synthesize:
${formattedResponses}

---

Now synthesize the best possible response that:
1. Directly answers the user's query
2. Combines the best insights from all responses
3. Naturally mentions "${brandName}" in a helpful, value-adding way
4. Is optimized for SEO and readability
${language === "he" ? "5. Write the ENTIRE response in HEBREW (עברית) only - no English or other languages in the output." : ""}

Write the optimized response:`;

    // ============================================
    // TEMPERATURE CONTROL SYSTEM
    // ============================================
    // Temperature controls how creative/random the AI responses are:
    // - Lower (0.3-0.5): More focused, precise, consistent
    // - Medium (0.6-0.7): Balanced creativity and accuracy
    // - Higher (0.8-1.0): More creative, varied, expressive
    
    // Step 1: Base temperature from Influence Level
    const influenceTemperatureMap = {
      subtle: 0.5,    // Lower temperature = more controlled, precise responses
      moderate: 0.7,  // Medium temperature = balanced creativity
      strong: 0.8    // Higher temperature = more creative, expressive responses
    };
    const baseTemperature = influenceTemperatureMap[influenceLevel] || 0.7;
    
    // Step 2: Brand Voice tone adjustment (if brand voice is selected)
    // Different tones need different creativity levels
    let brandVoiceTemperatureAdjustment = 0;
    if (brandVoice) {
      const toneMap: Record<string, number> = {
        'casual': 0.1,        // Casual needs more creativity (+0.1)
        'friendly': 0.1,      // Friendly needs more warmth (+0.1)
        'humorous': 0.15,     // Humorous needs most creativity (+0.15)
        'professional': -0.05, // Professional needs less variation (-0.05)
        'formal': -0.1,       // Formal needs most control (-0.1)
        'authoritative': -0.05, // Authoritative needs less variation (-0.05)
      };
      brandVoiceTemperatureAdjustment = toneMap[brandVoice.tone?.toLowerCase()] || 0;
    }
    
    // Step 3: Calculate final temperature
    // Combine base (from influence level) + adjustment (from brand voice)
    // Clamp between 0.3 (minimum) and 1.0 (maximum)
    const finalTemperature = Math.max(0.3, Math.min(1.0, baseTemperature + brandVoiceTemperatureAdjustment));
    
    // Log temperature calculation for debugging
    console.log('🌡️ Temperature Calculation:', {
      influenceLevel,
      baseTemperature,
      brandVoice: brandVoice?.brand_name || 'None',
      brandVoiceTone: brandVoice?.tone || 'None',
      brandVoiceAdjustment: brandVoiceTemperatureAdjustment,
      finalTemperature
    });

    // Call GPT-4 Turbo with calculated temperature
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: finalTemperature,
      max_tokens: 1500,
    });

    const synthesizedResponse = completion.choices[0]?.message?.content;

    if (!synthesizedResponse) {
      throw new Error("No response generated from GPT-4");
    }

    console.log('✅ Synthesized Response Generated:', {
      length: synthesizedResponse.length,
      brandMentioned: synthesizedResponse.toLowerCase().includes(brandName.toLowerCase())
    });

    // Log to analytics (optional - for tracking)
    try {
      await supabase.from('synthesis_logs').insert({
        user_id: session.user.id,
        original_prompt: prompt,
        source_responses_count: responses.length,
        brand_name: brandName,
        industry: industry,
        brand_voice_id: brandVoice?.id || null,
        brand_voice_name: brandVoice?.brand_name || null,
        synthesized_response: synthesizedResponse,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      // Non-critical, don't fail the request
      console.warn('Failed to log synthesis:', logError);
    }

    return NextResponse.json({
      success: true,
      synthesizedResponse,
      metadata: {
        sourceResponsesCount: responses.length,
        brandName,
        responseLength: synthesizedResponse.length,
        brandMentioned: synthesizedResponse.toLowerCase().includes(brandName.toLowerCase()),
        brandVoiceApplied: brandVoice?.brand_name || null
      }
    });

  } catch (error: any) {
    console.error("❌ Synthesize Response Error:", error);
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to synthesize response",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

