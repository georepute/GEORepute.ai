"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as demoData from '@/lib/demo/demoData';

interface DemoModeState {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
}

export const useDemoModeStore = create<DemoModeState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),
      enableDemoMode: () => set({ isDemoMode: true }),
      disableDemoMode: () => set({ isDemoMode: false }),
    }),
    {
      name: 'demo-mode-storage',
    }
  )
);

export function useDemoMode() {
  const { isDemoMode, toggleDemoMode, enableDemoMode, disableDemoMode } = useDemoModeStore();

  return {
    isDemoMode,
    toggleDemoMode,
    enableDemoMode,
    disableDemoMode,
    demoData,
  };
}




