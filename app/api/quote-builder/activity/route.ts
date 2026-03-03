import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface ActivityEntry {
  id: string;
  quote_id: string;
  user_id: string;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get("quoteId");

    if (!quoteId) {
      return NextResponse.json(
        { error: "quoteId is required" },
        { status: 400 }
      );
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("user_id", session.user.id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { data: rows, error } = await supabase
      .from("quote_activity_log")
      .select("id, quote_id, user_id, action, old_value, new_value, created_at")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Quote activity log error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const activity: ActivityEntry[] = (rows || []).map((r: any) => ({
      id: r.id,
      quote_id: r.quote_id,
      user_id: r.user_id,
      action: r.action,
      old_value: r.old_value ?? null,
      new_value: r.new_value ?? null,
      created_at: r.created_at,
    }));

    return NextResponse.json({ activity });
  } catch (error: unknown) {
    console.error("Quote activity GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
