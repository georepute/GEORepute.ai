"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  Link as LinkIcon,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/language-context";

interface GSCIntegrationData {
  integration_id?: string;
  domain_url?: string;
  site_url?: string;
  verification_method?: 'DNS_TXT' | 'DNS_CNAME' | 'FILE' | 'META' | 'ANALYTICS' | 'TAG_MANAGER';
  verification_token?: string;
  verification_status?: 'pending' | 'verified' | 'failed';
  permission_level?: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser';
  last_synced_at?: string;
  verified_at?: string;
  error?: string;
  failed_at?: string;
  [key: string]: any;
}

interface Domain {
  id: string;
  domain: string;
  status: "active" | "inactive" | "pending_verification" | "verification_failed";
  user_id?: string;
  gsc_integration?: GSCIntegrationData | null;
  created_at: string;
  updated_at: string;
}

export default function DomainsPage() {
  const router = useRouter();
  const { isRtl, t } = useLanguage();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadUserOrganization();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadDomains();
    }
  }, [organizationId]);

  const loadUserOrganization = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: orgUser, error: orgError } = await supabase
        .from("organization_users")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (orgError) throw orgError;

      setOrganizationId(orgUser.organization_id);
    } catch (error) {
      console.error("Error loading organization:", error);
      setError("Failed to load organization");
    }
  };

  const loadDomains = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error: domainsError } = await supabase
        .from("domains")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (domainsError) throw domainsError;

      setDomains(data || []);
    } catch (error: any) {
      console.error("Error loading domains:", error);
      setError(error.message || "Failed to load domains");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim() || !organizationId) return;

    try {
      setAddingDomain(true);
      setError("");
      setSuccess("");

      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}\.?)+$/;
      if (!domainRegex.test(newDomain.trim())) {
        throw new Error("Invalid domain format. Please enter a valid domain (e.g., example.com)");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const { data, error: insertError } = await supabase
        .from("domains")
        .insert({
          organization_id: organizationId,
          domain: newDomain.trim().toLowerCase(),
          status: "active",
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setDomains([data, ...domains]);
      setNewDomain("");
      setSuccess("Domain added successfully!");
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error adding domain:", error);
      setError(error.message || "Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to delete this domain?")) return;

    try {
      setError("");
      setSuccess("");

      const { error: deleteError } = await supabase
        .from("domains")
        .delete()
        .eq("id", domainId);

      if (deleteError) throw deleteError;

      setDomains(domains.filter((d) => d.id !== domainId));
      setSuccess("Domain deleted successfully!");
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error: any) {
      console.error("Error deleting domain:", error);
      setError(error.message || "Failed to delete domain");
    }
  };

  const getStatusBadge = (domain: Domain) => {
    // Show GSC verification status if GSC integration exists
    if (domain.gsc_integration) {
      const gscStatus = domain.gsc_integration.verification_status;
      switch (gscStatus) {
        case "verified":
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
              <Shield className="w-3 h-3" />
              GSC Verified
            </span>
          );
        case "pending":
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
              <Clock className="w-3 h-3" />
              GSC Pending
            </span>
          );
        case "failed":
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
              <XCircle className="w-3 h-3" />
              GSC Failed
            </span>
          );
      }
    }

    // Fall back to domain status
    switch (domain.status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "verification_failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            <X className="w-3 h-3" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
            <Globe className="w-3 h-3" />
            Active
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getGSCIntegrationBadge = (domain: Domain) => {
    if (!domain.gsc_integration) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
          <XCircle className="w-3 h-3" />
          No GSC
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
        <LinkIcon className="w-3 h-3" />
        GSC Linked
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Server className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Domain Management
          </h1>
        </div>
        <p className="text-gray-600">
          Add and manage domains for your organization.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
          <button
            onClick={() => setSuccess("")}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Domain Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add New Domain
        </h2>
        <form onSubmit={handleAddDomain} className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              disabled={addingDomain}
            />
          </div>
          <button
            type="submit"
            disabled={addingDomain || !newDomain.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {addingDomain ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Domain
              </>
            )}
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          Enter your domain without http:// or https:// (e.g., example.com)
        </p>
      </div>

      {/* Domains List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Domains</h2>
          <p className="text-sm text-gray-600 mt-1">
            {domains.length} {domains.length === 1 ? "domain" : "domains"} registered
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center">
            <Server className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No domains yet
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first domain to get started with domain management.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GSC Integration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {domains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                          {domain.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(domain)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {getGSCIntegrationBadge(domain)}
                        {domain.gsc_integration?.last_synced_at && (
                          <span className="text-xs text-gray-500">
                            Synced: {formatDate(domain.gsc_integration.last_synced_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(domain.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteDomain(domain.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

