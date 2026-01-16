"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, User, ArrowRight, ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function RoleSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showAgencyForm, setShowAgencyForm] = useState(false);
  
  // Agency form data
  const [agencyData, setAgencyData] = useState({
    name: "",
    description: "",
    website: "",
    logo_url: "",
  });

  useEffect(() => {
    // Check if user is authenticated
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Pre-fill agency name with user's name
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My';
      setAgencyData(prev => ({
        ...prev,
        name: `${userName}'s Agency`
      }));

      // Check if user already has a role
      const { data: profile } = await supabase
        .from("user")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role) {
        // User already has a role, redirect to AI Visibility page
        router.push("/dashboard/ai-visibility");
      } else {
        // Automatically show agency form for new users
        setShowAgencyForm(true);
      }
    }
    checkAuth();
  }, [router]);

  const handleRoleSelection = async (role: "client" | "agency") => {
    if (role === "agency") {
      // Show agency form instead of creating immediately
      setShowAgencyForm(true);
      return;
    }

    // For client role, proceed immediately
    await createUserWithRole(role);
  };

  const handleAgencyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUserWithRole("agency", agencyData);
  };

  const createUserWithRole = async (
    role: "client" | "agency",
    orgData?: typeof agencyData
  ) => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // If agency role, create organization and assign user as admin
      if (role === "agency" && orgData) {
        console.log("🏢 Creating organization for agency user...");
        
        // Call API to create organization
        const response = await fetch('/api/organizations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: orgData.name.trim(),
            description: orgData.description.trim() || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create organization');
        }

        console.log("✅ Organization created:", data.organization);
      }

      // Update user role in database
      const { error: updateError } = await supabase
        .from("user")
        .update({ role: role })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      console.log(`✅ Role set to: ${role}`);

      // Clear any stale onboarding data before redirecting
      if (typeof window !== "undefined") {
        localStorage.removeItem("onboarding-integrations");
        localStorage.removeItem("onboarding-domain");
        console.log('✅ Cleared onboarding localStorage before redirect');
      }

      // Redirect to onboarding for new users
      setTimeout(() => {
        router.refresh();
        router.push("/onboarding");
      }, 500);
    } catch (err: any) {
      console.error("Error setting role:", err);
      setError(err.message || "Failed to set role");
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAgencyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative w-12 h-12">
              <Image
                src="/logo.png"
                alt="GeoRepute.ai Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-3xl font-bold text-primary-600">
              GeoRepute.ai
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Setup Your Organization
          </h1>
          <p className="text-xl text-gray-600">
            Tell us about your organization to get started
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center"
          >
            <p className="text-red-600">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {showAgencyForm && (
            /* Agency Form */
            <motion.div
              key="agency-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 md:p-10 shadow-xl max-w-2xl mx-auto"
            >
              <form onSubmit={handleAgencyFormSubmit} className="space-y-6">
                {/* Agency Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Agency Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={agencyData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-all"
                      placeholder="e.g., Acme Digital Agency"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      id="description"
                      name="description"
                      value={agencyData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-all resize-none"
                      placeholder="Tell us about your agency..."
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Optional: Brief description of your agency</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAgencyForm(false)}
                    disabled={loading}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !agencyData.name.trim()}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-accent-600 to-accent-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-accent-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Preview */}
              {agencyData.name && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-4 bg-accent-50 border border-accent-200 rounded-lg"
                >
                  <p className="text-sm font-medium text-accent-900 mb-2">Preview:</p>
                  <div className="space-y-1 text-sm text-accent-800">
                    <p><strong>Name:</strong> {agencyData.name}</p>
                    {agencyData.description && <p><strong>Description:</strong> {agencyData.description}</p>}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && showAgencyForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-3 bg-white rounded-lg px-6 py-3 shadow-lg">
              <div className="w-5 h-5 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-700 font-medium">Setting up your account...</span>
            </div>
          </motion.div>
        )}

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-500 mt-4 text-sm"
        >
          You can update these details later in organization settings
        </motion.p>
      </div>
    </div>
  );
}
