"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";
import {
  Globe,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  X,
  Building2,
  Play,
  ExternalLink,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { PlanProgress } from "./PlanProgress";
import { PlanMetrics } from "./PlanMetrics";
import { BusinessPlanView } from "./BusinessPlanView";

interface CompetitorEntry {
  name: string;
  domain: string;
}

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
    executionStatus?: string;
    linkedContentId?: string;
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
  channels?: string[];
  projectId?: string;
  projectName?: string;
  expanded?: boolean;
  businessPlanData?: any;
}

const EMPTY_ENTRY: CompetitorEntry = { name: "", domain: "" };

function normaliseDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function parseCompetitorEntry(raw: unknown): CompetitorEntry {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as { name?: string; companyName?: string; domain?: string };
        return { name: parsed.name ?? parsed.companyName ?? "", domain: parsed.domain ? normaliseDomain(parsed.domain) : "" };
      } catch {
        return { name: "", domain: normaliseDomain(trimmed) };
      }
    }
    return { name: "", domain: normaliseDomain(trimmed) };
  }
  if (raw && typeof raw === "object" && "domain" in raw) {
    const obj = raw as { name?: string; companyName?: string; domain?: string };
    return { name: obj.name ?? obj.companyName ?? "", domain: obj.domain ? normaliseDomain(obj.domain) : "" };
  }
  return { name: "", domain: "" };
}

const RESEARCH_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "he", label: "Hebrew" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese (Mandarin)" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
  { value: "nl", label: "Dutch" },
  { value: "sv", label: "Swedish" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "tr", label: "Turkish" },
  { value: "th", label: "Thai" },
  { value: "id", label: "Indonesian" },
  { value: "ms", label: "Malay" },
  { value: "vi", label: "Vietnamese" },
  { value: "uk", label: "Ukrainian" },
  { value: "ro", label: "Romanian" },
  { value: "cs", label: "Czech" },
  { value: "hu", label: "Hungarian" },
  { value: "el", label: "Greek" },
  { value: "da", label: "Danish" },
  { value: "fi", label: "Finnish" },
  { value: "no", label: "Norwegian" },
  { value: "fa", label: "Persian (Farsi)" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "sw", label: "Swahili" },
  { value: "tl", label: "Filipino (Tagalog)" },
  { value: "ur", label: "Urdu" },
];

function getPriorityColor(priority: string) {
  const m: Record<string, string> = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    low: "bg-green-100 text-green-800 border-green-200",
  };
  return m[priority?.toLowerCase()] || m.medium;
}

export interface CompetitorResearchViewProps {
  project?: {
    id?: string;
    brand_name: string;
    industry: string;
    website_url?: string;
    company_description?: string;
    competitors?: string[];
    keywords?: string[];
  } | null;
  intelligenceData?: any;
}

export function CompetitorResearchView({ project, intelligenceData }: CompetitorResearchViewProps) {
  const router = useRouter();
  const { language: appLanguage } = useLanguage();

  const [entries, setEntries] = useState<CompetitorEntry[]>([{ ...EMPTY_ENTRY }]);
  const [researchLanguage, setResearchLanguage] = useState<string>(appLanguage || "en");
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [executingStep, setExecutingStep] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    if (!project?.id) {
      setLoadingSaved(false);
      return;
    }
    setLoadingSaved(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("competitor_research")
        .select("competitors, action_plans")
        .eq("user_id", user.id)
        .eq("project_id", project.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }
      if (data?.action_plans) {
        const stored = Array.isArray(data.action_plans) ? data.action_plans : [data.action_plans];
        const loaded: ActionPlan[] = stored.map((p: any) => ({
          ...p,
          id: p.id || `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          expanded: p.expanded ?? true,
          reasoning: p.reasoning ?? "",
          expectedOutcome: p.expectedOutcome ?? "",
          timeline: p.timeline ?? "3-6 months",
          priority: (p.priority === "high" || p.priority === "low" ? p.priority : "medium") as "high" | "medium" | "low",
          category: p.category ?? "Competitor Research",
          steps: (p.steps || []).map((s: any) => ({ ...s, completed: s.completed ?? false })),
        }));
        setPlans(loaded);
      }
      if (data?.competitors?.length) {
        const parsed = (data.competitors as any[]).map((c) => parseCompetitorEntry(typeof c === "object" ? c : { domain: c.domain || c, companyName: c.companyName || c.name }));
        if (parsed.length) setEntries(parsed.length <= 5 ? parsed : [...parsed.slice(0, 5), { ...EMPTY_ENTRY }].filter((e) => e.domain || e.name));
      }
    } catch (err) {
      console.error("Error loading competitor research:", err);
    } finally {
      setLoadingSaved(false);
    }
  }, [project?.id, supabase]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    if (appLanguage) setResearchLanguage(appLanguage);
  }, [appLanguage]);

  useEffect(() => {
    if (!loadingSaved && project?.competitors?.length && entries.every((e) => !e.domain)) {
      setEntries(project.competitors.slice(0, 5).map(parseCompetitorEntry));
    }
  }, [project?.competitors, loadingSaved, entries]);

  const addEntry = () => {
    if (entries.length < 5) setEntries((p) => [...p, { ...EMPTY_ENTRY }]);
  };
  const removeEntry = (idx: number) => setEntries((p) => p.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, field: keyof CompetitorEntry, value: string) => {
    setEntries((p) => p.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const generate = async () => {
    if (!project?.id) {
      toast.error("Select a brand project first.");
      return;
    }
    const valid = entries.filter((e) => e.domain.trim());
    if (!valid.length) {
      toast.error("Enter at least one competitor domain.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/geo-core/competitor-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          brandName: project.brand_name,
          industry: project.industry,
          websiteUrl: project.website_url,
          description: project.company_description,
          competitors: valid.map((e) => ({ name: e.name.trim() || undefined, domain: normaliseDomain(e.domain) })),
          targetKeywords: project.keywords || [],
          intelligenceContext: intelligenceData,
          language: researchLanguage || "en",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate");

      const newPlan = json.plan || json.plans?.[0];
      if (newPlan) {
        const plan: ActionPlan = {
          ...newPlan,
          id: newPlan.id || `cr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          expanded: true,
          timeline: newPlan.timeline || "3-6 months",
          priority: (newPlan.priority === "high" || newPlan.priority === "low" ? newPlan.priority : "medium") as "high" | "medium" | "low",
          category: newPlan.category ?? "Competitor Research",
          reasoning: newPlan.reasoning ?? "",
          expectedOutcome: newPlan.expectedOutcome ?? "",
          steps: (newPlan.steps || []).map((s: any) => ({ ...s, completed: false })),
        };
        const newPlans = [plan, ...plans];
        setPlans(newPlans);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("competitor_research").upsert(
            {
              user_id: user.id,
              project_id: project.id,
              competitors: valid,
              action_plans: newPlans,
              summary: plan.title,
              generated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,project_id" }
          );
        }
        toast.success("Action plan generated from competitor research!");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const togglePlan = (planId: string) => {
    setPlans((p) => p.map((pl) => (pl.id === planId ? { ...pl, expanded: !pl.expanded } : pl)));
  };

  const toggleStep = async (planId: string, stepIdx: number) => {
    const updatedPlans = plans.map((pl) =>
      pl.id === planId
        ? { ...pl, steps: pl.steps.map((s, i) => (i === stepIdx ? { ...s, completed: !s.completed } : s)) }
        : pl
    );
    setPlans(updatedPlans);

    if (project?.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("competitor_research").upsert(
            {
              user_id: user.id,
              project_id: project.id,
              competitors: entries.filter((e) => e.domain),
              action_plans: updatedPlans,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,project_id" }
          );
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to save step completion");
      }
    }
  };

  const executeStep = (planId: string, stepId: string) => {
    const plan = plans.find((p) => p.id === planId);
    const step = plan?.steps.find((s) => (s.id || "") === stepId || s.step);
    if (!step) return;

    const execMetadata = step.executionMetadata || {};
    const platform = (execMetadata.platform || step.platform || "").toLowerCase();
    const contentType = (execMetadata.contentType || "").toLowerCase();
    const isBlogStep = platform === "shopify" || platform === "wordpress" || contentType === "blog_article";

    const params = new URLSearchParams();
    if (execMetadata.topic) params.append("topic", execMetadata.topic);
    if (execMetadata.platform) params.append("platform", execMetadata.platform);
    if (execMetadata.keywords?.length) params.append("keywords", execMetadata.keywords.join(","));
    if (execMetadata.contentType) params.append("contentType", execMetadata.contentType);

    router.push(isBlogStep ? `/dashboard/blog?${params}` : `/dashboard/content-generator?${params}`);
  };

  const removePlan = async (planId: string) => {
    const updated = plans.filter((p) => p.id !== planId);
    setPlans(updated);
    if (project?.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("competitor_research").upsert(
            {
              user_id: user.id,
              project_id: project.id,
              competitors: entries.filter((e) => e.domain),
              action_plans: updated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,project_id" }
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    toast.success("Plan removed");
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Globe className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Select a brand project to begin competitor research.</p>
      </div>
    );
  }

  const hasValidEntry = entries.some((e) => e.domain.trim());

  return (
    <div className="space-y-6">
      {/* Competitor input — same pattern as Quick Generate */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-600" />
          Competitor Research → Action Plans
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Enter competitors by domain. We use GSC + AI visibility data to generate executable action plans (content generation, GEORepute tasks).
        </p>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 mb-4">
          <span className="text-xs font-semibold text-gray-500 uppercase">Company Name</span>
          <span className="text-xs font-semibold text-gray-500 uppercase">Domain</span>
          <span className="w-7" />
          {entries.map((entry, idx) => (
            <div key={idx} className="contents">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateEntry(idx, "name", e.target.value)}
                  placeholder={`Competitor ${idx + 1}`}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                />
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={entry.domain}
                  onChange={(e) => updateEntry(idx, "domain", e.target.value)}
                  placeholder="example.com"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                />
              </div>
              <button
                onClick={() => removeEntry(idx)}
                disabled={entries.length === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 disabled:opacity-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap"> language:</label>
            <select
              value={researchLanguage}
              onChange={(e) => setResearchLanguage(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 text-sm bg-white"
            >
              {RESEARCH_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={addEntry}
              disabled={entries.length >= 5}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Add competitor
            </button>
          </div>
          <Button onClick={generate} disabled={generating || !hasValidEntry} variant="primary" size="sm">
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Research
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loadingSaved && (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Loader2 className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-medium">Loading competitor research…</p>
        </div>
      )}

      {/* Empty state */}
      {!loadingSaved && plans.length === 0 && !generating && (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-2">No action plans yet</p>
          <p className="text-sm text-gray-500">Enter competitors above and click Generate to create executable action plans.</p>
        </div>
      )}

      {/* Plans — same UI as Action Plans tab */}
      {!loadingSaved && plans.length > 0 && (
        <div className="space-y-4">
          {plans.map((plan, idx) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg p-2 -m-2" onClick={() => togglePlan(plan.id)}>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <div className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${getPriorityColor(plan.priority)}`}>
                          {(plan.priority || "medium").toUpperCase()}
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-xs font-semibold">Competitor Research</div>
                        {plan.projectName && (
                          <div className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {plan.projectName}
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {plan.timeline || "3-6 months"}
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          {plan.steps.filter((s) => s.completed).length}/{plan.steps.length} completed
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlan(plan.id);
                      }}
                      className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={() => togglePlan(plan.id)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      {plan.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {plan.expanded && (
                  <div className="border-t border-gray-200">
                    <div className="p-5 border-b border-gray-200 space-y-4">
                      <PlanProgress plan={plan} />
                      <PlanMetrics plan={plan} compact />
                    </div>
                    {plan.businessPlanData && (
                      <div className="p-5 border-b border-gray-200 bg-gray-50/50">
                        <BusinessPlanView plan={plan} />
                      </div>
                    )}
                    <div className="p-5 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-200">
                      <div className="flex items-start gap-2 mb-3">
                        <Zap className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-violet-900 mb-1">Strategic Reasoning</div>
                          <p className="text-sm text-gray-700">{plan.reasoning}</p>
                        </div>
                      </div>
                      {plan.expectedOutcome && (
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-semibold text-green-900 mb-1">Expected Outcome</div>
                            <p className="text-sm text-gray-700">{plan.expectedOutcome}</p>
                          </div>
                        </div>
                      )}
                    </div>

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
                                step.completed || executionStatus === "published" ? "bg-green-50 border-green-200" : executionStatus === "review" ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:border-violet-300"
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
                                    <div className={`px-2 py-0.5 rounded-full border text-xs font-semibold flex-shrink-0 ${getPriorityColor(step.priority)}`}>
                                      {step.priority}
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
                                            <>
                                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                              Generating…
                                            </>
                                          ) : (
                                            <>
                                              <Play className="w-3 h-3 mr-1" />
                                              Generate Content
                                            </>
                                          )}
                                        </Button>
                                      )}
                                      {executionStatus === "review" && step.executionMetadata?.linkedContentId && (
                                        <Button onClick={() => router.push(`/dashboard/content?contentId=${step.executionMetadata?.linkedContentId}`)} variant="primary" size="sm">
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Review
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
  );
}
