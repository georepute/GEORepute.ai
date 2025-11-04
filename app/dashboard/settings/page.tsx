"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Globe,
  Lock,
  CreditCard,
  Zap,
  Save,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  Github,
  Loader,
  XCircle,
  MessageSquare
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
        <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
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
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
            <Github className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">GitHub Auto-Publishing</h3>
            <p className="text-sm text-gray-600">
              Automatically publish content as GitHub Issues
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
                  <li>Check permissions: <code className="bg-blue-100 px-1 rounded">repo</code> and <code className="bg-blue-100 px-1 rounded">issues:write</code></li>
                  <li>Click <strong>"Generate token"</strong> at the bottom</li>
                  <li>Copy the token (starts with <code className="bg-blue-100 px-1 rounded">ghp_</code>) and paste it above</li>
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

      {/* Other Integrations */}
      <div className="space-y-4">
        {[
          { name: "Google Search Console", status: "connected", description: "Connected account: john@company.com" },
          { name: "Google Ads", status: "connected", description: "Syncing 3 ad accounts" },
          { name: "OpenAI API", status: "connected", description: "API key configured" },
          { name: "Supabase", status: "connected", description: "Database connected" },
          { name: "ElevenLabs", status: "disconnected", description: "For video narration" },
          { name: "Stripe", status: "connected", description: "Billing enabled" },
        ].map((integration) => (
          <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Globe className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                integration.status === "connected" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-gray-100 text-gray-700"
              }`}>
                {integration.status}
              </span>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                {integration.status === "connected" ? "Configure" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

