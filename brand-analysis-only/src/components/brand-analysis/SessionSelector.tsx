import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown, Check, Clock } from "lucide-react";
import { BrandAnalysisSession } from "@/hooks/useBrandAnalysisResults";
import { cn } from "@/lib/utils";

interface SessionSelectorProps {
  sessions: BrandAnalysisSession[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  latestSessionId?: string | null;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  latestSessionId
}) => {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return '';
  };

  const selectedSession = completedSessions.find(s => s.id === selectedSessionId);
  const isLatestSelected = selectedSessionId === null || selectedSessionId === latestSessionId;

  if (completedSessions.length <= 1) {
    return null; // Don't show selector if only one or no sessions
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isLatestSelected ? 'Latest Session' : formatDateTime(selectedSession?.started_at || selectedSession?.created_at || '')}
          </span>
          <span className="sm:hidden">
            {isLatestSelected ? 'Latest' : formatTimeAgo(selectedSession?.started_at || selectedSession?.created_at || '')}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuItem 
          onClick={() => onSelectSession(null)}
          className={cn(isLatestSelected && "bg-primary/10")}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">Latest Session</span>
            </div>
            {isLatestSelected && <Check className="w-4 h-4 text-primary" />}
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto">
          {completedSessions.map((session, index) => {
            const isSelected = selectedSessionId === session.id;
            const isLatest = index === 0;
            const summary = session.results_summary as any;
            const visibility = summary?.visibility_score ?? summary?.mention_rate ?? null;
            
            return (
              <DropdownMenuItem 
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(isSelected && "bg-primary/10")}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDateTime(session.started_at || session.created_at)}
                      </span>
                      {isLatest && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {visibility !== null && (
                        <span>Visibility: {Math.round(visibility)}%</span>
                      )}
                      {session.total_queries && (
                        <span>• {session.total_queries} queries</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
