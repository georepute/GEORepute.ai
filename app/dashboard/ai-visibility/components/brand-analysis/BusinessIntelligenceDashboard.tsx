"use client";
import React from 'react';
import Card, CardDescription } from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Users, 
  Award, 
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface IndustryBenchmark {
  metric: string;
  your_score: number;
  industry_average: number;
  top_performers: number;
  status: 'above' | 'below' | 'average';
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  expected_impact: number;
  roi_estimate: number;
  implementation_time: string;
}

interface BusinessIntelligenceDashboardProps {
  projectId: string;
}

const mockBenchmarks: IndustryBenchmark[] = [
  {
    metric: 'AI Platform Visibility',
    your_score: 68,
    industry_average: 52,
    top_performers: 85,
    status: 'above'
  },
  {
    metric: 'Brand Mention Rate',
    your_score: 0.73,
    industry_average: 0.61,
    top_performers: 0.89,
    status: 'above'
  },
  {
    metric: 'Average Position',
    your_score: 2.8,
    industry_average: 3.2,
    top_performers: 1.9,
    status: 'above'
  },
  {
    metric: 'Sentiment Score',
    your_score: 0.77,
    industry_average: 0.71,
    top_performers: 0.91,
    status: 'above'
  }
];

const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    title: 'Optimize for Gemini Platform',
    description: 'Your Gemini visibility is 23% below industry average. Focus on creating structured content and improving SEO presence.',
    priority: 'high',
    effort: 'medium',
    expected_impact: 35,
    roi_estimate: 4.2,
    implementation_time: '2-3 weeks'
  },
  {
    id: '2',
    title: 'Enhance Technical Content Authority',
    description: 'Increase mention rates by developing more in-depth technical content and thought leadership pieces.',
    priority: 'medium',
    effort: 'high',
    expected_impact: 28,
    roi_estimate: 3.8,
    implementation_time: '4-6 weeks'
  },
  {
    id: '3',
    title: 'Implement AI-Specific SEO Strategy',
    description: 'Develop content specifically optimized for AI training data consumption and retrieval.',
    priority: 'high',
    effort: 'medium',
    expected_impact: 42,
    roi_estimate: 5.1,
    implementation_time: '3-4 weeks'
  }
];

export const BusinessIntelligenceDashboard: React.FC<BusinessIntelligenceDashboardProps> = ({ projectId }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'above':
        return 'hsl(var(--success))';
      case 'below':
        return 'hsl(var(--destructive))';
      default:
        return 'hsl(var(--warning))';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getEffortBadge = (effort: string) => {
    switch (effort) {
      case 'low':
        return <Badge variant="outline" className="text-success border-success">Low Effort</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-warning border-warning">Medium Effort</Badge>;
      default:
        return <Badge variant="outline" className="text-destructive border-destructive">High Effort</Badge>;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              <span className="text-xs md:text-sm font-medium">Overall Score</span>
            </div>
            <div className="mt-1 md:mt-2">
              <div className="text-lg md:text-2xl font-bold">73.5</div>
              <p className="text-xs text-muted-foreground">+12% vs industry avg</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-success" />
              <span className="text-xs md:text-sm font-medium">Growth Rate</span>
            </div>
            <div className="mt-1 md:mt-2">
              <div className="text-lg md:text-2xl font-bold">+18%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Award className="h-3 w-3 md:h-4 md:w-4 text-warning" />
              <span className="text-xs md:text-sm font-medium">Rank</span>
            </div>
            <div className="mt-1 md:mt-2">
              <div className="text-lg md:text-2xl font-bold">#23</div>
              <p className="text-xs text-muted-foreground">In your industry</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-success" />
              <span className="text-xs md:text-sm font-medium">ROI Potential</span>
            </div>
            <div className="mt-1 md:mt-2">
              <div className="text-lg md:text-2xl font-bold">4.3x</div>
              <p className="text-xs text-muted-foreground">Projected return</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="benchmarks" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="benchmarks" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Industry Benchmarks</span>
            <span className="sm:hidden">Benchmarks</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Recommendations</span>
            <span className="sm:hidden">Recommendations</span>
          </TabsTrigger>
          <TabsTrigger value="roi-analysis" className="text-xs md:text-sm">
            <span className="hidden sm:inline">ROI Analysis</span>
            <span className="sm:hidden">ROI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benchmarks" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                Industry Benchmarking
              </CardTitle>
              <CardDescription className="text-sm">
                Compare your performance against industry averages and top performers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                {mockBenchmarks.map((benchmark, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="text-sm md:text-base font-medium">{benchmark.metric}</h4>
                      <Badge 
                        variant={benchmark.status === 'above' ? 'default' : 'destructive'}
                        className="capitalize text-xs w-fit"
                      >
                        {benchmark.status} average
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Your Score</span>
                        <span className="hidden sm:inline">Industry Avg</span>
                        <span className="sm:hidden">Avg</span>
                        <span>Top 10%</span>
                      </div>
                      
                      <div className="relative">
                        <Progress value={(benchmark.your_score / benchmark.top_performers) * 100} className="h-3" />
                        <div className="absolute top-0 left-0 h-full flex items-center justify-between w-full px-1">
                          <div 
                            className="w-2 h-2 bg-white border-2 rounded-full"
                            style={{ 
                              borderColor: getStatusColor(benchmark.status),
                              marginLeft: `${(benchmark.your_score / benchmark.top_performers) * 100}%`,
                              transform: 'translateX(-50%)'
                            }}
                          />
                          <div 
                            className="w-1 h-3 bg-muted-foreground/50"
                            style={{ 
                              marginLeft: `${(benchmark.industry_average / benchmark.top_performers) * 100}%`,
                              transform: 'translateX(-50%)'
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{benchmark.your_score}</span>
                        <span>{benchmark.industry_average}</span>
                        <span>{benchmark.top_performers}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                Actionable Recommendations
              </CardTitle>
              <CardDescription className="text-sm">
                AI-generated suggestions based on your performance gaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {mockRecommendations.map((rec) => (
                  <Card key={rec.id} className="border-l-4" style={{ borderLeftColor: rec.priority === 'high' ? 'hsl(var(--destructive))' : rec.priority === 'medium' ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
                    <CardContent className="p-3 md:p-4">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <h4 className="font-medium text-sm md:text-base">{rec.title}</h4>
                              <Badge variant={getPriorityVariant(rec.priority)} className="text-xs w-fit">
                                {rec.priority} priority
                              </Badge>
                            </div>
                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs">
                            {getEffortBadge(rec.effort)}
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{rec.expected_impact}% impact
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {rec.roi_estimate}x ROI
                            </span>
                            <span className="text-xs">{rec.implementation_time}</span>
                          </div>
                          <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs">
                            View Plan <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi-analysis" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                ROI Impact Analysis
              </CardTitle>
              <CardDescription className="text-sm">
                Projected return on investment for each recommendation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                  <Card>
                    <CardContent className="p-3 md:p-4 text-center">
                      <div className="text-xl md:text-2xl font-bold text-success">$47K</div>
                      <p className="text-xs md:text-sm text-muted-foreground">Projected Annual Value</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 md:p-4 text-center">
                      <div className="text-xl md:text-2xl font-bold">$12K</div>
                      <p className="text-xs md:text-sm text-muted-foreground">Implementation Cost</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 md:p-4 text-center">
                      <div className="text-xl md:text-2xl font-bold text-primary">3.9x</div>
                      <p className="text-xs md:text-sm text-muted-foreground">Total ROI</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <h4 className="font-medium text-sm md:text-base">Impact Timeline</h4>
                  <div className="space-y-3">
                    {mockRecommendations.map((rec) => (
                      <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium text-xs md:text-sm">{rec.title}</p>
                          <p className="text-xs text-muted-foreground">{rec.implementation_time}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-medium text-success">+{rec.expected_impact}%</div>
                          <div className="text-xs text-muted-foreground">{rec.roi_estimate}x ROI</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};