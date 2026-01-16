import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Target, Layers } from "lucide-react";

interface VisibilityScoreExplainerProps {
  score: number;
  // Prompt-level metrics (primary)
  promptsMentioned?: number;
  promptsTotal?: number;
  // Response-level metrics (diagnostic)
  responsesMentioned?: number;
  responsesTotal?: number;
  className?: string;
}

export function VisibilityScoreExplainer({ 
  score, 
  promptsMentioned,
  promptsTotal,
  responsesMentioned,
  responsesTotal,
  className = "" 
}: VisibilityScoreExplainerProps) {
  const hasPromptData = promptsTotal !== undefined && promptsTotal > 0;
  const hasResponseData = responsesTotal !== undefined && responsesTotal > 0;
  
  const responseVisibilityScore = hasResponseData 
    ? Math.round((responsesMentioned! / responsesTotal) * 100) 
    : 0;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className={`inline-flex items-center gap-1 cursor-help ${className}`}>
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-4 space-y-3">
          <p className="font-bold text-sm border-b border-border pb-2">How Visibility Score Works</p>
          
          {/* PRIMARY METRIC */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm text-primary">Prompt Visibility Score</p>
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">PRIMARY</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              In how many unique prompts was your brand mentioned <strong>at least once</strong> (across any AI platform)?
            </p>
            {hasPromptData ? (
              <div className="bg-background rounded p-2 text-center">
                <div className="text-lg font-bold text-primary">{promptsMentioned} / {promptsTotal} prompts</div>
                <div className="text-xs text-muted-foreground">
                  = <span className="font-bold text-foreground">{score}%</span> visibility
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No prompt data available yet.</p>
            )}
          </div>
          
          {/* SECONDARY METRIC */}
          {hasResponseData && (
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm">Platform Response Rate</p>
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">DIAGNOSTIC</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                How many individual platform responses mentioned your brand? (Multiple platforms per prompt)
              </p>
              <div className="bg-background rounded p-2 text-center">
                <div className="text-base font-semibold">{responsesMentioned} / {responsesTotal} responses</div>
                <div className="text-xs text-muted-foreground">
                  = <span className="font-medium">{responseVisibilityScore}%</span> response rate
                </div>
              </div>
            </div>
          )}
          
          {/* WHAT COUNTS AS A MENTION */}
          <div className="text-xs space-y-1">
            <p className="font-medium text-foreground">What counts as a mention:</p>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
              <li>Exact brand name match</li>
              <li>Domain/website reference</li>
              <li>Brand name variations (camelCase, etc.)</li>
            </ul>
          </div>
          
          {/* ZERO SCORE WARNING */}
          {score === 0 && hasPromptData && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 text-xs text-yellow-700 dark:text-yellow-400">
              <p className="font-medium">0% Visibility Score</p>
              <p>Your brand wasn't mentioned in any AI responses for the prompts analyzed.</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
