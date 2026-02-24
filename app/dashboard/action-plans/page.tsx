"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  Target,
  TrendingUp,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Trash2,
  Play,
  ExternalLink,
  Globe,
  RefreshCw,
  ArrowRight,
  X,
  FileDown,
  FileText,
  Brain,
  Calendar,
  BarChart3,
  FolderOpen,
  Layers,
  Sparkles,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";
import { PlanProgress } from "./_components/PlanProgress";
import { BusinessPlanView } from "./_components/BusinessPlanView";
import { PlanMetrics } from "./_components/PlanMetrics";
import { exportPlanToPDF, exportClientFilePDF } from "./_components/exportBusinessPlan";
import { StrategicIntelligence } from "./_components/StrategicIntelligence";
import { AnnualPlanView, type AnnualPlan, type QuarterlyItem } from "./_components/AnnualPlanView";
import { KPIDashboard } from "./_components/KPIDashboard";
import { ClientFile } from "./_components/ClientFile";

interface ActionStep {
  step: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  completed: boolean;
  id?: string;
  channel?: string;
  platform?: string;
  executionType?: "content_generation" | "audit" | "analysis" | "manual";
  executionMetadata?: {
    platform?: string;
    topic?: string;
    keywords?: string[];
    contentType?: string;
    autoExecute?: boolean;
    linkedContentId?: string;
    executionStatus?: "pending" | "generating" | "review" | "published" | "completed";
    publishedAt?: string;
    publishedUrl?: string;
  };
}

interface ActionPlan {
  id: string;
  title: string;
  objective: string;
  steps: ActionStep[];
  reasoning: string;
  expectedOutcome: string;
  timeline: string;
  priority: "high" | "medium" | "low";
  category: string;
  createdAt: Date;
  expanded: boolean;
  channels?: string[];
  domain?: string;
  region?: string;
  projectId?: string;
  projectName?: string;
}

interface BrandProject {
  id: string;
  brand_name: string;
  industry: string;
  website_url?: string;
  company_description?: string;
  company_image_url?: string;
  keywords?: string[];
  competitors?: string[];
}

type TabKey = "intelligence" | "annual_plan" | "action_plans" | "kpi" | "client_file";

const TABS: { key: TabKey; label: string; icon: any; description: string }[] = [
  { key: "intelligence", label: "Strategic Intelligence", icon: Brain, description: "Intelligence reports & analysis" },
  { key: "annual_plan", label: "12-Month Plan", icon: Calendar, description: "Quarterly execution structure" },
  { key: "action_plans", label: "Action Plans", icon: Zap, description: "Execution engine" },
  { key: "kpi", label: "KPI Dashboard", icon: BarChart3, description: "Performance tracking" },
  { key: "client_file", label: "Client File", icon: FolderOpen, description: "Structured file" },
];

const EXECUTION_CATEGORIES = [
  "Content Development",
  "SEO Implementation",
  "AI Visibility Expansion",
  "Authority & PR Strategy",
  "Funnel Optimization",
  "Conversion Improvements",
  "Market Expansion Initiatives",
];

const PLATFORMS = [
  "Website", "Blog", "Google Business", "YouTube", "LinkedIn",
  "X", "Instagram", "Facebook", "PR Networks", "External Authority Platforms",
  "Reddit", "Medium", "Quora", "Email",
];

export default function ActionPlansPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { language } = useLanguage();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("intelligence");

  // Plans state
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [executingStep, setExecutingStep] = useState<string | null>(null);

  // Brand project selection state
  const [brandProjects, setBrandProjects] = useState<BrandProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<BrandProject | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Intelligence state
  const [intelligenceData, setIntelligenceData] = useState<any>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  // Annual plan state
  const [annualPlan, setAnnualPlan] = useState<AnnualPlan | null>(null);
  const [loadingAnnualPlan, setLoadingAnnualPlan] = useState(false);
  const [annualPlanSavedAt, setAnnualPlanSavedAt] = useState<string | null>(null);

  // Generation form state (used in quick generate)
  const [objective, setObjective] = useState("");
  const [domain, setDomain] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loadingGSCKeywords, setLoadingGSCKeywords] = useState(false);
  const [crawlingDomain, setCrawlingDomain] = useState(false);

  // Export state
  const [exportPlanId, setExportPlanId] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPlans();
    loadBrandProjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportPlanId(null);
      }
    };
    if (exportPlanId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportPlanId]);

  // ──────────────────────────────────────────────
  // Data Loading
  // ──────────────────────────────────────────────

  const loadBrandProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("brand_analysis_projects")
        .select("id, brand_name, industry, website_url, company_description, company_image_url, keywords, competitors")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setBrandProjects(data || []);
    } catch (err) {
      console.error("Error loading brand projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProjectKeywords = async (projectId: string) => {
    setLoadingGSCKeywords(true);
    try {
      const project = brandProjects.find((p) => p.id === projectId);
      if (!project) return;
      let allKeywords = [...(project.keywords || [])];
      try {
        const gscResponse = await fetch(`/api/brand-analysis/${projectId}/gsc-keywords`);
        const gscData = await gscResponse.json();
        if (gscData.success && gscData.keywords?.length > 0) {
          const gscKeywordStrings = gscData.keywords.map((kw: any) => kw.keyword);
          allKeywords = Array.from(new Set([...allKeywords, ...gscKeywordStrings]));
        }
      } catch { /* GSC not available */ }
      setKeywords(allKeywords);
    } catch (err) {
      const project = brandProjects.find((p) => p.id === projectId);
      setKeywords(project?.keywords || []);
    } finally {
      setLoadingGSCKeywords(false);
    }
  };

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch("/api/geo-core/action-plan");
      if (!response.ok) throw new Error("Failed to load action plans");
      const data = await response.json();

      const loadedPlans: ActionPlan[] = (data.plans || []).map((plan: any) => {
        const execMetadata = plan.executionMetadata || {};
        return {
          id: plan.id,
          title: plan.title,
          objective: plan.objective,
          channels: plan.channels || [],
          domain: plan.domain,
          region: plan.region,
          projectId: plan.projectId || execMetadata.project_id,
          projectName: plan.projectName || execMetadata.project_name,
          steps: (plan.steps || []).map((step: any) => ({
            step: step.step || step.title || "",
            description: step.description || "",
            priority: step.priority || "medium",
            estimatedImpact: step.estimatedImpact || step.estimatedTime || "Not specified",
            completed: step.completed || false,
            id: step.id,
            channel: step.channel,
            platform: step.platform,
            executionType: step.executionType,
            executionMetadata: step.executionMetadata || { executionStatus: "pending", autoExecute: false },
          })),
          reasoning: plan.reasoning || "",
          expectedOutcome: plan.expectedOutcome || "",
          timeline: plan.timeline || "",
          priority: plan.priority || "medium",
          category: plan.category || "General",
          createdAt: plan.createdAt ? new Date(plan.createdAt) : new Date(),
          expanded: false,
        };
      });
      setPlans(loadedPlans);
    } catch (err) {
      console.error("Error loading plans:", err);
      toast.error("Failed to load action plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadIntelligence = async (projectId: string) => {
    setLoadingIntelligence(true);
    try {
      const response = await fetch(`/api/reports/strategic-intelligence?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to load intelligence data");
      const data = await response.json();
      setIntelligenceData(data);
      return data;
    } catch (err) {
      console.error("Error loading intelligence:", err);
      toast.error("Failed to load strategic intelligence");
      return null;
    } finally {
      setLoadingIntelligence(false);
    }
  };

  // Load a stored annual plan for a project and attach quarter KPIs from intelligence
  const loadStoredAnnualPlan = async (projectId: string, intelligence: any) => {
    try {
      const res = await fetch(`/api/geo-core/annual-plan?projectId=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.plan) {
        const plan = attachQuarterKPIs(data.plan, intelligence);
        setAnnualPlan(plan);
        setAnnualPlanSavedAt(data.generatedAt || data.plan.generatedAt || null);
      }
    } catch (err) {
      console.error("Error loading stored annual plan:", err);
    }
  };

  // Attach real quarter KPIs computed from the current intelligence data
  const attachQuarterKPIs = (plan: AnnualPlan, intelligence: any): AnnualPlan => {
    if (!intelligence) return plan;
    const scores = intelligence.scores || {};
    const reports = intelligence.reports || {};
    return {
      ...plan,
      quarters: plan.quarters.map((q, qIdx) => ({
        ...q,
        kpis: buildRealQuarterKPIs(q.quarter, scores, reports, qIdx),
      })),
    };
  };

  // ──────────────────────────────────────────────
  // Project Selection
  // ──────────────────────────────────────────────

  const handleProjectSelect = async (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      const project = brandProjects.find((p) => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        if (project.website_url) setDomain(project.website_url);
        await loadProjectKeywords(projectId);
        const intelligence = await loadIntelligence(projectId);
        // Load stored annual plan after intelligence (KPIs need intelligence scores)
        await loadStoredAnnualPlan(projectId, intelligence);
      }
    } else {
      setSelectedProject(null);
      setDomain("");
      setKeywords([]);
      setIntelligenceData(null);
      setAnnualPlan(null);
      setAnnualPlanSavedAt(null);
    }
  };

  // ──────────────────────────────────────────────
  // Annual Plan Generation
  // ──────────────────────────────────────────────

  const generateAnnualPlan = async (forceRegenerate = false) => {
    if (!intelligenceData) {
      toast.error("Please load strategic intelligence first");
      return;
    }
    if (!selectedProjectId) {
      toast.error("Please select a brand project first");
      return;
    }

    // Always switch to annual plan tab
    setActiveTab("annual_plan");

    // If a plan already exists and not forcing regeneration, just show it
    if (annualPlan && !forceRegenerate) return;

    setLoadingAnnualPlan(true);

    try {
      const response = await fetch("/api/geo-core/annual-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          intelligenceContext: intelligenceData,
          domain: intelligenceData.project.website || domain,
          language: language || "en",
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate plan");

      // Attach KPIs computed from current intelligence (not stored — always fresh)
      const plan = attachQuarterKPIs(data.plan, intelligenceData);
      setAnnualPlan(plan);
      setAnnualPlanSavedAt(data.plan.generatedAt || new Date().toISOString());
      toast.success("12-Month Strategic Plan generated and saved!");
    } catch (err: any) {
      console.error("Error generating annual plan:", err);
      toast.error(err.message || "Failed to generate annual plan");
    } finally {
      setLoadingAnnualPlan(false);
    }
  };

  const determinePlatforms = (step: any): string[] => {
    const platforms: string[] = [];
    const pl = (step.platform || "").toLowerCase();
    const ch = (step.channel || "").toLowerCase();

    if (pl.includes("linkedin") || ch.includes("linkedin")) platforms.push("LinkedIn");
    if (pl.includes("reddit") || ch.includes("reddit")) platforms.push("Reddit");
    if (pl.includes("medium") || ch.includes("medium")) platforms.push("Medium");
    if (pl.includes("quora") || ch.includes("quora")) platforms.push("Quora");
    if (pl.includes("youtube") || ch.includes("youtube") || ch.includes("video")) platforms.push("YouTube");
    if (pl.includes("facebook") || ch.includes("facebook")) platforms.push("Facebook");
    if (pl.includes("instagram") || ch.includes("instagram")) platforms.push("Instagram");
    if (pl.includes("twitter") || ch.includes("twitter") || pl.includes("x") || ch.includes("x ")) platforms.push("X");
    if (pl.includes("wordpress") || pl.includes("shopify") || ch.includes("blog")) platforms.push("Blog");
    if (ch.includes("seo") || ch.includes("website")) platforms.push("Website");
    if (ch.includes("pr") || ch.includes("outreach")) platforms.push("PR Networks");
    if (pl.includes("google_business") || ch.includes("gbp") || ch.includes("local")) platforms.push("Google Business");
    if (ch.includes("email")) platforms.push("Email");

    if (platforms.length === 0) {
      if (step.executionType === "content_generation") platforms.push("Blog", "Website");
      else platforms.push("Website");
    }

    return [...new Set(platforms)];
  };

  // Builds quarter KPIs from ONLY real measured data — no synthetic targets
  const buildRealQuarterKPIs = (
    quarter: string,
    scores: Record<string, number>,
    reports: any,
    qIdx: number
  ): { metric: string; target: string; baseline: string }[] => {
    const kpis: { metric: string; target: string; baseline: string }[] = [];

    // Use actual measured values as baselines; targets are derived from the same real data
    if (scores.aiVisibility > 0) {
      kpis.push({
        metric: "AI Visibility Score",
        baseline: `${scores.aiVisibility}/100 (measured)`,
        target: qIdx === 0 ? "Run full AI analysis" : qIdx === 1 ? "Address top blind spots" : qIdx === 2 ? "Expand to all platforms" : "Maintain and optimize",
      });
    }
    if (scores.seoPresence > 0 && reports?.seoAnalysis?.details) {
      const d = reports.seoAnalysis.details;
      kpis.push({
        metric: "SEO Presence",
        baseline: `Avg pos ${d.avgPosition}, ${d.totalImpressions?.toLocaleString()} impr (measured)`,
        target: qIdx === 0 ? "Fix opportunity queries" : qIdx === 1 ? "Close weak CTR gaps" : qIdx === 2 ? "Reach top 10 on key queries" : "Consolidate rankings",
      });
    }
    if (scores.shareOfAttention > 0 && reports?.shareOfAttention?.details) {
      const d = reports.shareOfAttention.details;
      kpis.push({
        metric: "Share of Attention",
        baseline: `AI: ${d.aiMentionShare}%, Organic: ${d.organicShare}% (measured)`,
        target: qIdx === 0 ? "Establish presence on weakest platforms" : qIdx === 1 ? "Grow AI share" : qIdx === 2 ? "Exceed competitors" : "Defend position",
      });
    }
    if (reports?.riskMatrix?.available && reports.riskMatrix.details) {
      const d = reports.riskMatrix.details;
      kpis.push({
        metric: "Blind Spots",
        baseline: `${d.totalBlindSpots} blind spots (${d.highPriority} high priority) (measured)`,
        target: qIdx === 0 ? "Address all high-priority blind spots" : qIdx === 1 ? "Reduce medium priority" : qIdx === 2 ? "Close all critical gaps" : "Monitor and maintain",
      });
    }
    if (reports?.gapAnalysis?.available && reports.gapAnalysis.details) {
      const d = reports.gapAnalysis.details;
      const aiRisk = d.bandDistribution?.ai_risk || 0;
      if (aiRisk > 0) {
        kpis.push({
          metric: "AI vs Google Gap",
          baseline: `${aiRisk} queries at AI risk (measured)`,
          target: qIdx === 0 ? "Identify root causes" : qIdx === 1 ? "Create AI-targeted content" : qIdx === 2 ? "Reduce ai_risk count" : "Eliminate remaining gaps",
        });
      }
    }
    return kpis;
  };

  // ──────────────────────────────────────────────
  // Annual Plan Item Toggle
  // ──────────────────────────────────────────────

  const handleToggleAnnualItem = (quarterId: string, itemId: string) => {
    if (!annualPlan) return;
    setAnnualPlan({
      ...annualPlan,
      quarters: annualPlan.quarters.map((q) =>
        q.quarter === quarterId
          ? { ...q, items: q.items.map((item) => item.id === itemId ? { ...item, selected: !item.selected } : item) }
          : q
      ),
    });
  };

  const handleGenerateFromSelected = async (selectedItems: QuarterlyItem[]) => {
    setLoading(true);
    setActiveTab("action_plans");
    try {
      const objective = `Execute ${selectedItems.length} strategic items: ${selectedItems.map((i) => i.title).join("; ")}. Categories: ${[...new Set(selectedItems.map((i) => i.category))].join(", ")}. Platforms: ${[...new Set(selectedItems.flatMap((i) => i.platforms))].join(", ")}.`;

      const response = await fetch("/api/geo-core/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          targetKeywords: keywords.length > 0 ? keywords : intelligenceData?.project?.keywords || [],
          domain: domain || intelligenceData?.project?.website,
          channels: ["all"],
          projectId: selectedProjectId,
          language: language || "en",
          intelligenceContext: intelligenceData || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate action plans");

      await loadPlans();
      toast.success("Execution action plans generated!");
    } catch (err: any) {
      console.error("Error generating action plans:", err);
      toast.error(err.message || "Failed to generate execution plans");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Quick Action Plan Generation (legacy flow)
  // ──────────────────────────────────────────────

  const generateActionPlan = async () => {
    if (!objective.trim()) {
      toast.error("Please enter an objective");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/geo-core/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          targetKeywords: keywords.length > 0 ? keywords : intelligenceData?.project?.keywords || undefined,
          domain: domain.trim() || intelligenceData?.project?.website || undefined,
          channels: ["all"],
          projectId: selectedProjectId || undefined,
          language: language || "en",
          intelligenceContext: intelligenceData || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate action plan");

      await loadPlans();
      toast.success(data.saved ? "AI Action plan generated and saved!" : "AI Action plan generated!");
      setObjective("");
    } catch (err: any) {
      console.error("Action plan error:", err);
      toast.error(err.message || "Failed to generate action plan");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Plan Operations
  // ──────────────────────────────────────────────

  const togglePlan = (planId: string) => {
    setPlans(plans.map((p) => (p.id === planId ? { ...p, expanded: !p.expanded } : p)));
  };

  const toggleStep = async (planId: string, stepIndex: number) => {
    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? { ...p, steps: p.steps.map((s, idx) => (idx === stepIndex ? { ...s, completed: !s.completed } : s)) }
        : p
    );
    setPlans(updatedPlans);

    const plan = updatedPlans.find((p) => p.id === planId);
    if (plan) {
      try {
        const response = await fetch("/api/geo-core/action-plan", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id, steps: plan.steps }),
        });
        if (!response.ok) throw new Error("Failed to update step");
      } catch {
        toast.error("Failed to save step completion");
        setPlans(plans);
      }
    }
  };

  // Navigate to content generator from an annual plan item (content_generation type)
  const handleAnnualItemGenerateContent = (item: QuarterlyItem) => {
    // Map platform display names → content generator platform IDs
    const platformName = (item.platforms?.[0] || item.where || "").toLowerCase();
    let platform = "medium";
    if (platformName.includes("linkedin")) platform = "linkedin";
    else if (platformName.includes("reddit")) platform = "reddit";
    else if (platformName.includes("medium")) platform = "medium";
    else if (platformName.includes("quora")) platform = "quora";
    else if (platformName.includes("blog") || platformName.includes("website") || platformName.includes("shopify") || platformName.includes("wordpress")) platform = "shopify";
    else if (platformName.includes("twitter") || platformName.includes("x")) platform = "twitter";
    else if (platformName.includes("instagram")) platform = "instagram";
    else if (platformName.includes("facebook")) platform = "facebook";
    else if (platformName.includes("github")) platform = "github";
    else if (item.channel === "seo") platform = "shopify";

    const isBlog = platform === "shopify";
    const contentType = isBlog ? "blog_article" : platform === "linkedin" ? "linkedin_post" : "post";

    const params = new URLSearchParams();
    params.append("topic", item.title || item.description.slice(0, 80));
    params.append("platform", platform);
    if (item.kpis?.length) params.append("keywords", item.kpis.join(","));
    params.append("contentType", contentType);

    router.push(isBlog ? `/dashboard/blog?${params}` : `/dashboard/content-generator?${params}`);
  };

  const executeStep = (planId: string, stepId: string) => {
    if (!stepId) { toast.error("Step ID is missing"); return; }
    const plan = plans.find((p) => p.id === planId);
    const step = plan?.steps.find((s: any) => s.id === stepId);
    if (!step) { toast.error("Step not found"); return; }

    const execMetadata = step.executionMetadata || {};
    const platform = (execMetadata.platform || step.platform || "").toLowerCase();
    const contentType = (execMetadata.contentType || "").toLowerCase();
    const isBlogStep = platform === "shopify" || platform === "wordpress" || platform === "wordpress_self_hosted" || contentType === "blog_article";

    const params = new URLSearchParams({ actionPlanId: planId, stepId });
    if (execMetadata.topic) params.append("topic", execMetadata.topic);
    if (execMetadata.platform) params.append("platform", execMetadata.platform);
    if (execMetadata.keywords?.length) params.append("keywords", execMetadata.keywords.join(","));
    if (execMetadata.contentType) params.append("contentType", execMetadata.contentType);

    router.push(isBlogStep ? `/dashboard/blog?${params}` : `/dashboard/content-generator?${params}`);
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this action plan?")) return;
    try {
      const response = await fetch(`/api/geo-core/action-plan?planId=${planId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete plan");
      setPlans(plans.filter((p) => p.id !== planId));
      toast.success("Action plan deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete action plan");
    }
  };

  const handleExportPDF = async (plan: ActionPlan) => {
    setExportPlanId(null);
    const loadingToast = toast.loading("Generating PDF...");
    try {
      await exportPlanToPDF(plan);
      toast.success("PDF exported successfully!", { id: loadingToast });
    } catch (err: any) {
      toast.error(err.message || "Failed to export PDF", { id: loadingToast });
    }
  };

  const handleCrawlNewDomain = async () => {
    if (!domain.trim()) { toast.error("Please enter a domain to crawl"); return; }
    setCrawlingDomain(true);
    try {
      const crawlResponse = await fetch("/api/crawl-website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: domain }) });
      const crawlData = await crawlResponse.json();
      if (crawlResponse.ok && crawlData.success) {
        setSelectedProject({
          id: "temp-" + Date.now(),
          brand_name: crawlData.metadata?.title || domain.split(".")[0],
          industry: "Unknown",
          website_url: domain,
          company_description: crawlData.description || "",
          company_image_url: crawlData.imageUrl || null,
        });
        setSelectedProjectId(null);
        toast.success("Website crawled successfully!");
      } else {
        toast.error(crawlData.error || "Failed to crawl website");
      }
    } catch { toast.error("Failed to crawl website"); }
    finally { setCrawlingDomain(false); }
  };

  // ──────────────────────────────────────────────
  // Client File Data
  // ──────────────────────────────────────────────

  const getClientFileSections = () => {
    const sections = [
      {
        id: "raw_data",
        title: "Raw Scan Data",
        description: "Domain crawl data, GSC metrics, AI platform responses",
        icon: null,
        status: (intelligenceData?.dataCompleteness?.gscData || intelligenceData?.dataCompleteness?.aiVisibility) ? "available" as const : "missing" as const,
        itemCount: intelligenceData ? Object.values(intelligenceData.dataCompleteness || {}).filter(Boolean).length : 0,
        lastUpdated: intelligenceData?.generatedAt || null,
      },
      {
        id: "strategic_reports",
        title: "Strategic Reports",
        description: "10 intelligence outputs",
        icon: null,
        status: intelligenceData ? (intelligenceData.dataCompleteness?.completenessScore >= 60 ? "available" as const : "partial" as const) : "missing" as const,
        itemCount: intelligenceData ? Object.values(intelligenceData.reports || {}).filter((r: any) => r?.available).length : 0,
        lastUpdated: intelligenceData?.generatedAt || null,
      },
      {
        id: "annual_plan",
        title: "Annual Strategic Plan",
        description: "12-month quarterly execution structure",
        icon: null,
        status: annualPlan ? "available" as const : "missing" as const,
        itemCount: annualPlan ? annualPlan.quarters.flatMap((q) => q.items).length : 0,
        lastUpdated: annualPlan?.generatedAt || null,
      },
      {
        id: "selected_items",
        title: "Selected Execution Items",
        description: "Items selected from annual plan",
        icon: null,
        status: annualPlan?.quarters.some((q) => q.items.some((i) => i.selected)) ? "available" as const : "missing" as const,
        itemCount: annualPlan ? annualPlan.quarters.flatMap((q) => q.items).filter((i) => i.selected).length : 0,
        lastUpdated: null,
      },
      {
        id: "action_plans",
        title: "Auto-Generated Action Plans",
        description: "Execution plans with task breakdowns",
        icon: null,
        status: plans.length > 0 ? "available" as const : "missing" as const,
        itemCount: plans.length,
        lastUpdated: plans.length > 0 ? plans[0].createdAt.toISOString() : null,
      },
      {
        id: "kpi_dashboard",
        title: "KPI Dashboard",
        description: "Performance metrics and tracking",
        icon: null,
        status: intelligenceData ? "partial" as const : "missing" as const,
        itemCount: intelligenceData ? 6 : 0,
        lastUpdated: intelligenceData?.generatedAt || null,
      },
      {
        id: "progress_log",
        title: "Progress Log",
        description: "Historical action log",
        icon: null,
        status: plans.some((p) => p.steps.some((s) => s.completed)) ? "partial" as const : "missing" as const,
        itemCount: plans.reduce((acc, p) => acc + p.steps.filter((s) => s.completed).length, 0),
        lastUpdated: null,
      },
      {
        id: "quarterly_updates",
        title: "Quarterly Updates",
        description: "Performance reviews and adjustments",
        icon: null,
        status: "missing" as const,
        itemCount: 0,
        lastUpdated: null,
      },
    ];
    return sections;
  };

  const handleClientFileViewSection = (sectionId: string) => {
    const tabMap: Record<string, TabKey> = {
      raw_data: "intelligence",
      strategic_reports: "intelligence",
      annual_plan: "annual_plan",
      selected_items: "annual_plan",
      action_plans: "action_plans",
      kpi_dashboard: "kpi",
      progress_log: "action_plans",
      quarterly_updates: "kpi",
    };
    setActiveTab(tabMap[sectionId] || "intelligence");
  };

  const handleExportAllClientFile = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    const loadingToast = toast.loading("Generating full client file PDF…");
    try {
      await exportClientFilePDF({
        project: {
          name:        selectedProject.brand_name || "Brand",
          industry:    selectedProject.industry || "—",
          website:     selectedProject.website_url || undefined,
          description: selectedProject.company_description || undefined,
          keywords:    selectedProject.keywords?.length ? selectedProject.keywords : undefined,
        },
        intelligenceData: intelligenceData ?? undefined,
        annualPlan:       annualPlan       ?? undefined,
        actionPlans:      selectedProjectId
                           ? plans.filter((p) => p.projectId === selectedProjectId)
                           : plans,
      });
      toast.success("Client file PDF exported!", { id: loadingToast });
    } catch (err: any) {
      console.error("Client file export error:", err);
      toast.error(err.message || "Failed to export client file", { id: loadingToast });
    }
  };

  // ──────────────────────────────────────────────
  // Filtered plans for the selected project
  // ──────────────────────────────────────────────

  const filteredPlans = selectedProjectId
    ? plans.filter((p) => p.projectId === selectedProjectId)
     : [];

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-300";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Action Plans</h1>
            <p className="text-gray-600 text-sm">
              Strategic Intelligence & Annual Execution Engine
            </p>
          </div>
        </div>
      </div>

      {/* Project Selector Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Brand Project
            </label>
            <select
              value={selectedProjectId || ""}
              onChange={(e) => handleProjectSelect(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white text-sm"
              disabled={loadingProjects}
            >
              <option value="">Select a brand project...</option>
              {brandProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.brand_name} ({project.industry})
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div className="flex items-center gap-3">
              {selectedProject.company_image_url && (
                <img
                  src={selectedProject.company_image_url}
                  alt={selectedProject.brand_name}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {selectedProject.brand_name}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedProject.industry} · {selectedProject.website_url}
                </div>
              </div>
              {loadingIntelligence && (
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}

          {intelligenceData && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="text-right">
                <div className="text-xs text-gray-500">Brand Health</div>
                <div className={`text-lg font-bold ${
                  (intelligenceData.reports.executiveBrief?.overallHealth || 0) >= 60
                    ? "text-green-600"
                    : (intelligenceData.reports.executiveBrief?.overallHealth || 0) >= 35
                    ? "text-amber-600"
                    : "text-red-600"
                }`}>
                  {intelligenceData.reports.executiveBrief?.overallHealth || 0}/100
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Data</div>
                <div className="text-lg font-bold text-violet-600">
                  {intelligenceData.dataCompleteness?.completenessScore || 0}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? "border-violet-600 text-violet-700 bg-violet-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <IconComp className={`w-4 h-4 ${isActive ? "text-violet-600" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Strategic Intelligence Tab */}
        {activeTab === "intelligence" && (
          <StrategicIntelligence
            data={intelligenceData}
            loading={loadingIntelligence}
            onGeneratePlan={generateAnnualPlan}
          />
        )}

        {/* 12-Month Plan Tab */}
        {activeTab === "annual_plan" && (
          <div className="space-y-4">
            {/* Annual plan toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  12-Month Strategic Plan
                </h2>
                {annualPlanSavedAt && !loadingAnnualPlan && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    Saved {new Date(annualPlanSavedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {intelligenceData && (
                <div className="flex items-center gap-2">
                  {!annualPlan && !loadingAnnualPlan && (
                    <button
                      onClick={() => generateAnnualPlan(false)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Plan
                    </button>
                  )}
                  {annualPlan && !loadingAnnualPlan && (
                    <button
                      onClick={() => generateAnnualPlan(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                  )}
                </div>
              )}
            </div>
            <AnnualPlanView
              plan={annualPlan}
              loading={loadingAnnualPlan}
              onSelectItems={handleGenerateFromSelected}
              onToggleItem={handleToggleAnnualItem}
              onGenerateContent={handleAnnualItemGenerateContent}
            />
          </div>
        )}

        {/* Action Plans Tab */}
        {activeTab === "action_plans" && (
          <div className="space-y-6">
            {/* Quick Generate Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-600" />
                Quick Generate Action Plan
              </h3>
              <div className="flex gap-3 flex-wrap">
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Enter objective or goal..."
                  rows={2}
                  className="flex-1 min-w-[300px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-sm"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="Domain (optional)"
                      className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleCrawlNewDomain}
                      disabled={crawlingDomain || !domain.trim()}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      title="Crawl domain"
                    >
                      {crawlingDomain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={generateActionPlan}
                    disabled={loading || !objective.trim()}
                    variant="primary"
                    size="sm"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Generate Plan
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 mr-1 self-center">Keywords:</span>
                  {keywords.slice(0, 10).map((kw, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200">
                      {kw}
                      <button
                        onClick={() => setKeywords(keywords.filter((_, i) => i !== idx))}
                        className="ml-1 text-violet-400 hover:text-red-500"
                      >
                        <X className="w-2.5 h-2.5 inline" />
                      </button>
                    </span>
                  ))}
                  {keywords.length > 10 && (
                    <span className="text-xs text-gray-400">+{keywords.length - 10} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Loading States */}
            {loadingPlans && (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Loading action plans...</p>
              </div>
            )}

            {loading && !loadingPlans && (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">AI crafting your action plan...</p>
                <p className="text-sm text-gray-500 mt-1">Analyzing strategy and generating steps</p>
              </div>
            )}

            {/* Empty State */}
            {filteredPlans.length === 0 && !loading && !loadingPlans && (
              <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {!selectedProjectId ? (
                  <>
                    <p className="text-gray-700 font-medium mb-2">No project selected</p>
                    <p className="text-sm text-gray-500">
                      Select a brand project from the dropdown above to view its action plans.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-2">No action plans for this project yet</p>
                    <p className="text-sm text-gray-500">
                      {intelligenceData
                        ? "Generate a 12-month plan from the Strategic Intelligence tab and select items for execution, or use Quick Generate above."
                        : "Run strategic intelligence for this project first, then generate action plans."}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Plans List */}
            {filteredPlans.length > 0 && !loading && !loadingPlans && (
              <div className="space-y-4">
                {filteredPlans.map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="overflow-hidden">
                      {/* Plan Header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-2 -m-2"
                            onClick={() => togglePlan(plan.id)}
                          >
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <div className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getPriorityColor(plan.priority)}`}>
                                {plan.priority.toUpperCase()}
                              </div>
                              {plan.projectName && (
                                <div className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {plan.projectName}
                                </div>
                              )}
                              <div className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                {plan.category}
                              </div>
                              {plan.channels?.map((channel: string) => (
                                <div key={channel} className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                                  {channel.replace("_", " ")}
                                </div>
                              ))}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {plan.timeline}
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" />
                                {plan.steps.filter((s) => s.completed).length}/{plan.steps.length} completed
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="relative" ref={exportPlanId === plan.id ? exportDropdownRef : null}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setExportPlanId(exportPlanId === plan.id ? null : plan.id); }}
                                className="text-gray-500 hover:text-primary-600 p-2 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
                                title="Export"
                              >
                                <FileDown className="w-4 h-4" />
                                <ChevronDown className={`w-3 h-3 transition-transform ${exportPlanId === plan.id ? "rotate-180" : ""}`} />
                              </button>
                              {exportPlanId === plan.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleExportPDF(plan); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    Export as PDF
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => togglePlan(plan.id)}
                              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {plan.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {plan.expanded && (
                        <div className="border-t border-gray-200">
                          <div className="p-5 border-b border-gray-200 space-y-4">
                            <PlanProgress plan={plan} />
                            <PlanMetrics plan={plan} compact />
                          </div>

                          <div className="p-5 border-b border-gray-200 bg-gray-50/50" id={`business-plan-${plan.id}`}>
                            <BusinessPlanView plan={plan} />
                          </div>

                          <div className="p-5 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-200">
                            <div className="flex items-start gap-2 mb-3">
                              <Zap className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-semibold text-violet-900 mb-1">AI Strategic Reasoning</div>
                                <p className="text-sm text-gray-700">{plan.reasoning}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-semibold text-green-900 mb-1">Expected Outcome</div>
                                <p className="text-sm text-gray-700">{plan.expectedOutcome}</p>
                              </div>
                            </div>
                          </div>

                          {/* Action Steps */}
                          <div className="p-5">
                            <h4 className="text-sm font-bold text-gray-900 mb-3">Action Steps</h4>
                            <div className="space-y-2.5">
                              {plan.steps.map((step, stepIdx) => {
                                const stepId = step.id || `step-${stepIdx}`;
                                const executionStatus = step.executionMetadata?.executionStatus || "pending";
                                const isExecuting = executingStep === `${plan.id}-${stepId}`;
                                const canExecute = step.executionType === "content_generation" && step.executionMetadata?.autoExecute;

                                return (
                                  <div
                                    key={stepIdx}
                                    className={`border rounded-lg p-3.5 transition-all ${
                                      step.completed || executionStatus === "published"
                                        ? "bg-green-50 border-green-200"
                                        : executionStatus === "review"
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-white border-gray-200 hover:border-violet-300"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <button onClick={() => toggleStep(plan.id, stepIdx)} className="mt-0.5 flex-shrink-0" disabled={executionStatus === "published"}>
                                        {step.completed || executionStatus === "published" ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-gray-400 hover:text-violet-600 transition-colors" />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                          <div className="flex-1">
                                            <h5 className={`font-semibold text-sm ${step.completed || executionStatus === "published" ? "text-green-900 line-through" : "text-gray-900"}`}>
                                              {stepIdx + 1}. {step.step}
                                            </h5>
                                            {(step.channel || step.platform) && (
                                              <div className="flex items-center gap-1.5 mt-1">
                                                {step.channel && <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{step.channel}</span>}
                                                {step.platform && <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">{step.platform}</span>}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <div className={`px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 ${getPriorityColor(step.priority)}`}>
                                              {step.priority}
                                            </div>
                                            {executionStatus === "published" && (
                                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Published</span>
                                            )}
                                            {executionStatus === "review" && (
                                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Review</span>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1.5">{step.description}</p>
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <div className="flex items-center gap-2 text-xs">
                                            <span className="text-gray-500">Impact:</span>
                                            <span className="font-semibold text-green-700">{step.estimatedImpact}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {canExecute && executionStatus === "pending" && (
                                              <Button onClick={() => executeStep(plan.id, stepId)} disabled={isExecuting} variant="primary" size="sm">
                                                {isExecuting ? (
                                                  <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />Generating...</>
                                                ) : (
                                                  <><Play className="w-3 h-3 mr-1" />Generate Content</>
                                                )}
                                              </Button>
                                            )}
                                            {executionStatus === "review" && step.executionMetadata?.linkedContentId && (
                                              <Button onClick={() => router.push(`/dashboard/content?contentId=${step.executionMetadata?.linkedContentId}`)} variant="primary" size="sm">
                                                <ExternalLink className="w-3 h-3 mr-1" />Review
                                              </Button>
                                            )}
                                            {executionStatus === "published" && step.executionMetadata?.publishedUrl && (
                                              <a href={step.executionMetadata.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1">
                                                View Published <ExternalLink className="w-3 h-3" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KPI Dashboard Tab */}
        {activeTab === "kpi" && (
          <KPIDashboard
            intelligenceData={intelligenceData}
            planProgress={
              plans.length > 0
                ? {
                    totalPlans: plans.length,
                    completedSteps: plans.reduce((a, p) => a + p.steps.filter((s: any) => s.completed).length, 0),
                    totalSteps: plans.reduce((a, p) => a + p.steps.length, 0),
                  }
                : undefined
            }
          />
        )}

        {/* Client File Tab */}
        {activeTab === "client_file" && (
          <ClientFile
            projectName={selectedProject?.brand_name || "No Project Selected"}
            sections={getClientFileSections()}
            onExportAll={handleExportAllClientFile}
            onViewSection={handleClientFileViewSection}
          />
        )}
      </div>
    </div>
  );
}
