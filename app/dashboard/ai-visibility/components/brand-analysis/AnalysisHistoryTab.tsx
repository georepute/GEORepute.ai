"use client";
import React, { useState } from "react";
import Card } from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Eye,
  Hash,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ArrowRight,
  GitCompare,
  X,
  ChevronDown,
  ChevronUp,
  Globe,
  BarChart3
} from "lucide-react";
import { BrandAnalysisSession } from "@/hooks/useBrandAnalysisResults";
import { cn } from "@/lib/utils";

interface AnalysisHistoryTabProps {
  sessions: BrandAnalysisSession[];
  isLoading: boolean;
  onViewSession: (sessionId: string) => void;
  selectedSessionId?: string | null;
  latestSessionId?: string | null;
  onCompare?: (sessionIdA: string, sessionIdB: string) => void;
  comparisonMode?: boolean;
  comparisonSessionA?: string | null;
  comparisonSessionB?: string | null;
}

export const AnalysisHistoryTab: React.FC<AnalysisHistoryTabProps> = ({
  sessions,
  isLoading,
  onViewSession,
  selectedSessionId,
  latestSessionId,
  onCompare,
  comparisonMode = false,
  comparisonSessionA,
  comparisonSessionB
}) => {
  const [localCompareMode, setLocalCompareMode] = useState(false);
  const [localSessionA, setLocalSessionA] = useState<string | null>(null);
  const [localSessionB, setLocalSessionB] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  
  // Use props if provided, otherwise use local state
  const isCompareMode = comparisonMode || localCompareMode;
  const sessionA = comparisonSessionA ?? localSessionA;
  const sessionB = comparisonSessionB ?? localSessionB;

  const handleCompareClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    
    if (!localCompareMode) {
      // Start comparison mode, set first session
      setLocalCompareMode(true);
      setLocalSessionA(sessionId);
    } else if (!localSessionA) {
      setLocalSessionA(sessionId);
    } else if (localSessionA === sessionId) {
      // Deselect if clicking same session
      setLocalSessionA(null);
      setLocalCompareMode(false);
    } else {
      // Second session selected, trigger comparison
      if (onCompare) {
        onCompare(localSessionA, sessionId);
      }
      // Reset local state after triggering
      setLocalCompareMode(false);
      setLocalSessionA(null);
      setLocalSessionB(null);
    }
  };

  const handleCancelCompare = () => {
    setLocalCompareMode(false);
    setLocalSessionA(null);
    setLocalSessionB(null);
  };
  
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDateTime(dateString);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {status}
          </Badge>
        );
    }
  };

  const getSessionStats = (session: BrandAnalysisSession, prevSession?: BrandAnalysisSession) => {
    const summary = session.results_summary as any;
    const prevSummary = prevSession?.results_summary as any;
    
    // mention_rate is stored as 0-1, convert to percentage
    const rawVisibility = summary?.visibility_score ?? summary?.mention_rate ?? null;
    const visibility = rawVisibility !== null ? rawVisibility * 100 : null;
    const mentions = summary?.total_mentions ?? summary?.brand_mentions ?? null;
    const queries = session.total_queries ?? summary?.total_queries ?? null;
    const successfulQueries = summary?.successful_queries ?? session.completed_queries ?? null;
    const platforms = summary?.platforms_analyzed ?? [];
    
    const rawPrevVisibility = prevSummary?.visibility_score ?? prevSummary?.mention_rate ?? null;
    const prevVisibility = rawPrevVisibility !== null ? rawPrevVisibility * 100 : null;
    
    let trend: 'up' | 'down' | 'same' | null = null;
    let trendValue: number | null = null;
    
    if (visibility !== null && prevVisibility !== null) {
      const diff = visibility - prevVisibility;
      if (Math.abs(diff) < 0.5) {
        trend = 'same';
      } else {
        trend = diff > 0 ? 'up' : 'down';
        trendValue = Math.abs(Math.round(diff));
      }
    }
    
    return { visibility, mentions, queries, trend, trendValue, successfulQueries, platforms };
  };

  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'failed' || s.status === 'cancelled');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completedSessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analysis History</h3>
          <p className="text-muted-foreground">
            Run your first analysis to start tracking your brand visibility over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Analysis History
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track your brand visibility improvements over time. Click on any session to view its detailed results.
          </p>
        </div>
        
        {/* Comparison Mode Toggle */}
        <div className="flex items-center gap-2">
          {localCompareMode ? (
            <>
              <Badge variant="secondary" className="flex items-center gap-1">
                <GitCompare className="w-3 h-3" />
                {localSessionA ? 'Select 2nd session' : 'Select 1st session'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleCancelCompare}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            completedSessions.filter(s => s.status === 'completed').length >= 2 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLocalCompareMode(true)}
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Sessions
              </Button>
            )
          )}
        </div>
      </div>

      {/* Sessions Timeline */}
      <div className="space-y-3">
        {completedSessions.map((session, index) => {
          const prevSession = completedSessions[index + 1]; // Previous chronologically
          const stats = getSessionStats(session, prevSession);
          const isSelected = selectedSessionId === session.id;
          const isLatest = session.id === latestSessionId;
          const isCompareSelected = localSessionA === session.id;
          const canCompare = session.status === 'completed';
          const isExpanded = expandedSessionId === session.id;
          
          return (
            <Card 
              key={session.id} 
              className={cn(
                "transition-all",
                isSelected && !localCompareMode && "ring-2 ring-primary shadow-md",
                isLatest && !isSelected && !localCompareMode && "border-primary/50",
                localCompareMode && isCompareSelected && "ring-2 ring-blue-500 shadow-md bg-blue-50/50 dark:bg-blue-900/20",
                localCompareMode && !isCompareSelected && canCompare && "hover:ring-2 hover:ring-blue-300"
              )}
            >
              <CardContent className="p-4">
                <div 
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 cursor-pointer"
                  onClick={() => {
                    if (localCompareMode && canCompare) {
                      handleCompareClick({ stopPropagation: () => {} } as React.MouseEvent, session.id);
                    } else if (!localCompareMode && session.status === 'completed') {
                      setExpandedSessionId(isExpanded ? null : session.id);
                    }
                  }}
                >
                  {/* Compare Selection Indicator */}
                  {localCompareMode && canCompare && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                      isCompareSelected 
                        ? "bg-blue-500 border-blue-500 text-white" 
                        : "border-muted-foreground/30 text-muted-foreground"
                    )}>
                      {isCompareSelected ? (
                        <span className="text-sm font-bold">A</span>
                      ) : (
                        <GitCompare className="w-4 h-4" />
                      )}
                    </div>
                  )}
                  
                  {/* Date & Status */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {!localCompareMode && (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {formatDateTime(session.started_at || session.created_at)}
                        </span>
                        {isLatest && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Latest
                          </Badge>
                        )}
                        {isSelected && !localCompareMode && (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">
                            Currently Viewing
                          </Badge>
                        )}
                        {localCompareMode && isCompareSelected && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">
                            Session A
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(session.status || 'unknown')}
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(session.started_at || session.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  {session.status === 'completed' && (
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Visibility */}
                      {stats.visibility !== null && (
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4 text-primary" />
                              <span className="font-bold text-lg">{Math.round(stats.visibility)}%</span>
                              {stats.trend && (
                                <span className={cn(
                                  "flex items-center text-xs font-medium",
                                  stats.trend === 'up' && "text-green-600",
                                  stats.trend === 'down' && "text-red-600",
                                  stats.trend === 'same' && "text-muted-foreground"
                                )}>
                                  {stats.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                                  {stats.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                                  {stats.trend === 'same' && <Minus className="w-3 h-3" />}
                                  {stats.trendValue !== null && stats.trend !== 'same' && (
                                    <span className="ml-0.5">{stats.trendValue}%</span>
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Visibility</p>
                          </div>
                        </div>
                      )}

                      {/* Mentions */}
                      {stats.mentions !== null && (
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <Hash className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-lg">{stats.mentions}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Mentions</p>
                        </div>
                      )}

                      {/* Queries */}
                      {stats.queries !== null && (
                        <div className="text-center hidden sm:block">
                          <span className="font-medium">{stats.successfulQueries || stats.queries}</span>
                          <p className="text-xs text-muted-foreground">Queries</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {localCompareMode && canCompare ? (
                      <Button 
                        variant={isCompareSelected ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          isCompareSelected && "bg-blue-500 hover:bg-blue-600"
                        )}
                        onClick={(e) => handleCompareClick(e, session.id)}
                      >
                        {isCompareSelected ? 'Selected' : 'Select'}
                      </Button>
                    ) : !localCompareMode && session.status === 'completed' && (
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && session.status === 'completed' && !localCompareMode && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Detailed Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Visibility Rate</span>
                        </div>
                        <p className="text-xl font-bold">{stats.visibility !== null ? `${Math.round(stats.visibility)}%` : 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Hash className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-muted-foreground">Brand Mentions</span>
                        </div>
                        <p className="text-xl font-bold">{stats.mentions ?? 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-muted-foreground">Total Queries</span>
                        </div>
                        <p className="text-xl font-bold">{stats.queries ?? 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-medium text-muted-foreground">Successful</span>
                        </div>
                        <p className="text-xl font-bold">{stats.successfulQueries ?? stats.queries ?? 'N/A'}</p>
                      </div>
                    </div>

                    {/* Platforms */}
                    {stats.platforms && stats.platforms.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Platforms Analyzed</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {stats.platforms.map((platform: string) => (
                            <Badge key={platform} variant="secondary" className="capitalize">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button 
                        variant={isSelected ? "default" : "outline"} 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSession(session.id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Currently Viewing
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            View This Session's Data
                          </>
                        )}
                      </Button>
                      {completedSessions.filter(s => s.status === 'completed').length >= 2 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocalCompareMode(true);
                            setLocalSessionA(session.id);
                          }}
                        >
                          <GitCompare className="w-4 h-4 mr-1" />
                          Compare With Another
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">History Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold">{completedSessions.length}</p>
              <p className="text-xs text-muted-foreground">Total Analyses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {completedSessions.filter(s => s.status === 'completed').length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {completedSessions.filter(s => s.status === 'failed').length}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {completedSessions.filter(s => s.status === 'cancelled').length}
              </p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
