"use client";

import { TrendingUp } from "lucide-react";

interface ActionStep {
  executionType?: string;
  executionMetadata?: {
    executionStatus?: string;
    autoExecute?: boolean;
  };
}

interface ActionPlan {
  steps: ActionStep[];
}

interface PlanProgressProps {
  plan: ActionPlan;
}

export function PlanProgress({ plan }: PlanProgressProps) {
  const executableSteps = plan.steps.filter(
    (s: any) => s.executionType === "content_generation" && s.executionMetadata?.autoExecute === true
  );
  
  const completedSteps = executableSteps.filter(
    (s: any) => s.executionMetadata?.executionStatus === "published" || s.executionMetadata?.executionStatus === "completed"
  );

  const inReviewSteps = executableSteps.filter(
    (s: any) => s.executionMetadata?.executionStatus === "review"
  );

  const inProgressSteps = executableSteps.filter(
    (s: any) => s.executionMetadata?.executionStatus === "generating"
  );

  const progressPercentage = 
    executableSteps.length > 0 
      ? (completedSteps.length / executableSteps.length) * 100 
      : 0;

  if (executableSteps.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h4 className="text-sm font-bold text-gray-900">Execution Progress</h4>
      </div>
      
      <div className="space-y-2">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>
              <span className="font-bold text-gray-900">{completedSteps.length}</span> published
            </span>
            {inReviewSteps.length > 0 && (
              <span>
                <span className="font-bold text-blue-600">{inReviewSteps.length}</span> in review
              </span>
            )}
            {inProgressSteps.length > 0 && (
              <span>
                <span className="font-bold text-yellow-600">{inProgressSteps.length}</span> generating
              </span>
            )}
            <span>
              <span className="font-bold text-gray-900">{executableSteps.length}</span> total executable
            </span>
          </div>
          <span className="font-bold text-green-700">
            {Math.round(progressPercentage)}% complete
          </span>
        </div>
      </div>
    </div>
  );
}
