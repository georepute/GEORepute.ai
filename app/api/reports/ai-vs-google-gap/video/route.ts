import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { getAiVsGoogleGapStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

const XAI_BASE = "https://api.x.ai/v1";
const VIDEO_BUCKET = "gap-report-videos";
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

const BAND_LABELS: Record<string, string> = {
  ai_risk: "AI Risk", moderate_gap: "Moderate Gap", balanced: "Balanced",
  seo_opportunity: "SEO Opportunity", seo_failure: "SEO Failure",
};

interface GapQuery {
  query: string;
  impressions: number;
  googleScore: number;
  aiScore: number;
  gapScore: number;
  band: string;
}

interface ReportData {
  domain: string;
  queries: GapQuery[];
  summary: {
    totalQueries: number;
    avgGapScore: number;
    aiRisk: number;
    moderateGap: number;
    balanced: number;
    seoOpportunity: number;
    seoFailure: number;
  };
  enginesUsed: string[];
  generatedAt: string;
}

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { domain, queries, summary, generatedAt } = report;
  const q = (s: string, max = 22) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const aiRiskQueries = queries.filter(x => x.band === "ai_risk").sort((a, b) => b.gapScore - a.gapScore).slice(0, 10);
  const seoOppQueries = queries.filter(x => x.band === "seo_opportunity" || x.band === "seo_failure").sort((a, b) => a.gapScore - b.gapScore).slice(0, 5);

  const riskList = aiRiskQueries.slice(0, 8)
    .map((x, i) => `${i + 1}.${q(x.query)} G:${x.googleScore.toFixed(0)} AI:${x.aiScore.toFixed(0)} gap:${x.gapScore.toFixed(1)}`)
    .join("\n");

  const oppList = seoOppQueries.slice(0, 4)
    .map((x, i) => `${i + 1}.${q(x.query)} AI:${x.aiScore.toFixed(0)} G:${x.googleScore.toFixed(0)}`)
    .join("\n");

  const { s, useInstruction } = getAiVsGoogleGapStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  const bandList = [
    summary.aiRisk > 0 ? `${s.aiRisk} ${summary.aiRisk}` : "",
    summary.moderateGap > 0 ? `${s.moderateGap} ${summary.moderateGap}` : "",
    summary.balanced > 0 ? `${s.balanced} ${summary.balanced}` : "",
    summary.seoOpportunity > 0 ? `${s.seoOpp} ${summary.seoOpportunity}` : "",
    summary.seoFailure > 0 ? `SEO Fail ${summary.seoFailure}` : "",
  ].filter(Boolean).join(" | ");

  return `${langInstruction}NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, glow borders, bold sans-serif. Spring animations, counter roll-ups, staggered bars, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${domain}". Navy→blue gradient. Pulsing icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.visibilityGapReport}" — 4 animated cards, numbers roll up:
RED ${summary.aiRisk} ${s.aiRisk} | ORANGE ${summary.moderateGap} ${s.moderateGap} | GREEN ${summary.balanced} ${s.balanced} | BLUE ${summary.seoOpportunity} ${s.seoOpp}
${s.avgGapScore}: ${summary.avgGapScore} | ${s.totalQueries}: ${summary.totalQueries}

[6-9s] ${s.topAiRiskQueries} — horizontal bar chart, bars grow left→right (spring, stagger 0.08s). Red bars = high gap:
${riskList}

[9-12s] SPLIT: LEFT donut "${s.bandSplit}" ${bandList}. RIGHT "${s.seoOpportunity}" (blue):
${oppList}

[12-15s] CLOSING (blue glow border): ${summary.aiRisk} ${s.closing} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(xaiVideoUrl: string, userId: string, domainId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${domainId}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).upload(fileName, videoBuffer, {
      contentType: "video/mp4", cacheControl: "3600", upsert: true,
    });
    if (error) { console.error("[gap-video] Upload error:", error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[gap-video] downloadAndStoreVideo error:", err);
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
      .from("ai_google_gap_reports")
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
        await supabase.from("ai_google_gap_reports").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("domain_id", domainId);
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
            await supabase.from("ai_google_gap_reports").update({ video_url: finalUrl, video_status: "done", video_generated_at: now, video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { url: finalUrl, status: "done", generatedAt: now } });
          }

          if (status === "expired" || status === "failed" || status === "error") {
            await supabase.from("ai_google_gap_reports").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
        }
      } catch (pollErr) {
        console.error("[gap-video] Poll error:", pollErr);
      }
      return NextResponse.json({ success: true, video: { status: "pending", requestId: report.video_request_id } });
    }

    if (report.video_status === "failed") return NextResponse.json({ success: true, video: { status: "failed" } });
    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[gap-video] GET error:", err);
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
    console.log("[gap-video] Starting video generation for domain:", reportData.domain, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

    const genRes = await fetch(`${XAI_BASE}/videos/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${xaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "grok-imagine-video", prompt, duration: 15, aspect_ratio: "16:9", resolution: "720p" }),
    });

    if (!genRes.ok) {
      const errData = await genRes.json().catch(() => ({}));
      console.error("[gap-video] xAI generation error:", errData);
      return NextResponse.json({ error: (errData as any)?.error?.message || `xAI API error: ${genRes.status}` }, { status: genRes.status >= 500 ? 502 : 400 });
    }

    const genData = await genRes.json();
    const requestId: string = genData.id ?? genData.request_id ?? genData.requestId;
    if (!requestId) return NextResponse.json({ error: "xAI did not return a request ID" }, { status: 502 });

    console.log("[gap-video] xAI job started, requestId:", requestId);
    const now = new Date().toISOString();
    await supabase.from("ai_google_gap_reports").update({ video_request_id: requestId, video_status: "pending", video_url: null, video_generated_at: null, video_requested_at: now }).eq("user_id", session.user.id).eq("domain_id", domainId);

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[gap-video] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}
