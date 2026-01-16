import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  TrendingUp, 
  Users, 
  Target,
  ArrowRight,
  Sparkles,
  BarChart3,
  Plus
} from 'lucide-react';

export const BrandVisibilityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['brand-visibility-summary', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Get brand analysis projects
      const { data: projects, error: projectsError } = await supabase
        .from('brand_analysis_projects')
        .select('id, brand_name, competitors, last_analysis_at, status')
        .eq('user_id', user.id)
        .order('last_analysis_at', { ascending: false });
      
      if (projectsError) {
        console.error('Error fetching brand projects:', projectsError);
        return null;
      }
      
      if (!projects || projects.length === 0) {
        return { hasProjects: false };
      }

      // Get latest session results for the most recent project
      const { data: sessions } = await supabase
        .from('brand_analysis_sessions')
        .select('id, results_summary, completed_queries, status')
        .eq('project_id', projects[0].id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      // Count total mentions from brand_mention_analysis (use type cast to avoid deep type issue)
      let mentionsCount = 0;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mentionsQuery = (supabase as any)
          .from('brand_mention_analysis')
          .select('id')
          .eq('user_id', user.id);
        
        const { data: mentionsData, error: mentionsError } = await mentionsQuery;
        
        if (!mentionsError && mentionsData) {
          mentionsCount = mentionsData.length;
        }
      } catch (e) {
        console.error('Error fetching mentions count:', e);
      }

      const latestSession = sessions?.[0];
      const resultsSummary = latestSession?.results_summary as any;
      
      return {
        hasProjects: true,
        projectCount: projects.length,
        brandName: projects[0].brand_name,
        competitorCount: projects[0].competitors?.length || 0,
        lastAnalysis: projects[0].last_analysis_at,
        totalMentions: mentionsCount || 0,
        visibilityScore: resultsSummary?.visibility_score || resultsSummary?.overallScore || null,
        queriesAnalyzed: latestSession?.completed_queries || 0
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Brand AI Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No projects - show setup prompt
  if (!data?.hasProjects) {
    return (
      <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Eye className="h-5 w-5" />
            Brand AI Visibility
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              Discover
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">Track Your AI Presence</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                See how AI systems like ChatGPT and Perplexity mention your brand
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/dashboard/brand-analysis')} 
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Brand Visibility
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-600" />
            Brand AI Visibility
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard/brand-analysis')}
            className="text-xs"
          >
            View Details
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brand name */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Tracking</span>
          <span className="font-medium">{data.brandName}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{data.totalMentions}</p>
            <p className="text-xs text-muted-foreground">Mentions</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{data.competitorCount}</p>
            <p className="text-xs text-muted-foreground">Competitors</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{data.queriesAnalyzed}</p>
            <p className="text-xs text-muted-foreground">Queries</p>
          </div>
        </div>

        {/* Visibility Score or CTA */}
        {data.visibilityScore ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              Visibility Score: {data.visibilityScore}%
            </span>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/dashboard/brand-analysis')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Run New Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
