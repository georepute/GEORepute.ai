"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Lock,
  CreditCard,
  Zap,
  Save,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  Loader,
  XCircle,
  MessageSquare,
  FileText,
  HelpCircle,
  Linkedin
} from "lucide-react";
import toast from "react-hot-toast";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "white-label", label: "White Label", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "integrations", label: "Integrations", icon: Zap },
    { id: "security", label: "Security", icon: Lock },
    { id: "billing", label: "Billing", icon: CreditCard },
  ];

  // Check for OAuth callback and auto-switch to integrations tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCallback = urlParams.get("facebook") || 
                        urlParams.get("instagram") || 
                        urlParams.get("linkedin") ||
                        urlParams.get("github") ||
                        urlParams.get("reddit") ||
                        urlParams.get("medium") ||
                        urlParams.get("quora");
    
    // If any integration callback detected, switch to integrations tab
    if (hasCallback) {
      setActiveTab("integrations");
    }
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-4 border border-gray-200 sticky top-24">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary-50 text-primary-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl p-8 border border-gray-200"
          >
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
                
                {/* Avatar Upload */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      JD
                    </div>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload New
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        defaultValue="John"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Doe"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="john@company.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      defaultValue="GeoRepute Inc"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      rows={4}
                      defaultValue="Digital marketing specialist focused on AI-driven visibility optimization."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* White Label Tab */}
            {activeTab === "white-label" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">White Label Configuration</h2>
                <p className="text-gray-600 mb-6">Customize branding for your agency</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue="GeoRepute"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      placeholder="dashboard.yourcompany.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Configure your DNS to point to our servers
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Upload Logo
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          defaultValue="#0ea5e9"
                          className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue="#0ea5e9"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          defaultValue="#d946ef"
                          className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue="#d946ef"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom CSS (Advanced)
                    </label>
                    <textarea
                      rows={6}
                      placeholder="/* Add your custom CSS here */"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  {[
                    { label: "Email Notifications", description: "Receive email updates about your account activity" },
                    { label: "Weekly Reports", description: "Get weekly performance summaries via email" },
                    { label: "Ranking Alerts", description: "Alert me when keywords move up or down significantly" },
                    { label: "Content Approvals", description: "Notify me when content needs approval" },
                    { label: "Team Activity", description: "Updates when team members take action" },
                    { label: "Billing Notifications", description: "Reminders about payments and invoices" },
                  ].map((notification) => (
                    <div key={notification.label} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">{notification.label}</h3>
                        <p className="text-sm text-gray-600">{notification.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <GitHubIntegrationSettings />
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">2FA Status</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        Enable 2FA
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="font-semibold text-gray-900 mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      {[
                        { device: "MacBook Pro", location: "San Francisco, CA", time: "Active now" },
                        { device: "iPhone 14", location: "San Francisco, CA", time: "2 hours ago" },
                      ].map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{session.device}</p>
                            <p className="text-sm text-gray-600">{session.location} • {session.time}</p>
                          </div>
                          <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
                
                {/* Current Plan */}
                <div className="p-6 bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg border border-primary-200 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Professional Plan</h3>
                      <p className="text-gray-600">$299/month • Renews on Nov 20, 2024</p>
                    </div>
                    <button className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:shadow-lg transition-all">
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white font-bold text-xs">
                        VISA
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-600">Expires 12/2025</p>
                      </div>
                    </div>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      Update
                    </button>
                  </div>
                </div>

                {/* Billing History */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Billing History</h3>
                  <div className="space-y-3">
                    {[
                      { date: "Oct 20, 2024", amount: "$299.00", status: "Paid" },
                      { date: "Sep 20, 2024", amount: "$299.00", status: "Paid" },
                      { date: "Aug 20, 2024", amount: "$299.00", status: "Paid" },
                    ].map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{invoice.date}</p>
                            <p className="text-sm text-gray-600">{invoice.amount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {invoice.status}
                          </span>
                          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
              {saved && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Changes saved successfully!</span>
                </div>
              )}
              <div className={`flex items-center gap-3 ${saved ? "" : "ml-auto"}`}>
                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Reddit Integration Component
function RedditIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    clientId: "",
    clientSecret: "",
    accessToken: "",
    username: "",
  });
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadRedditConfig();
  }, []);

  const loadRedditConfig = async () => {
    try {
      const response = await fetch("/api/integrations/reddit");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            clientId: data.config.clientId || "",
            clientSecret: data.config.clientSecret || "",
            accessToken: data.config.accessToken || "",
            username: data.config.username || "",
          });
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Reddit config:", error);
      setIsConnected(false);
    }
  };

  const handleSave = async () => {
    if (!config.clientId || !config.clientSecret || !config.accessToken) {
      toast.error("Please enter Client ID, Client Secret, and Access Token");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/reddit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          accessToken: config.accessToken,
          username: config.username || undefined,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Reddit configuration saved!");
        setIsConnected(true);
        // Clear form fields after successful save
        setConfig({ clientId: "", clientSecret: "", accessToken: "", username: "" });
        // Reload config to show updated data
        await loadRedditConfig();
      } else {
        const errorMsg = data.error || "Failed to save configuration";
        const details = data.details ? ` (${data.details.message || data.details.code || ""})` : "";
        console.error("Save error:", data);
        toast.error(errorMsg + details);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Reddit integration? This will remove your API credentials.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/reddit", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Reddit integration disconnected");
        setIsConnected(false);
        setConfig({ clientId: "", clientSecret: "", accessToken: "", username: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/reddit-icon.svg" alt="Reddit" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Reddit Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content as Reddit posts
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {/* Show form fields only when not connected */}
      {!isConnected ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client ID *
            </label>
            <div className="relative">
              <input
                type={showClientId ? "text" : "password"}
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="Your Reddit App Client ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12"
              />
              <button
                onClick={() => setShowClientId(!showClientId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showClientId ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Secret *
            </label>
            <div className="relative">
              <input
                type={showClientSecret ? "text" : "password"}
                value={config.clientSecret}
                onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                placeholder="Your Reddit App Client Secret"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12"
              />
              <button
                onClick={() => setShowClientSecret(!showClientSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showClientSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token *
            </label>
            <div className="relative">
              <input
                type={showAccessToken ? "text" : "password"}
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                placeholder="Your Reddit OAuth Access Token"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12"
              />
              <button
                onClick={() => setShowAccessToken(!showAccessToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Note: Access tokens expire after ~1 hour. You'll need to get a new token periodically.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username (Optional)
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              placeholder="Your Reddit username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
          </div>

          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900 mb-2">
              <strong>How to get Reddit API credentials:</strong>
            </p>
            <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
              <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">Reddit Apps</a></li>
              <li>Scroll down and click <strong>"create another app"</strong> or <strong>"create app"</strong></li>
              <li>Fill in the form:
                <ul className="list-disc ml-4 mt-1">
                  <li><strong>Name:</strong> GeoRepute Auto-Publish (or any name)</li>
                  <li><strong>App type:</strong> Select "script"</li>
                  <li><strong>Description:</strong> Auto-publish content to Reddit</li>
                  <li><strong>About URL:</strong> (optional, can leave blank)</li>
                  <li><strong>Redirect URI:</strong> <code className="bg-blue-100 px-1 rounded">http://localhost:8080</code></li>
                </ul>
              </li>
              <li>Click <strong>"create app"</strong></li>
              <li>After creation, you'll see:
                <ul className="list-disc ml-4 mt-1">
                  <li><strong>Client ID:</strong> The string under "personal use script" (copy this)</li>
                  <li><strong>Client Secret:</strong> The "secret" field (copy this)</li>
                </ul>
              </li>
              <li>To get an <strong>Access Token</strong>:
                <ul className="list-disc ml-4 mt-1">
                  <li>Use a tool like <a href="https://not-an-aardvark.github.io/reddit-oauth-helper/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Reddit OAuth Helper</a></li>
                  <li>Enter your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                  <li>Select the scopes below</li>
                  <li>Click "Get Token" and copy the <strong>access_token</strong> (starts with "eyJ...")</li>
                  <li><strong>Note:</strong> Access tokens expire after ~1 hour, so you'll need to get a new one periodically</li>
                </ul>
              </li>
              <li>When generating the access token, select these <strong>OAuth scopes</strong>:
                <ul className="list-disc ml-4 mt-1">
                  <li><code className="bg-blue-100 px-1 rounded">submit</code> - Submit posts to subreddits</li>
                  <li><code className="bg-blue-100 px-1 rounded">identity</code> - Get your username</li>
                  <li><code className="bg-blue-100 px-1 rounded">read</code> - Access Reddit content</li>
                </ul>
              </li>
              <li>Paste the credentials above and save</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={loading || !config.clientId || !config.clientSecret || !config.accessToken}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Show disconnect button when connected */
        <div className="pt-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// GitHub Integration Component
function GitHubIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    token: "",
    repository: "", // Format: "owner/repo"
  });
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadGitHubConfig();
  }, []);

  const loadGitHubConfig = async () => {
    try {
      const response = await fetch("/api/integrations/github");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          const owner = data.config.owner || "";
          const repo = data.config.repo || "";
          const repository = owner && repo ? `${owner}/${repo}` : "";
          
          setConfig({
            token: data.config.token || "",
            repository: repository,
          });
          setIsConnected(data.config.verified || false);
        } else {
          // No config found
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading GitHub config:", error);
      setIsConnected(false);
    }
  };


  const handleSave = async () => {
    if (!config.token || !config.repository) {
      toast.error("Please enter API key and repository name");
      return;
    }

    // Parse repository name (format: "owner/repo")
    const [owner, repo] = config.repository.split("/").map(s => s.trim());
    if (!owner || !repo) {
      toast.error("Repository name must be in format: owner/repo (e.g., georepute/my-blog)");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: config.token,
          owner: owner,
          repo: repo,
          branch: "main", // Default branch
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("GitHub configuration saved!");
        setIsConnected(true);
        // Clear form fields after successful save
        setConfig({ token: "", repository: "" });
        // Reload config to show updated data
        await loadGitHubConfig();
      } else {
        const errorMsg = data.error || "Failed to save configuration";
        const details = data.details ? ` (${data.details.message || data.details.code || ""})` : "";
        console.error("Save error:", data);
        toast.error(errorMsg + details);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect GitHub integration? This will remove your API key and repository configuration.")) {
      return;
    }

    setLoading(true);
    try {
      // Delete the integration from database
      const response = await fetch("/api/integrations/github", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("GitHub integration disconnected");
        setIsConnected(false);
        setConfig({ token: "", repository: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h2>
      
      {/* GitHub Integration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Image src="/github-142.svg" alt="GitHub" width={48} height={48} className="w-12 h-12" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">GitHub Auto-Publishing</h3>
            <p className="text-sm text-gray-600">
              Automatically publish content as GitHub Discussions
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isConnected 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-700"
          }`}>
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {/* Show form fields only when not connected */}
        {!isConnected ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Personal Access Token *
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={config.token}
                  onChange={(e) => setConfig({ ...config, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-900 mb-2">
                  <strong>How to generate API key:</strong>
                </p>
                <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">GitHub Personal Access Tokens</a></li>
                  <li>Click <strong>"Generate new token"</strong> → <strong>"Generate new token (classic)"</strong></li>
                  <li>Give it a name (e.g., "GeoRepute Auto-Publish")</li>
                  <li>Select expiration (30 days, 90 days, or no expiration)</li>
                  <li>Check permissions: <code className="bg-blue-100 px-1 rounded">repo</code> (Discussions API uses repo scope)</li>
                  <li>Click <strong>"Generate token"</strong> at the bottom</li>
                  <li>Copy the token (starts with <code className="bg-blue-100 px-1 rounded">ghp_</code>) and paste it above</li>
                  <li className="mt-2"><strong>Important:</strong> Make sure Discussions are enabled in your repository settings (Settings → General → Features → Discussions)</li>
                </ol>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository Name *
              </label>
              <input
                type="text"
                value={config.repository}
                onChange={(e) => setConfig({ ...config, repository: e.target.value })}
                placeholder="georepute/my-blog"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: <code className="bg-gray-100 px-1 rounded">owner/repository-name</code> (e.g., georepute/my-blog)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={loading || !config.token || !config.repository}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Show disconnect button when connected */
          <div className="pt-4">
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Disconnect
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Reddit Integration */}
      <RedditIntegrationSettings />

      {/* Medium Integration */}
      <MediumIntegrationSettings />

      {/* Quora Integration */}
      <QuoraIntegrationSettings />

      {/* Facebook Integration */}
      <FacebookIntegrationSettings />

      {/* LinkedIn Integration */}
      <LinkedInIntegrationSettings />

      {/* Instagram Integration */}
      <InstagramIntegrationSettings />
    </div>
  );
}

// Medium Integration Component
function MediumIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email: "",
    password: "",
    useCookies: false,
    cookies: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadMediumConfig();
  }, []);

  const loadMediumConfig = async () => {
    try {
      const response = await fetch("/api/integrations/medium");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            email: data.config.email || "",
            password: "",
            useCookies: !!data.config.cookies,
            cookies: data.config.cookies ? "***" : "",
          });
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Medium config:", error);
      setIsConnected(false);
    }
  };

  const handleSave = async () => {
    if (config.useCookies) {
      if (!config.cookies || config.cookies === "***") {
        toast.error("Please enter cookies or switch to email/password");
        return;
      }
      
      // Validate cookies JSON format
      try {
        const parsedCookies = JSON.parse(config.cookies);
        if (!Array.isArray(parsedCookies)) {
          toast.error("Cookies must be a JSON array. Example: [{\"name\": \"sid\", \"value\": \"...\", \"domain\": \".medium.com\"}]");
          return;
        }
        if (parsedCookies.length === 0) {
          toast.error("Cookies array is empty. Please add at least one cookie.");
          return;
        }
        // Validate each cookie has required fields
        for (const cookie of parsedCookies) {
          if (!cookie.name || !cookie.value) {
            toast.error(`Cookie is missing required fields (name or value): ${JSON.stringify(cookie)}`);
            return;
          }
        }
      } catch (parseError: any) {
        toast.error(`Invalid JSON format for cookies: ${parseError.message}`);
        return;
      }
    } else {
      if (!config.email || !config.password) {
        toast.error("Please enter email and password");
        return;
      }
    }

    setLoading(true);
    try {
      let cookiesToSend = undefined;
      if (config.useCookies) {
        try {
          cookiesToSend = JSON.parse(config.cookies);
          console.log("🍪 Sending cookies:", cookiesToSend.length, "cookies");
        } catch (parseError: any) {
          toast.error(`Failed to parse cookies JSON: ${parseError.message}`);
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch("/api/integrations/medium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email || "", // Email is still required for identification
          password: config.useCookies ? undefined : config.password,
          cookies: cookiesToSend,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Medium configuration saved!");
        setIsConnected(true);
        setConfig({ email: "", password: "", useCookies: false, cookies: "" });
        await loadMediumConfig();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Medium integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/medium", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Medium integration disconnected");
        setIsConnected(false);
        setConfig({ email: "", password: "", useCookies: false, cookies: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/medium-square.svg" alt="Medium" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Medium Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to Medium using Selenium
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-900">
              <strong>⚠️ Note:</strong> Medium doesn't provide an official API. We use browser automation (Selenium) to publish content. 
              This requires your login credentials or session cookies.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="useCookies"
              checked={config.useCookies}
              onChange={(e) => setConfig({ ...config, useCookies: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="useCookies" className="text-sm text-gray-700">
              Use session cookies instead of password (recommended)
            </label>
          </div>

          {config.useCookies ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Cookies (JSON) *
              </label>
              <textarea
                value={config.cookies}
                onChange={(e) => setConfig({ ...config, cookies: e.target.value })}
                placeholder='[{"name": "session", "value": "...", "domain": ".medium.com"}]'
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Extract cookies from your browser after logging into Medium. Use browser DevTools → Application → Cookies.
                <a href="/docs/HOW_TO_GET_SESSION_COOKIES.md" target="_blank" className="text-primary-600 hover:underline ml-1">
                  View detailed guide →
                </a>
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="Your Medium password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || (config.useCookies ? !config.cookies : (!config.email || !config.password))}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Quora Integration Component
function QuoraIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email: "",
    password: "",
    useCookies: false,
    cookies: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadQuoraConfig();
  }, []);

  const loadQuoraConfig = async () => {
    try {
      const response = await fetch("/api/integrations/quora");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            email: data.config.email || "",
            password: "",
            useCookies: !!data.config.cookies,
            cookies: data.config.cookies ? "***" : "",
          });
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Quora config:", error);
      setIsConnected(false);
    }
  };

  const handleSave = async () => {
    if (config.useCookies) {
      if (!config.cookies || config.cookies === "***") {
        toast.error("Please enter cookies or switch to email/password");
        return;
      }
    } else {
      if (!config.email || !config.password) {
        toast.error("Please enter email and password");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/quora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email,
          password: config.useCookies ? undefined : config.password,
          cookies: config.useCookies ? JSON.parse(config.cookies) : undefined,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Quora configuration saved!");
        setIsConnected(true);
        setConfig({ email: "", password: "", useCookies: false, cookies: "" });
        await loadQuoraConfig();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Quora integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/quora", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Quora integration disconnected");
        setIsConnected(false);
        setConfig({ email: "", password: "", useCookies: false, cookies: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/quora.svg" alt="Quora" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Quora Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to Quora using Selenium
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-900">
              <strong>⚠️ Note:</strong> Quora doesn't provide an official API. We use browser automation (Selenium) to publish content. 
              This requires your login credentials or session cookies.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="useCookiesQuora"
              checked={config.useCookies}
              onChange={(e) => setConfig({ ...config, useCookies: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="useCookiesQuora" className="text-sm text-gray-700">
              Use session cookies instead of password (recommended)
            </label>
          </div>

          {config.useCookies ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Cookies (JSON) *
              </label>
              <textarea
                value={config.cookies}
                onChange={(e) => setConfig({ ...config, cookies: e.target.value })}
                placeholder='[{"name": "session", "value": "...", "domain": ".quora.com"}]'
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Extract cookies from your browser after logging into Quora. Use browser DevTools → Application → Cookies.
                <a href="/docs/HOW_TO_GET_SESSION_COOKIES.md" target="_blank" className="text-primary-600 hover:underline ml-1">
                  View detailed guide →
                </a>
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="Your Quora password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || (config.useCookies ? !config.cookies : (!config.email || !config.password))}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}


// LinkedIn Integration Component
function LinkedInIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [fullName, setFullName] = useState("");
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    loadLinkedInConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const linkedinStatus = urlParams.get("linkedin");
    
    if (linkedinStatus === "connected") {
      const name = urlParams.get("name");
      toast.success(`LinkedIn connected successfully!${name ? ` Connected as: ${name}` : ""}`);
      // Reload config
      loadLinkedInConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (linkedinStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`LinkedIn connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadLinkedInConfig = async () => {
    try {
      const response = await fetch("/api/integrations/linkedin");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setFullName(data.config.fullName || "");
          setIsConnected(data.config.verified || false);
          setDaysUntilExpiration(data.config.daysUntilExpiration);
          setIsExpiringSoon(data.config.isExpiringSoon || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading LinkedIn config:", error);
      setIsConnected(false);
    }
  };

  const handleConnectLinkedIn = () => {
    // Get LinkedIn Client ID from environment
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/linkedin/callback`;
    const scope = "openid profile w_member_social";
    const state = Date.now().toString(); // Simple state for CSRF protection
    
    if (!clientId) {
      toast.error("LinkedIn Client ID not configured. Please contact support.");
      return;
    }
    
    // Redirect to LinkedIn OAuth
    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = linkedInAuthUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect LinkedIn integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/linkedin", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("LinkedIn integration disconnected");
        setIsConnected(false);
        setFullName("");
        setDaysUntilExpiration(null);
        setIsExpiringSoon(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="linkedin-integration" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/linkedin.svg" alt="LinkedIn" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">LinkedIn Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to your LinkedIn profile
            {fullName && isConnected && ` - ${fullName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>ℹ️ Note:</strong> Connect your LinkedIn account to automatically publish content to your LinkedIn profile. Posts will appear on your personal LinkedIn feed.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Image src="/linkedin.svg" alt="LinkedIn" width={64} height={64} className="w-16 h-16 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Connect with LinkedIn
            </h4>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
              Click the button below to securely connect your LinkedIn account. 
              We'll request permission to post on your behalf.
            </p>
            <button
              onClick={handleConnectLinkedIn}
              disabled={loading}
              className="px-8 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Image src="/linkedin.svg" alt="LinkedIn" width={20} height={20} className="w-5 h-5" />
                  Connect LinkedIn
                </>
              )}
            </button>
            <p className="mt-4 text-xs text-gray-500 text-center max-w-md">
              Your access token will be valid for 60 days. You'll be notified when it's time to reconnect.
            </p>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> {fullName || "LinkedIn Profile"}
            </p>
            {daysUntilExpiration !== null && (
              <p className="text-xs text-green-700 mt-1">
                Token expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
                {isExpiringSoon && (
                  <span className="ml-2 text-orange-600 font-semibold">
                    ⚠️ Expiring soon - please reconnect
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Instagram Integration Component
function InstagramIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [pageName, setPageName] = useState("");
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    loadInstagramConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const instagramStatus = urlParams.get("instagram");
    
    if (instagramStatus === "connected") {
      const username = urlParams.get("username");
      toast.success(`Instagram connected successfully!${username ? ` Connected as: @${username}` : ""}`);
      // Reload config
      loadInstagramConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (instagramStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`Instagram connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadInstagramConfig = async () => {
    try {
      const response = await fetch("/api/integrations/instagram");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setUsername(data.config.username || "");
          setPageName(data.config.pageName || "");
          setIsConnected(data.config.verified || false);
          setDaysUntilExpiration(data.config.daysUntilExpiration);
          setIsExpiringSoon(data.config.isExpiringSoon || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Instagram config:", error);
      setIsConnected(false);
    }
  };

  const handleConnectInstagram = () => {
    // Get Facebook App ID from environment (Instagram uses Facebook OAuth)
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/instagram/callback`;
    // Request permissions for Instagram and Pages (pages_manage_posts needed for Instagram Business Account access)
    // business_management: Access to Business Portfolio Pages (Meta Business Suite)
    // NOTE: Using instagram_basic for Development (no App Review needed)
    //       Switch to instagram_business_basic for Production (requires App Review)
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management";
    
    if (!appId) {
      toast.error("Facebook App ID not configured. Please contact support.");
      return;
    }
    
    // Redirect to Facebook OAuth (Instagram uses Facebook OAuth)
    const instagramAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${Date.now()}`; // Simple state for CSRF protection
    
    window.location.href = instagramAuthUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Instagram integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/instagram", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Instagram integration disconnected");
        setIsConnected(false);
        setUsername("");
        setPageName("");
        setDaysUntilExpiration(null);
        setIsExpiringSoon(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="instagram-integration" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Instagram Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to your Instagram Business account
            {username && isConnected && ` - @${username}`}
            {pageName && isConnected && ` (via ${pageName})`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-900">
              <strong>ℹ️ Note:</strong> Connect your Instagram Business account to automatically publish content. 
              Your Instagram account must be a Business account and connected to a Facebook Page.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={64} height={64} className="w-16 h-16 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Connect with Instagram
            </h4>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
              Click the button below to securely connect your Instagram Business account. 
              We'll automatically detect your Instagram account connected to your Facebook Page.
            </p>
            <button
              onClick={handleConnectInstagram}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={20} height={20} className="w-5 h-5" />
                  Connect Instagram
                </>
              )}
            </button>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md">
              <p className="text-xs text-yellow-900">
                <strong>⚠️ Requirements:</strong>
              </p>
              <ul className="text-xs text-yellow-800 mt-1 list-disc list-inside space-y-1">
                <li>Instagram Business account (not personal)</li>
                <li>Connected to a Facebook Page</li>
                <li>Admin access to the Facebook Page</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> @{username || "Instagram Business Account"}
              {pageName && ` via ${pageName}`}
            </p>
            {daysUntilExpiration !== null && (
              <p className="text-xs text-green-700 mt-1">
                Token expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
                {isExpiringSoon && (
                  <span className="ml-2 text-orange-600 font-semibold">
                    ⚠️ Expiring soon - please reconnect
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Facebook Integration Component
function FacebookIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email: "",
    accessToken: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pageName, setPageName] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    loadFacebookConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const facebookStatus = urlParams.get("facebook");
    
    if (facebookStatus === "connected") {
      const pageName = urlParams.get("page");
      toast.success(`Facebook connected successfully!${pageName ? ` Connected to: ${pageName}` : ""}`);
      // Reload config
      loadFacebookConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (facebookStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`Facebook connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadFacebookConfig = async () => {
    try {
      const response = await fetch("/api/integrations/facebook");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            email: data.config.email || "",
            accessToken: "",
          });
          setPageName(data.config.pageName || "");
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Facebook config:", error);
      setIsConnected(false);
    }
  };

  const handleConnectFacebook = () => {
    // Get Facebook App ID from environment (or use a config)
    // For now, we'll construct the OAuth URL
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`;
    // Required permissions: pages_show_list (to list pages), pages_read_engagement (to read page data), pages_manage_posts (to post to pages)
    // business_management: Access to Business Portfolio Pages (Meta Business Suite)
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,business_management";
    
    if (!appId) {
      toast.error("Facebook App ID not configured. Please contact support.");
      return;
    }
    
    // Redirect to Facebook OAuth
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${Date.now()}`; // Simple state for CSRF protection
    
    window.location.href = facebookAuthUrl;
  };

  const handleSave = async () => {
    if (!config.email || !config.accessToken) {
      toast.error("Please enter both email and access token");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email.trim(),
          accessToken: config.accessToken.trim(),
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Facebook configuration saved!");
        setIsConnected(true);
        setPageName(data.config?.pageName || "");
        setConfig({ email: "", accessToken: "" });
        await loadFacebookConfig();
      } else {
        toast.error(data.error || "Failed to save configuration");
        if (data.suggestions) {
          console.log("Suggestions:", data.suggestions);
        }
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Facebook integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/facebook", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Facebook integration disconnected");
        setIsConnected(false);
        setConfig({ email: "", accessToken: "" });
        setPageName("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="facebook-integration" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/facebook-color.svg" alt="Facebook" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Facebook Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to your Facebook Page using Graph API
            {pageName && isConnected && ` - ${pageName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>ℹ️ Note:</strong> Connect your Facebook account to automatically publish content to your Facebook Page. No manual token entry needed!
            </p>
          </div>

          {/* OAuth Connect Button (Primary Method) */}
          {!showManualEntry ? (
            <>
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Image src="/facebook-color.svg" alt="Facebook" width={64} height={64} className="w-16 h-16 mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Connect with Facebook
                </h4>
                <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
                  Click the button below to securely connect your Facebook account. 
                  We'll automatically detect your pages and set up publishing.
                </p>
                <button
                  onClick={handleConnectFacebook}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Image src="/facebook-color.svg" alt="Facebook" width={20} height={20} className="w-5 h-5" />
                      Connect Facebook
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowManualEntry(true)}
                  className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Or enter token manually
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Manual Token Entry (Fallback) */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Manual Token Entry</h4>
                <button
                  onClick={() => setShowManualEntry(false)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Use OAuth instead
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Facebook account email (used for identification)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token *
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={config.accessToken}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    placeholder="EAAxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none pr-12 font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your Facebook Access Token (User Access Token or Page Access Token)
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  How to get Access Token:
                </h4>
                <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Facebook Graph API Explorer</a></li>
                  <li>Select your Facebook App (or create one if needed)</li>
                  <li>Click "Generate Access Token"</li>
                  <li>If you have a Page: Select your Page and grant permissions: <code className="bg-blue-100 px-1 rounded">pages_manage_posts</code>, <code className="bg-blue-100 px-1 rounded">pages_read_engagement</code></li>
                  <li>If you don't have a Page: Use User Access Token with <code className="bg-blue-100 px-1 rounded">pages_show_list</code> permission - we'll get your pages automatically</li>
                  <li>Copy the generated token (starts with "EAA...")</li>
                  <li><strong>Note:</strong> Short-lived tokens expire in ~1 hour. For long-lived tokens (60 days), use the token exchange endpoint.</li>
                </ol>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={loading || !config.email || !config.accessToken}
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> {pageName || "Facebook Page"} {config.email && `(${config.email})`}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
