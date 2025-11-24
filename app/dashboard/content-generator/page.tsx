"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Sparkles,
  FileText,
  Target,
  TrendingUp,
  Copy,
  Check,
  AlertCircle,
  Lightbulb,
  Brain,
  BarChart3,
  ChevronRight,
  ArrowRight,
  Send
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ContentGeneratorPage() {
  // Step 1: User Input
  const [topic, setTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("reddit");
  const [userBrand, setUserBrand] = useState("");
  const [influenceLevel, setInfluenceLevel] = useState<"subtle" | "moderate" | "strong">("subtle");

  // Step 2: Diagnostic Scan Results
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [scanningKeywords, setScanningKeywords] = useState(false);

  // Step 3: Content Generation
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentMetadata, setContentMetadata] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Platforms
  const platforms = [
    { value: "reddit", label: "Reddit", desc: "Casual, community-focused", icon: "/reddit-icon.svg" },
    { value: "quora", label: "Quora", desc: "Authoritative, detailed", icon: "/quora.svg" },
    { value: "medium", label: "Medium", desc: "Professional, thought-leadership", icon: "/medium-square.svg" },
    { value: "github", label: "GitHub", desc: "Technical, documentation", icon: "/github-142.svg" },
    { value: "facebook", label: "Facebook", desc: "Social media, engaging", icon: "/facebook-color.svg" },
    { value: "linkedin", label: "LinkedIn", desc: "Professional network", icon: "/linkedin.svg" },
    { value: "instagram", label: "Instagram", desc: "Visual social media", icon: "/instagram-1-svgrepo-com.svg" },
  ];

  // Step 1: Diagnostic Scan (using existing API or mock)
  const runDiagnosticScan = async () => {
    const keywords = targetKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      toast.error("Please enter at least one keyword");
      return;
    }

    setScanningKeywords(true);
    try {
      // REAL AI Diagnostic Scan using OpenAI GPT-4 Turbo
      const response = await fetch('/api/geo-core/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywords.slice(0, 3), // Limit to 3 keywords for speed
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate forecasts');
      }

      const data = await response.json();

      setDiagnosticResults({
        keywords: data.forecasts,
        timestamp: new Date().toISOString(),
      });

      toast.success("Diagnostic scan complete!");
    } catch (error) {
      console.error('Scan error:', error);
      toast.error("Diagnostic scan failed");
    } finally {
      setScanningKeywords(false);
    }
  };

  // Step 2: Generate Content
  const generateContent = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    const keywords = targetKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      toast.error("Please enter at least one keyword");
      return;
    }

    setGeneratingContent(true);
    try {
      // REAL AI Content Generation using OpenAI GPT-4 Turbo
      const response = await fetch('/api/geo-core/content-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          targetKeywords: keywords,
          targetPlatform,
          brandMention: userBrand,
          influenceLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      setGeneratedContent(data.content);
      setContentMetadata({
        neutralityScore: data.metadata.neutralityScore,
        tone: data.metadata.tone,
        contentType: targetPlatform === "github" ? "documentation" : "article",
        platform: data.metadata.platform,
        wordCount: data.metadata.wordCount,
        humanScore: data.metadata.humanScore || 95,
      });
      
      toast.success("Content generated successfully!");
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Content generation failed");
    } finally {
      setGeneratingContent(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast.success("Content copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Content Generator</h1>
              <p className="text-gray-600">
                Create humanized content that bypasses AI detectors
              </p>
            </div>
          </div>
        </motion.div>

        {/* Workflow Steps */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Step 1: User Input */}
          <Card className="bg-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">1. User Input</h3>
            </div>
            <p className="text-sm text-gray-600">
              Define your topic, keywords, and target platform
            </p>
          </Card>

          {/* Step 2: Diagnostic Scan */}
          <Card className="bg-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-secondary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">2. Diagnostic Scan</h3>
            </div>
            <p className="text-sm text-gray-600">
              AI analyzes keywords and forecasts performance
            </p>
          </Card>

          {/* Step 3: Content Generation */}
          <Card className="bg-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">3. Content Generation</h3>
            </div>
            <p className="text-sm text-gray-600">
              Generate humanized, AI-detector-proof content
            </p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Input & Configuration */}
          <div className="space-y-6">
            {/* User Input Card */}
            <Card className="bg-white">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-gray-900">Content Configuration</h2>
              </div>

              <div className="space-y-4">
                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic / Question
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., How to improve YouTube SEO"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Target Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={targetKeywords}
                    onChange={(e) => setTargetKeywords(e.target.value)}
                    placeholder="e.g., youtube seo, video optimization, ranking videos"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Platform
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {platforms.map((platform) => (
                      <button
                        key={platform.value}
                        onClick={() => setTargetPlatform(platform.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          targetPlatform === platform.value
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2 h-10">
                          <Image 
                            src={platform.icon} 
                            alt={platform.label} 
                            width={40} 
                            height={40} 
                            className="w-10 h-10"
                          />
                        </div>
                        <div className="font-semibold text-sm text-gray-900">
                          {platform.label}
                        </div>
                        <div className="text-xs text-gray-600">{platform.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Mention (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand/Product to Mention (Optional)
                  </label>
                  <input
                    type="text"
                    value={userBrand}
                    onChange={(e) => setUserBrand(e.target.value)}
                    placeholder="e.g., TubeBuddy, VidIQ"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Influence Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Influence Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "subtle", label: "Subtle", desc: "Natural mention" },
                      { value: "moderate", label: "Moderate", desc: "Balanced" },
                      { value: "strong", label: "Strong", desc: "Clear recommendation" },
                    ].map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setInfluenceLevel(level.value as any)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          influenceLevel === level.value
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-900">
                          {level.label}
                        </div>
                        <div className="text-xs text-gray-600">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <Button
                  onClick={runDiagnosticScan}
                  disabled={scanningKeywords || !targetKeywords.trim()}
                  className="w-full"
                  variant="outline"
                >
                  {scanningKeywords ? (
                    <>
                      <Brain className="w-5 h-5 mr-2 animate-spin" />
                      Running Diagnostic Scan...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Run Diagnostic Scan (Optional)
                    </>
                  )}
                </Button>

                <Button
                  onClick={generateContent}
                  disabled={generatingContent || !topic.trim() || !targetKeywords.trim()}
                  className="w-full"
                  variant="primary"
                >
                  {generatingContent ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Humanized Content
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Diagnostic Results */}
            {diagnosticResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      Diagnostic Results
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {diagnosticResults.keywords.slice(0, 3).map((kw: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900">{kw.keyword}</span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            kw.difficulty === "Easy" ? "bg-green-100 text-green-700" :
                            kw.difficulty === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {kw.difficulty}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-gray-600">Est. Traffic</div>
                            <div className="font-semibold">{kw.estimatedTraffic}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Competition</div>
                            <div className="font-semibold">{kw.competition}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Trend</div>
                            <div className="font-semibold">{kw.trend}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column: Generated Content */}
          <div>
            <Card className="bg-white min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-bold text-gray-900">Generated Content</h2>
                </div>
                {generatedContent && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      AI Detector-Proof
                    </span>
                  </div>
                )}
              </div>

              {!generatedContent && !generatingContent && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-2">No content generated yet</p>
                  <p className="text-sm text-gray-500">
                    Fill in the form and click "Generate Content"
                  </p>
                </div>
              )}

              {generatingContent && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Sparkles className="w-8 h-8 text-primary-600 animate-spin" />
                  </div>
                  <p className="text-gray-900 font-semibold mb-2">
                    Generating humanized content...
                  </p>
                  <p className="text-sm text-gray-600">
                    Using GPT-4 Turbo with advanced humanization
                  </p>
                </div>
              )}

              {generatedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Metadata */}
                  {contentMetadata && (
                    <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-green-900">
                          {contentMetadata.neutralityScore}%
                        </div>
                        <div className="text-green-700">Neutrality</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-blue-900 capitalize">
                          {contentMetadata.tone}
                        </div>
                        <div className="text-blue-700">Tone</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-purple-900">
                          {contentMetadata.wordCount}
                        </div>
                        <div className="text-purple-700">Words</div>
                      </div>
                    </div>
                  )}

                  {/* Content Display */}
                  <div className="relative">
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={copyToClipboard}
                        className="bg-white border border-gray-300 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {generatedContent}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-900 text-sm mb-1">
                          Pro Tips
                        </h4>
                        <ul className="text-xs text-blue-800 space-y-1">
                          <li>• Test with GPTZero or Copyleaks to verify human score</li>
                          <li>• Reddit platform typically scores highest (96%+)</li>
                          <li>• Use "Subtle" influence for maximum authenticity</li>
                          <li>• Add personal context for even better results</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Arrow to Publication Page */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6"
                  >
                    <Link href="/dashboard/content">
                      <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg p-4 border border-primary-300 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                              <Send className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white text-sm mb-0.5">
                                Ready to Publish?
                              </h4>
                              <p className="text-xs text-white/90">
                                Go to Publication page to review and publish your content
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                </motion.div>
              )}
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}

