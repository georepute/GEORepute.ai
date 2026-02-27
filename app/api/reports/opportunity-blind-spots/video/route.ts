import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getOppBlindSpotsStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

const XAI_BASE = "https://api.x.ai/v1";
const VIDEO_BUCKET = "opportunity-videos";
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

interface OpportunityQuery {
  query: string;
  demand: number;
  cpc: number | null;
  gap: string;
  estimatedValue: number;
  opportunityNote: string;
}

interface ReportData {
  domain: string;
  queries: OpportunityQuery[];
  summary: {
    totalQueries: number;
    priorityGapsCount: number;
    avgCpc: number;
    revenueAtRisk: number;
  };
  enginesUsed: string[];
  generatedAt: string;
}

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { domain, queries, summary, generatedAt } = report;
  const q = (s: string, max = 22) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const { s, useInstruction } = getOppBlindSpotsStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  const topOpps = queries.filter(x => x.gap === "Neither").sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 8);
  const topByValue = queries.sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 5);

  const oppList = topOpps.slice(0, 8)
    .map((x, i) => `${i + 1}.${q(x.query)} ${s.demand}:${x.demand.toLocaleString()} CPC:$${(x.cpc || 0).toFixed(2)} ${s.val}:$${x.estimatedValue.toFixed(0)}`)
    .join("\n");

  const topList = topByValue.map((x, i) => `${i + 1}.${q(x.query)} $${x.estimatedValue.toFixed(0)}`).join(" | ");

  const revenueStr = summary.revenueAtRisk >= 1000
    ? `$${(summary.revenueAtRisk / 1000).toFixed(1)}K`
    : `$${summary.revenueAtRisk.toFixed(0)}`;
  const avgCpcStr = `$${summary.avgCpc.toFixed(2)}`;

  return `${langInstruction}NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, glow borders, bold sans-serif. Spring animations, counter roll-ups, staggered bars, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${domain}". Navy→orange gradient. Target icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.revenueAtRisk}" — 4 animated cards, numbers roll up:
ORANGE ${summary.totalQueries} ${s.totalQueries} | RED ${summary.priorityGapsCount} ${s.priorityGaps} | AMBER ${avgCpcStr} ${s.avgCpc} | GREEN ${revenueStr} ${s.revenueAtRisk}

[6-9s] ${s.topBlindSpotOpportunities} — horizontal bar chart by estimated value, bars grow left→right (spring, stagger 0.08s):
${oppList}

[9-12s] SPLIT: LEFT donut "${s.gapDistribution}" ${s.neither}(${summary.priorityGapsCount}) red | ${s.others}(${summary.totalQueries - summary.priorityGapsCount}) blue. RIGHT "${s.topValue}":
${topList}

[12-15s] CLOSING (orange glow border): ${summary.priorityGapsCount} ${s.closing} ${revenueStr} ${s.revenueAtRisk}. ${s.fixGapsCta} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(xaiVideoUrl: string, userId: string, domainId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${domainId}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).upload(fileName, videoBuffer, { contentType: "video/mp4", cacheControl: "3600", upsert: true });
    if (error) { console.error("[opp-video] Upload error:", error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[opp-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");
    if (!domainId) return NextResponse.json({ error: "domainId is required" }, { status: 400 });

    const { data: report, error } = await supabase
      .from("opportunity_blind_spots_reports")
      .select("video_url, video_request_id, video_status, video_generated_at, video_requested_at")
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId)
      .single();

    if (error || !report) return NextResponse.json({ success: true, video: null });

    if (report.video_status === "done" && report.video_url) {
      return NextResponse.json({ success: true, video: { url: report.video_url, status: "done", generatedAt: report.video_generated_at } });
    }

    if (report.video_request_id && report.video_status === "pending") {
      const requestedAt = report.video_requested_at ? new Date(report.video_requested_at).getTime() : Date.now() - POLL_TIMEOUT_MS - 1;
      if (Date.now() - requestedAt > POLL_TIMEOUT_MS) {
        await supabase.from("opportunity_blind_spots_reports").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("domain_id", domainId);
        return NextResponse.json({ success: true, video: { status: "failed" } });
      }

      const xaiApiKey = process.env.XAI_API_KEY;
      if (!xaiApiKey) return NextResponse.json({ success: true, video: { status: "pending", requestId: report.video_request_id } });

      try {
        const statusRes = await fetch(`${XAI_BASE}/videos/${report.video_request_id}`, { headers: { Authorization: `Bearer ${xaiApiKey}` } });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const status = statusData.status ?? statusData.state ?? statusData.phase;
          const videoUrl = statusData.video?.url ?? statusData.output?.url ?? statusData.result?.url ?? statusData.url;

          if (videoUrl) {
            const storedUrl = await downloadAndStoreVideo(videoUrl, session.user.id, domainId);
            const finalUrl = storedUrl || videoUrl;
            const now = new Date().toISOString();
            await supabase.from("opportunity_blind_spots_reports").update({ video_url: finalUrl, video_status: "done", video_generated_at: now, video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { url: finalUrl, status: "done", generatedAt: now } });
          }

          if (status === "expired" || status === "failed" || status === "error") {
            await supabase.from("opportunity_blind_spots_reports").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
        }
      } catch (pollErr) {
        console.error("[opp-video] Poll error:", pollErr);
      }
      return NextResponse.json({ success: true, video: { status: "pending", requestId: report.video_request_id } });
    }

    if (report.video_status === "failed") return NextResponse.json({ success: true, video: { status: "failed" } });
    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[opp-video] GET error:", err);
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
    console.log("[opp-video] Starting video generation for domain:", reportData.domain, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

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
    await supabase.from("opportunity_blind_spots_reports").update({ video_request_id: requestId, video_status: "pending", video_url: null, video_generated_at: null, video_requested_at: now }).eq("user_id", session.user.id).eq("domain_id", domainId);

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[opp-video] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}
