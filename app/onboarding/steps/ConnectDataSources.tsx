"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Link2, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, ExternalLink, XCircle } from "lucide-react";
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
  facebook: boolean;
  instagram: boolean;
  linkedin: boolean;
}

const ONBOARDING_RETURN_PATH = "/onboarding?step=2";

export default function ConnectDataSources() {
  const { nextStep, previousStep } = useOnboarding();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    gsc: false,
    ga4: false,
    gbp: false,
    facebook: false,
    instagram: false,
    linkedin: false,
  });

  useEffect(() => {
    checkIntegrations();
    
    // Check if returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const facebook = urlParams.get("facebook");
    const instagram = urlParams.get("instagram");
    const linkedin = urlParams.get("linkedin");
    
    if (success === "gsc_connected") {
      toast.success("Google Search Console connected successfully!");
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (success === "ga4_connected") {
      toast.success("Google Analytics 4 connected successfully!");
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (success === "gbp_connected") {
      toast.success("Google Business Profile connected successfully!");
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (facebook === "connected") {
      const page = urlParams.get("page");
      toast.success(`Facebook connected successfully!${page ? ` Connected to: ${page}` : ""}`);
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (facebook === "error") {
      toast.error(urlParams.get("message") || "Facebook connection failed");
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (instagram === "connected") {
      const username = urlParams.get("username");
      toast.success(`Instagram connected successfully!${username ? ` Connected as: @${username}` : ""}`);
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (instagram === "error") {
      toast.error(urlParams.get("message") || "Instagram connection failed");
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (linkedin === "connected") {
      const name = urlParams.get("name");
      toast.success(`LinkedIn connected successfully!${name ? ` Connected as: ${name}` : ""}`);
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
      checkIntegrations();
    } else if (linkedin === "error") {
      toast.error(urlParams.get("message") || "LinkedIn connection failed");
      window.history.replaceState({}, "", ONBOARDING_RETURN_PATH);
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

      // Check social integrations
      const { data: fb } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "facebook")
        .eq("status", "connected")
        .maybeSingle();
      const { data: ig } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "instagram")
        .eq("status", "connected")
        .maybeSingle();
      const { data: li } = await supabase
        .from("platform_integrations")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .eq("status", "connected")
        .maybeSingle();

      setIntegrations({
        gsc: !!gsc,
        ga4: !!ga4,
        gbp: !!gbp,
        facebook: !!fb,
        instagram: !!ig,
        linkedin: !!li,
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
          const response = await fetch("/api/integrations/google-search-console/auth-url?return_to=/onboarding?step=2&success=gsc_connected");
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
        // Get GA4 OAuth URL from API (return to Connect Data Sources step after auth)
        try {
          const returnTo = encodeURIComponent(ONBOARDING_RETURN_PATH);
          const response = await fetch(`/api/integrations/google-analytics/auth-url?return_to=${returnTo}`);
          const data = await response.json();
          
          if (!response.ok) {
            toast.error(data.error || "Failed to get OAuth URL");
            setConnecting(null);
            return;
          }
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
        // Get GBP OAuth URL from API (return to Connect Data Sources step after auth)
        try {
          const returnTo = encodeURIComponent(ONBOARDING_RETURN_PATH);
          const response = await fetch(`/api/integrations/google-business-profile/auth-url?return_to=${returnTo}`);
          const data = await response.json();
          
          if (!response.ok) {
            toast.error(data.error || "Failed to get OAuth URL");
            setConnecting(null);
            return;
          }
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

  const handleConnectSocial = (platform: "facebook" | "instagram" | "linkedin") => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const state = encodeURIComponent(ONBOARDING_RETURN_PATH);
    setConnecting(platform);

    if (platform === "facebook") {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        toast.error("Facebook App ID not configured. Please contact support.");
        setConnecting(null);
        return;
      }
      const redirectUri = `${origin}/api/auth/facebook/callback`;
      const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,business_management";
      const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
      window.location.href = url;
      return;
    }
    if (platform === "instagram") {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      if (!appId) {
        toast.error("Facebook App ID not configured. Please contact support.");
        setConnecting(null);
        return;
      }
      const redirectUri = `${origin}/api/auth/instagram/callback`;
      const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management";
      const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
      window.location.href = url;
      return;
    }
    if (platform === "linkedin") {
      const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
      if (!clientId) {
        toast.error("LinkedIn Client ID not configured. Please contact support.");
        setConnecting(null);
        return;
      }
      const redirectUri = `${origin}/api/auth/linkedin/callback`;
      const scope = "openid profile w_member_social";
      const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
      window.location.href = url;
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
        <div className="space-y-6 mb-8">
          {/* Google assets */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Google assets
            </h3>
            <div className="space-y-4">
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
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <Image src="/google-analytics-4.svg" alt="Google Analytics 4" width={40} height={40} className="w-full h-full object-contain p-1" />
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
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                  <Image src="/google-my-business.svg" alt="Google Business Profile" width={40} height={40} className="w-full h-full object-contain p-1" />
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
          </div>

          {/* Social profile */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Social profile
            </h3>
            <div className="space-y-4">
              {/* Facebook */}
              <div
                className={`p-4 border-2 rounded-xl transition-all ${
                  integrations.facebook ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      <Image src="/facebook-color.svg" alt="Facebook" width={40} height={40} className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Facebook</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">Required</span>
                      </div>
                      <p className="text-sm text-gray-600">Connect your Facebook Page for publishing and insights</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integrations.facebook ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Connected</span>
                      </>
                    ) : (
                      <Button onClick={() => handleConnectSocial("facebook")} variant="primary" size="sm" isLoading={connecting === "facebook"}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {/* Instagram */}
              <div
                className={`p-4 border-2 rounded-xl transition-all ${
                  integrations.instagram ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={40} height={40} className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Instagram</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">Required</span>
                      </div>
                      <p className="text-sm text-gray-600">Connect Instagram for content publishing and analytics</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integrations.instagram ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Connected</span>
                      </>
                    ) : (
                      <Button onClick={() => handleConnectSocial("instagram")} variant="primary" size="sm" isLoading={connecting === "instagram"}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {/* LinkedIn */}
              <div
                className={`p-4 border-2 rounded-xl transition-all ${
                  integrations.linkedin ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      <Image src="/linkedin.svg" alt="LinkedIn" width={40} height={40} className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">LinkedIn</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">Required</span>
                      </div>
                      <p className="text-sm text-gray-600">Connect LinkedIn for professional content and company updates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integrations.linkedin ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Connected</span>
                      </>
                    ) : (
                      <Button onClick={() => handleConnectSocial("linkedin")} variant="primary" size="sm" isLoading={connecting === "linkedin"}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              {/* YouTube */}
              <div className="p-4 border-2 border-gray-200 rounded-xl bg-gray-50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                      <Image src="/youtube.svg" alt="YouTube" width={40} height={40} className="w-full h-full object-contain p-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">YouTube</span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">Required</span>
                      </div>
                      <p className="text-sm text-gray-600">Connect YouTube for video content and channel analytics</p>
                    </div>
                  </div>
                  <Button onClick={() => router.push("/dashboard/settings?tab=integrations")} variant="outline" size="sm">
                    Connect
                  </Button>
                </div>
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

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Button onClick={previousStep} variant="outline" className="flex-1">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
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
    </div>
  );
}
