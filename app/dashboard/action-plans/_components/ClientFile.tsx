"use client";

import {
  FileText,
  Database,
  Brain,
  Calendar,
  CheckSquare,
  Zap,
  BarChart3,
  Clock,
  RefreshCw,
  ChevronRight,
  Download,
  Eye,
  Shield,
  Building2,
  Search,
} from "lucide-react";

interface ClientFileSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: "available" | "partial" | "missing";
  itemCount: number;
  lastUpdated: string | null;
}

interface ClientFileProps {
  projectName: string;
  sections: ClientFileSection[];
  onExportAll: () => void;
  onViewSection: (sectionId: string) => void;
}

const SECTION_TEMPLATES: {
  id: string;
  title: string;
  description: string;
  icon: any;
}[] = [
  {
    id: "raw_data",
    title: "Raw Scan Data",
    description:
      "Domain crawl data, GSC metrics, AI platform responses, and competitor data",
    icon: Database,
  },
  {
    id: "strategic_reports",
    title: "Strategic Reports",
    description:
      "Executive brief, AI visibility, SEO analysis, market share, blind spots, gap analysis",
    icon: Brain,
  },
  {
    id: "annual_plan",
    title: "Annual Strategic Plan",
    description:
      "12-month strategic work plan with quarterly structure and KPIs",
    icon: Calendar,
  },
  {
    id: "selected_items",
    title: "Selected Execution Items",
    description:
      "Strategic items selected for execution from the annual plan",
    icon: CheckSquare,
  },
  {
    id: "action_plans",
    title: "Auto-Generated Action Plans",
    description:
      "Detailed task breakdowns, timelines, sub-tasks, and platform mappings",
    icon: Zap,
  },
  {
    id: "business_dev",
    title: "Business Development",
    description:
      "Market expansion strategies by country, region, and language",
    icon: Building2,
  },
  {
    id: "competitor_research",
    title: "Competitor Research",
    description:
      "Competitive analysis and action plans based on competitor research",
    icon: Search,
  },
  {
    id: "kpi_dashboard",
    title: "KPI Dashboard",
    description:
      "Performance metrics linked to strategic objectives with trend tracking",
    icon: BarChart3,
  },
  {
    id: "progress_log",
    title: "Progress Log",
    description:
      "Historical log of all actions taken, status changes, and completions",
    icon: Clock,
  },
  {
    id: "quarterly_updates",
    title: "Quarterly Updates",
    description:
      "Quarterly performance reviews with plan adjustments and ROI tracking",
    icon: RefreshCw,
  },
];

function getStatusBadge(status: "available" | "partial" | "missing") {
  switch (status) {
    case "available":
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          Complete
        </span>
      );
    case "partial":
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
          Partial
        </span>
      );
    case "missing":
      return (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
          Not Available
        </span>
      );
  }
}

export function ClientFile({
  projectName,
  sections,
  onExportAll,
  onViewSection,
}: ClientFileProps) {
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  const availableCount = sections.filter(
    (s) => s.status === "available"
  ).length;
  const partialCount = sections.filter(
    (s) => s.status === "partial"
  ).length;
  const completeness = Math.round(
    ((availableCount + partialCount * 0.5) / SECTION_TEMPLATES.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* File Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-gray-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Client File: {projectName}
                </h2>
                <p className="text-gray-300 text-sm mt-0.5">
                  Structured digital file with all strategic data
                </p>
              </div>
            </div>
            <button
              onClick={onExportAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        </div>

        {/* Completeness */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              File Completeness
            </h3>
            <span className="text-sm font-bold text-gray-900">
              {completeness}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                completeness >= 80
                  ? "bg-green-500"
                  : completeness >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>
              <span className="font-bold text-green-600">
                {availableCount}
              </span>{" "}
              complete
            </span>
            <span>
              <span className="font-bold text-amber-600">
                {partialCount}
              </span>{" "}
              partial
            </span>
            <span>
              <span className="font-bold text-gray-400">
                {SECTION_TEMPLATES.length - availableCount - partialCount}
              </span>{" "}
              missing
            </span>
          </div>
        </div>
      </div>

      {/* File Sections */}
      <div className="space-y-3">
        {SECTION_TEMPLATES.map((template, idx) => {
          const section = sectionMap.get(template.id);
          const status = section?.status || "missing";
          const IconComp = template.icon;

          return (
            <div
              key={template.id}
              className={`bg-white rounded-xl border p-4 transition-all ${
                status === "available"
                  ? "border-green-200 hover:border-green-300"
                  : status === "partial"
                  ? "border-amber-200 hover:border-amber-300"
                  : "border-gray-200 hover:border-gray-300"
              } cursor-pointer hover:shadow-sm`}
              onClick={() => onViewSection(template.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 w-8 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-400">
                    {idx + 1}
                  </span>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status === "available"
                      ? "bg-green-100"
                      : status === "partial"
                      ? "bg-amber-100"
                      : "bg-gray-100"
                  }`}
                >
                  <IconComp
                    className={`w-5 h-5 ${
                      status === "available"
                        ? "text-green-600"
                        : status === "partial"
                        ? "text-amber-600"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {template.title}
                    </h4>
                    {getStatusBadge(status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {template.description}
                  </p>
                  {section && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {section.itemCount > 0 && (
                        <span>{section.itemCount} items</span>
                      )}
                      {section.lastUpdated && (
                        <span>
                          Updated:{" "}
                          {new Date(section.lastUpdated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {status !== "missing" && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Traceability Note */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Full Traceability
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              All actions are historically logged and traceable. Every
              strategic decision, report generation, plan creation, and
              execution step is recorded with timestamps and linked to its
              originating data source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
