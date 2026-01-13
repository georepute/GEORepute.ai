"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Globe, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/Button";
import { useState } from "react";

export default function EnterDomain() {
  const { nextStep } = useOnboarding();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validateDomain = async (url: string) => {
    if (!url.trim()) {
      setError("");
      setIsValid(false);
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      // Validate URL format
      try {
        const urlObj = new URL(normalizedUrl);
        const hostname = urlObj.hostname.replace("www.", "");

        // Basic validation
        if (hostname.length < 3) {
          throw new Error("Domain name too short");
        }

        if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
          throw new Error("Local domains are not supported");
        }

        // Update with normalized domain
        setDomain(normalizedUrl);
        setIsValid(true);
        setError("");
      } catch (urlError: any) {
        if (urlError.code === "ERR_INVALID_URL") {
          setError("Please enter a valid domain URL (e.g., example.com or https://example.com)");
        } else {
          setError(urlError.message || "Invalid domain format");
        }
        setIsValid(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to validate domain");
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (!isValid || !domain) {
      setError("Please enter a valid domain URL");
      return;
    }

    // Store domain in onboarding state (if available in the hook)
    // For now, we'll pass it via localStorage or state management
    if (typeof window !== "undefined") {
      localStorage.setItem("onboarding-domain", domain);
    }

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
                setIsValid(false);
                setError("");
              }}
              onBlur={(e) => validateDomain(e.target.value)}
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
              {isValidating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              ) : isValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : error ? (
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
          disabled={!isValid || isValidating}
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
