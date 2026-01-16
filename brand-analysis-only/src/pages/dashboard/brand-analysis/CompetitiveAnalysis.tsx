import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Target,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Trophy,
  AlertTriangle
} from "lucide-react";
import { useBrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisResults } from "@/hooks/useBrandAnalysisResults";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

export default function CompetitiveAnalysis() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useBrandAnalysisProject(id!);
  const { data: analysisResults = [] } = useBrandAnalysisResults(id!);

  // Process competitive data
  const competitorMentions = analysisResults.reduce((acc, result) => {
    if (result.competitor_mentions && result.competitor_mentions.length > 0) {
      result.competitor_mentions.forEach(competitor => {
        if (!acc[competitor]) {
          acc[competitor] = { mentions: 0, sentiment: 0, sentimentCount: 0 };
        }
        acc[competitor].mentions++;
        if (result.sentiment_score) {
          acc[competitor].sentiment += result.sentiment_score;
          acc[competitor].sentimentCount++;
        }
      });
    }
    return acc;
  }, {} as Record<string, { mentions: number; sentiment: number; sentimentCount: number }>);

  // Calculate average sentiment for competitors
  const competitorData = Object.entries(competitorMentions).map(([name, data]) => ({
    name,
    mentions: data.mentions,
    avgSentiment: data.sentimentCount > 0 ? Math.round((data.sentiment / data.sentimentCount) * 100) : 0
  }));

  // Your brand mentions for comparison
  const brandMentions = analysisResults.filter(r => r.mention_found).length;
  const brandSentiment = analysisResults.filter(r => r.mention_found && r.sentiment_score)
    .reduce((acc, r) => acc + (r.sentiment_score || 0), 0) / Math.max(1, analysisResults.filter(r => r.mention_found && r.sentiment_score).length);

  // Competitive positioning data for radar chart
  const platforms = ['chatgpt', 'claude', 'perplexity', 'gemini'];
  const radarData = platforms.map(platform => {
    const platformResults = analysisResults.filter(r => r.ai_platform === platform);
    const brandMentionsOnPlatform = platformResults.filter(r => r.mention_found).length;
    
    const competitorMentionsOnPlatform = competitorData.reduce((acc, comp) => {
      const compResults = platformResults.filter(r => 
        r.competitor_mentions?.includes(comp.name)
      ).length;
      return acc + compResults;
    }, 0);

    return {
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      brand: brandMentionsOnPlatform,
      competitors: competitorMentionsOnPlatform
    };
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="w-fit">
              <Link to={`/dashboard/brand-analysis/project/${id}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Competitive Analysis</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {project?.brand_name} vs Competitors
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/dashboard/brand-analysis" className="hover:text-foreground">
            Brand Visibility
          </Link>
          <span>/</span>
          <Link to={`/dashboard/brand-analysis/project/${id}`} className="hover:text-foreground truncate">
            {project?.brand_name}
          </Link>
          <span>/</span>
          <span className="text-foreground">Competitive Analysis</span>
        </div>

        {/* Competitive Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Market Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Your Brand</span>
                    <span className="text-lg font-bold text-primary">{brandMentions}</span>
                  </div>
                  <Progress value={brandMentions} className="h-2" />
                </div>
                
                {competitorData.slice(0, 3).map((competitor, index) => (
                  <div key={competitor.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{competitor.name}</span>
                      <span className="text-lg font-bold">{competitor.mentions}</span>
                    </div>
                    <Progress value={competitor.mentions} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Sentiment Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{project?.brand_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{Math.round(brandSentiment * 100)}%</span>
                    <Badge variant="secondary" className="text-green-600">
                      {brandSentiment > 0.6 ? 'Positive' : brandSentiment > 0.4 ? 'Neutral' : 'Negative'}
                    </Badge>
                  </div>
                </div>
                
                {competitorData.slice(0, 4).map((competitor) => (
                  <div key={competitor.name} className="flex items-center justify-between">
                    <span className="text-sm">{competitor.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{competitor.avgSentiment}%</span>
                      {competitor.avgSentiment > Math.round(brandSentiment * 100) ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Competitive Threats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {competitorData
                  .filter(comp => comp.mentions > brandMentions)
                  .slice(0, 3)
                  .map((competitor) => (
                    <div key={competitor.name} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{competitor.name}</span>
                        <Badge variant="destructive" className="text-xs">
                          Threat
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {competitor.mentions - brandMentions} more mentions than your brand
                      </p>
                    </div>
                  ))}
                
                {competitorData.filter(comp => comp.mentions > brandMentions).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <p className="text-sm">You're leading the competition!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competitive Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Mention Volume Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {competitorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: project?.brand_name || 'Your Brand', mentions: brandMentions, type: 'brand' },
                    ...competitorData.map(comp => ({ ...comp, type: 'competitor' }))
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="mentions" 
                      fill="#8884d8"
                      className="fill-primary"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No competitor data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Platform Competition
              </CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="platform" />
                    <PolarRadiusAxis />
                    <Radar
                      name="Your Brand"
                      dataKey="brand"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Competitors"
                      dataKey="competitors"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No platform data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Competitor Details Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Detailed Competitor Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competitorData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 md:p-3 text-sm">Competitor</th>
                      <th className="text-center p-2 md:p-3 text-sm">Mentions</th>
                      <th className="text-center p-2 md:p-3 text-sm">Sentiment</th>
                      <th className="text-center p-2 md:p-3 text-sm">Share</th>
                      <th className="text-center p-2 md:p-3 text-sm">Threat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitorData.map((competitor, index) => {
                      const totalMentions = brandMentions + competitorData.reduce((sum, c) => sum + c.mentions, 0);
                      const marketShare = Math.round((competitor.mentions / totalMentions) * 100);
                      const threatLevel = competitor.mentions > brandMentions ? 'High' : 
                                        competitor.mentions > brandMentions * 0.7 ? 'Medium' : 'Low';
                      
                      return (
                        <tr key={competitor.name} className="border-b">
                          <td className="p-2 md:p-3 font-medium text-sm">{competitor.name}</td>
                          <td className="text-center p-2 md:p-3 text-sm">{competitor.mentions}</td>
                          <td className="text-center p-2 md:p-3">
                            <span className={`px-1 md:px-2 py-1 rounded text-xs ${
                              competitor.avgSentiment > 60 ? 'bg-green-100 text-green-700' :
                              competitor.avgSentiment > 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {competitor.avgSentiment}%
                            </span>
                          </td>
                          <td className="text-center p-2 md:p-3 text-sm">{marketShare}%</td>
                          <td className="text-center p-2 md:p-3">
                            <Badge 
                              variant={threatLevel === 'High' ? 'destructive' : 
                                     threatLevel === 'Medium' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {threatLevel}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No competitor data available yet</p>
                <p className="text-xs">Run an analysis to start tracking competitor mentions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}