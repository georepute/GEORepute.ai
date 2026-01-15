"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";
import { PlanProgress } from "./_components/PlanProgress";

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
  const [keywords, setKeywords] = useState("");
  const [domain, setDomain] = useState("");
  const [executingStep, setExecutingStep] = useState<string | null>(null);
  
  // Brand project selection state
  const [brandProjects, setBrandProjects] = useState<BrandProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<BrandProject | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [crawlingDomain, setCrawlingDomain] = useState(false);

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

  // Handle project selection
  const handleProjectSelect = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    if (projectId) {
      const project = brandProjects.find(p => p.id === projectId);
      if (project) {
        setSelectedProject(project);
        // Auto-fill domain from project
        if (project.website_url) {
          setDomain(project.website_url);
        }
      }
    } else {
      setSelectedProject(null);
      setDomain("");
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
      const loadedPlans: ActionPlan[] = (data.plans || []).map((plan: any) => ({
        id: plan.id,
        title: plan.title,
        objective: plan.objective,
        channels: plan.channels || [],
        domain: plan.domain,
        region: plan.region,
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
      }));

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
      // REAL AI Action Plan Generation using OpenAI GPT-4 Turbo
      const response = await fetch('/api/geo-core/action-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objective: objective,
          targetKeywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
          domain: domain.trim() || undefined,
          channels: ['all'], // Always use all channels
          projectId: selectedProjectId || undefined, // Pass selected project ID to use its crawler data
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to generate action plan');
      }

      const newPlan: ActionPlan = {
        id: data.planId || Date.now().toString(),
        title: data.title,
        objective: data.objective,
        channels: data.channels || [],
        domain: data.domain,
        region: data.region,
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
      };

      setPlans([newPlan, ...plans]);
      toast.success("AI Action plan generated!");
      setObjective("");
      setKeywords("");
      setDomain("");
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

    // Build URL with step metadata for pre-filling content generation form
    const params = new URLSearchParams({
      actionPlanId: planId,
      stepId: stepId,
    });

    // Add step metadata if available to pre-fill the form
    const execMetadata = step.executionMetadata || {};
    if (execMetadata.topic) {
      params.append('topic', execMetadata.topic);
    }
    if (execMetadata.platform) {
      params.append('platform', execMetadata.platform);
    }
    if (execMetadata.keywords && Array.isArray(execMetadata.keywords)) {
      params.append('keywords', execMetadata.keywords.join(','));
    }
    if (execMetadata.contentType) {
      params.append('contentType', execMetadata.contentType);
    }

    // Redirect to content generator page (not content management page)
    router.push(`/dashboard/content-generator?${params.toString()}`);
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
                  Target Keywords
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., local seo, google maps"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
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

