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
    const { objective, targetKeywords, domain, region, channels, projectId } = body;
    
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

    // Generate action plan with AI (multi-channel support)
    const result = await generateActionPlan({
      objective,
      targetKeywords: targetKeywords || [],
      domain,
      domainEnrichment, // Pass enriched data to AI
      region,
      channels: channels || ['all'],
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
        execution_metadata: {
          total_executable_steps: executableSteps.length,
          automated_steps_count: automatedSteps.length,
          manual_steps_count: manualSteps.length,
          // Store project info in execution_metadata since project_id/project_name columns don't exist
          project_id: projectId || null,
          project_name: projectName || null,
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
        saved: !!savedPlanId, // Indicate if plan was successfully saved
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
    const formattedPlans = (data || []).map((plan: any) => ({
      id: plan.id,
      planId: plan.id,
      title: plan.title,
      objective: plan.objective,
      channels: plan.channel_types || [],
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
      projectId: plan.project_id || undefined,
      projectName: plan.project_name || undefined,
      executionMetadata: plan.execution_metadata || {},
    }));

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
