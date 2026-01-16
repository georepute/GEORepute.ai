"use client";
import React, { useState } from 'react';
import Card } from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FlaskConical, Play, Pause, BarChart3, Trophy } from 'lucide-react';

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  variantA: {
    name: string;
    content: string;
    performance: number;
    impressions: number;
  };
  variantB: {
    name: string;
    content: string;
    performance: number;
    impressions: number;
  };
  created: Date;
  duration: number; // days
  confidence: number;
  winner?: 'A' | 'B' | null;
}

interface ABTestManagerProps {
  projectId: string;
}

export const ABTestManager: React.FC<ABTestManagerProps> = ({ projectId }) => {
  const [tests, setTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Brand Introduction vs Product Focus',
      status: 'completed',
      variantA: {
        name: 'Brand Introduction',
        content: 'When discussing our company, you should know that we are a leading technology company...',
        performance: 78,
        impressions: 1250
      },
      variantB: {
        name: 'Product Focus',
        content: 'Our company offers innovative software solutions with a focus on automation...',
        performance: 85,
        impressions: 1180
      },
      created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      duration: 7,
      confidence: 92,
      winner: 'B'
    }
  ]);

  const [newTest, setNewTest] = useState<Partial<ABTest>>({
    name: '',
    variantA: { name: 'Variant A', content: '', performance: 0, impressions: 0 },
    variantB: { name: 'Variant B', content: '', performance: 0, impressions: 0 },
    status: 'draft'
  });

  const [showCreateForm, setShowCreateForm] = useState(false);

  const createTest = () => {
    if (newTest.name && newTest.variantA?.content && newTest.variantB?.content) {
      const test: ABTest = {
        id: Date.now().toString(),
        name: newTest.name,
        status: 'draft',
        variantA: newTest.variantA as ABTest['variantA'],
        variantB: newTest.variantB as ABTest['variantB'],
        created: new Date(),
        duration: 7,
        confidence: 0
      };
      
      setTests(prev => [...prev, test]);
      setNewTest({
        name: '',
        variantA: { name: 'Variant A', content: '', performance: 0, impressions: 0 },
        variantB: { name: 'Variant B', content: '', performance: 0, impressions: 0 },
        status: 'draft'
      });
      setShowCreateForm(false);
    }
  };

  const startTest = (testId: string) => {
    setTests(prev => prev.map(test => 
      test.id === testId ? { ...test, status: 'running' as const } : test
    ));
  };

  const pauseTest = (testId: string) => {
    setTests(prev => prev.map(test => 
      test.id === testId ? { ...test, status: 'paused' as const } : test
    ));
  };

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return 'default';
      case 'completed': return 'secondary';
      case 'paused': return 'destructive';
      default: return 'outline';
    }
  };

  const getWinnerBadge = (test: ABTest) => {
    if (!test.winner) return null;
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Trophy className="w-3 h-3" />
        Variant {test.winner} Wins
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">A/B Test Manager</h3>
        <Button onClick={() => setShowCreateForm(true)}>
          <FlaskConical className="w-4 h-4 mr-2" />
          Create New Test
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New A/B Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Test Name
              </label>
              <Input
                value={newTest.name || ''}
                onChange={(e) => setNewTest(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter test name..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Variant A
                </label>
                <Input
                  value={newTest.variantA?.name || ''}
                  onChange={(e) => setNewTest(prev => ({
                    ...prev,
                    variantA: { ...prev.variantA!, name: e.target.value }
                  }))}
                  placeholder="Variant A name..."
                  className="mb-2"
                />
                <Textarea
                  value={newTest.variantA?.content || ''}
                  onChange={(e) => setNewTest(prev => ({
                    ...prev,
                    variantA: { ...prev.variantA!, content: e.target.value }
                  }))}
                  placeholder="Enter variant A prompt..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Variant B
                </label>
                <Input
                  value={newTest.variantB?.name || ''}
                  onChange={(e) => setNewTest(prev => ({
                    ...prev,
                    variantB: { ...prev.variantB!, name: e.target.value }
                  }))}
                  placeholder="Variant B name..."
                  className="mb-2"
                />
                <Textarea
                  value={newTest.variantB?.content || ''}
                  onChange={(e) => setNewTest(prev => ({
                    ...prev,
                    variantB: { ...prev.variantB!, content: e.target.value }
                  }))}
                  placeholder="Enter variant B prompt..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createTest}>Create Test</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {tests.map(test => (
          <Card key={test.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {getWinnerBadge(test)}
                  <Badge variant={getStatusColor(test.status)}>
                    {test.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Variant A */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{test.variantA.name}</h4>
                      {test.winner === 'A' && <Trophy className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {test.variantA.content}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Performance</span>
                        <span className="font-medium">{test.variantA.performance}%</span>
                      </div>
                      <Progress value={test.variantA.performance} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {test.variantA.impressions} impressions
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Variant B */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{test.variantB.name}</h4>
                      {test.winner === 'B' && <Trophy className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {test.variantB.content}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Performance</span>
                        <span className="font-medium">{test.variantB.performance}%</span>
                      </div>
                      <Progress value={test.variantB.performance} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {test.variantB.impressions} impressions
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {test.status === 'completed' && (
                <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="font-medium text-foreground">
                      Statistical Confidence: {test.confidence}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Test completed after {test.duration} days
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {test.status === 'draft' && (
                  <Button onClick={() => startTest(test.id)} size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Start Test
                  </Button>
                )}
                {test.status === 'running' && (
                  <Button onClick={() => pauseTest(test.id)} variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Test
                  </Button>
                )}
                {test.status === 'paused' && (
                  <Button onClick={() => startTest(test.id)} size="sm">
                    <Play className="w-4 h-4 mr-2" />
                    Resume Test
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tests.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="text-center py-8">
            <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No A/B tests yet</p>
            <Button onClick={() => setShowCreateForm(true)} className="mt-4">
              Create Your First Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};