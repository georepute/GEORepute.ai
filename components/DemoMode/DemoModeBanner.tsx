"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useState } from "react";

export default function DemoModeBanner() {
  const { isDemoMode, disableDemoMode } = useDemoMode();
  const [isVisible, setIsVisible] = useState(true);

  if (!isDemoMode || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-accent-500 to-primary-500 text-white py-3 px-4 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Demo Mode Active</p>
              <p className="text-sm text-white/90">
                You're viewing sample data. No real changes will be made.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={disableDemoMode}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
            >
              Exit Demo
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}




