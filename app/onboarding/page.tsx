"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboarding } from "@/hooks/useOnboarding";
import EnterDomain from "./steps/EnterDomain";
import RegionAndLanguage from "./steps/RegionAndLanguage";
import ConnectDataSources from "./steps/ConnectDataSources";
import StartScan from "./steps/StartScan";
import { CheckCircle2, Circle } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const steps = [
  { id: 0, name: "Enter Domain", component: EnterDomain },
  { id: 1, name: "Region & Language", component: RegionAndLanguage },
  { id: 2, name: "Connect Sources", component: ConnectDataSources },
  { id: 3, name: "Start Scan", component: StartScan },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentStep, resetOnboarding, setCurrentStep } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sync URL step param with state (e.g. when returning from OAuth with Back button)
  const stepFromUrl = searchParams.get("step");
  const urlStep = stepFromUrl !== null ? parseInt(stepFromUrl, 10) : null;
  const isReturningToStep = urlStep === 0 || urlStep === 1 || urlStep === 2 || urlStep === 3;

  useEffect(() => {
    // Check authentication status
    async function checkAuth() {
      try {
        // Small delay to ensure session is loaded
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          router.push("/login");
          return;
        }
        
        if (!session) {
          console.log('No session found, redirecting to login');
          router.push("/login");
          return;
        }
        
        // Check if user has completed onboarding (table may have been removed; see domain_intelligence_jobs)
        try {
          const { data: completedJobs } = await supabase
            .from("domain_intelligence_jobs")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("status", "completed")
            .limit(1);
          if (completedJobs && completedJobs.length > 0) {
            console.log('User has completed onboarding (has completed domain scan), redirecting to dashboard');
            router.push("/dashboard/ai-visibility");
            return;
          }
        } catch (_) {
          // Table may not exist; continue with onboarding
        }

        // If URL has ?step=0|1|2, user is returning (e.g. from OAuth Back) — restore step and do NOT reset
        if (isReturningToStep && urlStep !== null) {
          setCurrentStep(urlStep as 0 | 1 | 2 | 3);
        } else {
          // Fresh load with no step in URL: reset for clean start
          console.log('Resetting onboarding state and clearing localStorage for fresh start');
          resetOnboarding();
          if (typeof window !== "undefined") {
            localStorage.removeItem("onboarding-integrations");
            localStorage.removeItem("onboarding-domain");
            localStorage.removeItem("onboarding-analysis-languages");
            localStorage.removeItem("onboarding-analysis-countries");
            localStorage.removeItem("onboarding-keywords");
            localStorage.removeItem("onboarding-competitors");
            console.log('✅ Cleared onboarding localStorage data');
          }
        }
        
        setIsAuthenticated(true);
        console.log('User authenticated for onboarding:', session.user.email);
      } catch (error) {
        console.error('Error checking session:', error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, resetOnboarding, isReturningToStep, urlStep, setCurrentStep]);

  // Keep URL in sync with current step so Back from OAuth returns to the right step
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const expectedPath = `/onboarding?step=${currentStep}`;
    if (typeof window !== "undefined" && window.location.pathname === "/onboarding") {
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== expectedPath) {
        router.replace(expectedPath);
      }
    }
  }, [currentStep, isAuthenticated, isLoading, router]);

  const CurrentStepComponent = steps[currentStep]?.component || EnterDomain;

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          </div>
          
          {/* Steps Progress - follows current step only so it moves back when user goes back */}
          <div className="flex items-center gap-2">
            {steps.map((step) => {
              const isPast = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={false}
                          animate={{
                            width: isPast ? "100%" : isCurrent ? "50%" : "0%",
                          }}
                          transition={{ duration: 0.3 }}
                          className="h-full bg-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isPast ? (
                        <CheckCircle2 className="w-5 h-5 text-primary-500" />
                      ) : isCurrent ? (
                        <Circle className="w-5 h-5 text-primary-500 fill-primary-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Step Names */}
          <div className="flex items-center justify-between mt-2">
            {steps.map((step) => {
              const isPast = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div
                  key={step.id}
                  className={`text-xs font-medium ${
                    isPast ? "text-primary-600" : isCurrent ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center pt-32 pb-8 px-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
