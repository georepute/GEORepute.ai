
import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useStatePersistence, stateUtils } from "@/utils/statePersistence";
import DirectoryOutreach from "@/components/directory-outreach/DirectoryOutreach";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoBanner } from "@/components/dashboard/VideoBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Activity, TrendingUp, Shield } from "lucide-react";
import BrandAnalysisTabContent from "@/components/brand-analysis/BrandAnalysisTabContent";
import { ImprovedBotTracker } from "@/components/ai-visibility/ImprovedBotTracker";

const TabErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="p-4">
    <Card className="border-destructive/20">
      <CardContent className="p-4">
        <p className="font-medium">Something crashed in this tool.</p>
        <p className="text-sm text-muted-foreground mt-1">{error?.message || "Unknown error"}</p>
        <button onClick={retry} className="mt-3 inline-flex items-center rounded-md border px-3 py-1 text-sm">
          Try Again
        </button>
      </CardContent>
    </Card>
  </div>
);

const AIVisibilityPage = () => {
  const { saveState } = useStatePersistence('ai-visibility');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "bot-tracking";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Save state when tab changes
  useEffect(() => {
    const currentState = {
      activeTab,
      scrollPosition: stateUtils.saveScrollPosition(),
      timestamp: Date.now(),
    };
    
    saveState(currentState);
  }, [activeTab, saveState]);

  return (
    <DashboardLayout>
      <div className="w-full max-w-full px-2 sm:px-4 py-4">
        <VideoBanner pageIdentifier="ai-visibility" />
        
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">AI Visibility Tools</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track AI bot activity and optimize your content for AI systems
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="directory-outreach">Directory Outreach</TabsTrigger>
            <TabsTrigger value="brand-analysis">Brand Visibility</TabsTrigger>
            <TabsTrigger value="bot-tracking">AI Bot Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="directory-outreach" className="mt-6">
            <AuthErrorBoundary fallback={TabErrorFallback}>
              <DirectoryOutreach />
            </AuthErrorBoundary>
          </TabsContent>

          <TabsContent value="brand-analysis" className="mt-6">
            <AuthErrorBoundary fallback={TabErrorFallback}>
              <BrandAnalysisTabContent />
            </AuthErrorBoundary>
          </TabsContent>

          <TabsContent value="bot-tracking" className="mt-6">
            <AuthErrorBoundary fallback={TabErrorFallback}>
              <ImprovedBotTracker />
            </AuthErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AIVisibilityPage;
