import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getGlobalVisibilityStrings, getGlobalVisibilityGoogleStrings, getLangInstruction, LANGUAGE_NAMES } from "@/lib/video-report-translations";

const XAI_BASE = "https://api.x.ai/v1";
const VIDEO_BUCKET = "visibility-matrix-videos";
const REPORT_TYPE_AI = "global-visibility-matrix-ai";
const REPORT_TYPE_GOOGLE = "global-visibility-matrix-google";
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

type TabVariant = "ai" | "google";

function getReportType(tab: TabVariant): string {
  return tab === "google" ? REPORT_TYPE_GOOGLE : REPORT_TYPE_AI;
}

interface CountryData {
  country_code: string;
  country_name?: string;
  quadrant: string;
  overall_visibility_score: number;
  ai_visibility_score: number;
  organic_score: number;
  opportunity_score?: number;
  gsc_impressions?: number;
}

interface ReportData {
  domain: string;
  matrixData: CountryData[];
  summary: {
    totalCountries: number;
    strongCountries: number;
    emergingCountries: number;
    decliningCountries: number;
    absentCountries: number;
    avgVisibilityScore: number;
    topOpportunities: { country: string; opportunityScore: number }[];
  };
  generatedAt: string;
}

interface ReportDataGoogle {
  domain: string;
  matrixData: CountryData[];
  summary: {
    totalCountries: number;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    topByClicks: { country: string; clicks: number }[];
    topByImpressions: { country: string; impressions: number }[];
  };
  generatedAt: string;
}

function buildVideoPrompt(report: ReportData, languageCode: string): string {
  const { domain, summary, matrixData, generatedAt } = report;
  const q = (s: string, max = 20) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const topStrong = matrixData.filter(c => c.quadrant === "strong").sort((a, b) => b.overall_visibility_score - a.overall_visibility_score).slice(0, 5);
  const topOpps = (summary.topOpportunities || []).slice(0, 5);
  const topAbsent = matrixData.filter(c => c.quadrant === "absent").slice(0, 5);

  const toName = (c: { country_code: string; country_name?: string }) => c.country_name || c.country_code;
  const strongList = topStrong.map((c, i) => `${i + 1}.${toName(c)} ${c.overall_visibility_score.toFixed(1)}`).join(" | ");
  const oppList = topOpps.map((c, i) => `${i + 1}.${c.country} opp:${c.opportunityScore.toFixed(1)}`).join(" | ");
  const absentList = topAbsent.map(c => toName(c)).join(", ");

  const { s, useInstruction } = getGlobalVisibilityStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  return `${langInstruction}CRITICAL: Use the FULL country names below verbatim in the video. Never use codes (USA, GB, DE). Display exactly: United States, United Kingdom, Germany, etc.

NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, neon accents, world map visualization, bold sans-serif. Spring animations, counter roll-ups, staggered highlights, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${q(domain, 30)}". Navy→purple gradient. Globe icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.globalCoverage}" — 4 animated cards, numbers roll up:
GREEN ${summary.strongCountries} ${s.strong} | BLUE ${summary.emergingCountries} ${s.emerging} | ORANGE ${summary.decliningCountries} ${s.declining} | RED ${summary.absentCountries} ${s.absent}
${summary.totalCountries} ${s.countriesAnalyzed} | ${s.avgScore}: ${summary.avgVisibilityScore.toFixed(1)}

[6-9s] WORLD MAP visualization — countries colored by quadrant: green=strong, blue=emerging, orange=declining, red=absent. Animated pulse on strong countries.
Top ${s.strong} (display these full names): ${strongList}

[9-12s] SPLIT: LEFT "${s.topOpportunities}" (blue glow) — display these full names:
${oppList}
RIGHT "${s.absentMarkets}" red — display these full names: ${absentList}

[12-15s] CLOSING (purple glow border): ${summary.strongCountries} ${s.strong} markets, ${summary.emergingCountries} ${s.emerging}. ${summary.absentCountries} ${s.closing} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

function buildVideoPromptGoogle(report: ReportDataGoogle, languageCode: string): string {
  const { domain, summary, matrixData, generatedAt } = report;
  const q = (s: string, max = 20) => s.length > max ? s.slice(0, max - 1) + "…" : s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const topClicksList = (summary.topByClicks || []).slice(0, 5).map((c, i) => `${i + 1}.${c.country} ${c.clicks}`).join(" | ");
  const topImpressionsList = (summary.topByImpressions || []).slice(0, 5).map((c, i) => `${i + 1}.${c.country} ${c.impressions}`).join(" | ");

  const { s, useInstruction } = getGlobalVisibilityGoogleStrings(languageCode);
  const langInstruction = useInstruction ? getLangInstruction(languageCode) : "";

  return `${langInstruction}CRITICAL: Use the FULL country names below verbatim in the video. Never use codes (USA, GB, DE). Display exactly: United States, United Kingdom, Germany, etc.

NO VOICEOVER. No narration or spoken words. Use simple background music/tune only.

15-sec dark-SaaS data video. Navy bg #0f172a, blue/green accents, world map visualization, bold sans-serif. Spring animations, counter roll-ups, staggered highlights, 0.3s fade transitions.

[0-2s] TITLE: "${s.title} — ${q(domain, 30)}". Navy→blue gradient. Globe icon. Tagline: "${s.tagline}" Footer: GEORepute.ai ${formattedDate}.

[2-6s] KPI DASHBOARD "${s.googleSearchReport}" — 4 animated cards, numbers roll up:
GREEN ${summary.totalClicks.toLocaleString()} ${s.totalClicks} | BLUE ${summary.totalImpressions.toLocaleString()} ${s.totalImpressions} | PURPLE ${summary.avgCtr.toFixed(2)}% ${s.avgCtr} | GRAY ${summary.totalCountries} ${s.regionsAnalyzed}

[6-9s] WORLD MAP visualization — countries colored by performance intensity. Animated pulse on top-performing regions.
${s.topByClicks} (display these full names): ${topClicksList}

[9-12s] SPLIT: LEFT "${s.topByClicks}" (blue glow) — display these full names:
${topClicksList}
RIGHT "${s.topByImpressions}" (green glow) — display these full names: ${topImpressionsList}

[12-15s] CLOSING (blue glow border): ${summary.totalCountries} ${s.closing} Footer: "GEORepute.ai • ${formattedDate}"`.trim();
}

async function downloadAndStoreVideo(xaiVideoUrl: string, userId: string, domainId: string, reportType: string): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${domainId}-${reportType}-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).upload(fileName, videoBuffer, { contentType: "video/mp4", cacheControl: "3600", upsert: true });
    if (error) { console.error("[gvm-video] Upload error:", error); return null; }
    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[gvm-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

// Select-then-update-or-insert (avoids upsert issues with partial unique indexes on report_videos)
async function getVideoRecord(supabase: any, userId: string, domainId: string, reportType: string) {
  const { data, error } = await supabase
    .from("report_videos")
    .select("id, video_url, video_request_id, video_status, video_generated_at, video_requested_at")
    .eq("user_id", userId)
    .eq("report_type", reportType)
    .eq("domain_id", domainId)
    .is("project_id", null)
    .maybeSingle();
  return { data, error };
}

async function upsertVideoRecord(supabase: any, userId: string, domainId: string, reportType: string, updates: Record<string, any>) {
  const { data: existing } = await getVideoRecord(supabase, userId, domainId, reportType);
  if (existing?.id) {
    return supabase.from("report_videos").update(updates).eq("id", existing.id);
  }
  return supabase.from("report_videos").insert({
    user_id: userId,
    report_type: reportType,
    domain_id: domainId,
    project_id: null,
    ...updates,
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domainId");
    const tab = (searchParams.get("tab") || "ai") as TabVariant;
    if (!domainId) return NextResponse.json({ error: "domainId is required" }, { status: 400 });

    const reportType = getReportType(tab);
    const { data: record } = await getVideoRecord(supabase, session.user.id, domainId, reportType);
    if (!record) return NextResponse.json({ success: true, video: null });

    if (record.video_status === "done" && record.video_url) {
      return NextResponse.json({ success: true, video: { url: record.video_url, status: "done", generatedAt: record.video_generated_at } });
    }

    if (record.video_request_id && record.video_status === "pending") {
      const requestedAt = record.video_requested_at ? new Date(record.video_requested_at).getTime() : Date.now() - POLL_TIMEOUT_MS - 1;
      if (Date.now() - requestedAt > POLL_TIMEOUT_MS) {
        await supabase.from("report_videos").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("report_type", reportType).eq("domain_id", domainId);
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
            const storedUrl = await downloadAndStoreVideo(videoUrl, session.user.id, domainId, reportType);
            const finalUrl = storedUrl || videoUrl;
            const now = new Date().toISOString();
            await supabase.from("report_videos").update({ video_url: finalUrl, video_status: "done", video_generated_at: now, video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("report_type", reportType).eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { url: finalUrl, status: "done", generatedAt: now } });
          }

          if (status === "expired" || status === "failed" || status === "error") {
            await supabase.from("report_videos").update({ video_status: "failed", video_request_id: null, video_requested_at: null }).eq("user_id", session.user.id).eq("report_type", reportType).eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
        }
      } catch (pollErr) {
        console.error("[gvm-video] Poll error:", pollErr);
      }
      return NextResponse.json({ success: true, video: { status: "pending", requestId: record.video_request_id } });
    }

    if (record.video_status === "failed") return NextResponse.json({ success: true, video: { status: "failed" } });
    return NextResponse.json({ success: true, video: null });
  } catch (err: any) {
    console.error("[gvm-video] GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed to get video status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { domainId, reportData, reportDataGoogle, language, tab } = body as {
      domainId: string;
      reportData?: ReportData;
      reportDataGoogle?: ReportDataGoogle;
      language?: string;
      tab?: TabVariant;
    };
    if (!domainId) return NextResponse.json({ error: "domainId is required" }, { status: 400 });

    const tabVariant: TabVariant = tab === "google" ? "google" : "ai";
    const reportType = getReportType(tabVariant);

    if (tabVariant === "google") {
      if (!reportDataGoogle) return NextResponse.json({ error: "reportDataGoogle is required for Google tab" }, { status: 400 });
    } else {
      if (!reportData) return NextResponse.json({ error: "reportData is required for AI tab" }, { status: 400 });
    }

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) return NextResponse.json({ error: "XAI_API_KEY is not configured." }, { status: 503 });

    const languageCode = (language || "en").toLowerCase().split("-")[0] || "en";
    const prompt = tabVariant === "google"
      ? buildVideoPromptGoogle(reportDataGoogle!, languageCode)
      : buildVideoPrompt(reportData!, languageCode);
    console.log("[gvm-video] Starting video generation for domain:", (reportData || reportDataGoogle)?.domain, "tab:", tabVariant, "language:", LANGUAGE_NAMES[languageCode?.toLowerCase().split("-")[0] || "en"] || "English");

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
    const { error: dbError } = await upsertVideoRecord(supabase, session.user.id, domainId, reportType, {
      video_request_id: requestId, video_status: "pending", video_url: null, video_generated_at: null, video_requested_at: now,
    });

    if (dbError) {
      console.error("[gvm-video] Failed to create/update report_videos record:", dbError);
      return NextResponse.json({ error: "Failed to save video request. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, requestId, status: "pending" });
  } catch (err: any) {
    console.error("[gvm-video] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to start video generation" }, { status: 500 });
  }
}
