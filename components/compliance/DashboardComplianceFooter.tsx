"use client";

import { useLanguage } from "@/lib/language-context";
import {
  getDisclaimerText,
  getMethodologyDisclaimerTitle,
} from "@/lib/disclaimer";

/**
 * Mandatory GeoRepute compliance block on all dashboard pages (UI).
 */
export function DashboardComplianceFooter() {
  const { language } = useLanguage();
  const loc = language === "he" ? "he" : "en";
  return (
    <div
      className="border-t border-gray-200 bg-gray-50/90 px-4 sm:px-6 lg:px-8 py-3 mt-auto"
      role="note"
      aria-label={getMethodologyDisclaimerTitle(loc)}
    >
      <p className="text-xs font-semibold text-gray-600 mb-1">
        {getMethodologyDisclaimerTitle(loc)}
      </p>
      <p className="text-[11px] leading-relaxed text-gray-500 max-w-4xl">
        {getDisclaimerText(loc)}
      </p>
    </div>
  );
}
