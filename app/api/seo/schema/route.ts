import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  generateArticleSchema,
  generateFAQPageSchema,
  generateOrganizationSchema,
  generateWebPageSchema,
  generateAutoSchema,
  generateMultipleSchemas,
  generatePlatformSchema,
  schemaToScriptTag,
  type SchemaGeneratorInput,
} from "@/lib/seo/schemaGenerator";

/**
 * GET /api/seo/schema
 * Retrieve schema for existing content by content ID
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");
    const format = searchParams.get("format") || "json"; // json, script, or both

    if (!contentId) {
      return NextResponse.json(
        { error: "contentId query parameter is required" },
        { status: 400 }
      );
    }

    // Fetch content from database
    const { data: content, error: contentError } = await supabase
      .from("content_strategy")
      .select("*")
      .eq("id", contentId)
      .eq("user_id", session.user.id)
      .single();

    if (contentError || !content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Check if schema already exists in metadata
    if (content.metadata?.schema) {
      const existingSchema = content.metadata.schema;
      
      if (format === "script") {
        return NextResponse.json(
          {
            schema: existingSchema.scriptTags || schemaToScriptTag(existingSchema.jsonLd),
            format: "script",
          },
          { status: 200 }
        );
      } else if (format === "json") {
        return NextResponse.json(
          {
            schema: existingSchema.jsonLd,
            format: "json",
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            jsonLd: existingSchema.jsonLd,
            scriptTags: existingSchema.scriptTags || schemaToScriptTag(existingSchema.jsonLd),
            format: "both",
          },
          { status: 200 }
        );
      }
    }

    // Generate new schema if not exists
    const keywordsArray = Array.isArray(content.target_keywords)
      ? content.target_keywords
      : typeof content.target_keywords === "string"
      ? content.target_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
      : [];

    const schemaInput: SchemaGeneratorInput = {
      content: content.generated_content || "",
      title: content.topic,
      topic: content.topic,
      keywords: keywordsArray,
      platform: content.target_platform || "medium",
      imageUrl: content.metadata?.imageUrl,
      brandName: content.brand_mention || content.metadata?.brandName,
      publishedDate: content.created_at,
      modifiedDate: content.updated_at,
      description: (content.generated_content || "").substring(0, 160),
    };

    const generatedSchemas = generatePlatformSchema(schemaInput, content.target_platform || "medium");
    const schemaJson = Array.isArray(generatedSchemas) ? generatedSchemas : [generatedSchemas];
    const schemaScriptTags = schemaToScriptTag(generatedSchemas);

    // Update content metadata with generated schema
    const updatedMetadata = {
      ...content.metadata,
      schema: {
        jsonLd: schemaJson,
        scriptTags: schemaScriptTags,
        generatedAt: new Date().toISOString(),
      },
    };

    await supabase
      .from("content_strategy")
      .update({ metadata: updatedMetadata })
      .eq("id", contentId);

    if (format === "script") {
      return NextResponse.json(
        {
          schema: schemaScriptTags,
          format: "script",
        },
        { status: 200 }
      );
    } else if (format === "json") {
      return NextResponse.json(
        {
          schema: schemaJson,
          format: "json",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          jsonLd: schemaJson,
          scriptTags: schemaScriptTags,
          format: "both",
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Schema API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seo/schema
 * Generate schema for new content (without saving to database)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      content,
      title,
      topic,
      keywords,
      platform,
      imageUrl,
      brandName,
      publishedDate,
      description,
      schemaType, // Optional: "article", "faq", "organization", "webpage", "auto"
    } = body;

    if (!content || !topic) {
      return NextResponse.json(
        { error: "content and topic are required" },
        { status: 400 }
      );
    }

    const keywordsArray = Array.isArray(keywords)
      ? keywords
      : typeof keywords === "string"
      ? keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
      : [];

    const schemaInput: SchemaGeneratorInput = {
      content,
      title: title || topic,
      topic,
      keywords: keywordsArray,
      platform: platform || "medium",
      imageUrl,
      brandName,
      publishedDate: publishedDate || new Date().toISOString(),
      description: description || content.substring(0, 160),
    };

    let generatedSchemas;
    if (schemaType) {
      switch (schemaType.toLowerCase()) {
        case "article":
          generatedSchemas = generateArticleSchema(schemaInput);
          break;
        case "faq":
          generatedSchemas = generateFAQPageSchema(schemaInput);
          break;
        case "organization":
          generatedSchemas = generateOrganizationSchema(schemaInput);
          break;
        case "webpage":
          generatedSchemas = generateWebPageSchema(schemaInput);
          break;
        case "auto":
        default:
          generatedSchemas = generateAutoSchema(schemaInput);
          break;
      }
    } else {
      generatedSchemas = generatePlatformSchema(schemaInput, platform || "medium");
    }

    const schemaJson = Array.isArray(generatedSchemas) ? generatedSchemas : [generatedSchemas];
    const schemaScriptTags = schemaToScriptTag(generatedSchemas);

    return NextResponse.json(
      {
        jsonLd: schemaJson,
        scriptTags: schemaScriptTags,
        format: "both",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Schema generation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

