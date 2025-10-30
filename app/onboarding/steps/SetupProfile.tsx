"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { User, ArrowRight, Building2 } from "lucide-react";
import Button from "@/components/Button";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function SetupProfile() {
  const { nextStep } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    company: "",
    website: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          company: formData.company,
          website: formData.website,
        },
      });

      if (error) throw error;

      toast.success("Profile updated!");
      nextStep();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <User className="w-8 h-8 text-primary-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Complete Your Profile
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        Tell us a bit about yourself and your business
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="Acme Corp"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="https://example.com"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          className="w-full"
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </form>
    </div>
  );
}




