import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateStrategicContent } from "@/lib/ai/geoCore";
import { applyLearningRules } from "@/lib/learning/rulesEngine";
import { generatePlatformSchema, schemaToScriptTag } from "@/lib/seo/schemaGenerator";
import { generatePlatformStructuredContent } from "@/lib/seo/structuredContent";

const MAX_PLATFORMS = 5;
const ALLOWED_PLATFORMS = [
  "reddit",
  "quora",
  "medium",
  "github",
  "linkedin",
  "x",
  "instagram",
  "facebook",
  "shopify",
];

/** Normalize platform for DB (store "x", not "twitter"). */
function normalizePlatformForDb(platform: string): string {
  const p = platform.toLowerCase().trim();
  return p === "twitter" ? "x" : p;
}

/** Platform key for geoCore (it uses "twitter" in guidelines). */
function platformForGeoCore(platform: string): string {
  const p = platform.toLowerCase().trim();
  return p === "x" ? "twitter" : p;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      topic,
      targetKeywords,
      targetPlatforms,
      language = "en",
      influenceLevel = "subtle",
      brandVoiceId,
      imageUrl,
      contentType,
      actionPlanId,
      actionPlanStepId,
    } = body;

    if (!topic || !targetKeywords || !Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return NextResponse.json(
        { error: "topic, targetKeywords, and targetPlatforms (non-empty array) are required" },
        { status: 400 }
      );
    }

    const platforms = targetPlatforms
      .map((p: string) => normalizePlatformForDb(p))
      .filter((p: string) => ALLOWED_PLATFORMS.includes(p));
    const capped = platforms.slice(0, MAX_PLATFORMS);

    if (capped.length === 0) {
      return NextResponse.json(
        { error: "No valid target platforms. Allowed: " + ALLOWED_PLATFORMS.join(", ") },
        { status: 400 }
      );
    }

    const preferredLanguage: "en" | "he" | "ar" | "fr" =
      language === "he" || language === "ar" || language === "fr" ? language : "en";
    const keywordsArray = Array.isArray(targetKeywords)
      ? targetKeywords
      : String(targetKeywords)
          .split(",")
          .map((k: string) => k.trim())
          .filter(Boolean);

    let brandVoiceProfile: any = null;
    if (brandVoiceId) {
      const { data: voice } = await supabase
        .from("brand_voice_profiles")
        .select("*")
        .eq("id", brandVoiceId)
        .eq("user_id", session.user.id)
        .single();
      if (voice) brandVoiceProfile = voice;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // Use service role key for server-side Edge Function calls (anon key can fail from API route)
    const supabaseEdgeKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const results: Array<{
      platform: string;
      contentId: string | null;
      generatedContent?: string;
      humanizedContent?: string;
      aiPercentage?: number;
      detectionResult?: {
        highlightedHtml?: string;
        topPhrases?: Array<{ phrase: string; confidence: number; reason: string }>;
        metrics?: { burstiness?: number; clichés?: number; avgSentenceLength?: number };
        summary?: string;
      };
      error?: string;
    }> = [];
    const errors: string[] = [];

    for (const platform of capped) {
      const platformKey = platformForGeoCore(platform);
      try {
        const learningRules = await applyLearningRules(
          session.user.id,
          { platform, keywords: keywordsArray, topic },
          supabase
        );

        const result = await generateStrategicContent(
          {
            topic,
            targetKeywords: keywordsArray,
            targetPlatform: platformKey as any,
            influenceLevel: influenceLevel || "subtle",
            brandVoice: brandVoiceProfile,
            language: preferredLanguage,
            contentType: contentType || (platform === "linkedin" ? "linkedin_post" : undefined),
          },
          learningRules
        );

        let contentToStore = result.content;
        let aiPercentage: number | undefined;
        let topPhrases: string[] = [];
        let detectionResult: {
          highlightedHtml?: string;
          topPhrases?: Array<{ phrase: string; confidence: number; reason: string }>;
          metrics?: { burstiness?: number; clichés?: number; avgSentenceLength?: number };
          summary?: string;
        } | undefined;

        if (supabaseUrl && supabaseEdgeKey) {
          try {
            const detectRes = await fetch(`${supabaseUrl}/functions/v1/detect-ai`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseEdgeKey}`,
              },
              body: JSON.stringify({ text: result.content, language: preferredLanguage }),
            });
            if (detectRes.ok) {
              const detectData = await detectRes.json();
              const data = detectData.data || detectData.result || detectData;
              aiPercentage =
                typeof detectData.aiPercentage === "number"
                  ? detectData.aiPercentage
                  : typeof data?.aiPercentage === "number"
                    ? data.aiPercentage
                    : undefined;
              const rawTopPhrases = data?.topPhrases || detectData?.topPhrases || [];
              topPhrases = rawTopPhrases.map((p: any) => (typeof p === "string" ? p : p?.phrase));
              detectionResult = {
                highlightedHtml: data?.highlightedHtml ?? detectData?.highlightedHtml ?? detectData?.highlighted,
                topPhrases: rawTopPhrases.map((p: any) => ({
                  phrase: typeof p === "string" ? p : p?.phrase ?? "",
                  confidence: typeof p === "object" && p?.confidence != null ? p.confidence : 0,
                  reason: typeof p === "object" && p?.reason != null ? p.reason : "",
                })),
                metrics: data?.metrics ?? detectData?.metrics,
                summary: data?.summary ?? detectData?.summary,
              };
            } else {
              const errText = await detectRes.text();
              console.warn("detect-ai non-OK for platform", platform, detectRes.status, errText?.slice(0, 200));
            }
          } catch (e) {
            console.warn("detect-ai failed for platform", platform, e);
          }
          // make-it-human is not run here; user can run it from the UI and choose original vs humanized
        }

        let metaDescription = contentToStore.substring(0, 160);
        let headings: any[] = [];
        let faqs: any[] = [];
        let ogTags: any = null;
        let internalLinks: any[] = [];
        let canonicalUrl: string | undefined;

        try {
          const structuredResult = await generatePlatformStructuredContent({
            content: contentToStore,
            topic,
            keywords: keywordsArray,
            platform,
            brandVoice: brandVoiceProfile,
            brandName: brandVoiceProfile?.brand_name || undefined,
            imageUrl: imageUrl || undefined,
          });
          metaDescription = structuredResult.metaDescription;
          headings = structuredResult.headings || [];
          faqs = structuredResult.faqs || [];
          ogTags = structuredResult.ogTags;
          internalLinks = structuredResult.internalLinks || [];
          canonicalUrl = structuredResult.canonicalUrl;
        } catch (_) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://georepute.ai";
          const slugifiedTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          ogTags = {
            title: topic.length > 70 ? topic.substring(0, 67) + "..." : topic,
            description: metaDescription,
            image: imageUrl || `${baseUrl}/og-default.png`,
            url: `${baseUrl}/content/${slugifiedTopic}`,
            type: "article",
            siteName: brandVoiceProfile?.brand_name || "GeoRepute.ai",
          };
          internalLinks = keywordsArray.slice(0, 5).map((keyword: string, index: number) => ({
            anchorText: keyword,
            suggestedUrl: `/content/${keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            relevance: 8 - index,
            reason: `Related content about ${keyword}`,
          }));
          canonicalUrl = `${baseUrl}/content/${slugifiedTopic}`;
        }

        let schemaJson: any[] = [];
        let schemaScriptTags = "";
        try {
          const generatedSchemas = generatePlatformSchema(
            {
              content: contentToStore,
              title: topic,
              topic,
              keywords: keywordsArray,
              platform,
              imageUrl: imageUrl || undefined,
              brandName: brandVoiceProfile?.brand_name || undefined,
              publishedDate: new Date().toISOString(),
              description: metaDescription,
              faqPairs: faqs.length > 0 ? faqs : undefined,
              headings: headings.length > 0 ? headings : undefined,
            },
            platform
          );
          schemaScriptTags = schemaToScriptTag(generatedSchemas);
          schemaJson = Array.isArray(generatedSchemas) ? generatedSchemas : [generatedSchemas];
        } catch (_) {}

        const contentMetadata = {
          ...(imageUrl ? { imageUrl } : {}),
          ...(contentType ? { contentType } : {}),
          ...(actionPlanId && actionPlanStepId ? { actionPlanId, actionPlanStepId } : {}),
          schema: {
            jsonLd: schemaJson,
            scriptTags: schemaScriptTags,
            generatedAt: new Date().toISOString(),
          },
          structuredSEO: {
            metaDescription,
            headings,
            faqs,
            seoScore: null,
            wordCount: contentToStore.split(/\s+/).length,
            ogTags,
            internalLinks,
            canonicalUrl,
            generatedAt: new Date().toISOString(),
          },
        };

        // DB expects integer for neutrality_score and word_count (AI may return float or string e.g. "0.95")
        const rawNeutrality = result.neutralityScore ?? 0;
        const neutralityNum = typeof rawNeutrality === "string" ? parseFloat(rawNeutrality) : Number(rawNeutrality);
        const neutralityScore = Number.isFinite(neutralityNum)
          ? neutralityNum <= 1 && neutralityNum >= 0
            ? Math.round(neutralityNum * 100)
            : Math.round(neutralityNum)
          : 0;
        const rawWordCount = result.wordCount ?? contentToStore.split(/\s+/).length;
        const wordCountNum = typeof rawWordCount === "string" ? parseInt(rawWordCount, 10) : Number(rawWordCount);
        const wordCount = Number.isFinite(wordCountNum) ? Math.round(wordCountNum) : Math.max(0, contentToStore.split(/\s+/).length);

        const insertPayload = {
          user_id: session.user.id,
          topic,
          target_keywords: targetKeywords,
          target_platform: platform,
          influence_level: influenceLevel || "subtle",
          generated_content: contentToStore,
          neutrality_score: neutralityScore,
          tone: result.tone ?? "informative",
          word_count: wordCount,
          ai_model: result.ai_model || "claude-sonnet-4-5-20250929",
          metadata: contentMetadata,
          status: "draft",
        };

        const { data: inserted, error: insertError } = await supabase
          .from("content_strategy")
          .insert(insertPayload)
          .select("id")
          .single();

        if (insertError) {
          errors.push(`${platform}: ${insertError.message}`);
          results.push({ platform, contentId: null, error: insertError.message });
        } else {
          results.push({
            platform,
            contentId: inserted?.id ?? null,
            generatedContent: result.content,
            humanizedContent: contentToStore,
            aiPercentage,
            detectionResult: detectionResult ?? undefined,
          });
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`${platform}: ${msg}`);
        results.push({ platform, contentId: null, error: msg });
      }
    }

    return NextResponse.json(
      { results, errors: errors.length > 0 ? errors : undefined },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Content generate multi API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
