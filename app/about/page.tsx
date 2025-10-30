"use client";

import { motion } from "framer-motion";
import { Target, Users, Zap, Globe, Award, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function About() {
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
              Pioneering the Future of
              <span className="text-primary-500"> AI-Driven Visibility</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              GeoRepute.ai is revolutionizing how businesses control their digital presence 
              across traditional search engines and emerging AI ecosystems.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass-effect p-10 rounded-2xl"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                To empower businesses with intelligent, AI-driven tools that provide natural 
                control over their digital reputation and visibility. We believe in strategic 
                influence that appears objective, authentic, and human—never manipulative.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass-effect p-10 rounded-2xl"
            >
              <div className="w-16 h-16 bg-accent-100 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-accent-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                To become the global standard for Generative Engine Optimization (GEO), 
                creating a world where businesses of all sizes can compete fairly in 
                AI-driven search ecosystems through intelligent, ethical automation.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              The GeoRepute.ai Story
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="prose prose-lg max-w-none"
          >
            <div className="glass-effect p-10 rounded-2xl space-y-6 text-gray-600 leading-relaxed">
              <p className="text-lg">
                The digital landscape has evolved dramatically. While businesses spent years 
                mastering traditional SEO, a new frontier emerged: AI-powered search engines 
                like ChatGPT, Google Gemini, and Perplexity began reshaping how people discover 
                information and make decisions.
              </p>
              
              <p className="text-lg">
                We recognized that existing tools weren't designed for this new reality. 
                Businesses needed a comprehensive system that could predict, generate, publish, 
                measure, and optimize their presence across both traditional and AI-driven 
                search ecosystems—all while maintaining authenticity and trust.
              </p>
              
              <p className="text-lg">
                GeoRepute.ai was born from this insight. We assembled a team of AI researchers, 
                SEO experts, and digital strategists to create the world's first complete 
                Generative Engine Optimization (GEO) platform. Our system doesn't just react 
                to changes—it predicts them, adapts to them, and helps you stay ahead.
              </p>
              
              <p className="text-lg font-semibold text-gray-900">
                Today, we're proud to help businesses worldwide achieve unprecedented visibility, 
                control their reputation, and drive measurable ROI through intelligent automation 
                that feels completely natural and human.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
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
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Authenticity First",
                description: "Every output must feel genuine, human, and trustworthy. We believe in strategic influence, not manipulation.",
                color: "text-blue-600",
                bgColor: "bg-blue-100"
              },
              {
                icon: TrendingUp,
                title: "Results-Driven",
                description: "We measure success by real KPIs: rankings, visibility, leads, and ROI. Our platform delivers measurable outcomes.",
                color: "text-green-600",
                bgColor: "bg-green-100"
              },
              {
                icon: Globe,
                title: "Innovation Always",
                description: "The digital landscape changes rapidly. We stay ahead through continuous learning, adaptation, and cutting-edge AI.",
                color: "text-purple-600",
                bgColor: "bg-purple-100"
              },
              {
                icon: Award,
                title: "Excellence Standard",
                description: "Quality over quantity. We build comprehensive systems that work flawlessly rather than quick fixes.",
                color: "text-orange-600",
                bgColor: "bg-orange-100"
              },
              {
                icon: Target,
                title: "Client Success",
                description: "Your growth is our growth. We're committed to providing tools, support, and insights that drive real business results.",
                color: "text-pink-600",
                bgColor: "bg-pink-100"
              },
              {
                icon: Zap,
                title: "Ethical AI",
                description: "We harness AI's power responsibly, ensuring our systems enhance human decision-making rather than replace it.",
                color: "text-yellow-600",
                bgColor: "bg-yellow-100"
              },
            ].map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl border-2 border-gray-100 hover:border-primary-500 hover:shadow-xl transition-all duration-300 bg-white"
              >
                <div className={`w-14 h-14 ${value.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                  <value.icon className={`w-7 h-7 ${value.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 to-accent-600">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Impact by Numbers
            </h2>
            <p className="text-xl text-white/90">
              Real results from real businesses
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "10,000+", label: "Active Users" },
              { value: "340%", label: "Avg. Visibility Increase" },
              { value: "50+", label: "AI Platforms Tracked" },
              { value: "8.5x", label: "Average ROI" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-xl text-white/90">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

