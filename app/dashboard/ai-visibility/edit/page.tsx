"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  Mic,
  Star,
  Send,
  CheckCircle
} from "lucide-react";

interface ResponseData {
  id: string;
  platform: string;
  response: string;
  response_metadata?: {
    brand_mentioned?: boolean;
    sentiment_score?: number;
    sources?: { url: string; domain: string }[];
  };
}

interface EditPromptData {
  prompt: string;
  responses: ResponseData[];
  projectId: string;
  brandName: string;
  industry: string;
  keywords: string[];
  competitors: string[];
}

interface BrandVoice {
  id: string;
  brand_name: string;
  description?: string;
  personality_traits?: string[];
  tone: string;
  sentence_length?: string;
  vocabulary_level?: string;
  use_emojis?: boolean;
  emoji_style?: string;
  preferred_words?: string[];
  avoid_words?: string[];
  signature_phrases?: string[];
  voice_examples?: string[];
  is_default?: boolean;
}

export default function EditPromptPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [editData, setEditData] = useState<EditPromptData | null>(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [synthesizedResponse, setSynthesizedResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brand Voice State
  const [brandVoices, setBrandVoices] = useState<BrandVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);

  // Influence Level State
  const [influenceLevel, setInfluenceLevel] = useState<"subtle" | "moderate" | "strong">("subtle");


  // Load brand voices on mount
  useEffect(() => {
    const loadBrandVoices = async () => {
      setLoadingVoices(true);
      try {
        const response = await fetch("/api/brand-voice");
        if (response.ok) {
          const data = await response.json();
          setBrandVoices(data.voices || []);
          // Auto-select default voice if available
          const defaultVoice = data.voices?.find((v: BrandVoice) => v.is_default);
          if (defaultVoice) {
            setSelectedVoiceId(defaultVoice.id);
          }
        }
      } catch (error) {
        console.error("Error loading brand voices:", error);
      } finally {
        setLoadingVoices(false);
      }
    };

    loadBrandVoices();
  }, []);

  useEffect(() => {
    // Load data from sessionStorage
    const storedData = sessionStorage.getItem('editPromptData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData) as EditPromptData;
        setEditData(parsed);
        setEditedPrompt(parsed.prompt);
      } catch (e) {
        console.error('Failed to parse edit data:', e);
        router.push('/dashboard/ai-visibility');
      }
    } else {
      // No data, redirect back
      router.push('/dashboard/ai-visibility');
    }
  }, [router]);

  const getModelBadgeColor = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('claude')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (platformLower.includes('gemini')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (platformLower.includes('perplexity')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (platformLower.includes('groq') || platformLower.includes('grok')) return 'bg-pink-100 text-pink-800 border-pink-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getModelDisplayName = (platform: string) => {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('claude')) return 'Claude';
    if (platformLower.includes('chatgpt') || platformLower.includes('gpt')) return 'ChatGPT';
    if (platformLower.includes('gemini')) return 'Gemini';
    if (platformLower.includes('perplexity')) return 'Perplexity';
    if (platformLower.includes('groq') || platformLower.includes('grok')) return 'Groq';
    return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Unknown';
  };

  const getSelectedBrandVoice = (): BrandVoice | null => {
    if (!selectedVoiceId) return null;
    return brandVoices.find(v => v.id === selectedVoiceId) || null;
  };

  const handleGenerateOptimizedResponse = async () => {
    if (!editData) return;

    setIsGenerating(true);
    setError(null);
    setSynthesizedResponse(null);

    try {
      const selectedVoice = getSelectedBrandVoice();
      
      const response = await fetch('/api/geo-core/synthesize-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editedPrompt,
          responses: editData.responses,
          brandName: editData.brandName,
          industry: editData.industry,
          keywords: editData.keywords,
          competitors: editData.competitors,
          influenceLevel: influenceLevel,
          brandVoice: selectedVoice ? {
            id: selectedVoice.id,
            brand_name: selectedVoice.brand_name,
            tone: selectedVoice.tone,
            personality_traits: selectedVoice.personality_traits,
            sentence_length: selectedVoice.sentence_length,
            vocabulary_level: selectedVoice.vocabulary_level,
            use_emojis: selectedVoice.use_emojis,
            emoji_style: selectedVoice.emoji_style,
            preferred_words: selectedVoice.preferred_words,
            avoid_words: selectedVoice.avoid_words,
            signature_phrases: selectedVoice.signature_phrases,
            voice_examples: selectedVoice.voice_examples
          } : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate optimized response');
      }

      const data = await response.json();
      setSynthesizedResponse(data.synthesizedResponse);
    } catch (err) {
      console.error('Error generating optimized response:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate optimized response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (synthesizedResponse) {
      await navigator.clipboard.writeText(synthesizedResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Start approval flow - redirect to publication page
  const handleStartApproval = () => {
    // Store content data for publication page
    const publicationData = {
      responses: [{
        id: `synth-${Date.now()}`,
        prompt: editedPrompt,
        response: synthesizedResponse,
        platform: 'synthesized',
        response_metadata: {
          brand_mentioned: true,
          synthesized: true,
          source_count: editData?.responses.length || 0
        },
        status: 'pending',
        selectedPlatforms: [],
        publishedUrls: [],
        platformSchemas: {},
      }],
      projectName: editData?.brandName || 'AI Visibility Response',
      projectId: editData?.projectId || '',
      keywords: editData?.keywords || [],
      industry: editData?.industry || '',
      brandName: editData?.brandName || '',
      brandVoice: selectedVoiceId ? brandVoices.find(v => v.id === selectedVoiceId) : null,
      influenceLevel: influenceLevel,
    };
    sessionStorage.setItem('aiVisibilityResponses', JSON.stringify(publicationData));
    router.push('/dashboard/content?source=ai-visibility&step=image-selection');
  };


  if (!editData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/ai-visibility')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to AI Visibility</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Prompt & Generate Response</h1>
              <p className="text-gray-500 text-sm">
                Optimize your brand&apos;s response to this prompt
              </p>
            </div>
          </div>
        </div>

        {/* Brand Context Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Brand:</span>
              <span className="ml-2 font-semibold text-gray-900">{editData.brandName}</span>
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <span className="text-gray-500">Industry:</span>
              <span className="ml-2 font-medium text-gray-700">{editData.industry}</span>
            </div>
            {editData.keywords.length > 0 && (
              <>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {editData.keywords.slice(0, 3).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                    {editData.keywords.length > 3 && (
                      <span className="text-gray-400 text-xs">+{editData.keywords.length - 3} more</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Prompt & LLM Responses */}
          <div className="space-y-6">
            {/* Editable Prompt */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Original Prompt</h2>
                <p className="text-xs text-gray-500 mt-0.5">Edit the prompt if needed before generating a response</p>
              </div>
              <div className="p-4">
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none text-gray-800"
                  placeholder="Enter your prompt..."
                />
              </div>
            </div>

            {/* Brand Voice Selection */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-600" />
                    <h2 className="font-semibold text-gray-900">Brand Voice</h2>
                  </div>
                  <Link
                    href="/dashboard/settings?tab=brand-voice"
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium hover:underline"
                  >
                    + Create New
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Select a voice profile to maintain consistent brand personality</p>
              </div>
              <div className="p-4">
                <select
                  value={selectedVoiceId || ""}
                  onChange={(e) => setSelectedVoiceId(e.target.value || null)}
                  disabled={loadingVoices}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-gray-800 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">No voice profile (generic)</option>
                  {brandVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.brand_name} - {voice.tone}
                      {voice.is_default ? " ⭐" : ""}
                    </option>
                  ))}
                </select>

                {/* Selected Voice Preview */}
                {selectedVoiceId && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                    {(() => {
                      const selectedVoice = brandVoices.find(v => v.id === selectedVoiceId);
                      if (!selectedVoice) return null;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-medium text-indigo-900">
                              {selectedVoice.brand_name}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs capitalize">
                              {selectedVoice.tone}
                            </span>
                          </div>
                          {selectedVoice.description && (
                            <p className="text-xs text-indigo-700">{selectedVoice.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {selectedVoice.personality_traits?.slice(0, 4).map((trait, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white/70 text-indigo-700 rounded text-xs">
                                {trait}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-indigo-600">
                            Response will maintain consistent {selectedVoice.brand_name} personality
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {loadingVoices && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading voice profiles...
                  </div>
                )}

                {!loadingVoices && brandVoices.length === 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    No brand voice profiles found.{" "}
                    <Link href="/dashboard/settings?tab=brand-voice" className="text-purple-600 hover:underline">
                      Create one
                    </Link>{" "}
                    to maintain consistent brand personality.
                  </div>
                )}
              </div>
            </div>

            {/* Influence Level Selection */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Influence Level</h2>
                <p className="text-xs text-gray-500 mt-0.5">Control how prominently your brand is mentioned in the response</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "subtle", label: "Subtle", desc: "Natural mention" },
                    { value: "moderate", label: "Moderate", desc: "Balanced" },
                    { value: "strong", label: "Strong", desc: "Clear recommendation" },
                  ].map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setInfluenceLevel(level.value as "subtle" | "moderate" | "strong")}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        influenceLevel === level.value
                          ? "border-cyan-500 bg-cyan-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-900">
                        {level.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* LLM Responses */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Current LLM Responses</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editData.responses.length} response{editData.responses.length !== 1 ? 's' : ''} from different AI models
                </p>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {editData.responses.map((response) => (
                  <div
                    key={response.id}
                    className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getModelBadgeColor(response.platform)}`}>
                        {getModelDisplayName(response.platform)}
                      </span>
                      <span className="text-xs text-red-500 font-medium">Brand Not Mentioned</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {response.response}
                    </p>
                    {response.response_metadata?.sources && response.response_metadata.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                          {response.response_metadata.sources.slice(0, 2).map((source, idx) => (
                            <a
                              key={idx}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {source.domain}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Generate & Result */}
          <div className="space-y-6">
            {/* Generate Button Card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-6 shadow-lg shadow-purple-500/20">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-xl mb-4 backdrop-blur-sm">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Generate Optimized Response</h3>
                <p className="text-purple-100 text-sm mb-4 max-w-sm mx-auto">
                  GPT-4 Turbo will analyze all responses and create the best synthesized answer with your brand prominently mentioned
                </p>
                
                {/* Brand Voice Indicator */}
                {selectedVoiceId && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-purple-100 text-xs mb-4 backdrop-blur-sm">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Using: <strong>{brandVoices.find(v => v.id === selectedVoiceId)?.brand_name}</strong> voice</span>
                  </div>
                )}
                
                <button
                  onClick={handleGenerateOptimizedResponse}
                  disabled={isGenerating}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Optimized Response
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={handleGenerateOptimizedResponse}
                  className="mt-2 flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            )}

            {/* Synthesized Response */}
            {synthesizedResponse && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden ring-2 ring-green-100">
                <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-green-900 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Optimized Response Generated
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-green-700">Brand-optimized, SEO-friendly response</p>
                      {selectedVoiceId && (
                        <>
                          <span className="text-green-300">•</span>
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Mic className="w-3 h-3" />
                            {brandVoices.find(v => v.id === selectedVoiceId)?.brand_name} voice
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-lg text-green-700 hover:bg-green-50 transition-colors text-sm font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {synthesizedResponse}
                  </div>
                </div>
              </div>
            )}


            {/* Publishing Workflow */}
            {synthesizedResponse && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 shadow-lg">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-3 backdrop-blur-sm">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Ready to Publish?</h3>
                  <p className="text-emerald-100 text-sm mb-4">
                    Approve this response to continue to publication page where you can select images and platforms
                  </p>
                  <button
                    onClick={handleStartApproval}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-all shadow-lg"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                </div>
              </div>
            )}


            {/* Info Card */}
            {!synthesizedResponse && !error && !isGenerating && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-semibold text-amber-900 mb-2">How it works</h3>
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800">1</span>
                    <span>GPT-4 Turbo analyzes all {editData.responses.length} LLM responses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800">2</span>
                    <span>Extracts the best insights and information from each</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800">3</span>
                    <span>Creates an optimized response featuring <strong>{editData.brandName}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800">4</span>
                    <span>
                      {selectedVoiceId 
                        ? <>Applies your <strong>{brandVoices.find(v => v.id === selectedVoiceId)?.brand_name}</strong> voice profile</>
                        : 'Optimizes for SEO and natural brand mentions'
                      }
                    </span>
                  </li>
                  {selectedVoiceId && (
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800">5</span>
                      <span>Maintains consistent tone, personality, and writing style</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

