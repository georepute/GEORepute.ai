/**
 * Structured SEO Content Generator
 * 
 * Enhances AI-generated content with SEO-optimized structure:
 * - Proper heading hierarchy (H1, H2, H3)
 * - FAQ sections
 * - Meta descriptions
 * - SEO-friendly formatting
 * - Keyword optimization
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface StructuredContentInput {
  content: string;
  topic: string;
  keywords: string[];
  platform: string;
  brandVoice?: any;
  brandName?: string;
  imageUrl?: string;
  publishedUrl?: string; // Actual published URL on the platform (used as canonical after publishing)
}

export interface StructuredContentOutput {
  structuredContent: string;
  metaDescription: string;
  headings: Array<{
    level: number;
    text: string;
    position: number;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  seoScore: number | null;
  wordCount: number;
  ogTags?: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    siteName?: string;
  };
  internalLinks?: Array<{
    anchorText: string;
    suggestedUrl: string;
    relevance: number;
    reason: string;
  }>;
  canonicalUrl?: string;
}

/**
 * Generate structured SEO elements (headings, FAQs, meta description) for schema
 * NOTE: These are for SCHEMA DATA only, NOT added to content text
 */
export async function generateStructuredSEOContent(
  input: StructuredContentInput
): Promise<StructuredContentOutput> {
  try {
    const prompt = `You are an SEO content expert. Analyze this content and generate structured SEO elements for schema data.

ORIGINAL CONTENT (DO NOT MODIFY):
${input.content}

TOPIC: ${input.topic}
KEYWORDS: ${input.keywords.join(", ")}
PLATFORM: ${input.platform}
${input.brandName ? `BRAND: ${input.brandName}` : ""}
${input.brandVoice ? `BRAND VOICE: ${input.brandVoice.brand_name} (${input.brandVoice.tone} tone)` : ""}

TASK: Generate structured SEO elements for SCHEMA DATA (not for content text):

1. **HEADINGS** (For schema structure):
   - Generate 1 H1 heading (main topic)
   - Generate 3-5 H2 headings (main sections based on content)
   - Generate H3 subheadings where appropriate
   - Headings should reflect content structure
   - Include target keywords naturally
   - Match content tone and brand voice

2. **FAQs** (For FAQPage schema):
   - Generate 3-5 relevant FAQs based on the topic and content
   - Questions should target long-tail keywords
   - Answers should be helpful and comprehensive
   - Match content style and brand voice

3. **META DESCRIPTION** (For schema description):
   - 150-160 characters
   - Compelling summary of the content
   - Include primary keyword
   - Call-to-action or value proposition
   - Optimized for click-through rate

${input.brandVoice ? `
BRAND VOICE REQUIREMENTS:
- Tone: ${input.brandVoice.tone}
- Personality: ${input.brandVoice.personality_traits?.join(", ") || "authentic"}
- Preferred words: ${input.brandVoice.preferred_words?.join(", ") || "none"}
- Avoid words: ${input.brandVoice.avoid_words?.join(", ") || "none"}
- Emoji style: ${input.brandVoice.emoji_style}
- Headings and FAQs should match brand voice tone
` : ""}

IMPORTANT:
- DO NOT modify the original content
- Generate headings and FAQs that match the content style
- Headings should feel natural, not forced
- FAQs should match the content tone
- Meta description should be engaging

4. **SEO SCORE** (Calculate based on content analysis):
   - Analyze the content quality, keyword optimization, structure, and SEO best practices
   - Score range: 0-100
   - Consider factors:
     * Keyword density and placement (0-20 points)
     * Content length and depth (0-15 points)
     * Heading structure (H1/H2/H3) (0-15 points)
     * Meta description quality (0-10 points)
     * Internal linking opportunities (0-10 points)
     * FAQ presence and quality (0-10 points)
     * Image optimization (if image provided) (0-5 points)
     * Readability and engagement (0-15 points)
   - Calculate a realistic score based on actual content analysis, not a fixed value

Respond in JSON format:
{
  "structuredContent": "${input.content}",
  "metaDescription": "150-160 character meta description",
  "headings": [
    {"level": 1, "text": "H1 heading", "position": 0},
    {"level": 2, "text": "H2 heading", "position": 150},
    ...
  ],
  "faqs": [
    {"question": "Question text", "answer": "Answer text"},
    ...
  ],
  "seoScore": <calculate based on content analysis, 0-100>,
  "wordCount": ${input.content.split(/\s+/).length},
  "ogTags": {
    "title": "OG title (60-70 chars)",
    "description": "OG description (150-200 chars)",
    "image": "${input.imageUrl || "default-image-url"}",
    "url": "content-url",
    "type": "article",
    "siteName": "${input.brandName || "Site Name"}"
  },
  "internalLinks": [
    {
      "anchorText": "relevant anchor text",
      "suggestedUrl": "/related-content-url",
      "relevance": 8,
      "reason": "Why this link is relevant"
    },
    ...
  ],
  "canonicalUrl": "https://domain.com/content/slugified-topic"
}`;

    // Use GPT-4 Turbo for structured SEO content generation
    console.log("🤖 Using GPT-4 Turbo for structured SEO content generation...");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://georepute.ai";
    const slugifiedTopic = input.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const defaultCanonicalUrl = `${baseUrl}/content/${slugifiedTopic}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO content strategist who creates structured, SEO-optimized content while maintaining natural, humanized writing style. Always respond in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 3000,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    console.log("✅ GPT-4 Turbo structured SEO content generated successfully");

    // Generate OG tags if not provided
    const ogTags = result.ogTags || (() => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://georepute.ai";
      const slugifiedTopic = input.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const description = result.metaDescription || extractMetaDescription(input.content);
      
      return {
        title: input.topic.length > 70 ? input.topic.substring(0, 67) + "..." : input.topic,
        description: description.length > 200 ? description.substring(0, 197) + "..." : description,
        image: input.imageUrl || `${baseUrl}/og-default.png`,
        url: input.publishedUrl || `${baseUrl}/content/${slugifiedTopic}`,
        type: "article",
        siteName: input.brandName || "GeoRepute.ai",
      };
    })();
    
    // Generate internal links if not provided
    const internalLinks = result.internalLinks || (() => {
      const suggestions: Array<{
        anchorText: string;
        suggestedUrl: string;
        relevance: number;
        reason: string;
      }> = [];

      input.keywords.slice(0, 5).forEach((keyword, index) => {
        const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        suggestions.push({
          anchorText: keyword,
          suggestedUrl: `/content/${slug}`,
          relevance: 8 - index,
          reason: `Related content about ${keyword} that complements this topic`,
        });
      });

      return suggestions;
    })();
    
    // Generate canonical URL - prefer publishedUrl if available, then result, then default
    const canonicalUrl = input.publishedUrl || result.canonicalUrl || defaultCanonicalUrl;

    // Ensure structuredContent is always a string
    const finalStructuredContent = typeof result.structuredContent === "string" 
      ? result.structuredContent 
      : input.content; // Fallback to original content if not a string

    return {
      structuredContent: finalStructuredContent,
      metaDescription: result.metaDescription || extractMetaDescription(input.content),
      headings: Array.isArray(result.headings) ? result.headings : [],
      faqs: Array.isArray(result.faqs) ? result.faqs : [],
      seoScore: typeof result.seoScore === "number" && result.seoScore >= 0 && result.seoScore <= 100 ? result.seoScore : null,
      wordCount: typeof result.wordCount === "number" ? result.wordCount : finalStructuredContent.split(/\s+/).length,
      ogTags,
      internalLinks,
      canonicalUrl,
    };
  } catch (error: any) {
    console.error("Structured SEO content generation error:", error);
    // Fallback: Return original content with basic structure
    const fallbackDescription = extractMetaDescription(input.content);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://georepute.ai";
    const slugifiedTopic = input.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    
    // Generate fallback OG tags
    const fallbackOGTags = {
      title: input.topic.length > 70 ? input.topic.substring(0, 67) + "..." : input.topic,
      description: fallbackDescription.length > 200 ? fallbackDescription.substring(0, 197) + "..." : fallbackDescription,
      image: input.imageUrl || `${baseUrl}/og-default.png`,
      url: input.publishedUrl || `${baseUrl}/content/${slugifiedTopic}`,
      type: "article",
      siteName: input.brandName || "GeoRepute.ai",
    };
    
    // Generate fallback internal links
    const fallbackInternalLinks = input.keywords.slice(0, 5).map((keyword: string, index: number) => {
      const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return {
        anchorText: keyword,
        suggestedUrl: `/content/${slug}`,
        relevance: 8 - index,
        reason: `Related content about ${keyword} that complements this topic`,
      };
    });
    
    return {
      structuredContent: input.content,
      metaDescription: fallbackDescription,
      headings: extractHeadings(input.content),
      faqs: [],
      seoScore: null,
      wordCount: input.content.split(/\s+/).length,
      ogTags: fallbackOGTags,
      internalLinks: fallbackInternalLinks,
      canonicalUrl: input.publishedUrl || `${baseUrl}/content/${slugifiedTopic}`,
    };
  }
}

/**
 * Extract meta description from content (fallback)
 */
function extractMetaDescription(content: string): string {
  // Remove markdown and HTML
  const plainText = content
    .replace(/[#*_`]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n+/g, " ")
    .trim();

  // Take first 155 characters
  if (plainText.length <= 160) {
    return plainText;
  }

  // Find last complete sentence before 160 chars
  const truncated = plainText.substring(0, 155);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastExclamation = truncated.lastIndexOf("!");
  const lastQuestion = truncated.lastIndexOf("?");

  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

  if (lastSentenceEnd > 100) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  return truncated + "...";
}

/**
 * Extract headings from content (fallback)
 */
function extractHeadings(content: string): Array<{ level: number; text: string; position: number }> {
  const headings: Array<{ level: number; text: string; position: number }> = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Markdown headings: # H1, ## H2, ### H3
    if (line.match(/^#{1,3}\s+/)) {
      const level = (line.match(/^#+/) || [""])[0].length;
      const text = line.replace(/^#+\s+/, "").trim();
      if (text) {
        headings.push({
          level,
          text,
          position: index,
        });
      }
    }
  });

  return headings;
}

/**
 * Format content with proper heading structure for different platforms
 */
export function formatContentForPlatform(
  structuredContent: string,
  platform: string
): string {
  // Ensure structuredContent is a string
  if (typeof structuredContent !== "string") {
    console.warn("⚠️ structuredContent is not a string, converting...");
    structuredContent = String(structuredContent || "");
  }

  switch (platform.toLowerCase()) {
    case "medium":
    case "github":
      // Markdown format
      return structuredContent;

    case "reddit":
      // Reddit uses markdown but simpler
      return structuredContent.replace(/^### /gm, "**").replace(/\n/g, "\n\n");

    case "linkedin":
    case "facebook":
    case "instagram":
      // Plain text with emoji indicators
      return structuredContent.replace(/^#+\s+/gm, "📌 ");

    default:
      return structuredContent;
  }
}

/**
 * Generate structured content with platform-specific formatting
 */
export async function generatePlatformStructuredContent(
  input: StructuredContentInput
): Promise<StructuredContentOutput> {
  const result = await generateStructuredSEOContent(input);
  
  // Ensure structuredContent is a string before formatting
  const contentToFormat = typeof result.structuredContent === "string" 
    ? result.structuredContent 
    : input.content; // Fallback to original content if not a string
  
  // Format for platform
  result.structuredContent = formatContentForPlatform(
    contentToFormat,
    input.platform
  );

  return result;
}

