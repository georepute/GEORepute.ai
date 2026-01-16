import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Globe,
  TrendingUp,
  Eye,
  Target,
  BarChart3,
  MessageSquare,
  Clock
} from "lucide-react";
import { useBrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisResults } from "@/hooks/useBrandAnalysisResults";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function PlatformAnalysis() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useBrandAnalysisProject(id!);
  const { data: analysisResults = [] } = useBrandAnalysisResults(id!);

  // Process platform-specific data
  const platformData = analysisResults.reduce((acc, result) => {
    const platform = result.ai_platform;
    if (!acc[platform]) {
      acc[platform] = {
        totalQueries: 0,
        mentions: 0,
        avgPosition: 0,
        avgSentiment: 0,
        avgRelevance: 0,
        positionSum: 0,
        sentimentSum: 0,
        relevanceSum: 0,
        sentimentCount: 0,
        relevanceCount: 0
      };
    }
    
    acc[platform].totalQueries++;
    
    if (result.mention_found) {
      acc[platform].mentions++;
      if (result.mention_position) {
        acc[platform].positionSum += result.mention_position;
      }
    }
    
    if (result.sentiment_score !== null) {
      acc[platform].sentimentSum += result.sentiment_score;
      acc[platform].sentimentCount++;
    }
    
    if (result.relevance_score !== null) {
      acc[platform].relevanceSum += result.relevance_score;
      acc[platform].relevanceCount++;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate averages and percentages
  const processedPlatformData = Object.entries(platformData).map(([platform, data]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    totalQueries: data.totalQueries,
    mentions: data.mentions,
    visibilityRate: Math.round((data.mentions / data.totalQueries) * 100),
    avgPosition: data.mentions > 0 ? Math.round(data.positionSum / data.mentions) : 0,
    avgSentiment: data.sentimentCount > 0 ? Math.round((data.sentimentSum / data.sentimentCount) * 100) : 0,
    avgRelevance: data.relevanceCount > 0 ? Math.round((data.relevanceSum / data.relevanceCount) * 100) : 0
  }));

  // Platform colors for charts
  const PLATFORM_COLORS = {
    ChatGPT: '#10B981',
    Claude: '#8B5CF6', 
    Perplexity: '#F59E0B',
    Gemini: '#3B82F6',
    Copilot: '#EF4444'
  };

  // Pie chart data for mentions distribution
  const pieData = processedPlatformData.map(p => ({
    name: p.platform,
    value: p.mentions,
    color: PLATFORM_COLORS[p.platform as keyof typeof PLATFORM_COLORS] || '#6B7280'
  }));

  // Time series data for platform performance over time
  const timeSeriesData = analysisResults
    .filter(r => r.mention_found)
    .reduce((acc, result) => {
      const date = new Date(result.analysis_date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date };
      }
      const platform = result.ai_platform.charAt(0).toUpperCase() + result.ai_platform.slice(1);
      acc[date][platform] = (acc[date][platform] || 0) + 1;
      return acc;
    }, {} as Record<string, any>);

  const timeData = Object.values(timeSeriesData).slice(-14); // Last 14 data points

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
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">Platform Analysis</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Performance across AI platforms
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
          <span className="text-foreground">Platform Analysis</span>
        </div>

        {/* Platform Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {processedPlatformData.map((platform) => (
            <Card key={platform.platform}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base">{platform.platform}</span>
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Visibility Rate</span>
                  <span className="text-lg font-bold">{platform.visibilityRate}%</span>
                </div>
                <Progress value={platform.visibilityRate} className="h-2" />
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Mentions</span>
                    <p className="font-medium">{platform.mentions}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Position</span>
                    <p className="font-medium">#{platform.avgPosition || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sentiment</span>
                  <Badge 
                    variant={platform.avgSentiment > 60 ? 'default' : 
                            platform.avgSentiment > 40 ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {platform.avgSentiment}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Performance Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Visibility Rate by Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processedPlatformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processedPlatformData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Visibility Rate']} />
                    <Bar dataKey="visibilityRate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No platform data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Mention Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No mention data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trends Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Platform Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  {Object.keys(PLATFORM_COLORS).map(platform => (
                    <Line
                      key={platform}
                      type="monotone"
                      dataKey={platform}
                      stroke={PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS]}
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No trend data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Platform Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Detailed Platform Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processedPlatformData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 md:p-3 text-sm">Platform</th>
                      <th className="text-center p-2 md:p-3 text-sm">Queries</th>
                      <th className="text-center p-2 md:p-3 text-sm">Mentions</th>
                      <th className="text-center p-2 md:p-3 text-sm">Rate</th>
                      <th className="text-center p-2 md:p-3 text-sm">Position</th>
                      <th className="text-center p-2 md:p-3 text-sm">Sentiment</th>
                      <th className="text-center p-2 md:p-3 text-sm">Relevance</th>
                      <th className="text-center p-2 md:p-3 text-sm">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedPlatformData.map((platform) => {
                      const performance = platform.visibilityRate > 70 ? 'Excellent' :
                                        platform.visibilityRate > 50 ? 'Good' :
                                        platform.visibilityRate > 30 ? 'Average' : 'Poor';
                      
                      return (
                        <tr key={platform.platform} className="border-b">
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ 
                                  backgroundColor: PLATFORM_COLORS[platform.platform as keyof typeof PLATFORM_COLORS] || '#6B7280' 
                                }}
                              />
                              <span className="font-medium text-sm">{platform.platform}</span>
                            </div>
                          </td>
                          <td className="text-center p-2 md:p-3 text-sm">{platform.totalQueries}</td>
                          <td className="text-center p-2 md:p-3 text-sm">{platform.mentions}</td>
                          <td className="text-center p-2 md:p-3">
                            <span className="font-medium text-sm">{platform.visibilityRate}%</span>
                          </td>
                          <td className="text-center p-2 md:p-3 text-sm">
                            {platform.avgPosition > 0 ? `#${platform.avgPosition}` : 'N/A'}
                          </td>
                          <td className="text-center p-2 md:p-3">
                            <span className={`px-1 md:px-2 py-1 rounded text-xs ${
                              platform.avgSentiment > 60 ? 'bg-green-100 text-green-700' :
                              platform.avgSentiment > 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {platform.avgSentiment}%
                            </span>
                          </td>
                          <td className="text-center p-2 md:p-3 text-sm">{platform.avgRelevance}%</td>
                          <td className="text-center p-2 md:p-3">
                            <Badge 
                              variant={performance === 'Excellent' ? 'default' :
                                     performance === 'Good' ? 'secondary' :
                                     performance === 'Average' ? 'outline' : 'destructive'}
                              className="text-xs"
                            >
                              {performance}
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
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No platform metrics available yet</p>
                <p className="text-xs">Run an analysis to start tracking platform performance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}