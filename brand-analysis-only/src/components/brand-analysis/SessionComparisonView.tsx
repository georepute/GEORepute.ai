import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Eye,
  Hash,
  TrendingUp,
  Users,
  Globe,
  RefreshCw,
  Calendar
} from "lucide-react";
import { BrandAnalysisSession } from "@/hooks/useBrandAnalysisResults";
import { PlatformLogo } from "@/components/brand-analysis/PlatformLogo";
import { cn } from "@/lib/utils";

interface ComparisonData {
  sessionA: {
    id: string;
    date: string;
    visibility: number;
    mentions: number;
    sentiment: number;
    totalQueries: number;
    platforms: Record<string, { mentions: number; total: number; mentionRate: number }>;
    competitors: Record<string, number>;
    sources: string[];
  };
  sessionB: {
    id: string;
    date: string;
    visibility: number;
    mentions: number;
    sentiment: number;
    totalQueries: number;
    platforms: Record<string, { mentions: number; total: number; mentionRate: number }>;
    competitors: Record<string, number>;
    sources: string[];
  };
  deltas: {
    visibility: number;
    mentions: number;
    sentiment: number;
    totalQueries: number;
  };
}

interface SessionComparisonViewProps {
  sessionA: BrandAnalysisSession;
  sessionB: BrandAnalysisSession;
  comparisonData: ComparisonData | null;
  isLoading: boolean;
  onClose: () => void;
  onSwapSessions: () => void;
}

export const SessionComparisonView: React.FC<SessionComparisonViewProps> = ({
  sessionA,
  sessionB,
  comparisonData,
  isLoading,
  onClose,
  onSwapSessions
}) => {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const DeltaIndicator = ({ value, suffix = '', inverse = false }: { value: number; suffix?: string; inverse?: boolean }) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;
    
    if (Math.abs(value) < 0.1) {
      return (
        <span className="flex items-center text-muted-foreground">
          <Minus className="w-4 h-4 mr-1" />
          No change
        </span>
      );
    }
    
    return (
      <span className={cn(
        "flex items-center font-medium",
        isPositive && "text-green-600",
        isNegative && "text-red-600"
      )}>
        {value > 0 ? (
          <ArrowUpRight className="w-4 h-4 mr-1" />
        ) : (
          <ArrowDownRight className="w-4 h-4 mr-1" />
        )}
        {value > 0 ? '+' : ''}{Math.round(value)}{suffix}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <h3 className="text-lg font-semibold">Loading comparison...</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading session data...</div>
        </div>
      </div>
    );
  }

  if (!comparisonData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Unable to load comparison data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allPlatforms = [...new Set([
    ...Object.keys(comparisonData.sessionA.platforms),
    ...Object.keys(comparisonData.sessionB.platforms)
  ])];

  const allCompetitors = [...new Set([
    ...Object.keys(comparisonData.sessionA.competitors),
    ...Object.keys(comparisonData.sessionB.competitors)
  ])].sort((a, b) => {
    const totalA = (comparisonData.sessionA.competitors[a] || 0) + (comparisonData.sessionB.competitors[a] || 0);
    const totalB = (comparisonData.sessionA.competitors[b] || 0) + (comparisonData.sessionB.competitors[b] || 0);
    return totalB - totalA;
  });

  // Calculate source differences
  const sourcesOnlyInA = comparisonData.sessionA.sources.filter(s => !comparisonData.sessionB.sources.includes(s));
  const sourcesOnlyInB = comparisonData.sessionB.sources.filter(s => !comparisonData.sessionA.sources.includes(s));
  const commonSources = comparisonData.sessionA.sources.filter(s => comparisonData.sessionB.sources.includes(s));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <h3 className="text-lg font-semibold">Session Comparison</h3>
        </div>
      </div>

      {/* Session Headers */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            {/* Session A */}
            <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Badge variant="outline" className="mb-2 border-primary text-primary">Session A</Badge>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {formatDateTime(sessionA.started_at || sessionA.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {comparisonData.sessionA.totalQueries} queries
              </p>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={onSwapSessions}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Session B */}
            <div className="text-center p-4 rounded-lg bg-secondary/50 border">
              <Badge variant="secondary" className="mb-2">Session B</Badge>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {formatDateTime(sessionB.started_at || sessionB.created_at)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {comparisonData.sessionB.totalQueries} queries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Key Metrics Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Metric</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-primary">Session A</th>
                  <th className="text-center py-3 px-2 text-sm font-medium">Session B</th>
                  <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Visibility Score</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-lg font-bold">{Math.round(comparisonData.sessionA.visibility)}%</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-lg font-bold">{Math.round(comparisonData.sessionB.visibility)}%</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <DeltaIndicator value={comparisonData.deltas.visibility} suffix="%" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Total Mentions</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-lg font-bold">{comparisonData.sessionA.mentions}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-lg font-bold">{comparisonData.sessionB.mentions}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <DeltaIndicator value={comparisonData.deltas.mentions} />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Avg. Sentiment</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-lg font-bold">{Math.round(comparisonData.sessionA.sentiment)}%</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-lg font-bold">{Math.round(comparisonData.sessionB.sentiment)}%</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <DeltaIndicator value={comparisonData.deltas.sentiment} suffix="%" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Platform Performance Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Platform Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allPlatforms.map(platform => {
              const dataA = comparisonData.sessionA.platforms[platform] || { mentions: 0, total: 0, mentionRate: 0 };
              const dataB = comparisonData.sessionB.platforms[platform] || { mentions: 0, total: 0, mentionRate: 0 };
              const delta = (dataA.mentionRate - dataB.mentionRate) * 100;

              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformLogo platform={platform} size={18} />
                      <span className="text-sm font-medium capitalize">{platform}</span>
                    </div>
                    <DeltaIndicator value={delta} suffix="%" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Session A Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Session A</span>
                        <span>{Math.round(dataA.mentionRate * 100)}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${dataA.mentionRate * 100}%` }}
                        />
                      </div>
                    </div>
                    {/* Session B Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Session B</span>
                        <span>{Math.round(dataB.mentionRate * 100)}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary-foreground/50 transition-all"
                          style={{ width: `${dataB.mentionRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Competitor Comparison */}
      {allCompetitors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Competitor Mentions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Competitor</th>
                    <th className="text-center py-2 px-2 text-sm font-medium text-primary">Session A</th>
                    <th className="text-center py-2 px-2 text-sm font-medium">Session B</th>
                    <th className="text-center py-2 px-2 text-sm font-medium text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {allCompetitors.slice(0, 10).map(competitor => {
                    const mentionsA = comparisonData.sessionA.competitors[competitor] || 0;
                    const mentionsB = comparisonData.sessionB.competitors[competitor] || 0;
                    const delta = mentionsA - mentionsB;
                    
                    // For competitors, more mentions from them is bad for you
                    const isNew = mentionsA > 0 && mentionsB === 0;
                    const isGone = mentionsA === 0 && mentionsB > 0;
                    
                    return (
                      <tr key={competitor} className="border-b">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{competitor}</span>
                            {isNew && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                            {isGone && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">Gone</Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-2 px-2 font-medium">{mentionsA}</td>
                        <td className="text-center py-2 px-2 font-medium">{mentionsB}</td>
                        <td className="text-center py-2 px-2">
                          <DeltaIndicator value={delta} inverse={true} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Changes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Source Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* New Sources */}
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
                New Sources ({sourcesOnlyInA.length})
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Sources appearing in Session A but not in Session B
              </p>
              {sourcesOnlyInA.length > 0 ? (
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {sourcesOnlyInA.slice(0, 5).map((source, idx) => (
                    <li key={idx} className="text-xs truncate">{source}</li>
                  ))}
                  {sourcesOnlyInA.length > 5 && (
                    <li className="text-xs text-muted-foreground">+{sourcesOnlyInA.length - 5} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No new sources</p>
              )}
            </div>

            {/* Lost Sources */}
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">
                Lost Sources ({sourcesOnlyInB.length})
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Sources in Session B that disappeared in Session A
              </p>
              {sourcesOnlyInB.length > 0 ? (
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {sourcesOnlyInB.slice(0, 5).map((source, idx) => (
                    <li key={idx} className="text-xs truncate">{source}</li>
                  ))}
                  {sourcesOnlyInB.length > 5 && (
                    <li className="text-xs text-muted-foreground">+{sourcesOnlyInB.length - 5} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No lost sources</p>
              )}
            </div>

            {/* Consistent Sources */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium mb-2">
                Consistent ({commonSources.length})
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Sources appearing in both sessions
              </p>
              {commonSources.length > 0 ? (
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {commonSources.slice(0, 5).map((source, idx) => (
                    <li key={idx} className="text-xs truncate">{source}</li>
                  ))}
                  {commonSources.length > 5 && (
                    <li className="text-xs text-muted-foreground">+{commonSources.length - 5} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No common sources</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
