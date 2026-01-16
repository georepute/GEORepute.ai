"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { Eye, Activity, TrendingUp } from "lucide-react";
import Card from "@/components/Card";
import BrandAnalysisTabContent from "./components/brand-analysis/BrandAnalysisTabContent";

export default function AIVisibility() {
  const { isRtl, t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "brand-analysis";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`/dashboard/ai-visibility?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI Visibility Tools</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Track AI bot activity and optimize your content for AI systems
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange("brand-analysis")}
                className={`${
                  activeTab === "brand-analysis"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Brand Visibility
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "brand-analysis" && <BrandAnalysisTabContent />}
        </div>
      </div>
    </div>
  );
}
