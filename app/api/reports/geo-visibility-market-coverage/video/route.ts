import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getGeoVisibilityStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

const XAI_BASE = "https://api.x.ai/v1";
const VIDEO_BUCKET = "geo-visibility-videos";
const REPORT_TYPE = "geo-visibility-market-coverage";
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

interface RegionData {
  region: string;
  country_code?: string;
  visibilityScore: number;
  aiScore: number;
  organicScore: number;
  coverageStatus: string;
}

interface ReportData {
  domain: string;
  regions: RegionData[];
  summary: {
    totalRegions: number;
    coveredRegions: number;
    strongRegions: number;
    gapRegions: number;
    avgVisibilityScore: number;
    totalImpressions: number;
  };
  generatedAt: string;
}

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { domain, regions, summary, generatedAt } = report;
  const q = (s: string, max = 20) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const topRegions = [...regions].sort((a, b) => b.visibilityScore - a.visibilityScore).slice(0, 5);
  const gapRegions = regions.filter(r => r.coverageStatus === "gap" || r.visibilityScore < 30).sort((a, b) => a.visibilityScore - b.visibilityScore).slice(0, 5);

  const topList = topRegions.map((r, i) => `${i + 1}.${q(r.region)} vis:${r.visibilityScore.toFixed(1)} ai:${r.aiScore.toFixed(1)}`).join("\n");
  const gapList = gapRegions.map((r, i) => `${i + 1}.${q(r.region)} vis:${r.visibilityScore.toFixed(1)}`).join(" | ");

  const covPct = summary.totalRegions > 0 ? Math.round((summary.coveredRegions / summary.totalRegions) * 100) : 0;

  const { s, useInstruction } = getGeoVisibilityStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  return `${langInstruction}NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, geographic map visualization, bold sans-serif. Spring animations, counter roll-ups, staggered bars, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${q(domain, 30)}". Navy→teal gradient. Map icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.coverageReport}" — 4 animated cards, numbers roll up:
TEAL ${summary.totalRegions} ${s.regionsAnalyzed} | GREEN ${summary.coveredRegions} ${s.covered} (${covPct}%) | RED ${summary.gapRegions} ${s.coverageGaps} | BLUE ${summary.avgVisibilityScore.toFixed(1)} ${s.avgVisibility}

[6-9s] ${s.topPerformingRegions} — horizontal bar chart, bars grow left→right (spring, stagger 0.08s). Teal bars:
${topList}

[9-12s] SPLIT: LEFT donut "${s.coverage}" ${s.covered} ${covPct}% teal | ${s.gaps} ${100 - covPct}% red. RIGHT "${s.coverageGaps}":
${gapList}

[12-15s] CLOSING (teal glow border): ${summary.coveredRegions}/${summary.totalRegions} ${s.regionsCovered} ${summary.gapRegions} ${s.gapMarketsIdentified} ${s.focusClosing} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(xaiVideoUrl: string, userId: string, domainId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${domainId}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).upload(fileName, videoBuffer, { contentType: "video/mp4", cacheControl: "3600", upsert: true });
    if (error) { console.error("[geo-video] Upload error:", error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[geo-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

// Same pattern as ai-search-presence: select then update or insert (avoids upsert issues with partial unique indexes)
async function getVideoRecord(supabase: any, userId: string, domainId: string) {
  const { data, error } = await supabase
    .from("report_videos")
    .select("id, video_url, video_request_id, video_status, video_generated_at, video_requested_at")
    .eq("user_id", userId)
    .eq("report_type", REPORT_TYPE)
    .eq("domain_id", domainId)
    .is("project_id", null)
    .maybeSingle();
  return { data, error };
}

async function upsertVideoRecord(supabase: any,
  userId: string,
  domainId: string,
  updates: Record<string, any>
) {
  const { data: existing } = await getVideoRecord(supabase, userId, domainId);
  if (existing?.id) {
    return supabase.from("report_videos").update(updates).eq("id", existing.id);
  }
  return supabase.from("report_videos").insert({
    user_id: userId,
    report_type: REPORT_TYPE,
    domain_id: domainId,
    project_id: null,
    ...updates,
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");
    if (!domainId) return NextResponse.json({ error: "domainId is required" }, { status: 400 });

    const { data: record } = await getVideoRecord(supabase, session.user.id, domainId);

    if (!record) return NextResponse.json({ success: true, video: null });

    if (record.video_status === "done" && record.video_url) {
      return NextResponse.json({ success: true, video: { url: record.video_url, status: "done", generatedAt: record.video_generated_at } });
    }

    if (record.video_request_id && record.video_status === "pending") {
      const requestedAt = record.video_requested_at ? new Date(record.video_requested_at).getTime() : Date.now() - POLL_TIMEOUT_MS - 1;
      if (Date.now() - requestedAt > POLL_TIMEOUT_MS) {
        await supabase.from("report_videos").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("id", record.id);
        return NextResponse.json({ success: true, video: { status: "failed" } });
      }

      const xaiApiKey = process.env.XAI_API_KEY;
      if (!xaiApiKey) return NextResponse.json({ success: true, video: { status: "pending", requestId: record.video_request_id } });

      try {
        const statusRes = await fetch(`${XAI_BASE}/videos/${record.video_request_id}`, { headers: { Authorization: `Bearer ${xaiApiKey}` } });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const status = statusData.status ?? statusData.state ?? statusData.phase;
          const videoUrl = statusData.video?.url ?? statusData.output?.url ?? statusData.result?.url ?? statusData.url;

          if (videoUrl) {
            const storedUrl = await downloadAndStoreVideo(videoUrl, session.user.id, domainId);
            const finalUrl = storedUrl || videoUrl;
            const now = new Date().toISOString();
            await supabase.from("report_videos").update({ video_url: finalUrl, video_status: "done", video_generated_at: now, video_request_id: null, video_requested_at: null }).eq("id", record.id);
            return NextResponse.json({ success: true, video: { url: finalUrl, status: "done", generatedAt: now } });
          }

          if (status === "expired" || status === "failed" || status === "error") {
            await supabase.from("report_videos").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("id", record.id);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
        }
      } catch (pollErr) {
        console.error("[geo-video] Poll error:", pollErr);
      }
      return NextResponse.json({ success: true, video: { status: "pending", requestId: record.video_request_id } });
    }

    if (record.video_status === "failed") return NextResponse.json({ success: true, video: { status: "failed" } });
    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[geo-video] GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed to get video status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { domainId, reportData, language } = body as { domainId: string; reportData: ReportData; language?: string };
    if (!domainId || !reportData) return NextResponse.json({ error: "domainId and reportData are required" }, { status: 400 });

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) return NextResponse.json({ error: "XAI_API_KEY is not configured." }, { status: 503 });

    const languageCode = (language || "en").toLowerCase().split("-")[0] || "en";
    const prompt = buildVideoPrompt(reportData, languageCode);
    console.log("[geo-video] Starting video generation for domain:", reportData.domain, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

    const genRes = await fetch(`${XAI_BASE}/videos/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${xaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "grok-imagine-video", prompt, duration: 15, aspect_ratio: "16:9", resolution: "720p" }),
    });

    if (!genRes.ok) {
      const errData = await genRes.json().catch(() => ({}));
      return NextResponse.json({ error: (errData as any)?.error?.message || `xAI API error: ${genRes.status}` }, { status: genRes.status >= 500 ? 502 : 400 });
    }

    const genData = await genRes.json();
    const requestId: string = genData.id ?? genData.request_id ?? genData.requestId;
    if (!requestId) return NextResponse.json({ error: "xAI did not return a request ID" }, { status: 502 });

    const now = new Date().toISOString();
    const { error: dbError } = await upsertVideoRecord(supabase, session.user.id, domainId, {
      video_request_id: requestId,
      video_status: "pending",
      video_url: null,
      video_generated_at: null,
      video_requested_at: now,
    });

    if (dbError) {
      console.error("[geo-video] DB upsert error:", dbError);
      return NextResponse.json({ error: "Failed to save video request. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[geo-video] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}
