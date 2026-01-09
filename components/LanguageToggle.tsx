"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function LanguageToggle() {
  const { language, setLanguage, isRtl } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'he' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors group"
      aria-label={isRtl ? 'Switch to English' : 'עבור לעברית'}
    >
      <Globe className="w-4 h-4 text-gray-600 group-hover:text-primary-600 transition-colors" />
      
      <div className="relative flex items-center">
        <div className="w-14 h-7 bg-gray-200 rounded-full relative cursor-pointer">
          <motion.div
            className="absolute top-0.5 w-6 h-6 bg-primary-600 rounded-full shadow-md flex items-center justify-center"
            animate={{ left: isRtl ? '1.75rem' : '0.125rem' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <span className="text-[10px] font-bold text-white">
              {isRtl ? 'עב' : 'EN'}
            </span>
          </motion.div>
          
          <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium transition-opacity ${isRtl ? 'opacity-50' : 'opacity-0'}`}>
            EN
          </span>
          <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium transition-opacity ${isRtl ? 'opacity-0' : 'opacity-50'}`}>
            עב
          </span>
        </div>
      </div>
    </button>
  );
}

