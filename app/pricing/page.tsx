"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info, ChevronDown, ChevronUp, Star, Zap, Crown, Users, Shield, BarChart3, FileText, Globe, MessageSquare } from "lucide-react";
import Button from "@/components/Button";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// Client Plans Data with limits
const clientPlans = [
  {
    id: "reputation-monitor",
    name: "Reputation Monitor",
    audience: "client",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "Dashboard + Reputation tracking + Competitor reports",
    highlight: "For individual SEO professionals",
    icon: BarChart3,
    limits: {
      domains: 1,
      keywords: 50,
      monthlySearches: 500,
      monthlyReports: 10,
      scansPerReport: 5,
      seats: 1,
    },
    features: [
      "1 domain tracking",
      "50 keywords per domain",
      "500 monthly searches",
      "10 reports per month",
      "Real-time reputation monitoring",
      "Competitor analysis reports",
      "Email alerts",
      "Basic support"
    ],
    popular: false
  },
  {
    id: "google-reviews-booster",
    name: "Google Reviews Booster",
    audience: "client",
    monthlyPrice: 79,
    yearlyPrice: 63,
    description: "Dashboard + Google Ratings Manager",
    highlight: "Most popular for small businesses",
    icon: Star,
    limits: {
      domains: 2,
      keywords: 100,
      monthlySearches: 1000,
      monthlyReports: 25,
      scansPerReport: 10,
      seats: 1,
    },
    features: [
      "2 domains tracking",
      "100 keywords per domain",
      "1,000 monthly searches",
      "25 reports per month",
      "Everything in Reputation Monitor",
      "Google Reviews management",
      "Review response automation",
      "Review generation campaigns",
      "Priority support"
    ],
    popular: true
  },
  {
    id: "local-seo-pro",
    name: "Local SEO Pro",
    audience: "client",
    monthlyPrice: 149,
    yearlyPrice: 119,
    description: "Dashboard + Rankings + AI Visibility + Reports",
    highlight: "For growing businesses",
    icon: Zap,
    limits: {
      domains: 5,
      keywords: 250,
      monthlySearches: 2500,
      monthlyReports: 50,
      scansPerReport: 20,
      seats: 2,
    },
    features: [
      "5 domains tracking",
      "250 keywords per domain",
      "2,500 monthly searches",
      "50 reports per month",
      "2 team seats",
      "Everything in Google Reviews Booster",
      "Local SEO optimization",
      "AI-powered visibility insights",
      "Advanced reporting",
      "Phone support"
    ],
    popular: false
  },
  {
    id: "full-platform",
    name: "Full Platform",
    audience: "client",
    monthlyPrice: 299,
    yearlyPrice: 239,
    description: "Access to all modules",
    highlight: "Complete solution for professionals",
    icon: Crown,
    limits: {
      domains: 10,
      keywords: 500,
      monthlySearches: 5000,
      monthlyReports: 100,
      scansPerReport: 50,
      seats: 3,
    },
    features: [
      "10 domains tracking",
      "500 keywords per domain",
      "5,000 monthly searches",
      "100 reports per month",
      "3 team seats",
      "Everything in Local SEO Pro",
      "All AI modules",
      "Advanced analytics",
      "API access",
      "Dedicated support"
    ],
    popular: false
  }
];

// Agency Plans Data
const agencyPlans = [
  {
    id: "agency-starter",
    name: "Agency Starter",
    audience: "agency",
    monthlyPrice: 299,
    yearlyPrice: 239,
    description: "Up to 10 clients, includes Rankings + Reports + Team tools",
    highlight: "Perfect for new agencies",
    icon: Users,
    limits: {
      clients: 10,
      domainsPerClient: 3,
      keywords: 500,
      monthlySearches: 5000,
      monthlyReports: 100,
      scansPerReport: 20,
      seats: 3,
    },
    features: [
      "Up to 10 client accounts",
      "3 domains per client",
      "500 total keywords",
      "5,000 monthly searches",
      "100 reports per month",
      "3 manager seats",
      "Team collaboration tools",
      "Client reporting dashboard",
      "White-label options",
      "Email support"
    ],
    popular: false
  },
  {
    id: "agency-pro",
    name: "Agency Pro",
    audience: "agency",
    monthlyPrice: 599,
    yearlyPrice: 479,
    description: "Up to 25 clients, adds AI Visibility + Content + Reports",
    highlight: "Agencies' choice",
    icon: Zap,
    limits: {
      clients: 25,
      domainsPerClient: 5,
      keywords: 1500,
      monthlySearches: 15000,
      monthlyReports: 300,
      scansPerReport: 30,
      seats: 5,
    },
    features: [
      "Up to 25 client accounts",
      "5 domains per client",
      "1,500 total keywords",
      "15,000 monthly searches",
      "300 reports per month",
      "5 manager seats",
      "Everything in Agency Starter",
      "AI Visibility modules",
      "Content management tools",
      "Advanced white-label",
      "Priority support"
    ],
    popular: true
  },
  {
    id: "agency-elite",
    name: "Agency Elite",
    audience: "agency",
    monthlyPrice: 999,
    yearlyPrice: 799,
    description: "Unlimited clients + Full access + White-label brand",
    highlight: "For large agencies and enterprises",
    icon: Crown,
    limits: {
      clients: -1, // unlimited
      domainsPerClient: 10,
      keywords: 5000,
      monthlySearches: 50000,
      monthlyReports: 1000,
      scansPerReport: 100,
      seats: 10,
    },
    features: [
      "Unlimited client accounts",
      "10 domains per client",
      "5,000 total keywords",
      "50,000 monthly searches",
      "1,000 reports per month",
      "10 manager seats",
      "Everything in Agency Pro",
      "Full white-label branding",
      "Custom integrations",
      "API access",
      "Dedicated account manager",
      "24/7 priority support"
    ],
    popular: false
  }
];

// Add-ons
const addons = [
  {
    id: "operational-assistance",
    name: "Operational Assistance",
    description: "We handle the optimization work on your behalf",
    monthlyPrice: 199,
    yearlyPrice: 159,
    icon: Shield,
    features: [
      "Dedicated optimization specialist",
      "Monthly strategy sessions",
      "Hands-on implementation",
      "Performance reporting"
    ]
  },
  {
    id: "content-marketing",
    name: "Content Marketing Add-on",
    description: "AI-powered content creation and optimization",
    monthlyPrice: 49,
    yearlyPrice: 39,
    icon: FileText,
    features: [
      "AI content generation",
      "SEO content optimization",
      "Content calendar",
      "Plagiarism checker"
    ]
  },
  {
    id: "local-marketing",
    name: "Local Marketing Add-on",
    description: "Enhanced local SEO and directory management",
    monthlyPrice: 29,
    yearlyPrice: 23,
    icon: Globe,
    features: [
      "100+ directory submissions",
      "Local listing management",
      "Map rank tracking",
      "Review monitoring"
    ]
  }
];

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("yearly");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const calculatePrice = (plan: any) => {
    const basePrice = billingInterval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
    const addonsTotal = selectedAddons.reduce((sum, addonId) => {
      const addon = addons.find(a => a.id === addonId);
      if (!addon) return sum;
      return sum + (billingInterval === "monthly" ? addon.monthlyPrice : addon.yearlyPrice);
    }, 0);
    return basePrice + addonsTotal;
  };

  const savingsPercentage = 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Navbar */}
      <Navbar />

      {/* Discount Banner */}
      <div className="bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-600 text-white py-5 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm sm:text-base font-semibold">
            🎉 Get free migration and 20% discount with annual subscription plans
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Find your plan
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Configure limits to meet your business needs. Save 20% on annual billing.
            </p>

            {/* Billing Toggle - Sticky */}
            <div className="inline-flex items-center gap-3 bg-gray-100 p-1.5 rounded-xl">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  billingInterval === "monthly"
                    ? "bg-white text-primary-600 shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                  billingInterval === "yearly"
                    ? "bg-white text-primary-600 shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Yearly
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save {savingsPercentage}%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Client Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Client Plans
            </h2>
            <p className="text-lg text-gray-600">
              Perfect for businesses managing their own reputation
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {clientPlans.map((plan, index) => {
              const Icon = plan.icon;
              const isExpanded = expandedPlan === plan.id;
              const price = calculatePrice(plan);
              const originalPrice = billingInterval === "monthly" ? plan.monthlyPrice : plan.monthlyPrice * 12 / 12;
              const savings = billingInterval === "yearly" ? plan.monthlyPrice - plan.yearlyPrice : 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={`relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-2xl ${
                    plan.popular
                      ? "border-primary-500 ring-4 ring-primary-100 scale-105"
                      : "border-gray-200 hover:border-primary-300"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                        <Star className="w-3 h-3 fill-current" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {plan.name}
                        </h3>
                      </div>
                    </div>

                    {/* Highlight */}
                    <p className="text-sm text-gray-600 mb-4">{plan.highlight}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        {billingInterval === "yearly" && savings > 0 && (
                          <span className="text-lg text-gray-400 line-through">
                            ${plan.monthlyPrice}
                          </span>
                        )}
                        <span className="text-4xl font-bold text-gray-900">
                          ${price}
                        </span>
                        <span className="text-gray-500">/mo</span>
                      </div>
                      {billingInterval === "yearly" && savings > 0 && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          Save ${savings}/mo
                        </p>
                      )}
                    </div>

                    {/* Key Limits */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Domains</span>
                        <span className="font-semibold text-gray-900">{plan.limits.domains}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Keywords</span>
                        <span className="font-semibold text-gray-900">{plan.limits.keywords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Searches/mo</span>
                        <span className="font-semibold text-gray-900">{plan.limits.monthlySearches.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reports/mo</span>
                        <span className="font-semibold text-gray-900">{plan.limits.monthlyReports}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      variant={plan.popular ? "primary" : "outline"}
                      className="w-full mb-4"
                      size="lg"
                    >
                      Start free trial
                    </Button>

                    {/* Expandable Features */}
                    <button
                      onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {isExpanded ? "Hide details" : "View all features"}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Agency Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Agency Plans
            </h2>
            <p className="text-lg text-gray-600">
              Built for agencies managing multiple clients
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {agencyPlans.map((plan, index) => {
              const Icon = plan.icon;
              const isExpanded = expandedPlan === plan.id;
              const price = calculatePrice(plan);
              const savings = billingInterval === "yearly" ? plan.monthlyPrice - plan.yearlyPrice : 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className={`relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 hover:shadow-2xl ${
                    plan.popular
                      ? "border-secondary-500 ring-4 ring-secondary-100 scale-105"
                      : "border-gray-200 hover:border-secondary-300"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <div className="bg-gradient-to-r from-secondary-500 to-accent-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                        <Zap className="w-3 h-3 fill-current" />
                        Agencies' Choice
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-secondary-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {plan.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{plan.highlight}</p>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        {billingInterval === "yearly" && savings > 0 && (
                          <span className="text-lg text-gray-400 line-through">
                            ${plan.monthlyPrice}
                          </span>
                        )}
                        <span className="text-4xl font-bold text-gray-900">
                          ${price}
                        </span>
                        <span className="text-gray-500">/mo</span>
                      </div>
                      {billingInterval === "yearly" && savings > 0 && (
                        <p className="text-sm text-green-600 font-medium mt-1">
                          Save ${savings}/mo
                        </p>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Clients</span>
                        <span className="font-semibold text-gray-900">
                          {plan.limits.clients === -1 ? "Unlimited" : plan.limits.clients}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Domains/client</span>
                        <span className="font-semibold text-gray-900">{plan.limits.domainsPerClient}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Keywords</span>
                        <span className="font-semibold text-gray-900">{plan.limits.keywords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Searches/mo</span>
                        <span className="font-semibold text-gray-900">{plan.limits.monthlySearches.toLocaleString()}</span>
                      </div>
                    </div>

                    <Button
                      variant={plan.popular ? "secondary" : "outline"}
                      className="w-full mb-4"
                      size="lg"
                    >
                      Start free trial
                    </Button>

                    <button
                      onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      className="w-full flex items-center justify-center gap-2 text-sm text-secondary-600 hover:text-secondary-700 font-medium"
                    >
                      {isExpanded ? "Hide details" : "View all features"}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Custom Plan CTA */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Need more flexibility? We can create a custom plan for your agency.
            </p>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Get a custom plan
              </Button>
            </Link>
          </div>
        </motion.div>


        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-8 md:p-12 shadow-xl border border-gray-200"
        >
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                How does the domain limit work?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Each plan has a specific domain limit to prevent chaos. You can only track the number of domains specified in your plan. This ensures fair usage and keeps costs predictable.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                What happens when I reach my limits?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                When you reach your monthly search, report, or scan limits, you'll receive a notification. You can upgrade your plan anytime to get more capacity immediately.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                Can I share my account?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                No, each account is tied to one email address and limited to your specified seat count. This prevents abuse and ensures each user has proper access controls and security.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                What's included in Operational Assistance?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Our team handles all optimization work for you—from strategy to implementation. You get a dedicated specialist who performs the work while you focus on your business.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                Is there a free trial?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Yes! We offer a 14-day free trial for all plans. No credit card required. Experience the full power of GeoRepute.ai before committing.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                Can I switch between plans?
              </h4>
              <p className="text-gray-600 leading-relaxed">
                Absolutely! You can upgrade or downgrade at any time. Upgrades take effect immediately, and downgrades will apply at your next billing cycle.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 rounded-2xl p-12 text-white">
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to boost your reputation?
            </h3>
            <p className="text-xl mb-8 text-white/90">
              Join thousands of businesses already using GeoRepute.ai
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <button className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg">
                  Start free trial
                </button>
              </Link>
              <Link href="/contact">
                <button className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-all">
                  Talk to sales
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
