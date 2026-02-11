"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Settings,
  Users,
  BarChart3,
  Target,
  Layers,
  Video,
  Menu,
  X,
  LogOut,
  Bell,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Lightbulb,
  Shield,
  Zap,
  Globe,
  Brain,
  Server,
  Package,
  Map,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { filterNavigationByRole, NavigationItem } from "@/lib/permissions/permissions";
import { useLanguage } from "@/lib/language-context";
import LanguageToggle from "@/components/LanguageToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isRtl, t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([t.dashboard.sidebar.analytics]); // Track expanded parent items
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { role, capabilities, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const name = user.user_metadata?.full_name || user.email;
    return name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const allNavigation: NavigationItem[] = [
    { name: t.dashboard.sidebar.domainManagement, href: "/dashboard/domains", icon: Server, requiredCapability: "canManageSettings" },
    { name: t.dashboard.sidebar.aiVisibility, href: "/dashboard/ai-visibility", icon: Globe, requiredCapability: "canViewAIVisibility" },
    { name: t.dashboard.sidebar.actionPlans, href: "/dashboard/action-plans", icon: Lightbulb, requiredCapability: "canViewReports" },
    { 
      name: t.dashboard.sidebar.contentGenerator, 
      icon: Sparkles, 
      requiredCapability: "canManageContent",
      children: [
        { name: t.dashboard.sidebar.newContent, href: "/dashboard/content-generator", icon: Sparkles, requiredCapability: "canManageContent" },
        { name: t.dashboard.sidebar.missedPrompts, href: "/dashboard/missed-prompts", icon: FileText, requiredCapability: "canManageContent" },
        { name: t.dashboard.sidebar.blog, href: "/dashboard/blog", icon: Globe, requiredCapability: "canManageContent" },
      ]
    },
    { name: t.dashboard.sidebar.publication, href: "/dashboard/content", icon: Layers, requiredCapability: "canManageContent" },
    { name: t.dashboard.sidebar.keywordForecast, href: "/dashboard/keyword-forecast", icon: TrendingUp, requiredCapability: "canManageKeywords" },
    // { name: t.dashboard.sidebar.adSync, href: "/dashboard/ad-sync", icon: Zap, requiredCapability: "canViewAnalytics" },
    // { name: t.dashboard.sidebar.keywords, href: "/dashboard/keywords", icon: Target, requiredCapability: "canManageKeywords" },
    // { name: t.dashboard.sidebar.rankings, href: "/dashboard/rankings", icon: TrendingUp, requiredCapability: "canViewRankings" },
    // // { name: t.dashboard.sidebar.reputation, href: "/dashboard/reputation", icon: Shield, requiredCapability: "canViewReports" },
    // { name: t.dashboard.sidebar.leads, href: "/dashboard/leads", icon: Users, requiredCapability: "canViewAnalytics" },
    { 
      name: t.dashboard.sidebar.assetsHub, 
      icon: Package, 
      requiredCapability: "canViewAnalytics",
      children: [
        { name: t.dashboard.sidebar.googleSearchConsole, href: "/dashboard/google-search-console", icon: Search, requiredCapability: "canViewAnalytics" },
        { name: t.dashboard.sidebar.googleMaps, href: "/dashboard/google-maps", icon: Map, requiredCapability: "canViewAnalytics" },
      ]
    },
    { 
      name: t.dashboard.sidebar.analytics, 
      icon: BarChart3, 
      requiredCapability: "canViewAnalytics",
      children: [
        { name: "Keyword Forecast Analytics", href: "/dashboard/analytics", icon: TrendingUp, requiredCapability: "canViewAnalytics" },
        { name: t.dashboard.sidebar.gscAnalytics, href: "/dashboard/gsc-analytics", icon: Search, requiredCapability: "canViewAnalytics" },
        { name: t.dashboard.sidebar.biReports, href: "/dashboard/reports", icon: FileText, requiredCapability: "canViewReports" },
      ]
    },
    { 
      name: "Global Reports", 
      icon: Globe, 
      requiredCapability: "canViewReports",
      children: [
        { name: "Regional Strength Comparison", href: "/dashboard/regional-strength-comparison", icon: Map, requiredCapability: "canViewReports" },
      ]
    },
    // { name: t.dashboard.sidebar.learning, href: "/dashboard/learning", icon: Brain, requiredCapability: "canViewAnalytics" },
    // { name: t.dashboard.sidebar.videoReports, href: "/dashboard/video-reports", icon: Video, requiredCapability: "canAccessVideoReports" },
    // { name: t.dashboard.sidebar.quoteBuilder, href: "/dashboard/quote-builder", icon: FileText, requiredCapability: "canBuildQuotes" },
    { name: t.dashboard.sidebar.team, href: "/dashboard/team", icon: Users, requiredCapability: "canManageTeam" },
    { name: t.dashboard.sidebar.settings, href: "/dashboard/settings", icon: Settings, requiredCapability: "canManageSettings" },
  ];

  const navigation = filterNavigationByRole(role, allNavigation);

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-50 bg-white border-gray-200 transform transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        } ${
          sidebarOpen 
            ? `${isRtl ? '-translate-x-0' : 'translate-x-0'} w-64` 
            : `${isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}`
        }`}
      >
        <div className="h-full flex flex-col relative">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="GeoRepute.ai Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold text-primary-600 whitespace-nowrap">
                  GeoRepute.ai
                </span>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  {item.children ? (
                    // Parent item with children
                    <div>
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                          sidebarCollapsed ? "justify-center" : ""
                        }`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="font-medium flex-1 text-left">{item.name}</span>
                            {expandedItems.includes(item.name) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </>
                        )}
                      </button>
                      {/* Child items */}
                      {!sidebarCollapsed && expandedItems.includes(item.name) && (
                        <ul className="mt-1 ml-4 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.name}>
                              <Link
                                href={child.href || '#'}
                                className="flex items-center gap-3 px-3 py-2 text-gray-600 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors text-sm"
                              >
                                <child.icon className="w-4 h-4 flex-shrink-0" />
                                <span>{child.name}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    // Regular item without children
                    <Link
                      href={item.href || '#'}
                      className={`flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                        sidebarCollapsed ? "justify-center" : ""
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="font-medium">{item.name}</span>}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Sidebar Toggle Button - Desktop Only */}
          <div className={`hidden lg:block absolute top-1/2 ${isRtl ? '-left-3' : '-right-3'} z-50`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`flex items-center justify-center w-6 h-12 bg-white border border-gray-200 ${isRtl ? 'rounded-l-lg' : 'rounded-r-lg'} shadow-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-200 transition-all group`}
              title={sidebarCollapsed ? t.dashboard.sidebar.expandSidebar : t.dashboard.sidebar.collapseSidebar}
            >
              {sidebarCollapsed ? (
                isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              ) : (
                isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            {!loading && user && (
              <>
                <Link 
                  href="/dashboard/settings" 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer ${
                    sidebarCollapsed ? "justify-center" : ""
                  }`}
                  title={sidebarCollapsed ? user.user_metadata?.full_name || "User" : undefined}
                >
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {getUserInitials()}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.user_metadata?.full_name || "User"}
                        </p>
                        {role && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            role === 'admin' ? 'bg-red-100 text-red-700' :
                            role === 'agency' ? 'bg-accent-100 text-accent-700' :
                            'bg-secondary-100 text-secondary-700'
                          }`}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  )}
                </Link>
                {!sidebarCollapsed && (
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t.dashboard.sidebar.signOut}</span>
                  </button>
                )}
                {sidebarCollapsed && (
                  <button
                    onClick={handleLogout}
                    className="mt-2 w-full flex items-center justify-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    title={t.dashboard.sidebar.signOut}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {!loading && !user && (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {!sidebarCollapsed && t.dashboard.sidebar.signIn}
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-200 ease-in-out ${
        isRtl 
          ? (sidebarCollapsed ? "lg:pr-20" : "lg:pr-64")
          : (sidebarCollapsed ? "lg:pl-20" : "lg:pl-64")
      }`}>
        {/* Top Navigation */}
        <header className={`h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-0 z-30 transition-all duration-200 ease-in-out ${
          isRtl 
            ? (sidebarCollapsed ? "lg:right-20" : "lg:right-64")
            : (sidebarCollapsed ? "lg:left-20" : "lg:left-64")
        }`}>
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="hidden sm:block">
                <div className="relative">
                  <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
                  <input
                    type="text"
                    placeholder={t.dashboard.header.search}
                    className={`${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 w-64 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <LanguageToggle />
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title={t.dashboard.header.notifications}>
                <Bell className="w-5 h-5" />
                <span className={`absolute top-1 ${isRtl ? 'left-1' : 'right-1'} w-2 h-2 bg-red-500 rounded-full`}></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}

