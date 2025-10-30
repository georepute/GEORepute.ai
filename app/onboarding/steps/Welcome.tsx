"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Sparkles, ArrowRight } from "lucide-react";
import Button from "@/components/Button";

export default function Welcome() {
  const { nextStep } = useOnboarding();

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold text-gray-900 mb-4"
      >
        Welcome to GeoRepute.ai! 🎉
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-gray-600 mb-8 max-w-lg mx-auto"
      >
        Let's get you set up in just a few steps. It'll only take 2 minutes to unlock the power of AI-driven visibility optimization.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-3 gap-4 mb-8"
      >
        {[
          { icon: "🎯", label: "Track Rankings" },
          { icon: "🤖", label: "AI Visibility" },
          { icon: "📊", label: "Analytics" },
        ].map((feature, index) => (
          <div
            key={index}
            className="p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl"
          >
            <div className="text-3xl mb-2">{feature.icon}</div>
            <p className="font-semibold text-gray-900">{feature.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={nextStep} variant="primary" size="lg">
          Get Started <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}




