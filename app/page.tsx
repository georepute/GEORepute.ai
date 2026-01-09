"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3, 
  Globe, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Brain,
  Eye,
  Layers,
  Menu,
  X,
  Twitter,
  Linkedin,
  Github,
  Mail
} from "lucide-react";
import { LanguageProvider, useLanguage } from "@/lib/language-context";
import LanguageToggle from "@/components/LanguageToggle";

// Landing page with integrated Navbar and Footer for language support
function LandingPageContent() {
  const { language, isRtl, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const featureIcons = [Target, Brain, TrendingUp, Layers, BarChart3, Zap];
  const featureColors = [
    { color: "text-blue-600", bgColor: "bg-blue-100" },
    { color: "text-purple-600", bgColor: "bg-purple-100" },
    { color: "text-green-600", bgColor: "bg-green-100" },
    { color: "text-orange-600", bgColor: "bg-orange-100" },
    { color: "text-pink-600", bgColor: "bg-pink-100" },
    { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  ];

  const stepIcons = [Brain, Sparkles, Globe, BarChart3, TrendingUp];

  const navLinks = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/systems", label: t.nav.systems },
    { href: "/pricing", label: t.nav.pricing },
    { href: "/contact", label: t.nav.contact },
    { href: "/privacy", label: t.nav.privacy },
  ];

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Github, href: "https://github.com", label: "GitHub" },
    { icon: Mail, href: "mailto:contact@georepute.ai", label: "Email" },
  ];

  const footerLinks = {
    [t.footer.product]: [
      { label: "Features", href: "/systems" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
      { label: "Documentation", href: "/docs" },
    ],
    [t.footer.company]: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
    [t.footer.resources]: [
      { label: "Help Center", href: "/help" },
      { label: "API Reference", href: "/api" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Community", href: "/community" },
    ],
    [t.footer.legal]: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Security", href: "/security" },
    ],
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-effect border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
                className="relative w-10 h-10"
              >
                <Image
                  src="/logo.png"
                  alt={`${t.nav.brandName} Logo`}
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>
              <span className="text-2xl font-bold text-primary-600">
                {t.nav.brandName}
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 hover:text-primary-600 font-medium transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <LanguageToggle />
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                {t.nav.signIn}
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/50 transition-all duration-300"
              >
                {t.nav.getStarted}
              </Link>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-white/20 bg-white/95 backdrop-blur-lg"
            >
              <div className="px-4 py-6 space-y-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-gray-700 hover:text-primary-600 font-medium py-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 space-y-3 border-t border-gray-200">
                  <div className="flex justify-center py-2">
                    <LanguageToggle />
                  </div>
                  <Link
                    href="/login"
                    className="block w-full px-4 py-2 text-center text-gray-700 hover:text-primary-600 font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t.nav.signIn}
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block w-full px-6 py-2 bg-primary-500 text-white rounded-lg font-semibold text-center hover:bg-primary-600 hover:shadow-lg transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t.nav.getStarted}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      
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
              {t.hero.badge}
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {t.hero.title1}
              <br />
              <span className="text-primary-500">
                {t.hero.title2}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              {t.hero.subtitle}
              <span className="font-semibold text-gray-800"> {t.hero.subtitleBold}</span>
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
                {t.hero.startTrial}
                <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="px-8 py-4 bg-white text-gray-700 rounded-lg font-semibold text-lg border-2 border-gray-200 hover:border-primary-500 hover:text-primary-600 transition-all duration-300"
              >
                {t.hero.watchDemo}
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
              { label: t.stats.visibilityIncrease, value: "340%", icon: Eye },
              { label: t.stats.aiSearchCoverage, value: "50+", icon: Brain },
              { label: t.stats.autoReports, value: "50+", icon: BarChart3 },
              { label: t.stats.roiBoost, value: "8.5x", icon: TrendingUp },
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
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.features.items.map((feature, index) => {
              const Icon = featureIcons[index];
              const colors = featureColors[index];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group p-8 rounded-2xl border-2 border-gray-100 hover:border-primary-500 hover:shadow-xl transition-all duration-300 bg-white"
                >
                  <div className={`w-14 h-14 ${colors.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 ${colors.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
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
              {t.howItWorks.title}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t.howItWorks.subtitle}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-6">
            {t.howItWorks.steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="glass-effect p-6 rounded-2xl text-center h-full">
                    <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                      {index + 1}
                    </div>
                    <Icon className="w-8 h-8 mx-auto mb-3 text-primary-600" />
                    <h3 className="font-bold text-gray-900 mb-2">{step.label}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  {index < 4 && (
                    <div className={`hidden md:block absolute top-1/2 ${isRtl ? '-left-3' : '-right-3'} w-6 h-0.5 bg-gradient-to-r from-primary-400 to-accent-400`} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits / Social Proof */}
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
              {t.benefits.title}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.benefits.items.map((benefit, index) => (
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
              {t.cta.title}
            </h2>
            <p className="text-xl text-white/90 mb-10">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="group px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:shadow-2xl transition-all duration-300 flex items-center gap-2 justify-center"
              >
                {t.cta.getStarted}
                <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 bg-white/10 backdrop-blur-lg text-white rounded-lg font-semibold text-lg border-2 border-white/30 hover:bg-white/20 transition-all duration-300"
              >
                {t.cta.contactSales}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="relative w-10 h-10">
                  <Image
                    src="/logo.png"
                    alt={`${t.nav.brandName} Logo`}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-bold text-white">
                  {t.nav.brandName}
                </span>
              </Link>
              <p className="text-gray-400 mb-6 max-w-xs">
                {t.footer.tagline}
              </p>
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 hover:bg-primary-600 rounded-lg flex items-center justify-center transition-colors duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-white font-semibold mb-4">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-primary-400 transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                {t.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
              </p>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Terms
                </Link>
                <Link href="/sitemap" className="text-gray-400 hover:text-primary-400 transition-colors">
                  Sitemap
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <LandingPageContent />
    </LanguageProvider>
  );
}
