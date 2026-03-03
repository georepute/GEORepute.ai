import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getStrategicBlindSpotsStrings } from "@/lib/video-report-translations";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/** Resolve ffmpeg binary path — Next.js bundling can corrupt ffmpeg-static's path, so we resolve from node_modules */
function getFfmpegPath(): string | null {
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const pkgPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", exe);
  if (fs.existsSync(pkgPath)) return pkgPath;
  try {
    const staticPath = require("ffmpeg-static");
    return typeof staticPath === "string" ? staticPath : null;
  } catch {
    return null;
  }
}

// xAI Aurora video generation API
const XAI_BASE = "https://api.x.ai/v1";
// Supabase storage bucket for videos — create this bucket in Supabase Dashboard → Storage
// SQL migration required:
//   ALTER TABLE blind_spot_reports
//     ADD COLUMN IF NOT EXISTS video_url TEXT,
//     ADD COLUMN IF NOT EXISTS video_request_id TEXT,
//     ADD COLUMN IF NOT EXISTS video_status TEXT,
//     ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMPTZ,
//     ADD COLUMN IF NOT EXISTS video_requested_at TIMESTAMPTZ,
//     ADD COLUMN IF NOT EXISTS video_request_id_part2 TEXT,
//     ADD COLUMN IF NOT EXISTS video_part1_path TEXT;
const VIDEO_BUCKET = "blind-spot-videos";
const POLL_TIMEOUT_MS = 40 * 60 * 1000; // 40 min — sequential: Part 1 + Part 2 + merge

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

const CREATIVE_DIRECTION = `CREATIVE INTENT: This video must leave viewers STUNNED — like the first time they've ever been exposed to something like this. Forget numbers. Forget data. This is about FEELING. A visceral revelation. Documentary-reveal style. Build tension. The goal: viewers should be left speechless. Bold, cinematic, unforgettable. Abstract visuals over charts. Emotion over metrics.`;

const VOICEOVER_PACE = `VOICEOVER: Documentary narrator. Slow, deliberate, revelatory. Poetic. Each line lands with weight. Pause 1.5–2 seconds when each new visual appears. Let the reveal breathe. Like uncovering a hidden truth. No data dumps — only feeling. CRITICAL: The final voiceover line MUST complete fully before the video ends. Never cut off or fade the last words.`;

const GRAPHICS_STYLE = `VISUALS — NO CHARTS, NO DATA, NO NUMBERS. Abstract, cinematic, emotional:
- Background: Deep navy, indigo gradients. High contrast. Cinematic. Moody.
- Typography: Minimal text. Bold when used. No tables, no counts.
- Imagery: Metaphors. Invisibility. Blind spots as shadows, fog, voids. Brand disappearing. Search as emptiness. Abstract shapes, light and shadow.
- Colors: GEORepute palette — blue #3b82f6, teal #14b8a6, purple #8b5cf6. Amber for urgency. Red for alarm. Dark gradients.
- Motion: Cinematic. Slow reveals. 0.4s transitions. Pause 1.5–2 sec before voice. Build tension.`;

function buildVideoPromptPart1(report: ReportData): string {
  const { domain, generatedAt } = report;
  const s = getStrategicBlindSpotsStrings("en").s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${CREATIVE_DIRECTION}

PROFESSIONAL VOICEOVER REQUIRED. English only. ${VOICEOVER_PACE} Cinematic, tension-building music. NO numbers. NO data. ONLY emotion and revelation.

${GRAPHICS_STYLE}

15-sec video. Part 1 of 2. All text in English. DO NOT show charts, graphs, counts, or percentages.

VOICEOVER (poetic, revelatory; pause 1.5–2 sec when each visual appears; final line must complete fully):
[0-4s] [Pause 1.5s] "What you don't know is killing you. ${domain} — invisible where it matters most."
[4-10s] [Pause 1.5s] "You're missing. Entire conversations. AI answers. You're not there. The world is searching. You're a blind spot."
[10-15s] [Pause 1.5s] "These gaps. They're real. They're urgent. Yours to close."

[0-4s] TITLE: "${s.title} — ${domain}". Dark gradient. Bold. Tagline: "${s.tagline}". Hold 1.5s. GEORepute.ai ${formattedDate}.

[4-10s] VISUAL: Abstract. Metaphor of invisibility. Brand name fading into fog. Search results with empty space. Void. Shadow. No numbers. Hold 1.5s.

[10-15s] VISUAL: Urgency. Abstract shapes — red, orange, green. Gaps. Blind spots as voids. Cinematic. No charts. Hold 1.5s.`.trim();
}

function buildVideoPromptPart2(report: ReportData): string {
  const { domain, generatedAt } = report;
  const s = getStrategicBlindSpotsStrings("en").s;
  const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${CREATIVE_DIRECTION}

PROFESSIONAL VOICEOVER REQUIRED. English only. ${VOICEOVER_PACE} Cinematic music continues. NO numbers. NO data. ONLY emotion and revelation.

${GRAPHICS_STYLE}

15-sec video. Part 2 of 2. All text in English. DO NOT show charts, graphs, counts, or percentages.

VOICEOVER (poetic, revelatory; pause 1.5–2 sec when each visual appears; final line must complete fully):
[0-8s] [Pause 1.5s] "Some gaps ignore you. AI answers. You're not in them. Others mention you. The split is real. The gap is yours."
[8-15s] [Pause 1.5s] "Your move. Close the gaps. Prioritize. Start. GEORepute.ai."

[0-8s] VISUAL: Abstract. Split concept — AI ignoring vs AI mentioning. Metaphor. Light and shadow. No numbers. No charts. Hold 1.5s.

[8-15s] CONCLUSION (7 sec): Abstract. "Your move. Close the gaps. Prioritize. Start." Minimal text. Bold. Footer: "GEORepute.ai • ${formattedDate}". Hold 1.5s.`.trim();
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function downloadAndStoreVideo(
  xaiVideoUrl: string,
  userId: string,
  domainId: string,
  suffix = ""
): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const videoRes = await fetch(xaiVideoUrl);
    if (!videoRes.ok) return null;

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const fileName = `${userId}/${domainId}-${Date.now()}${suffix}.mp4`;

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

    const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[blind-spot-video] downloadAndStoreVideo error:", err);
    return null;
  }
}

/** Upload video buffer to storage and return the storage path (for Part 1 in sequential flow). */
async function uploadPartToStorage(
  buffer: Buffer,
  userId: string,
  domainId: string
): Promise<string | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const fileName = `${userId}/${domainId}-part1-${Date.now()}.mp4`;
    const { error } = await supabaseAdmin.storage
      .from(VIDEO_BUCKET)
      .upload(fileName, buffer, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: true,
      });
    if (error) {
      console.error("[blind-spot-video] uploadPartToStorage error:", error);
      return null;
    }
    return fileName;
  } catch (err) {
    console.error("[blind-spot-video] uploadPartToStorage error:", err);
    return null;
  }
}

/** Download video from Supabase storage by path. */
async function downloadFromStorage(storagePath: string): Promise<Buffer | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage.from(VIDEO_BUCKET).download(storagePath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch (err) {
    console.error("[blind-spot-video] downloadFromStorage error:", err);
    return null;
  }
}

async function mergeTwoVideos(
  part1Buffer: Buffer,
  part2Buffer: Buffer
): Promise<Buffer | null> {
  const tmpDir = os.tmpdir();
  const part1Path = path.join(tmpDir, `part1-${Date.now()}.mp4`);
  const part2Path = path.join(tmpDir, `part2-${Date.now()}.mp4`);
  const listPath = path.join(tmpDir, `list-${Date.now()}.txt`);
  const outPath = path.join(tmpDir, `merged-${Date.now()}.mp4`);

  try {
    fs.writeFileSync(part1Path, part1Buffer);
    fs.writeFileSync(part2Path, part2Buffer);
    const p1 = part1Path.replace(/\\/g, "/");
    const p2 = part2Path.replace(/\\/g, "/");
    fs.writeFileSync(listPath, `file '${p1}'\nfile '${p2}'`);

    const ffmpegPath = getFfmpegPath();
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(outPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    const merged = fs.readFileSync(outPath);
    fs.unlinkSync(part1Path);
    fs.unlinkSync(part2Path);
    fs.unlinkSync(listPath);
    fs.unlinkSync(outPath);
    return merged;
  } catch (err) {
    console.error("[blind-spot-video] mergeVideos error:", err);
    try {
      if (fs.existsSync(part1Path)) fs.unlinkSync(part1Path);
      if (fs.existsSync(part2Path)) fs.unlinkSync(part2Path);
      if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } catch {}
    return null;
  }
}

// GET — return current video status/URL; if pending, poll xAI and finalize if ready
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
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
      .select("video_url, video_request_id, video_request_id_part2, video_status, video_generated_at, video_requested_at, video_part1_path")
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

    const requestedAt = report.video_requested_at
      ? new Date(report.video_requested_at).getTime()
      : Date.now() - POLL_TIMEOUT_MS - 1;
    const elapsed = Date.now() - requestedAt;

    if (elapsed > POLL_TIMEOUT_MS && (report.video_status === "pending_part1" || report.video_status === "pending_part2")) {
      console.log("[blind-spot-video] Poll timeout, marking failed");
      await supabase
        .from("blind_spot_reports")
        .update({
          video_status: "failed",
          video_request_id: null,
          video_request_id_part2: null,
          video_requested_at: null,
          video_part1_path: null,
        })
        .eq("user_id", session.user.id)
        .eq("domain_id", domainId);
      return NextResponse.json({ success: true, video: { status: "failed" } });
    }

    const xaiApiKey = process.env.XAI_API_KEY;

    // Sequential: pending_part1 — poll Part 1, when done store it and start Part 2
    if (report.video_status === "pending_part1" && report.video_request_id && xaiApiKey) {
      try {
        const res1 = await fetch(`${XAI_BASE}/videos/${report.video_request_id}`, {
          headers: { Authorization: `Bearer ${xaiApiKey}` },
        });
        const data1 = res1.ok ? await res1.json().catch(() => ({})) : {};
        const url1 = data1.video?.url ?? data1.output?.url ?? data1.result?.url ?? data1.url;
        const status1 = data1.status ?? data1.state ?? data1.phase;

        if (status1 === "expired" || status1 === "failed" || status1 === "error") {
          await supabase
            .from("blind_spot_reports")
            .update({ video_status: "failed", video_request_id: null, video_requested_at: null, video_part1_path: null })
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId);
          return NextResponse.json({ success: true, video: { status: "failed" } });
        }

        if (url1) {
          const part1Res = await fetch(url1);
          if (!part1Res.ok) {
            await supabase
              .from("blind_spot_reports")
              .update({ video_status: "failed", video_request_id: null, video_requested_at: null })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
          const part1Buffer = Buffer.from(await part1Res.arrayBuffer());
          const part1Path = await uploadPartToStorage(part1Buffer, session.user.id, domainId);
          if (!part1Path) {
            await supabase
              .from("blind_spot_reports")
              .update({ video_status: "failed", video_request_id: null, video_requested_at: null })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }

          const { data: dbReport } = await supabase
            .from("blind_spot_reports")
            .select("blind_spots, domain_hostname, total_blind_spots, avg_blind_spot_score, ai_blind_spot_pct, engines_used, generated_at")
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId)
            .single();

          if (!dbReport) {
            await supabase
              .from("blind_spot_reports")
              .update({ video_status: "failed", video_request_id: null, video_requested_at: null, video_part1_path: null })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }

          const blindSpots = dbReport.blind_spots || [];
          const enginesUsed = dbReport.engines_used || [];
          const perLlmStats: Record<string, { mentioned: number; total: number; pct: number }> = {};
          for (const engineKey of enginesUsed) {
            const withEngine = blindSpots.filter((b: any) => b?.llmMentions && engineKey in b.llmMentions);
            const mentioned = withEngine.filter((b: any) => b.llmMentions[engineKey]).length;
            const total = withEngine.length;
            perLlmStats[engineKey] = {
              mentioned,
              total,
              pct: total > 0 ? Math.round((mentioned / total) * 1000) / 10 : 0,
            };
          }
          const reportData: ReportData = {
            domain: dbReport.domain_hostname,
            blindSpots,
            summary: {
              totalBlindSpots: dbReport.total_blind_spots,
              avgBlindSpotScore: Number(dbReport.avg_blind_spot_score),
              aiBlindSpotPct: Number(dbReport.ai_blind_spot_pct),
              perLlmStats,
            },
            enginesUsed,
            generatedAt: dbReport.generated_at,
          };

          const prompt2 = buildVideoPromptPart2(reportData);
          const genRes2 = await fetch(`${XAI_BASE}/videos/generations`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${xaiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-imagine-video",
              duration: 15,
              aspect_ratio: "16:9",
              resolution: "720p",
              prompt: prompt2,
            }),
          });
          const genData2 = await genRes2.json().catch(() => ({}));
          const requestId2 = genRes2.ok ? (genData2.id ?? genData2.request_id ?? genData2.requestId) : null;

          if (!requestId2) {
            console.error("[blind-spot-video] Part 2 start failed");
            await supabase
              .from("blind_spot_reports")
              .update({ video_status: "failed", video_request_id: null, video_requested_at: null, video_part1_path: null })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }

          await supabase
            .from("blind_spot_reports")
            .update({
              video_request_id: requestId2,
              video_request_id_part2: null,
              video_status: "pending_part2",
              video_part1_path: part1Path,
            })
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId);

          console.log("[blind-spot-video] Part 1 done, Part 2 started (sequential):", requestId2);
        }
      } catch (pollErr) {
        console.error("[blind-spot-video] Poll Part 1 error:", pollErr);
      }
      return NextResponse.json({
        success: true,
        video: { status: "pending", requestId: report.video_request_id },
      });
    }

    // Sequential: pending_part2 — poll Part 2, when done merge with Part 1 and finalize
    if (report.video_status === "pending_part2" && report.video_request_id && report.video_part1_path && xaiApiKey) {
      try {
        const res2 = await fetch(`${XAI_BASE}/videos/${report.video_request_id}`, {
          headers: { Authorization: `Bearer ${xaiApiKey}` },
        });
        const data2 = res2.ok ? await res2.json().catch(() => ({})) : {};
        const url2 = data2.video?.url ?? data2.output?.url ?? data2.result?.url ?? data2.url;
        const status2 = data2.status ?? data2.state ?? data2.phase;

        if (status2 === "expired" || status2 === "failed" || status2 === "error") {
          await supabase
            .from("blind_spot_reports")
            .update({
              video_status: "failed",
              video_request_id: null,
              video_request_id_part2: null,
              video_requested_at: null,
              video_part1_path: null,
            })
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId);
          return NextResponse.json({ success: true, video: { status: "failed" } });
        }

        if (url2) {
          const part1Buffer = await downloadFromStorage(report.video_part1_path);
          const part2Res = await fetch(url2);
          if (!part1Buffer || !part2Res.ok) {
            await supabase
              .from("blind_spot_reports")
              .update({
                video_status: "failed",
                video_request_id: null,
                video_request_id_part2: null,
                video_requested_at: null,
                video_part1_path: null,
              })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }
          const part2Buffer = Buffer.from(await part2Res.arrayBuffer());
          const mergedBuffer = await mergeTwoVideos(part1Buffer, part2Buffer);

          if (!mergedBuffer) {
            await supabase
              .from("blind_spot_reports")
              .update({
                video_status: "failed",
                video_request_id: null,
                video_request_id_part2: null,
                video_requested_at: null,
                video_part1_path: null,
              })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }

          const supabaseAdmin = getSupabaseAdmin();
          const fileName = `${session.user.id}/${domainId}-${Date.now()}.mp4`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from(VIDEO_BUCKET)
            .upload(fileName, mergedBuffer, {
              contentType: "video/mp4",
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadErr) {
            console.error("[blind-spot-video] Final upload error:", uploadErr);
            await supabase
              .from("blind_spot_reports")
              .update({
                video_status: "failed",
                video_request_id: null,
                video_request_id_part2: null,
                video_requested_at: null,
                video_part1_path: null,
              })
              .eq("user_id", session.user.id)
              .eq("domain_id", domainId);
            return NextResponse.json({ success: true, video: { status: "failed" } });
          }

          const { data: urlData } = supabaseAdmin.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
          const now = new Date().toISOString();

          await supabase
            .from("blind_spot_reports")
            .update({
              video_url: urlData.publicUrl,
              video_status: "done",
              video_generated_at: now,
              video_request_id: null,
              video_request_id_part2: null,
              video_requested_at: null,
              video_part1_path: null,
            })
            .eq("user_id", session.user.id)
            .eq("domain_id", domainId);

          console.log("[blind-spot-video] Merged 30s video ready (sequential)");
          return NextResponse.json({
            success: true,
            video: { url: urlData.publicUrl, status: "done", generatedAt: now },
          });
        }
      } catch (pollErr) {
        console.error("[blind-spot-video] Poll Part 2 error:", pollErr);
      }
      return NextResponse.json({
        success: true,
        video: { status: "pending", requestId: report.video_request_id },
      });
    }

    if (report.video_request_id && !xaiApiKey) {
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

// POST — start Part 1 only (sequential: Part 2 starts after Part 1 completes, via GET poll)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { domainId, reportData: reportDataFromClient } = body as { domainId: string; reportData?: ReportData };

    if (!domainId) {
      return NextResponse.json(
        { error: "domainId is required" },
        { status: 400 }
      );
    }

    // Use live data from DB — ensures video reflects current report, not stale client state
    const { data: dbReport, error: fetchError } = await supabase
      .from("blind_spot_reports")
      .select("blind_spots, domain_hostname, total_blind_spots, avg_blind_spot_score, ai_blind_spot_pct, engines_used, generated_at")
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId)
      .single();

    if (fetchError || !dbReport) {
      return NextResponse.json(
        { error: "No report found. Generate a report first." },
        { status: 404 }
      );
    }

    const blindSpots = dbReport.blind_spots || [];
    const enginesUsed = dbReport.engines_used || [];
    const perLlmStats: Record<string, { mentioned: number; total: number; pct: number }> = {};
    for (const engineKey of enginesUsed) {
      const withEngine = blindSpots.filter((b: any) => b?.llmMentions && engineKey in b.llmMentions);
      const mentioned = withEngine.filter((b: any) => b.llmMentions[engineKey]).length;
      const total = withEngine.length;
      perLlmStats[engineKey] = {
        mentioned,
        total,
        pct: total > 0 ? Math.round((mentioned / total) * 1000) / 10 : 0,
      };
    }

    const reportData: ReportData = {
      domain: dbReport.domain_hostname,
      blindSpots,
      summary: {
        totalBlindSpots: dbReport.total_blind_spots,
        avgBlindSpotScore: Number(dbReport.avg_blind_spot_score),
        aiBlindSpotPct: Number(dbReport.ai_blind_spot_pct),
        perLlmStats,
      },
      enginesUsed,
      generatedAt: dbReport.generated_at,
    };

    const xaiApiKey = process.env.XAI_API_KEY;
    if (!xaiApiKey) {
      return NextResponse.json(
        { error: "XAI_API_KEY is not configured. Add it to your .env.local file." },
        { status: 503 }
      );
    }

    const prompt1 = buildVideoPromptPart1(reportData);
    const headers = {
      Authorization: `Bearer ${xaiApiKey}`,
      "Content-Type": "application/json",
    };
    const bodyTemplate = { model: "grok-imagine-video", duration: 15, aspect_ratio: "16:9", resolution: "720p" };

    console.log("[blind-spot-video] Starting Part 1 (sequential) for domain:", reportData.domain);

    const genRes1 = await fetch(`${XAI_BASE}/videos/generations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...bodyTemplate, prompt: prompt1 }),
    });

    const genData1 = await genRes1.json().catch(() => ({}));
    const requestId1 = genRes1.ok ? (genData1.id ?? genData1.request_id ?? genData1.requestId) : null;

    if (!requestId1) {
      const err1 = !genRes1.ok ? (genData1 as any)?.error?.message || genRes1.statusText : null;
      console.error("[blind-spot-video] Part 1 start failed:", err1);
      return NextResponse.json(
        { error: err1 || "Failed to start video generation. Please try again." },
        { status: 502 }
      );
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("blind_spot_reports")
      .update({
        video_request_id: requestId1,
        video_request_id_part2: null,
        video_status: "pending_part1",
        video_url: null,
        video_generated_at: null,
        video_requested_at: now,
        video_part1_path: null,
      })
      .eq("user_id", session.user.id)
      .eq("domain_id", domainId);

    if (updateError) {
      console.error("[blind-spot-video] DB update error:", updateError);
    }

    console.log("[blind-spot-video] Part 1 started (sequential):", requestId1);
    return NextResponse.json({ success: true, requestId: requestId1, status: "pending" });
  } catch (err: any) {
    console.error("[blind-spot-video] POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to start video generation" },
      { status: 500 }
    );
  }
}
