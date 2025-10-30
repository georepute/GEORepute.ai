"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Link2, ArrowRight, CheckCircle } from "lucide-react";
import Button from "@/components/Button";
import { useState } from "react";

const platforms = [
  { id: "google", name: "Google Search Console", icon: "🔍", connected: false },
  { id: "analytics", name: "Google Analytics", icon: "📊", connected: false },
  { id: "openai", name: "OpenAI API", icon: "🤖", connected: false },
];

export default function ConnectPlatforms() {
  const { nextStep } = useOnboarding();
  const [connected, setConnected] = useState<string[]>([]);

  const togglePlatform = (id: string) => {
    setConnected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Link2 className="w-8 h-8 text-secondary-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Connect Your Platforms
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        Link your accounts to start tracking (you can do this later)
      </p>

      <div className="space-y-4 mb-8">
        {platforms.map((platform, index) => (
          <motion.button
            key={platform.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => togglePlatform(platform.id)}
            className={`w-full p-4 border-2 rounded-xl flex items-center justify-between transition-all ${
              connected.includes(platform.id)
                ? "border-secondary-500 bg-secondary-50"
                : "border-gray-200 hover:border-secondary-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{platform.icon}</span>
              <span className="font-semibold text-gray-900">{platform.name}</span>
            </div>
            {connected.includes(platform.id) && (
              <CheckCircle className="w-6 h-6 text-secondary-600" />
            )}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={nextStep} variant="outline" className="flex-1">
          Skip for now
        </Button>
        <Button onClick={nextStep} variant="primary" className="flex-1">
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}




