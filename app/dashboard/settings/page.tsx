"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Lock,
  CreditCard,
  Zap,
  Save,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  Loader,
  Loader2,
  XCircle,
  X,
  MessageSquare,
  FileText,
  HelpCircle,
  Linkedin,
  Plus,
  Edit2,
  Trash2,
  Star,
  ExternalLink,
  RefreshCw,
  Link2
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

export default function Settings() {
  const { isRtl, t } = useLanguage();
  const [activeTab, setActiveTab] = useState("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Brand Voice States
  const [brandVoices, setBrandVoices] = useState<any[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [showVoiceForm, setShowVoiceForm] = useState(false);
  const [editingVoice, setEditingVoice] = useState<any>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  
  // Form States for Brand Voice
  const [voiceBrandName, setVoiceBrandName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [voicePersonality, setVoicePersonality] = useState<string[]>([]);
  const [voiceTone, setVoiceTone] = useState("neutral");
  const [voiceEmojiStyle, setVoiceEmojiStyle] = useState("moderate");
  const [voicePreferredWords, setVoicePreferredWords] = useState("");
  const [voiceAvoidWords, setVoiceAvoidWords] = useState("");
  const [voiceSignaturePhrases, setVoiceSignaturePhrases] = useState("");
  const [voiceIsDefault, setVoiceIsDefault] = useState(false);

  const tabs = [
    { id: "profile", label: t.dashboard.settings.profile, icon: User },
    { id: "brand-voice", label: t.dashboard.settings.brandVoice, icon: MessageSquare },
    { id: "white-label", label: t.dashboard.settings.whiteLabel, icon: Palette },
    { id: "notifications", label: t.dashboard.settings.notifications, icon: Bell },
    { id: "integrations", label: t.dashboard.settings.integrations, icon: Zap },
    { id: "security", label: t.dashboard.settings.security, icon: Lock },
    { id: "billing", label: t.dashboard.settings.billing, icon: CreditCard },
  ];

  // Check for OAuth callback and auto-switch to integrations tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCallback = urlParams.get("facebook") || 
                        urlParams.get("instagram") || 
                        urlParams.get("linkedin") ||
                        urlParams.get("github") ||
                        urlParams.get("reddit") ||
                        urlParams.get("medium") ||
                        urlParams.get("quora") ||
                        urlParams.get("success") === "gsc_connected" ||
                        urlParams.get("error");
    
    // If any integration callback detected, switch to integrations tab
    if (hasCallback) {
      setActiveTab("integrations");
      
      // Show success/error toast for GSC
      if (urlParams.get("success") === "gsc_connected") {
        toast.success("Google Search Console connected successfully!");
      } else if (urlParams.get("error")) {
        const error = urlParams.get("error");
        if (error === "no_verified_sites") {
          toast.error("No verified sites found in Google Search Console");
        } else if (error === "access_denied") {
          toast.error("Access denied. Please try again.");
        } else {
          toast.error(`Connection failed: ${error}`);
        }
      }
    }
  }, []);

  // Load brand voices when brand-voice tab is active
  useEffect(() => {
    if (activeTab === "brand-voice") {
      loadBrandVoices();
    }
  }, [activeTab]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Brand Voice Functions
  const loadBrandVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await fetch("/api/brand-voice");
      if (response.ok) {
        const data = await response.json();
        setBrandVoices(data.voices || []);
      } else {
        toast.error("Failed to load brand voices");
      }
    } catch (error) {
      console.error("Error loading brand voices:", error);
      toast.error("Error loading brand voices");
    } finally {
      setLoadingVoices(false);
    }
  };

  const resetVoiceForm = () => {
    setVoiceBrandName("");
    setVoiceDescription("");
    setVoicePersonality([]);
    setVoiceTone("neutral");
    setVoiceEmojiStyle("moderate");
    setVoicePreferredWords("");
    setVoiceAvoidWords("");
    setVoiceSignaturePhrases("");
    setVoiceIsDefault(false);
    setEditingVoice(null);
    setShowVoiceForm(false);
  };

  const handleEditVoice = (voice: any) => {
    setEditingVoice(voice);
    setVoiceBrandName(voice.brand_name);
    setVoiceDescription(voice.description || "");
    setVoicePersonality(voice.personality_traits || []);
    setVoiceTone(voice.tone);
    setVoiceEmojiStyle(voice.emoji_style);
    setVoicePreferredWords(voice.preferred_words?.join(", ") || "");
    setVoiceAvoidWords(voice.avoid_words?.join(", ") || "");
    setVoiceSignaturePhrases(voice.signature_phrases?.join(", ") || "");
    setVoiceIsDefault(voice.is_default);
    setShowVoiceForm(true);
  };

  const handleSaveVoice = async () => {
    if (!voiceBrandName.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setSavingVoice(true);
    try {
      const voiceData = {
        brand_name: voiceBrandName.trim(),
        description: voiceDescription.trim() || null,
        personality_traits: voicePersonality,
        tone: voiceTone,
        emoji_style: voiceEmojiStyle,
        preferred_words: voicePreferredWords.split(",").map((w) => w.trim()).filter(Boolean),
        avoid_words: voiceAvoidWords.split(",").map((w) => w.trim()).filter(Boolean),
        signature_phrases: voiceSignaturePhrases.split(",").map((p) => p.trim()).filter(Boolean),
        is_default: voiceIsDefault,
      };

      let response;
      if (editingVoice) {
        // Update existing voice
        response = await fetch("/api/brand-voice", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingVoice.id, ...voiceData }),
        });
      } else {
        // Create new voice
        response = await fetch("/api/brand-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(voiceData),
        });
      }

      if (response.ok) {
        toast.success(editingVoice ? "Brand voice updated!" : "Brand voice created!");
        resetVoiceForm();
        loadBrandVoices();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save brand voice");
      }
    } catch (error) {
      console.error("Error saving brand voice:", error);
      toast.error("Error saving brand voice");
    } finally {
      setSavingVoice(false);
    }
  };

  const handleDeleteVoice = async (voiceId: string) => {
    if (!confirm("Are you sure you want to delete this brand voice?")) return;

    try {
      const response = await fetch(`/api/brand-voice?id=${voiceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Brand voice deleted!");
        loadBrandVoices();
      } else {
        toast.error("Failed to delete brand voice");
      }
    } catch (error) {
      console.error("Error deleting brand voice:", error);
      toast.error("Error deleting brand voice");
    }
  };

  const togglePersonalityTrait = (trait: string) => {
    if (voicePersonality.includes(trait)) {
      setVoicePersonality(voicePersonality.filter((t) => t !== trait));
    } else {
      setVoicePersonality([...voicePersonality, trait]);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.dashboard.settings.title}</h1>
        <p className="text-gray-600">{t.dashboard.settings.subtitle}</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-4 border border-gray-200 sticky top-24">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary-50 text-primary-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl p-8 border border-gray-200"
          >
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
                
                {/* Avatar Upload */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      JD
                    </div>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload New
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        defaultValue="John"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Doe"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      defaultValue="john@company.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      defaultValue="GeoRepute Inc"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      rows={4}
                      defaultValue="Digital marketing specialist focused on AI-driven visibility optimization."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Brand Voice Tab */}
            {activeTab === "brand-voice" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Brand Voice Profiles</h2>
                    <p className="text-gray-600 mt-1">
                      Create consistent brand personalities for your content generation
                    </p>
                  </div>
                  {!showVoiceForm && (
                    <button
                      onClick={() => setShowVoiceForm(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Voice Profile
                    </button>
                  )}
                </div>

                {/* Voice Form */}
                {showVoiceForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">
                        {editingVoice ? "Edit" : "Create"} Brand Voice Profile
                      </h3>
                      <button
                        onClick={resetVoiceForm}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Brand Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Brand Name *
                        </label>
                        <input
                          type="text"
                          value={voiceBrandName}
                          onChange={(e) => setVoiceBrandName(e.target.value)}
                          placeholder="e.g., Nike, Apple, Wendy's"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description (Optional)
                        </label>
                        <textarea
                          value={voiceDescription}
                          onChange={(e) => setVoiceDescription(e.target.value)}
                          placeholder="Brief description of this brand voice"
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none"
                        />
                      </div>

                      {/* Personality Traits */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Personality Traits
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "professional",
                            "friendly",
                            "innovative",
                            "motivational",
                            "humorous",
                            "authoritative",
                            "casual",
                            "empowering",
                            "minimalist",
                            "bold",
                          ].map((trait) => (
                            <button
                              key={trait}
                              onClick={() => togglePersonalityTrait(trait)}
                              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                voicePersonality.includes(trait)
                                  ? "border-primary-500 bg-primary-50 text-primary-700 font-semibold"
                                  : "border-gray-200 text-gray-700 hover:border-gray-300"
                              }`}
                            >
                              {trait}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tone & Emoji Style */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tone
                          </label>
                          <select
                            value={voiceTone}
                            onChange={(e) => setVoiceTone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                          >
                            <option value="casual">Casual</option>
                            <option value="professional">Professional</option>
                            <option value="formal">Formal</option>
                            <option value="friendly">Friendly</option>
                            <option value="humorous">Humorous</option>
                            <option value="authoritative">Authoritative</option>
                            <option value="neutral">Neutral</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Emoji Style
                          </label>
                          <select
                            value={voiceEmojiStyle}
                            onChange={(e) => setVoiceEmojiStyle(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                          >
                            <option value="none">None</option>
                            <option value="minimal">Minimal</option>
                            <option value="moderate">Moderate</option>
                            <option value="heavy">Heavy</option>
                          </select>
                        </div>
                      </div>

                      {/* Preferred Words */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Words (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={voicePreferredWords}
                          onChange={(e) => setVoicePreferredWords(e.target.value)}
                          placeholder="e.g., innovative, cutting-edge, solution"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>

                      {/* Avoid Words */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Avoid Words (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={voiceAvoidWords}
                          onChange={(e) => setVoiceAvoidWords(e.target.value)}
                          placeholder="e.g., cheap, discount, old"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>

                      {/* Signature Phrases */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Signature Phrases (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={voiceSignaturePhrases}
                          onChange={(e) => setVoiceSignaturePhrases(e.target.value)}
                          placeholder="e.g., Just do it, Think different"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>

                      {/* Set as Default */}
                      <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <input
                          type="checkbox"
                          id="voice-default"
                          checked={voiceIsDefault}
                          onChange={(e) => setVoiceIsDefault(e.target.checked)}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <label htmlFor="voice-default" className="text-sm font-medium text-gray-900 cursor-pointer">
                          Set as default brand voice
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 pt-4">
                        <button
                          onClick={handleSaveVoice}
                          disabled={savingVoice || !voiceBrandName.trim()}
                          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingVoice ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              {editingVoice ? "Update" : "Create"} Voice Profile
                            </>
                          )}
                        </button>
                        <button
                          onClick={resetVoiceForm}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Voice List */}
                {loadingVoices ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 text-primary-600 animate-spin" />
                  </div>
                ) : brandVoices.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No brand voices yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create your first brand voice profile to maintain consistent content
                    </p>
                    <button
                      onClick={() => setShowVoiceForm(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create Brand Voice
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {brandVoices.map((voice) => (
                      <motion.div
                        key={voice.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-300 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                              <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900">{voice.brand_name}</h3>
                                {voice.is_default && (
                                  <span className="flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                                    <Star className="w-3 h-3" />
                                    Default
                                  </span>
                                )}
                              </div>
                              {voice.description && (
                                <p className="text-sm text-gray-600 mt-1">{voice.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditVoice(voice)}
                              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoice(voice.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Personality */}
                          {voice.personality_traits && voice.personality_traits.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                Personality
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {voice.personality_traits.map((trait: string) => (
                                  <span
                                    key={trait}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                                  >
                                    {trait}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tone & Emoji Style */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              Style
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Tone:</span> {voice.tone}
                              </p>
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Emojis:</span> {voice.emoji_style}
                              </p>
                            </div>
                          </div>

                          {/* Preferred Words */}
                          {voice.preferred_words && voice.preferred_words.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                Preferred Words
                              </p>
                              <p className="text-sm text-gray-700">
                                {voice.preferred_words.join(", ")}
                              </p>
                            </div>
                          )}

                          {/* Signature Phrases */}
                          {voice.signature_phrases && voice.signature_phrases.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                Signature Phrases
                              </p>
                              <p className="text-sm text-gray-700 italic">
                                &ldquo;{voice.signature_phrases.join('" | "')}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* White Label Tab */}
            {activeTab === "white-label" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">White Label Configuration</h2>
                <p className="text-gray-600 mb-6">Customize branding for your agency</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue="GeoRepute"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Domain
                    </label>
                    <input
                      type="text"
                      placeholder="dashboard.yourcompany.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Configure your DNS to point to our servers
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Upload Logo
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          defaultValue="#0ea5e9"
                          className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue="#0ea5e9"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          defaultValue="#d946ef"
                          className="h-12 w-20 border border-gray-300 rounded-lg cursor-pointer"
                        />
                        <input
                          type="text"
                          defaultValue="#d946ef"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom CSS (Advanced)
                    </label>
                    <textarea
                      rows={6}
                      placeholder="/* Add your custom CSS here */"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  {[
                    { label: "Email Notifications", description: "Receive email updates about your account activity" },
                    { label: "Weekly Reports", description: "Get weekly performance summaries via email" },
                    { label: "Ranking Alerts", description: "Alert me when keywords move up or down significantly" },
                    { label: "Content Approvals", description: "Notify me when content needs approval" },
                    { label: "Team Activity", description: "Updates when team members take action" },
                    { label: "Billing Notifications", description: "Reminders about payments and invoices" },
                  ].map((notification) => (
                    <div key={notification.label} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">{notification.label}</h3>
                        <p className="text-sm text-gray-600">{notification.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <GitHubIntegrationSettings />
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">2FA Status</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        Enable 2FA
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <h3 className="font-semibold text-gray-900 mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      {[
                        { device: "MacBook Pro", location: "San Francisco, CA", time: "Active now" },
                        { device: "iPhone 14", location: "San Francisco, CA", time: "2 hours ago" },
                      ].map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{session.device}</p>
                            <p className="text-sm text-gray-600">{session.location} • {session.time}</p>
                          </div>
                          <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing & Subscription</h2>
                
                {/* Current Plan */}
                <div className="p-6 bg-gradient-to-br from-primary-50 to-accent-50 rounded-lg border border-primary-200 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Professional Plan</h3>
                      <p className="text-gray-600">$299/month • Renews on Nov 20, 2024</p>
                    </div>
                    <button className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:shadow-lg transition-all">
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white font-bold text-xs">
                        VISA
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-600">Expires 12/2025</p>
                      </div>
                    </div>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      Update
                    </button>
                  </div>
                </div>

                {/* Billing History */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Billing History</h3>
                  <div className="space-y-3">
                    {[
                      { date: "Oct 20, 2024", amount: "$299.00", status: "Paid" },
                      { date: "Sep 20, 2024", amount: "$299.00", status: "Paid" },
                      { date: "Aug 20, 2024", amount: "$299.00", status: "Paid" },
                    ].map((invoice, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <CreditCard className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{invoice.date}</p>
                            <p className="text-sm text-gray-600">{invoice.amount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {invoice.status}
                          </span>
                          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
              {saved && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Changes saved successfully!</span>
                </div>
              )}
              <div className={`flex items-center gap-3 ${saved ? "" : "ml-auto"}`}>
                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Reddit Integration Component
function RedditIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    loadRedditConfig();
    // Check for OAuth callback messages
    const urlParams = new URLSearchParams(window.location.search);
    const redditStatus = urlParams.get("reddit");
    if (redditStatus === "success") {
      const message = urlParams.get("message");
      toast.success(message || "Reddit connected successfully!");
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
      loadRedditConfig();
    } else if (redditStatus === "error") {
      const message = urlParams.get("message");
      toast.error(message || "Failed to connect Reddit");
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadRedditConfig = async () => {
    try {
      const response = await fetch("/api/integrations/reddit");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setIsConnected(data.config.verified || false);
          setUsername(data.config.username || "");
        } else {
          setIsConnected(false);
          setUsername("");
        }
      }
    } catch (error) {
      console.error("Error loading Reddit config:", error);
      setIsConnected(false);
      setUsername("");
    }
  };

  const handleConnectReddit = () => {
    // Get Reddit Client ID from environment
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/reddit/callback`;
    // Reddit OAuth scopes: submit (post), identity (username), read (access content)
    const scope = "submit identity read";
    const state = Date.now().toString(); // Simple state for CSRF protection
    const duration = "permanent"; // Get refresh token that doesn't expire
    
    if (!clientId) {
      toast.error("Reddit Client ID not configured. Please check your environment variables.");
      return;
    }

    // Redirect to Reddit OAuth
    const redditAuthUrl = `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&state=${state}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&duration=${duration}` +
      `&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = redditAuthUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Reddit integration? This will remove your API credentials.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/reddit", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Reddit integration disconnected");
        setIsConnected(false);
        setUsername("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/reddit-icon.svg" alt="Reddit" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Reddit Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content as Reddit posts
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {/* Show connection status and action buttons */}
      {isConnected ? (
        <div className="space-y-4">
          {username && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">
                <strong>Connected as:</strong> u/{username}
              </p>
            </div>
          )}
          <div className="flex gap-3">
              <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Disconnect
                </>
              )}
              </button>
            </div>
          </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 mb-3">
              <strong>Connect with OAuth:</strong> Click the button below to authenticate with Reddit. This will allow you to automatically publish content to Reddit.
            </p>
            <p className="text-xs text-blue-800 mb-2">
              <strong>Required OAuth Scopes:</strong>
            </p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
              <li><code className="bg-blue-100 px-1 rounded">submit</code> - Submit posts to subreddits</li>
              <li><code className="bg-blue-100 px-1 rounded">identity</code> - Get your username</li>
              <li><code className="bg-blue-100 px-1 rounded">read</code> - Access Reddit content</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-700 mb-2">
              <strong>Setup Instructions:</strong>
            </p>
            <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
              <li>Go to <a href="https://www.reddit.com/prefs/apps" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">Reddit Apps</a></li>
              <li>Click <strong>"create another app"</strong> or <strong>"create app"</strong></li>
              <li>Fill in:
                <ul className="list-disc ml-4 mt-1">
                  <li><strong>Name:</strong> GeoRepute Auto-Publish</li>
                  <li><strong>App type:</strong> "script"</li>
                  <li><strong>Redirect URI:</strong> <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your-domain.com'}/api/auth/reddit/callback</code></li>
                </ul>
              </li>
              <li>Copy the <strong>Client ID</strong> (under "personal use script") and <strong>Client Secret</strong></li>
              <li>Add them to your environment variables: <code className="bg-gray-100 px-1 rounded">REDDIT_CLIENT_ID</code> and <code className="bg-gray-100 px-1 rounded">REDDIT_CLIENT_SECRET</code></li>
              <li>Also add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_REDDIT_CLIENT_ID</code> (same as Client ID) for the frontend</li>
            </ol>
          </div>

              <button
            onClick={handleConnectReddit}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Image src="/reddit-icon.svg" alt="Reddit" width={20} height={20} />
                Connect Reddit Account
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// GitHub Integration Component
function GitHubIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    repository: "", // Format: "owner/repo"
  });
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [repositories, setRepositories] = useState<Array<{name: string; full_name: string; owner: string; default_branch: string}>>([]);

  useEffect(() => {
    loadGitHubConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const githubStatus = urlParams.get("github");
    
    if (githubStatus === "connected") {
      const name = urlParams.get("name");
      toast.success(`GitHub connected successfully!${name ? ` Connected as: ${name}` : ""}`);
      // Reload config
      loadGitHubConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (githubStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`GitHub connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadGitHubConfig = async () => {
    try {
      const response = await fetch("/api/integrations/github");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          const owner = data.config.owner || "";
          const repo = data.config.repo || "";
          const repository = owner && repo ? `${owner}/${repo}` : "";
          
          setConfig({
            repository: repository,
          });
          setIsConnected(data.config.verified || false);
          setUsername(data.config.username || "");
          // Load repositories from metadata if available
          if (data.config.metadata?.repositories) {
            setRepositories(data.config.metadata.repositories);
          }
        } else {
          // No config found
          setIsConnected(false);
          setUsername("");
          setRepositories([]);
        }
      }
    } catch (error) {
      console.error("Error loading GitHub config:", error);
      setIsConnected(false);
      setUsername("");
      setRepositories([]);
    }
  };

  const handleConnectGitHub = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      toast.error(
        "GitHub OAuth is not configured. Please create a GitHub OAuth App and add GITHUB_CLIENT_ID to your environment variables.",
        { duration: 6000 }
      );
      // Open GitHub OAuth app creation page in new tab
      window.open("https://github.com/settings/applications/new", "_blank");
      return;
    }

    // Use the current origin - this must match EXACTLY what's in your GitHub OAuth app
    const redirectUri = `${window.location.origin}/api/auth/github/callback`;
    const scope = "repo user:email"; // repo for discussions, user:email for user info
    const state = Date.now().toString();
    
    // Store state in sessionStorage for CSRF protection
    sessionStorage.setItem("github_oauth_state", state);

    // Detect environment and log helpful information
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const environment = isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION';
    
    console.log("🔍 GitHub OAuth Configuration:", {
      environment,
      clientId: clientId.substring(0, 4) + "***",
      redirectUri,
      hostname: window.location.hostname,
    });
    
    if (isLocalhost) {
      console.log("⚠️ DEVELOPMENT: Make sure your LOCAL GitHub OAuth app has callback URL:", redirectUri);
      console.log("⚠️ And your .env.local has the LOCAL app's Client ID");
    } else {
      console.log("⚠️ PRODUCTION: Make sure your PRODUCTION GitHub OAuth app has callback URL:", redirectUri);
      console.log("⚠️ And your Vercel environment variables have the PRODUCTION app's Client ID");
    }

    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}`;

    window.location.href = authUrl;
  };


  const handleSaveRepository = async () => {
    if (!config.repository) {
      toast.error("Please select a repository");
      return;
    }

    // Parse repository name (format: "owner/repo")
    const [owner, repo] = config.repository.split("/").map(s => s.trim());
    if (!owner || !repo) {
      toast.error("Repository name must be in format: owner/repo (e.g., georepute/my-blog)");
      return;
    }

    setLoading(true);
    try {
      // Get the current integration to update repository
      const response = await fetch("/api/integrations/github");
      const data = await response.json();
      
      if (!data.success || !data.config) {
        toast.error("Please connect your GitHub account first");
        return;
      }

      // Update repository in metadata
      const updateResponse = await fetch("/api/integrations/github", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: owner,
          repo: repo,
          branch: "main", // Default branch
        }),
      });

      const updateData = await updateResponse.json();
      
      if (updateResponse.ok && updateData.success) {
        toast.success("Repository updated successfully!");
        await loadGitHubConfig();
      } else {
        const errorMsg = updateData.error || "Failed to update repository";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to update repository: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect GitHub integration? This will remove your API key and repository configuration.")) {
      return;
    }

    setLoading(true);
    try {
      // Delete the integration from database
      const response = await fetch("/api/integrations/github", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("GitHub integration disconnected");
        setIsConnected(false);
        setConfig({ repository: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h2>
      
      {/* GitHub Integration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <Image src="/github-142.svg" alt="GitHub" width={48} height={48} className="w-12 h-12" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">GitHub Auto-Publishing</h3>
            <p className="text-sm text-gray-600">
              Automatically publish content as GitHub Discussions
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            isConnected 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-700"
          }`}>
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {/* Show OAuth connect button when not connected */}
        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-3">
                Connect your GitHub account to automatically publish content as GitHub Discussions. 
                You'll be able to select a repository after connecting.
              </p>
              {typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ? (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-900 mb-2">
                      <strong>Setup Required:</strong> You need to create a GitHub OAuth App first.
                    </p>
                    <ol className="text-xs text-yellow-800 space-y-1 ml-4 list-decimal">
                      <li>Go to <a href="https://github.com/settings/applications/new" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">GitHub OAuth Apps</a></li>
                      <li>Click <strong>"New OAuth App"</strong></li>
                      <li>Fill in:
                        <ul className="ml-4 mt-1 list-disc">
                          <li><strong>Application name:</strong> GeoRepute AI</li>
                          <li><strong>Homepage URL:</strong> Your production domain (e.g., <code className="bg-yellow-100 px-1 rounded">https://geo-repute.com</code>)</li>
                          <li><strong>Authorization callback URL:</strong> 
                            <div className="mt-1 space-y-1">
                              <div><strong>For Production:</strong> <code className="bg-yellow-100 px-1 rounded">https://yourdomain.com/api/auth/github/callback</code></div>
                              <div><strong>For Local Testing:</strong> <code className="bg-yellow-100 px-1 rounded">http://localhost:3000/api/auth/github/callback</code></div>
                              <div className="text-red-600 font-semibold mt-2">⚠️ CRITICAL: The callback URL must match EXACTLY!</div>
                              <div className="text-xs">If you're testing locally, update your GitHub OAuth app's callback URL to: <code className="bg-yellow-100 px-1 rounded">http://localhost:3000/api/auth/github/callback</code></div>
                              <div className="text-xs">After testing, change it back to your production URL before deploying.</div>
                            </div>
                          </li>
                          <li><strong>Application description:</strong> (Optional) Auto-publish content to GitHub Discussions</li>
                        </ul>
                      </li>
                      <li><strong>"Enable Device Flow"</strong> - Optional: You can check this if you want, but it's not needed for web apps. It's for devices without browsers (smart TVs, IoT devices). Enabling it won't cause any issues.</li>
                      <li>Click <strong>"Register application"</strong></li>
                      <li>Copy the <strong>Client ID</strong> and generate a <strong>Client Secret</strong></li>
                      <li className="mt-2"><strong>Create TWO separate OAuth apps:</strong>
                        <div className="ml-4 mt-2 space-y-3">
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                            <strong className="text-blue-900">1. Development App (for localhost):</strong>
                            <ul className="text-xs text-blue-800 mt-1 ml-4 list-disc">
                              <li>Application name: <code className="bg-blue-100 px-1 rounded">GeoRepute AI (Development)</code></li>
                              <li>Homepage URL: <code className="bg-blue-100 px-1 rounded">http://localhost:3000</code></li>
                              <li>Callback URL: <code className="bg-blue-100 px-1 rounded">http://localhost:3000/api/auth/github/callback</code></li>
                              <li>Add to <code className="bg-blue-100 px-1 rounded">.env.local</code>:
                                <pre className="mt-1 p-2 bg-blue-100 rounded text-xs overflow-x-auto">
{`GITHUB_CLIENT_ID=dev_client_id
GITHUB_CLIENT_SECRET=dev_client_secret
NEXT_PUBLIC_GITHUB_CLIENT_ID=dev_client_id`}
                                </pre>
                              </li>
                            </ul>
                          </div>
                          <div className="p-2 bg-green-50 border border-green-200 rounded">
                            <strong className="text-green-900">2. Production App (for your domain):</strong>
                            <ul className="text-xs text-green-800 mt-1 ml-4 list-disc">
                              <li>Application name: <code className="bg-green-100 px-1 rounded">GeoRepute AI (Production)</code></li>
                              <li>Homepage URL: <code className="bg-green-100 px-1 rounded">https://yourdomain.com</code></li>
                              <li>Callback URL: <code className="bg-green-100 px-1 rounded">https://yourdomain.com/api/auth/github/callback</code></li>
                              <li>Add to your production environment variables (Vercel, etc.):
                                <pre className="mt-1 p-2 bg-green-100 rounded text-xs overflow-x-auto">
{`GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
NEXT_PUBLIC_GITHUB_CLIENT_ID=prod_client_id`}
                                </pre>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </li>
                      <li className="mt-2"><strong>Note:</strong> Each OAuth app will be used by ALL users in that environment. Users authenticate with their own GitHub accounts, but they all use the same OAuth app credentials for that environment.</li>
                      <li>Restart your development server after adding environment variables</li>
                    </ol>
                  </div>
                  <button
                    onClick={() => window.open("https://github.com/settings/applications/new", "_blank")}
                    className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center gap-2 font-medium"
                  >
                    <Image src="/github-142.svg" alt="GitHub" width={20} height={20} className="w-5 h-5" />
                    Create GitHub OAuth App
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectGitHub}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Image src="/github-142.svg" alt="GitHub" width={20} height={20} className="w-5 h-5" />
                      Connect GitHub Account
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">
                <strong>Note:</strong> Make sure Discussions are enabled in your repository settings 
                (Settings → General → Features → Discussions)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {username && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900">
                  <strong>Connected as:</strong> {username}
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repository *
              </label>
              {repositories.length > 0 ? (
                <select
                  value={config.repository}
                  onChange={(e) => setConfig({ ...config, repository: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                >
                  <option value="">Select a repository</option>
                  {repositories.map((repo) => (
                    <option key={repo.full_name} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.repository}
                  onChange={(e) => setConfig({ ...config, repository: e.target.value })}
                  placeholder="georepute/my-blog"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Format: <code className="bg-gray-100 px-1 rounded">owner/repository-name</code> (e.g., georepute/my-blog)
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveRepository}
                disabled={loading || !config.repository}
                className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Repository
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Show disconnect button when connected */}
        {isConnected && (
          <div className="pt-4">
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Disconnect
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Reddit Integration */}
      <RedditIntegrationSettings />

      {/* Medium Integration */}
      <MediumIntegrationSettings />

      {/* Quora Integration */}
      <QuoraIntegrationSettings />

      {/* Facebook Integration */}
      <FacebookIntegrationSettings />

      {/* LinkedIn Integration */}
      <LinkedInIntegrationSettings />

      {/* Instagram Integration */}
      <InstagramIntegrationSettings />

      {/* Shopify Integration */}
      <ShopifyIntegrationSettings />

      {/* WordPress.com Integration */}
      <WordPressIntegrationSettings />

      {/* Self-Hosted WordPress Integration */}
      <SelfHostedWordPressIntegrationSettings />

      {/* Google Search Console Integration */}
      <GoogleSearchConsoleSettings />
    </div>
  );
}

// Medium Integration Component
function MediumIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email: "",
    cookies: "",
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadMediumConfig();
  }, []);

  const loadMediumConfig = async () => {
    try {
      const response = await fetch("/api/integrations/medium");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            email: data.config.email || "",
            cookies: data.config.cookies ? "***" : "",
          });
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Medium config:", error);
      setIsConnected(false);
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (!config.email) {
      toast.error("Email is required (used for account identification)");
      return;
    }
    if (!config.cookies || config.cookies === "***") {
      toast.error("Please enter cookies JSON");
      return;
    }
    
    // Validate cookies JSON format
    let parsedCookies;
    try {
      parsedCookies = JSON.parse(config.cookies);
      if (!Array.isArray(parsedCookies)) {
        toast.error("Cookies must be a JSON array. Example: [{\"name\": \"sid\", \"value\": \"...\", \"domain\": \".medium.com\"}]");
        return;
      }
      if (parsedCookies.length === 0) {
        toast.error("Cookies array is empty. Please add at least one cookie.");
        return;
      }
      // Validate each cookie has required fields
      for (const cookie of parsedCookies) {
        if (!cookie.name || !cookie.value) {
          toast.error(`Cookie is missing required fields (name or value): ${JSON.stringify(cookie)}`);
          return;
        }
      }
    } catch (parseError: any) {
      toast.error(`Invalid JSON format for cookies: ${parseError.message}`);
      return;
    }

    setLoading(true);
    try {
      console.log("🍪 Sending cookies:", parsedCookies.length, "cookies");
      
      const response = await fetch("/api/integrations/medium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email,
          cookies: parsedCookies,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Medium configuration saved!");
        setIsConnected(true);
        setConfig({ email: "", cookies: "" });
        await loadMediumConfig();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Medium integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/medium", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Medium integration disconnected");
        setIsConnected(false);
        setConfig({ email: "", cookies: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/medium-square.svg" alt="Medium" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Medium Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to Medium using Selenium
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-900">
              <strong>⚠️ Note:</strong> Medium doesn't provide an official API. We use browser automation (Playwright) to publish content. 
              This requires your login credentials or session cookies.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for account identification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Cookies (JSON) *
            </label>
            <textarea
              value={config.cookies}
              onChange={(e) => setConfig({ ...config, cookies: e.target.value })}
              placeholder='[{"name": "session", "value": "...", "domain": ".medium.com"}]'
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Extract cookies from your browser after logging into Medium. Use browser DevTools → Application → Cookies.
              <a href="/docs/HOW_TO_GET_SESSION_COOKIES.md" target="_blank" className="text-primary-600 hover:underline ml-1">
                View detailed guide →
              </a>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || !config.email || !config.cookies}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Quora Integration Component
function QuoraIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email: "",
    cookies: "",
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadQuoraConfig();
  }, []);

  const loadQuoraConfig = async () => {
    try {
      const response = await fetch("/api/integrations/quora");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            email: data.config.email || "",
            cookies: data.config.cookies ? "***" : "",
          });
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Quora config:", error);
      setIsConnected(false);
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (!config.email) {
      toast.error("Email is required (used for account identification)");
      return;
    }
    if (!config.cookies || config.cookies === "***") {
      toast.error("Please enter cookies JSON");
      return;
    }
    
    // Validate cookies JSON format
    let parsedCookies;
    try {
      parsedCookies = JSON.parse(config.cookies);
      if (!Array.isArray(parsedCookies)) {
        toast.error("Cookies must be a JSON array. Example: [{\"name\": \"m-b\", \"value\": \"...\", \"domain\": \".quora.com\"}]");
        return;
      }
      if (parsedCookies.length === 0) {
        toast.error("Cookies array is empty. Please add at least one cookie.");
        return;
      }
      // Validate each cookie has required fields
      for (const cookie of parsedCookies) {
        if (!cookie.name || !cookie.value) {
          toast.error(`Cookie is missing required fields (name or value): ${JSON.stringify(cookie)}`);
          return;
        }
      }
    } catch (parseError: any) {
      toast.error(`Invalid JSON format for cookies: ${parseError.message}`);
      return;
    }

    setLoading(true);
    try {
      console.log("🍪 Sending cookies:", parsedCookies.length, "cookies");
      
      const response = await fetch("/api/integrations/quora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: config.email,
          cookies: parsedCookies,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Quora configuration saved!");
        setIsConnected(true);
        setConfig({ email: "", cookies: "" });
        await loadQuoraConfig();
      } else {
        toast.error(data.error || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save configuration: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Quora integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/quora", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Quora integration disconnected");
        setIsConnected(false);
        setConfig({ email: "", cookies: "" });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/quora.svg" alt="Quora" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Quora Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to Quora using Selenium
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-900">
              <strong>⚠️ Note:</strong> Quora doesn't provide an official API. We use browser automation (Selenium) to publish content. 
              This requires your email and session cookies.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for account identification
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Cookies (JSON) *
            </label>
            <textarea
              value={config.cookies}
              onChange={(e) => setConfig({ ...config, cookies: e.target.value })}
              placeholder='[{"name": "m-b", "value": "...", "domain": ".quora.com"}]'
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Extract cookies from your browser after logging into Quora. Use browser DevTools → Application → Cookies.
              <a href="/docs/HOW_TO_GET_SESSION_COOKIES.md" target="_blank" className="text-primary-600 hover:underline ml-1">
                View detailed guide →
              </a>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || !config.email || !config.cookies}
              className="px-6 py-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}


// LinkedIn Integration Component
function LinkedInIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [fullName, setFullName] = useState("");
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    loadLinkedInConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const linkedinStatus = urlParams.get("linkedin");
    
    if (linkedinStatus === "connected") {
      const name = urlParams.get("name");
      toast.success(`LinkedIn connected successfully!${name ? ` Connected as: ${name}` : ""}`);
      // Reload config
      loadLinkedInConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (linkedinStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`LinkedIn connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadLinkedInConfig = async () => {
    try {
      const response = await fetch("/api/integrations/linkedin");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setFullName(data.config.fullName || "");
          setIsConnected(data.config.verified || false);
          setDaysUntilExpiration(data.config.daysUntilExpiration);
          setIsExpiringSoon(data.config.isExpiringSoon || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading LinkedIn config:", error);
      setIsConnected(false);
    }
  };

  const handleConnectLinkedIn = () => {
    // Get LinkedIn Client ID from environment
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/linkedin/callback`;
    // Note: w_member_social grants access to Social Actions API endpoints
    // r_social_actions is not a valid OAuth scope - Social Actions API is accessible via w_member_social
    const scope = "openid profile w_member_social";
    const state = Date.now().toString(); // Simple state for CSRF protection
    
    if (!clientId) {
      toast.error("LinkedIn Client ID not configured. Please contact support.");
      return;
    }
    
    // Redirect to LinkedIn OAuth
    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}` +
      `&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = linkedInAuthUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect LinkedIn integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/linkedin", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("LinkedIn integration disconnected");
        setIsConnected(false);
        setFullName("");
        setDaysUntilExpiration(null);
        setIsExpiringSoon(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="linkedin-integration" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/linkedin.svg" alt="LinkedIn" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">LinkedIn Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to your LinkedIn profile
            {fullName && isConnected && ` - ${fullName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>ℹ️ Note:</strong> Connect your LinkedIn account to automatically publish content to your LinkedIn profile. Posts will appear on your personal LinkedIn feed.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Image src="/linkedin.svg" alt="LinkedIn" width={64} height={64} className="w-16 h-16 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Connect with LinkedIn
            </h4>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
              Click the button below to securely connect your LinkedIn account. 
              We'll request permission to post on your behalf.
            </p>
            <button
              onClick={handleConnectLinkedIn}
              disabled={loading}
              className="px-8 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Image src="/linkedin.svg" alt="LinkedIn" width={20} height={20} className="w-5 h-5" />
                  Connect LinkedIn
                </>
              )}
            </button>
            <p className="mt-4 text-xs text-gray-500 text-center max-w-md">
              Your access token will be valid for 60 days. You'll be notified when it's time to reconnect.
            </p>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> {fullName || "LinkedIn Profile"}
            </p>
            {daysUntilExpiration !== null && (
              <p className="text-xs text-green-700 mt-1">
                Token expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
                {isExpiringSoon && (
                  <span className="ml-2 text-orange-600 font-semibold">
                    ⚠️ Expiring soon - please reconnect
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Instagram Integration Component
function InstagramIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [pageName, setPageName] = useState("");
  const [daysUntilExpiration, setDaysUntilExpiration] = useState<number | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    loadInstagramConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const instagramStatus = urlParams.get("instagram");
    
    if (instagramStatus === "connected") {
      const username = urlParams.get("username");
      toast.success(`Instagram connected successfully!${username ? ` Connected as: @${username}` : ""}`);
      // Reload config
      loadInstagramConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (instagramStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`Instagram connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadInstagramConfig = async () => {
    try {
      const response = await fetch("/api/integrations/instagram");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setUsername(data.config.username || "");
          setPageName(data.config.pageName || "");
          setIsConnected(data.config.verified || false);
          setDaysUntilExpiration(data.config.daysUntilExpiration);
          setIsExpiringSoon(data.config.isExpiringSoon || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Instagram config:", error);
      setIsConnected(false);
    }
  };

  const handleConnectInstagram = () => {
    // Get Facebook App ID from environment (Instagram uses Facebook OAuth)
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/instagram/callback`;
    // Request permissions for Instagram and Pages (pages_manage_posts needed for Instagram Business Account access)
    // business_management: Access to Business Portfolio Pages (Meta Business Suite)
    // NOTE: Using instagram_basic for Development (no App Review needed)
    //       Switch to instagram_business_basic for Production (requires App Review)
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management";
    
    if (!appId) {
      toast.error("Facebook App ID not configured. Please contact support.");
      return;
    }
    
    // Redirect to Facebook OAuth (Instagram uses Facebook OAuth)
    const instagramAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${Date.now()}`; // Simple state for CSRF protection
    
    window.location.href = instagramAuthUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Instagram integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/instagram", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Instagram integration disconnected");
        setIsConnected(false);
        setUsername("");
        setPageName("");
        setDaysUntilExpiration(null);
        setIsExpiringSoon(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="instagram-integration" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Instagram Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to your Instagram Business account
            {username && isConnected && ` - @${username}`}
            {pageName && isConnected && ` (via ${pageName})`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs text-purple-900">
              <strong>ℹ️ Note:</strong> Connect your Instagram Business account to automatically publish content. 
              Your Instagram account must be a Business account and connected to a Facebook Page.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={64} height={64} className="w-16 h-16 mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Connect with Instagram
            </h4>
            <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
              Click the button below to securely connect your Instagram Business account. 
              We'll automatically detect your Instagram account connected to your Facebook Page.
            </p>
            <button
              onClick={handleConnectInstagram}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Image src="/instagram-1-svgrepo-com.svg" alt="Instagram" width={20} height={20} className="w-5 h-5" />
                  Connect Instagram
                </>
              )}
            </button>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md">
              <p className="text-xs text-yellow-900">
                <strong>⚠️ Requirements:</strong>
              </p>
              <ul className="text-xs text-yellow-800 mt-1 list-disc list-inside space-y-1">
                <li>Instagram Business account (not personal)</li>
                <li>Connected to a Facebook Page</li>
                <li>Admin access to the Facebook Page</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> @{username || "Instagram Business Account"}
              {pageName && ` via ${pageName}`}
            </p>
            {daysUntilExpiration !== null && (
              <p className="text-xs text-green-700 mt-1">
                Token expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
                {isExpiringSoon && (
                  <span className="ml-2 text-orange-600 font-semibold">
                    ⚠️ Expiring soon - please reconnect
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Facebook Integration Component
function FacebookIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    email: "",
    accessToken: "",
  });
  const [isConnected, setIsConnected] = useState(false);
  const [pageName, setPageName] = useState("");

  useEffect(() => {
    loadFacebookConfig();
    
    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const facebookStatus = urlParams.get("facebook");
    
    if (facebookStatus === "connected") {
      const pageName = urlParams.get("page");
      toast.success(`Facebook connected successfully!${pageName ? ` Connected to: ${pageName}` : ""}`);
      // Reload config
      loadFacebookConfig();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    } else if (facebookStatus === "error") {
      const errorMessage = urlParams.get("message");
      toast.error(`Facebook connection failed: ${errorMessage || "Unknown error"}`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  const loadFacebookConfig = async () => {
    try {
      const response = await fetch("/api/integrations/facebook");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setConfig({
            email: data.config.email || "",
            accessToken: "",
          });
          setPageName(data.config.pageName || "");
          setIsConnected(data.config.verified || false);
        } else {
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error loading Facebook config:", error);
      setIsConnected(false);
    }
  };

  const handleConnectFacebook = () => {
    // Get Facebook App ID from environment (or use a config)
    // For now, we'll construct the OAuth URL
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`;
    // Required permissions: pages_show_list (to list pages), pages_read_engagement (to read page data), pages_manage_posts (to post to pages)
    // business_management: Access to Business Portfolio Pages (Meta Business Suite)
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts,business_management";
    
    if (!appId) {
      toast.error("Facebook App ID not configured. Please contact support.");
      return;
    }
    
    // Redirect to Facebook OAuth
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${Date.now()}`; // Simple state for CSRF protection
    
    window.location.href = facebookAuthUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Facebook integration?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/facebook", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Facebook integration disconnected");
        setIsConnected(false);
        setConfig({ email: "", accessToken: "" });
        setPageName("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="facebook-integration" className="bg-white border border-gray-200 rounded-lg p-6 mb-6 scroll-mt-20">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/facebook-color.svg" alt="Facebook" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Facebook Auto-Publishing</h3>
          <p className="text-sm text-gray-600">
            Automatically publish content to your Facebook Page using Graph API
            {pageName && isConnected && ` - ${pageName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              <strong>ℹ️ Note:</strong> Connect your Facebook account to automatically publish content to your Facebook Page. No manual token entry needed!
            </p>
          </div>

          {/* OAuth Connect Button */}
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Image src="/facebook-color.svg" alt="Facebook" width={64} height={64} className="w-16 h-16 mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Connect with Facebook
                </h4>
                <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
                  Click the button below to securely connect your Facebook account. 
                  We'll automatically detect your pages and set up publishing.
                </p>
                <button
                  onClick={handleConnectFacebook}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Image src="/facebook-color.svg" alt="Facebook" width={20} height={20} className="w-5 h-5" />
                      Connect Facebook
                    </>
                  )}
                </button>
              </div>
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> {pageName || "Facebook Page"} {config.email && `(${config.email})`}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Shopify Integration Component
function ShopifyIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [shopName, setShopName] = useState("");
  const [connectedDomain, setConnectedDomain] = useState("");

  useEffect(() => {
    loadShopifyConfig();
    
    // Check for success/error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const error = urlParams.get("error");
    const tab = urlParams.get("tab");
    
    if (tab === "integrations") {
      if (success) {
        toast.success(success);
        loadShopifyConfig();
        // Clean URL
        window.history.replaceState({}, "", "/dashboard/settings?tab=integrations");
      } else if (error) {
        toast.error(error);
        // Clean URL
        window.history.replaceState({}, "", "/dashboard/settings?tab=integrations");
      }
    }
  }, []);

  const loadShopifyConfig = async () => {
    try {
      const response = await fetch("/api/integrations/shopify");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connected && data.config) {
          setIsConnected(true);
          setShopName(data.config.shopName || "");
          setConnectedDomain(data.config.shopDomain || "");
        } else {
          setIsConnected(false);
          setShopName("");
          setConnectedDomain("");
        }
      }
    } catch (error) {
      console.error("Error loading Shopify config:", error);
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    if (!shopDomain.trim()) {
      toast.error("Please enter your Shopify store domain");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
          shopDomain: shopDomain.trim(),
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.authUrl) {
        // Redirect to Shopify OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to initiate Shopify connection");
      }
    } catch (error: any) {
      console.error("Shopify connect error:", error);
      toast.error("Failed to connect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Shopify store?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/shopify", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Shopify disconnected successfully");
        setIsConnected(false);
        setShopName("");
        setConnectedDomain("");
        setShopDomain("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/shopify.svg" alt="Shopify" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Shopify Blog Publishing</h3>
          <p className="text-sm text-gray-600">
            Publish blog posts directly to your Shopify store
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 mb-4">
              Connect your Shopify store to publish blog posts directly. You'll be redirected to Shopify to authorize access.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shopify Store Domain *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="mystore"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
                />
                <span className="flex items-center px-3 bg-gray-100 border border-gray-300 border-l-0 rounded-r-lg text-gray-500 text-sm">
                  .myshopify.com
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your store name (e.g., "mystore" for mystore.myshopify.com)
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={loading || !shopDomain.trim()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Connect Shopify Store
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> You'll need to be logged into your Shopify admin to authorize the connection.
              We only request permission to read and write blog content.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Connected to: {shopName || connectedDomain}
                </p>
                <p className="text-xs text-green-700">
                  {connectedDomain}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Ready to publish!</strong> Go to the <Link href="/dashboard/blog" className="text-blue-600 hover:underline font-medium">Blog section</Link> in Content Generator to create and publish blog posts to your Shopify store.
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Disconnect Shopify
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// WordPress.com Integration Component
function WordPressIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [sites, setSites] = useState<Array<{ ID: number; name: string; URL: string }>>([]);
  const [showSiteSelector, setShowSiteSelector] = useState(false);

  useEffect(() => {
    loadWordPressConfig();
    
    // Check for success/error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const error = urlParams.get("error");
    const tab = urlParams.get("tab");
    
    if (tab === "integrations") {
      if (success && success.includes("WordPress")) {
        toast.success(success);
        loadWordPressConfig();
        // Clean URL
        window.history.replaceState({}, "", "/dashboard/settings?tab=integrations");
      } else if (error) {
        // Error is handled by Shopify component, but refresh config anyway
        loadWordPressConfig();
      }
    }
  }, []);

  const loadWordPressConfig = async () => {
    try {
      const response = await fetch("/api/integrations/wordpress");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connected && data.config) {
          setIsConnected(true);
          setUsername(data.config.username || "");
          setSiteName(data.config.siteName || "");
          setSiteUrl(data.config.siteUrl || "");
        } else {
          setIsConnected(false);
          setUsername("");
          setSiteName("");
          setSiteUrl("");
        }
      }
    } catch (error) {
      console.error("Error loading WordPress config:", error);
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate",
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.authUrl) {
        // Redirect to WordPress.com OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to initiate WordPress.com connection");
      }
    } catch (error: any) {
      console.error("WordPress connect error:", error);
      toast.error("Failed to connect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your WordPress.com account?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("WordPress.com disconnected successfully");
        setIsConnected(false);
        setUsername("");
        setSiteName("");
        setSiteUrl("");
        setSites([]);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-sites" }),
      });

      const data = await response.json();
      if (response.ok && data.sites) {
        setSites(data.sites);
        setShowSiteSelector(true);
      } else {
        toast.error(data.error || "Failed to load sites");
      }
    } catch (error: any) {
      console.error("Load sites error:", error);
      toast.error("Failed to load sites: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSite = async (site: { ID: number; name: string; URL: string }) => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "select-site",
          siteId: site.ID,
          siteName: site.name,
          siteUrl: site.URL,
        }),
      });

      if (response.ok) {
        toast.success(`Selected site: ${site.name}`);
        setSiteName(site.name);
        setSiteUrl(site.URL);
        setShowSiteSelector(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to select site");
      }
    } catch (error: any) {
      console.error("Select site error:", error);
      toast.error("Failed to select site: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <Image src="/wordpress.svg" alt="WordPress" width={48} height={48} className="w-12 h-12" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">WordPress.com Blog Publishing</h3>
          <p className="text-sm text-gray-600">
            Publish blog posts directly to your WordPress.com site
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 mb-4">
              Connect your WordPress.com account to publish blog posts directly. You'll be redirected to WordPress.com to authorize access.
            </p>
            
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Connect WordPress.com
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> This integration works with WordPress.com hosted sites only. 
              For self-hosted WordPress.org sites, use the <strong>Self-Hosted WordPress</strong> integration below.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Connected as: {username}
                </p>
                {siteName && (
                  <p className="text-xs text-green-700">
                    Selected site: {siteName}
                  </p>
                )}
                {siteUrl && (
                  <a 
                    href={siteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:underline"
                  >
                    {siteUrl}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Site Selector */}
          {showSiteSelector && sites.length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">Select a site to publish to:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sites.map((site) => (
                  <button
                    key={site.ID}
                    onClick={() => handleSelectSite(site)}
                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{site.name}</p>
                    <p className="text-xs text-gray-500">{site.URL}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={loadSites}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {showSiteSelector ? "Refresh Sites" : "Change Site"}
            </button>

            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Disconnect
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Ready to publish!</strong> Go to the <Link href="/dashboard/blog" className="text-blue-600 hover:underline font-medium">Blog section</Link> in Content Generator to create and publish blog posts to your WordPress.com site.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Self-Hosted WordPress Integration Component
function SelfHostedWordPressIntegrationSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  
  // Form fields
  const [formSiteUrl, setFormSiteUrl] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formAppPassword, setFormAppPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadSelfHostedWordPressConfig();
  }, []);

  const loadSelfHostedWordPressConfig = async () => {
    try {
      const response = await fetch("/api/integrations/wordpress-self-hosted");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connected && data.config) {
          setIsConnected(true);
          setSiteName(data.config.siteName || "");
          setSiteUrl(data.config.siteUrl || "");
          setUsername(data.config.username || "");
        } else {
          setIsConnected(false);
          setSiteName("");
          setSiteUrl("");
          setUsername("");
        }
      }
    } catch (error) {
      console.error("Error loading self-hosted WordPress config:", error);
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    if (!formSiteUrl || !formUsername || !formAppPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress-self-hosted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          siteUrl: formSiteUrl,
          username: formUsername,
          applicationPassword: formAppPassword,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Self-hosted WordPress connected successfully!");
        setIsConnected(true);
        setSiteName(data.siteInfo?.name || formSiteUrl);
        setSiteUrl(formSiteUrl);
        setUsername(formUsername);
        // Clear form
        setFormSiteUrl("");
        setFormUsername("");
        setFormAppPassword("");
      } else {
        toast.error(data.error || "Failed to connect to WordPress");
      }
    } catch (error: any) {
      console.error("Self-hosted WordPress connect error:", error);
      toast.error("Failed to connect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your self-hosted WordPress site?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress-self-hosted", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Self-hosted WordPress disconnected successfully");
        setIsConnected(false);
        setSiteName("");
        setSiteUrl("");
        setUsername("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/wordpress-self-hosted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Connection verified successfully!");
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error: any) {
      toast.error("Verification failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
            <path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Self-Hosted WordPress</h3>
          <p className="text-sm text-gray-600">
            Connect your own WordPress site using Application Passwords
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-600"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-900 mb-4">
              Connect your self-hosted WordPress site (WordPress.org) to publish blog posts directly. 
              This works with any WordPress site hosted on your own server or hosting provider.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site URL
                </label>
                <input
                  type="url"
                  value={formSiteUrl}
                  onChange={(e) => setFormSiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WordPress Username
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Application Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formAppPassword}
                    onChange={(e) => setFormAppPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleConnect}
                disabled={loading || !formSiteUrl || !formUsername || !formAppPassword}
                className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect WordPress Site
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">
              <strong>How to get an Application Password:</strong>
            </p>
            <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1">
              <li>Log in to your WordPress admin (yoursite.com/wp-admin)</li>
              <li>Go to Users → Profile</li>
              <li>Scroll down to "Application Passwords"</li>
              <li>Enter a name (e.g., "GeoRepute.ai") and click "Add New"</li>
              <li>Copy the generated password (it will look like: xxxx xxxx xxxx xxxx)</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Note:</strong> Application Passwords require WordPress 5.6+ and HTTPS.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 uppercase">Site Name</p>
              <p className="font-medium text-gray-900">{siteName || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Username</p>
              <p className="font-medium text-gray-900">{username || "Unknown"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase">Site URL</p>
              <a 
                href={siteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-orange-600 hover:text-orange-700 hover:underline"
              >
                {siteUrl}
              </a>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Verify Connection
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Disconnect
            </button>
          </div>

          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-900">
              <strong>Ready to publish!</strong> Go to the <Link href="/dashboard/blog" className="text-orange-600 hover:underline font-medium">Blog section</Link> in Content Generator to create and publish blog posts to your self-hosted WordPress site.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Google Search Console Integration Component
function GoogleSearchConsoleSettings() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sites, setSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState("");

  useEffect(() => {
    checkGSCStatus();
    
    // Check for success param in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "gsc_connected") {
      // Refresh status after successful connection
      setTimeout(() => {
        checkGSCStatus();
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }, 500);
    }
  }, []);

  const checkGSCStatus = async () => {
    try {
      const response = await fetch("/api/integrations/google-search-console");
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setSites(data.sites || []);
        setSelectedSite(data.selectedSite || "");
      }
    } catch (error) {
      console.error("Error checking GSC status:", error);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Redirect to OAuth flow
      window.location.href = "/api/integrations/google-search-console/auth";
    } catch (error) {
      console.error("Error initiating GSC connection:", error);
      toast.error("Failed to initiate connection");
      setLoading(false);
    }
  };

  const handleSiteChange = async (newSite: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/google-search-console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSite: newSite }),
      });

      if (response.ok) {
        setSelectedSite(newSite);
        toast.success("Site updated successfully");
      } else {
        toast.error("Failed to update site");
      }
    } catch (error) {
      console.error("Error updating site:", error);
      toast.error("Failed to update site");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Search Console? Your domains and analytics data will be preserved.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/integrations/google-search-console/status", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Google Search Console disconnected successfully");
        setIsConnected(false);
        setSites([]);
        setSelectedSite("");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <Image 
              src="/google.svg" 
              alt="Google Search Console" 
              width={40} 
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="font-semibold">Google Search Console</h3>
            <p className="text-sm text-gray-600">
              Fetch real keywords people use to find your website
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isConnected 
            ? "bg-green-100 text-green-700" 
            : "bg-gray-100 text-gray-700"
        }`}>
          {isConnected ? "Connected" : "Not Connected"}
        </span>
      </div>

      {!isConnected ? (
        <div className="pt-4">
          <p className="text-sm text-gray-600 mb-4">
            Connect your Google Search Console to automatically fetch real keywords
            from your verified websites during AI Visibility analysis.
          </p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Image 
                  src="/google.svg" 
                  alt="Google" 
                  width={16} 
                  height={16}
                  className="w-4 h-4"
                />
                Connect Google Search Console
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="pt-4">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              <strong>✅ Connected:</strong> {sites.length} verified site{sites.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {sites.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Website Property
              </label>
              <select
                value={selectedSite}
                onChange={(e) => handleSiteChange(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {sites.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Keywords will be fetched from this property during AI Visibility analysis
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>When you launch AI Visibility analysis, keywords are automatically fetched from GSC</li>
              <li>GSC keywords are merged with your manual keywords for better analysis</li>
              <li>View all keywords in the "Keywords" tab of your analysis results</li>
              <li>Data is refreshed with each new analysis (last 30 days)</li>
            </ul>
          </div>

          {/* Disconnect Button */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Disconnect
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
