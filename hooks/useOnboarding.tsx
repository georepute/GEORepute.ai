import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;

interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: number[];
  isOnboardingComplete: boolean;
  setCurrentStep: (step: OnboardingStep) => void;
  completeStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  startOnboarding: () => void;
}

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      completedSteps: [],
      isOnboardingComplete: false,

      setCurrentStep: (step: OnboardingStep) => {
        set({ currentStep: step });
      },

      completeStep: (step: number) => {
        const { completedSteps } = get();
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step] });
        }
      },

      nextStep: () => {
        const { currentStep, completeStep } = get();
        completeStep(currentStep);
        if (currentStep < 4) {
          set({ currentStep: (currentStep + 1) as OnboardingStep });
        } else {
          set({ isOnboardingComplete: true });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: (currentStep - 1) as OnboardingStep });
        }
      },

      skipOnboarding: () => {
        set({ 
          isOnboardingComplete: true,
          completedSteps: [0, 1, 2, 3, 4]
        });
      },

      resetOnboarding: () => {
        set({
          currentStep: 0,
          completedSteps: [],
          isOnboardingComplete: false,
        });
      },

      startOnboarding: () => {
        set({
          currentStep: 0,
          isOnboardingComplete: false,
        });
      },
    }),
    {
      name: "onboarding-storage",
    }
  )
);

