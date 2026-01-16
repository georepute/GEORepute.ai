import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Brain, Target, Zap } from 'lucide-react';

interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  variables: Record<string, string>;
  created: Date;
}

interface PredictionResult {
  confidence: number;
  estimatedScore: number;
  platformBreakdown: Record<string, number>;
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
  recommendations: string[];
}

interface PromptPerformancePredictorProps {
  prompt: CustomPrompt;
}

export const PromptPerformancePredictor: React.FC<PromptPerformancePredictorProps> = ({ prompt }) => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzePrompt = async () => {
    if (!prompt.content.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate AI analysis - replace with actual prediction API
    setTimeout(() => {
      const mockPrediction: PredictionResult = {
        confidence: Math.floor(Math.random() * 30) + 70,
        estimatedScore: Math.floor(Math.random() * 40) + 60,
        platformBreakdown: {
          'ChatGPT': Math.floor(Math.random() * 30) + 70,
          'Claude': Math.floor(Math.random() * 30) + 65,
          'Gemini': Math.floor(Math.random() * 30) + 60,
          'Perplexity': Math.floor(Math.random() * 30) + 55,
          'Copilot': Math.floor(Math.random() * 30) + 50,
        },
        factors: [
          {
            name: 'Brand Specificity',
            impact: Math.floor(Math.random() * 30) + 70,
            description: 'How specifically the prompt mentions brand characteristics'
          },
          {
            name: 'Context Clarity',
            impact: Math.floor(Math.random() * 30) + 60,
            description: 'Clarity of industry and business context'
          },
          {
            name: 'Keyword Density',
            impact: Math.floor(Math.random() * 30) + 65,
            description: 'Optimal use of relevant keywords for AI understanding'
          },
          {
            name: 'Competitive Context',
            impact: Math.floor(Math.random() * 30) + 55,
            description: 'Mentions of competitive positioning and differentiators'
          }
        ],
        recommendations: [
          'Add more specific industry terminology for better AI recognition',
          'Include unique value propositions to improve brand differentiation',
          'Consider adding geographical or market context for better targeting',
          'Optimize prompt length for AI model context windows'
        ]
      };
      
      setPrediction(mockPrediction);
      setIsAnalyzing(false);
    }, 2000);
  };

  useEffect(() => {
    if (prompt.content.trim()) {
      analyzePrompt();
    }
  }, [prompt.content]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Performance Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!prompt.content.trim() ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a prompt to get AI performance predictions</p>
            </div>
          ) : isAnalyzing ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing prompt performance...</p>
            </div>
          ) : prediction ? (
            <div className="space-y-6">
              {/* Overall Prediction */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(prediction.estimatedScore)}`}>
                      {prediction.estimatedScore}%
                    </div>
                    <p className="text-sm text-muted-foreground">Estimated Score</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(prediction.confidence)}`}>
                      {prediction.confidence}%
                    </div>
                    <p className="text-sm text-muted-foreground">Prediction Confidence</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {Object.keys(prediction.platformBreakdown).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Platforms Analyzed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Platform Performance Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(prediction.platformBreakdown).map(([platform, score]) => (
                    <div key={platform} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{platform}</span>
                        <Badge variant={getScoreVariant(score)}>
                          {score}%
                        </Badge>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Performance Factors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {prediction.factors.map((factor, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{factor.name}</span>
                        <Badge variant={getScoreVariant(factor.impact)}>
                          {factor.impact}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{factor.description}</p>
                      <Progress value={factor.impact} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Optimization Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {prediction.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span className="text-sm text-foreground">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};