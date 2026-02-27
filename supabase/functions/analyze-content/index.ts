/**
 * analyze-content Edge Function
 * Called by brand-analysis to analyze website HTML and return a result
 * stored in brand_analysis_website_analysis. Minimal implementation:
 * extracts title/meta from HTML and returns a small analysis object.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function extractFromHtml(html: string): { title?: string; description?: string; summary?: string } {
  const result: { title?: string; description?: string; summary?: string } = {};
  if (!html || typeof html !== "string") return result;
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) result.title = titleMatch[1].trim().slice(0, 500);
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  if (metaDesc) result.description = metaDesc[1].trim().slice(0, 1000);
  result.summary = result.description || result.title || "Website content received.";
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json();
    const url = body?.url ?? "";
    const html = body?.html ?? "";
    const extracted = extractFromHtml(html);
    const analysisResult = {
      url,
      title: extracted.title,
      description: extracted.description,
      summary: extracted.summary,
      analyzed_at: new Date().toISOString(),
    };
    return new Response(JSON.stringify(analysisResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
