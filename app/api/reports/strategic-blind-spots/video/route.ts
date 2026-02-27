import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getStrategicBlindSpotsStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

// xAI Aurora video generation API
const XAI_BASE = "https://api.x.ai/v1";
// Supabase storage bucket for videos — create this bucket in Supabase Dashboard → Storage
// SQL migration required:
//   ALTER TABLE blind_spot_reports
//     ADD COLUMN IF NOT EXISTS video_url TEXT,
//     ADD COLUMN IF NOT EXISTS video_request_id TEXT,
//     ADD COLUMN IF NOT EXISTS video_status TEXT,
//     ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ,
//     ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ;
const VIDEO_BUCKET = "blind-spot-videos";
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 min — stop polling and mark failed

interface BlindSpot {
  query: string;
  volume: number;
  gscImpressions: number;
  avgPosition: number;
  aiMentions: boolean;
  llmMentions?: Record<string, boolean>;
  demandScore: number;
  absenceScore: number;
  blindSpotScore: number;
  priority: "high" | "medium" | "low";
}

interface ReportData {
  domain: string;
  blindSpots: BlindSpot[];
  summary: {
    totalBlindSpots: number;
    avgBlindSpotScore: number;
    aiBlindSpotPct: number;
    perLlmStats?: Record<string, { mentioned: number; total: number; pct: number }>;
  };
  enginesUsed: string[];
  generatedAt: string;
}

const LLM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  perplexity: "Perplexity",
  claude: "Claude",
  grok: "Grok",
};

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { domain, blindSpots, summary, generatedAt } = report;

  const highPriority = blindSpots.filter((b) => b.priority === "high");
  const mediumPriority = blindSpots.filter((b) => b.priority === "medium");
  const lowPriority = blindSpots.filter((b) => b.priority === "low");
  const aiIgnored = blindSpots.filter((b) => !b.aiMentions);
  const aiMentioned = blindSpots.filter((b) => b.aiMentions);
  const top10Missing = aiIgnored.slice(0, 10);
  const top20 = blindSpots.slice(0, 20);
  const top15 = blindSpots.slice(0, 15);
  const perLlmStats = summary.perLlmStats || {};
  const hasLlmStats = Object.keys(perLlmStats).length > 0;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const topMissingQuery = top10Missing[0];
  const worstLlm =
    hasLlmStats
      ? Object.entries(perLlmStats).sort(([, a], [, b]) => a.pct - b.pct)[0]
      : null;

  const aiIgnoredPct  = Math.round((aiIgnored.length  / (blindSpots.length || 1)) * 100);
  const aiMentionedPct = Math.round((aiMentioned.length / (blindSpots.length || 1)) * 100);
  const highPct   = Math.round((highPriority.length   / (blindSpots.length || 1)) * 100);
  const medPct    = Math.round((mediumPriority.length  / (blindSpots.length || 1)) * 100);
  const lowPct    = Math.round((lowPriority.length    / (blindSpots.length || 1)) * 100);

  // Compact helpers — keep data rows short to stay under 4096-char limit
  const q = (s: string, max = 22) => s.length > max ? s.slice(0, max - 1) + "…" : s;

  // Scene 3: top 5 AI-ignored queries
  const missingList = top10Missing.slice(0, 5)
    .map((b, i) => `${i + 1}.${q(b.query)} ${b.volume.toLocaleString()}/mo score:${b.blindSpotScore.toFixed(1)} [${b.priority[0].toUpperCase()}]`)
    .join("\n");

  // Scene 4: top 12 blind spots bar chart
  const barList = top20.slice(0, 12)
    .map((b, i) => `${i + 1}.${q(b.query, 20)} ${b.blindSpotScore.toFixed(1)}[${b.priority[0].toUpperCase()}]`)
    .join("\n");

  // Scene 7: demand vs absence top 8
  const dvsList = top15.slice(0, 8)
    .map(b => `${q(b.query, 18)} D:${b.demandScore.toFixed(1)} A:${b.absenceScore.toFixed(1)}`)
    .join("\n");

  // Scene 6: per-LLM
  const llmList = hasLlmStats
    ? Object.entries(perLlmStats)
        .map(([k, s]) => `${LLM_LABELS[k] || k}:${s.pct}%(${s.mentioned}/${s.total})`)
        .join(" | ")
    : "";

  const topQuery  = topMissingQuery?.query  || top20[0]?.query  || "top blind spot";
  const topVolume = (topMissingQuery?.volume || top20[0]?.volume || 0).toLocaleString();

  const { s, useInstruction } = getStrategicBlindSpotsStrings(languageCode);
  const worstLlmStr = worstLlm
    ? `${s.worstAiGap} ${LLM_LABELS[worstLlm[0]] || worstLlm[0]} ${worstLlm[1].pct}%`
    : "";

  const s6start = hasLlmStats ? 45 : 99; // skip scene 6 if no LLM data
  const s7start = hasLlmStats ? 53 : 45;
  const s8start = hasLlmStats ? 57 : 53;
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  return `${langInstruction}NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, glow borders, bold sans-serif. Spring animations, counter roll-ups, staggered bars, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${domain}". Navy→indigo gradient. Amber pulsing icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.whatAreWeIgnoring}" — 4 animated cards, numbers roll up:
AMBER ${summary.totalBlindSpots} ${s.ignored} | BLUE ${s.score} ${summary.avgBlindSpotScore.toFixed(1)} | RED ${summary.aiBlindSpotPct}% ${s.aiBlind} | PURPLE ${highPriority.length} ${s.urgent}

[6-9s] ${s.topBlindSpots} — horizontal bar chart, bars grow left→right (spring, stagger 0.08s). Red=high, orange=med, green=low:
${barList}

[9-12s] SPLIT: LEFT donut "${s.priority}" ${s.high} ${highPriority.length}(${highPct}%) red | ${s.med} ${mediumPriority.length}(${medPct}%) orange | ${s.low} ${lowPriority.length}(${lowPct}%) green. RIGHT bars "${s.aiGap}" ${s.ignores} ${aiIgnored.length}(${aiIgnoredPct}%) red | ${s.mentions} ${aiMentioned.length}(${aiMentionedPct}%) green.${hasLlmStats ? `
LLM rates: ${llmList}` : ""}

[12-15s] CLOSING (violet glow border): ${summary.totalBlindSpots} ${s.closing} ${summary.aiBlindSpotPct}% AI invisible | ${highPriority.length} ${s.urgent}. ${s.fixFirst} "${q(topQuery, 30)}" ${topVolume}/mo. ${worstLlmStr} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(
  xaiVideoUrl: string,
  userId: string,
  domainId: string
): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${domainId}-${Date.now()}.mp4`;

    const { error } = await supabaseAdmin.storage
      .from(VIDEO_BUCKET)
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[blind-spot-video] Supabase upload error:", error);
      return null;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(VIDEO_BUCKET)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error("[blind-spot-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

// GET — return current video status/URL; if pending, poll xAI and finalize if ready
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");
    if (!domainId) {
      return NextResponse.json({ error: "domainId is required" }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from("blind_spot_reports")
      .select("video_url, video_request_id, video_status, video_generated_at, video_requested_at")
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId)
      .single();

    if (error || !report) {
      return NextResponse.json({ success: true, video: null });
    }

    // If already done, return URL
    if (report.video_status === "done" && report.video_url) {
      return NextResponse.json({
        success: true,
        video: {
          url: report.video_url,
          status: "done",
          generatedAt: report.video_generated_at,
        },
      });
    }

    // If pending, check xAI status
    if (report.video_request_id && report.video_status === "pending") {
      // Missing video_requested_at = old job, treat as timed out
      const requestedAt = report.video_requested_at
        ? new Date(report.video_requested_at).getTime()
        : Date.now() - POLL_TIMEOUT_MS - 1;
      const elapsed = Date.now() - requestedAt;

      // Timeout: stop polling after 15 min and mark failed
      if (elapsed > POLL_TIMEOUT_MS) {
        console.log("[blind-spot-video] Poll timeout after", Math.round(elapsed / 60000), "min, marking failed");
        await supabase
          .from("blind_spot_reports")
          .update({ video_status: "failed", video_request_id: null, video_requested_at: null })
          .eq("user_id", session.user.id)
          .eq("domain_id", domainId);

        return NextResponse.json({
          success: true,
          video: { status: "failed" },
        });
      }

      const xaiApiKey = process.env.XAI_API_KEY;
      if (!xaiApiKey) {
        return NextResponse.json({
          success: true,
          video: { status: "pending", requestId: report.video_request_id },
        });
      }

      try {
        const statusRes = await fetch(
          `${XAI_BASE}/videos/${report.video_request_id}`,
          { headers: { Authorization: `Bearer ${xaiApiKey}` } }
        );

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const status = statusData.status ?? statusData.state ?? statusData.phase;
          const videoUrl = statusData.video?.url ?? statusData.output?.url ?? statusData.result?.url ?? statusData.url;

          console.log("[blind-spot-video] xAI status:", status ?? "(no status)", "videoUrl:", !!videoUrl, "for requestId:", report.video_request_id);

          // xAI returns video.url directly when ready (no status field) — treat presence of video URL as success
          if (videoUrl) {
            const storedUrl = await downloadAndStoreVideo(
              videoUrl,
              session.user.id,
              domainId
            );

            const finalUrl = storedUrl || videoUrl;
            const now = new Date().toISOString();

            await supabase
              .from("blind_spot_reports")
              .update({
                video_url: finalUrl,
                video_status: "done",
                video_generated_at: now,
                video_request_id: null,
                video_requested_at: null,
              })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);

            return NextResponse.json({
              success: true,
              video: { url: finalUrl, status: "done", generatedAt: now },
            });
          }

          // Treat "expired" | "failed" | "error" as failed
          if (status === "expired" || status === "failed" || status === "error") {
            await supabase
              .from("blind_spot_reports")
              .update({ video_status: "failed", video_request_id: null, video_requested_at: null })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);

            return NextResponse.json({
              success: true,
              video: { status: "failed" },
            });
          }

          // status undefined or unknown — log full response for debugging
          if (status === undefined || status === null) {
            console.warn("[blind-spot-video] xAI returned unknown status, full response:", JSON.stringify(statusData).slice(0, 500));
          }
        } else {
          console.warn("[blind-spot-video] xAI status API non-OK:", statusRes.status, await statusRes.text().catch(() => ""));
        }
      } catch (pollErr) {
        console.error("[blind-spot-video] Poll error:", pollErr);
      }

      return NextResponse.json({
        success: true,
        video: { status: "pending", requestId: report.video_request_id },
      });
    }

    // Failed or no video
    if (report.video_status === "failed") {
      return NextResponse.json({ success: true, video: { status: "failed" } });
    }

    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[blind-spot-video] GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to get video status" },
      { status: 500 }
    );
  }
}

// POST — start video generation via xAI Aurora
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domainId, reportData, language } = body as { domainId: string; reportData: ReportData; language?: string };

    if (!domainId || !reportData) {
      return NextResponse.json(
        { error: "domainId and reportData are required" },
        { status: 400 }
      );
    }

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: "XAI_API_KEY is not configured. Add it to your .env.local file." },
        { status: 503 }
      );
    }

    const languageCode = (language || "en").toLowerCase().split("-")[0] || "en";
    const prompt = buildVideoPrompt(reportData, languageCode);
    console.log("[blind-spot-video] Starting video generation for domain:", reportData.domain, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

    const genRes = await fetch(`${XAI_BASE}/videos/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-video",
        prompt,
        duration: 15,
        aspect_ratio: "16:9",
        resolution: "720p",
      }),
    });

    if (!genRes.ok) {
      const errData = await genRes.json().catch(() => ({}));
      console.error("[blind-spot-video] xAI generation error:", errData);
      return NextResponse.json(
        {
          error:
            (errData as any)?.error?.message ||
            `xAI API error: ${genRes.status} ${genRes.statusText}`,
        },
        { status: genRes.status >= 500 ? 502 : 400 }
      );
    }

    const genData = await genRes.json();
    const requestId: string = genData.id ?? genData.request_id ?? genData.requestId;

    if (!requestId) {
      console.error("[blind-spot-video] No request_id in xAI response:", genData);
      return NextResponse.json(
        { error: "xAI did not return a request ID" },
        { status: 502 }
      );
    }

    console.log("[blind-spot-video] xAI job started, requestId:", requestId);

    // Store pending status in DB (video_requested_at for poll timeout)
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("blind_spot_reports")
      .update({
        video_request_id: requestId,
        video_status: "pending",
        video_url: null,
        video_generated_at: null,
        video_requested_at: now,
      })
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId);

    if (updateError) {
      console.error("[blind-spot-video] DB update error:", updateError);
      // Non-fatal — still return success so client can poll
    }

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[blind-spot-video] POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to start video generation" },
      { status: 500 }
    );
  }
}
