"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Target, ArrowRight, Plus, X } from "lucide-react";
import Button from "@/components/Button";
import { useState } from "react";

export default function FirstKeyword() {
  const { nextStep } = useOnboarding();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  const addKeyword = () => {
    if (inputValue.trim() && keywords.length < 5) {
      setKeywords([...keywords, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <Target className="w-8 h-8 text-accent-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Add Your First Keywords
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        What keywords do you want to track? (Add up to 5)
      </p>

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addKeyword()}
            placeholder="e.g., AI SEO tools"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-all"
            disabled={keywords.length >= 5}
          />
          <Button
            onClick={addKeyword}
            variant="primary"
            disabled={!inputValue.trim() || keywords.length >= 5}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {keywords.length}/5 keywords added
        </p>
      </div>

      <div className="space-y-2 mb-8 min-h-[120px]">
        {keywords.map((keyword, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 bg-accent-50 rounded-lg"
          >
            <span className="font-medium text-gray-900">{keyword}</span>
            <button
              onClick={() => removeKeyword(index)}
              className="p-1 hover:bg-accent-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={nextStep} variant="outline" className="flex-1">
          Skip for now
        </Button>
        <Button
          onClick={nextStep}
          variant="primary"
          className="flex-1"
          disabled={keywords.length === 0}
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}




