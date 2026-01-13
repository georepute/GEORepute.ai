"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Loader2, 
  XCircle, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Globe,
  AlertTriangle,
  MapPin,
  FileText,
  Shield,
  Search,
  BarChart3,
  Zap
} from "lucide-react";
import Button from "@/components/Button";
import { useState, useEffect } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import toast from "react-hot-toast";

interface ScanProgress {
  currentStep: string;
  percentage: number;
  steps: {
    [key: string]: {
      status: "pending" | "processing" | "completed" | "failed";
      percentage: number;
    };
  };
}

interface ScanResults {
  domain?: any;
  crawl?: any;
  seo?: any;
  keywords?: any;
  competitors?: any;
  geography?: any;
  siteStructure?: any;
  headings?: any;
  strengths?: string[];
  weaknesses?: string[];
  toxicPatterns?: string[];
  aiVisibility?: any;
  recommendedActions?: any[];
}

export default function StartScan() {
  const router = useRouter();
  const { skipOnboarding } = useOnboarding();
  const [isScanning, setIsScanning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ScanProgress>({
    currentStep: "initializing",
    percentage: 0,
    steps: {},
  });
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<ScanResults | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Start scan automatically when component mounts
    startScan();
  }, []);

  useEffect(() => {
    // Poll for progress if jobId exists
    if (jobId && isScanning && !isComplete && !error) {
      const interval = setInterval(() => {
        checkProgress();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [jobId, isScanning, isComplete, error]);

  const startScan = async () => {
    try {
      // Get domain and integrations from localStorage
      const domain = localStorage.getItem("onboarding-domain");
      const integrationsStr = localStorage.getItem("onboarding-integrations");
      const integrations = integrationsStr ? JSON.parse(integrationsStr) : { gsc: true, ga4: false, gbp: false };

      if (!domain) {
        setError("Domain not found");
        setErrorDetails("Please go back and enter your domain.");
        return;
      }

      setIsScanning(true);
      setError(null);
      setErrorDetails(null);
      setResults(null);
      setIsRetrying(true);

      const response = await fetch("/api/geo-core/domain-intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domainUrl: domain,
          language: "en",
          integrations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to start scan";
        const errorCode = data.code || "";
        
        if (errorCode === "GSC_REQUIRED") {
          setError("Google Search Console Required");
          setErrorDetails("Please connect Google Search Console in the previous step to continue.");
        } else {
          setError(errorMsg);
          setErrorDetails(data.details || "Please check your domain URL and try again.");
        }
        setIsScanning(false);
        setIsRetrying(false);
        toast.error(errorMsg);
        return;
      }

      if (data.jobId) {
        setJobId(data.jobId);
        setIsRetrying(false);
        toast.success("Domain intelligence scan started!");
      } else {
        throw new Error("No job ID returned");
      }
    } catch (err: any) {
      console.error("Error starting scan:", err);
      const errorMsg = err.message || "Failed to start scan";
      setError(errorMsg);
      setErrorDetails("Network error occurred. Please check your connection and try again.");
      setIsScanning(false);
      setIsRetrying(false);
      toast.error(errorMsg);
    }
  };

  const checkProgress = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/geo-core/domain-intelligence?jobId=${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        // Don't set error immediately, retry a few times
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          return;
        }
        throw new Error(data.error || "Failed to check progress");
      }

      setRetryCount(0); // Reset retry count on success

      if (data.job) {
        const job = data.job;
        
        if (job.progress) {
          setProgress(job.progress);
        }

        if (job.status === "completed") {
          setIsComplete(true);
          setIsScanning(false);
          setResults(job.results || null);
          toast.success("Domain intelligence scan completed!");
        } else if (job.status === "failed") {
          const errorMsg = job.error_message || job.error || "Scan failed";
          setError("Scan Failed");
          setErrorDetails(errorMsg);
          setIsScanning(false);
          toast.error("Scan failed: " + errorMsg);
        }
      }
    } catch (err: any) {
      console.error("Error checking progress:", err);
      // Only show error after multiple retries
      if (retryCount >= 3) {
        setError("Connection Error");
        setErrorDetails("Unable to check scan progress. The scan may still be running.");
        setIsScanning(false);
      }
    }
  };

  const handleRetry = () => {
    setError(null);
    setErrorDetails(null);
    setRetryCount(0);
    setJobId(null);
    startScan();
  };

  const handleFinish = () => {
    skipOnboarding();
    router.push("/dashboard");
  };

  const steps = [
    { id: "crawl", label: "Crawling Domain", icon: Globe, description: "Discovering pages" },
    { id: "siteStructure", label: "Analyzing Site Structure", icon: FileText, description: "Mapping site architecture" },
    { id: "seo", label: "Analyzing SEO Baseline", icon: TrendingUp, description: "Evaluating SEO factors" },
    { id: "geography", label: "Detecting Geography", icon: MapPin, description: "Identifying location signals" },
    { id: "toxicPatterns", label: "Scanning for Issues", icon: Shield, description: "Detecting problems" },
    { id: "analysis", label: "Analyzing Strengths & Weaknesses", icon: BarChart3, description: "Assessing performance" },
    { id: "keywords", label: "Extracting Keywords", icon: Target, description: "Finding relevant keywords" },
    { id: "competitors", label: "Mapping Competitors", icon: Search, description: "Identifying competition" },
    { id: "gscData", label: "Fetching GSC Data", icon: Zap, description: "Loading search console data", optional: true },
    { id: "aiVisibility", label: "Scanning AI Visibility", icon: Sparkles, description: "Checking AI platforms" },
    { id: "recommendations", label: "Generating Recommendations", icon: CheckCircle2, description: "Creating action plan" },
  ];

  const getStepStatus = (stepId: string) => {
    const step = progress.steps[stepId];
    if (!step) return "pending";
    return step.status;
  };

  const getStepPercentage = (stepId: string) => {
    const step = progress.steps[stepId];
    return step?.percentage || 0;
  };

  const getStepLabel = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    return step?.label || stepId;
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Sparkles className="w-8 h-8 text-accent-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Start Intelligence Scan
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        Analyzing your domain for comprehensive intelligence insights
      </p>

      {error ? (
        <div className="mb-8">
          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-1">{error}</h3>
                {errorDetails && (
                  <p className="text-sm text-red-700 mb-3">{errorDetails}</p>
                )}
                {error.includes("GSC") && (
                  <Button
                    onClick={() => router.push("/onboarding?step=2")}
                    variant="primary"
                    size="sm"
                    className="mt-2"
                  >
                    Go to Integrations
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleRetry}
              variant="primary"
              size="lg"
              className="flex-1"
              isLoading={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry Scan"}
            </Button>
            <Button
              onClick={() => router.push("/onboarding?step=1")}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              Go Back
            </Button>
          </div>
        </div>
      ) : isComplete ? (
        <div className="mb-8">
          <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Scan Complete! 🎉
            </h3>
            <p className="text-gray-600">
              Your domain intelligence analysis is ready.
            </p>
          </div>

          {/* Results Summary */}
          {results && (
            <div className="mb-6 space-y-4">
              {/* Key Metrics */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {results.crawl?.totalPages || 0}
                  </div>
                  <div className="text-sm text-gray-600">Pages Crawled</div>
                </div>
                <div className="p-4 bg-secondary-50 rounded-lg">
                  <div className="text-2xl font-bold text-secondary-600 mb-1">
                    {results.seo?.seoScore || 0}
                  </div>
                  <div className="text-sm text-gray-600">SEO Score</div>
                </div>
                <div className="p-4 bg-accent-50 rounded-lg">
                  <div className="text-2xl font-bold text-accent-600 mb-1">
                    {results.keywords?.all?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Keywords Found</div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid md:grid-cols-2 gap-4">
                {results.strengths && results.strengths.length > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Strengths ({results.strengths.length})
                    </h4>
                    <ul className="space-y-1">
                      {results.strengths.slice(0, 5).map((strength, idx) => (
                        <li key={idx} className="text-sm text-green-700">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.weaknesses && results.weaknesses.length > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Areas for Improvement ({results.weaknesses.length})
                    </h4>
                    <ul className="space-y-1">
                      {results.weaknesses.slice(0, 5).map((weakness, idx) => (
                        <li key={idx} className="text-sm text-orange-700">• {weakness}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Geography */}
              {results.geography?.primary && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Primary Geography
                  </h4>
                  <p className="text-sm text-blue-700">
                    {results.geography.primary}
                    {results.geography.secondary && results.geography.secondary.length > 0 && (
                      <span className="ml-2 text-gray-600">
                        (Secondary: {results.geography.secondary.join(", ")})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Toxic Patterns Warning */}
              {results.toxicPatterns && results.toxicPatterns.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Issues Detected ({results.toxicPatterns.length})
                  </h4>
                  <ul className="space-y-1">
                    {results.toxicPatterns.slice(0, 3).map((pattern, idx) => (
                      <li key={idx} className="text-sm text-red-700">• {pattern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top Recommendations */}
              {results.recommendedActions && results.recommendedActions.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">
                    Top Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {results.recommendedActions.slice(0, 3).map((action: any, idx: number) => (
                      <li key={idx} className="text-sm">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mr-2 ${
                          action.priority === "high" 
                            ? "bg-red-100 text-red-700"
                            : action.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {action.priority}
                        </span>
                        <span className="text-purple-700">{action.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleFinish}
            variant="primary"
            size="lg"
            className="w-full"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            View Full Results in Dashboard
          </Button>
        </div>
      ) : (
        <div className="mb-8">
          {/* Overall Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Overall Progress
              </span>
              <span className="text-sm font-medium text-gray-900">
                {Math.round(progress.percentage || 0)}%
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage || 0}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
              />
            </div>
            {progress.currentStep && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {getStepLabel(progress.currentStep)}
              </p>
            )}
          </div>

          {/* Step-by-step Progress */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const stepPercentage = getStepPercentage(step.id);
              const Icon = step.icon;
              const isOptional = step.optional;

              // Skip optional steps if they haven't started
              if (isOptional && status === "pending" && !progress.steps[step.id]) {
                return null;
              }

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 border rounded-lg transition-all ${
                    status === "completed"
                      ? "border-green-200 bg-green-50"
                      : status === "processing"
                      ? "border-primary-200 bg-primary-50"
                      : status === "failed"
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      {status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : status === "processing" ? (
                        <Loader2 className="w-5 h-5 text-primary-500 animate-spin flex-shrink-0" />
                      ) : status === "failed" ? (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      ) : (
                        <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              status === "completed"
                                ? "text-green-700"
                                : status === "processing"
                                ? "text-primary-700"
                                : status === "failed"
                                ? "text-red-700"
                                : "text-gray-500"
                            }`}
                          >
                            {step.label}
                          </span>
                          {isOptional && (
                            <span className="text-xs text-gray-400">(Optional)</span>
                          )}
                        </div>
                        {step.description && status === "processing" && (
                          <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                        )}
                      </div>
                    </div>
                    {status === "processing" && (
                      <span className="text-sm font-medium text-primary-700 ml-2">
                        {stepPercentage}%
                      </span>
                    )}
                  </div>
                  {status === "processing" && (
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stepPercentage}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-primary-500"
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Loading indicator for connection issues */}
          {isScanning && retryCount > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 text-center">
                Checking progress... (Attempt {retryCount + 1})
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
