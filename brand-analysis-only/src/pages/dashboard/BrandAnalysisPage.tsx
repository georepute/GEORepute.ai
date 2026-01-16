import React from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BrandAnalysisTabContent from "@/components/brand-analysis/BrandAnalysisTabContent";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { VideoBanner } from "@/components/dashboard/VideoBanner";
import { TrendingUp } from "lucide-react";

const BrandAnalysisPage = () => {
  return (
    <DashboardLayout>
      <div className="w-full max-w-full px-2 sm:px-4 py-4">
        <VideoBanner pageIdentifier="brand-analysis" />
        
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">Brand Visibility</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Analyze your brand's AI visibility and competitive positioning
              </p>
            </div>
          </div>
        </div>

        <AuthErrorBoundary>
          <BrandAnalysisTabContent />
        </AuthErrorBoundary>
      </div>
    </DashboardLayout>
  );
};

export default BrandAnalysisPage;