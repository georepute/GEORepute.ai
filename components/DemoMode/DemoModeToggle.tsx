"use client";

import { motion } from "framer-motion";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Eye, EyeOff } from "lucide-react";

export default function DemoModeToggle() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleDemoMode}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        isDemoMode
          ? "bg-accent-100 text-accent-700 hover:bg-accent-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {isDemoMode ? (
        <>
          <Eye className="w-4 h-4" />
          <span>Demo Mode</span>
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4" />
          <span>Live Data</span>
        </>
      )}
    </motion.button>
  );
}




