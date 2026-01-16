import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string; stepId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, stepId } = params;
    const body = await request.json();
    const { action } = body; // "generate_content" | "skip" | "mark_complete"

    // 1. Fetch action plan
    const { data: plan, error: planError } = await supabase
      .from("action_plan")
      .select("*")
      .eq("id", planId)
      .eq("user_id", session.user.id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // 2. Find step
    const steps = plan.steps || [];
    const stepIndex = steps.findIndex((s: any) => s.id === stepId || s.id?.toString() === stepId);
    if (stepIndex === -1) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    const step = steps[stepIndex];

    // 3. Execute based on step type
    if (action === "generate_content" && step.executionType === "content_generation") {
      // Execute content generation
      const execMetadata = step.executionMetadata || {};
      
      // Get base URL for internal API call
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     request.headers.get('origin') || 
                     'http://localhost:3000';
      
      // Call Content Generator API
      const contentResponse = await fetch(`${baseUrl}/api/geo-core/content-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          topic: execMetadata.topic || step.description || step.step,
          targetKeywords: execMetadata.keywords || [],
          targetPlatform: execMetadata.platform,
          contentType: execMetadata.contentType || 'post',
          influenceLevel: 'moderate',
          // Link to action plan
          actionPlanId: planId,
          actionPlanStepId: stepId,
        }),
      });

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json();
        throw new Error(errorData.error || 'Content generation failed');
      }

      const contentData = await contentResponse.json();

      // 4. Update step with execution status and linked content
      const updatedStep = {
        ...step,
        executionMetadata: {
          ...execMetadata,
          linkedContentId: contentData.id || contentData.contentId,
          executionStatus: 'review', // Content generated, waiting for review
        },
      };

      steps[stepIndex] = updatedStep;

      // 5. Save updated plan
      const { error: updateError } = await supabase
        .from("action_plan")
        .update({ steps })
        .eq("id", planId)
        .eq("user_id", session.user.id);

      if (updateError) {
        console.error("Failed to update plan:", updateError);
        // Don't fail the request, content was generated
      }

      return NextResponse.json({
        success: true,
        message: "Content generated successfully",
        contentId: contentData.id || contentData.contentId,
        step: updatedStep,
      });
    }

    // Handle other execution types (audit, analysis, etc.)
    if (action === "mark_complete") {
      steps[stepIndex] = {
        ...step,
        completed: true,
        executionMetadata: {
          ...(step.executionMetadata || {}),
          executionStatus: 'completed',
        },
      };

      await supabase
        .from("action_plan")
        .update({ steps })
        .eq("id", planId)
        .eq("user_id", session.user.id);

      return NextResponse.json({
        success: true,
        message: "Step marked as complete",
        step: steps[stepIndex],
      });
    }

    return NextResponse.json({ error: "Unsupported execution type" }, { status: 400 });
  } catch (error: any) {
    console.error("Step execution error:", error);
    return NextResponse.json(
      { error: error.message || "Execution failed" },
      { status: 500 }
    );
  }
}
