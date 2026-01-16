import React, { useState, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandingHeader } from "@/components/common/BrandingHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Target,
  BarChart3,
  Activity,
  Globe,
  Users,
  Hash,
  Download,
  Share2,
  ExternalLink,
  Trophy,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { BrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisResults, useBrandAnalysisSessions } from "@/hooks/useBrandAnalysisResults";
import { PlatformMatrix } from "@/components/dashboard/PlatformMatrix";
import { CompetitorCharts } from "@/components/dashboard/CompetitorCharts";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface FullAnalysisReportProps {
  project: BrandAnalysisProject;
}

export function FullAnalysisReport({ project }: FullAnalysisReportProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { data: analysisResults = [], isLoading: resultsLoading } = useBrandAnalysisResults(project.id);
  const { data: sessions = [], isLoading: sessionsLoading } = useBrandAnalysisSessions(project.id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Calculate comprehensive analytics
  const totalMentions = analysisResults.filter(r => r.mention_found).length;
  const totalQueries = analysisResults.length;
  const mentionRate = totalQueries > 0 ? (totalMentions / totalQueries) * 100 : 0;
  
  const avgSentiment = analysisResults.length > 0 
    ? analysisResults.reduce((acc, r) => acc + (r.sentiment_score || 0), 0) / analysisResults.length 
    : 0;
    
  const avgRelevance = analysisResults.length > 0 
    ? analysisResults.reduce((acc, r) => acc + (r.relevance_score || 0), 0) / analysisResults.length 
    : 0;

  // Platform analysis
  const platformBreakdown = analysisResults.reduce((acc, result) => {
    const platform = result.ai_platform || 'unknown';
    if (!acc[platform]) {
      acc[platform] = { total: 0, mentions: 0, avgSentiment: 0, avgRelevance: 0 };
    }
    acc[platform].total++;
    if (result.mention_found) acc[platform].mentions++;
    acc[platform].avgSentiment += result.sentiment_score || 0;
    acc[platform].avgRelevance += result.relevance_score || 0;
    return acc;
  }, {} as Record<string, any>);

  Object.keys(platformBreakdown).forEach(platform => {
    const data = platformBreakdown[platform];
    data.mentionRate = data.total > 0 ? (data.mentions / data.total) * 100 : 0;
    data.avgSentiment = data.avgSentiment / data.total;
    data.avgRelevance = data.avgRelevance / data.total;
  });

  // Competitor analysis
  const competitorMentions = analysisResults.reduce((acc, result) => {
    if (result.competitor_mentions) {
      result.competitor_mentions.forEach(competitor => {
        acc[competitor] = (acc[competitor] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  // Position analysis
  const positionData = analysisResults
    .filter(r => r.mention_found && r.mention_position)
    .map(r => r.mention_position!);
  
  const avgPosition = positionData.length > 0 
    ? positionData.reduce((acc, pos) => acc + pos, 0) / positionData.length 
    : null;

  // Timeline data
  const timelineData = analysisResults
    .filter(r => r.mention_found)
    .reduce((acc, result) => {
      const date = formatDate(result.analysis_date);
      if (!acc[date]) {
        acc[date] = { date, mentions: 0, sentiment: 0, relevance: 0, count: 0 };
      }
      acc[date].mentions++;
      acc[date].sentiment += result.sentiment_score || 0;
      acc[date].relevance += result.relevance_score || 0;
      acc[date].count++;
      return acc;
    }, {} as Record<string, any>);

  Object.values(timelineData).forEach((day: any) => {
    day.sentiment = day.sentiment / day.count;
    day.relevance = day.relevance / day.count;
  });

  const chartData = Object.values(timelineData).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Radar chart data for competitive analysis
  const radarData = Object.entries(platformBreakdown).map(([platform, data]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    mentionRate: data.mentionRate,
    sentiment: data.avgSentiment * 100,
    relevance: data.avgRelevance * 100,
    visibility: Math.min(100, data.mentions * 10)
  }));

  const handleExportPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const recommendations = [
    {
      type: mentionRate < 30 ? 'critical' : mentionRate < 60 ? 'warning' : 'success',
      title: 'Brand Visibility Enhancement',
      description: mentionRate < 30 
        ? 'Your brand has low visibility across AI platforms. Consider SEO optimization and content marketing.'
        : mentionRate < 60 
        ? 'Moderate visibility detected. Focus on high-value content creation and thought leadership.'
        : 'Excellent brand visibility! Maintain current strategy and expand to new platforms.',
      priority: mentionRate < 30 ? 'High' : mentionRate < 60 ? 'Medium' : 'Low'
    },
    {
      type: avgSentiment < 0.4 ? 'critical' : avgSentiment < 0.7 ? 'warning' : 'success',
      title: 'Sentiment Optimization',
      description: avgSentiment < 0.4
        ? 'Negative sentiment detected. Review customer feedback and improve brand reputation.'
        : avgSentiment < 0.7
        ? 'Mixed sentiment. Focus on addressing pain points and highlighting strengths.'
        : 'Positive sentiment maintained! Continue excellent customer experience.',
      priority: avgSentiment < 0.4 ? 'High' : avgSentiment < 0.7 ? 'Medium' : 'Low'
    },
    {
      type: Object.keys(competitorMentions).length > totalMentions ? 'warning' : 'info',
      title: 'Competitive Positioning',
      description: Object.keys(competitorMentions).length > totalMentions
        ? 'Competitors have higher mention rates. Analyze their strategies and differentiate.'
        : 'Good competitive position. Monitor competitor activities and maintain advantages.',
      priority: Object.keys(competitorMentions).length > totalMentions ? 'Medium' : 'Low'
    }
  ];

  if (resultsLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div ref={reportRef} className="space-y-8 print:space-y-6">
      {/* Executive Summary */}
      <Card className="print:shadow-none">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BrandingHeader size="lg" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Brand Visibility Report
          </CardTitle>
          <p className="text-xl text-muted-foreground">{project.brand_name}</p>
          <p className="text-sm text-muted-foreground">
            Generated on {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric'
            })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalMentions}</div>
              <div className="text-sm text-muted-foreground">Total Mentions</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{mentionRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Mention Rate</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{(avgSentiment * 100).toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Sentiment</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{avgPosition?.toFixed(1) || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Avg Position</div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your brand visibility analysis shows {mentionRate >= 60 ? 'strong' : mentionRate >= 30 ? 'moderate' : 'low'}
            {' '}visibility across AI platforms with {avgSentiment >= 0.7 ? 'positive' : avgSentiment >= 0.4 ? 'mixed' : 'concerning'} 
            {' '}sentiment. {totalMentions > 0 ? `You appear in ${totalMentions} out of ${totalQueries} queries` : 'No mentions detected yet'}.
            {avgPosition && avgPosition <= 3 && ' You consistently rank in top positions when mentioned.'}
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="platforms" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Platforms</span>
            <span className="sm:hidden">Platforms</span>
          </TabsTrigger>
          <TabsTrigger value="competitive" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Competitive</span>
            <span className="sm:hidden">Comp</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Trends</span>
            <span className="sm:hidden">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Actions</span>
            <span className="sm:hidden">Actions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
                  Platform Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={Object.entries(platformBreakdown).map(([platform, data]) => ({
                    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
                    mentions: data.mentions,
                    total: data.total
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="mentions" fill="#8884d8" />
                    <Bar dataKey="total" fill="#e5e7eb" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Activity className="w-4 h-4 md:w-5 md:h-5" />
                  Performance Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="platform" fontSize={12} />
                    <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                    <Radar name="Performance" dataKey="mentionRate" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4 md:space-y-6">
          {/* Detailed Platform Analysis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Object.entries(platformBreakdown).map(([platform, data]) => (
              <Card key={platform}>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="capitalize text-sm md:text-base">{platform}</span>
                    <Badge variant={data.mentionRate >= 50 ? "default" : data.mentionRate >= 25 ? "secondary" : "destructive"} className="text-xs w-fit">
                      {data.mentionRate.toFixed(1)}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span>Mentions</span>
                      <span className="font-medium">{data.mentions}/{data.total}</span>
                    </div>
                    <Progress value={data.mentionRate} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                    <div>
                      <span className="text-muted-foreground block">Sentiment</span>
                      <span className={`font-medium ${getScoreColor(data.avgSentiment * 100)}`}>
                        {(data.avgSentiment * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Relevance</span>
                      <span className={`font-medium ${getScoreColor(data.avgRelevance * 100)}`}>
                        {(data.avgRelevance * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-6">
          {/* Competitor Mentions Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Competitor Mention Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(competitorMentions).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(competitorMentions)
                    .sort(([,a], [,b]) => b - a)
                    .map(([competitor, mentions]) => (
                      <div key={competitor} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{competitor}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {((mentions / totalQueries) * 100).toFixed(1)}% mention rate
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{mentions}</span>
                          <span className="text-sm text-muted-foreground ml-1">mentions</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No competitor mentions detected in the analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Timeline Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Mention Trends Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="mentions" stroke="#8884d8" strokeWidth={2} name="Mentions" />
                  <Line type="monotone" dataKey="sentiment" stroke="#82ca9d" strokeWidth={2} name="Sentiment" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Actionable Recommendations */}
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <Card key={index} className={`border-l-4 ${
                rec.type === 'critical' ? 'border-l-red-500' :
                rec.type === 'warning' ? 'border-l-yellow-500' :
                rec.type === 'success' ? 'border-l-green-500' : 'border-l-blue-500'
              }`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getScoreIcon(rec.type === 'success' ? 100 : rec.type === 'warning' ? 60 : 30)}
                      {rec.title}
                    </div>
                    <Badge variant={rec.priority === 'High' ? 'destructive' : rec.priority === 'Medium' ? 'secondary' : 'outline'}>
                      {rec.priority} Priority
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{rec.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Immediate Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium">Optimize High-Impact Content</p>
                    <p className="text-sm text-muted-foreground">Focus on content types that AI platforms frequently reference</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium">Monitor Competitor Strategies</p>
                    <p className="text-sm text-muted-foreground">Analyze what makes competitors more visible and adapt strategies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium">Enhance Platform-Specific Presence</p>
                    <p className="text-sm text-muted-foreground">Tailor content for platforms where you have low visibility</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}