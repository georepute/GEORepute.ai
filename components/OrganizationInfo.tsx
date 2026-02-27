"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Building2, 
  Globe, 
  FileText, 
  Upload, 
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getUserOrganizations, updateOrganization } from "@/lib/organizations";
import toast from "react-hot-toast";
import { Organization } from "@/types";

export default function OrganizationInfo() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [orgData, setOrgData] = useState({
    name: "",
    description: "",
    website: "",
    logo_url: "",
  });

  useEffect(() => {
    loadOrganizationData();
  }, []);

  async function loadOrganizationData() {
    try {
      setLoading(true);

      // Get user's organization
      const { organizations } = await getUserOrganizations();
      
      if (!organizations || organizations.length === 0) {
        toast.error("No organization found");
        return;
      }

      const org = organizations[0].organization as Organization;
      setOrganizationId(org.id);
      setOrgData({
        name: org.name || "",
        description: org.description || "",
        website: org.website || "",
        logo_url: org.logo_url || "",
      });

    } catch (error: any) {
      console.error("Error loading organization data:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLogoError(false);
  }, [orgData.logo_url]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrgData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    if (!organizationId) {
      toast.error("No organization found");
      return;
    }

    if (!orgData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSaving(true);

    try {
      const { success, error } = await updateOrganization(organizationId, {
        name: orgData.name.trim(),
        description: orgData.description.trim() || undefined,
        website: orgData.website.trim() || undefined,
        logo_url: orgData.logo_url.trim() || undefined,
      });

      if (success) {
        toast.success("Organization updated successfully!");
      } else {
        throw new Error(error || "Failed to update organization");
      }
    } catch (error: any) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading organization data...</p>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-900 mb-1">No Organization Found</h3>
          <p className="text-yellow-800">
            You need to be part of an organization to manage its information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 md:p-8 border border-gray-200"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Information</h2>
        <p className="text-gray-600">Manage your organization's details and branding</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="name"
              name="name"
              required
              value={orgData.name}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="e.g., Acme Digital Agency"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">The name of your organization</p>
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
              value={orgData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
              placeholder="Tell us about your organization..."
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Optional: Brief description of your organization</p>
        </div>

        {/* Website URL */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
            Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              id="website"
              name="website"
              value={orgData.website}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="https://www.yourwebsite.com"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Optional: Your organization's website</p>
        </div>

        {/* Logo URL */}
        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
            Logo URL
          </label>
          <div className="relative">
            <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="url"
              id="logo_url"
              name="logo_url"
              value={orgData.logo_url}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">Optional: Direct URL to your logo image</p>
        </div>

        {/* Logo Preview */}
        {orgData.logo_url && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-700 mb-3">Logo Preview:</p>
            <div className="relative flex items-center justify-center bg-white p-6 rounded-lg border border-gray-200 min-h-[6rem]">
              {!logoError ? (
                <Image
                  src={orgData.logo_url}
                  alt="Organization Logo"
                  width={96}
                  height={96}
                  className="max-h-24 max-w-full object-contain"
                  unoptimized
                  onError={() => {
                    setLogoError(true);
                    toast.error("Failed to load logo. Please check the URL.");
                  }}
                />
              ) : (
                <Upload className="w-10 h-10 text-gray-400" aria-hidden />
              )}
            </div>
          </motion.div>
        )}

        {/* Preview Card */}
        {orgData.name && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-primary-50 border border-primary-200 rounded-lg"
          >
            <p className="text-sm font-medium text-primary-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Preview:
            </p>
            <div className="space-y-1 text-sm text-primary-800">
              <p><strong>Name:</strong> {orgData.name}</p>
              {orgData.description && <p><strong>Description:</strong> {orgData.description}</p>}
              {orgData.website && <p><strong>Website:</strong> {orgData.website}</p>}
              {orgData.logo_url && <p><strong>Logo URL:</strong> {orgData.logo_url}</p>}
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving || !orgData.name.trim()}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

