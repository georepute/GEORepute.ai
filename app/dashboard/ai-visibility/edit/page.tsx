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
  Eye,
  X,
  CheckCircle,
  Globe,
  Code,
  ImageIcon,
  Search,
  Trash2
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

interface PlatformSchema {
  schemaData: any;
  contentId: string;
  hasImage?: boolean;
}

interface PixabayImage {
  id: number;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  tags: string;
  user: string;
  pageURL: string;
  likes: number;
  downloads: number;
}

// Publishing platforms
const PUBLISHING_PLATFORMS = [
  { id: 'reddit', name: 'Reddit', icon: '/reddit-icon.svg', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'medium', name: 'Medium', icon: '/medium-square.svg', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'quora', name: 'Quora', icon: '/quora.svg', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'facebook', name: 'Facebook', icon: '/facebook-color.svg', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'linkedin', name: 'LinkedIn', icon: '/linkedin.svg', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'instagram', name: 'Instagram', icon: '/instagram-1-svgrepo-com.svg', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'github', name: 'GitHub', icon: '/github-142.svg', color: 'bg-gray-800 text-white border-gray-700' },
];

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

  // Publishing State
  const [publishingStep, setPublishingStep] = useState<'idle' | 'select-platforms' | 'creating-schemas' | 'review'>('idle');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformSchemas, setPlatformSchemas] = useState<{ [key: string]: PlatformSchema }>({});

  // Image Picker State
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [fetchingImages, setFetchingImages] = useState(false);
  const [pixabayImages, setPixabayImages] = useState<PixabayImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PixabayImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Schema Creation Progress
  const [schemaProgress, setSchemaProgress] = useState(0);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');

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

  // Toggle platform selection
  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  // Start approval flow - show platform selection
  const handleStartApproval = () => {
    setPublishingStep('select-platforms');
    setSelectedPlatforms([]);
  };

  // Platforms that support image publishing
  const PLATFORMS_WITH_IMAGE_SUPPORT = ['reddit', 'medium', 'quora', 'facebook', 'linkedin', 'instagram'];

  // Create schemas for selected platforms
  const handleCreateSchemas = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    setPublishingStep('creating-schemas');
    setSchemaProgress(0);
    setCurrentPlatform('');
    const schemas: { [key: string]: PlatformSchema } = {};
    const totalPlatforms = selectedPlatforms.length;

    for (let i = 0; i < selectedPlatforms.length; i++) {
      const platformId = selectedPlatforms[i];
      const platformName = PUBLISHING_PLATFORMS.find(p => p.id === platformId)?.name || platformId;
      
      // Update progress
      setCurrentPlatform(platformName);
      setSchemaProgress(Math.round((i / totalPlatforms) * 100));
      
      try {
        toast.loading(`Creating schema for ${platformName}...`, { id: `schema-${platformId}` });

        // Include image URL for platforms that support it (not GitHub)
        const includeImage = PLATFORMS_WITH_IMAGE_SUPPORT.includes(platformId) && uploadedImageUrl;
        
        const createResponse = await fetch("/api/geo-core/content-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: editedPrompt,
            targetPlatform: platformId,
            tone: "informative",
            contentType: "answer",
            targetKeywords: editData?.keywords || [],
            generatedContent: synthesizedResponse,
            skipGeneration: true,
            // Include image data for supported platforms
            imageUrl: includeImage ? uploadedImageUrl : null,
            imageData: includeImage && selectedImage ? {
              url: uploadedImageUrl,
              alt: selectedImage.tags || editedPrompt,
              photographer: selectedImage.user,
            } : null,
          }),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          toast.error(`Failed: ${platformId} - ${errorData.error || 'Unknown error'}`, { id: `schema-${platformId}` });
          continue;
        }

        const createData = await createResponse.json();
        
        schemas[platformId] = {
          schemaData: {
            ...createData.structuredSEO,
            jsonLd: createData.schema?.jsonLd,
            scriptTags: createData.schema?.scriptTags,
            // Add image to schema for platforms that support it
            ...(includeImage && {
              image: {
                url: uploadedImageUrl,
                alt: selectedImage?.tags || editedPrompt,
                photographer: selectedImage?.user,
              }
            }),
          },
          contentId: createData.contentId,
          // Flag to indicate if this platform should publish with image
          hasImage: includeImage,
        };

        // Update progress after successful creation
        setSchemaProgress(Math.round(((i + 1) / totalPlatforms) * 100));
        toast.success(`Schema created for ${platformName}!`, { id: `schema-${platformId}` });
      } catch (platformError: any) {
        console.error(`Error creating schema for ${platformId}:`, platformError);
        toast.error(`Error: ${platformId} - ${platformError.message}`, { id: `schema-${platformId}` });
      }
    }

    // Final progress update
    setSchemaProgress(100);
    setCurrentPlatform('Complete!');
    
    // Small delay to show 100% before moving to next step
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setPlatformSchemas(schemas);
    setPublishingStep('review');
    toast.success(`Schemas created for ${Object.keys(schemas).length} platform(s)! Ready for review.`);
  };

  // Reset publishing flow
  const handleResetPublishing = () => {
    setPublishingStep('idle');
    setSelectedPlatforms([]);
    setPlatformSchemas({});
  };

  // Fetch images from Pixabay using custom query or prompt
  const handleFetchImages = async (customQuery?: string) => {
    const searchQuery = customQuery || imageSearchQuery || editedPrompt;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      toast.error('Please enter a search query');
      return;
    }

    setFetchingImages(true);
    setImageError(null);
    setPixabayImages([]);
    setShowImagePicker(true);

    try {
      console.log('Calling pixabay-images with query:', searchQuery);
      
      // Call local API route
      const response = await fetch('/api/geo-core/pixabay-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: searchQuery,
          keywords: editData?.keywords || [],
        }),
      });

      const data = await response.json();
      console.log('Pixabay response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch images');
      }
      
      if (data?.images && data.images.length > 0) {
        setPixabayImages(data.images);
        console.log('Found images:', data.images.length);
      } else {
        console.log('No images in response:', data);
        setImageError('No images found. Try a different search query.');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setImageError(err instanceof Error ? err.message : 'Failed to fetch images');
    } finally {
      setFetchingImages(false);
    }
  };

  // Initialize search query from prompt when it changes
  useEffect(() => {
    if (editedPrompt && !imageSearchQuery) {
      setImageSearchQuery(editedPrompt);
    }
  }, [editedPrompt]);

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (imageUrl: string, imageId: number): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Fetch the image from Pixabay
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `content-image-${imageId}-${timestamp}.jpg`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('platform-content-images')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('platform-content-images')
        .getPublicUrl(data.path);

      console.log('Image uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast.error('Failed to upload image to storage');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Select an image and upload to Supabase Storage
  const handleSelectImage = async (image: PixabayImage) => {
    setSelectedImage(image);
    setShowImagePicker(false);
    
    // Upload image to Supabase Storage in background
    toast.loading('Uploading image...', { id: 'image-upload' });
    const publicUrl = await uploadImageToStorage(image.largeImageURL, image.id);
    
    if (publicUrl) {
      setUploadedImageUrl(publicUrl);
      toast.success('Image uploaded successfully!', { id: 'image-upload' });
    } else {
      toast.error('Failed to upload image, but you can still continue', { id: 'image-upload' });
    }
  };

  // Remove selected image
  const handleRemoveImage = async () => {
    // Optionally delete from storage (keeping it for now as images might be reused)
    setSelectedImage(null);
    setUploadedImageUrl(null);
    toast.success('Image removed');
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

            {/* Image Picker Section */}
            {synthesizedResponse && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-600" />
                      <h2 className="font-semibold text-gray-900">Content Image</h2>
                    </div>
                    {selectedImage && (
                      <button
                        onClick={handleRemoveImage}
                        className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Add an image to publish with your content
                  </p>
                </div>
                <div className="p-4">
                  {!selectedImage ? (
                    <div className="space-y-3">
                      {/* Editable Search Query */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600">Search Query</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={imageSearchQuery}
                            onChange={(e) => setImageSearchQuery(e.target.value)}
                            placeholder="Enter search terms for images..."
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all text-sm text-gray-800"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !fetchingImages) {
                                handleFetchImages();
                              }
                            }}
                          />
                          <button
                            onClick={() => handleFetchImages()}
                            disabled={fetchingImages || !imageSearchQuery.trim()}
                            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {fetchingImages ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">Search</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Quick suggestions */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-gray-400">Suggestions:</span>
                        {editData?.keywords.slice(0, 3).map((kw, i) => (
                          <button
                            key={i}
                            onClick={() => setImageSearchQuery(kw)}
                            className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs hover:bg-cyan-100 transition-colors"
                          >
                            {kw}
                          </button>
                        ))}
                        <button
                          onClick={() => setImageSearchQuery(editedPrompt)}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
                        >
                          Use prompt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Selected Image Preview */}
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 group">
                        <Image
                          src={uploadedImageUrl || selectedImage.webformatURL}
                          alt="Selected content image"
                          fill
                          className="object-cover"
                        />
                        {/* Upload status indicator */}
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                              <span className="text-sm text-gray-700">Uploading...</span>
                            </div>
                          </div>
                        )}
                        {uploadedImageUrl && !uploadingImage && (
                          <div className="absolute top-2 left-2">
                            <div className="bg-green-500 text-white rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={handleFetchImages}
                            className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-lg"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Change Image
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Photo by: <strong className="text-gray-700">{selectedImage.user}</strong></span>
                        <a
                          href={selectedImage.pageURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                        >
                          View on Pixabay
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {/* Platform support note */}
                      <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <strong>Note:</strong> Image will be published to Reddit, Medium, Quora, Facebook, LinkedIn, Instagram. GitHub publishes content without images.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image Picker Modal */}
            {showImagePicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                  <div className="px-5 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-cyan-600" />
                        Select an Image
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Choose one image from the results below
                      </p>
                    </div>
                    <button
                      onClick={() => setShowImagePicker(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 overflow-y-auto max-h-[60vh]">
                    {fetchingImages ? (
                      <div className="py-12 text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-cyan-600 mx-auto mb-3" />
                        <p className="text-gray-600">Searching for images...</p>
                        <p className="text-sm text-gray-400 mt-1">Extracting key terms from your prompt</p>
                      </div>
                    ) : imageError ? (
                      <div className="py-12 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <X className="w-6 h-6 text-red-500" />
                        </div>
                        <p className="text-red-600 font-medium">{imageError}</p>
                        <button
                          onClick={handleFetchImages}
                          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : pixabayImages.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {pixabayImages.map((image) => (
                            <button
                              key={image.id}
                              onClick={() => handleSelectImage(image)}
                              className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-cyan-500 transition-all group focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                            >
                              <Image
                                src={image.webformatURL}
                                alt={image.tags}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 shadow-lg">
                                    Select
                                  </div>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-white text-xs truncate">by {image.user}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="text-center pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            Images powered by{' '}
                            <a
                              href="https://pixabay.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:underline"
                            >
                              Pixabay
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Publishing Workflow */}
            {synthesizedResponse && (
              <>
                {/* Step 1: Approval - Show Publish Button */}
                {publishingStep === 'idle' && (
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 shadow-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl mb-3 backdrop-blur-sm">
                        <Send className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Ready to Publish?</h3>
                      <p className="text-emerald-100 text-sm mb-4">
                        Approve and publish this response to your platforms with auto-generated SEO schemas
                      </p>
                      <button
                        onClick={handleStartApproval}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-all shadow-lg"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve & Select Platforms
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Platform Selection */}
                {publishingStep === 'select-platforms' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Select Publishing Platforms</h2>
                      </div>
                      <button
                        onClick={handleResetPublishing}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Choose where to publish this optimized response. Schemas will be auto-generated for each platform.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {PUBLISHING_PLATFORMS.map((platform) => (
                          <button
                            key={platform.id}
                            onClick={() => handlePlatformToggle(platform.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                              selectedPlatforms.includes(platform.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="relative w-5 h-5 flex-shrink-0">
                              <Image
                                src={platform.icon}
                                alt={platform.name}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                            {selectedPlatforms.includes(platform.id) && (
                              <Check className="w-4 h-4 text-blue-600 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                          {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
                        </span>
                        <button
                          onClick={handleCreateSchemas}
                          disabled={selectedPlatforms.length === 0}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Code className="w-4 h-4" />
                          Generate Schemas
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Creating Schemas with Progress */}
                {publishingStep === 'creating-schemas' && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="text-center mb-6">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          {/* Circular Progress */}
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="#E5E7EB"
                              strokeWidth="6"
                              fill="none"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="36"
                              stroke="url(#progressGradient)"
                              strokeWidth="6"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 36}`}
                              strokeDashoffset={`${2 * Math.PI * 36 * (1 - schemaProgress / 100)}`}
                              className="transition-all duration-500 ease-out"
                            />
                            <defs>
                              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold text-gray-900">{schemaProgress}%</span>
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Creating Platform Schemas</h3>
                        <p className="text-sm text-gray-500">
                          {currentPlatform ? (
                            <>Processing: <span className="font-medium text-blue-600">{currentPlatform}</span></>
                          ) : (
                            'Initializing...'
                          )}
                        </p>
                      </div>
                      
                      {/* Linear Progress Bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${schemaProgress}%` }}
                        />
                      </div>
                      
                      {/* Platform Status */}
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {selectedPlatforms.map((platformId, index) => {
                          const platform = PUBLISHING_PLATFORMS.find(p => p.id === platformId);
                          const currentIndex = selectedPlatforms.findIndex(p => 
                            PUBLISHING_PLATFORMS.find(pl => pl.id === p)?.name === currentPlatform
                          );
                          const isComplete = index < currentIndex || (currentPlatform === 'Complete!');
                          const isCurrent = PUBLISHING_PLATFORMS.find(p => p.id === platformId)?.name === currentPlatform;
                          
                          return (
                            <div
                              key={platformId}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                isComplete 
                                  ? 'bg-green-100 text-green-700' 
                                  : isCurrent 
                                    ? 'bg-blue-100 text-blue-700 animate-pulse' 
                                    : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {platform && (
                                <div className="relative w-3.5 h-3.5">
                                  <Image src={platform.icon} alt={platform.name} fill className="object-contain" />
                                </div>
                              )}
                              <span>{platform?.name}</span>
                              {isComplete && <Check className="w-3 h-3" />}
                              {isCurrent && <Loader2 className="w-3 h-3 animate-spin" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Schemas Created - Redirect to Publication */}
                {publishingStep === 'review' && (
                  <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden ring-2 ring-green-100">
                    <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                      <h2 className="font-semibold text-green-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Schemas Created Successfully!
                      </h2>
                      <p className="text-xs text-green-700 mt-0.5">
                        {Object.keys(platformSchemas).length} platform schema{Object.keys(platformSchemas).length !== 1 ? 's' : ''} ready for publishing
                      </p>
                    </div>
                    <div className="p-4">
                      {/* Platform badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Object.keys(platformSchemas).map((platformId) => {
                          const platform = PUBLISHING_PLATFORMS.find(p => p.id === platformId);
                          return (
                            <div
                              key={platformId}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm"
                            >
                              {platform && (
                                <div className="relative w-4 h-4">
                                  <Image src={platform.icon} alt={platform.name} fill className="object-contain" />
                                </div>
                              )}
                              <span className="text-green-700">{platform?.name || platformId}</span>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        Your content and schemas are ready. Go to the Publication page to:
                      </p>
                      
                      <ul className="space-y-2 text-sm text-gray-600 mb-6">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Publish immediately to selected platforms</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Schedule for later publication</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>View and review full schemas</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>Edit or cancel before publishing</span>
                        </li>
                      </ul>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                          onClick={handleResetPublishing}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            // Store data for publication page
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
                                status: 'review',
                                selectedPlatforms: Object.keys(platformSchemas),
                                publishedUrls: [],
                                platformSchemas: platformSchemas,
                                // Include selected image data with Supabase Storage URL
                                image: selectedImage ? {
                                  id: selectedImage.id,
                                  url: uploadedImageUrl || selectedImage.largeImageURL, // Prefer Supabase URL
                                  storageUrl: uploadedImageUrl, // Supabase Storage URL
                                  originalUrl: selectedImage.largeImageURL, // Original Pixabay URL
                                  previewUrl: selectedImage.webformatURL,
                                  photographer: selectedImage.user,
                                  sourceUrl: selectedImage.pageURL,
                                  tags: selectedImage.tags,
                                } : null,
                              }],
                              projectName: editData?.brandName || 'AI Visibility Response',
                              projectId: editData?.projectId || '',
                            };
                            sessionStorage.setItem('aiVisibilityResponses', JSON.stringify(publicationData));
                            router.push('/dashboard/content?source=ai-visibility');
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                        >
                          <Send className="w-5 h-5" />
                          Go to Publication Page
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
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

