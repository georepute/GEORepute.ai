import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET: Fetch all brand voice profiles for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all brand voices for user
    const { data: voices, error } = await supabase
      .from("brand_voice_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching brand voices:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ voices: voices || [] }, { status: 200 });
  } catch (error: any) {
    console.error("Brand voice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand voices" },
      { status: 500 }
    );
  }
}

// POST: Create a new brand voice profile
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
      brand_name,
      description,
      personality_traits,
      tone,
      sentence_length,
      vocabulary_level,
      use_emojis,
      emoji_style,
      preferred_words,
      avoid_words,
      signature_phrases,
      voice_examples,
      is_default,
    } = body;

    // Validate required fields
    if (!brand_name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from("brand_voice_profiles")
        .update({ is_default: false })
        .eq("user_id", session.user.id)
        .eq("is_default", true);
    }

    // Create new brand voice
    const { data: voice, error } = await supabase
      .from("brand_voice_profiles")
      .insert({
        user_id: session.user.id,
        brand_name,
        description: description || null,
        personality_traits: personality_traits || [],
        tone: tone || "neutral",
        sentence_length: sentence_length || "mixed",
        vocabulary_level: vocabulary_level || "intermediate",
        use_emojis: use_emojis !== undefined ? use_emojis : true,
        emoji_style: emoji_style || "moderate",
        preferred_words: preferred_words || [],
        avoid_words: avoid_words || [],
        signature_phrases: signature_phrases || [],
        voice_examples: voice_examples || [],
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating brand voice:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { voice, message: "Brand voice created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Brand voice creation error:", error);
    return NextResponse.json(
      { error: "Failed to create brand voice" },
      { status: 500 }
    );
  }
}

// PATCH: Update an existing brand voice profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Voice profile ID is required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (updates.is_default) {
      await supabase
        .from("brand_voice_profiles")
        .update({ is_default: false })
        .eq("user_id", session.user.id)
        .eq("is_default", true);
    }

    // Update brand voice
    const { data: voice, error } = await supabase
      .from("brand_voice_profiles")
      .update(updates)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating brand voice:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!voice) {
      return NextResponse.json(
        { error: "Brand voice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { voice, message: "Brand voice updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Brand voice update error:", error);
    return NextResponse.json(
      { error: "Failed to update brand voice" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a brand voice profile
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Voice profile ID is required" },
        { status: 400 }
      );
    }

    // Delete brand voice
    const { error } = await supabase
      .from("brand_voice_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting brand voice:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Brand voice deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Brand voice deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete brand voice" },
      { status: 500 }
    );
  }
}

