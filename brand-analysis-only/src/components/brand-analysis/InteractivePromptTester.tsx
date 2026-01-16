import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Save, History, TrendingUp } from 'lucide-react';
import { PromptBuilder } from './PromptBuilder';
import { PromptPerformancePredictor } from './PromptPerformancePredictor';
import { ABTestManager } from './ABTestManager';
import { RealTimeOptimizer } from './RealTimeOptimizer';

interface CustomPrompt {
  id: string;
  name: string;
  content: string;
  variables: Record<string, string>;
  created: Date;
  lastTested?: Date;
  performance?: {
    score: number;
    platforms: Record<string, number>;
  };
}

interface InteractivePromptTesterProps {
  projectId: string;
}

export const InteractivePromptTester: React.FC<InteractivePromptTesterProps> = ({ projectId }) => {
  const [activePrompt, setActivePrompt] = useState<CustomPrompt>({
    id: 'new',
    name: 'New Custom Prompt',
    content: '',
    variables: {},
    created: new Date()
  });
  
  const [savedPrompts, setSavedPrompts] = useState<CustomPrompt[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const handleTestPrompt = async () => {
    setIsTesting(true);
    
    // Simulate testing - replace with actual API call
    setTimeout(() => {
      const mockResults = {
        overallScore: Math.floor(Math.random() * 40) + 60,
        platformScores: {
          'ChatGPT': Math.floor(Math.random() * 30) + 70,
          'Claude': Math.floor(Math.random() * 30) + 65,
          'Gemini': Math.floor(Math.random() * 30) + 60,
          'Perplexity': Math.floor(Math.random() * 30) + 55,
        },
        improvements: [
          'Consider adding more specific industry context',
          'Include brand differentiators for better visibility',
          'Optimize keyword density for AI models'
        ]
      };
      
      setTestResults(mockResults);
      setActivePrompt(prev => ({
        ...prev,
        lastTested: new Date(),
        performance: {
          score: mockResults.overallScore,
          platforms: mockResults.platformScores
        }
      }));
      setIsTesting(false);
    }, 3000);
  };

  const handleSavePrompt = () => {
    if (activePrompt.content.trim()) {
      const updatedPrompt = {
        ...activePrompt,
        id: activePrompt.id === 'new' ? Date.now().toString() : activePrompt.id
      };
      
      setSavedPrompts(prev => {
        const existing = prev.findIndex(p => p.id === updatedPrompt.id);
        if (existing >= 0) {
          return prev.map((p, i) => i === existing ? updatedPrompt : p);
        }
        return [...prev, updatedPrompt];
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Interactive Prompt Testing</h2>
        <div className="flex gap-2">
          <Button onClick={handleSavePrompt} variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Prompt
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder">Prompt Builder</TabsTrigger>
          <TabsTrigger value="predictor">Performance Predictor</TabsTrigger>
          <TabsTrigger value="abtest">A/B Testing</TabsTrigger>
          <TabsTrigger value="optimizer">Real-Time Optimizer</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Prompt Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Prompt Name
                  </label>
                  <Input
                    value={activePrompt.name}
                    onChange={(e) => setActivePrompt(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter prompt name..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Custom Prompt Content
                  </label>
                  <Textarea
                    value={activePrompt.content}
                    onChange={(e) => setActivePrompt(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your custom prompt here..."
                    className="min-h-[200px]"
                  />
                </div>

                <PromptBuilder
                  onPromptChange={(content) => setActivePrompt(prev => ({ ...prev, content }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Test Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!testResults ? (
                  <div className="text-center py-8">
                    <Button 
                      onClick={handleTestPrompt} 
                      disabled={!activePrompt.content.trim() || isTesting}
                      size="lg"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {isTesting ? 'Testing...' : 'Test Prompt'}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Test your prompt against AI platforms
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {testResults.overallScore}%
                      </div>
                      <p className="text-sm text-muted-foreground">Overall Performance</p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Platform Scores</h4>
                      {Object.entries(testResults.platformScores).map(([platform, score]) => (
                        <div key={platform} className="flex justify-between items-center">
                          <span className="text-sm text-foreground">{platform}</span>
                          <Badge variant={(score as number) > 70 ? 'default' : (score as number) > 50 ? 'secondary' : 'destructive'}>
                            {score as number}%
                          </Badge>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Optimization Suggestions</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {testResults.improvements.map((improvement: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {savedPrompts.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Saved Prompts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedPrompts.map((prompt) => (
                    <Card key={prompt.id} className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => setActivePrompt(prompt)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-foreground truncate">{prompt.name}</h4>
                          {prompt.performance && (
                            <Badge variant="secondary">{prompt.performance.score}%</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {prompt.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Created: {prompt.created.toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictor">
          <PromptPerformancePredictor prompt={activePrompt} />
        </TabsContent>

        <TabsContent value="abtest">
          <ABTestManager projectId={projectId} />
        </TabsContent>

        <TabsContent value="optimizer">
          <RealTimeOptimizer prompt={activePrompt} onOptimizedPrompt={setActivePrompt} />
        </TabsContent>
      </Tabs>
    </div>
  );
};