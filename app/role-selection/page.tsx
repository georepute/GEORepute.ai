"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, User, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function RoleSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Check if user already has a role
      const { data: profile } = await supabase
        .from("user")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role) {
        // User already has a role, redirect to dashboard
        router.push("/dashboard");
      }
    }
    checkAuth();
  }, [router]);

  const handleRoleSelection = async (role: "client" | "agency") => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Update user role in database
      const { error: updateError } = await supabase
        .from("user")
        .update({ role: role })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      console.log(`✅ Role set to: ${role}`);

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
            Choose Your Account Type
          </h1>
          <p className="text-xl text-gray-600">
            Select the option that best describes how you'll use GeoRepute.ai
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

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Client Card */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleRoleSelection("client")}
            disabled={loading}
            className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 text-left border-2 border-transparent hover:border-secondary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute top-6 right-6">
              <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center group-hover:bg-secondary-200 transition-colors">
                <User className="w-6 h-6 text-secondary-600" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              I'm a Client
            </h3>
            <p className="text-gray-600 mb-6">
              I'm a business owner or individual looking to improve my online visibility and reputation.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Manage your own business visibility</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Track rankings and AI visibility</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Generate AI-powered content</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Access full analytics and reports</span>
              </li>
            </ul>

            <div className="flex items-center justify-center gap-2 text-secondary-600 font-semibold group-hover:gap-3 transition-all">
              <span>Select Client</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </motion.button>

          {/* Agency Card */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleRoleSelection("agency")}
            disabled={loading}
            className="group relative bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 text-left border-2 border-transparent hover:border-accent-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute top-6 right-6">
              <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center group-hover:bg-accent-200 transition-colors">
                <Building2 className="w-6 h-6 text-accent-600" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              I'm an Agency
            </h3>
            <p className="text-gray-600 mb-6">
              I manage multiple clients and need white-label tools to deliver results at scale.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Manage multiple client accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">White-label branding options</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Team collaboration features</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">Client reporting and proposals</span>
              </li>
            </ul>

            <div className="flex items-center justify-center gap-2 text-accent-600 font-semibold group-hover:gap-3 transition-all">
              <span>Select Agency</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </motion.button>
        </div>

        {/* Loading State */}
        {loading && (
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

        {/* Skip Option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8"
        >
          <button
            onClick={() => {
              router.push("/dashboard");
            }}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium underline"
          >
            Skip setup and go to dashboard
          </button>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-500 mt-4 text-sm"
        >
          You can change this later in your account settings
        </motion.p>
      </div>
    </div>
  );
}

