import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getAiSearchPresenceStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

const XAI_BASE = "https://api.x.ai/v1";
const VIDEO_BUCKET = "ai-presence-videos";
const REPORT_TYPE = "ai-search-presence";
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

interface EngineData {
  platform: string;
  displayName: string;
  presenceScore: number;
  totalQueries: number;
  mentionCount: number;
  mentionRatePct: number;
  avgSentiment: number | null;
}

interface ReportData {
  brandName: string;
  engines: EngineData[];
  summary: {
    overallPresenceScore: number;
    totalQueries: number;
    totalMentions: number;
    avgSentiment: number | null;
    enginesCount: number;
  };
  generatedAt: string;
}

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { brandName, engines, summary, generatedAt } = report;
  const q = (s: string, max = 20) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const sortedEngines = engines.sort((a, b) => b.mentionRatePct - a.mentionRatePct);
  const engineList = sortedEngines.map((e, i) => `${i + 1}.${e.displayName} ${e.mentionRatePct.toFixed(1)}%(${e.mentionCount}/${e.totalQueries})`).join("\n");

  const bestEngine = sortedEngines[0];
  const worstEngine = sortedEngines[sortedEngines.length - 1];

  const { s, useInstruction } = getAiSearchPresenceStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  const sentimentLabel = summary.avgSentiment != null
    ? (summary.avgSentiment > 0.3 ? s.positive : summary.avgSentiment < -0.3 ? s.negative : s.neutral)
    : "";
  const sentimentStr = summary.avgSentiment != null
    ? `${s.sentiment}: ${sentimentLabel} ${(summary.avgSentiment * 100).toFixed(0)}%`
    : "";

  const scoreColor = summary.overallPresenceScore >= 60 ? "green" : summary.overallPresenceScore >= 30 ? "amber" : "red";

  return `${langInstruction}NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, glow borders, bold sans-serif. Spring animations, counter roll-ups, staggered bars, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${q(brandName, 30)}". Navy→cyan gradient. AI chip icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.presenceMetrics}" — 4 animated cards, numbers roll up:
${scoreColor.toUpperCase()} ${summary.overallPresenceScore.toFixed(1)} ${s.presenceScore} | BLUE ${summary.totalMentions}/${summary.totalQueries} ${s.mentions} | TEAL ${summary.enginesCount} ${s.engines} | ${sentimentStr || `CYAN ${s.sentiment} N/A`}

[6-9s] ${s.engineBreakdown} — horizontal bar chart, bars grow left→right (spring, stagger 0.08s). Cyan bars = high presence, red = low:
${engineList}

[9-12s] SPLIT: LEFT radial "${s.overallScore}" ${summary.overallPresenceScore.toFixed(1)}/100 ${scoreColor} pulse. RIGHT "${s.best} vs ${s.worst}":
${s.best}: ${bestEngine?.displayName || "N/A"} ${bestEngine?.mentionRatePct.toFixed(1) || 0}%
${s.worst}: ${worstEngine?.displayName || "N/A"} ${worstEngine?.mentionRatePct.toFixed(1) || 0}%

[12-15s] CLOSING (cyan glow border): ${summary.totalMentions} AI ${s.mentions} across ${summary.enginesCount} ${s.engines}. ${summary.overallPresenceScore >= 50 ? s.closingStrong : s.closingImprove} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(xaiVideoUrl: string, userId: string, projectId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${projectId}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).upload(fileName, videoBuffer, { contentType: "video/mp4", cacheControl: "3600", upsert: true });
    if (error) { console.error("[asp-video] Upload error:", error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[asp-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

async function getRecord(supabase: any, userId: string, projectId: string) {
  return supabase
    .from("report_videos")
    .select("id, video_url, video_request_id, video_status, video_generated_at, video_requested_at")
    .eq("user_id", userId)
    .eq("report_type", REPORT_TYPE)
    .eq("project_id", projectId)
    .is("domain_id", null)
    .maybeSingle();
}

async function upsertRecord(supabase: any, userId: string, projectId: string, updates: Record<string, any>) {
  const { data: existing } = await getRecord(supabase, userId, projectId);
  if (existing?.id) {
    return supabase.from("report_videos").update(updates).eq("id", existing.id);
  }
  return supabase.from("report_videos").insert({
    user_id: userId, report_type: REPORT_TYPE, project_id: projectId, domain_id: null, ...updates,
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const { data: record } = await getRecord(supabase, session.user.id, projectId);
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
            const storedUrl = await downloadAndStoreVideo(videoUrl, session.user.id, projectId);
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
        console.error("[asp-video] Poll error:", pollErr);
      }
      return NextResponse.json({ success: true, video: { status: "pending", requestId: record.video_request_id } });
    }

    if (record.video_status === "failed") return NextResponse.json({ success: true, video: { status: "failed" } });
    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[asp-video] GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed to get video status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { projectId, reportData, language } = body as { projectId: string; reportData: ReportData; language?: string };
    if (!projectId || !reportData) return NextResponse.json({ error: "projectId and reportData are required" }, { status: 400 });

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) return NextResponse.json({ error: "XAI_API_KEY is not configured." }, { status: 503 });

    const languageCode = (language || "en").toLowerCase().split("-")[0] || "en";
    const prompt = buildVideoPrompt(reportData, languageCode);
    console.log("[asp-video] Starting video generation for brand:", reportData.brandName, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

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
    await upsertRecord(supabase, session.user.id, projectId, {
      video_request_id: requestId, video_status: "pending", video_url: null, video_generated_at: null, video_requested_at: now,
    });

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[asp-video] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}
