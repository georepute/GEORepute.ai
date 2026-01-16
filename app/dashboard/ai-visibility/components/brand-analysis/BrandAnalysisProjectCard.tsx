"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { 
  MoreHorizontal, 
  TrendingUp, 
  Calendar, 
  Target,
  Play,
  Pause,
  Settings,
  Trash2,
  Eye,
  Search,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BrandAnalysisProject, useDeleteBrandAnalysisProject, useUpdateProjectStatus } from "@/hooks/useBrandAnalysisProjects";
import { ProjectConfigDialog } from "./ProjectConfigDialog";
import { supabase } from "@/lib/supabase/client";
import { useWebsiteMetadata } from "@/hooks/useWebsiteMetadata";
import { useFavicon, getFaviconUrl } from "@/lib/utils/faviconUtils";
import { PlatformLogo } from "./PlatformLogo";
import { useBrandAnalysisResults, useBrandAnalysisSessions } from "@/hooks/useBrandAnalysisResults";

interface BrandAnalysisProjectCardProps {
  project: BrandAnalysisProject;
}

export function BrandAnalysisProjectCard({ project }: BrandAnalysisProjectCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const deleteProject = useDeleteBrandAnalysisProject();
  const updateStatus = useUpdateProjectStatus();
  const { data: websiteMetadata, isLoading: isMetadataLoading } = useWebsiteMetadata(project.website_url);
  const { favicon, loading: faviconLoading } = useFavicon(project.website_url);
  
  // Fetch the latest completed session and results to calculate stats (same as detail page)
  // Use latest COMPLETED session to match what the detail page shows by default
  const { data: sessions = [] } = useBrandAnalysisSessions(project.id);
  const latestSession = sessions.find(s => 
    !s.id.startsWith('temp-') && 
    (s.status === 'completed' || s.status === 'running')
  ) || sessions.find(s => !s.id.startsWith('temp-')) || null;
  const activeSessionId = latestSession?.id;
  // Fetch results for this specific session (matches detail page behavior)
  const { data: analysisResults = [] } = useBrandAnalysisResults(project.id, activeSessionId);

  // Calculate stats from analysisResults (EXACT same logic as detail page)
  // This ensures consistency between project card and detail page
  const projectStats = useMemo(() => {
    // Count mentioned responses from analysisResults (matches detail page calculation)
    let mentionedResponses = 0;
    for (const r of analysisResults) {
      if (r.mention_found) {
        mentionedResponses += 1;
      }
    }

    const responsesTotal = analysisResults.length;
    const responsesMentioned = mentionedResponses;

    // Calculate visibility score using response-level metrics (matches detail page)
    const visibilityScore = responsesTotal > 0 
      ? Math.round((responsesMentioned / responsesTotal) * 100) 
      : 0;
    
    return {
      totalMentions: responsesMentioned, // This matches the "70" shown in detail page
      visibilityScore: visibilityScore,
    };
  }, [analysisResults]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = project.status === 'active' ? 'paused' : 'active';
    await updateStatus.mutateAsync({ projectId: project.id, status: newStatus });
  };

  const handleDelete = async () => {
    await deleteProject.mutateAsync(project.id);
    setShowDeleteDialog(false);
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 w-full overflow-hidden border-l-4 border-primary/70 p-0">
      <div className="pb-2 p-3 sm:p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                !favicon && !getFaviconUrl(project.website_url) ? 'bg-gradient-to-br from-primary/20 to-primary/10' : ''
              }`}>
              {favicon || getFaviconUrl(project.website_url) ? (
                <img 
                  src={favicon || getFaviconUrl(project.website_url) || ''} 
                  alt={`${project.brand_name} favicon`} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Hide broken image
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold truncate flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="truncate">{project.brand_name}</span>
                {project.status && (
                  <Badge className={`${getStatusColor(project.status)} text-xs w-fit`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground truncate flex flex-col sm:flex-row sm:items-center gap-1">
                <span>{project.industry || 'General'}</span>
                <span className="hidden sm:inline mx-1">•</span>
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1 opacity-70" />
                  {project.last_analysis_at ? formatDate(project.last_analysis_at) : 'No analysis yet'}
                </span>
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/ai-visibility?project=${project.id}`)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStatusToggle} disabled={updateStatus.isPending}>
                {project.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Analysis
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume Analysis
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 pt-0">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between items-start mb-1 sm:mb-2">
              <span className="text-xs font-medium text-muted-foreground">Mentions</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Search className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
              </div>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{projectStats?.totalMentions || 0}</p>
          </div>
          
          <div className="flex flex-col justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
            <div className="flex justify-between items-start mb-1 sm:mb-2">
              <span className="text-xs font-medium text-muted-foreground">Visibility</span>
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-secondary/10 rounded-full flex items-center justify-center">
                <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary" />
              </div>
            </div>
            <div className="flex items-baseline">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{projectStats?.visibilityScore || 0}%</p>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className="mt-4 sm:mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Active Platforms</h4>
            <span className="text-xs sm:text-sm font-semibold text-muted-foreground">{project.active_platforms?.length || 0}</span>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {project.active_platforms && project.active_platforms.length > 0 ? (
              project.active_platforms.map((platform) => {
                const v = (platform || '').toLowerCase();
                const label = (v === 'groq' || v === 'grok') ? 'Grok' : platform;
                return (
                  <Badge key={platform} variant="secondary" className="text-xs flex items-center gap-1">
                    <PlatformLogo platform={platform} size={14} />
                    {label}
                  </Badge>
                );
              })
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No platforms configured</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button size="sm" className="flex-1 text-xs sm:text-sm h-8 sm:h-9" onClick={() => router.push(`/dashboard/ai-visibility?project=${project.id}`)}>
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
            View Results
          </Button>
          <Button variant="outline" size="sm" className="sm:flex-shrink-0 px-2 h-8 sm:h-9" onClick={() => setShowConfigDialog(true)}>
            <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="sm:hidden ml-1">Config</span>
          </Button>
        </div>
      </div>

      {/* Project Configuration Dialog */}
      <ProjectConfigDialog 
        project={project}
        isOpen={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{project.brand_name}" brand visibility project? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}