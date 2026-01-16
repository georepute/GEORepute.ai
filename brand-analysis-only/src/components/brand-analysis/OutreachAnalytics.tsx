import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart3,
  Clock,
  TrendingUp,
  ArrowRight,
  Mail,
  Eye,
  MessageSquare,
  CheckCircle,
  Target,
} from "lucide-react";
import { SourceOutreachCampaign } from "@/hooks/useSourceOutreachCampaigns";
import { cn } from "@/lib/utils";

interface OutreachAnalyticsProps {
  campaigns: SourceOutreachCampaign[];
}

interface OutreachTypeStats {
  type: string;
  total: number;
  sent: number;
  replied: number;
  success: number;
  responseRate: number;
  successRate: number;
}

interface ArticleTypeStats {
  type: string;
  total: number;
  success: number;
  successRate: number;
}

export const OutreachAnalytics: React.FC<OutreachAnalyticsProps> = ({ campaigns }) => {
  const analytics = useMemo(() => {
    // Funnel stats
    const total = campaigns.length;
    const researched = campaigns.filter((c) => c.researched_at || (c.source_analysis && Object.keys(c.source_analysis).length > 0)).length;
    const drafted = campaigns.filter((c) => c.email_body).length;
    const sent = campaigns.filter((c) => c.sent_at).length;
    const opened = campaigns.filter((c) => c.opened_at).length;
    const replied = campaigns.filter((c) => c.replied_at).length;
    const success = campaigns.filter((c) => c.outreach_status === "success").length;

    // Average time to response (in days)
    const respondedCampaigns = campaigns.filter((c) => c.sent_at && c.replied_at);
    let avgTimeToResponse: number | null = null;
    let minTimeToResponse: number | null = null;
    let maxTimeToResponse: number | null = null;

    if (respondedCampaigns.length > 0) {
      const responseTimes = respondedCampaigns.map((c) => {
        const sentDate = new Date(c.sent_at!);
        const repliedDate = new Date(c.replied_at!);
        return (repliedDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
      });
      avgTimeToResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      minTimeToResponse = Math.min(...responseTimes);
      maxTimeToResponse = Math.max(...responseTimes);
    }

    // Stats by outreach type
    const outreachTypeMap = new Map<string, { total: number; sent: number; replied: number; success: number }>();
    campaigns.forEach((c) => {
      const type = c.outreach_type || "unspecified";
      const existing = outreachTypeMap.get(type) || { total: 0, sent: 0, replied: 0, success: 0 };
      existing.total++;
      if (c.sent_at) existing.sent++;
      if (c.replied_at) existing.replied++;
      if (c.outreach_status === "success") existing.success++;
      outreachTypeMap.set(type, existing);
    });

    const outreachTypeStats: OutreachTypeStats[] = Array.from(outreachTypeMap.entries())
      .map(([type, stats]) => ({
        type: formatOutreachType(type),
        total: stats.total,
        sent: stats.sent,
        replied: stats.replied,
        success: stats.success,
        responseRate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
        successRate: stats.sent > 0 ? (stats.success / stats.sent) * 100 : 0,
      }))
      .filter((s) => s.sent > 0)
      .sort((a, b) => b.successRate - a.successRate);

    // Stats by article type
    const articleTypeMap = new Map<string, { total: number; success: number }>();
    campaigns.forEach((c) => {
      const articleType = c.source_analysis?.articleType || "unknown";
      const existing = articleTypeMap.get(articleType) || { total: 0, success: 0 };
      existing.total++;
      if (c.outreach_status === "success") existing.success++;
      articleTypeMap.set(articleType, existing);
    });

    const articleTypeStats: ArticleTypeStats[] = Array.from(articleTypeMap.entries())
      .map(([type, stats]) => ({
        type: formatArticleType(type),
        total: stats.total,
        success: stats.success,
        successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
      }))
      .filter((s) => s.total >= 2)
      .sort((a, b) => b.successRate - a.successRate);

    return {
      funnel: { total, researched, drafted, sent, opened, replied, success },
      avgTimeToResponse,
      minTimeToResponse,
      maxTimeToResponse,
      outreachTypeStats,
      articleTypeStats,
      responseRate: sent > 0 ? (replied / sent) * 100 : 0,
      successRate: sent > 0 ? (success / sent) * 100 : 0,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
    };
  }, [campaigns]);

  if (campaigns.length === 0) {
    return null;
  }

  const funnelSteps = [
    { label: "Total", value: analytics.funnel.total, icon: <Target className="h-4 w-4" />, color: "bg-muted" },
    { label: "Researched", value: analytics.funnel.researched, icon: <BarChart3 className="h-4 w-4" />, color: "bg-blue-500" },
    { label: "Drafted", value: analytics.funnel.drafted, icon: <Mail className="h-4 w-4" />, color: "bg-blue-600" },
    { label: "Sent", value: analytics.funnel.sent, icon: <Mail className="h-4 w-4" />, color: "bg-primary" },
    { label: "Opened", value: analytics.funnel.opened, icon: <Eye className="h-4 w-4" />, color: "bg-amber-500" },
    { label: "Replied", value: analytics.funnel.replied, icon: <MessageSquare className="h-4 w-4" />, color: "bg-green-500" },
    { label: "Success", value: analytics.funnel.success, icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-600" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Response Rate Analytics
        </CardTitle>
        <CardDescription>Track your outreach performance and optimize your strategy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conversion Funnel */}
        <div>
          <h4 className="text-sm font-medium mb-3">Conversion Funnel</h4>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {funnelSteps.map((step, idx) => {
              const prevValue = idx > 0 ? funnelSteps[idx - 1].value : step.value;
              const conversionRate = prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(0) : "—";
              const totalRate = analytics.funnel.total > 0 ? ((step.value / analytics.funnel.total) * 100).toFixed(0) : "0";

              return (
                <React.Fragment key={step.label}>
                  {idx > 0 && (
                    <div className="flex flex-col items-center px-1 text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-[10px]">{conversionRate}%</span>
                    </div>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center min-w-[60px]">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold",
                            step.color
                          )}>
                            {step.value}
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">{step.label}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{step.label}: {step.value}</p>
                        <p className="text-xs text-muted-foreground">{totalRate}% of total</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3 w-3" />
              Avg. Response Time
            </div>
            <div className="text-xl font-bold">
              {analytics.avgTimeToResponse !== null ? `${analytics.avgTimeToResponse.toFixed(1)}d` : "—"}
            </div>
            {analytics.minTimeToResponse !== null && analytics.maxTimeToResponse !== null && (
              <div className="text-xs text-muted-foreground">
                Range: {analytics.minTimeToResponse.toFixed(1)}d - {analytics.maxTimeToResponse.toFixed(1)}d
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Eye className="h-3 w-3" />
              Open Rate
            </div>
            <div className="text-xl font-bold">{analytics.openRate.toFixed(1)}%</div>
            <Progress value={analytics.openRate} className="h-1 mt-1" />
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <MessageSquare className="h-3 w-3" />
              Response Rate
            </div>
            <div className="text-xl font-bold text-amber-600">{analytics.responseRate.toFixed(1)}%</div>
            <Progress value={analytics.responseRate} className="h-1 mt-1" />
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CheckCircle className="h-3 w-3" />
              Success Rate
            </div>
            <div className="text-xl font-bold text-green-600">{analytics.successRate.toFixed(1)}%</div>
            <Progress value={analytics.successRate} className="h-1 mt-1" />
          </div>
        </div>

        {/* Performance by Type */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* By Outreach Type */}
          {analytics.outreachTypeStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Best Performing Outreach Types</h4>
              <div className="space-y-2">
                {analytics.outreachTypeStats.slice(0, 5).map((stat, idx) => (
                  <div key={stat.type} className="flex items-center gap-3">
                    <Badge variant={idx === 0 ? "default" : "outline"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">{stat.type}</span>
                        <span className="text-sm font-medium text-green-600">{stat.successRate.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{stat.sent} sent</span>
                        <span>•</span>
                        <span>{stat.replied} replied</span>
                        <span>•</span>
                        <span>{stat.success} success</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By Article Type */}
          {analytics.articleTypeStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Success Rate by Article Type</h4>
              <div className="space-y-2">
                {analytics.articleTypeStats.slice(0, 5).map((stat, idx) => (
                  <div key={stat.type} className="flex items-center gap-3">
                    <Badge variant={idx === 0 ? "default" : "outline"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                      {idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">{stat.type}</span>
                        <span className="text-sm font-medium text-green-600">{stat.successRate.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={stat.successRate} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-16">{stat.success}/{stat.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function formatOutreachType(type: string): string {
  const typeMap: Record<string, string> = {
    comparison_pitch: "Comparison Pitch",
    directory_inclusion: "Directory Inclusion",
    guest_post: "Guest Post",
    review_request: "Review Request",
    correction_update: "Correction/Update",
    unspecified: "Unspecified",
  };
  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatArticleType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default OutreachAnalytics;
