"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle, Sparkles } from "lucide-react";
import Button from "@/components/Button";
import { useOnboarding } from "@/hooks/useOnboarding";
import confetti from "canvas-confetti";
import { useEffect } from "react";

export default function Complete() {
  const router = useRouter();
  const { skipOnboarding } = useOnboarding();

  useEffect(() => {
    // Trigger confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const handleFinish = () => {
    skipOnboarding();
    router.push("/dashboard");
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold text-gray-900 mb-4"
      >
        You're All Set! 🎉
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-gray-600 mb-8 max-w-lg mx-auto"
      >
        Your account is ready to go. Let's start optimizing your digital visibility!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-3 gap-4 mb-8"
      >
        {[
          { icon: "📈", label: "Track Rankings", description: "Monitor your positions" },
          { icon: "🎯", label: "Optimize Content", description: "AI-powered suggestions" },
          { icon: "📊", label: "View Reports", description: "Detailed analytics" },
        ].map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="p-4 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl"
          >
            <div className="text-3xl mb-2">{feature.icon}</div>
            <p className="font-semibold text-gray-900 mb-1">{feature.label}</p>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Button onClick={handleFinish} variant="primary" size="lg">
          <Sparkles className="w-5 h-5 mr-2" />
          Go to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}




