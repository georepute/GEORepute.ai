"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Globe, ArrowRight, CheckCircle2, XCircle, Plus } from "lucide-react";
import Button from "@/components/Button";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

const ONBOARDING_KEYWORDS_KEY = "onboarding-keywords";
const ONBOARDING_COMPETITORS_KEY = "onboarding-competitors";

export default function EnterDomain() {
  const { nextStep } = useOnboarding();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [normalizedDomain, setNormalizedDomain] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<Array<{ name: string; domain?: string }>>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorDomain, setNewCompetitorDomain] = useState("");

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

  const handleContinue = async () => {
    const finalDomain = normalizedDomain || domain;
    const validation = validateDomain(finalDomain);

    if (!validation.valid || !finalDomain || !validation.normalized) {
      setError(validation.error || "Please enter a valid domain URL");
      setIsValid(false);
      return;
    }
    if (!isValid) {
      setError("Please wait for domain validation to complete");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const domainName = (() => {
        try {
          const u = new URL(validation.normalized.startsWith("http") ? validation.normalized : `https://${validation.normalized}`);
          return u.hostname.replace("www.", "").split(".")[0] || "Brand";
        } catch {
          return "Brand";
        }
      })();
      const res = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: domainName,
          websiteUrl: validation.normalized,
          industry: "General",
          language: "en",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to generate keywords and competitors");
        setLoading(false);
        return;
      }
      if (!data.success) {
        toast.error(data.error || "Failed to generate suggestions");
        setLoading(false);
        return;
      }
      if (!data.keywords?.length && !data.competitors?.length) {
        toast("Add keywords and competitors below or confirm to continue.");
      }
      setKeywords(Array.isArray(data.keywords) ? data.keywords : []);
      setCompetitors(Array.isArray(data.competitors) ? data.competitors : []);
      setModalOpen(true);
    } catch (err: unknown) {
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const removeKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
  };
  const addKeyword = () => {
    const k = newKeyword.trim();
    if (k && !keywords.includes(k)) {
      setKeywords((prev) => [...prev, k]);
      setNewKeyword("");
    }
  };
  const removeCompetitor = (index: number) => {
    setCompetitors((prev) => prev.filter((_, i) => i !== index));
  };
  const addCompetitor = () => {
    const name = newCompetitorName.trim();
    if (name) {
      setCompetitors((prev) => [...prev, { name, domain: newCompetitorDomain.trim() || undefined }]);
      setNewCompetitorName("");
      setNewCompetitorDomain("");
    }
  };

  const handleConfirmAndContinue = () => {
    if (typeof window !== "undefined") {
      const finalDomain = normalizedDomain || domain;
      const validation = validateDomain(finalDomain);
      if (validation.normalized) localStorage.setItem("onboarding-domain", validation.normalized);
      localStorage.setItem(ONBOARDING_KEYWORDS_KEY, JSON.stringify(keywords));
      localStorage.setItem(ONBOARDING_COMPETITORS_KEY, JSON.stringify(competitors));
    }
    setModalOpen(false);
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
          disabled={!isValid || loading}
          isLoading={loading}
        >
          {loading ? "Generating…" : "Continue"} <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {/* Modal: review and edit keywords & competitors */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Review keywords & competitors</h3>
              <p className="text-sm text-gray-600 mt-1">Add or remove items, then confirm to continue.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {keywords.map((k, i) => (
                    <span
                      key={`${k}-${i}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-800 rounded-lg text-sm"
                    >
                      {k}
                      <button type="button" onClick={() => removeKeyword(i)} className="hover:bg-primary-200 rounded p-0.5" aria-label="Remove">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <Button onClick={addKeyword} variant="outline" size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Competitors</label>
                <div className="space-y-2 mb-2">
                  {competitors.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="flex items-start justify-between gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                        {c.domain && (
                          <div className="text-xs text-gray-500 mt-0.5 break-all">{c.domain}</div>
                        )}
                      </div>
                      <button type="button" onClick={() => removeCompetitor(i)} className="text-red-600 hover:bg-red-50 rounded p-1 flex-shrink-0" aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCompetitorName}
                    onChange={(e) => setNewCompetitorName(e.target.value)}
                    placeholder="Competitor name"
                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newCompetitorDomain}
                    onChange={(e) => setNewCompetitorDomain(e.target.value)}
                    placeholder="Domain (optional)"
                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <Button onClick={addCompetitor} variant="outline" size="sm"><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <Button onClick={handleConfirmAndContinue} variant="primary" size="lg" className="w-full">
                Confirm & Continue <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
