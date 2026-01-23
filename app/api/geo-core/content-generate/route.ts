import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateStrategicContent } from "@/lib/ai/geoCore";
import { applyLearningRules } from "@/lib/learning/rulesEngine";
import { generatePlatformSchema, schemaToScriptTag } from "@/lib/seo/schemaGenerator";
import { generatePlatformStructuredContent } from "@/lib/seo/structuredContent";

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
    const body = await request.json();
    const {
      topic,
      targetKeywords,
      targetPlatform,
      brandMention,
      influenceLevel,
      userContext,
      imageUrl, // Optional image URL for platforms like Instagram
      brandVoiceId, // Optional brand voice profile ID
      skipGeneration, // Skip AI generation, use provided content
      generatedContent, // Pre-generated content to use when skipGeneration is true
      contentType, // Type of content (e.g., 'answer' for AI visibility responses)
      tone, // Tone of the content
      language, // Language for content generation ("en" or "he")
      actionPlanId, // Optional: Link content to action plan
      actionPlanStepId, // Optional: Link content to specific step
      sourceMissedPrompt, // Optional: Original missed prompt this content was created from
      skipSchema, // Skip schema generation (generate content only, schema later)
    } = body;

    // Get language preference: from request body, or from cookies as fallback
    let preferredLanguage: "en" | "he" = language || "en";
    if (!language) {
      // Try to get from cookies
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
          const [key, value] = cookie.split("=");
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        const cookieLanguage = cookies["preferred-language"];
        if (cookieLanguage === "he" || cookieLanguage === "en") {
          preferredLanguage = cookieLanguage;
        }
      }
    }

    // For skipGeneration mode, we only need topic and targetPlatform
    if (skipGeneration) {
      if (!topic || !targetPlatform || !generatedContent) {
        return NextResponse.json(
          { error: "Topic, targetPlatform, and generatedContent are required for skipGeneration mode" },
          { status: 400 }
        );
      }
    } else if (!topic || !targetKeywords || !targetPlatform) {
      return NextResponse.json(
        { error: "Topic, targetKeywords, and targetPlatform are required" },
        { status: 400 }
      );
    }

    // Check if Instagram requires an image
    const normalizedPlatform = targetPlatform.toLowerCase().trim();
    if (normalizedPlatform === 'instagram' && !imageUrl) {
      return NextResponse.json(
        { error: "Instagram posts require an image URL. Please provide an imageUrl." },
        { status: 400 }
      );
    }

    // Remove the duplicate normalization (already done above in validation)
    
    // Try to query existing platform values to see what's actually in the database
    const { data: existingPlatforms } = await supabase
      .from("content_strategy")
      .select("target_platform")
      .limit(100);
    
    const uniquePlatforms = existingPlatforms 
      ? [...new Set(existingPlatforms.map((p: any) => p.target_platform).filter(Boolean))]
      : [];
    
    console.log('🔍 Platform info:', { 
      received: targetPlatform, 
      normalized: normalizedPlatform,
      existingInDB: uniquePlatforms
    });

    // Fetch brand voice profile if provided
    let brandVoiceProfile = null;
    if (brandVoiceId) {
      const { data: voice, error: voiceError } = await supabase
        .from("brand_voice_profiles")
        .select("*")
        .eq("id", brandVoiceId)
        .eq("user_id", session.user.id)
        .single();
      
      if (!voiceError && voice) {
        brandVoiceProfile = voice;
        console.log("🎭 Brand voice applied:", voice.brand_name);
      }
    }

    // For skipGeneration mode, create a simple result object
    let result: any;
    let learningRules: any = {};

    if (skipGeneration && generatedContent) {
      // Use provided content, skip AI generation
      console.log("⏭️ Skipping AI generation, using provided content");
      result = {
        content: generatedContent,
        keywordDensity: 0,
        seoScore: 70,
        readabilityScore: 75,
        contentType: contentType || "answer",
        tone: tone || "informative",
        wordCount: generatedContent.split(/\s+/).length,
      };
    } else {
      // Apply learning rules from previous outcomes
      learningRules = await applyLearningRules(
        session.user.id,
        {
          platform: targetPlatform,
          keywords: targetKeywords || [],
          topic,
        },
        supabase
      );

      // Generate content with learning rules AND brand voice applied
      result = await generateStrategicContent({
        topic,
        targetKeywords: targetKeywords || [],
        targetPlatform,
        brandMention,
        influenceLevel: learningRules.tone || influenceLevel || "subtle",
        userContext,
        brandVoice: brandVoiceProfile, // Pass brand voice profile
        language: preferredLanguage, // Pass language preference (from request or cookie)
        contentType: contentType, // Pass contentType to handle LinkedIn article vs post
      }, learningRules);
    }

    // Generate Structured SEO Elements (headings, FAQs, meta description, OG tags, internal links, canonical) for SCHEMA DATA
    // NOTE: These are for schema only, NOT added to content text (content stays natural)
    // Skip schema generation if skipSchema is true (for blog content generation - schema generated separately)
    let metaDescription = result.content.substring(0, 160);
    let headings: any[] = [];
    let faqs: any[] = [];
    let seoScore: number | null = null;
    let ogTags: any = null;
    let internalLinks: any[] = [];
    let canonicalUrl: string | undefined = undefined;

    if (skipSchema) {
      console.log("⏭️ Skipping schema generation (skipSchema: true)");
    } else {
    try {
      const keywordsArray = targetKeywords 
        ? (Array.isArray(targetKeywords) ? targetKeywords : targetKeywords.split(",").map((k: string) => k.trim()).filter(Boolean))
        : [];
      const structuredResult = await generatePlatformStructuredContent({
        content: result.content, // Original content (not modified)
        topic,
        keywords: keywordsArray,
        platform: normalizedPlatform,
        brandVoice: brandVoiceProfile,
        brandName: brandMention || brandVoiceProfile?.brand_name || undefined,
        imageUrl: imageUrl || undefined,
      });

      // Use structured elements for schema, but keep original content unchanged
      metaDescription = structuredResult.metaDescription;
      headings = structuredResult.headings;
      faqs = structuredResult.faqs;
      seoScore = structuredResult.seoScore;
      ogTags = structuredResult.ogTags;
      internalLinks = structuredResult.internalLinks || [];
      canonicalUrl = structuredResult.canonicalUrl;

      const h1Count = headings.filter((h: any) => h.level === 1).length;
      const h2Count = headings.filter((h: any) => h.level === 2).length;
      const h3Count = headings.filter((h: any) => h.level === 3).length;
      
      console.log("✅ Structured SEO Elements Generated (for schema):", {
        headings: {
          total: headings.length,
          h1: h1Count,
          h2: h2Count,
          h3: h3Count,
        },
        faqs: faqs.length,
        seoScore,
        metaDescriptionLength: metaDescription.length,
        ogTags: ogTags ? "✅ Generated" : "❌ Missing",
        internalLinks: internalLinks.length,
        canonicalUrl: canonicalUrl ? "✅ Generated" : "❌ Missing",
        note: "Content remains natural, structured elements go to schema"
      });
    } catch (structuredError: any) {
      console.error("❌ Structured SEO content generation error (non-fatal):", structuredError);
      // Generate fallback structured SEO elements even if GPT-4 Turbo fails
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://georepute.ai";
      const slugifiedTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      
      // Generate fallback OG tags
      ogTags = {
        title: topic.length > 70 ? topic.substring(0, 67) + "..." : topic,
        description: metaDescription.length > 200 ? metaDescription.substring(0, 197) + "..." : metaDescription,
        image: imageUrl || `${baseUrl}/og-default.png`,
        url: `${baseUrl}/content/${slugifiedTopic}`,
        type: "article",
        siteName: brandMention || brandVoiceProfile?.brand_name || "GeoRepute.ai",
      };
      
      // Generate fallback internal links from keywords
      const keywordsArray = Array.isArray(targetKeywords) ? targetKeywords : targetKeywords.split(",").map((k: string) => k.trim()).filter(Boolean);
      internalLinks = keywordsArray.slice(0, 5).map((keyword: string, index: number) => {
        const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return {
          anchorText: keyword,
          suggestedUrl: `/content/${slug}`,
          relevance: 8 - index,
          reason: `Related content about ${keyword} that complements this topic`,
        };
      });
      
      canonicalUrl = `${baseUrl}/content/${slugifiedTopic}`;
      
      console.log("⚠️ Using fallback structured SEO elements (GPT-4 Turbo unavailable):", {
        ogTags: "✅ Generated",
        internalLinks: internalLinks.length,
        canonicalUrl: "✅ Generated",
      });
    }
    } // End of if (!skipSchema) for structured SEO

    // ========================================
    // SEO SCHEMA GENERATION - ENABLED
    // ========================================
    let schemaJson: any[] = [];
    let schemaScriptTags = "";
    
    if (skipSchema) {
      console.log("⏭️ Skipping JSON-LD schema generation (skipSchema: true)");
    } else {
    
    try {
      const keywordsArray = Array.isArray(targetKeywords) ? targetKeywords : targetKeywords.split(",").map((k: string) => k.trim()).filter(Boolean);
      const generatedSchemas = generatePlatformSchema({
        content: result.content, // Use original content (natural, unchanged)
        title: topic,
        topic,
        keywords: keywordsArray,
        platform: normalizedPlatform,
        imageUrl: imageUrl || undefined,
        brandName: brandMention || brandVoiceProfile?.brand_name || undefined,
        publishedDate: new Date().toISOString(),
        description: metaDescription, // Use generated meta description for schema
        faqPairs: faqs.length > 0 ? faqs : undefined, // Include FAQs in schema (not in content)
        headings: headings.length > 0 ? headings : undefined, // Include headings in schema (not in content)
      }, normalizedPlatform);

      // Convert schemas to JSON-LD script tags for easy embedding
      schemaScriptTags = schemaToScriptTag(generatedSchemas);
      schemaJson = Array.isArray(generatedSchemas) ? generatedSchemas : [generatedSchemas];
      
      console.log("✅ SEO Schema Generated Automatically:", {
        type: schemaJson[0]?.["@type"] || "Article",
        count: schemaJson.length,
        platform: normalizedPlatform,
        topic: topic.substring(0, 50) + "...",
      });
      console.log("📋 Schema JSON-LD:", JSON.stringify(schemaJson[0], null, 2));
      console.log("📄 Schema Script Tags Length:", schemaScriptTags.length, "characters");
    } catch (schemaError: any) {
      console.error("❌ Schema generation error (non-fatal):", schemaError);
      // Schema generation failed, but continue without it
      // This ensures content generation always succeeds even if schema fails
    }
    } // End of if (!skipSchema) for JSON-LD schema

    // Save to database - use normalized platform value
    console.log('💾 Saving to database with platform:', normalizedPlatform);
    
    // Merge imageUrl, schema, structured content, contentType, and action plan link into metadata
    const contentMetadata = {
      ...result.metadata,
      ...(imageUrl ? { imageUrl } : {}), // Add imageUrl if provided
      ...(contentType ? { contentType } : {}), // Add contentType (for LinkedIn article/post distinction)
      ...(actionPlanId && actionPlanStepId ? { 
        actionPlanId, 
        actionPlanStepId 
      } : {}), // Link to action plan if provided
      ...(sourceMissedPrompt ? { sourceMissedPrompt } : {}), // Track original missed prompt
      schema: {
        jsonLd: schemaJson, // Store as JSON for API access
        scriptTags: schemaScriptTags, // Store as HTML script tags for embedding
        generatedAt: new Date().toISOString(),
      },
      structuredSEO: {
        metaDescription,
        headings, // For schema use only
        faqs, // For schema use only
        seoScore,
        wordCount: result.wordCount,
        ogTags, // Open Graph tags for social media
        internalLinks, // Internal linking suggestions
        canonicalUrl, // Canonical URL
        generatedAt: new Date().toISOString(),
        note: "Structured elements (headings, FAQs, OG tags, links, canonical) are used in schema, not added to content text",
      },
    };
    
    // Skip database insertion if skipGeneration is true (schema-only generation)
    // This prevents duplicate entries when generating schema for already-created content
    let data: any = null;
    let error: any = null;
    
    if (!skipGeneration) {
      // Only insert into database if this is a new content generation
      const insertResult = await supabase
        .from("content_strategy")
        .insert({
          user_id: session.user.id,
          topic,
          target_keywords: targetKeywords,
          target_platform: normalizedPlatform, // Use normalized value
          brand_mention: brandMention,
          influence_level: influenceLevel || "subtle",
          generated_content: result.content, // Keep original content natural (structured elements in schema only)
          neutrality_score: result.neutralityScore,
          tone: result.tone,
          word_count: result.wordCount, // Use original content word count
          ai_model: "gpt-4-turbo",
          metadata: contentMetadata, // Include imageUrl, schema (with structured elements), and structured SEO in metadata
          status: "draft",
        })
        .select()
        .single();
      
      data = insertResult.data;
      error = insertResult.error;
    } else {
      // For skipGeneration mode, we're just generating schema, so don't create a new DB entry
      console.log("⏭️ Skip generation mode: Returning schema without creating database entry");
    }

    // Handle database errors - but don't fail the entire request if content was generated
    if (error) {
      console.error("❌ Database insert error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        platformAttempted: normalizedPlatform,
        originalPlatform: targetPlatform
      });
      
      // ========================================
      // SEO SCHEMA GENERATION - ENABLED (fallback for DB error case)
      // ========================================
      // Re-generate schema in case it wasn't generated earlier (shouldn't happen, but safe fallback)
      if (schemaJson.length === 0) {
        try {
          const keywordsArray = Array.isArray(targetKeywords) ? targetKeywords : targetKeywords.split(",").map((k: string) => k.trim()).filter(Boolean);
          const generatedSchemas = generatePlatformSchema({
            content: result.content,
            title: topic,
            topic,
            keywords: keywordsArray,
            platform: normalizedPlatform,
            imageUrl: imageUrl || undefined,
            brandName: brandMention || brandVoiceProfile?.brand_name || undefined,
            publishedDate: new Date().toISOString(),
            description: metaDescription || result.content.substring(0, 160),
            faqPairs: faqs.length > 0 ? faqs : undefined,
            headings: headings.length > 0 ? headings : undefined,
          }, normalizedPlatform);
          schemaScriptTags = schemaToScriptTag(generatedSchemas);
          schemaJson = Array.isArray(generatedSchemas) ? generatedSchemas : [generatedSchemas];
        } catch (schemaError: any) {
          console.error("❌ Schema generation error (non-fatal):", schemaError);
        }
      }

      // If it's a constraint violation, return the content but warn about the database save
      if (error.code === '23514') {
        return NextResponse.json(
          { 
            content: result.content, // Return original natural content
            metadata: {
              neutralityScore: result.neutralityScore,
              tone: result.tone,
              wordCount: result.wordCount,
              platform: result.platform,
              ...result.metadata,
              learningRulesApplied: Object.keys(learningRules).length > 0 ? learningRules : undefined,
            },
            structuredSEO: {
              metaDescription,
              headings, // For schema use only
              faqs, // For schema use only
              seoScore,
            },
            schema: {
              jsonLd: schemaJson, // Schema includes headings and FAQs
              scriptTags: schemaScriptTags,
            },
            warning: `Content generated successfully, but could not be saved to database. The platform "${normalizedPlatform}" is not allowed by the database constraint 'content_strategy_target_platform_check'. Please update the database constraint to include this platform value, or use one of the allowed values.`,
            databaseError: {
              code: error.code,
              message: error.message,
              attemptedPlatform: normalizedPlatform
            },
            existingPlatformsInDB: uniquePlatforms
          },
          { status: 200 } // Still return 200 since content was generated successfully
        );
      }
      
      // For other database errors, still return content but warn
      return NextResponse.json(
        { 
          content: result.content, // Return original natural content
          metadata: {
            neutralityScore: result.neutralityScore,
            tone: result.tone,
            wordCount: result.wordCount,
            platform: result.platform,
            ...result.metadata,
            learningRulesApplied: Object.keys(learningRules).length > 0 ? learningRules : undefined,
          },
          structuredSEO: {
            metaDescription,
            headings,
            faqs,
            seoScore,
          },
          schema: {
            jsonLd: schemaJson,
            scriptTags: schemaScriptTags,
          },
          warning: "Content generated successfully, but could not be saved to database.",
          databaseError: {
            code: error.code,
            message: error.message
          }
        },
        { status: 200 } // Still return 200 since content was generated successfully
      );
    }

    // Update action plan step if content is linked to an action plan
    if (actionPlanId && actionPlanStepId && data?.id) {
      try {
        const { data: plan } = await supabase
          .from("action_plan")
          .select("steps")
          .eq("id", actionPlanId)
          .eq("user_id", session.user.id)
          .single();

        if (plan) {
          const steps = plan.steps || [];
          const stepIndex = steps.findIndex(
            (s: any) => s.id === actionPlanStepId || s.id?.toString() === actionPlanStepId
          );

          if (stepIndex !== -1) {
            steps[stepIndex] = {
              ...steps[stepIndex],
              executionMetadata: {
                ...(steps[stepIndex].executionMetadata || {}),
                linkedContentId: data.id,
                executionStatus: 'review', // Content generated, waiting for review
              },
            };

            await supabase
              .from("action_plan")
              .update({ steps })
              .eq("id", actionPlanId)
              .eq("user_id", session.user.id);

            console.log(`✅ Linked content ${data.id} to action plan ${actionPlanId}, step ${actionPlanStepId}`);
          }
        }
      } catch (planError: any) {
        console.error("Failed to update action plan step:", planError);
        // Don't fail the request if action plan update fails
      }
    }

    // Note: Learning will be auto-triggered when content performance data is available
    // via content performance API or manual trigger

    // ALWAYS return schema (even if empty) - automation ensures it's always generated
    return NextResponse.json(
      {
        content: result.content, // Return original natural content (structured elements in schema only)
        metadata: {
          neutralityScore: result.neutralityScore,
          tone: result.tone,
          wordCount: result.wordCount,
          platform: result.platform,
          ...result.metadata,
          learningRulesApplied: Object.keys(learningRules).length > 0 ? learningRules : undefined,
        },
        structuredSEO: {
          metaDescription,
          headings, // For schema use only
          faqs, // For schema use only
          seoScore,
        },
        schema: {
          jsonLd: schemaJson, // Schema includes headings and FAQs
          scriptTags: schemaScriptTags,
        },
        contentId: data?.id || null, // Return contentId only if a new entry was created
        skipGeneration: skipGeneration || false, // Indicate if this was schema-only generation
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Content generation API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's content
    const { data, error } = await supabase
      .from("content_strategy")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ content: data }, { status: 200 });
  } catch (error: any) {
    console.error("Content GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

