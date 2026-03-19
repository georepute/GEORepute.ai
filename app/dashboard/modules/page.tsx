"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/language-context";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Package,
  Check,
  X,
  Loader2,
  Eye,
  FileText,
  BarChart3,
  Shield,
  Target,
  Zap,
  Crown,
  Lock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useBillingContext } from "@/lib/billing/billing-context";

interface ModuleData {
  id: string;
  name: string;
  display_name: string;
  description: string;
  monthly_price_cents: number;
  features: string[] | string;
  usage_limits: Record<string, number>;
}

interface ActiveModule {
  id: string;
  module_id: string;
  name: string;
  display_name: string;
  monthly_price_cents: number;
  activated_at: string;
}

const MODULE_ICONS: Record<string, any> = {
  ai_visibility: Eye,
  content_publishing: FileText,
  analytics_competitor: BarChart3,
  reputation_monitoring: Shield,
  opportunity_sales: Target,
};

const formatCents = (cents: number) => `$${(cents / 100).toFixed(0)}`;

export default function ModulesPage() {
  const { isRtl, t } = useLanguage();
  const { role } = usePermissions();
  const billingContext = useBillingContext();

  const [loading, setLoading] = useState(true);
  const [availableModules, setAvailableModules] = useState<ModuleData[]>([]);
  const [activeModules, setActiveModules] = useState<ActiveModule[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSubscription, setHasSubscription] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/overview");
      const data = await res.json();
      if (data.success) {
        setAvailableModules(data.availableModules || []);
        setActiveModules(data.activeModules || []);
        setHasSubscription(!!data.subscription);
        setOrganizationId(data.organization?.id || null);
      }
    } catch {
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("module_success");
    const cancelled = params.get("module_cancelled");
    const sessionId = params.get("session_id");

    const verifyAndLoad = async () => {
      if (success === "true" && sessionId) {
        try {
          const res = await fetch("/api/billing/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          if (data.success && !data.alreadyProcessed) {
            toast.success(data.message || "Module(s) activated successfully!");
            // Refresh billing context so sidebar unlocks immediately
            billingContext.refetch();
          } else if (data.alreadyProcessed) {
            toast.success("Module(s) already active.");
          }
        } catch {
          toast.error("Could not verify payment. Please refresh.");
        }
        window.history.replaceState({}, "", "/dashboard/modules");
      } else if (cancelled === "true") {
        toast("Module purchase cancelled.", { icon: "ℹ️" });
        window.history.replaceState({}, "", "/dashboard/modules");
      }
      fetchData();
    };

    verifyAndLoad();
  }, [fetchData]);

  const activeModuleIds = new Set(activeModules.map((m) => m.module_id));

  const toggleSelection = (moduleId: string) => {
    if (activeModuleIds.has(moduleId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const perModuleCents = 19900;
  const totalMonthlyCents = selectedCount * perModuleCents;

  const handleSubscribe = async () => {
    if (!organizationId || selectedCount === 0) return;
    setActionLoading("subscribe");
    try {
      const res = await fetch("/api/billing/modules/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleIds: Array.from(selectedIds),
          organizationId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe Checkout for payment
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session");
        setActionLoading(null);
      }
    } catch {
      toast.error("Failed to initiate checkout");
      setActionLoading(null);
    }
  };

  const handleCancel = async (subscriptionModuleId: string, moduleName: string) => {
    if (!organizationId) return;
    if (!confirm(`Are you sure you want to remove "${moduleName}"? This will cancel it from your subscription.`)) return;
    setActionLoading(`cancel-${subscriptionModuleId}`);
    try {
      const res = await fetch("/api/billing/modules/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionModuleId, organizationId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error || "Failed to cancel module");
      }
    } catch {
      toast.error("Failed to cancel module");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const getFeatures = (mod: ModuleData): string[] => {
    if (typeof mod.features === "string") {
      try { return JSON.parse(mod.features); } catch { return []; }
    }
    return mod.features || [];
  };

  return (
    <div className={`max-w-5xl mx-auto space-y-8 ${isRtl ? "rtl" : ""}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Package className="w-8 h-8 text-purple-600" />
          Modules
        </h1>
        <p className="text-gray-600 mt-2">
          Extend your platform with add-on modules. Each module is <span className="font-semibold text-gray-900">$199/month</span> &mdash; select the ones you need.
        </p>
      </motion.div>

      {/* No subscription warning */}
      {!hasSubscription && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
        >
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Active plan required</p>
            <p className="text-sm text-amber-700">Subscribe to a plan first before adding modules.</p>
          </div>
          <a
            href="/dashboard/billing"
            className="ml-auto px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-1"
          >
            Go to Billing <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      )}

      {/* Active Modules */}
      {activeModules.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              Active Modules ({activeModules.length})
            </h2>
            <span className="text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              {formatCents(activeModules.length * perModuleCents)}/month
            </span>
          </div>
          <div className="space-y-3">
            {activeModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.name] || Zap;
              return (
                <div key={mod.id} className="flex items-center justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{mod.display_name}</p>
                      <p className="text-sm text-gray-500">$199/month &middot; Active</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancel(mod.id, mod.display_name)}
                    disabled={actionLoading === `cancel-${mod.id}`}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {actionLoading === `cancel-${mod.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Module Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
      >
        <div className="p-6 pb-0">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {activeModules.length > 0 ? "Add More Modules" : "Select Modules"}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Check the modules you want to add to your subscription. Each module unlocks a set of capabilities.
          </p>
        </div>

        <div className="px-6 space-y-3 max-h-[55vh] overflow-y-auto pb-2">
          {availableModules.map((mod) => {
            const isActive = activeModuleIds.has(mod.id);
            const isSelected = selectedIds.has(mod.id);
            const Icon = MODULE_ICONS[mod.name] || Zap;
            const features = getFeatures(mod);

            return (
              <label
                key={mod.id}
                className={`block p-5 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-green-300 bg-green-50/50 cursor-default"
                    : isSelected
                    ? "border-purple-500 bg-purple-50/30 cursor-pointer"
                    : hasSubscription
                    ? "border-gray-200 hover:border-gray-300 cursor-pointer"
                    : "border-gray-200 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start gap-4">
                  {isActive ? (
                    <div className="mt-1 w-5 h-5 rounded bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!hasSubscription}
                      onChange={() => toggleSelection(mod.id)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{mod.display_name}</h3>
                        <p className="text-sm text-gray-500">{mod.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isActive ? (
                          <span className="text-sm text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">$199<span className="text-sm font-normal text-gray-500">/mo</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-11">
                      {features.map((f, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Sticky subscribe footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          {!hasSubscription ? (
            <p className="text-center text-gray-500 text-sm">Subscribe to a plan first to add modules</p>
          ) : selectedCount > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{selectedCount} module{selectedCount > 1 ? "s" : ""} selected</span>
                <span className="text-purple-700 font-medium">{formatCents(totalMonthlyCents)}/month</span>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={actionLoading === "subscribe"}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === "subscribe" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Checkout — {selectedCount} Module{selectedCount > 1 ? "s" : ""} &middot; {formatCents(totalMonthlyCents)}/month
                  </>
                )}
              </button>
              <p className="text-xs text-center text-gray-500">
                You&apos;ll be taken to Stripe to complete payment. Modules activate instantly after checkout.
              </p>
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm">Select modules to add to your subscription</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
