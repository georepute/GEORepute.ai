"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { landingContent } from './landing-content';

type Language = 'en' | 'he';
type TranslationContent = typeof landingContent.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRtl: boolean;
  t: TranslationContent;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

// Helper to get saved language (safe for SSR)
const getSavedLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('preferred-language');
    if (saved === 'he' || saved === 'en') return saved;
  } catch {
    // localStorage not available
  }
  return 'en';
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Initialize with a function to avoid SSR issues
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const savedLang = getSavedLanguage();
    setLanguageState(savedLang);
    setMounted(true);
    
    // Apply direction immediately
    document.documentElement.dir = savedLang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // Save to localStorage
    try {
      localStorage.setItem('preferred-language', lang);
    } catch {
      // localStorage not available
    }
    // Update document direction immediately
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'en' ? 'he' : 'en';
    setLanguage(newLang);
  }, [language, setLanguage]);

  const isRtl = language === 'he';
  const t = landingContent[language];

  // Update document direction when language changes (for any external changes)
  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
    }
  }, [language, isRtl, mounted]);

  // Show children immediately but with default language until hydrated
  // This prevents layout shift while still showing content
  const contextValue = {
    language: mounted ? language : 'en',
    setLanguage,
    toggleLanguage,
    isRtl: mounted ? isRtl : false,
    t: mounted ? t : landingContent.en,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

