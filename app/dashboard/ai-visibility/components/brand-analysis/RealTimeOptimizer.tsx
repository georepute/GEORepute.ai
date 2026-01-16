"use client";
import React, { useState, useEffect } from 'react';
import Card } from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Textarea } from '@/components/ui/textarea';
import { Zap, RefreshCw, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  variables: Record<string, string>;
  created: Date;
}

interface OptimizationSuggestion {
  id: string;
  type: 'addition' | 'replacement' | 'removal';
  priority: 'high' | 'medium' | 'low';
  original: string;
  suggestion: string;
  reason: string;
  impact: number;
}

interface RealTimeOptimizerProps {
  prompt: CustomPrompt;
  onOptimizedPrompt: (prompt: CustomPrompt) => void;
}

export const RealTimeOptimizer: React.FC<RealTimeOptimizerProps> = ({ 
  prompt, 
  onOptimizedPrompt 
}) => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState(prompt.content);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const generateSuggestions = async () => {
    if (!prompt.content.trim()) {
      setSuggestions([]);
      return;
    }

    setIsAnalyzing(true);

    // Simulate real-time analysis - replace with actual optimization API
    setTimeout(() => {
      const mockSuggestions: OptimizationSuggestion[] = [
        {
          id: '1',
          type: 'addition',
          priority: 'high',
          original: '',
          suggestion: 'Add specific industry context: "in the [industry] sector"',
          reason: 'AI models perform better with clear industry context',
          impact: 85
        },
        {
          id: '2',
          type: 'replacement',
          priority: 'medium',
          original: 'our company',
          suggestion: '[BRAND_NAME]',
          reason: 'Use brand name consistently for better recognition',
          impact: 72
        },
        {
          id: '3',
          type: 'addition',
          priority: 'high',
          original: '',
          suggestion: 'Include competitive differentiation: "Unlike [competitors], we..."',
          reason: 'Competitive context improves brand positioning',
          impact: 90
        },
        {
          id: '4',
          type: 'replacement',
          priority: 'low',
          original: 'good',
          suggestion: 'exceptional',
          reason: 'Stronger adjectives improve brand perception',
          impact: 45
        }
      ];

      setSuggestions(mockSuggestions);
      setIsAnalyzing(false);
    }, 1500);
  };

  useEffect(() => {
    generateSuggestions();
  }, [prompt.content]);

  const applySuggestion = (suggestion: OptimizationSuggestion) => {
    let newContent = optimizedContent;

    switch (suggestion.type) {
      case 'addition':
        newContent = `${optimizedContent} ${suggestion.suggestion}`;
        break;
      case 'replacement':
        if (suggestion.original) {
          newContent = optimizedContent.replace(
            new RegExp(suggestion.original, 'gi'),
            suggestion.suggestion
          );
        }
        break;
      case 'removal':
        if (suggestion.original) {
          newContent = optimizedContent.replace(
            new RegExp(suggestion.original, 'gi'),
            ''
          );
        }
        break;
    }

    setOptimizedContent(newContent);
    setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
  };

  const revertSuggestion = (suggestion: OptimizationSuggestion) => {
    // Simple revert - in a real implementation, you'd track changes more precisely
    setOptimizedContent(prompt.content);
    setAppliedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(suggestion.id);
      return newSet;
    });
  };

  const applyOptimizedPrompt = () => {
    const optimized: CustomPrompt = {
      ...prompt,
      content: optimizedContent,
      name: `${prompt.name} (Optimized)`
    };
    onOptimizedPrompt(optimized);
  };

  const getPriorityColor = (priority: OptimizationSuggestion['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getTypeIcon = (type: OptimizationSuggestion['type']) => {
    switch (type) {
      case 'addition': return <Lightbulb className="w-4 h-4" />;
      case 'replacement': return <RefreshCw className="w-4 h-4" />;
      case 'removal': return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Real-Time Prompt Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!prompt.content.trim() ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Enter a prompt to get real-time optimization suggestions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Prompt */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Original Prompt</h4>
                <Textarea
                  value={prompt.content}
                  readOnly
                  className="min-h-[150px] bg-muted"
                />
              </div>

              {/* Optimized Prompt */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Optimized Prompt</h4>
                <Textarea
                  value={optimizedContent}
                  onChange={(e) => setOptimizedContent(e.target.value)}
                  className="min-h-[150px]"
                />
                <Button 
                  onClick={applyOptimizedPrompt}
                  className="mt-2 w-full"
                  disabled={optimizedContent === prompt.content}
                >
                  Apply Optimized Prompt
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      {prompt.content.trim() && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Optimization Suggestions</CardTitle>
              {isAnalyzing && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="text-sm text-muted-foreground">Analyzing...</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 && !isAnalyzing ? (
              <p className="text-center text-muted-foreground py-4">
                No optimization suggestions available
              </p>
            ) : (
              <div className="space-y-3">
                {suggestions.map(suggestion => {
                  const isApplied = appliedSuggestions.has(suggestion.id);
                  
                  return (
                    <Card key={suggestion.id} className={isApplied ? 'bg-green-50 border-green-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(suggestion.type)}
                            <Badge variant={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority} priority
                            </Badge>
                            <Badge variant="outline">
                              {suggestion.impact}% impact
                            </Badge>
                            {isApplied && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-foreground mb-2">
                          <strong>Suggestion:</strong> {suggestion.suggestion}
                        </p>
                        
                        {suggestion.original && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Replace:</strong> "{suggestion.original}"
                          </p>
                        )}

                        <p className="text-sm text-muted-foreground mb-3">
                          <strong>Reason:</strong> {suggestion.reason}
                        </p>

                        <div className="flex gap-2">
                          {!isApplied ? (
                            <Button 
                              onClick={() => applySuggestion(suggestion)}
                              size="sm"
                              variant="outline"
                            >
                              Apply
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => revertSuggestion(suggestion)}
                              size="sm"
                              variant="outline"
                            >
                              Revert
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};