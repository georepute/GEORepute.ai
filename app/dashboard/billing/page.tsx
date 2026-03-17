"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/lib/language-context";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CreditCard,
  Crown,
  Package,
  FileText,
  Download,
  ExternalLink,
  Check,
  X,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  Shield,
  Zap,
  Eye,
  BarChart3,
  Globe,
  Target,
  Lock,
  ChevronRight,
  Clock,
  RefreshCw,
  Star,
  TrendingUp,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";

interface DiscountTier {
  id: string;
  min_reports: number;
  discount_percent: number;
  label: string | null;
}

interface BillingOverview {
  organization: any;
  subscription: any;
  plan: any;
  activeModules: any[];
  reports: any[];
  monitoring: any[];
  usage: { domains_used: number; domain_limit: number };
  isWithinCommitment: boolean;
  availablePlans: any[];
  availableModules: any[];
  availableReportTypes: any[];
  discountTiers: DiscountTier[];
}

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  receipt_url: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
  type: string | null;
  invoice_number: string | null;
  line_items_summary: string | null;
}

const MODULE_ICONS: Record<string, any> = {
  ai_visibility: Eye,
  content_publishing: FileText,
  analytics_competitor: BarChart3,
  reputation_monitoring: Shield,
  opportunity_sales: Target,
};

const PLAN_COLORS: Record<string, string> = {
  base: "from-blue-500 to-blue-600",
  professional: "from-purple-500 to-purple-600",
  enterprise: "from-amber-500 to-amber-600",
};

export default function BillingPage() {
  const { isRtl, t } = useLanguage();
  const { role } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/overview");
      const data = await res.json();
      if (data.success) {
        setBilling(data);
      }
    } catch (error) {
      console.error("Failed to fetch billing:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // fetchInvoices — reads directly from the local DB (fast, no Stripe round-trip)
  const fetchInvoices = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/billing/invoices?page=${page}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
        setInvoiceTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  }, []);

  // syncAndFetchInvoices — shows DB data immediately, fires a background Stripe sync,
  // then re-reads the DB ~3 s later so any newly synced records appear.
  const syncAndFetchInvoices = useCallback(async (page = 1) => {
    // Show whatever is already stored so the user never stares at a blank list
    await fetchInvoices(page);
    // Kick off Stripe sync in the background (non-blocking)
    fetch("/api/billing/sync-invoices", { method: "POST" })
      .then(() => fetchInvoices(page))
      .catch(() => {});
  }, [fetchInvoices]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");
    const reportSuccess = params.get("report_success");

    const verifyAndLoad = async () => {
      // If redirected from Stripe checkout, verify the session first, then reload billing
      if (sessionId && (success === "true" || reportSuccess === "true")) {
        try {
          const res = await fetch("/api/billing/verify-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await res.json();
          if (data.success && !data.alreadyProcessed) {
            toast.success(data.message || "Payment verified successfully!");
          }
        } catch (err) {
          console.error("Failed to verify session:", err);
        }
        // Clean up URL params
        window.history.replaceState({}, "", "/dashboard/billing");
      }
      // Always reload billing state AFTER verify-session completes
      await fetchBilling();
      // Show stored invoices immediately, then sync Stripe in the background
      await syncAndFetchInvoices();
    };

    verifyAndLoad();
  }, [fetchBilling, syncAndFetchInvoices]);

  const handleSubscribe = async (planId: string) => {
    if (!billing?.organization?.id) return;
    setActionLoading(`plan-${planId}`);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, organizationId: billing.organization.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.action === "plan_changed") {
        toast.success(`Switched to ${data.plan} plan`);
        setShowUpgradeModal(false);
        fetchBilling();
      } else {
        toast.error(data.error || "Failed to subscribe");
      }
    } catch {
      toast.error("Failed to create checkout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!billing?.organization?.id) return;
    if (!confirm("Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.")) return;
    setActionLoading("cancel");
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: billing.organization.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchBilling();
      } else {
        toast.error(data.error || data.message || "Failed to cancel");
      }
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const handleModuleCancel = async (subscriptionModuleId: string) => {
    if (!billing?.organization?.id) return;
    if (!confirm("Are you sure you want to remove this module?")) return;
    setActionLoading(`cancel-module-${subscriptionModuleId}`);
    try {
      const res = await fetch("/api/billing/modules/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionModuleId, organizationId: billing.organization.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchBilling();
      } else {
        toast.error(data.error || "Failed to cancel module");
      }
    } catch {
      toast.error("Failed to cancel module");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleReportSelection = (reportTypeId: string) => {
    // Cannot re-select a report that's already purchased with active monitoring
    if (purchasedActiveTypeIds.has(reportTypeId)) return;
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportTypeId)) {
        next.delete(reportTypeId);
      } else {
        next.add(reportTypeId);
      }
      return next;
    });
  };

  const getDiscountForCount = (count: number): DiscountTier | null => {
    const tiers = billing?.discountTiers || [];
    const applicable = tiers
      .filter((t) => t.min_reports <= count)
      .sort((a, b) => b.min_reports - a.min_reports);
    return applicable[0] || null;
  };

  // Report type IDs that have been purchased AND have active monitoring (cannot re-purchase)
  const activelyMonitoredTypeIds = new Set(
    (billing?.monitoring || [])
      .filter((m) => m.status === "active" || m.status === "past_due")
      .map((m: any) => m.report_type_id)
      .filter(Boolean)
  );
  const purchasedActiveTypeIds = new Set(
    (billing?.reports || [])
      .filter((r: any) => r.status === "completed" && activelyMonitoredTypeIds.has(r.report_type_id))
      .map((r: any) => r.report_type_id)
  );
  // Report type IDs that were purchased but monitoring has lapsed (can re-purchase)
  const lapsedMonitoringTypeIds = new Set(
    (billing?.reports || [])
      .filter((r: any) => r.status === "completed" && !activelyMonitoredTypeIds.has(r.report_type_id))
      .map((r: any) => r.report_type_id)
  );

  const selectedCount = selectedReportIds.size;
  const currentDiscount = getDiscountForCount(selectedCount);
  const perReportCents = 9900;
  const discountedPerReport = currentDiscount
    ? Math.round(perReportCents * (1 - currentDiscount.discount_percent / 100))
    : perReportCents;
  const totalReportCents = discountedPerReport * selectedCount;
  const monitoringMonthlyCents = 5000 * selectedCount;

  const handlePurchaseSelectedReports = async () => {
    if (!billing?.organization?.id || selectedCount === 0) return;
    setActionLoading("purchase-reports");
    try {
      const res = await fetch("/api/billing/reports/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportTypeIds: Array.from(selectedReportIds),
          organizationId: billing.organization.id,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.alreadyActiveIds) {
        toast.error(data.error || "Some reports are already purchased. Please deselect them.");
        // Deselect the already-active ones
        setSelectedReportIds((prev) => {
          const next = new Set(prev);
          (data.alreadyActiveIds as string[]).forEach((id) => next.delete(id));
          return next;
        });
      } else {
        toast.error(data.error || "Failed to purchase reports");
      }
    } catch {
      toast.error("Failed to purchase reports");
    } finally {
      setActionLoading(null);
    }
  };

  const handleManagePayment = async () => {
    if (!billing?.organization?.id) return;
    setActionLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: billing.organization.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open payment portal");
      }
    } catch {
      toast.error("Failed to open payment portal");
    } finally {
      setActionLoading(null);
    }
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const plan = billing?.plan;
  const subscription = billing?.subscription;
  const hasPlan = !!subscription && subscription.status !== "canceled";
  const usage = billing?.usage || { domains_used: 0, domain_limit: 0 };
  const usagePercent = usage.domain_limit > 0 ? Math.min(100, (usage.domains_used / usage.domain_limit) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8" dir={isRtl ? "rtl" : "ltr"}>
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your plan, modules, reports, and payment methods.</p>
      </div>

      {/* ── Current Plan Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-6 text-white bg-gradient-to-br ${plan ? PLAN_COLORS[plan.name] || "from-gray-600 to-gray-700" : "from-gray-600 to-gray-700"}`}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Current Plan</span>
            </div>
            <h2 className="text-3xl font-bold mb-1">
              {plan ? plan.display_name : "No Active Plan"}
            </h2>
            {plan && (
              <p className="opacity-90">
                {formatCents(plan.monthly_price_cents)}/month
                {subscription?.current_period_end && (
                  <> &middot; Renews {formatDate(subscription.current_period_end)}</>
                )}
              </p>
            )}
            {subscription?.cancel_at_period_end && (
              <p className="mt-2 bg-white/20 rounded-lg px-3 py-1 text-sm inline-block">
                Cancels at end of period ({formatDate(subscription.current_period_end)})
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
            >
              {plan ? "Change Plan" : "Choose a Plan"}
            </button>
            {plan && !subscription?.cancel_at_period_end && (
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading === "cancel" || billing?.isWithinCommitment}
                className="px-5 py-2.5 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={billing?.isWithinCommitment ? `Commitment period ends ${formatDate(subscription?.commitment_end_date)}` : ""}
              >
                {actionLoading === "cancel" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Cancel Plan"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Usage Bar */}
        {plan && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2 opacity-90">
              <span>Domain Slots</span>
              <span>{usage.domains_used} / {usage.domain_limit} domains</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-white rounded-full h-3 transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        )}

        {billing?.isWithinCommitment && subscription?.commitment_end_date && (
          <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
            <Lock className="w-4 h-4" />
            <span>6-month commitment until {formatDate(subscription.commitment_end_date)}</span>
          </div>
        )}
      </motion.div>

      {/* ── Active Modules ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Active Modules
            </h3>
            <p className="text-sm text-gray-600 mt-1">$199/month per module &middot; Add-on capabilities for your platform</p>
          </div>
          <a
            href="/dashboard/modules"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Manage Modules
          </a>
        </div>

        {(billing?.activeModules?.length || 0) > 0 ? (
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">{billing!.activeModules.length} module{billing!.activeModules.length > 1 ? "s" : ""} active</span>
                </div>
                <span className="text-sm font-bold text-purple-800">
                  {formatCents(billing!.activeModules.length * 19900)}/month
                </span>
              </div>
            </div>
            {billing!.activeModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.name] || Zap;
              return (
                <div key={mod.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{mod.display_name}</p>
                      <p className="text-sm text-gray-500">$199/month</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleModuleCancel(mod.id)}
                    disabled={actionLoading === `cancel-module-${mod.id}`}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    {actionLoading === `cancel-module-${mod.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No active modules. <a href="/dashboard/modules" className="text-purple-600 font-medium hover:underline">Browse modules</a> to unlock advanced features.</p>
          </div>
        )}
      </motion.div>

      {/* ── Intelligence Reports ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Intelligence Reports
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              $99 per report &middot; monitoring auto-activates at $50/month per report (6-month commitment)
              {!hasPlan && (
                <span className="block text-amber-600 font-medium mt-1">Subscribe to a plan first to purchase reports</span>
              )}
            </p>
          </div>
          <button
            onClick={() => { if (hasPlan) { setShowReportModal(true); setSelectedReportIds(new Set()); } }}
            disabled={!hasPlan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasPlan ? "Subscribe to a plan first" : undefined}
          >
            Purchase Reports
          </button>
        </div>

        {/* Discount Tiers Preview */}
        {(billing?.discountTiers || []).length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-gray-500 self-center">Bundle discounts:</span>
            {(billing?.discountTiers || []).filter((t) => t.discount_percent > 0).map((tier) => (
              <span key={tier.id} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full font-medium">
                {tier.min_reports}+ reports: {tier.discount_percent}% off
              </span>
            ))}
          </div>
        )}

        {/* Purchased Reports */}
        {(billing?.reports?.length || 0) > 0 ? (
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Purchased Reports</h4>
            {billing!.reports.map((report) => {
              const hasMonitoring = billing!.monitoring.some(
                (m) => m.report_type === report.report_type
              );
              return (
                <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{report.report_type}</p>
                      <p className="text-sm text-gray-500">
                        {report.status === "completed" ? `Purchased ${formatDate(report.purchased_at)}` : report.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {report.pdf_url && (
                      <a
                        href={report.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </a>
                    )}
                    {hasMonitoring ? (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" /> Monitoring Active
                      </span>
                    ) : report.status === "completed" ? (
                      <span className="text-sm text-red-500 font-medium flex items-center gap-1">
                        <Lock className="w-4 h-4" /> Monitoring Expired — report locked
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 mb-6">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No reports purchased yet. Select reports to generate PDFs, add data to your dashboard, and start automatic monitoring.</p>
          </div>
        )}

        {/* Active Monitoring */}
        {(billing?.monitoring?.length || 0) > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Active Monitoring ({billing!.monitoring.length})</h4>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <RefreshCw className="w-4 h-4" />
                  <span className="font-medium">{billing!.monitoring.length} report{billing!.monitoring.length > 1 ? "s" : ""} monitored</span>
                </div>
                <span className="text-sm font-bold text-green-800">
                  {formatCents(5000 * billing!.monitoring.length)}/month
                </span>
              </div>
            </div>
            {billing!.monitoring.map((mon) => (
              <div key={mon.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{mon.report_type}</p>
                    <p className="text-xs text-gray-500">
                      Next billing: {formatDate(mon.current_period_end)}
                    </p>
                  </div>
                </div>
                {mon.commitment_end_date && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Until {formatDate(mon.commitment_end_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Payment Method ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600" />
              Payment Method
            </h3>
            <p className="text-sm text-gray-600 mt-1">Manage your payment details via Stripe</p>
          </div>
          <button
            onClick={handleManagePayment}
            disabled={!billing?.organization?.stripe_customer_id || actionLoading === "portal"}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading === "portal" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Manage Payment
          </button>
        </div>
      </motion.div>

      {/* ── Invoices & Billing History ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Invoices & Billing History
          </h3>
          <button
            onClick={() => syncAndFetchInvoices(invoicePage)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {invoices.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 rounded-lg">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 rounded-l-lg">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Period</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600 rounded-r-lg">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const invType = inv.type || 'subscription';
                    const typeConfig: Record<string, { label: string; className: string }> = {
                      subscription: { label: 'Plan', className: 'bg-blue-50 text-blue-700' },
                      module: { label: 'Module', className: 'bg-purple-50 text-purple-700' },
                      report: { label: 'Report', className: 'bg-amber-50 text-amber-700' },
                      other: { label: 'Other', className: 'bg-gray-100 text-gray-600' },
                    };
                    const { label: typeLabel, className: typeCls } = typeConfig[invType] ?? typeConfig.other;
                    const displayDesc = inv.line_items_summary || inv.description || '—';
                    const hasPeriod = inv.period_start && inv.period_end;

                    return (
                      <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                          <div>{formatDate(inv.paid_at || inv.created_at)}</div>
                          {inv.invoice_number && (
                            <div className="text-xs text-gray-400 mt-0.5">{inv.invoice_number}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeCls}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 max-w-xs">
                          <span className="line-clamp-2">{displayDesc}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-xs">
                          {hasPeriod ? (
                            <>
                              {formatDate(inv.period_start!)}
                              <span className="mx-1">→</span>
                              {formatDate(inv.period_end!)}
                            </>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                          {formatCents(inv.amount_cents)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            inv.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : inv.status === "open"
                              ? "bg-yellow-100 text-yellow-700"
                              : inv.status === "void"
                              ? "bg-red-50 text-red-500"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {(inv.receipt_url || inv.hosted_invoice_url) ? (
                              <a
                                href={inv.receipt_url || inv.hosted_invoice_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View
                              </a>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {invoiceTotal > 10 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Showing {(invoicePage - 1) * 10 + 1}–{Math.min(invoicePage * 10, invoiceTotal)} of {invoiceTotal} invoices
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setInvoicePage(p => p - 1); fetchInvoices(invoicePage - 1); }}
                    disabled={invoicePage <= 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    {invoicePage} / {Math.ceil(invoiceTotal / 10)}
                  </span>
                  <button
                    onClick={() => { setInvoicePage(p => p + 1); fetchInvoices(invoicePage + 1); }}
                    disabled={invoicePage >= Math.ceil(invoiceTotal / 10)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-gray-600">No invoices yet</p>
            <p className="text-sm mt-1">Invoices will appear here after your first payment.</p>
          </div>
        )}
      </motion.div>

      {/* ── Plan Upgrade Modal ── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
                <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(billing?.availablePlans || []).map((p: any) => {
                  const isCurrent = plan?.id === p.id;
                  const features = typeof p.features === "string" ? JSON.parse(p.features) : (p.features || []);
                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-2xl border-2 p-6 transition-all ${
                        isCurrent
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Current Plan
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{p.display_name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">{formatCents(p.monthly_price_cents)}</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg px-3 py-2 mb-4 text-sm font-medium text-gray-700">
                        Up to {p.domain_limit} domain slots
                      </div>
                      <ul className="space-y-2 mb-6">
                        {features.map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="text-xs text-gray-500 mb-4">6-month minimum commitment</div>
                      <button
                        onClick={() => handleSubscribe(p.id)}
                        disabled={isCurrent || !!actionLoading}
                        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
                          isCurrent
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
                        }`}
                      >
                        {actionLoading === `plan-${p.id}` ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : isCurrent ? (
                          "Current Plan"
                        ) : plan ? (
                          p.monthly_price_cents > plan.monthly_price_cents ? "Upgrade" : "Downgrade"
                        ) : (
                          "Get Started"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module selection is now at /dashboard/modules */}

      {/* ── Report Selection Modal (Checkbox + Dynamic Discount) ── */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 pb-0">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">Select Intelligence Reports</h2>
                  <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Select the reports you need. The more you select, the bigger the discount. Monitoring auto-activates for every report.
                </p>
                {purchasedActiveTypeIds.size > 0 && (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm text-green-800">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      You already own {purchasedActiveTypeIds.size} active report{purchasedActiveTypeIds.size > 1 ? "s" : ""} (shown below). These cannot be repurchased while monitoring is active.
                    </span>
                  </div>
                )}
                {lapsedMonitoringTypeIds.size > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {lapsedMonitoringTypeIds.size} report{lapsedMonitoringTypeIds.size > 1 ? "s have" : " has"} expired monitoring. Select to re-purchase and re-activate monitoring.
                    </span>
                  </div>
                )}

                {/* Discount tiers bar */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {(billing?.discountTiers || []).map((tier) => {
                    const isActive = selectedCount >= tier.min_reports;
                    return (
                      <span
                        key={tier.id}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                          tier.discount_percent === 0
                            ? "bg-gray-100 text-gray-500"
                            : isActive
                            ? "bg-green-100 text-green-700 border border-green-300 ring-1 ring-green-200"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {tier.discount_percent === 0
                          ? "1 report: full price"
                          : `${tier.min_reports}+ reports: ${tier.discount_percent}% off`}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Report checkboxes */}
              <div className="px-8 space-y-2 max-h-[40vh] overflow-y-auto">
                {(billing?.availableReportTypes || []).map((rt: any) => {
                  const isSelected = selectedReportIds.has(rt.id);
                  const isPurchasedActive = purchasedActiveTypeIds.has(rt.id);
                  const isLapsed = lapsedMonitoringTypeIds.has(rt.id);

                  return (
                    <label
                      key={rt.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        isPurchasedActive
                          ? "border-green-300 bg-green-50/50 cursor-not-allowed opacity-75"
                          : isLapsed
                          ? "border-amber-300 bg-amber-50/50 cursor-pointer hover:border-amber-400"
                          : isSelected
                          ? "border-blue-500 bg-blue-50/50 cursor-pointer"
                          : "border-gray-200 hover:border-gray-300 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isPurchasedActive}
                        onChange={() => toggleReportSelection(rt.id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{rt.display_name}</p>
                          {isPurchasedActive && (
                            <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Purchased
                            </span>
                          )}
                          {isLapsed && (
                            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Monitoring expired — re-activate
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-1">{rt.description}</p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {rt.category}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isPurchasedActive ? (
                          <span className="text-sm text-green-600 font-medium">Active</span>
                        ) : currentDiscount && currentDiscount.discount_percent > 0 && isSelected ? (
                          <>
                            <p className="text-sm text-gray-400 line-through">{formatCents(rt.price_cents)}</p>
                            <p className="text-lg font-bold text-blue-600">{formatCents(discountedPerReport)}</p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-gray-900">{formatCents(rt.price_cents)}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Sticky checkout summary footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
                {selectedCount > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{selectedCount} report{selectedCount > 1 ? "s" : ""} selected</span>
                      {currentDiscount && currentDiscount.discount_percent > 0 && (
                        <span className="text-green-600 font-medium">
                          {currentDiscount.discount_percent}% bundle discount applied!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">One-time execution</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCents(totalReportCents)}
                          {currentDiscount && currentDiscount.discount_percent > 0 && (
                            <span className="text-sm text-gray-400 line-through ml-2">
                              {formatCents(perReportCents * selectedCount)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">+ Monthly monitoring</p>
                        <p className="text-lg font-bold text-gray-700">
                          {formatCents(monitoringMonthlyCents)}/mo
                        </p>
                        <p className="text-xs text-gray-500">6-month commitment, auto-renews</p>
                      </div>
                    </div>

                    <button
                      onClick={handlePurchaseSelectedReports}
                      disabled={actionLoading === "purchase-reports"}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === "purchase-reports" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Purchase {selectedCount} Report{selectedCount > 1 ? "s" : ""} &middot; {formatCents(totalReportCents)}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm">Select at least one report to continue</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
