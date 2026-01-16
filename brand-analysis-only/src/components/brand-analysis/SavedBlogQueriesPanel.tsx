import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SavedBlogQuery, BlogPrefillFromQuery } from "@/types/blog-prefill";
import { 
  generateBlogTitleFromQuery, 
  generateBlogDescriptionFromQuery,
  generateBlogInstructionsFromQuery,
  WriterSettingsContext 
} from "@/lib/services/blog-prefill-service";
import { fetchWriterSettings } from "@/hooks/useWriterSettingsForBlog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ITEMS_PER_PAGE = 5;

interface SavedBlogQueriesPanelProps {
  projectId?: string;
  compact?: boolean;
  /** When true, clicking a query calls onSelectQuery instead of navigating */
  inline?: boolean;
  /** Callback when a query is selected (for inline mode) */
  onSelectQuery?: (query: SavedBlogQuery, prefill: BlogPrefillFromQuery) => void;
  /** Selected website ID for fetching Writer Settings */
  selectedWebsiteId?: string | null;
}

const SavedBlogQueriesPanel: React.FC<SavedBlogQueriesPanelProps> = ({ 
  projectId,
  compact = false,
  inline = false,
  onSelectQuery,
  selectedWebsiteId,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: savedQueries, isLoading } = useQuery({
    queryKey: ['saved-blog-queries', user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('saved_blog_queries')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SavedBlogQuery[];
    },
    enabled: !!user?.id,
  });

  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`saved_blog_queries:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_blog_queries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Keep the queue UI in sync (e.g., when an async conversion flips to 'converted')
          queryClient.invalidateQueries({ queryKey: ['saved-blog-queries'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markInProgressMutation = useMutation({
    mutationFn: async (queryId: string) => {
      const { error } = await supabase
        .from('saved_blog_queries')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', queryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-blog-queries'] });
    },
    onError: (error) => {
      console.error('SavedBlogQueriesPanel: Failed to mark query in_progress', error);
      toast.error('Could not start conversion (status update failed). Continuing anyway.');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (queryId: string) => {
      const { error } = await supabase
        .from('saved_blog_queries')
        .update({ status: 'dismissed' })
        .eq('id', queryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-blog-queries'] });
      toast.success("Query dismissed");
    },
    onError: () => {
      toast.error("Failed to dismiss query");
    },
  });

  const handleConvert = async (query: SavedBlogQuery) => {
    // Don't allow converting in-progress items
    if (query.status === 'in_progress') return;

    // Mark as in_progress immediately (best-effort; do not block navigation if it fails)
    try {
      await markInProgressMutation.mutateAsync(query.id);
    } catch (e) {
      // Mutation already toasts; just continue.
    }

    // Get brand context from the saved query (new approach) or fallback to project lookup (legacy)
    let brandName = query.brand_name;
    let brandWebsite = query.brand_website;
    let brandIndustry = query.brand_industry;

    // Fallback: If brand fields are empty (legacy data), fetch from brand_analysis_projects
    if (!brandName && query.project_id) {
      try {
        const { data: project } = await supabase
          .from('brand_analysis_projects')
          .select('brand_name, website_url, industry')
          .eq('id', query.project_id)
          .single();

        if (project) {
          brandName = project.brand_name;
          brandWebsite = project.website_url;
          brandIndustry = project.industry;
        }
      } catch (error) {
        console.warn('Could not fetch brand context for legacy query:', error);
      }
    }

    const prefill: BlogPrefillFromQuery = {
      sourceType: 'brand-analysis-missed-prompt',
      queryText: query.query_text,
      aiPlatform: query.ai_platform,
      competitorMentions: query.competitor_mentions || [],
      aiResponseContent: query.ai_response_excerpt || '',
      sources: query.sources || [],
      projectId: query.project_id,
      brandName,
      brandWebsite,
      brandIndustry,
    };

    // Fetch Writer Settings if a website is selected (for inline mode)
    let writerSettings: WriterSettingsContext | null = null;
    if (selectedWebsiteId) {
      writerSettings = await fetchWriterSettings(selectedWebsiteId);
    }

    // If inline mode, call the callback instead of navigating
    if (inline && onSelectQuery) {
      onSelectQuery(query, prefill);
      return;
    }

    navigate('/dashboard/agent-tasks/new', {
      state: {
        prefill,
        prefilledTitle: generateBlogTitleFromQuery(query.query_text),
        prefilledDescription: generateBlogDescriptionFromQuery(prefill),
        prefilledInstructions: generateBlogInstructionsFromQuery(prefill, writerSettings || undefined),
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"><Loader2 className="h-3 w-3 animate-spin" /> Generating...</Badge>;
      case 'converted':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Converted</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Dismissed</Badge>;
      default:
        return null;
    }
  };

  const pendingCount = savedQueries?.filter(q => q.status === 'pending').length || 0;
  const inProgressCount = savedQueries?.filter(q => q.status === 'in_progress').length || 0;
  const totalCount = savedQueries?.length || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedQueries = savedQueries?.slice(startIndex, startIndex + ITEMS_PER_PAGE) || [];

  // Reset to page 1 if current page exceeds total pages (e.g., after dismissing items)
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (isLoading) {
    return null; // Don't show loading skeleton, just hide
  }

  // Hide if no queries at all
  if (totalCount === 0) {
    return null;
  }

  const PaginationControls = () => (
    <div className="flex items-center justify-between pt-3 border-t mt-3">
      <span className="text-xs text-muted-foreground">
        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, totalCount)} of {totalCount}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs px-2 font-medium">
          {currentPage} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Inline mode - show as a collapsible card in the blog creation flow
  if (inline) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-primary/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Saved Query Queue</CardTitle>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {pendingCount} ready{inProgressCount > 0 && `, ${inProgressCount} generating`}
                  </Badge>
                </div>
                <div className="transition-transform duration-200 ease-out" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a saved query from Brand Visibility to create a blog post
              </p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            <CardContent className="pt-0">
              <div className="space-y-2">
                {paginatedQueries.map((query) => {
                  const isInProgress = query.status === 'in_progress';
                  
                  return (
                    <div
                      key={query.id}
                      className={cn(
                        "flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors",
                        isInProgress 
                          ? "bg-muted/50 border-muted opacity-70" 
                          : "bg-card hover:border-primary/40 cursor-pointer group"
                      )}
                      onClick={() => !isInProgress && handleConvert(query)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium text-sm line-clamp-2",
                          isInProgress ? "text-muted-foreground" : "group-hover:text-primary transition-colors"
                        )}>
                          {query.query_text}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {query.ai_platform}
                          </Badge>
                          {isInProgress && (
                            <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Generating...
                            </Badge>
                          )}
                          {!isInProgress && query.competitor_mentions && query.competitor_mentions.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              vs {query.competitor_mentions.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isInProgress ? (
                          <Button size="sm" variant="outline" className="h-8 gap-1" disabled>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            In Progress
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvert(query);
                              }}
                            >
                              <FileText className="h-3 w-3" />
                              Use
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissMutation.mutate(query.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && <PaginationControls />}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-medium">
                    Saved Blog Ideas
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {pendingCount}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {savedQueries?.map((query) => (
                    <div
                      key={query.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{query.query_text}</p>
                        <p className="text-xs text-muted-foreground">{query.ai_platform}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => handleConvert(query)}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => dismissMutation.mutate(query.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Saved Blog Ideas</CardTitle>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved queries yet</p>
            <p className="text-xs mt-1">
              Save missed prompts from Brand Visibility to create blogs later
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {savedQueries?.map((query) => (
                <div
                  key={query.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">
                        {query.query_text}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {query.ai_platform}
                        </Badge>
                        {getStatusBadge(query.status)}
                      </div>
                      {query.competitor_mentions && query.competitor_mentions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Competitors: {query.competitor_mentions.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleConvert(query)}
                        className="gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        Convert
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => dismissMutation.mutate(query.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SavedBlogQueriesPanel;
