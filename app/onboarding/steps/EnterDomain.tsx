"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Globe, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/Button";
import { useState, useEffect, useRef } from "react";

export default function EnterDomain() {
  const { nextStep } = useOnboarding();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [normalizedDomain, setNormalizedDomain] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Clear any stale domain from localStorage when component mounts
  // This ensures a clean start for each onboarding session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const staleDomain = localStorage.getItem("onboarding-domain");
      if (staleDomain) {
        console.log('Clearing stale domain from localStorage:', staleDomain);
        localStorage.removeItem("onboarding-domain");
      }
      // Reset domain state to empty
      setDomain("");
      setIsValid(false);
      setError("");
      setNormalizedDomain("");
    }
  }, []);

  // Instant validation function (synchronous)
  const validateDomain = (url: string): { valid: boolean; normalized: string; error: string } => {
    if (!url.trim()) {
      return { valid: false, normalized: "", error: "" };
    }

    const trimmedUrl = url.trim();
    
    // Reject common invalid inputs (like agency names, company names without domain)
    if (!trimmedUrl.includes(".") && !trimmedUrl.startsWith("http")) {
      return { 
        valid: false, 
        normalized: "", 
        error: "Please enter a valid domain URL with a dot (e.g., example.com)" 
      };
    }

    // Reject inputs that look like plain text (no TLD)
    const hasTLD = /\.(com|org|net|io|co|ai|dev|app|tech|online|site|website|xyz|info|biz|us|uk|ca|au|de|fr|it|es|nl|se|no|dk|fi|pl|cz|at|ch|be|ie|nz|jp|cn|in|br|mx|ar|cl|co|pe|za|ae|sa|il|tr|ru|gov|edu|mil)$/i.test(trimmedUrl);
    if (!hasTLD && !trimmedUrl.startsWith("http")) {
      return { 
        valid: false, 
        normalized: "", 
        error: "Please enter a valid domain URL with a top-level domain (e.g., .com, .org)" 
      };
    }

    try {
      // Normalize URL
      let normalizedUrl = trimmedUrl;
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      // Validate URL format
      const urlObj = new URL(normalizedUrl);
      const hostname = urlObj.hostname.replace("www.", "");

      // Basic validation
      if (hostname.length < 3) {
        return { valid: false, normalized: normalizedUrl, error: "Domain name too short" };
      }

      // Check for valid domain pattern (must have at least one dot)
      if (!hostname.includes(".")) {
        return { 
          valid: false, 
          normalized: normalizedUrl, 
          error: "Please enter a valid domain URL (e.g., example.com)" 
        };
      }

      // Check for valid TLD (at least 2 characters after last dot)
      const parts = hostname.split(".");
      const tld = parts[parts.length - 1];
      if (tld.length < 2) {
        return { 
          valid: false, 
          normalized: normalizedUrl, 
          error: "Please enter a valid domain URL with a proper top-level domain" 
        };
      }

      if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
        return { valid: false, normalized: normalizedUrl, error: "Local domains are not supported" };
      }

      // Valid domain
      return { valid: true, normalized: normalizedUrl, error: "" };
    } catch (urlError: any) {
      return { 
        valid: false, 
        normalized: "", 
        error: "Please enter a valid domain URL (e.g., example.com or https://example.com)" 
      };
    }
  };

  // Real-time validation with debouncing
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // If domain is empty, reset state
    if (!domain.trim()) {
      setIsValid(false);
      setError("");
      setNormalizedDomain("");
      return;
    }

    // Debounce validation by 300ms for better UX
    debounceTimer.current = setTimeout(() => {
      const validation = validateDomain(domain);
      setIsValid(validation.valid);
      setError(validation.error);
      setNormalizedDomain(validation.normalized);
    }, 300);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [domain]);

  const handleContinue = () => {
    // Use normalized domain if available, otherwise validate current input
    const finalDomain = normalizedDomain || domain;
    const validation = validateDomain(finalDomain);

    if (!validation.valid || !finalDomain || !validation.normalized) {
      setError(validation.error || "Please enter a valid domain URL");
      setIsValid(false);
      return;
    }

    // Double-check validation before proceeding
    if (!isValid) {
      setError("Please wait for domain validation to complete");
      return;
    }

    // Store domain in localStorage for next steps
    if (typeof window !== "undefined") {
      localStorage.setItem("onboarding-domain", validation.normalized);
      console.log("✅ Domain stored:", validation.normalized);
    }

    // Only proceed if domain is valid
    nextStep();
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Globe className="w-8 h-8 text-primary-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Enter Your Business Domain
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        We'll analyze your domain and provide comprehensive intelligence insights
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Domain URL *
          </label>
          <div className="relative">
            <input
              type="text"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
              }}
              placeholder="example.com or https://example.com"
              className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none transition-all ${
                error
                  ? "border-red-300 focus:border-red-500"
                  : isValid
                  ? "border-green-300 focus:border-green-500"
                  : "border-gray-300 focus:border-primary-500"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : error && domain.trim() ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : null}
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          {isValid && (
            <p className="mt-2 text-sm text-green-600">
              ✓ Domain validated successfully
            </p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Examples:</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
            <li>example.com</li>
            <li>https://www.example.com</li>
            <li>subdomain.example.com</li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={handleContinue}
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!isValid}
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
