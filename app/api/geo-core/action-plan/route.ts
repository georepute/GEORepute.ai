import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { enrichDomainData } from "@/lib/utils/domainEnrichment";

// Import without type to avoid potential issues
let generateActionPlan: any;
try {
  const geoCore = require("@/lib/ai/geoCore");
  generateActionPlan = geoCore.generateActionPlan;
} catch (error) {
  console.error("Failed to import geoCore:", error);
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { objective, targetKeywords, domain, region, channels, projectId, language, intelligenceContext } = body;
    
    // If projectId is provided, fetch crawler data from brand_analysis_projects
    let projectCrawlerData = null;
    let projectName = null;
    if (projectId) {
      try {
        const { data: project, error: projectError } = await supabase
          .from('brand_analysis_projects')
          .select('id, brand_name, industry, website_url, company_description, company_image_url')
          .eq('id', projectId)
          .eq('user_id', session.user.id)
          .single();
        
        if (!projectError && project) {
          projectName = project.brand_name;
          projectCrawlerData = {
            domain: project.website_url || domain,
            description: project.company_description,
            metadata: {
              title: project.brand_name,
              metaDescription: project.company_description?.substring(0, 160),
            },
            websiteContent: project.company_description?.substring(0, 2000),
            hasContent: !!project.company_description,
          };
          console.log(`✅ Using crawler data from project: ${project.brand_name}`);
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      }
    }

    // ── Fetch GSC Keywords (project-linked, from gsc_keywords table) ──
    let gscKeywords: any[] = [];
    if (projectId) {
      try {
        const { data: kwData } = await supabase
          .from("gsc_keywords")
          .select("keyword, clicks, impressions, ctr, position")
          .eq("project_id", projectId)
          .order("impressions", { ascending: false })
          .limit(30);
        gscKeywords = kwData || [];
        if (gscKeywords.length > 0)
          console.log(`✅ Loaded ${gscKeywords.length} GSC keywords for project`);
      } catch (e) {
        console.error("Error fetching gsc_keywords:", e);
      }
    }

    // ── Fetch GSC Queries + Pages (domain-linked, via domains table) ──
    // Fetch ALL rows then aggregate by query/page — identical to GSC Analytics page logic
    let gscQueries: any[] = [];
    let gscPages: any[] = [];
    let domainIdForGSC: string | null = null;
    try {
      const rawDomain = (projectCrawlerData?.domain || domain || "")
        .replace(/https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .trim();

      // Prefer domain_id from the project itself (brand_analysis_projects.domain_id)
      if (projectCrawlerData?.domain || rawDomain) {
        const { data: domainRow } = await supabase
          .from("domains")
          .select("id")
          .or(`domain.ilike.%${rawDomain}%,domain.eq.${rawDomain}`)
          .limit(1)
          .maybeSingle();
        domainIdForGSC = domainRow?.id || null;
      }

      if (domainIdForGSC) {
        console.log(`✅ Found domain_id ${domainIdForGSC} for ${rawDomain}`);

        const [queriesRes, pagesRes] = await Promise.all([
          supabase
            .from("gsc_queries")
            .select("query, clicks, impressions, ctr, position")
            .eq("domain_id", domainIdForGSC)
            .eq("user_id", session.user.id),
          supabase
            .from("gsc_pages")
            .select("page, clicks, impressions, ctr, position")
            .eq("domain_id", domainIdForGSC)
            .eq("user_id", session.user.id),
        ]);

        // Aggregate by query name (sum clicks+impressions, average position) — matches GSC Analytics
        const queryMap = new Map<string, any>();
        for (const r of queriesRes.data || []) {
          const key = r.query;
          if (queryMap.has(key)) {
            const e = queryMap.get(key)!;
            e.clicks += r.clicks || 0;
            e.impressions += r.impressions || 0;
            e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
            e.position = (e.position + (r.position || 0)) / 2;
          } else {
            queryMap.set(key, { keyword: key, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 });
          }
        }
        gscQueries = Array.from(queryMap.values()).sort((a, b) => b.impressions - a.impressions);

        // Aggregate by page URL
        const pageMap = new Map<string, any>();
        for (const r of pagesRes.data || []) {
          const key = r.page;
          if (pageMap.has(key)) {
            const e = pageMap.get(key)!;
            e.clicks += r.clicks || 0;
            e.impressions += r.impressions || 0;
            e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0;
            e.position = (e.position + (r.position || 0)) / 2;
          } else {
            pageMap.set(key, { page: key, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 });
          }
        }
        gscPages = Array.from(pageMap.values()).sort((a, b) => b.clicks - a.clicks);
        console.log(`✅ Aggregated to ${gscQueries.length} unique queries, ${gscPages.length} unique pages`);
      }
    } catch (e) {
      console.error("Error fetching GSC queries/pages:", e);
    }

    // ── Fetch AI Visibility Data (from latest brand_analysis_session) ──
    let aiVisibilityData: any[] = [];
    let aiSessionSummary: { total_queries: number; total_mentions: number } | null = null;
    if (projectId) {
      try {
        const { data: sessions } = await supabase
          .from("brand_analysis_sessions")
          .select("id, results_summary, total_queries")
          .eq("project_id", projectId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        if (sessions && sessions.length > 0) {
          const latestSession = sessions[0];
          // Compute session totals — used for mention rate calculation
          const sessionTotalQueries = latestSession.results_summary?.total_queries
            || latestSession.total_queries
            || 0;
          const { data: aiResponses } = await supabase
            .from("ai_platform_responses")
            .select("platform, prompt, response, gap_suggestion, response_metadata")
            .eq("project_id", projectId)
            .eq("session_id", latestSession.id);
          aiVisibilityData = aiResponses || [];
          // Count brand mentions using the same flag as AI Visibility page
          const mentionedCount = aiVisibilityData.filter(
            (r: any) => r.response_metadata?.brand_mentioned === true
          ).length;
          const totalForRate = sessionTotalQueries || aiVisibilityData.length;
          aiSessionSummary = {
            total_queries: totalForRate,
            total_mentions: mentionedCount,
          };
          console.log(`✅ Loaded ${aiVisibilityData.length} AI responses; ${mentionedCount}/${totalForRate} mention brand`);
        }
      } catch (e) {
        console.error("Error fetching AI visibility data:", e);
      }
    }

    // ── Fetch strategic report data (blind spots, market share, gap analysis) ──
    let blindSpotSummary = "";
    let marketShareSummary = "";
    let gapAnalysisSummary = "";

    if (intelligenceContext) {
      // Use pre-fetched intelligence data from the frontend
      const reports = intelligenceContext.reports || {};
      const scores = intelligenceContext.scores || {};
      const priorities = intelligenceContext.decisionLogic?.priorities || [];

      const scoreEntries = Object.entries(scores)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: ${v}/100`)
        .join(", ");

      blindSpotSummary = reports.riskMatrix?.available && reports.riskMatrix?.details
        ? `\n🛡️ RISK & BLIND SPOT ANALYSIS:\nRisk coverage score: ${reports.riskMatrix.score}/100.\n${
            reports.riskMatrix.details.totalBlindSpots
              ? `Total blind spots: ${reports.riskMatrix.details.totalBlindSpots} (${reports.riskMatrix.details.highPriority} high priority).`
              : ""
          }${
            reports.riskMatrix.details.topBlindSpots?.length
              ? `\nTop blind spots: ${reports.riskMatrix.details.topBlindSpots.map((b: any) => `"${b.query}" (score: ${b.score}, ${b.priority})`).join(", ")}`
              : ""
          }\nYou MUST create steps that specifically address these blind spots — create content targeting these exact queries to close visibility gaps.\n`
        : "";

      marketShareSummary = reports.shareOfAttention?.available && reports.shareOfAttention?.details
        ? `\n📊 SHARE OF ATTENTION:\nShare of attention score: ${reports.shareOfAttention.score}/100.\n${
            reports.shareOfAttention.details.aiMentionShare != null
              ? `AI mention share: ${reports.shareOfAttention.details.aiMentionShare}%, Organic share: ${reports.shareOfAttention.details.organicShare}%.`
              : ""
          }${
            reports.shareOfAttention.details.isDefaultLeader ? " Brand is the default leader in market." : ""
          }\nYou MUST create steps to increase share of attention in areas where competitors dominate.\n`
        : "";

      gapAnalysisSummary = reports.gapAnalysis?.available && reports.gapAnalysis?.details
        ? `\n🔍 AI vs GOOGLE GAP ANALYSIS:\nGap alignment score: ${reports.gapAnalysis.score}/100.\n${
            reports.gapAnalysis.details.bandDistribution
              ? `Distribution: ${Object.entries(reports.gapAnalysis.details.bandDistribution).map(([k, v]) => `${k}: ${v}`).join(", ")}.`
              : ""
          }${
            reports.gapAnalysis.details.topGaps?.length
              ? `\nTop gaps: ${reports.gapAnalysis.details.topGaps.map((g: any) => `"${g.query}" (gap: ${g.gapScore}, band: ${g.band})`).join(", ")}`
              : ""
          }\nYou MUST create steps targeting queries with the largest AI-vs-Google gap to recapture lost visibility.\n`
        : "";

      if (priorities.length > 0 || scoreEntries) {
        blindSpotSummary = `\n🎯 STRATEGIC INTELLIGENCE SCORES:\n${scoreEntries}\n\n🚨 STRATEGIC PRIORITIES (from Decision Logic Engine — address ALL of these):\n${
          priorities.map((p: any, i: number) => `${i + 1}. [${p.urgency.toUpperCase()}] ${p.area}: ${p.reason}`).join("\n")
        }\n` + blindSpotSummary;
      }
    } else if (projectId) {
      // Fallback: fetch reports from DB when no intelligenceContext provided
      try {
        let domainId: string | null = null;
        const rawDomain = (projectCrawlerData?.domain || domain || "")
          .replace(/https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split("/")[0]
          .trim();

        if (rawDomain) {
          const { data: domainRow } = await supabase
            .from("domains")
            .select("id")
            .or(`domain.ilike.%${rawDomain}%,domain.eq.${rawDomain}`)
            .limit(1)
            .maybeSingle();
          domainId = domainRow?.id || null;
        }

        if (domainId) {
          const [bsRes, msRes, gapRes] = await Promise.all([
            supabase.from("blind_spot_reports").select("total_blind_spots, avg_blind_spot_score, blind_spots").eq("domain_id", domainId).order("created_at", { ascending: false }).limit(1),
            supabase.from("market_share_reports").select("market_share_score, ai_mention_share_pct, organic_share_pct, is_default_leader").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1),
            supabase.from("ai_google_gap_reports").select("queries, avg_gap_score").eq("domain_id", domainId).order("created_at", { ascending: false }).limit(1),
          ]);

          const bsReport = bsRes.data?.[0];
          if (bsReport) {
            const topBs = (bsReport.blind_spots || [])
              .sort((a: any, b: any) => (b.blind_spot_score || 0) - (a.blind_spot_score || 0))
              .slice(0, 5);
            blindSpotSummary = `\n🛡️ BLIND SPOT REPORT: ${bsReport.total_blind_spots || 0} blind spots found (avg score: ${bsReport.avg_blind_spot_score || 0}).\nTop: ${topBs.map((b: any) => `"${b.query}" (${b.priority})`).join(", ")}.\nCreate steps to close these visibility gaps.\n`;
          }

          const msReport = msRes.data?.[0];
          if (msReport) {
            marketShareSummary = `\n📊 MARKET SHARE: Score ${msReport.market_share_score}/100, AI mention ${msReport.ai_mention_share_pct}%, Organic ${msReport.organic_share_pct}%.${msReport.is_default_leader ? " Default leader." : ""}\n`;
          }

          const gapReport = gapRes.data?.[0];
          if (gapReport && gapReport.queries) {
            const topGaps = gapReport.queries
              .filter((q: any) => q.band === "ai_risk" || q.band === "moderate_gap")
              .sort((a: any, b: any) => Math.abs(b.gap_score || 0) - Math.abs(a.gap_score || 0))
              .slice(0, 5);
            gapAnalysisSummary = `\n🔍 GAP ANALYSIS: avg gap score ${gapReport.avg_gap_score || 0}.\nTop gaps: ${topGaps.map((g: any) => `"${g.query}" (${g.band}, gap: ${g.gap_score})`).join(", ")}.\nTarget these queries to close AI-vs-Google gaps.\n`;
          }
        }
      } catch (e) {
        console.error("Error fetching report data for plan context:", e);
      }
    }

    if (!objective) {
      return NextResponse.json(
        { error: "Objective is required" },
        { status: 400 }
      );
    }

    // Check if AI function is available
    if (!generateActionPlan) {
      console.error("generateActionPlan function not available");
      return NextResponse.json(
        { error: "AI service not available. Check OpenAI setup." },
        { status: 500 }
      );
    }

    // Enrich domain data - use project crawler data if available, otherwise crawl
    let domainEnrichment = null;
    
    // Priority 1: Use crawler data from selected project (if available)
    if (projectCrawlerData && projectCrawlerData.hasContent) {
      domainEnrichment = projectCrawlerData;
      console.log(`✅ Using crawler data from selected project`);
    } 
    // Priority 2: Crawl domain if no project data available
    else if (domain && !projectCrawlerData) {
      try {
        console.log(`🌐 Enriching domain data for: ${domain}`);
        domainEnrichment = await enrichDomainData(domain);
        if (domainEnrichment?.hasContent) {
          console.log(`✅ Domain enrichment completed for ${domain}`);
        } else {
          console.log(`⚠️ Domain enrichment returned no content for ${domain}`);
        }
      } catch (error) {
        console.error("Domain enrichment failed (continuing with basic domain):", error);
        // Continue with basic domain string if enrichment fails
      }
    }

    // Build rich situational context from all available intelligence data
    const intelligenceSituation = [
      blindSpotSummary,
      marketShareSummary,
      gapAnalysisSummary,
    ].filter(Boolean).join("\n");

    // Generate action plan with AI (multi-channel support, Claude Sonnet 4.5)
    const result = await generateActionPlan({
      objective,
      targetKeywords: targetKeywords || [],
      domain,
      domainEnrichment,
      region,
      channels: channels || ['all'],
      language: language || 'en',
      currentSituation: intelligenceSituation || undefined,
      gscKeywords: gscKeywords.length > 0 ? gscKeywords : undefined,
      gscQueries: gscQueries.length > 0 ? gscQueries : undefined,
      gscPages: gscPages.length > 0 ? gscPages : undefined,
      aiVisibilityData: aiVisibilityData.length > 0 ? aiVisibilityData : undefined,
      aiSessionSummary: aiSessionSummary || undefined,
    });

    // Map AI output steps to frontend format with execution metadata
    // AI returns: { id, title, description, estimatedTime, priority, dependencies, channel, platform, executionType, executionMetadata }
    // Frontend expects: { step, description, priority, estimatedImpact, completed, executionType, executionMetadata }
    const mappedSteps = result.steps.map((step: any) => ({
      step: step.title || step.step || "",
      description: step.description || "",
      priority: step.priority || "medium",
      estimatedImpact: step.estimatedTime || step.estimatedImpact || "Not specified",
      completed: false,
      // Keep original fields for reference
      id: step.id,
      estimatedTime: step.estimatedTime,
      dependencies: step.dependencies || [],
      // Execution metadata
      channel: step.channel,
      platform: step.platform,
      executionType: step.executionType || "manual",
      executionMetadata: step.executionMetadata || {
        autoExecute: false,
        executionStatus: "pending",
      },
    }));

    // Calculate execution metadata
    const executableSteps = mappedSteps.filter((s: any) => s.executionMetadata?.autoExecute === true);
    const automatedSteps = mappedSteps.filter(
      (s: any) => s.executionType === "content_generation" && s.executionMetadata?.autoExecute === true
    );
    const manualSteps = mappedSteps.filter((s: any) => !s.executionMetadata?.autoExecute);

    // Save to database with execution metadata
    let savedPlanId = null;
    try {
      // Build insert object - store project info in execution_metadata since columns don't exist
      const insertData: any = {
        user_id: session.user.id,
        title: result.title,
        objective: result.objective,
        steps: mappedSteps, // Store mapped steps with completion status and execution metadata
        reasoning: result.reasoning,
        expected_outcome: result.expectedOutcome,
        timeline: result.timeline,
        priority: result.priority,
        category: result.category,
        status: "active",
        target_keywords: targetKeywords || [],
        channel_types: result.channels || [],
        domain_url: domain || null,
        region: region || null,
        seo_geo_classification: result.seo_geo_classification || null,
        target_keyword_phrase: result.target_keyword_phrase || targetKeywords?.[0] || null,
        expected_timeline_months: result.expected_timeline_months || null,
        safety_buffer_months: result.safety_buffer_months || null,
        first_page_estimate_months: result.first_page_estimate_months || null,
        context_explanation: result.context_explanation || null,
        execution_metadata: {
          total_executable_steps: executableSteps.length,
          automated_steps_count: automatedSteps.length,
          manual_steps_count: manualSteps.length,
          project_id: projectId || null,
          project_name: projectName || null,
          business_plan_data: result.businessPlanData || null,
        },
      };

      const { data, error } = await supabase
        .from("action_plan")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Database insert error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        savedPlanId = null;
      } else {
        savedPlanId = data?.id;
        console.log("✅ Action plan saved successfully with ID:", savedPlanId);
        console.log("📝 Saved project info in execution_metadata - project_id:", projectId, "project_name:", projectName);
      }
    } catch (dbError: any) {
      console.error("Database save failed:", dbError);
      // Still return the plan to frontend, but log the error
      // Frontend can still use it temporarily, but it won't persist
      savedPlanId = null;
    }

    return NextResponse.json(
      {
        planId: savedPlanId || Date.now().toString(),
        title: result.title,
        objective: result.objective,
        channels: result.channels || [],
        seo_geo_classification: result.seo_geo_classification,
        target_keyword_phrase: result.target_keyword_phrase || targetKeywords?.[0],
        expected_timeline_months: result.expected_timeline_months,
        safety_buffer_months: result.safety_buffer_months,
        first_page_estimate_months: result.first_page_estimate_months,
        context_explanation: result.context_explanation,
        steps: mappedSteps,
        reasoning: result.reasoning,
        expectedOutcome: result.expectedOutcome,
        timeline: result.timeline,
        priority: result.priority,
        category: result.category,
        domain: domain,
        region: region,
        projectId: projectId || undefined,
        projectName: projectName || undefined,
        businessPlanData: result.businessPlanData || undefined,
        saved: !!savedPlanId,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Action plan API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's action plans
    const { data, error } = await supabase
      .from("action_plan")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    // Format plans for frontend - map database fields to frontend format
    // project_id/project_name live inside execution_metadata JSONB, not as top-level columns
    const formattedPlans = (data || []).map((plan: any) => {
      const execMeta = plan.execution_metadata || {};
      return {
        id: plan.id,
        planId: plan.id,
        title: plan.title,
        objective: plan.objective,
        channels: plan.channel_types || [],
        seo_geo_classification: plan.seo_geo_classification || undefined,
        target_keyword_phrase: plan.target_keyword_phrase || undefined,
        expected_timeline_months: plan.expected_timeline_months || undefined,
        safety_buffer_months: plan.safety_buffer_months || undefined,
        first_page_estimate_months: plan.first_page_estimate_months || undefined,
        context_explanation: plan.context_explanation || undefined,
        steps: plan.steps || [],
        reasoning: plan.reasoning || "",
        expectedOutcome: plan.expected_outcome || "",
        timeline: plan.timeline || "",
        priority: plan.priority || "medium",
        category: plan.category || "General",
        createdAt: plan.created_at ? new Date(plan.created_at) : new Date(),
        status: plan.status || "active",
        domain: plan.domain_url,
        region: plan.region,
        projectId: execMeta.project_id || undefined,
        projectName: execMeta.project_name || undefined,
        executionMetadata: execMeta,
        businessPlanData: execMeta.business_plan_data || undefined,
      };
    });

    return NextResponse.json({ plans: formattedPlans }, { status: 200 });
  } catch (error: any) {
    console.error("Action plans GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { planId, steps, status: planStatus, ...otherUpdates } = body;

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};

    // Update steps if provided
    if (steps) {
      updateData.steps = steps;
    }

    // Update status if provided
    if (planStatus) {
      updateData.status = planStatus;
    }

    // Update other fields if provided
    if (otherUpdates.title) updateData.title = otherUpdates.title;
    if (otherUpdates.objective) updateData.objective = otherUpdates.objective;
    if (otherUpdates.reasoning) updateData.reasoning = otherUpdates.reasoning;
    if (otherUpdates.expected_outcome) updateData.expected_outcome = otherUpdates.expected_outcome;
    if (otherUpdates.expectedOutcome) updateData.expected_outcome = otherUpdates.expectedOutcome;
    if (otherUpdates.timeline) updateData.timeline = otherUpdates.timeline;
    if (otherUpdates.priority) updateData.priority = otherUpdates.priority;
    if (otherUpdates.category) updateData.category = otherUpdates.category;

    // Update plan in database
    const { data, error } = await supabase
      .from("action_plan")
      .update(updateData)
      .eq("id", planId)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      throw error;
    }

    // Format response for frontend
    const formattedPlan = {
      id: data.id,
      planId: data.id,
      title: data.title,
      objective: data.objective,
      steps: data.steps || [],
      reasoning: data.reasoning || "",
      expectedOutcome: data.expected_outcome || "",
      timeline: data.timeline || "",
      priority: data.priority || "medium",
      category: data.category || "General",
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      status: data.status || "active",
    };

    return NextResponse.json(
      { plan: formattedPlan, message: "Action plan updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Action plan PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get planId from query params or body
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Delete plan from database
    const { error } = await supabase
      .from("action_plan")
      .delete()
      .eq("id", planId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Database delete error:", error);
      throw error;
    }

    return NextResponse.json(
      { message: "Action plan deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Action plan DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
