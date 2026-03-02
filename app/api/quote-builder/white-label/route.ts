import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/quote-builder/white-label
 * Returns the current user's organization white_label_config for use in PDF/public proposal branding.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: orgUser, error: ouError } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (ouError || !orgUser?.organization_id) {
      return NextResponse.json({ whiteLabelConfig: null });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("white_label_config")
      .eq("id", orgUser.organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ whiteLabelConfig: null });
    }

    const whiteLabelConfig = (org.white_label_config as Record<string, unknown>) ?? null;
    return NextResponse.json({ whiteLabelConfig });
  } catch (e) {
    console.error("Quote-builder white-label GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
