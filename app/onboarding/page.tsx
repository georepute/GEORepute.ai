"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/useOnboarding";
import Welcome from "./steps/Welcome";
import SetupProfile from "./steps/SetupProfile";
import ConnectPlatforms from "./steps/ConnectPlatforms";
import FirstKeyword from "./steps/FirstKeyword";
import Complete from "./steps/Complete";
import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const steps = [
  { id: 0, name: "Welcome", component: Welcome },
  { id: 1, name: "Setup Profile", component: SetupProfile },
  { id: 2, name: "Connect Platforms", component: ConnectPlatforms },
  { id: 3, name: "First Keyword", component: FirstKeyword },
  { id: 4, name: "Complete", component: Complete },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { currentStep, completedSteps, skipOnboarding, resetOnboarding } = useOnboarding();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Reset onboarding state for new users
    resetOnboarding();
    
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
  }, [router, resetOnboarding]);

  const CurrentStepComponent = steps[currentStep]?.component || Welcome;

  const handleSkip = () => {
    skipOnboarding();
    router.push("/dashboard");
  };

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Skip for now
            </button>
          </div>
          
          {/* Steps Progress */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: completedSteps.includes(step.id)
                            ? "100%"
                            : currentStep === step.id
                            ? "50%"
                            : "0%",
                        }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-primary-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle2 className="w-5 h-5 text-primary-500" />
                    ) : currentStep === step.id ? (
                      <Circle className="w-5 h-5 text-primary-500 fill-primary-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Step Names */}
          <div className="flex items-center justify-between mt-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-xs font-medium ${
                  completedSteps.includes(step.id)
                    ? "text-primary-600"
                    : currentStep === step.id
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {step.name}
              </div>
            ))}
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

