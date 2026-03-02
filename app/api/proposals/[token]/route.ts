import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public API: fetch quote by share_token for proposal view.
 * No auth required — uses RPC get_quote_by_share_token (SECURITY DEFINER).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.rpc("get_proposal_public", { p_token: token });
    if (error) {
      console.error("get_proposal_public error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.quote_data) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({
      quote: row.quote_data as Record<string, unknown>,
      whiteLabelConfig: (row.white_label_config as Record<string, unknown>) ?? {},
    });
  } catch (e) {
    console.error("Proposals [token] GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
