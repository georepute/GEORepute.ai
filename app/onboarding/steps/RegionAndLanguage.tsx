"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { MapPin, Languages, ArrowRight, MapPinned } from "lucide-react";
import Button from "@/components/Button";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

// Same options as AI Visibility for consistency
const ANALYSIS_LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "he", label: "Hebrew" },
  { value: "ur", label: "Urdu" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

const ANALYSIS_COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "IE", label: "Ireland" },
  { value: "NZ", label: "New Zealand" },
  { value: "ZA", label: "South Africa" },
  { value: "IN", label: "India" },
  { value: "PK", label: "Pakistan" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BE", label: "Belgium" },
  { value: "AT", label: "Austria" },
  { value: "CH", label: "Switzerland" },
  { value: "PL", label: "Poland" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PT", label: "Portugal" },
  { value: "GR", label: "Greece" },
  { value: "IL", label: "Israel" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "AR", label: "Argentina" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "KR", label: "South Korea" },
  { value: "SG", label: "Singapore" },
  { value: "MY", label: "Malaysia" },
  { value: "EU", label: "European Union (general)" },
];

const STORAGE_KEY_LANGUAGES = "onboarding-analysis-languages";
const STORAGE_KEY_COUNTRIES = "onboarding-analysis-countries";

export default function RegionAndLanguage() {
  const { nextStep } = useOnboarding();
  const [mapUrl, setMapUrl] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [analysisLanguages, setAnalysisLanguages] = useState<string[]>(["en-US"]);
  const [analysisCountries, setAnalysisCountries] = useState<string[]>(["US"]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LANGUAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) setAnalysisLanguages(parsed);
      }
      const storedCountries = localStorage.getItem(STORAGE_KEY_COUNTRIES);
      if (storedCountries) {
        const parsed = JSON.parse(storedCountries);
        if (Array.isArray(parsed) && parsed.length > 0) setAnalysisCountries(parsed);
      }
    } catch (_) {}
  }, []);

  const addLanguage = (value: string) => {
    if (!value || analysisLanguages.includes(value)) return;
    setAnalysisLanguages((prev) => [...prev, value]);
  };

  const removeLanguage = (value: string) => {
    setAnalysisLanguages((prev) => prev.filter((v) => v !== value));
  };

  const addCountry = (value: string) => {
    if (!value || analysisCountries.includes(value)) return;
    setAnalysisCountries((prev) => [...prev, value]);
  };

  const removeCountry = (value: string) => {
    setAnalysisCountries((prev) => prev.filter((v) => v !== value));
  };

  const handleContinue = async () => {
    if (analysisLanguages.length === 0 || analysisCountries.length === 0) return;

    if (mapUrl.trim()) {
      setSavingLocation(true);
      try {
        const res = await fetch("/api/integrations/google-maps/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mapUrl: mapUrl.trim(),
            placeId: null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || data.details || "Could not save company location. Check the map URL.");
          setSavingLocation(false);
          return;
        }
        toast.success("Company location saved. You can manage it in Assets Hub → Google Maps.");
      } catch (err: unknown) {
        toast.error("Failed to save company location. You can add it later in Assets Hub.");
        setSavingLocation(false);
        return;
      }
      setSavingLocation(false);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LANGUAGES, JSON.stringify(analysisLanguages));
      localStorage.setItem(STORAGE_KEY_COUNTRIES, JSON.stringify(analysisCountries));
    }
    nextStep();
  };

  return (
    <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <MapPin className="w-8 h-8 text-primary-600" />
      </motion.div>

      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        Region & Language
      </h2>
      <p className="text-gray-600 mb-8 text-center">
        Add your company location, then choose languages and regions for your visibility analysis.
      </p>

      <div className="space-y-8">
        {/* Company location – same table as Assets Hub > Google Maps */}
        <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
            <MapPinned className="w-5 h-5 text-primary-600" />
            <label className="block text-sm font-medium text-gray-700">
              Company location
            </label>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            To improve clarity, accuracy, and relevance in information retrieval and interpretation.
          </p>
          <input
            type="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-5 h-5 text-primary-600" />
            <label className="block text-sm font-medium text-gray-700">
              Languages for analysis
            </label>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Track your brand visibility in these languages.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {analysisLanguages.map((code) => {
              const opt = ANALYSIS_LANGUAGE_OPTIONS.find((o) => o.value === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-800 rounded-lg text-sm"
                >
                  {opt?.label ?? code}
                  <button
                    type="button"
                    onClick={() => removeLanguage(code)}
                    className="hover:bg-primary-200 rounded p-0.5"
                    aria-label={`Remove ${opt?.label ?? code}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              addLanguage(e.target.value);
              e.target.value = "";
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Add a language...</option>
            {ANALYSIS_LANGUAGE_OPTIONS.filter((o) => !analysisLanguages.includes(o.value)).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-primary-600" />
            <label className="block text-sm font-medium text-gray-700">
              Regions / countries
            </label>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Generate geography-specific queries for these regions.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {analysisCountries.map((code) => {
              const opt = ANALYSIS_COUNTRY_OPTIONS.find((o) => o.value === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-800 rounded-lg text-sm"
                >
                  {opt?.label ?? code}
                  <button
                    type="button"
                    onClick={() => removeCountry(code)}
                    className="hover:bg-primary-200 rounded p-0.5"
                    aria-label={`Remove ${opt?.label ?? code}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              addCountry(e.target.value);
              e.target.value = "";
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Add a region...</option>
            {ANALYSIS_COUNTRY_OPTIONS.filter((o) => !analysisCountries.includes(o.value)).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={handleContinue}
          variant="primary"
          size="lg"
          className="w-full"
          disabled={analysisLanguages.length === 0 || analysisCountries.length === 0 || savingLocation}
          isLoading={savingLocation}
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
