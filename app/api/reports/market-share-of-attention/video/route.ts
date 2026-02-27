import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getMarketShareStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

const XAI_BASE = "https://api.x.ai/v1";
const VIDEO_BUCKET = "market-share-videos";
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

interface EngineBreakdown {
  engine: string;
  label: string;
  totalQueries: number;
  mentions: number;
  mentionSharePct: number;
}

interface ReportData {
  domain: string;
  brandName: string;
  aiMentionSharePct: number;
  weightedAiSharePct: number;
  organicSharePct: number;
  marketShareScore: number;
  isDefaultLeader: boolean;
  totalAiQueries: number;
  totalAiMentions: number;
  totalRecommendations: number;
  engineBreakdown: EngineBreakdown[];
  generatedAt: string;
}

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { domain, brandName, aiMentionSharePct, marketShareScore, organicSharePct, engineBreakdown, generatedAt, isDefaultLeader } = report;
  const q = (s: string, max = 20) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const { s, useInstruction } = getMarketShareStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  const topEngines = [...engineBreakdown].sort((a, b) => b.mentionSharePct - a.mentionSharePct).slice(0, 5);
  const engineList = topEngines.map((e, i) => `${i + 1}.${e.label} ${e.mentionSharePct.toFixed(1)}%(${e.mentions}/${e.totalQueries})`).join(" | ");

  const leaderStr = isDefaultLeader ? s.defaultLeader : s.challenger;
  const scoreColor = marketShareScore >= 60 ? "green" : marketShareScore >= 35 ? "amber" : "red";

  return `${langInstruction}NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, glow borders, bold sans-serif. Spring animations, counter roll-ups, staggered bars, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${q(brandName || domain, 30)}". Navy→emerald gradient. Crown icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.attentionScores}" — 4 animated cards, numbers roll up:
${scoreColor.toUpperCase()} ${marketShareScore.toFixed(1)} ${s.marketScore} | BLUE ${aiMentionSharePct.toFixed(1)}% ${s.aiMention} | GREEN ${organicSharePct.toFixed(1)}% ${s.organic} | AMBER ${leaderStr}
${report.totalAiMentions} ${s.aiMentionsQueries}

[6-9s] ${s.engineBreakdown} — horizontal bar chart, bars grow left→right (spring, stagger 0.08s). Green=high mention, yellow=mid, red=low:
${engineList}

[9-12s] SPLIT: LEFT radial "${s.marketScore}" ${marketShareScore.toFixed(1)}/100 ${scoreColor} glow. RIGHT bar comparison:
${s.aiShareVsOrganic} ${aiMentionSharePct.toFixed(1)}% / ${organicSharePct.toFixed(1)}%

[12-15s] CLOSING (emerald glow border): ${brandName} commands ${marketShareScore.toFixed(1)}/100 attention score. ${isDefaultLeader ? s.closingDefaultLeader : s.closingChallenger} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(xaiVideoUrl: string, userId: string, projectId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${projectId}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).upload(fileName, videoBuffer, { contentType: "video/mp4", cacheControl: "3600", upsert: true });
    if (error) { console.error("[msa-video] Upload error:", error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[msa-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const { data: report, error } = await supabase
      .from("market_share_reports")
      .select("video_url, video_request_id, video_status, video_generated_at, video_requested_at")
      .eq("user_id", session.user.id)
      .eq("project_id", projectId)
      .single();

    if (error || !report) return NextResponse.json({ success: true, video: null });

    if (report.video_status === "done" && report.video_url) {
      return NextResponse.json({ success: true, video: { url: report.video_url, status: "done", generatedAt: report.video_generated_at } });
    }

    if (report.video_request_id && report.video_status === "pending") {
      const requestedAt = report.video_requested_at ? new Date(report.video_requested_at).getTime() : Date.now() - POLL_TIMEOUT_MS - 1;
      if (Date.now() - requestedAt > POLL_TIMEOUT_MS) {
        await supabase.from("market_share_reports").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("project_id", projectId);
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
            const storedUrl = await downloadAndStoreVideo(videoUrl, session.user.id, projectId);
            const finalUrl = storedUrl || videoUrl;
            const now = new Date().toISOString();
            await supabase.from("market_share_reports").update({ video_url: finalUrl, video_status: "done", video_generated_at: now, video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("project_id", projectId);
            return NextResponse.json({ success: true, video: { url: finalUrl, status: "done", generatedAt: now } });
          }

          if (status === "expired" || status === "failed" || status === "error") {
            await supabase.from("market_share_reports").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("project_id", projectId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
        }
      } catch (pollErr) {
        console.error("[msa-video] Poll error:", pollErr);
      }
      return NextResponse.json({ success: true, video: { status: "pending", requestId: report.video_request_id } });
    }

    if (report.video_status === "failed") return NextResponse.json({ success: true, video: { status: "failed" } });
    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[msa-video] GET error:", err);
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
    console.log("[msa-video] Starting video generation for:", reportData.brandName, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

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
    await supabase.from("market_share_reports").update({ video_request_id: requestId, video_status: "pending", video_url: null, video_generated_at: null, video_requested_at: now }).eq("user_id", session.user.id).eq("project_id", projectId);

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[msa-video] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}
