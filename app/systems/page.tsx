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
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/language-context";

export default function Systems() {
  const { isRtl, t } = useLanguage();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  
  // Map system icons
  const systemIcons = [BarChart3, Brain, Zap, Layers, Target, Video];
  const systemColors = [
    { bg: "bg-blue-100", text: "text-blue-700", icon: "text-primary-600" },
    { bg: "bg-purple-100", text: "text-purple-700", icon: "text-purple-600" },
    { bg: "bg-green-100", text: "text-green-700", icon: "text-green-600" },
    { bg: "bg-orange-100", text: "text-orange-700", icon: "text-orange-600" },
    { bg: "bg-pink-100", text: "text-pink-700", icon: "text-pink-600" },
    { bg: "bg-blue-100", text: "text-blue-700", icon: "text-blue-600" },
  ];
  const systemGradients = [
    "from-primary-100 to-accent-100",
    "from-purple-100 to-pink-100",
    "from-green-100 to-blue-100",
    "from-orange-100 to-red-100",
    "from-pink-100 to-purple-100",
    "from-blue-100 to-cyan-100",
  ];

  // Additional features icons
  const additionalIcons = [TrendingUp, Globe, BarChart3, Users, Target, Zap];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100" dir={isRtl ? 'rtl' : 'ltr'}>
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
              {t.systems.hero.title1}
              <span className="text-primary-500"> {t.systems.hero.title2}</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              {t.systems.hero.subtitle}
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
              {t.systems.core.title}
            </h2>
            <p className="text-xl text-gray-600">
              {t.systems.core.subtitle}
            </p>
          </motion.div>

          <div className="space-y-20">
            {t.systems.core.systems.map((system, index) => {
              const Icon = systemIcons[index];
              const colors = systemColors[index];
              const gradient = systemGradients[index];
              const isEven = index % 2 === 0;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className={`grid md:grid-cols-2 gap-12 items-center ${!isEven ? (isRtl ? 'md:flex-row-reverse' : '') : ''}`}
                >
                  <div className={!isEven ? (isRtl ? 'order-2 md:order-1' : 'order-2 md:order-2') : ''}>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${colors.bg} ${colors.text} rounded-full text-sm font-medium mb-4`}>
                      <Icon className="w-4 h-4" />
                      {system.badge}
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {system.title}
                    </h3>
                    <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                      {system.description}
                    </p>
                    <ul className="space-y-3 mb-6">
                      {system.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-center gap-3 text-gray-700 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <CheckCircle2 className={`w-5 h-5 text-green-500 flex-shrink-0 ${isRtl ? 'order-last' : ''}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {system.cta && (
                      <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                      >
                        {system.cta}
                        <ArrowIcon className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                  <div className={`glass-effect p-8 rounded-2xl ${!isEven ? (isRtl ? 'order-1 md:order-2' : 'order-1 md:order-1') : ''}`}>
                    <div className={`aspect-video bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-20 h-20 ${colors.icon}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
              {t.systems.additional.title}
            </h2>
            <p className="text-xl text-gray-600">
              {t.systems.additional.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.systems.additional.items.map((feature, index) => {
              const Icon = additionalIcons[index];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="glass-effect p-8 rounded-2xl hover:shadow-xl transition-all duration-300"
                >
                  <Icon className="w-12 h-12 text-primary-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
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
              {t.systems.cta.title}
            </h2>
            <p className="text-xl text-white/90 mb-10">
              {t.systems.cta.subtitle}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:shadow-2xl transition-all"
            >
              {t.systems.cta.button}
              <ArrowIcon className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
