"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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
  Send,
  Shield,
  RefreshCw,
  Loader2,
  MessageSquare,
  CheckCircle,
  X
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ImageUpload from "@/components/ImageUpload";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function ContentGeneratorPageInner() {
  const { language } = useLanguage();
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Step 1: User Input
  const [topic, setTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("reddit");
  const [influenceLevel, setInfluenceLevel] = useState<"subtle" | "moderate" | "strong">("subtle");
  const [imageUrl, setImageUrl] = useState(""); // For Instagram posts
  
  // Action plan context
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);
  const [actionPlanStepId, setActionPlanStepId] = useState<string | null>(null);
  
  // Brand Voice
  const [brandVoices, setBrandVoices] = useState<any[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);

  // Step 2: Diagnostic Scan Results
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [scanningKeywords, setScanningKeywords] = useState(false);

  // Step 3: Content Generation
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentMetadata, setContentMetadata] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [contentId, setContentId] = useState<string | null>(null); // Store content ID from generation
  const [isCreatingSchema, setIsCreatingSchema] = useState(false);

  // AI Detection & Humanization State
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  const [aiDetectionResults, setAiDetectionResults] = useState<any>(null);
  const [originalAiPercentage, setOriginalAiPercentage] = useState<number | null>(null); // Store original AI % for comparison
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [humanizedContent, setHumanizedContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

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
          const defaultVoice = data.voices?.find((v: any) => v.is_default);
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

  // Load URL params for action plan context and pre-fill form
  useEffect(() => {
    const urlActionPlanId = searchParams.get('actionPlanId');
    const urlStepId = searchParams.get('stepId');
    const urlTopic = searchParams.get('topic');
    const urlPlatform = searchParams.get('platform');
    const urlKeywords = searchParams.get('keywords');

    if (urlActionPlanId && urlStepId) {
      setActionPlanId(urlActionPlanId);
      setActionPlanStepId(urlStepId);
    }

    // Pre-fill form fields from URL params
    if (urlTopic) {
      setTopic(urlTopic);
    }
    if (urlPlatform) {
      setTargetPlatform(urlPlatform);
    }
    if (urlKeywords) {
      setTargetKeywords(urlKeywords);
    }
  }, [searchParams]);

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
      // Check if Instagram requires image
      if (targetPlatform === 'instagram' && !imageUrl.trim()) {
        toast.error("Instagram posts require an image URL");
        setGeneratingContent(false);
        return;
      }

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
          influenceLevel,
          brandVoiceId: selectedVoiceId, // Include brand voice if selected
          language: language || 'en', // Pass current language preference
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}), // Include imageUrl if provided
          actionPlanId: actionPlanId || undefined, // Link to action plan if present
          actionPlanStepId: actionPlanStepId || undefined, // Link to action plan step if present
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      setGeneratedContent(data.content);
      setOriginalContent(data.content); // Store original for comparison
      setContentId(data.contentId || null); // Store content ID if available
      setContentMetadata({
        neutralityScore: data.metadata.neutralityScore,
        tone: data.metadata.tone,
        contentType: targetPlatform === "github" ? "documentation" : "article",
        platform: data.metadata.platform,
        wordCount: data.metadata.wordCount,
        humanScore: data.metadata.humanScore || 95,
      });
      
      // Schema is ALWAYS generated automatically in the background
      if (data.schema && (data.schema.jsonLd || data.schema.scriptTags)) {
        console.log("✅ SEO Schema Generated Automatically:", {
          type: Array.isArray(data.schema.jsonLd) 
            ? data.schema.jsonLd[0]?.["@type"] || "Article"
            : data.schema.jsonLd?.["@type"] || "Article",
          available: true,
          jsonLd: data.schema.jsonLd,
          scriptTagsLength: data.schema.scriptTags?.length || 0,
        });
        console.log("📋 Schema Script Tags (for embedding):", data.schema.scriptTags);
      }
      
      toast.success("Content generated successfully!");

      // Automatically run AI detection after content is generated
      if (data.content) {
        console.log('🔍 Starting AI detection for generated content...');
        console.log('📝 Content preview (first 200 chars):', data.content.substring(0, 200));
        console.log('📏 Content length:', data.content.length);
        await detectAIInContent(data.content);
        
        // After detection completes, automatically run humanization (only once)
        // We'll do this inside detectAIInContent after results are set
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Content generation failed");
    } finally {
      setGeneratingContent(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const contentToCopy = humanizedContent || generatedContent;
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    toast.success("Content copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle using humanized version
  const handleUseHumanized = () => {
    if (humanizedContent) {
      setGeneratedContent(humanizedContent);
      setShowComparisonModal(false);
      setOriginalContent(null); // Clear original since we're using humanized
      setHumanizedContent(null); // Clear humanized since we've applied it
      setAiDetectionResults(null); // Clear AI detection results since we're using humanized
      setOriginalAiPercentage(null); // Reset original AI percentage
      toast.success('Using generated version');
      // Don't re-run detection - humanized content is already processed
    }
  };

  // Handle reverting to original
  const handleRevertToOriginal = () => {
    if (originalContent) {
      setGeneratedContent(originalContent);
      setHumanizedContent(null);
      setShowComparisonModal(false);
      setOriginalContent(null); // Clear since we're reverting
      toast.success('Reverted to original version');
      // Keep AI detection results as they are for the original content
    }
  };

  // AI Detection Function
  const detectAIInContent = async (content: string) => {
    if (!content || !content.trim()) {
      console.warn('⚠️ No content to analyze');
      return;
    }

    setIsDetectingAI(true);
    try {
      console.log('📤 Calling detect-ai Edge Function with text length:', content.length);
      
      let detectionData: any = null;
      let detectionError: any = null;
      
      // Try using supabase.functions.invoke first
      try {
        console.log('🔄 Attempting to call via supabase.functions.invoke...');
        const invokeResult = await supabase.functions.invoke('detect-ai', {
          body: { text: content, language: language || 'en' }
        });
        detectionData = invokeResult.data;
        detectionError = invokeResult.error;
        console.log('📥 Invoke result:', { hasData: !!detectionData, hasError: !!detectionError });
      } catch (invokeErr: any) {
        console.warn('⚠️ supabase.functions.invoke failed, trying direct fetch:', invokeErr);
        
        // Fallback: Use direct fetch to Edge Function
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing. Check environment variables.');
        }
        
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/detect-ai`;
        console.log('🔄 Attempting direct fetch to Edge Function:', edgeFunctionUrl.replace(supabaseAnonKey, 'KEY_HIDDEN'));
        
        const fetchResponse = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ text: content, language: language || 'en' })
        });
        
        console.log('📥 Fetch response status:', fetchResponse.status, fetchResponse.statusText);
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('❌ Fetch error response:', errorText);
          throw new Error(`Edge Function returned ${fetchResponse.status}: ${errorText.substring(0, 200)}`);
        }
        
        detectionData = await fetchResponse.json();
        console.log('✅ Fetch successful, got data:', { 
          hasAiPercentage: !!detectionData?.aiPercentage,
          aiPercentage: detectionData?.aiPercentage,
          fullResponse: detectionData
        });
      }
      
      if (detectionError) {
        console.error('❌ AI detection error:', detectionError);
        toast.error(`AI detection failed: ${detectionError.message || JSON.stringify(detectionError)}`);
      } else if (detectionData) {
        console.log('✅ AI detection successful:', {
          aiPercentage: detectionData.aiPercentage,
          topPhrasesCount: detectionData.topPhrases?.length || 0,
          rawData: detectionData
        });
        
        // Ensure we're getting the actual AI percentage - check multiple possible response formats
        let aiPercentage = 0;
        if (typeof detectionData.aiPercentage === 'number') {
          aiPercentage = detectionData.aiPercentage;
        } else if (detectionData.data && typeof detectionData.data.aiPercentage === 'number') {
          aiPercentage = detectionData.data.aiPercentage;
        } else if (detectionData.result && typeof detectionData.result.aiPercentage === 'number') {
          aiPercentage = detectionData.result.aiPercentage;
        } else {
          console.warn('⚠️ Could not find aiPercentage in response:', detectionData);
          aiPercentage = 0;
        }
        
        console.log('🔍 Final AI Percentage extracted:', aiPercentage);
        // Extract all data with fallbacks for different response formats
        const data = detectionData.data || detectionData.result || detectionData;
        // Get highlighted HTML - check multiple possible locations, fallback to content if not found
        const highlightedHtml = data.highlightedHtml || detectionData.highlightedHtml || detectionData.highlighted || content;
        console.log('🎨 Highlighted HTML check:', {
          hasDataHighlightedHtml: !!data.highlightedHtml,
          hasDetectionDataHighlightedHtml: !!detectionData.highlightedHtml,
          hasDetectionDataHighlighted: !!detectionData.highlighted,
          willUse: highlightedHtml === content ? 'content (no highlighting)' : 'highlighted HTML found',
          highlightedHtmlLength: highlightedHtml?.length
        });
        const detectionResults = {
          aiPercentage: aiPercentage,
          highlightedHtml: highlightedHtml,
          topPhrases: data.topPhrases || detectionData.topPhrases || [],
          summary: data.summary || detectionData.summary || '',
          metrics: data.metrics || detectionData.metrics || {}
        };
        
        console.log('📊 Detection results processed:', {
          aiPercentage: detectionResults.aiPercentage,
          topPhrasesCount: detectionResults.topPhrases.length,
          hasMetrics: !!detectionResults.metrics
        });
        setAiDetectionResults(detectionResults);
        
        // Store original AI percentage if this is the first detection
        if (originalAiPercentage === null && !humanizedContent) {
          setOriginalAiPercentage(aiPercentage);
        }
        
        // Automatically run humanization if AI is detected above threshold (only once on generation)
        if (aiPercentage > 20 && !humanizedContent && !isHumanizing) {
          toast.success(`AI detection complete: ${aiPercentage}% AI detected. Humanizing automatically...`);
          // Automatically humanize (runs only once on generation) - pass detection results
          setTimeout(() => {
            handleMakeItHumanAuto(content, detectionResults);
          }, 1000);
        } else {
          if (aiPercentage <= 20) {
            toast.success(`AI detection complete: ${aiPercentage}% AI detected - Content looks human!`);
          }
        }
      } else {
        console.warn('⚠️ AI detection returned no data and no error');
        toast.error('AI detection returned no data');
      }
    } catch (detectionErr: any) {
      console.error('❌ Error calling AI detection:', detectionErr);
      toast.error(`AI detection error: ${detectionErr?.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsDetectingAI(false);
    }
  };

  // Handle "Ready to Publish?" button click - Generate schema and navigate
  const handleReadyToPublish = async () => {
    if (!generatedContent || !topic || !targetKeywords) {
      toast.error("Please generate content first");
      return;
    }

    setIsCreatingSchema(true);
    try {
      const keywords = targetKeywords.split(",").map(k => k.trim()).filter(Boolean);
      
      toast.loading("Generating schema for publication...", { id: "schema-generation" });

      // Generate schema for the current content (without creating duplicate DB entry)
      const response = await fetch('/api/geo-core/content-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          targetKeywords: keywords,
          targetPlatform,
          influenceLevel,
          brandVoiceId: selectedVoiceId,
          language: language || 'en',
          generatedContent: humanizedContent || generatedContent, // Use humanized content if available
          skipGeneration: true, // Skip AI generation AND database insertion, just create schema
          contentType: targetPlatform === "github" ? "documentation" : "article",
          tone: contentMetadata?.tone || "informative",
          ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate schema');
      }

      const data = await response.json();

      // Store schema data and content info in sessionStorage for the content page
      // Use existing contentId from initial generation (not from schema generation, which won't create a new entry)
      const publishData = {
        contentId: contentId, // Use the original contentId from when content was first generated
        content: humanizedContent || generatedContent,
        topic,
        targetPlatform,
        targetKeywords: keywords,
        schema: data.schema,
        structuredSEO: data.structuredSEO,
        metadata: {
          ...contentMetadata,
          ...data.metadata,
        },
        generatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem('contentToPublish', JSON.stringify(publishData));

      toast.success("Schema generated! Redirecting to publication page...", { id: "schema-generation" });
      
      // Navigate to publication page
      router.push('/dashboard/content');
    } catch (error: any) {
      console.error('Schema generation error:', error);
      toast.error(`Failed to generate schema: ${error.message || 'Unknown error'}`, { id: "schema-generation" });
    } finally {
      setIsCreatingSchema(false);
    }
  };

  // Auto-humanize function (runs once after generation)
  const handleMakeItHumanAuto = async (contentToHumanize: string, detectionResults?: any) => {
    if (!contentToHumanize || isHumanizing || humanizedContent) {
      return; // Already humanizing/humanized or no content
    }

    setIsHumanizing(true);
    try {
      // Use passed detection results or current state
      const resultsToUse = detectionResults || aiDetectionResults;
      const detectedPhrases = resultsToUse?.topPhrases?.map((p: any) => p.phrase) || [];
      
      console.log('🤖 Auto-humanizing content...', {
        textLength: contentToHumanize.length,
        detectedPhrasesCount: detectedPhrases.length
      });

      // Store original content for comparison
      if (!originalContent) {
        setOriginalContent(contentToHumanize);
      }

      // Try using supabase.functions.invoke first
      let humanizedData: any = null;
      let humanizeError: any = null;

      try {
        console.log('🔄 Attempting to call make-it-human via supabase.functions.invoke...');
        const invokeResult = await supabase.functions.invoke('make-it-human', {
          body: {
            text: contentToHumanize,
            detectedPhrases: detectedPhrases,
            passes: 5,
            language: language || 'en'
          }
        });
        humanizedData = invokeResult.data;
        humanizeError = invokeResult.error;
        console.log('📥 Invoke result:', { hasData: !!humanizedData, hasError: !!humanizeError });
      } catch (invokeErr: any) {
        console.warn('⚠️ supabase.functions.invoke failed, trying direct fetch:', invokeErr);
        
        // Fallback: Use direct fetch to Edge Function
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing. Check environment variables.');
        }
        
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/make-it-human`;
        console.log('🔄 Attempting direct fetch to Edge Function:', edgeFunctionUrl.replace(supabaseAnonKey, 'KEY_HIDDEN'));
        
        const fetchResponse = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            text: contentToHumanize,
            detectedPhrases: detectedPhrases,
            passes: 5,
            language: language || 'en'
          })
        });
        
        console.log('📥 Fetch response status:', fetchResponse.status, fetchResponse.statusText);
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('❌ Fetch error response:', errorText);
          throw new Error(`Edge Function returned ${fetchResponse.status}: ${errorText.substring(0, 200)}`);
        }
        
        humanizedData = await fetchResponse.json();
        console.log('✅ Fetch successful, got humanized data');
      }

      if (humanizeError) {
        console.error('❌ Humanization error:', humanizeError);
        toast.error(`Humanization failed: ${humanizeError.message || JSON.stringify(humanizeError)}`);
      } else if (humanizedData && humanizedData.humanVersion) {
        console.log('✅ Auto-humanization successful:', {
          originalLength: humanizedData.length?.original,
          humanizedLength: humanizedData.length?.humanized,
          phrasesRemoved: humanizedData.detectedPhrasesRemoved
        });
        
        setHumanizedContent(humanizedData.humanVersion);
        toast.success(`Content auto-generated! ${humanizedData.detectedPhrasesRemoved || 0} AI phrases removed.`);
        
        // Automatically show comparison modal
        setShowComparisonModal(true);
      } else {
        console.warn('⚠️ Humanization returned no data');
        toast.error('Humanization returned no data');
      }
    } catch (err: any) {
      console.error('❌ Error calling humanization:', err);
      toast.error(`Humanization error: ${err?.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsHumanizing(false);
    }
  };

  // Make It Human Function (manual trigger - should not run if already auto-humanized)
  const handleMakeItHuman = async () => {
    if (!generatedContent) {
      toast.error('No content to humanize');
      return;
    }

    // Don't run again if already humanized
    if (humanizedContent || isHumanizing) {
      toast('Content is already being processed or has been generated');
      if (humanizedContent && !showComparisonModal) {
        setShowComparisonModal(true);
      }
      return;
    }

    setIsHumanizing(true);
    try {
      // Extract detected phrases for the Edge Function
      const detectedPhrases = aiDetectionResults?.topPhrases?.map((p: any) => p.phrase) || [];
      
      console.log('🤖 Starting humanization...', {
        textLength: generatedContent.length,
        detectedPhrasesCount: detectedPhrases.length
      });

      // Store original content for comparison if not already stored
      if (!originalContent) {
        setOriginalContent(generatedContent);
      }

      // Try using supabase.functions.invoke first
      let humanizedData: any = null;
      let humanizeError: any = null;

      try {
        console.log('🔄 Attempting to call make-it-human via supabase.functions.invoke...');
        const invokeResult = await supabase.functions.invoke('make-it-human', {
          body: {
            text: generatedContent,
            detectedPhrases: detectedPhrases,
            passes: 5,
            language: language || 'en'
          }
        });
        humanizedData = invokeResult.data;
        humanizeError = invokeResult.error;
        console.log('📥 Invoke result:', { hasData: !!humanizedData, hasError: !!humanizeError });
      } catch (invokeErr: any) {
        console.warn('⚠️ supabase.functions.invoke failed, trying direct fetch:', invokeErr);
        
        // Fallback: Use direct fetch to Edge Function
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing. Check environment variables.');
        }
        
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/make-it-human`;
        console.log('🔄 Attempting direct fetch to Edge Function:', edgeFunctionUrl.replace(supabaseAnonKey, 'KEY_HIDDEN'));
        
        const fetchResponse = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            text: generatedContent,
            detectedPhrases: detectedPhrases,
            passes: 5,
            language: language || 'en'
          })
        });
        
        console.log('📥 Fetch response status:', fetchResponse.status, fetchResponse.statusText);
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('❌ Fetch error response:', errorText);
          throw new Error(`Edge Function returned ${fetchResponse.status}: ${errorText.substring(0, 200)}`);
        }
        
        humanizedData = await fetchResponse.json();
        console.log('✅ Fetch successful, got humanized data');
      }

      if (humanizeError) {
        console.error('❌ Humanization error:', humanizeError);
        toast.error(`Humanization failed: ${humanizeError.message || JSON.stringify(humanizeError)}`);
      } else if (humanizedData && humanizedData.humanVersion) {
        console.log('✅ Humanization successful:', {
          originalLength: humanizedData.length?.original,
          humanizedLength: humanizedData.length?.humanized,
          phrasesRemoved: humanizedData.detectedPhrasesRemoved
        });
        
        setHumanizedContent(humanizedData.humanVersion);
        toast.success(`Content generated! ${humanizedData.detectedPhrasesRemoved || 0} AI phrases removed.`);
        
        // Show comparison modal instead of directly updating
        setShowComparisonModal(true);
      } else {
        console.warn('⚠️ Humanization returned no data');
        toast.error('Humanization returned no data');
      }
    } catch (err: any) {
      console.error('❌ Error calling humanization:', err);
      toast.error(`Humanization error: ${err?.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsHumanizing(false);
    }
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
                Create generated content that bypasses AI detectors
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
              Generate AI-detector-proof content
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

                {/* Brand Voice Profile Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Brand Voice Profile (Optional)
                    </label>
                    <Link
                      href="/dashboard/settings?tab=brand-voice"
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      + Create New
                    </Link>
                  </div>
                  <select
                    value={selectedVoiceId || ""}
                    onChange={(e) => setSelectedVoiceId(e.target.value || null)}
                    disabled={loadingVoices}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No voice profile (generic)</option>
                    {brandVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.brand_name} - {voice.tone} 
                        {voice.is_default ? " ⭐" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedVoiceId && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900 font-semibold mb-1">
                        🎭 Brand Voice Active:
                      </p>
                      <p className="text-xs text-blue-700">
                        Content will maintain consistent {brandVoices.find(v => v.id === selectedVoiceId)?.brand_name} personality
                      </p>
                    </div>
                  )}
                </div>

                {/* Image Upload (Required for Instagram, Optional for others) */}
                {targetPlatform === 'instagram' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image (Required for Instagram) *
                    </label>
                    <ImageUpload
                      onImageUploaded={(url) => setImageUrl(url)}
                      currentImageUrl={imageUrl}
                      maxSizeMB={8}
                      className="w-full"
                    />
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-900 font-semibold mb-1">
                        📸 Instagram Image Requirements:
                      </p>
                      <ul className="text-xs text-blue-700 space-y-0.5 ml-4">
                        <li>• <strong>Required</strong> for all Instagram posts</li>
                        <li>• Formats: JPEG, PNG, WebP</li>
                        <li>• <strong>Max size: 8MB</strong> (Instagram API limit)</li>
                        <li>• Aspect ratio: 4:5 (portrait) to 1.91:1 (landscape)</li>
                        <li>• Min width: 320px</li>
                        <li>• Stored securely in your cloud storage</li>
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Optional Image Upload for Other Platforms */}
                {(targetPlatform === 'facebook' || targetPlatform === 'linkedin' || targetPlatform === 'medium') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image (Optional - Enhances Engagement)
                    </label>
                    <ImageUpload
                      onImageUploaded={(url) => setImageUrl(url)}
                      currentImageUrl={imageUrl}
                      maxSizeMB={20}
                      className="w-full"
                    />
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs text-gray-600">
                        💡 <strong>Tip:</strong> Posts with images get 2-3x more engagement on {targetPlatform}!
                      </p>
                    </div>
                  </div>
                )}

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
                      Generate Content
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
                  <div className="flex items-center gap-2">
                    {isDetectingAI && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-xs flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Detecting AI...
                      </span>
                    )}
                    {aiDetectionResults && !isDetectingAI && (
                      <span className={`px-2 py-1 rounded-full font-medium text-xs ${
                        aiDetectionResults.aiPercentage > 50 
                          ? 'bg-red-100 text-red-700'
                          : aiDetectionResults.aiPercentage > 20
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {aiDetectionResults.aiPercentage}% AI Detected
                      </span>
                    )}
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
                    Generating content...
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
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
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
                      {/* Show highlighted HTML if available (same as missed prompts page), otherwise plain text */}
                      {aiDetectionResults?.highlightedHtml ? (
                        <div 
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: aiDetectionResults.highlightedHtml }} 
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {generatedContent}
                        </div>
                      )}
                      {/* CSS for AI detection highlights - always included when AI detection section is visible */}
                      {(isDetectingAI || aiDetectionResults) && (
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
                          <li>• SEO schema is automatically generated in the background (check console/terminal)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* AI Detection Results - Displayed below the content */}
                  {(isDetectingAI || aiDetectionResults) && generatedContent && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {isDetectingAI ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                  Analyzing AI Content...
                                </>
                              ) : aiDetectionResults ? (
                                <>
                                  <MessageSquare className="w-4 h-4 text-blue-600" />
                                  AI Content Analysis
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-4 h-4 text-gray-400" />
                                  AI Detection
                                </>
                              )}
                            </h3>
                            {aiDetectionResults && (
                              <p className="text-xs text-gray-600 mt-0.5">{aiDetectionResults.summary}</p>
                            )}
                          </div>
                          {aiDetectionResults && (
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                aiDetectionResults.aiPercentage >= 70 
                                  ? 'bg-red-100 text-red-700' 
                                  : aiDetectionResults.aiPercentage >= 40
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {aiDetectionResults.aiPercentage}% AI
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {aiDetectionResults && (
                        <div className="p-4 space-y-4">
                          {/* Metrics Summary */}
                          {aiDetectionResults.metrics && (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900">{aiDetectionResults.metrics.burstiness?.toFixed(1) || 'N/A'}</div>
                                <div className="text-xs text-gray-600">Burstiness</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900">{aiDetectionResults.metrics.clichés || 0}</div>
                                <div className="text-xs text-gray-600">Clichés</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900">{aiDetectionResults.metrics.avgSentenceLength || 0}</div>
                                <div className="text-xs text-gray-600">Avg Sentence</div>
                              </div>
                            </div>
                          )}

                          {/* Top Detected Phrases */}
                          {aiDetectionResults.topPhrases && aiDetectionResults.topPhrases.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                Detected AI Phrases ({aiDetectionResults.topPhrases.length})
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {aiDetectionResults.topPhrases.slice(0, 10).map((phrase: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className="p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-gray-700 flex-1">"{phrase.phrase}"</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        phrase.confidence >= 90 
                                          ? 'bg-red-100 text-red-700' 
                                          : phrase.confidence >= 75
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {phrase.confidence}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{phrase.reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Legend for Highlighted Text */}
                          <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 bg-red-200 rounded"></span>
                              <span>High AI (90%+)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 bg-yellow-200 rounded"></span>
                              <span>Medium AI (75-89%)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 bg-green-200 rounded"></span>
                              <span>Low AI (60-74%)</span>
                            </div>
                          </div>

                          {/* Make it Human Button */}
                          <div className="pt-4 border-t border-gray-200 mt-4">
                            <button
                              onClick={handleMakeItHuman}
                              disabled={isHumanizing}
                              className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isHumanizing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Humanizing Content...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  Make it Human
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Arrow to Publication Page */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6"
                  >
                    <button
                      onClick={handleReadyToPublish}
                      disabled={!generatedContent || isCreatingSchema}
                      className="w-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg p-4 border border-primary-300 hover:shadow-lg transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            {isCreatingSchema ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : (
                              <Send className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm mb-0.5">
                              {isCreatingSchema ? "Generating Schema..." : "Ready to Publish?"}
                            </h4>
                            <p className="text-xs text-white/90">
                              {isCreatingSchema 
                                ? "Creating schema for publication..." 
                                : "Go to Publication page to review and publish your content"}
                            </p>
                          </div>
                        </div>
                        {!isCreatingSchema && (
                          <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
                        )}
                      </div>
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </Card>
          </div>
        </div>

      </div>

      {/* Comparison Modal: Original vs Humanized */}
      {showComparisonModal && originalContent && humanizedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Comparison: Original vs Generated
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Review both versions side-by-side and choose which one to use
                </p>
              </div>
              <button
                onClick={() => {
                  setShowComparisonModal(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 gap-0 border-t border-gray-200 flex-1 overflow-hidden">
                {/* Original Version */}
                <div className="border-r border-gray-200 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Original Version</h4>
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-200 rounded">
                        {originalAiPercentage !== null ? originalAiPercentage : (aiDetectionResults?.aiPercentage || 0)}% AI
                      </span>
                    </div>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {originalContent}
                    </div>
                  </div>
                </div>

                {/* Humanized Version */}
                <div className="flex flex-col overflow-hidden">
                  <div className="px-4 py-3 bg-green-50 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        Generated Version
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          New
                        </span>
                      </h4>
                    </div>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {humanizedContent}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={handleRevertToOriginal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Use Original
                </button>
                <button
                  onClick={handleUseHumanized}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Use Humanized
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ContentGeneratorPageInner />
    </Suspense>
  );
}

