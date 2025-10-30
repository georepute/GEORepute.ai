"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3, 
  Globe, 
  ArrowRight,
  CheckCircle2,
  Brain,
  Eye,
  Layers
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Next-Generation AI-Driven Visibility Control
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Master Your Digital
              <br />
              <span className="text-primary-500">
                Reputation & Visibility
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Control your presence across traditional SEO and emerging AI search ecosystems.
              <span className="font-semibold text-gray-800"> Predict → Generate → Publish → Measure → Optimize</span>
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/dashboard"
                className="group px-8 py-4 bg-primary-500 text-white rounded-lg font-semibold text-lg hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/50 transition-all duration-300 flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="px-8 py-4 bg-white text-gray-700 rounded-lg font-semibold text-lg border-2 border-gray-200 hover:border-primary-500 hover:text-primary-600 transition-all duration-300"
              >
                Watch Demo
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { label: "Visibility Increase", value: "340%", icon: Eye },
              { label: "AI Search Coverage", value: "50+", icon: Brain },
              { label: "Auto-Generated Reports", value: "50+", icon: BarChart3 },
              { label: "Average ROI Boost", value: "8.5x", icon: TrendingUp },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                className="glass-effect p-6 rounded-2xl text-center"
              >
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary-600" />
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Complete GEO System
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to dominate search visibility across Google, GPT, Gemini, and beyond
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "AI Visibility Tracking",
                description: "Monitor your presence across GPT, Gemini, Perplexity, and all major AI search platforms in real-time.",
                color: "text-blue-600",
                bgColor: "bg-blue-100"
              },
              {
                icon: Brain,
                title: "Self-Learning GEO Core",
                description: "Continuous AI optimization that automatically adjusts content timing, keyword priority, and tone based on results.",
                color: "text-purple-600",
                bgColor: "bg-purple-100"
              },
              {
                icon: TrendingUp,
                title: "Keyword Forecast Engine",
                description: "Predictive AI shows ROI forecasts, ranking progress, and clear reasoning for every keyword recommendation.",
                color: "text-green-600",
                bgColor: "bg-green-100"
              },
              {
                icon: Layers,
                title: "Content Orchestrator",
                description: "Workflow engine with Preview, Audit, and Approval stages. Control where, when, and which version publishes.",
                color: "text-orange-600",
                bgColor: "bg-orange-100"
              },
              {
                icon: BarChart3,
                title: "50+ BI Reports",
                description: "Rich analytics suite with PDF/CSV exports, shareable links, and WhatsApp integration for client delivery.",
                color: "text-pink-600",
                bgColor: "bg-pink-100"
              },
              {
                icon: Zap,
                title: "AdSync Integration",
                description: "Links paid and organic visibility. Auto-adjusts budgets toward strong organic zones for maximum ROI.",
                color: "text-yellow-600",
                bgColor: "bg-yellow-100"
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-primary-500 hover:shadow-xl transition-all duration-300 bg-white"
              >
                <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How GeoRepute.ai Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A continuous optimization loop that drives measurable results
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              { step: "1", label: "Predict", icon: Brain, description: "AI forecasts optimal keywords & content strategy" },
              { step: "2", label: "Generate", icon: Sparkles, description: "Create humanized, strategic content" },
              { step: "3", label: "Publish", icon: Globe, description: "Orchestrate multi-platform distribution" },
              { step: "4", label: "Measure", icon: BarChart3, description: "Track rankings & AI visibility" },
              { step: "5", label: "Optimize", icon: TrendingUp, description: "Self-learning feedback loop" },
            ].map((phase, index) => (
              <motion.div
                key={phase.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="glass-effect p-6 rounded-2xl text-center h-full">
                  <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {phase.step}
                  </div>
                  <phase.icon className="w-8 h-8 mx-auto mb-3 text-primary-600" />
                  <h3 className="font-bold text-gray-900 mb-2">{phase.label}</h3>
                  <p className="text-sm text-gray-600">{phase.description}</p>
                </div>
                {index < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary-400 to-accent-400" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Leading Brands Choose GeoRepute.ai
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Natural Control",
                description: "Appears objective but acts strategic. Every output feels neutral and authentic while promoting your assets intelligently.",
                checks: ["Human-like content", "Objective appearance", "Strategic influence", "Trust-building UX"]
              },
              {
                title: "Measurable Results",
                description: "Real KPIs that matter. Track improvements in Google Top-10/Top-3 rankings and visibility in GPT/Gemini results.",
                checks: ["Live rankings", "AI search visibility", "ROI tracking", "Lead attribution"]
              },
              {
                title: "White-Label Ready",
                description: "Complete branding control. Custom domains, logos, colors, and client portals. Perfect for agencies.",
                checks: ["Custom branding", "Multi-tenant", "Client portals", "Billing automation"]
              },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-white to-gray-50"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600 mb-6">{benefit.description}</p>
                <ul className="space-y-3">
                  {benefit.checks.map((check) => (
                    <li key={check} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-500">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Dominate AI Search?
            </h2>
            <p className="text-xl text-white/90 mb-10">
              Join the next generation of visibility optimization. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="group px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:shadow-2xl transition-all duration-300 flex items-center gap-2 justify-center"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-white/10 backdrop-blur-lg text-white rounded-lg font-semibold text-lg border-2 border-white/30 hover:bg-white/20 transition-all duration-300"
              >
                Contact Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

