"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  MapPin,
  Languages,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  Users,
  Building2,
  Search,
  ArrowRight,
  RefreshCw,
  Layers,
  Clock,
  Zap,
  Eye,
  MessageSquare,
  DollarSign,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  Play,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActionPlanDays {
  days30: string[];
  days60: string[];
  days90: string[];
}

interface KeywordCluster {
  cluster: string;
  intent: "informational" | "navigational" | "commercial" | "transactional";
  keywords: string[];
}

interface ContentIdea {
  format: string;
  topic: string;
  platform: string;
  angle: string;
}

interface KPITarget {
  metric: string;
  target: string;
  timeframe: string;
}

interface MarketStrategy {
  summary: string;
  marketSizeEstimate: string;
  priority: "high" | "medium" | "low";
  estimatedReach: string;
  timeToMarket: string;
  opportunities: string[];
  actionPlan: ActionPlanDays;
  keyChannels: string[];
  keywordClusters: KeywordCluster[];
  contentIdeas: ContentIdea[];
  localSEOTactics: string[];
  aiVisibilityTactics: string[];
  contentApproach: string;
  languageConsiderations: string;
  competitiveInsights: string;
  budgetGuidance: string;
  kpiTargets: KPITarget[];
  quickWins: string[];
  generatedAt: string;
}

interface TargetMarket {
  id: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  region: string;
  language: string;
  languageName: string;
  strategy?: MarketStrategy;
  generating: boolean;
}

export interface BusinessDevelopmentViewProps {
  project?: {
    id?: string;
    brand_name: string;
    industry: string;
    website_url?: string;
    company_description?: string;
  } | null;
  intelligenceData?: any;
}

// ─── All Countries (ISO 3166-1) ───────────────────────────────────────────────

const COUNTRIES = [
  { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "CV", name: "Cabo Verde", flag: "🇨🇻" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "CD", name: "Congo (DRC)", flag: "🇨🇩" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", flag: "🇰🇮" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KP", name: "North Korea", flag: "🇰🇵" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "PW", name: "Palau", flag: "🇵🇼" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent and the Grenadines", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "ST", name: "Sao Tome and Principe", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", flag: "🇹🇱" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "he", name: "Hebrew" },
  { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "th", name: "Thai" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "vi", name: "Vietnamese" },
  { code: "uk", name: "Ukrainian" },
  { code: "ro", name: "Romanian" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "el", name: "Greek" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "no", name: "Norwegian" },
  { code: "fa", name: "Persian (Farsi)" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "sw", name: "Swahili" },
  { code: "tl", name: "Filipino (Tagalog)" },
];

const PRIORITY_CONFIG = {
  high: { label: "High Priority", bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  medium: { label: "Medium Priority", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  low: { label: "Low Priority", bg: "bg-green-100", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
};

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-100 text-blue-700",
  navigational: "bg-purple-100 text-purple-700",
  commercial: "bg-amber-100 text-amber-700",
  transactional: "bg-green-100 text-green-700",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function BusinessDevelopmentView({ project, intelligenceData }: BusinessDevelopmentViewProps) {

  const [markets, setMarkets] = useState<TargetMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [customRegion, setCustomRegion] = useState("");
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("en");
  const countryRef = useRef<HTMLDivElement>(null);

  // ─── Load markets from Supabase ────────────────────────────────────────────

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      let query = supabase
        .from("business_dev_markets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (project?.id) {
        query = query.eq("project_id", project.id);
      } else {
        query = query.is("project_id", null);
      }

      const { data, error } = await query;
      if (error) {
        // Table may not yet exist — fall back silently
        console.warn("business_dev_markets:", error.message);
        setLoading(false);
        return;
      }

      setMarkets(
        (data ?? []).map((row) => ({
          id: row.id,
          country: row.country,
          countryCode: row.country_code,
          countryFlag: row.country_flag,
          region: row.region ?? "",
          language: row.language,
          languageName: row.language_name,
          strategy: row.strategy ?? undefined,
          generating: false,
        }))
      );
    } catch (err) {
      console.error("Failed to load markets:", err);
    } finally {
      setLoading(false);
    }
  }, [project?.id, supabase]);

  useEffect(() => { loadMarkets(); }, [loadMarkets]);

  // Click-outside for country dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
    };
    if (isCountryOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isCountryOpen]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countrySearch]);

  const selectedCountry = COUNTRIES.find((c) => c.code === selectedCountryCode);
  const selectedLanguage = LANGUAGES.find((l) => l.code === selectedLanguageCode);

  const stats = useMemo(() => ({
    total: markets.length,
    uniqueCountries: new Set(markets.map((m) => m.countryCode)).size,
    uniqueLanguages: new Set(markets.map((m) => m.language)).size,
    generated: markets.filter((m) => !!m.strategy).length,
  }), [markets]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddMarket = async () => {
    if (!selectedCountryCode) { toast.error("Please select a country"); return; }
    const country = COUNTRIES.find((c) => c.code === selectedCountryCode);
    const lang = LANGUAGES.find((l) => l.code === selectedLanguageCode);
    if (!country || !lang) return;

    if (markets.some((m) => m.countryCode === selectedCountryCode && m.region === customRegion.trim() && m.language === selectedLanguageCode)) {
      toast.error("This market configuration already exists");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in first"); return; }

      const insertData = {
        user_id: user.id,
        project_id: project?.id ?? null,
        country: country.name,
        country_code: country.code,
        country_flag: country.flag,
        region: customRegion.trim(),
        language: lang.code,
        language_name: lang.name,
        strategy: null,
      };

      const { data, error } = await supabase.from("business_dev_markets").insert(insertData).select().single();

      if (error) {
        console.error("Insert error:", error);
        // Fallback to local-only if table doesn't exist
        const localMarket: TargetMarket = {
          id: `local-${Date.now()}`,
          country: country.name,
          countryCode: country.code,
          countryFlag: country.flag,
          region: customRegion.trim(),
          language: lang.code,
          languageName: lang.name,
          generating: false,
        };
        setMarkets((prev) => [...prev, localMarket]);
      } else {
        setMarkets((prev) => [...prev, {
          id: data.id,
          country: data.country,
          countryCode: data.country_code,
          countryFlag: data.country_flag,
          region: data.region ?? "",
          language: data.language,
          languageName: data.language_name,
          generating: false,
        }]);
      }

      setSelectedCountryCode("");
      setCountrySearch("");
      setCustomRegion("");
      setSelectedLanguageCode("en");
      setShowAddForm(false);
      toast.success(`${country.flag} ${country.name} added`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add market");
    }
  };

  const handleRemoveMarket = async (id: string) => {
    setMarkets((prev) => prev.filter((m) => m.id !== id));
    if (!id.startsWith("local-")) {
      await supabase.from("business_dev_markets").delete().eq("id", id);
    }
  };

  const [modalMarket, setModalMarket] = useState<TargetMarket | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalMarket(null);
    };
    if (modalMarket) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalMarket]);

  const handleGenerateStrategy = async (marketId: string) => {
    if (!project) { toast.error("Please select a brand project first"); return; }
    const market = markets.find((m) => m.id === marketId);
    if (!market) return;

    setMarkets((prev) => prev.map((m) => (m.id === marketId ? { ...m, generating: true } : m)));

    try {
      const res = await fetch("/api/geo-core/business-development", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: market.country,
          countryCode: market.countryCode,
          region: market.region,
          language: market.language,
          languageName: market.languageName,
          brandName: project.brand_name,
          industry: project.industry,
          description: project.company_description,
          websiteUrl: project.website_url,
          intelligenceContext: intelligenceData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate strategy");

      // Persist strategy to Supabase
      if (!marketId.startsWith("local-")) {
        await supabase
          .from("business_dev_markets")
          .update({ strategy: data.strategy, updated_at: new Date().toISOString() })
          .eq("id", marketId);
      }

      setMarkets((prev) =>
        prev.map((m) =>
          m.id === marketId ? { ...m, strategy: data.strategy, generating: false } : m
        )
      );
      toast.success(`Strategy saved for ${market.countryFlag} ${market.country}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate strategy");
      setMarkets((prev) => prev.map((m) => (m.id === marketId ? { ...m, generating: false } : m)));
    }
  };

  const handleGenerateAll = async () => {
    const pending = markets.filter((m) => !m.strategy && !m.generating);
    if (!pending.length) { toast("All markets already have strategies"); return; }
    for (const market of pending) await handleGenerateStrategy(market.id);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Business Development</h2>
            </div>
            <p className="text-white/80 text-sm max-w-2xl">
              Define target markets by country, region, and language. Generate AI-powered strategies with
              actionable 30/60/90-day plans, keyword clusters, and channel-specific tactics for each market.
            </p>
          </div>
          {markets.length > 0 && (
            <button
              onClick={handleGenerateAll}
              disabled={markets.every((m) => !!m.strategy || m.generating)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-all border border-white/20 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              Generate All
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Markets", value: stats.total, icon: Globe },
            { label: "Countries", value: stats.uniqueCountries, icon: MapPin },
            { label: "Languages", value: stats.uniqueLanguages, icon: Languages },
            { label: "Strategies", value: `${stats.generated}/${stats.total}`, icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white/10 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/70 text-xs">{label}</span>
              </div>
              <div className="text-xl font-bold">{loading ? "…" : value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* No project warning */}
      {!project && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900 text-sm">No brand project selected</div>
            <p className="text-amber-700 text-xs mt-0.5">Select a brand project above to generate AI strategies.</p>
          </div>
        </div>
      )}

      {/* Add Market Panel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-violet-600" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">Add Target Market</span>
          </div>
          {showAddForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Country — custom searchable dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <div ref={countryRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCountryOpen(!isCountryOpen)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-colors text-left"
                      >
                        {selectedCountry ? (
                          <>
                            <span className="text-lg leading-none">{selectedCountry.flag}</span>
                            <span className="flex-1 text-gray-900 truncate">{selectedCountry.name}</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="flex-1 text-gray-400">Select country…</span>
                          </>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isCountryOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isCountryOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {/* Search input inside dropdown */}
                          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search 195+ countries…"
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                              />
                              {countrySearch && (
                                <button
                                  onClick={() => setCountrySearch("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-52 overflow-y-auto">
                            {filteredCountries.length === 0 ? (
                              <div className="px-3 py-4 text-center text-xs text-gray-400">No countries found</div>
                            ) : (
                              filteredCountries.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCountryCode(c.code);
                                    setCountrySearch("");
                                    setIsCountryOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-violet-50 transition-colors text-left ${selectedCountryCode === c.code ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-700"}`}
                                >
                                  <span className="text-base leading-none w-5 flex-shrink-0">{c.flag}</span>
                                  <span className="flex-1">{c.name}</span>
                                  <span className="text-xs text-gray-400">{c.code}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Region / City <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g. California, London, Tel Aviv"
                        value={customRegion}
                        onChange={(e) => setCustomRegion(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Blank = nationwide strategy</p>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Primary Language <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <select
                        value={selectedLanguageCode}
                        onChange={(e) => setSelectedLanguageCode(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 appearance-none bg-white"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleAddMarket}
                    disabled={!selectedCountryCode}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Market
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setSelectedCountryCode(""); setCountrySearch(""); setCustomRegion(""); setSelectedLanguageCode("en"); }}
                    className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading markets…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && markets.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">No target markets yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
            Add target countries, regions, and languages to generate market-specific business development strategies.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Market
          </button>
        </div>
      )}

      {/* Markets Table */}
      {!loading && markets.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Market</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Region</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Language</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Summary</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Reach</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Time to Market</th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {markets.map((market) => {
                  const priorityConf = market.strategy ? PRIORITY_CONFIG[market.strategy.priority ?? "medium"] : null;
                  return (
                    <tr key={market.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl leading-none">{market.countryFlag}</span>
                          <span className="font-medium text-gray-900 text-sm">{market.country}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">{market.region || "-"}</td>
                      <td className="py-3.5 px-4 text-sm text-gray-600">{market.languageName}</td>
                      <td className="py-3.5 px-4">
                        {priorityConf ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConf.bg} ${priorityConf.text} ${priorityConf.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                            {priorityConf.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px]">
                        {market.strategy ? (
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{market.strategy.summary}</p>
                        ) : (
                          <span className="text-xs text-gray-400">No strategy yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">{market.strategy?.estimatedReach ?? "—"}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">{market.strategy?.timeToMarket ?? "—"}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!market.strategy ? (
                            <button
                              onClick={() => handleGenerateStrategy(market.id)}
                              disabled={market.generating || !project}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              {market.generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Generate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setModalMarket(market)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>
                              <button
                                onClick={() => handleGenerateStrategy(market.id)}
                                disabled={market.generating || !project}
                                className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 text-xs font-medium rounded-lg transition-colors"
                              >
                                {market.generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                Refresh
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleRemoveMarket(market.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Strategy Detail Modal */}
      {modalMarket?.strategy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModalMarket(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{modalMarket.countryFlag}</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{modalMarket.country}</h3>
                  <p className="text-xs text-gray-500">
                    {modalMarket.region || "Nationwide"} · {modalMarket.languageName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMarket(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <StrategyDetail strategy={modalMarket.strategy} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Strategy Detail ──────────────────────────────────────────────────────────

/** Maps content idea format/platform to content generator route + params (same as Action Plans tab) */
function getContentGeneratorRoute(idea: ContentIdea): { path: string; params: URLSearchParams } {
  const platformName = (idea.platform || idea.format || "").toLowerCase();
  let platform = "medium";
  if (platformName.includes("linkedin")) platform = "linkedin";
  else if (platformName.includes("reddit")) platform = "reddit";
  else if (platformName.includes("medium")) platform = "medium";
  else if (platformName.includes("quora")) platform = "quora";
  else if (platformName.includes("blog") || platformName.includes("website") || platformName.includes("shopify") || platformName.includes("wordpress")) platform = "shopify";
  else if (platformName.includes("twitter") || platformName.includes("x")) platform = "medium";
  else if (platformName.includes("instagram")) platform = "instagram";
  else if (platformName.includes("facebook")) platform = "facebook";
  else if (platformName.includes("github")) platform = "github";
  else if (platformName.includes("youtube") || platformName.includes("tiktok")) platform = "medium";

  const isBlog = platform === "shopify" || platformName.includes("blog") || platformName.includes("website") || idea.format?.toLowerCase().includes("blog");
  const contentType = isBlog ? "blog_article" : platform === "linkedin" ? "linkedin_post" : "post";

  const params = new URLSearchParams();
  params.append("topic", idea.topic || "");
  params.append("platform", platform);
  params.append("contentType", contentType);

  return { path: isBlog ? "/dashboard/blog" : "/dashboard/content-generator", params };
}

function StrategyDetail({ strategy }: { strategy: MarketStrategy }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "keywords" | "content">("overview");

  const handleGenerateContent = (idea: ContentIdea) => {
    const { path, params } = getContentGeneratorRoute(idea);
    router.push(`${path}?${params.toString()}`);
    toast.success("Opening content generator…");
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Target },
    { id: "keywords" as const, label: "Keywords", icon: Search },
    { id: "content" as const, label: "Content", icon: FileText },
  ];

  return (
    <div className="border-t border-gray-100 bg-gray-50/50">
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-gray-200 px-5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                isActive ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div>
              <SectionLabel icon={Target} label="Strategic Summary" />
              <p className="text-sm text-gray-700 leading-relaxed">{strategy.summary}</p>
            </div>

            {strategy.marketSizeEstimate && (
              <div className="bg-violet-50 border border-violet-100 rounded-lg px-4 py-3">
                <div className="text-xs font-semibold text-violet-700 mb-0.5">Market Size</div>
                <p className="text-sm text-violet-900">{strategy.marketSizeEstimate}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <SectionLabel icon={TrendingUp} label="Opportunities" />
                <ol className="space-y-2">
                  {strategy.opportunities?.map((opp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">{i + 1}</span>
                      {opp}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <SectionLabel icon={Layers} label="Key Channels" />
                <ul className="space-y-2">
                  {strategy.keyChannels?.map((ch, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <ArrowRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                      {ch}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {strategy.contentApproach && (
                <div>
                  <SectionLabel icon={MessageSquare} label="Content Approach" />
                  <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg p-3">{strategy.contentApproach}</p>
                </div>
              )}
              {strategy.languageConsiderations && (
                <div>
                  <SectionLabel icon={Languages} label="Language Considerations" />
                  <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg p-3">{strategy.languageConsiderations}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {strategy.competitiveInsights && (
                <div>
                  <SectionLabel icon={Users} label="Competitive Insights" />
                  <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg p-3">{strategy.competitiveInsights}</p>
                </div>
              )}
              {strategy.budgetGuidance && (
                <div>
                  <SectionLabel icon={DollarSign} label="Budget Guidance" />
                  <p className="text-xs text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg p-3">{strategy.budgetGuidance}</p>
                </div>
              )}
            </div>

            {strategy.quickWins?.length > 0 && (
              <div>
                <SectionLabel icon={Zap} label="Quick Wins (do today)" color="text-amber-500" />
                <div className="space-y-1.5">
                  {strategy.quickWins.map((win, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-amber-900">{win}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <SectionLabel icon={Search} label="Local SEO Tactics" />
                <ul className="space-y-1.5">
                  {strategy.localSEOTactics?.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />{t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <SectionLabel icon={Zap} label="AI Visibility Tactics" />
                <ul className="space-y-1.5">
                  {strategy.aiVisibilityTactics?.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />{t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Keywords tab */}
        {activeTab === "keywords" && (
          <div className="space-y-4">
            {strategy.keywordClusters?.map((cluster, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-800">{cluster.cluster}</span>
                  {cluster.intent && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${INTENT_COLORS[cluster.intent] ?? "bg-gray-100 text-gray-600"}`}>
                      {cluster.intent}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  {cluster.keywords?.map((kw, j) => (
                    <span key={j} className="px-2.5 py-1 bg-violet-50 text-violet-800 border border-violet-100 text-xs rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {!strategy.keywordClusters?.length && (
              <p className="text-sm text-gray-400 text-center py-6">No keyword clusters in this strategy</p>
            )}
          </div>
        )}

        {/* Content Ideas tab */}
        {activeTab === "content" && (
          <div className="space-y-3">
            {strategy.contentIdeas?.map((idea, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                        {idea.format}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">
                        {idea.platform}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{idea.topic}</p>
                    {idea.angle && (
                      <p className="text-xs text-gray-500 mt-1">{idea.angle}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleGenerateContent(idea)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Generate Content
                  </button>
                </div>
              </div>
            ))}
            {!strategy.contentIdeas?.length && (
              <p className="text-sm text-gray-400 text-center py-6">No content ideas in this strategy</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Reach: <strong className="text-gray-600">{strategy.estimatedReach}</strong>
            <span className="mx-1">·</span>
            <Clock className="w-3 h-3" />
            <strong className="text-gray-600">{strategy.timeToMarket}</strong>
          </span>
          <span>Generated {new Date(strategy.generatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label, color = "text-gray-500" }: { icon: any; label: string; color?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-2 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}
