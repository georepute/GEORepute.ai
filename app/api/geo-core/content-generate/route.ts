import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateStrategicContent } from "@/lib/ai/geoCore";
import { applyLearningRules } from "@/lib/learning/rulesEngine";

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
    } = body;

    if (!topic || !targetKeywords || !targetPlatform) {
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

    // Apply learning rules from previous outcomes
    const learningRules = await applyLearningRules(
      session.user.id,
      {
        platform: targetPlatform,
        keywords: targetKeywords,
        topic,
      },
      supabase
    );

    // Generate content with learning rules applied
    const result = await generateStrategicContent({
      topic,
      targetKeywords,
      targetPlatform,
      brandMention,
      influenceLevel: learningRules.tone || influenceLevel || "subtle",
      userContext,
    }, learningRules);

    // Save to database - use normalized platform value
    console.log('💾 Saving to database with platform:', normalizedPlatform);
    
    // Merge imageUrl into metadata if provided
    const contentMetadata = {
      ...result.metadata,
      ...(imageUrl ? { imageUrl } : {}), // Add imageUrl if provided
    };
    
    const { data, error } = await supabase
      .from("content_strategy")
      .insert({
        user_id: session.user.id,
        topic,
        target_keywords: targetKeywords,
        target_platform: normalizedPlatform, // Use normalized value
        brand_mention: brandMention,
        influence_level: influenceLevel || "subtle",
        generated_content: result.content,
        neutrality_score: result.neutralityScore,
        tone: result.tone,
        word_count: result.wordCount,
        ai_model: "gpt-4-turbo",
        metadata: contentMetadata, // Include imageUrl in metadata
        status: "draft",
      })
      .select()
      .single();

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
      
      // If it's a constraint violation, return the content but warn about the database save
      if (error.code === '23514') {
        return NextResponse.json(
          { 
            content: result.content,
            metadata: {
              neutralityScore: result.neutralityScore,
              tone: result.tone,
              wordCount: result.wordCount,
              platform: result.platform,
              ...result.metadata,
              learningRulesApplied: Object.keys(learningRules).length > 0 ? learningRules : undefined,
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
          content: result.content,
          metadata: {
            neutralityScore: result.neutralityScore,
            tone: result.tone,
            wordCount: result.wordCount,
            platform: result.platform,
            ...result.metadata,
            learningRulesApplied: Object.keys(learningRules).length > 0 ? learningRules : undefined,
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

    // Note: Learning will be auto-triggered when content performance data is available
    // via content performance API or manual trigger

    return NextResponse.json(
      {
        content: result.content,
        metadata: {
          neutralityScore: result.neutralityScore,
          tone: result.tone,
          wordCount: result.wordCount,
          platform: result.platform,
          ...result.metadata,
          learningRulesApplied: Object.keys(learningRules).length > 0 ? learningRules : undefined,
        },
        contentId: data?.id,
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

