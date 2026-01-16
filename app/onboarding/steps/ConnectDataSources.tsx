"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Link2, ArrowRight, CheckCircle2, AlertCircle, ExternalLink, XCircle } from "lucide-react";
import Button from "@/components/Button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";

interface IntegrationStatus {
  gsc: boolean;
  ga4: boolean;
  gbp: boolean;
}

export default function ConnectDataSources() {
  const { nextStep } = useOnboarding();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    gsc: false,
    ga4: false,
    gbp: false,
  });

  useEffect(() => {
    checkIntegrations();
    
    // Check if returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    
    if (success === "gsc_connected") {
      toast.success("Google Search Console connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      checkIntegrations();
    } else if (success === "ga4_connected") {
      toast.success("Google Analytics 4 connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      checkIntegrations();
    } else if (success === "gbp_connected") {
      toast.success("Google Business Profile connected successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      checkIntegrations();
    }
  }, []);

  const checkIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check GSC
      const { data: gsc } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "google_search_console")
        .eq("status", "connected")
        .maybeSingle();

      // Check GA4 (if table exists)
      const { data: ga4 } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "google_analytics")
        .eq("status", "connected")
        .maybeSingle();

      // Check GBP (if table exists)
      const { data: gbp } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "google_business_profile")
        .eq("status", "connected")
        .maybeSingle();

      setIntegrations({
        gsc: !!gsc,
        ga4: !!ga4,
        gbp: !!gbp,
      });
    } catch (error) {
      console.error("Error checking integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: "gsc" | "ga4" | "gbp") => {
    setConnecting(platform);

    try {
      if (platform === "gsc") {
        // Get GSC OAuth URL from API
        try {
          const response = await fetch("/api/integrations/google-search-console/auth-url?return_to=/onboarding?step=1&success=gsc_connected");
          const data = await response.json();
          
          if (!response.ok) {
            // Show detailed error message
            const errorMsg = data.details || data.error || "Failed to get OAuth URL";
            console.error("GSC OAuth error:", errorMsg);
            toast.error(errorMsg);
            setConnecting(null);
            return;
          }
          
          if (data.authUrl) {
            window.location.href = data.authUrl;
          } else {
            throw new Error(data.error || "Failed to get OAuth URL");
          }
        } catch (err: any) {
          console.error("GSC connection error:", err);
          toast.error(err.message || "Failed to connect Google Search Console. Please check your environment variables.");
          setConnecting(null);
        }
      } else if (platform === "ga4") {
        // Get GA4 OAuth URL from API
        try {
          const response = await fetch("/api/integrations/google-analytics/auth-url?return_to=/onboarding");
          const data = await response.json();
          
          if (data.authUrl) {
            window.location.href = data.authUrl;
          } else {
            throw new Error(data.error || "Failed to get OAuth URL");
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to connect Google Analytics 4");
          setConnecting(null);
        }
      } else if (platform === "gbp") {
        // Get GBP OAuth URL from API
        try {
          const response = await fetch("/api/integrations/google-business-profile/auth-url?return_to=/onboarding");
          const data = await response.json();
          
          if (data.authUrl) {
            window.location.href = data.authUrl;
          } else {
            throw new Error(data.error || "Failed to get OAuth URL");
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to connect Google Business Profile");
          setConnecting(null);
        }
      }
    } catch (error: any) {
      console.error(`Error connecting ${platform}:`, error);
      toast.error(`Failed to connect ${platform.toUpperCase()}: ${error.message}`);
      setConnecting(null);
    }
  };

  const handleContinue = () => {
    // Verify domain exists before allowing to proceed
    const domain = localStorage.getItem("onboarding-domain");
    if (!domain) {
      toast.error("Domain not found. Please go back and enter your domain.");
      return;
    }

    // Validate domain format
    try {
      const urlObj = new URL(domain.startsWith("http") ? domain : `https://${domain}`);
      if (!urlObj.hostname || urlObj.hostname.length < 3 || !urlObj.hostname.includes(".")) {
        toast.error("Invalid domain. Please go back and enter a valid domain URL.");
        return;
      }
    } catch (e) {
      toast.error("Invalid domain format. Please go back and enter a valid domain URL.");
      return;
    }

    // GSC is mandatory
    if (!integrations.gsc) {
      toast.error("Google Search Console connection is required to continue");
      return;
    }

    // Store integration status
    if (typeof window !== "undefined") {
      localStorage.setItem("onboarding-integrations", JSON.stringify(integrations));
    }

    nextStep();
  };

  const canContinue = integrations.gsc; // GSC is mandatory

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Link2 className="w-8 h-8 text-secondary-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Connect Your Data Sources
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        Connect your integrations to get comprehensive insights
      </p>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking integrations...</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {/* Google Search Console - Required */}
          <div
            className={`p-4 border-2 rounded-xl transition-all ${
              integrations.gsc
                ? "border-green-500 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/google.svg" 
                    alt="Google Search Console" 
                    width={40} 
                    height={40}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      Google Search Console
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                      Required
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Essential for keyword and search performance data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integrations.gsc ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Connected
                    </span>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConnect("gsc")}
                    variant="primary"
                    size="sm"
                    isLoading={connecting === "gsc"}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Google Analytics 4 - Recommended */}
          <div
            className={`p-4 border-2 rounded-xl transition-all ${
              integrations.ga4
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      Google Analytics 4
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Track traffic, user behavior, and conversion data
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integrations.ga4 ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      Connected
                    </span>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConnect("ga4")}
                    variant="outline"
                    size="sm"
                    isLoading={connecting === "ga4"}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Google Business Profile - Optional */}
          <div
            className={`p-4 border-2 rounded-xl transition-all ${
              integrations.gbp
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏢</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      Google Business Profile
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-500 text-white rounded">
                      Optional
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Local SEO insights and business information
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {integrations.gbp ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      Connected
                    </span>
                  </>
                ) : (
                  <Button
                    onClick={() => handleConnect("gbp")}
                    variant="outline"
                    size="sm"
                    isLoading={connecting === "gbp"}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!canContinue && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">
              Google Search Console connection is required to continue
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={nextStep} variant="outline" className="flex-1">
          Skip for now
        </Button>
        <Button
          onClick={handleContinue}
          variant="primary"
          className="flex-1"
          disabled={!canContinue}
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
