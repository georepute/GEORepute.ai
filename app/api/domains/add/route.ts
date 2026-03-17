import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/domains/add
 * Add a domain to domain management (e.g. from onboarding).
 * Body: { domain: string } — URL or hostname (e.g. https://example.com or example.com)
 * User must belong to an organization (Admin/Manager) for the insert to succeed via RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rawDomain = body.domain;
    if (!rawDomain || typeof rawDomain !== "string" || !rawDomain.trim()) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    let normalizedHost: string;
    try {
      const trimmed = rawDomain.trim();
      const urlStr =
        trimmed.startsWith("http://") || trimmed.startsWith("https://")
          ? trimmed
          : `https://${trimmed}`;
      const url = new URL(urlStr);
      normalizedHost = url.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    if (!normalizedHost || normalizedHost.length < 4) {
      return NextResponse.json(
        { error: "Invalid domain" },
        { status: 400 }
      );
    }

    const { data: orgUser, error: orgError } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (orgError || !orgUser?.organization_id) {
      return NextResponse.json(
        { success: false, noOrganization: true },
        { status: 200 }
      );
    }

    const { data, error: insertError } = await supabase
      .from("domains")
      .insert({
        organization_id: orgUser.organization_id,
        domain: normalizedHost,
        status: "active",
        created_by: user.id,
      })
      .select("id, domain, status")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { success: true, alreadyExists: true },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: insertError.message || "Failed to add domain" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      domain: data,
    });
  } catch (err: unknown) {
    console.error("Error in POST /api/domains/add:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
