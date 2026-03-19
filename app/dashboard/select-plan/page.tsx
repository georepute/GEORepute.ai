"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language-context";
import {
  Crown,
  Check,
  Loader2,
  Zap,
  Star,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  monthly_price_cents: number;
  domain_limit: number;
  features: string[] | string;
  min_commitment_months: number;
}

const PLAN_STYLES: Record<string, { gradient: string; icon: any; badge?: string }> = {
  base: { gradient: "from-blue-500 to-blue-600", icon: Zap },
  professional: { gradient: "from-purple-500 to-purple-600", icon: Star, badge: "Popular" },
  enterprise: { gradient: "from-amber-500 to-amber-600", icon: Shield },
};

const formatCents = (cents: number) => `$${(cents / 100).toFixed(0)}`;

export default function SelectPlanPage() {
  const { isRtl } = useLanguage();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/overview");
      const data = await res.json();
      if (data.success) {
        setPlans(data.availablePlans || []);
        setOrganizationId(data.organization?.id || null);

        if (data.subscription && data.subscription.status !== "canceled") {
          window.location.href = "/dashboard";
          return;
        }
      }
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSubscribe = async (planId: string) => {
    if (!organizationId) return;
    setActionLoading(planId);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, organizationId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setActionLoading(null);
    }
  };

  const getFeatures = (plan: Plan): string[] => {
    if (typeof plan.features === "string") {
      try { return JSON.parse(plan.features); } catch { return []; }
    }
    return plan.features || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`max-w-5xl mx-auto px-6 py-12 ${isRtl ? "rtl" : ""}`}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select a plan to activate your GeoRepute.ai account. All plans include a 6-month minimum commitment.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const style = PLAN_STYLES[plan.name] || PLAN_STYLES.base;
          const Icon = style.icon;
          const features = getFeatures(plan);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col ${
                style.badge ? "border-purple-300 shadow-lg shadow-purple-100" : "border-gray-200"
              }`}
            >
              {style.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    {style.badge}
                  </span>
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center mb-6`}>
                <Icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.display_name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">{formatCents(plan.monthly_price_cents)}</span>
                <span className="text-gray-500">/month</span>
              </div>

              <div className="text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">
                Up to <span className="font-semibold text-gray-900">{plan.domain_limit} domain slots</span> included
                <br />
                {plan.min_commitment_months}-month minimum commitment
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!actionLoading}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                  style.badge
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                {actionLoading === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  `Get ${plan.display_name}`
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        All plans include: Main Dashboard, Domain Connection, System Settings, Seat Management, and Partial Intelligence Signals.
      </p>
    </div>
  );
}
