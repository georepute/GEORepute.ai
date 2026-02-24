"use client";

import { useState, useEffect, useRef } from "react";
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
  Download,
  FileText,
  Presentation,
  DollarSign,
  BarChart3,
  Shield,
  Flag,
} from "lucide-react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";
import { PlanProgress } from "./_components/PlanProgress";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";

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

interface BusinessPlanData {
  kpis: Array<{ name: string; current: string; target: string; timeframe: string; metric_type: string }>;
  budget: { total_estimated: string; breakdown: Array<{ category: string; amount: number; percentage: number }> };
  roi_projection: { monthly_projections: Array<{ month: number; investment: number; estimated_return: number; cumulative_roi: number }>; break_even_month: number; projected_annual_roi: string };
  competitive_positioning: { summary: string; strengths: string[]; gaps: string[]; market_opportunity: string };
  milestones: Array<{ month: number; title: string; goals: string[] }>;
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
  businessPlanData?: BusinessPlanData;
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

export default function ActionPlansPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [objective, setObjective] = useState("");
  const [domain, setDomain] = useState("");
  const [executingStep, setExecutingStep] = useState<string | null>(null);
  
  // Brand project selection state
  const [brandProjects, setBrandProjects] = useState<BrandProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<BrandProject | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [crawlingDomain, setCrawlingDomain] = useState(false);
  
  // Keywords state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loadingGSCKeywords, setLoadingGSCKeywords] = useState(false);
  const [planLanguage, setPlanLanguage] = useState<"en" | "he">("en");
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [exportingPptx, setExportingPptx] = useState<string | null>(null);

  // Load existing plans and brand projects on mount
  useEffect(() => {
    loadPlans();
    loadBrandProjects();
  }, []);

  // Load brand analysis projects from database
  const loadBrandProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('brand_analysis_projects')
        .select('id, brand_name, industry, website_url, company_description, company_image_url, keywords, competitors')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading brand projects:', error);
        return;
      }

      setBrandProjects(data || []);
    } catch (error: any) {
      console.error('Error loading brand projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load keywords from project (manual + GSC)
  const loadProjectKeywords = async (projectId: string) => {
    setLoadingGSCKeywords(true);
    try {
      const project = brandProjects.find(p => p.id === projectId);
      if (!project) return;

      // Start with manual keywords from project
      const manualKeywords = project.keywords || [];
      let allKeywords = [...manualKeywords];

      // Fetch GSC keywords if available
      try {
        const gscResponse = await fetch(`/api/brand-analysis/${projectId}/gsc-keywords`);
        const gscData = await gscResponse.json();
        
        if (gscData.success && gscData.keywords && gscData.keywords.length > 0) {
          // Extract keyword strings from GSC data (they have keyword, clicks, impressions, etc.)
          const gscKeywordStrings = gscData.keywords.map((kw: any) => kw.keyword);
          // Merge with manual keywords, avoiding duplicates
          const uniqueKeywords = new Set([...allKeywords, ...gscKeywordStrings]);
          allKeywords = Array.from(uniqueKeywords);
        }
      } catch (error) {
        console.log('GSC keywords not available or error fetching:', error);
        // Continue with just manual keywords if GSC fails
      }

      setKeywords(allKeywords);
    } catch (error) {
      console.error('Error loading project keywords:', error);
      // Fallback to just manual keywords
      const project = brandProjects.find(p => p.id === projectId);
      setKeywords(project?.keywords || []);
    } finally {
      setLoadingGSCKeywords(false);
    }
  };

  // Handle project selection
  const handleProjectSelect = async (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      const project = brandProjects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        // Auto-fill domain from project
        if (project.website_url) {
          setDomain(project.website_url);
        }
        // Load keywords from project
        await loadProjectKeywords(projectId);
      }
    } else {
      setSelectedProject(null);
      setDomain("");
      setKeywords([]); // Clear keywords when no project selected
    }
  };

  // Handle crawling a new domain
  const handleCrawlNewDomain = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain to crawl");
      return;
    }

    setCrawlingDomain(true);
    try {
      const crawlResponse = await fetch("/api/crawl-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: domain }),
      });

      const crawlData = await crawlResponse.json();

      if (crawlResponse.ok && crawlData.success) {
        // Update selected project with crawled data (create a temporary project object)
        const crawledProject: BrandProject = {
          id: 'temp-' + Date.now(),
          brand_name: crawlData.metadata?.title || domain.split('.')[0],
          industry: 'Unknown',
          website_url: domain,
          company_description: crawlData.description || '',
          company_image_url: crawlData.imageUrl || null,
        };
        
        setSelectedProject(crawledProject);
        setSelectedProjectId(null); // Clear selected project ID since this is a new crawl
        toast.success("Website crawled successfully!");
      } else {
        toast.error(crawlData.error || "Failed to crawl website");
      }
    } catch (error: any) {
      console.error("Error crawling domain:", error);
      toast.error("Failed to crawl website");
    } finally {
      setCrawlingDomain(false);
    }
  };

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch('/api/geo-core/action-plan');
      
      if (!response.ok) {
        throw new Error("Failed to load action plans");
      }

      const data = await response.json();
      console.log("📋 Loaded plans data:", data.plans?.map((p: any) => ({ id: p.id, title: p.title, projectName: p.projectName, projectId: p.projectId })));
      
      const loadedPlans: ActionPlan[] = (data.plans || []).map((plan: any) => {
        console.log("🔍 Processing plan:", plan.id, "projectName:", plan.projectName, "projectId:", plan.projectId);
        // Extract project info from execution_metadata if not in main fields
        const execMetadata = plan.executionMetadata || {};
        const projectId = plan.projectId || execMetadata.project_id || undefined;
        const projectName = plan.projectName || execMetadata.project_name || undefined;
        
        return {
          id: plan.id,
          title: plan.title,
          objective: plan.objective,
          channels: plan.channels || [],
          domain: plan.domain,
          region: plan.region,
          projectId: projectId,
          projectName: projectName,
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
            executionMetadata: step.executionMetadata || {
              executionStatus: "pending",
              autoExecute: false,
            },
          })),
          reasoning: plan.reasoning || "",
          expectedOutcome: plan.expectedOutcome || "",
          timeline: plan.timeline || "",
          priority: plan.priority || "medium",
          category: plan.category || "General",
          createdAt: plan.createdAt ? new Date(plan.createdAt) : new Date(),
          expanded: false,
          businessPlanData: plan.businessPlanData || execMetadata.business_plan_data || undefined,
        };
      });

      setPlans(loadedPlans);
    } catch (error: any) {
      console.error("Error loading plans:", error);
      toast.error("Failed to load action plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const generateActionPlan = async () => {
    if (!objective.trim()) {
      toast.error("Please enter an objective");
      return;
    }

    setLoading(true);
    try {
      // Action plan generation using Claude Sonnet 4.5 (Hebrew when language toggle is HE)
      const response = await fetch('/api/geo-core/action-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objective: objective,
          targetKeywords: keywords.length > 0 ? keywords : undefined,
          domain: domain.trim() || undefined,
          channels: ['all'], // Always use all channels
          projectId: selectedProjectId || undefined,
          language: planLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to generate action plan');
      }

      // Check if plan was saved successfully
      if (!data.saved) {
        toast.error("Plan generated but failed to save. It may not persist after refresh.");
        console.warn("Action plan was not saved to database");
      }

      console.log("📝 Creating new plan with project info:", {
        projectId: data.projectId || selectedProjectId,
        projectName: data.projectName || selectedProject?.brand_name,
        selectedProject: selectedProject?.brand_name
      });

      const newPlan: ActionPlan = {
        id: data.planId || Date.now().toString(),
        title: data.title,
        objective: data.objective,
        channels: data.channels || [],
        domain: data.domain,
        region: data.region,
        projectId: data.projectId || selectedProjectId || undefined,
        projectName: data.projectName || selectedProject?.brand_name || undefined,
        steps: (data.steps || []).map((step: any) => ({
          step: step.step || step.title || "",
          description: step.description || "",
          priority: step.priority || "medium",
          estimatedImpact: step.estimatedImpact || step.estimatedTime || "Not specified",
          completed: step.completed || false,
          id: step.id,
          channel: step.channel,
          platform: step.platform,
          executionType: step.executionType,
          executionMetadata: step.executionMetadata || {
            executionStatus: "pending",
            autoExecute: false,
          },
        })),
        reasoning: data.reasoning,
        expectedOutcome: data.expectedOutcome,
        timeline: data.timeline,
        priority: data.priority,
        category: data.category,
        createdAt: new Date(),
        expanded: true,
        businessPlanData: data.businessPlanData || undefined,
      };

      // Reload plans from database to ensure we have the saved version
      await loadPlans();
      
      // If plan was saved, show success. Otherwise show warning.
      if (data.saved) {
        toast.success("AI Action plan generated and saved!");
      } else {
        toast.success("AI Action plan generated!");
        toast.error("Warning: Plan may not persist after refresh. Check console for details.");
      }
      
      setObjective("");
      setDomain("");
      setKeywords([]);
      setSelectedProjectId(null);
      setSelectedProject(null);
    } catch (error: any) {
      console.error("Action plan error:", error);
      toast.error(error.message || "Failed to generate action plan. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (planId: string) => {
    setPlans(
      plans.map((p) =>
        p.id === planId ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  const toggleStep = async (planId: string, stepIndex: number) => {
    // Update local state immediately for responsive UI
    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            steps: p.steps.map((s, idx) =>
              idx === stepIndex ? { ...s, completed: !s.completed } : s
            ),
          }
        : p
    );
    setPlans(updatedPlans);

    // Persist to database
    const plan = updatedPlans.find((p) => p.id === planId);
    if (plan) {
      try {
        const response = await fetch('/api/geo-core/action-plan', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planId: plan.id,
            steps: plan.steps,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update step');
        }
      } catch (error: any) {
        console.error("Error updating step:", error);
        toast.error("Failed to save step completion");
        // Revert local state on error
        setPlans(plans);
      }
    }
  };

  const executeStep = (planId: string, stepId: string) => {
    if (!stepId) {
      toast.error("Step ID is missing");
      return;
    }

    // Find the step to get its metadata
    const plan = plans.find(p => p.id === planId);
    const step = plan?.steps.find((s: any) => s.id === stepId);
    
    if (!step) {
      toast.error("Step not found");
      return;
    }

    const execMetadata = step.executionMetadata || {};
    const platform = (execMetadata.platform || step.platform || "").toLowerCase();
    const contentType = (execMetadata.contentType || "").toLowerCase();
    const isBlogStep = platform === "shopify" || platform === "wordpress" || platform === "wordpress_self_hosted" || contentType === "blog_article";

    const params = new URLSearchParams({
      actionPlanId: planId,
      stepId: stepId,
    });
    if (execMetadata.topic) params.append("topic", execMetadata.topic);
    if (execMetadata.platform) params.append("platform", execMetadata.platform);
    if (execMetadata.keywords && Array.isArray(execMetadata.keywords)) {
      params.append("keywords", execMetadata.keywords.join(","));
    }
    if (execMetadata.contentType) params.append("contentType", execMetadata.contentType);

    // Blog/shopify/wordpress steps → Blog page for blog generation; others → Content generator
    if (isBlogStep) {
      router.push(`/dashboard/blog?${params.toString()}`);
    } else {
      router.push(`/dashboard/content-generator?${params.toString()}`);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this action plan?")) {
      return;
    }

    try {
      const response = await fetch(`/api/geo-core/action-plan?planId=${planId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete plan');
      }

      // Remove from local state
      setPlans(plans.filter((p) => p.id !== planId));
      toast.success("Action plan deleted successfully");
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast.error(error.message || "Failed to delete action plan");
    }
  };

  const CHART_COLORS = ['#9333ea', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const exportPlanPDF = async (plan: ActionPlan) => {
    const toastId = toast.loading("Generating PDF report...");
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;

      const PURPLE = { r: 147, g: 51, b: 234 };
      const PURPLE_DARK = { r: 107, g: 33, b: 168 };
      const GRAY_700 = { r: 55, g: 65, b: 81 };
      const GRAY_500 = { r: 107, g: 114, b: 128 };
      const GREEN = { r: 16, g: 185, b: 129 };
      const RED = { r: 239, g: 68, b: 68 };
      const AMBER = { r: 245, g: 158, b: 11 };

      let logoDataUrl: string | null = null;
      try {
        const logoRes = await fetch('/logo.png');
        const blob = await logoRes.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* continue without logo */ }

      const addHeader = (pageNum: number, totalPages: number) => {
        doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
        doc.rect(0, 0, pageW, 14, 'F');
        if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'PNG', margin, 2.5, 9, 9); } catch {} }
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('GEORepute.ai', margin + 12, 8.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('AI Visibility Intelligence Platform', pageW - margin, 8.5, { align: 'right' });
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.setFontSize(7);
        doc.text(`Confidential - Generated by GEORepute.ai`, margin, pageH - 6);
        doc.text(`Page ${pageNum} of ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' });
        doc.text(new Date().toLocaleDateString(), pageW - margin, pageH - 6, { align: 'right' });
      };

      const addSectionTitle = (title: string, y: number): number => {
        doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
        doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 4, y + 5.5);
        return y + 12;
      };

      // --- PAGE 1: Cover ---
      doc.setFillColor(PURPLE_DARK.r, PURPLE_DARK.g, PURPLE_DARK.b);
      doc.rect(0, 0, pageW, 50, 'F');
      doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
      doc.rect(0, 50, pageW, 40, 'F');
      if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'PNG', margin, 12, 22, 22); } catch {} }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('GEORepute.ai', margin + 28, 26);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('AI Visibility Intelligence Platform', margin + 28, 34);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('Business Action Plan', margin, 70);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(plan.title, margin, 80);
      doc.setFillColor(AMBER.r, AMBER.g, AMBER.b);
      doc.rect(margin, 98, 40, 2, 'F');
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      doc.setFontSize(11);
      doc.text(`Priority: ${plan.priority.toUpperCase()}`, margin, 115);
      doc.text(`Category: ${plan.category}`, margin, 122);
      doc.text(`Timeline: ${plan.timeline}`, margin, 129);
      if (plan.projectName) doc.text(`Project: ${plan.projectName}`, margin, 136);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, plan.projectName ? 143 : 136);

      // --- PAGE 2: Executive Summary ---
      doc.addPage();
      let y = 20;
      addHeader(2, 6);
      y = addSectionTitle('Executive Summary', y);
      doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Objective:', margin, y + 4);
      doc.setFont('helvetica', 'normal');
      const objLines = doc.splitTextToSize(plan.objective, contentW - 25);
      doc.text(objLines, margin + 25, y + 4);
      y += 4 + objLines.length * 4 + 4;
      doc.setFont('helvetica', 'bold');
      doc.text('AI Strategic Reasoning:', margin, y);
      doc.setFont('helvetica', 'normal');
      y += 4;
      const reasonLines = doc.splitTextToSize(plan.reasoning, contentW);
      doc.text(reasonLines, margin, y);
      y += reasonLines.length * 4 + 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Expected Outcome:', margin, y);
      doc.setFont('helvetica', 'normal');
      y += 4;
      const outcomeLines = doc.splitTextToSize(plan.expectedOutcome, contentW);
      doc.text(outcomeLines, margin, y);

      if (plan.businessPlanData) {
        const bpd = plan.businessPlanData;

        // --- PAGE 3: KPIs ---
        doc.addPage();
        addHeader(3, 6);
        y = addSectionTitle('KPIs & Goals', 20);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.rect(margin, y, contentW, 7, 'F');
        const colW = contentW / 4;
        doc.text('KPI', margin + 2, y + 5);
        doc.text('Current', margin + colW + 2, y + 5);
        doc.text('Target', margin + colW * 2 + 2, y + 5);
        doc.text('Timeframe', margin + colW * 3 + 2, y + 5);
        y += 7;
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.setFont('helvetica', 'normal');
        bpd.kpis.forEach((kpi, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 248, 255); doc.rect(margin, y, contentW, 7, 'F'); }
          doc.text(kpi.name.substring(0, 30), margin + 2, y + 5);
          doc.text(kpi.current, margin + colW + 2, y + 5);
          doc.setTextColor(GREEN.r, GREEN.g, GREEN.b);
          doc.text(kpi.target, margin + colW * 2 + 2, y + 5);
          doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
          doc.text(kpi.timeframe, margin + colW * 3 + 2, y + 5);
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          y += 7;
        });

        // Budget breakdown table
        y += 8;
        y = addSectionTitle('Budget Breakdown', y);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.text(`Total Estimated: ${bpd.budget.total_estimated}`, margin, y + 5);
        y += 10;
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.rect(margin, y, contentW, 7, 'F');
        doc.text('Category', margin + 2, y + 5);
        doc.text('Amount', margin + contentW * 0.5 + 2, y + 5);
        doc.text('Percentage', margin + contentW * 0.75 + 2, y + 5);
        y += 7;
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.setFont('helvetica', 'normal');
        bpd.budget.breakdown.forEach((item, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 248, 255); doc.rect(margin, y, contentW, 7, 'F'); }
          doc.text(item.category, margin + 2, y + 5);
          doc.text(`$${item.amount}`, margin + contentW * 0.5 + 2, y + 5);
          doc.text(`${item.percentage}%`, margin + contentW * 0.75 + 2, y + 5);
          y += 7;
        });

        // --- PAGE 4: ROI & Competitive ---
        doc.addPage();
        addHeader(4, 6);
        y = addSectionTitle('ROI Projection', 20);
        doc.setFontSize(9);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.text(`Break-even Month: ${bpd.roi_projection.break_even_month}  |  Projected Annual ROI: ${bpd.roi_projection.projected_annual_roi}`, margin, y + 5);
        y += 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.rect(margin, y, contentW, 7, 'F');
        const roiColW = contentW / 4;
        doc.text('Month', margin + 2, y + 5);
        doc.text('Investment', margin + roiColW + 2, y + 5);
        doc.text('Est. Return', margin + roiColW * 2 + 2, y + 5);
        doc.text('Cum. ROI', margin + roiColW * 3 + 2, y + 5);
        y += 7;
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.setFont('helvetica', 'normal');
        bpd.roi_projection.monthly_projections.forEach((mp, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 248, 255); doc.rect(margin, y, contentW, 7, 'F'); }
          doc.text(`Month ${mp.month}`, margin + 2, y + 5);
          doc.setTextColor(RED.r, RED.g, RED.b);
          doc.text(`$${mp.investment}`, margin + roiColW + 2, y + 5);
          doc.setTextColor(GREEN.r, GREEN.g, GREEN.b);
          doc.text(`$${mp.estimated_return}`, margin + roiColW * 2 + 2, y + 5);
          doc.setTextColor(mp.cumulative_roi >= 0 ? GREEN.r : RED.r, mp.cumulative_roi >= 0 ? GREEN.g : RED.g, mp.cumulative_roi >= 0 ? GREEN.b : RED.b);
          doc.text(`${mp.cumulative_roi}%`, margin + roiColW * 3 + 2, y + 5);
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          y += 7;
        });

        // Competitive Positioning
        y += 8;
        y = addSectionTitle('Competitive Positioning', y);
        doc.setFontSize(9);
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.setFont('helvetica', 'normal');
        const summaryLines = doc.splitTextToSize(bpd.competitive_positioning.summary, contentW);
        doc.text(summaryLines, margin, y + 4);
        y += summaryLines.length * 4 + 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(GREEN.r, GREEN.g, GREEN.b);
        doc.text('Strengths:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        bpd.competitive_positioning.strengths.forEach((s) => { y += 4; doc.text(`  • ${s}`, margin, y); });
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(RED.r, RED.g, RED.b);
        doc.text('Gaps:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        bpd.competitive_positioning.gaps.forEach((g) => { y += 4; doc.text(`  • ${g}`, margin, y); });
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Market Opportunity:', margin, y);
        doc.setFont('helvetica', 'normal');
        y += 4;
        const oppLines = doc.splitTextToSize(bpd.competitive_positioning.market_opportunity, contentW);
        doc.text(oppLines, margin, y);

        // --- PAGE 5: Milestones ---
        doc.addPage();
        addHeader(5, 6);
        y = addSectionTitle('Milestones & Timeline', 20);
        doc.setFontSize(9);
        bpd.milestones.forEach((ms) => {
          doc.setFillColor(PURPLE.r, PURPLE.g, PURPLE.b);
          doc.circle(margin + 4, y + 4, 3, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.text(`M${ms.month}`, margin + 2, y + 5.5);
          doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(ms.title, margin + 12, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          y += 8;
          ms.goals.forEach((goal) => { doc.text(`  • ${goal}`, margin + 12, y); y += 4; });
          y += 4;
        });
      }

      // --- LAST PAGE: Action Steps ---
      doc.addPage();
      const stepsPage = doc.internal.pages.length - 1;
      addHeader(stepsPage, stepsPage);
      y = addSectionTitle('Action Steps', 20);
      doc.setFontSize(8);
      plan.steps.forEach((step, i) => {
        if (y > pageH - 30) { doc.addPage(); addHeader(doc.internal.pages.length - 1, doc.internal.pages.length - 1); y = 20; }
        const priorityColor = step.priority === 'high' ? RED : step.priority === 'medium' ? AMBER : GREEN;
        doc.setFillColor(priorityColor.r, priorityColor.g, priorityColor.b);
        doc.circle(margin + 2, y + 2, 2, 'F');
        doc.setTextColor(GRAY_700.r, GRAY_700.g, GRAY_700.b);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`${i + 1}. ${step.step}`, margin + 7, y + 3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        y += 6;
        const descLines = doc.splitTextToSize(step.description, contentW - 10);
        doc.text(descLines, margin + 7, y);
        y += descLines.length * 3.5 + 2;
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        const meta = [step.channel, step.platform, `Impact: ${step.estimatedImpact}`].filter(Boolean).join(' | ');
        doc.text(meta, margin + 7, y);
        y += 6;
      });

      // Fix page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setTextColor(GRAY_500.r, GRAY_500.g, GRAY_500.b);
        doc.setFontSize(7);
        doc.text(`Page ${i - 1} of ${totalPages - 1}`, pageW / 2, pageH - 6, { align: 'center' });
      }

      const fileName = `${plan.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}_Report.pdf`;
      doc.save(fileName);
      toast.success("PDF report downloaded!", { id: toastId });
    } catch (error: any) {
      console.error("PDF export error:", error);
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  const exportPlanPPTX = async (plan: ActionPlan) => {
    const toastId = toast.loading("Generating PowerPoint...");
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      pptx.author = 'GeoRepute.ai';
      pptx.company = 'GeoRepute.ai';
      pptx.title = `Business Plan - ${plan.title}`;
      pptx.layout = 'LAYOUT_WIDE';

      const purple = '9333ea';
      const purpleDark = '6b21a8';
      const darkGray = '374151';
      const medGray = '6b7280';
      const green = '10b981';
      const red = 'ef4444';
      const amber = 'f59e0b';

      let logoDataUrl: string | null = null;
      try {
        const logoRes = await fetch('/logo.png');
        const blob = await logoRes.blob();
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { /* continue without logo */ }

      // Slide 1: Title
      const slide1 = pptx.addSlide();
      slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '40%', fill: { color: purpleDark } });
      slide1.addShape(pptx.ShapeType.rect, { x: 0, y: '40%', w: '100%', h: '15%', fill: { color: purple } });
      if (logoDataUrl) { try { slide1.addImage({ data: logoDataUrl, x: 0.5, y: 0.3, w: 1.2, h: 1.2 }); } catch {} }
      slide1.addText('GEORepute.ai', { x: 2, y: 0.5, w: 5, fontSize: 24, bold: true, color: 'FFFFFF' });
      slide1.addText('AI Visibility Intelligence Platform', { x: 2, y: 1.1, w: 5, fontSize: 12, color: 'FFFFFF' });
      slide1.addText('Business Action Plan', { x: 0.5, y: 2.3, w: 9, fontSize: 36, bold: true, color: 'FFFFFF' });
      slide1.addText(plan.title, { x: 0.5, y: 3.2, w: 9, fontSize: 18, color: darkGray });
      slide1.addText(`${plan.priority.toUpperCase()} Priority  |  ${plan.timeline}  |  ${plan.category}`, { x: 0.5, y: 4.0, w: 9, fontSize: 11, color: medGray });
      slide1.addText(new Date().toLocaleDateString(), { x: 0.5, y: 4.5, w: 9, fontSize: 10, color: medGray });

      // Slide 2: Executive Summary
      const slide2 = pptx.addSlide();
      slide2.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
      slide2.addText('Executive Summary', { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
      slide2.addText('Objective', { x: 0.5, y: 1.0, w: 2, fontSize: 12, bold: true, color: purple });
      slide2.addText(plan.objective, { x: 0.5, y: 1.4, w: 12, fontSize: 10, color: darkGray, wrap: true });
      slide2.addText('AI Strategic Reasoning', { x: 0.5, y: 2.4, w: 4, fontSize: 12, bold: true, color: purple });
      slide2.addText(plan.reasoning, { x: 0.5, y: 2.8, w: 12, fontSize: 9, color: darkGray, wrap: true });
      slide2.addText('Expected Outcome', { x: 0.5, y: 4.5, w: 4, fontSize: 12, bold: true, color: purple });
      slide2.addText(plan.expectedOutcome, { x: 0.5, y: 4.9, w: 12, fontSize: 9, color: darkGray, wrap: true });

      if (plan.businessPlanData) {
        const bpd = plan.businessPlanData;

        // Slide 3: KPIs
        const slide3 = pptx.addSlide();
        slide3.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
        slide3.addText('KPIs & Goals', { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
        const kpiRows: any[][] = [
          [{ text: 'KPI', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Current', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Target', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Timeframe', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }],
        ];
        bpd.kpis.forEach((kpi) => {
          kpiRows.push([
            { text: kpi.name, options: { fontSize: 9, color: darkGray } },
            { text: kpi.current, options: { fontSize: 9, color: darkGray } },
            { text: kpi.target, options: { fontSize: 9, color: green, bold: true } },
            { text: kpi.timeframe, options: { fontSize: 9, color: medGray } },
          ]);
        });
        slide3.addTable(kpiRows, { x: 0.5, y: 1.0, w: 12, fontSize: 10, border: { pt: 0.5, color: 'E5E7EB' }, colW: [4, 2.5, 2.5, 3] });

        // Slide 4: Budget
        const slide4 = pptx.addSlide();
        slide4.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
        slide4.addText('Budget Breakdown', { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
        slide4.addText(`Total Estimated: ${bpd.budget.total_estimated}`, { x: 0.5, y: 0.9, w: 6, fontSize: 14, bold: true, color: darkGray });
        const budgetRows: any[][] = [
          [{ text: 'Category', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Amount', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Percentage', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }],
        ];
        bpd.budget.breakdown.forEach((item) => {
          budgetRows.push([
            { text: item.category, options: { fontSize: 10, color: darkGray } },
            { text: `$${item.amount}`, options: { fontSize: 10, color: darkGray } },
            { text: `${item.percentage}%`, options: { fontSize: 10, color: purple, bold: true } },
          ]);
        });
        slide4.addTable(budgetRows, { x: 0.5, y: 1.5, w: 12, fontSize: 10, border: { pt: 0.5, color: 'E5E7EB' }, colW: [5, 3.5, 3.5] });

        // Slide 5: ROI Projection
        const slide5 = pptx.addSlide();
        slide5.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
        slide5.addText('ROI Projection', { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
        slide5.addText(`Break-even: Month ${bpd.roi_projection.break_even_month}  |  Projected Annual ROI: ${bpd.roi_projection.projected_annual_roi}`, { x: 0.5, y: 0.9, w: 12, fontSize: 12, bold: true, color: darkGray });
        const roiRows: any[][] = [
          [{ text: 'Month', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Investment', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Est. Return', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }, { text: 'Cumulative ROI', options: { bold: true, color: 'FFFFFF', fill: { color: purpleDark } } }],
        ];
        bpd.roi_projection.monthly_projections.forEach((mp) => {
          roiRows.push([
            { text: `Month ${mp.month}`, options: { fontSize: 10, color: darkGray } },
            { text: `$${mp.investment}`, options: { fontSize: 10, color: red } },
            { text: `$${mp.estimated_return}`, options: { fontSize: 10, color: green } },
            { text: `${mp.cumulative_roi}%`, options: { fontSize: 10, color: mp.cumulative_roi >= 0 ? green : red, bold: true } },
          ]);
        });
        slide5.addTable(roiRows, { x: 0.5, y: 1.5, w: 12, fontSize: 10, border: { pt: 0.5, color: 'E5E7EB' }, colW: [3, 3, 3, 3] });

        // Slide 6: Competitive Positioning
        const slide6 = pptx.addSlide();
        slide6.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
        slide6.addText('Competitive Positioning', { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
        slide6.addText(bpd.competitive_positioning.summary, { x: 0.5, y: 1.0, w: 12, fontSize: 11, color: darkGray, wrap: true });
        slide6.addText('Strengths', { x: 0.5, y: 2.2, w: 3, fontSize: 14, bold: true, color: green });
        bpd.competitive_positioning.strengths.forEach((s, i) => {
          slide6.addText(`• ${s}`, { x: 0.8, y: 2.7 + i * 0.35, w: 5, fontSize: 10, color: darkGray });
        });
        const gapStartY = 2.7 + bpd.competitive_positioning.strengths.length * 0.35 + 0.3;
        slide6.addText('Gaps', { x: 0.5, y: gapStartY, w: 3, fontSize: 14, bold: true, color: red });
        bpd.competitive_positioning.gaps.forEach((g, i) => {
          slide6.addText(`• ${g}`, { x: 0.8, y: gapStartY + 0.4 + i * 0.35, w: 5, fontSize: 10, color: darkGray });
        });
        const oppY = gapStartY + 0.4 + bpd.competitive_positioning.gaps.length * 0.35 + 0.3;
        slide6.addText('Market Opportunity', { x: 0.5, y: oppY, w: 4, fontSize: 14, bold: true, color: purple });
        slide6.addText(bpd.competitive_positioning.market_opportunity, { x: 0.5, y: oppY + 0.4, w: 12, fontSize: 10, color: darkGray, wrap: true });

        // Slide 7: Milestones
        const slide7 = pptx.addSlide();
        slide7.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
        slide7.addText('Milestones & Timeline', { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
        let msY = 1.0;
        bpd.milestones.forEach((ms) => {
          slide7.addShape(pptx.ShapeType.ellipse, { x: 0.5, y: msY, w: 0.5, h: 0.5, fill: { color: purple } });
          slide7.addText(`M${ms.month}`, { x: 0.5, y: msY + 0.05, w: 0.5, h: 0.4, fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
          slide7.addText(ms.title, { x: 1.3, y: msY, w: 5, fontSize: 13, bold: true, color: darkGray });
          ms.goals.forEach((goal, gi) => {
            slide7.addText(`• ${goal}`, { x: 1.5, y: msY + 0.4 + gi * 0.3, w: 10, fontSize: 9, color: medGray });
          });
          msY += 0.5 + ms.goals.length * 0.3 + 0.3;
        });
      }

      // Action Steps Slides
      const stepsPerSlide = 4;
      for (let i = 0; i < plan.steps.length; i += stepsPerSlide) {
        const slideSteps = pptx.addSlide();
        slideSteps.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: purple } });
        slideSteps.addText(`Action Steps (${i + 1}-${Math.min(i + stepsPerSlide, plan.steps.length)})`, { x: 0.5, y: 0.1, w: 9, fontSize: 18, bold: true, color: 'FFFFFF' });
        let stepY = 1.0;
        plan.steps.slice(i, i + stepsPerSlide).forEach((step, si) => {
          const priorityCol = step.priority === 'high' ? red : step.priority === 'medium' ? amber : green;
          slideSteps.addShape(pptx.ShapeType.ellipse, { x: 0.5, y: stepY, w: 0.35, h: 0.35, fill: { color: priorityCol } });
          slideSteps.addText(`${i + si + 1}`, { x: 0.5, y: stepY, w: 0.35, h: 0.35, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
          slideSteps.addText(step.step, { x: 1.1, y: stepY - 0.05, w: 11, fontSize: 12, bold: true, color: darkGray });
          slideSteps.addText(step.description, { x: 1.1, y: stepY + 0.3, w: 11, fontSize: 9, color: medGray, wrap: true });
          const metaText = [step.channel, step.platform, step.estimatedImpact].filter(Boolean).join(' | ');
          slideSteps.addText(metaText, { x: 1.1, y: stepY + 0.8, w: 11, fontSize: 8, color: purple });
          stepY += 1.3;
        });
      }

      const fileName = `${plan.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}_Presentation.pptx`;
      await pptx.writeFile({ fileName });
      toast.success("PowerPoint downloaded!", { id: toastId });
    } catch (error: any) {
      console.error("PPTX export error:", error);
      toast.error("Failed to generate PowerPoint", { id: toastId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-500 rounded-xl flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI Action Plans
            </h1>
            <p className="text-gray-600 mt-1">
              Dynamic, AI-generated strategies with step-by-step execution
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-accent-50 to-primary-50 border border-accent-200 rounded-lg p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Strategic AI Orchestrator</span>:
              Uses OpenAI GPT-4 Turbo to analyze your goals and generate actionable plans with reasoning,
              priorities, and expected outcomes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: Generation Panel */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-600" />
              Generate Plan
            </h2>

            <div className="space-y-4">
              {/* Brand Project Selector - First */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Brand Project
                </label>
                <select
                  value={selectedProjectId || ""}
                  onChange={(e) => handleProjectSelect(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white"
                  disabled={loadingProjects}
                >
                  <option value="">-- Select a project --</option>
                  {brandProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.brand_name} ({project.industry})
                    </option>
                  ))}
                </select>
                {loadingProjects && (
                  <p className="text-xs text-gray-500 mt-1">Loading projects...</p>
                )}
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objective / Goal *
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g., Improve local SEO rankings for my restaurant"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => {
                      setDomain(e.target.value);
                      // Clear selected project if user manually changes domain
                      if (selectedProjectId) {
                        setSelectedProjectId(null);
                        setSelectedProject(null);
                        setKeywords([]);
                      }
                    }}
                    placeholder="e.g., example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleCrawlNewDomain}
                    disabled={crawlingDomain || !domain.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Crawl this domain"
                  >
                    {crawlingDomain ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select a project above or crawl a new domain
                </p>
              </div>

              {/* Keywords Section - Only show when project is selected */}
              {selectedProjectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Keywords
                    {loadingGSCKeywords && (
                      <span className="ml-2 text-xs text-gray-500">(Loading GSC keywords...)</span>
                    )}
                  </label>
                  
                  {/* Display keywords as tags */}
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {keywords.map((keyword, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-full text-sm"
                        >
                          <span className="text-gray-700">{keyword}</span>
                          <button
                            onClick={() => {
                              setKeywords(keywords.filter((_, i) => i !== index));
                            }}
                            className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove keyword"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new keyword input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          if (!keywords.includes(newKeyword.trim())) {
                            setKeywords([...keywords, newKeyword.trim()]);
                            setNewKeyword("");
                          } else {
                            toast.error("Keyword already exists");
                          }
                        }
                      }}
                      placeholder="Add keyword and press Enter"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                          setKeywords([...keywords, newKeyword.trim()]);
                          setNewKeyword("");
                        } else if (keywords.includes(newKeyword.trim())) {
                          toast.error("Keyword already exists");
                        }
                      }}
                      className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!newKeyword.trim()}
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Keywords from project: {selectedProject?.keywords?.length || 0} manual
                    {loadingGSCKeywords ? " (loading GSC...)" : ""}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generate content in
                </label>
                <select
                  value={planLanguage}
                  onChange={(e) => setPlanLanguage(e.target.value as "en" | "he")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white"
                >
                  <option value="en">English</option>
                  <option value="he">Hebrew</option>
                </select>
              </div>

              <Button
                onClick={generateActionPlan}
                disabled={loading || !objective.trim()}
                variant="primary"
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Generate AI Action Plan
                  </>
                )}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                ⚡ Powered by OpenAI GPT-4 Turbo
              </div>
            </div>

            {/* Stats */}
            {plans.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Plans</span>
                    <span className="font-bold text-gray-900">
                      {plans.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">High Priority</span>
                    <span className="font-bold text-red-600">
                      {plans.filter((p) => p.priority === "high").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avg. Steps</span>
                    <span className="font-bold text-gray-900">
                      {plans.length > 0
                        ? Math.round(
                            plans.reduce((acc, p) => acc + p.steps.length, 0) /
                              plans.length
                          )
                        : 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Plans List */}
        <div className="lg:col-span-2">
          {loadingPlans && (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <div className="w-12 h-12 border-4 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">
                Loading your action plans...
              </p>
            </div>
          )}

          {plans.length === 0 && !loading && !loadingPlans && (
            <>
              {selectedProject ? (
                // Show Crawler Info Card when project is selected
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {selectedProject.company_image_url ? (
                      <img 
                        src={selectedProject.company_image_url} 
                        alt={selectedProject.brand_name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedProject.company_image_url ? 'hidden' : ''}`}>
                      <span className="text-2xl font-bold text-purple-600">
                        {selectedProject.brand_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedProject.brand_name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded capitalize">
                          {selectedProject.industry}
                        </span>
                      </div>
                      {selectedProject.website_url && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                          <Globe className="w-4 h-4" />
                          <a 
                            href={selectedProject.website_url.startsWith('http') ? selectedProject.website_url : `https://${selectedProject.website_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent-600 hover:underline"
                          >
                            {selectedProject.website_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Company Description */}
                  {selectedProject.company_description && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">About {selectedProject.brand_name}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {selectedProject.company_description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Show empty state when no project is selected
                <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                  <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No action plans yet</p>
                  <p className="text-sm text-gray-500">
                    Select a brand project and enter your objective to generate a strategic plan
                  </p>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
              <div className="w-12 h-12 border-4 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-700 font-medium">
                AI crafting your action plan...
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Analyzing strategy and generating steps
              </p>
            </div>
          )}

          {plans.length > 0 && !loading && !loadingPlans && (
            <div className="space-y-4">
              {plans.map((plan, idx) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    {/* Plan Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-2 -m-2"
                          onClick={() => togglePlan(plan.id)}
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div
                              className={`px-2 py-1 rounded-full border text-xs font-semibold ${getPriorityColor(
                                plan.priority
                              )}`}
                            >
                              {plan.priority.toUpperCase()}
                            </div>
                            {plan.projectName ? (
                              <div className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {plan.projectName}
                              </div>
                            ) : plan.projectId ? (
                              <div className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Project #{plan.projectId.substring(0, 8)}
                              </div>
                            ) : null}
                            <div className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                              {plan.category}
                            </div>
                            {plan.channels && plan.channels.length > 0 && (
                              <>
                                {plan.channels.map((channel: string) => (
                                  <div
                                    key={channel}
                                    className="px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold"
                                  >
                                    {channel.replace('_', ' ')}
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {plan.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {plan.timeline}
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              {
                                plan.steps.filter((s) => s.completed).length
                              }/{plan.steps.length} completed
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.businessPlanData && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); exportPlanPDF(plan); }}
                                className="text-purple-500 hover:text-purple-700 p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Export PDF"
                              >
                                <FileText className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); exportPlanPPTX(plan); }}
                                className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Export PowerPoint"
                              >
                                <Presentation className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlan(plan.id);
                            }}
                            className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete plan"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => togglePlan(plan.id)}
                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {plan.expanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {plan.expanded && (
                      <div className="border-t border-gray-200">
                        {/* Progress Dashboard */}
                        <div className="p-6 border-b border-gray-200">
                          <PlanProgress plan={plan} />
                        </div>
                        
                        {/* AI Reasoning */}
                        <div className="p-6 bg-gradient-to-r from-accent-50 to-primary-50 border-b border-gray-200">
                          <div className="flex items-start gap-2 mb-3">
                            <Zap className="w-4 h-4 text-accent-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-accent-900 mb-1">
                                AI Strategic Reasoning
                              </div>
                              <p className="text-sm text-gray-700">
                                {plan.reasoning}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-semibold text-green-900 mb-1">
                                Expected Outcome
                              </div>
                              <p className="text-sm text-gray-700">
                                {plan.expectedOutcome}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Steps */}
                        <div className="p-6">
                          <h4 className="text-sm font-bold text-gray-900 mb-4">
                            Action Steps
                          </h4>
                          <div className="space-y-3">
                            {plan.steps.map((step, stepIdx) => {
                              const stepId = step.id || `step-${stepIdx}`;
                              const executionStatus = step.executionMetadata?.executionStatus || "pending";
                              const isExecuting = executingStep === `${plan.id}-${stepId}`;
                              const canExecute = step.executionType === "content_generation" && step.executionMetadata?.autoExecute;
                              
                              return (
                                <div
                                  key={stepIdx}
                                  className={`border rounded-lg p-4 transition-all ${
                                    step.completed || executionStatus === 'published'
                                      ? "bg-green-50 border-green-200"
                                      : executionStatus === 'review'
                                      ? "bg-blue-50 border-blue-200"
                                      : "bg-white border-gray-200 hover:border-accent-300"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() =>
                                        toggleStep(plan.id, stepIdx)
                                      }
                                      className="mt-0.5 flex-shrink-0"
                                      disabled={executionStatus === 'published'}
                                    >
                                      {step.completed || executionStatus === 'published' ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-400 hover:text-accent-600 transition-colors" />
                                      )}
                                    </button>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1">
                                          <h5
                                            className={`font-semibold text-sm ${
                                              step.completed || executionStatus === 'published'
                                                ? "text-green-900 line-through"
                                                : "text-gray-900"
                                            }`}
                                          >
                                            {stepIdx + 1}. {step.step}
                                          </h5>
                                          {(step.channel || step.platform) && (
                                            <div className="flex items-center gap-2 mt-1">
                                              {step.channel && (
                                                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                                  {step.channel}
                                                </span>
                                              )}
                                              {step.platform && (
                                                <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                                                  {step.platform}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={`px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 ${getPriorityColor(
                                              step.priority
                                            )}`}
                                          >
                                            {step.priority}
                                          </div>
                                          {executionStatus === 'published' && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                              Published
                                            </span>
                                          )}
                                          {executionStatus === 'review' && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                              Review
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">
                                        {step.description}
                                      </p>
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-gray-500">
                                            Impact:
                                          </span>
                                          <span className="font-semibold text-green-700">
                                            {step.estimatedImpact}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {canExecute && executionStatus === 'pending' && (
                                            <Button
                                              onClick={() => executeStep(plan.id, stepId)}
                                              disabled={isExecuting}
                                              variant="primary"
                                              size="sm"
                                            >
                                              {isExecuting ? (
                                                <>
                                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                                  Generating...
                                                </>
                                              ) : (
                                                <>
                                                  <Play className="w-3 h-3 mr-1" />
                                                  Generate Content
                                                </>
                                              )}
                                            </Button>
                                          )}
                                          {executionStatus === 'review' && step.executionMetadata?.linkedContentId && (
                                            <Button
                                              onClick={() => router.push(`/dashboard/content?contentId=${step.executionMetadata?.linkedContentId}`)}
                                              variant="primary"
                                              size="sm"
                                            >
                                              <ExternalLink className="w-3 h-3 mr-1" />
                                              Review Content
                                            </Button>
                                          )}
                                          {executionStatus === 'published' && step.executionMetadata?.publishedUrl && (
                                            <a
                                              href={step.executionMetadata.publishedUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-accent-600 hover:text-accent-700 flex items-center gap-1"
                                            >
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

                        {/* Business Plan Dashboard */}
                        {plan.businessPlanData && (
                          <div className="border-t border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                              <h4 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                                Business Plan
                              </h4>
                              <p className="text-xs text-gray-500 mb-4">AI-generated metrics, projections, and strategic analysis</p>

                              {/* KPIs & Goals */}
                              <div className="mb-6">
                                <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                                  <Target className="w-4 h-4 text-green-600" />
                                  KPIs & Goals
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {plan.businessPlanData.kpis.map((kpi, i) => (
                                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="text-xs font-medium text-gray-500 mb-1">{kpi.name}</div>
                                      <div className="flex items-end justify-between mb-2">
                                        <div>
                                          <span className="text-lg font-bold text-gray-900">{kpi.current}</span>
                                          <span className="text-xs text-gray-400 mx-1">&rarr;</span>
                                          <span className="text-sm font-semibold text-green-600">{kpi.target}</span>
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-400">{kpi.timeframe}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Budget & ROI Row */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {/* Budget Breakdown */}
                                <div>
                                  <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4 text-amber-600" />
                                    Budget Breakdown
                                    <span className="text-xs font-normal text-gray-500 ml-1">({plan.businessPlanData.budget.total_estimated})</span>
                                  </h5>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <ResponsiveContainer width="100%" height={200}>
                                      <PieChart>
                                        <Pie
                                          data={plan.businessPlanData.budget.breakdown}
                                          cx="50%"
                                          cy="50%"
                                          outerRadius={70}
                                          dataKey="amount"
                                          nameKey="category"
                                          label={({ category, percentage }) => `${category} ${percentage}%`}
                                          labelLine={false}
                                        >
                                          {plan.businessPlanData.budget.breakdown.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                          ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `$${value}`} />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                {/* ROI Projection */}
                                <div>
                                  <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    ROI Projection
                                    <span className="text-xs font-normal text-gray-500 ml-1">(Break-even: Month {plan.businessPlanData.roi_projection.break_even_month})</span>
                                  </h5>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <ResponsiveContainer width="100%" height={200}>
                                      <LineChart data={plan.businessPlanData.roi_projection.monthly_projections}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} fontSize={11} />
                                        <YAxis fontSize={11} />
                                        <Tooltip formatter={(value: number, name: string) => [name === 'cumulative_roi' ? `${value}%` : `$${value}`, name === 'investment' ? 'Investment' : name === 'estimated_return' ? 'Return' : 'ROI %']} />
                                        <Legend formatter={(value) => value === 'investment' ? 'Investment' : value === 'estimated_return' ? 'Return' : 'ROI %'} />
                                        <Line type="monotone" dataKey="investment" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="estimated_return" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                                      </LineChart>
                                    </ResponsiveContainer>
                                    <div className="text-center mt-2 text-xs text-gray-500">
                                      Projected Annual ROI: <span className="font-bold text-green-600">{plan.businessPlanData.roi_projection.projected_annual_roi}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Competitive Positioning & Milestones Row */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                {/* Competitive Positioning */}
                                <div>
                                  <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-purple-600" />
                                    Competitive Positioning
                                  </h5>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                                    <p className="text-sm text-gray-700">{plan.businessPlanData.competitive_positioning.summary}</p>
                                    <div>
                                      <div className="text-xs font-semibold text-green-700 mb-1">Strengths</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {plan.businessPlanData.competitive_positioning.strengths.map((s, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">{s}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-red-700 mb-1">Gaps</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {plan.businessPlanData.competitive_positioning.gaps.map((g, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">{g}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-2">
                                      <div className="text-xs font-semibold text-blue-700 mb-1">Market Opportunity</div>
                                      <p className="text-xs text-gray-600">{plan.businessPlanData.competitive_positioning.market_opportunity}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Milestones */}
                                <div>
                                  <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                                    <Flag className="w-4 h-4 text-amber-600" />
                                    Milestones
                                  </h5>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="relative">
                                      {plan.businessPlanData.milestones.map((ms, i) => (
                                        <div key={i} className="flex gap-3 mb-4 last:mb-0">
                                          <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                              M{ms.month}
                                            </div>
                                            {i < plan.businessPlanData!.milestones.length - 1 && (
                                              <div className="w-0.5 flex-1 bg-purple-200 mt-1" />
                                            )}
                                          </div>
                                          <div className="flex-1 pb-1">
                                            <div className="text-sm font-semibold text-gray-900">{ms.title}</div>
                                            <ul className="mt-1 space-y-0.5">
                                              {ms.goals.map((goal, gi) => (
                                                <li key={gi} className="text-xs text-gray-600 flex items-start gap-1">
                                                  <span className="text-purple-400 mt-0.5">&#8226;</span>
                                                  {goal}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Channel & Priority Distribution */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Channel Distribution */}
                                <div>
                                  <h5 className="text-sm font-bold text-gray-800 mb-3">Channel Distribution</h5>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                      <BarChart data={(() => {
                                        const channelMap: Record<string, number> = {};
                                        plan.steps.forEach(s => { if (s.channel) channelMap[s.channel] = (channelMap[s.channel] || 0) + 1; });
                                        return Object.entries(channelMap).map(([name, count]) => ({ name: name.replace('_', ' '), count }));
                                      })()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" fontSize={10} />
                                        <YAxis allowDecimals={false} fontSize={11} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#9333ea" radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>

                                {/* Priority Distribution */}
                                <div>
                                  <h5 className="text-sm font-bold text-gray-800 mb-3">Priority Distribution</h5>
                                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <ResponsiveContainer width="100%" height={180}>
                                      <PieChart>
                                        <Pie
                                          data={[
                                            { name: 'High', value: plan.steps.filter(s => s.priority === 'high').length, fill: '#ef4444' },
                                            { name: 'Medium', value: plan.steps.filter(s => s.priority === 'medium').length, fill: '#f59e0b' },
                                            { name: 'Low', value: plan.steps.filter(s => s.priority === 'low').length, fill: '#10b981' },
                                          ].filter(d => d.value > 0)}
                                          cx="50%"
                                          cy="50%"
                                          outerRadius={65}
                                          dataKey="value"
                                          label={({ name, value }) => `${name}: ${value}`}
                                        >
                                          {[
                                            { name: 'High', value: plan.steps.filter(s => s.priority === 'high').length, fill: '#ef4444' },
                                            { name: 'Medium', value: plan.steps.filter(s => s.priority === 'medium').length, fill: '#f59e0b' },
                                            { name: 'Low', value: plan.steps.filter(s => s.priority === 'low').length, fill: '#10b981' },
                                          ].filter(d => d.value > 0).map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                          ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>

                              {/* Export Buttons */}
                              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-3">
                                <Button onClick={() => exportPlanPDF(plan)} variant="primary" size="sm">
                                  <FileText className="w-4 h-4 mr-1.5" />
                                  Export PDF Report
                                </Button>
                                <Button onClick={() => exportPlanPPTX(plan)} variant="primary" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  <Presentation className="w-4 h-4 mr-1.5" />
                                  Export Presentation
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

