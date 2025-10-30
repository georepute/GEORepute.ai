"use client";

import { motion } from "framer-motion";
import { 
  Brain, 
  TrendingUp, 
  Layers, 
  BarChart3, 
  Zap, 
  Video,
  Target,
  Globe,
  Users,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Systems() {
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
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Our
              <span className="text-primary-500"> Complete GEO System</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              An end-to-end platform for AI-driven visibility optimization. 
              Everything you need to dominate traditional and AI-powered search.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Systems */}
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
              Core Subsystems
            </h2>
            <p className="text-xl text-gray-600">
              Integrated modules working together in perfect harmony
            </p>
          </motion.div>

          <div className="space-y-20">
            {/* System 1: Split-View Dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                  <BarChart3 className="w-4 h-4" />
                  Real-Time Dashboard
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Split-View LIVE Dashboard
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Revolutionary dual-pane interface that shows AI/Google search results alongside 
                  your rankings and analytics in real-time. Watch your visibility change as it happens.
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    "Real-time search preview (right pane)",
                    "Live ranking graphs (left pane)",
                    "AI search engine integration",
                    "Instant KPI updates",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Try Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="glass-effect p-8 rounded-2xl">
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-accent-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-20 h-20 text-primary-600" />
                </div>
              </div>
            </motion.div>

            {/* System 2: AI Visibility Layer */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 md:order-1 glass-effect p-8 rounded-2xl">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                  <Brain className="w-20 h-20 text-purple-600" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                  <Brain className="w-4 h-4" />
                  AI Engine Tracking
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  AI Engine Visibility Layer
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Track and measure your visibility within GPT, Gemini, Perplexity, Claude, 
                  and 50+ other AI-driven search ecosystems. The future of search is here.
                </p>
                <ul className="space-y-3">
                  {[
                    "Multi-platform AI tracking",
                    "Citation & mention monitoring",
                    "Competitive AI visibility analysis",
                    "Automated response optimization",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* System 3: Self-Learning GEO Core */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
                  <Zap className="w-4 h-4" />
                  Intelligent Automation
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Self-Learning GEO Core
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Our AI engine continuously learns from real-world results, automatically 
                  adjusting content timing, keyword priority, and tone to maximize visibility.
                </p>
                <ul className="space-y-3">
                  {[
                    "Automatic strategy optimization",
                    "Pattern recognition & learning",
                    "Predictive performance modeling",
                    "Adaptive content scheduling",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-effect p-8 rounded-2xl">
                <div className="aspect-video bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-20 h-20 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* System 4: Content Orchestrator */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 md:order-1 glass-effect p-8 rounded-2xl">
                <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                  <Layers className="w-20 h-20 text-orange-600" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">
                  <Layers className="w-4 h-4" />
                  Content Management
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Content Orchestrator + Approvals
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Complete workflow engine defining rules for where, when, and which version 
                  of content publishes. Preview, audit, and approve before going live.
                </p>
                <ul className="space-y-3">
                  {[
                    "Multi-stage approval workflow",
                    "Version control & A/B testing",
                    "Platform-specific optimization",
                    "Scheduled publishing automation",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* System 5: Keyword Forecast */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium mb-4">
                  <Target className="w-4 h-4" />
                  Predictive Intelligence
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Keyword Forecast + Dynamic Action Plan
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  AI-powered predictive system showing keyword ROI forecasts, ranking progress, 
                  and clear reasoning for every recommendation—no guesswork.
                </p>
                <ul className="space-y-3">
                  {[
                    "ROI & ranking predictions",
                    "Competitive opportunity analysis",
                    "Dynamic priority scoring",
                    "Clear action recommendations",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-effect p-8 rounded-2xl">
                <div className="aspect-video bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-20 h-20 text-pink-600" />
                </div>
              </div>
            </motion.div>

            {/* System 6: Video Reports */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 md:order-1 glass-effect p-8 rounded-2xl">
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                  <Video className="w-20 h-20 text-blue-600" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                  <Video className="w-4 h-4" />
                  Auto-Generated Reports
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Video-Report Generation
                </h3>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  Automatically generated video summaries with AI narration and dynamic charts. 
                  Perfect for client presentations and stakeholder updates.
                </p>
                <ul className="space-y-3">
                  {[
                    "AI voice narration",
                    "Dynamic data visualization",
                    "White-label branding",
                    "One-click sharing",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Plus Much More
            </h2>
            <p className="text-xl text-gray-600">
              Additional features for complete visibility control
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "AdSync Integration",
                description: "Connects paid and organic visibility. Auto-adjusts budgets toward strong organic zones for maximum ROI."
              },
              {
                icon: Globe,
                title: "Reputation Core",
                description: "Captures leads, intent sources, sentiment analysis, and generates validation screenshots automatically."
              },
              {
                icon: BarChart3,
                title: "50+ Reports Library",
                description: "Comprehensive BI suite with PDF/CSV exports, share via link, email, or WhatsApp."
              },
              {
                icon: Users,
                title: "White-Label System",
                description: "Full user management, custom branding, agency tools, and billing automation."
              },
              {
                icon: Target,
                title: "Quote Builder",
                description: "Generate branded client proposals directly from system data and analytics."
              },
              {
                icon: Zap,
                title: "Multi-Platform Publishing",
                description: "Auto-publish to Reddit, Quora, Medium, GitHub, and 20+ knowledge sources."
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-effect p-8 rounded-2xl hover:shadow-xl transition-all duration-300"
              >
                <feature.icon className="w-12 h-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Experience the Complete System
            </h2>
            <p className="text-xl text-white/90 mb-10">
              See all features in action with a personalized demo
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:shadow-2xl transition-all"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

