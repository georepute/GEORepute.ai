"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Layers, CheckCircle, X, ChevronRight, Globe, Send, ArrowRight, Code2 } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ImageUpload from "@/components/ImageUpload";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";
import { supabase } from "@/lib/supabase/client";

type DetectionResult = {
  highlightedHtml?: string;
  topPhrases?: Array<{ phrase: string; confidence: number; reason: string }>;
  metrics?: { burstiness?: number; clichés?: number; avgSentenceLength?: number };
  summary?: string;
};

type ResultItem = {
  platform: string;
  contentId: string | null;
  generatedContent?: string;
  humanizedContent?: string;
  aiPercentage?: number;
  detectionResult?: DetectionResult;
  error?: string;
  imageUrl?: string;
};

const PLATFORMS = [
  { value: "reddit", label: "Reddit", icon: "/reddit-icon.svg" },
  { value: "quora", label: "Quora", icon: "/quora.svg" },
  { value: "medium", label: "Medium", icon: "/medium-square.svg" },
  { value: "github", label: "GitHub", icon: "/github-142.svg" },
  { value: "facebook", label: "Facebook", icon: "/facebook-color.svg" },
  { value: "linkedin", label: "LinkedIn", icon: "/linkedin.svg" },
  { value: "instagram", label: "Instagram", icon: "/instagram-1-svgrepo-com.svg" },
  { value: "x", label: "X", icon: "/x-icon.svg" },
];

export default function MultiplePlatformPage() {
  const { t, isRtl } = useLanguage();
  const router = useRouter();
  const cg = t.dashboard?.contentGeneratorPage ?? {};
  const [topic, setTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]);
  const [language, setLanguage] = useState<"en" | "he" | "ar" | "fr">("en");
  const [influenceLevel, setInfluenceLevel] = useState<"subtle" | "moderate" | "strong">("subtle");
  const [brandVoices, setBrandVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [multiPlatformResults, setMultiPlatformResults] = useState<ResultItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [contentModal, setContentModal] = useState<ResultItem | null>(null);
  const [comparisonHumanized, setComparisonHumanized] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ResultItem | null>(null);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [platformsUserChoseContent, setPlatformsUserChoseContent] = useState<Set<string>>(new Set());
  const [savingImage, setSavingImage] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSelectedPlatforms, setPublishSelectedPlatforms] = useState<string[]>([]);

  const platformsWithContent = multiPlatformResults.filter(
    (r) => !r.error && ((r.humanizedContent ?? r.generatedContent)?.trim() ?? "").length > 0
  );

  const openPublishModal = () => {
    setPublishSelectedPlatforms(platformsWithContent.map((r) => r.platform));
    setShowPublishModal(true);
  };

  const handleApprovePublish = () => {
    const selected = multiPlatformResults.filter(
      (r) => publishSelectedPlatforms.includes(r.platform) && r.contentId
    );
    const contentIds = selected.map((r) => r.contentId).filter(Boolean) as string[];
    if (contentIds.length > 0) {
      try {
        sessionStorage.setItem(
          "multiPlatformContentToPublish",
          JSON.stringify({ contentIds, fromMulti: true })
        );
      } catch (_) {}
    }
    setShowPublishModal(false);
    router.push("/dashboard/content" + (contentIds.length > 0 ? `?fromMulti=1&contentIds=${contentIds.join(",")}` : ""));
  };

  const savePlatformImageUrl = async (platform: string, contentId: string | null, url: string) => {
    setMultiPlatformResults((prev) =>
      prev.map((r) => (r.platform === platform ? { ...r, imageUrl: url || undefined } : r))
    );
    if (contentModal?.platform === platform) {
      setContentModal((prev) => (prev ? { ...prev, imageUrl: url || undefined } : null));
    }
    if (!contentId) return;
    setSavingImage(true);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from("content_strategy")
        .select("metadata")
        .eq("id", contentId)
        .single();
      if (fetchErr || !row) {
        console.error("Error fetching content_strategy for image save:", fetchErr);
        return;
      }
      const metadata = (row.metadata as Record<string, unknown>) || {};
      const next = url
        ? { ...metadata, imageUrl: url }
        : (() => {
            const { imageUrl: _omit, ...rest } = metadata;
            return rest;
          })();
      const { error: updateErr } = await supabase
        .from("content_strategy")
        .update({ metadata: next })
        .eq("id", contentId);
      if (updateErr) console.error("Error saving image URL to content_strategy:", updateErr);
      else if (url) toast.success(cg.imageUploaded ?? "Image saved for this platform.");
    } finally {
      setSavingImage(false);
    }
  };

  const runMakeItHuman = async (result: ResultItem) => {
    const originalText = result.generatedContent ?? result.humanizedContent ?? "";
    if (!originalText.trim()) {
      toast.error(cg.noContentToHumanize ?? "No content to humanize");
      return;
    }
    setIsHumanizing(true);
    setComparisonHumanized(null);
    setComparisonResult(null);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (!supabaseUrl || !supabaseAnonKey) {
        toast.error("Supabase configuration missing.");
        return;
      }
      let topPhrases: string[] = [];
      const detectRes = await fetch(`${supabaseUrl}/functions/v1/detect-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ text: originalText, language: language }),
      });
      if (detectRes.ok) {
        const detectData = await detectRes.json();
        const data = detectData.data || detectData.result || detectData;
        topPhrases = (data?.topPhrases || detectData?.topPhrases || []).map((p: any) =>
          typeof p === "string" ? p : p?.phrase
        );
      }
      const humanRes = await fetch(`${supabaseUrl}/functions/v1/make-it-human`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({
          text: originalText,
          detectedPhrases: topPhrases,
          passes: 5,
          language: language,
        }),
      });
      if (!humanRes.ok) {
        toast.error(cg.diagnosticFailed ?? "Humanization failed");
        return;
      }
      const humanData = await humanRes.json();
      if (humanData?.humanVersion) {
        setComparisonHumanized(humanData.humanVersion);
        setComparisonResult(result);
        toast.success(cg.contentHumanized ?? "Content humanized");
      } else {
        toast.error(cg.noContentToHumanize ?? "No humanized content returned");
      }
    } catch (err: any) {
      toast.error(err?.message ?? (cg.diagnosticFailed ?? "Request failed"));
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleUseOriginal = () => {
    if (comparisonResult) {
      setPlatformsUserChoseContent((prev) => new Set(prev).add(comparisonResult.platform));
    }
    setComparisonHumanized(null);
    setComparisonResult(null);
  };

  const handleUseHumanized = () => {
    if (!comparisonResult || !comparisonHumanized) return;
    setPlatformsUserChoseContent((prev) => new Set(prev).add(comparisonResult!.platform));
    setMultiPlatformResults((prev) =>
      prev.map((r) =>
        r.platform === comparisonResult.platform ? { ...r, humanizedContent: comparisonHumanized } : r
      )
    );
    if (contentModal?.platform === comparisonResult.platform) {
      setContentModal((prev) =>
        prev ? { ...prev, humanizedContent: comparisonHumanized ?? undefined } : null
      );
    }
    if (comparisonResult.contentId) {
      supabase
        .from("content_strategy")
        .update({ generated_content: comparisonHumanized })
        .eq("id", comparisonResult.contentId)
        .then(({ error }) => {
          if (error) console.error("Error saving humanized content:", error);
          else toast.success(cg.usingHumanized ?? "Using humanized version");
        });
    }
    setComparisonHumanized(null);
    setComparisonResult(null);
  };

  useEffect(() => {
    const loadBrandVoices = async () => {
      setLoadingVoices(true);
      try {
        const response = await fetch("/api/brand-voice");
        if (response.ok) {
          const data = await response.json();
          setBrandVoices(data.voices || []);
          const defaultVoice = data.voices?.find((v: any) => v.is_default);
          if (defaultVoice) setSelectedVoiceId(defaultVoice.id);
        }
      } catch (error) {
        console.error("Error loading brand voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };
    loadBrandVoices();
  }, []);

  const generateForAllPlatforms = async () => {
    if (!topic.trim()) {
      toast.error(cg.enterTopic ?? "Please enter a topic");
      return;
    }
    const keywords = targetKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      toast.error(cg.enterKeyword ?? "Please enter at least one keyword");
      return;
    }
    if (targetPlatforms.length === 0) {
      toast.error(cg.selectPlatform ?? "Please select at least one platform");
      return;
    }
    setGenerating(true);
    setMultiPlatformResults([]);
    setPlatformsUserChoseContent(new Set());
    try {
      const response = await fetch("/api/geo-core/content-generate-multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          targetKeywords: keywords,
          targetPlatforms,
          language,
          influenceLevel: influenceLevel || "subtle",
          brandVoiceId: selectedVoiceId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error ?? (cg.diagnosticFailed ?? "Request failed"));
        return;
      }
      setMultiPlatformResults(
        (data.results || []).map((r: any) => ({
          platform: r.platform,
          contentId: r.contentId ?? null,
          generatedContent: r.generatedContent ?? r.humanizedContent ?? "",
          humanizedContent: r.humanizedContent,
          aiPercentage: r.aiPercentage,
          detectionResult: r.detectionResult,
          error: r.error,
          imageUrl: r.imageUrl,
        }))
      );
      if (data.errors?.length) {
        toast.error(cg.multiPlatformPartialError ?? "Some platforms failed. Check results below.");
      } else {
        toast.success(cg.multiPlatformSuccess ?? "Content generated for all platforms.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? (cg.diagnosticFailed ?? "Request failed"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {cg.multiPlatformTitle ?? "Generate for all platforms"}
              </h1>
              <p className="text-gray-600">
                {cg.multiPlatformDesc ?? "Generate one content per selected platform in each platform's tone, then run AI detection and humanization for each."}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {cg.contentConfig ?? "Content Configuration"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {cg.topicQuestion ?? "Topic / Question"}
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={cg.topicPlaceholder ?? "e.g., How to improve YouTube SEO"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {cg.targetKeywords ?? "Target Keywords (comma-separated)"}
                </label>
                <input
                  value={targetKeywords}
                  onChange={(e) => setTargetKeywords(e.target.value)}
                  placeholder={cg.keywordsPlaceholder ?? "e.g., youtube seo, video optimization"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {cg.generateContentIn ?? "Generate content in"}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "he" | "ar" | "fr")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="en">{cg.english ?? "English"}</option>
                  <option value="he">{cg.hebrew ?? "Hebrew"}</option>
                  <option value="ar">{cg.arabic ?? "Arabic"}</option>
                  <option value="fr">{cg.french ?? "French"}</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {cg.brandVoiceProfile ?? "Brand Voice Profile (Optional)"}
                  </label>
                  <Link
                    href="/dashboard/settings?tab=brand-voice"
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {cg.createNew ?? "+ Create New"}
                  </Link>
                </div>
                <select
                  value={selectedVoiceId || ""}
                  onChange={(e) => setSelectedVoiceId(e.target.value || null)}
                  disabled={loadingVoices}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{cg.noVoiceProfile ?? "No voice profile (generic)"}</option>
                  {brandVoices.map((voice: any) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.brand_name} - {voice.tone}
                      {voice.is_default ? " ⭐" : ""}
                    </option>
                  ))}
                </select>
                {selectedVoiceId && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900 font-semibold mb-1">
                      🎭 {cg.brandVoiceActive ?? "Brand Voice Active"}
                    </p>
                    <p className="text-xs text-blue-700">
                      {cg.contentWillMaintain ?? "Content will maintain consistent"}
                      {brandVoices.find((v: any) => v.id === selectedVoiceId)?.brand_name}{" "}
                      {cg.personality ?? "personality"}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {cg.targetPlatforms ?? "Target Platforms"}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {cg.targetPlatformsDesc ?? "Select one or more. One content will be generated per platform."}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => {
                    const isSelected = targetPlatforms.includes(p.value);
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() =>
                          setTargetPlatforms((prev) =>
                            prev.includes(p.value)
                              ? prev.filter((x) => x !== p.value)
                              : [...prev, p.value]
                          )
                        }
                        className={`p-3 rounded-lg border-2 text-left flex items-center gap-2 ${
                          isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image src={p.icon} alt={p.label} width={24} height={24} className="w-6 h-6" />
                        <span className="font-medium text-sm">{p.label}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-primary-600 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                onClick={generateForAllPlatforms}
                disabled={generating || !topic.trim() || !targetKeywords.trim() || targetPlatforms.length === 0}
                className="w-full"
                variant="primary"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {cg.multiPlatformGenerating ?? "Generating for all platforms..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {cg.multiPlatformButton ?? "Generate for all platforms"}
                  </>
                )}
              </Button>
            </div>
          </Card>

          <div>
            <Card className="bg-white min-h-[400px]">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {cg.multiPlatformResultsTitle ?? "Generated content by platform"}
              </h2>
              {multiPlatformResults.length === 0 && !generating && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <Layers className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm">Fill in the form and click Generate to see results here.</p>
                </div>
              )}
              {generating && multiPlatformResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-3" />
                  <p className="text-gray-600">Generating content for each platform...</p>
                </div>
              )}
              {multiPlatformResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {multiPlatformResults.map((r) => {
                    const platformInfo = PLATFORMS.find((p) => p.value === r.platform) ?? {
                      label: r.platform,
                      icon: "",
                    };
                    const displayContent = r.humanizedContent ?? r.generatedContent;
                    const hasContent = !r.error && (displayContent?.trim() ?? "").length > 0;
                    return (
                      <button
                        key={r.platform}
                        type="button"
                        onClick={() => setContentModal(r)}
                        className="widget-badge group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-primary-400 hover:bg-primary-50/50 transition-all text-left"
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 group-hover:bg-primary-100 transition-colors">
                          {platformInfo.icon ? (
                            <Image
                              src={platformInfo.icon}
                              alt={platformInfo.label}
                              width={28}
                              height={28}
                              className="w-7 h-7"
                            />
                          ) : (
                            <Layers className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <span className="font-semibold text-gray-900 capitalize text-sm">
                          {platformInfo.label}
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {r.aiPercentage != null && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                r.aiPercentage > 50
                                  ? "bg-red-100 text-red-700"
                                  : r.aiPercentage > 20
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-green-100 text-green-700"
                              }`}
                              title={cg.aiDetection ?? "AI detection result"}
                            >
                              {cg.aiDetected ? `${r.aiPercentage}${cg.aiDetected}` : `${r.aiPercentage}% AI`}
                            </span>
                          )}
                          {r.error && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              Error
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5">
                          {hasContent ? (cg.view ?? "View") : ""}
                          {hasContent && <ChevronRight className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {multiPlatformResults.length > 0 && platformsWithContent.length > 0 && (
                <button
                  type="button"
                  onClick={openPublishModal}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-5 flex items-center justify-between gap-4 shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-semibold">
                        {cg.readyToPublish ?? "Ready to Publish?"}
                      </p>
                      <p className="text-sm text-white/90">
                        {cg.readyToPublishDesc ?? "Select platforms and create schema for each, then publish"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 flex-shrink-0" />
                </button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Publish modal: Select Publishing Platforms */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPublishModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-6 h-6 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {cg.selectPublishingPlatforms ?? "Select Publishing Platforms"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {cg.selectPublishingPlatformsDesc ??
                  "One schema and one draft will be created per platform. Each platform has its own content, image, and schema."}
              </p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {platformsWithContent.map((r) => {
                  const info = PLATFORMS.find((p) => p.value === r.platform) ?? {
                    label: r.platform,
                    icon: "",
                  };
                  const isSelected = publishSelectedPlatforms.includes(r.platform);
                  return (
                    <button
                      key={r.platform}
                      type="button"
                      onClick={() =>
                        setPublishSelectedPlatforms((prev) =>
                          isSelected ? prev.filter((p) => p !== r.platform) : [...prev, r.platform]
                        )
                      }
                      className={`p-4 rounded-xl border-2 text-left flex flex-col items-center gap-2 transition-all ${
                        isSelected
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        {info.icon ? (
                          <Image src={info.icon} alt={info.label} width={28} height={28} className="w-7 h-7" />
                        ) : (
                          <Layers className="w-6 h-6 text-gray-500" />
                        )}
                        {isSelected && (
                          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-sm text-gray-900 capitalize">{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <span className="text-sm text-gray-600">
                {publishSelectedPlatforms.length} {cg.platformsSelected ?? "platform(s) selected"}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setShowPublishModal(false)}>
                  {cg.cancel ?? "Cancel"}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApprovePublish}
                  disabled={publishSelectedPlatforms.length === 0}
                  className="flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4" />
                  {cg.approveAndGenerateSchemas ?? "Approve & Generate Schemas"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: full generated content when user clicks a platform widget */}
      {contentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setContentModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                {(() => {
                  const info = PLATFORMS.find((p) => p.value === contentModal.platform);
                  return info?.icon ? (
                    <Image src={info.icon} alt={info.label} width={24} height={24} className="w-6 h-6" />
                  ) : null;
                })()}
                <span className="font-semibold text-gray-900 capitalize">
                  {PLATFORMS.find((p) => p.value === contentModal.platform)?.label ?? contentModal.platform}
                </span>
                {contentModal.aiPercentage != null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      contentModal.aiPercentage > 50
                        ? "bg-red-100 text-red-700"
                        : contentModal.aiPercentage > 20
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {contentModal.aiPercentage}% AI
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setContentModal(null)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {platformsUserChoseContent.has(contentModal.platform) ? (
                /* User already chose content: show only selected content + image upload + Okay to close */
                <>
                  {contentModal.error ? (
                    <p className="text-red-600 text-sm">{contentModal.error}</p>
                  ) : (contentModal.humanizedContent ?? contentModal.generatedContent) ? (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                      {contentModal.humanizedContent ?? contentModal.generatedContent}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No content.</p>
                  )}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {cg.uploadImageForPlatform ?? "Image for this platform"}
                    </p>
                    <ImageUpload
                      key={contentModal.platform}
                      currentImageUrl={contentModal.imageUrl}
                      onImageUploaded={(url) =>
                        savePlatformImageUrl(contentModal.platform, contentModal.contentId, url)
                      }
                      maxSizeMB={20}
                      className="mt-2"
                    />
                    {savingImage && (
                      <p className="text-xs text-gray-500 mt-2">{cg.saving ?? "Saving..."}</p>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-200 flex justify-end">
                    <Button variant="primary" onClick={() => setContentModal(null)}>
                      {cg.ok ?? "Okay"}
                    </Button>
                  </div>
                </>
              ) : (
                /* Before choice: show AI detection, highlights, metrics, phrases, Make it humanized */
                <>
                  {/* AI detection result summary */}
                  {contentModal.aiPercentage != null && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {cg.aiDetection ?? "AI detection result"}
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        <span
                          className={
                            contentModal.aiPercentage > 50
                              ? "text-red-700"
                              : contentModal.aiPercentage > 20
                                ? "text-yellow-700"
                                : "text-green-700"
                          }
                        >
                          {contentModal.aiPercentage}% {cg.ai ?? "AI"} detected
                        </span>
                      </p>
                      {contentModal.detectionResult?.summary && (
                        <p className="text-xs text-gray-600 mt-1">{contentModal.detectionResult.summary}</p>
                      )}
                    </div>
                  )}

                  {/* Content: highlighted when showing original and we have detection HTML */}
                  {contentModal.error ? (
                    <p className="text-red-600 text-sm">{contentModal.error}</p>
                  ) : (contentModal.humanizedContent ?? contentModal.generatedContent) ? (
                    <>
                      {!contentModal.humanizedContent &&
                      contentModal.detectionResult?.highlightedHtml &&
                      contentModal.generatedContent ? (
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed rounded-lg border border-gray-200 p-4 bg-gray-50"
                          dangerouslySetInnerHTML={{ __html: contentModal.detectionResult.highlightedHtml }}
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {contentModal.humanizedContent ?? contentModal.generatedContent}
                        </div>
                      )}
                      {contentModal.detectionResult?.highlightedHtml && !contentModal.humanizedContent && (
                        <style jsx>{`
                          :global(.gltr-red) {
                            background-color: #fee2e2;
                            padding: 2px 4px;
                            border-radius: 3px;
                            cursor: help;
                          }
                          :global(.gltr-yellow) {
                            background-color: #fef3c7;
                            padding: 2px 4px;
                            border-radius: 3px;
                            cursor: help;
                          }
                          :global(.gltr-green) {
                            background-color: #d1fae5;
                            padding: 2px 4px;
                            border-radius: 3px;
                            cursor: help;
                          }
                        `}</style>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">No content.</p>
                  )}

                  {/* Metrics + Detected AI Phrases */}
                  {contentModal.detectionResult &&
                    (contentModal.detectionResult.metrics ||
                      (contentModal.detectionResult.topPhrases &&
                        contentModal.detectionResult.topPhrases.length > 0)) && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                      {contentModal.detectionResult.metrics && (
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="font-semibold text-gray-900">
                              {contentModal.detectionResult.metrics.burstiness?.toFixed(1) ?? "N/A"}
                            </div>
                            <div className="text-xs text-gray-600">{cg.burstiness ?? "Burstiness"}</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="font-semibold text-gray-900">
                              {contentModal.detectionResult.metrics.clichés ?? 0}
                            </div>
                            <div className="text-xs text-gray-600">{cg.cliches ?? "Clichés"}</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="font-semibold text-gray-900">
                              {contentModal.detectionResult.metrics.avgSentenceLength ?? 0}
                            </div>
                            <div className="text-xs text-gray-600">{cg.avgSentence ?? "Avg Sentence"}</div>
                          </div>
                        </div>
                      )}
                      {contentModal.detectionResult.topPhrases &&
                        contentModal.detectionResult.topPhrases.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              {cg.detectedAiPhrases ?? "Detected AI Phrases"} (
                              {contentModal.detectionResult.topPhrases.length})
                            </h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {contentModal.detectionResult.topPhrases.slice(0, 10).map((phrase: any, idx: number) => (
                                <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-gray-700 flex-1">&quot;{phrase.phrase}&quot;</span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        phrase.confidence >= 90
                                          ? "bg-red-100 text-red-700"
                                          : phrase.confidence >= 75
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-green-100 text-green-700"
                                      }`}
                                    >
                                      {phrase.confidence}%
                                    </span>
                                  </div>
                                  {phrase.reason && (
                                    <p className="text-xs text-gray-500 mt-1">{phrase.reason}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-red-200 rounded" />
                          <span>{cg.highAi ?? "High AI (90%+)"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-yellow-200 rounded" />
                          <span>{cg.mediumAi ?? "Medium AI (75-89%)"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 bg-green-200 rounded" />
                          <span>{cg.lowAi ?? "Low AI (60-74%)"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image for this platform */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {cg.uploadImageForPlatform ?? "Image for this platform"}
                    </p>
                    <ImageUpload
                      key={contentModal.platform}
                      currentImageUrl={contentModal.imageUrl}
                      onImageUploaded={(url) =>
                        savePlatformImageUrl(contentModal.platform, contentModal.contentId, url)
                      }
                      maxSizeMB={20}
                      className="mt-2"
                    />
                    {savingImage && (
                      <p className="text-xs text-gray-500 mt-2">{cg.saving ?? "Saving..."}</p>
                    )}
                  </div>

                  {/* Make it humanized button */}
                  {!contentModal.error &&
                    (contentModal.generatedContent ?? contentModal.humanizedContent) && (
                    <div className="pt-3 border-t border-gray-200">
                      <Button
                        variant="primary"
                        onClick={() => runMakeItHuman(contentModal)}
                        disabled={isHumanizing}
                        className="w-full sm:w-auto"
                      >
                        {isHumanizing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {cg.humanizingContent ?? "Humanizing..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {cg.makeItHuman ?? "Make it humanized"}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Comparison modal: Original (generated) vs Humanized - like New Content */}
      {comparisonResult && comparisonHumanized && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleUseOriginal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 text-lg">{cg.comparisonTitle ?? "Original vs Humanized"}</h3>
              <p className="text-xs text-gray-600 mt-0.5">{cg.reviewBothVersions ?? "Choose which version to use."}</p>
            </div>
            <div className="grid grid-cols-2 gap-0 flex-1 overflow-hidden min-h-0">
              <div className="border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700">
                  {cg.originalVersion ?? "Original (generated)"}
                </div>
                <div className="p-4 overflow-y-auto flex-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {comparisonResult.generatedContent ?? comparisonResult.humanizedContent ?? ""}
                </div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <div className="px-3 py-2 bg-green-50 border-b border-gray-200 text-sm font-medium text-gray-700 flex items-center gap-1">
                  {cg.generatedVersion ?? "Humanized"}
                  <span className="text-xs px-1.5 py-0.5 bg-green-200 text-green-800 rounded">{cg.new_ ?? "New"}</span>
                </div>
                <div className="p-4 overflow-y-auto flex-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {comparisonHumanized}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleUseOriginal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                {cg.useOriginal ?? "Use Original"}
              </button>
              <button
                type="button"
                onClick={handleUseHumanized}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {cg.useHumanized ?? "Use Humanized"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
