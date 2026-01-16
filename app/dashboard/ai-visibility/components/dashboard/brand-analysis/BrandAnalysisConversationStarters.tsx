"use client";
import React from 'react';
import Button from '@/components/Button';
import Card } from '@/components/Card';
import Badge from '@/components/Badge';
import { 
  MessageCircle, 
  TrendingUp, 
  Target, 
  Zap,
  Users,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useBrandAnalysisConversationStarters, BrandAnalysisConversationStarter } from '@/hooks/useBrandAnalysisConversationStarters';

interface BrandAnalysisConversationStartersProps {
  projectId: string;
  onStarterClick: (question: string) => void;
  className?: string;
}

const getCategoryIcon = (category: BrandAnalysisConversationStarter['category']) => {
  switch (category) {
    case 'insights': return <BarChart3 className="w-4 h-4" />;
    case 'competitive': return <Users className="w-4 h-4" />;
    case 'optimization': return <Zap className="w-4 h-4" />;
    case 'strategy': return <Target className="w-4 h-4" />;
    default: return <MessageCircle className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: BrandAnalysisConversationStarter['category']) => {
  switch (category) {
    case 'insights': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'competitive': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'optimization': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'strategy': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
};

export const BrandAnalysisConversationStarters: React.FC<BrandAnalysisConversationStartersProps> = ({
  projectId,
  onStarterClick,
  className = ""
}) => {
  const { starters } = useBrandAnalysisConversationStarters(projectId);

  if (starters.length === 0) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Start Your Brand Visibility Conversation
          </h3>
          <p className="text-muted-foreground max-w-md">
            Once your brand visibility analysis completes, I'll suggest personalized questions to help you understand your AI visibility and competitive position.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5 text-primary" />
          Ask Freddie About Your Brand Visibility
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get personalized insights based on your brand's AI platform performance
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {starters.map((starter) => (
          <Button
            key={starter.id}
            variant="outline"
            className="w-full justify-start h-auto p-4 hover:bg-muted/50 transition-colors"
            onClick={() => onStarterClick(starter.question)}
          >
            <div className="flex items-start gap-3 w-full">
              <div className="flex-shrink-0 mt-0.5">
                <Badge className={`${getCategoryColor(starter.category)} border flex items-center gap-1.5 px-2 py-1`}>
                  {getCategoryIcon(starter.category)}
                  <span className="text-xs font-medium capitalize">{starter.category}</span>
                </Badge>
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm mb-1">{starter.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {starter.question}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </Button>
        ))}
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>💡 Tip: Questions are personalized based on your analysis data</span>
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Smart AI
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};