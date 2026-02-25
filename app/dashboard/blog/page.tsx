"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useLanguage } from "@/lib/language-context";
import dynamic from "next/dynamic";
import { 
  FileText,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Eye,
  X,
  Image as ImageIcon,
  Sparkles,
  Store,
  ArrowRight,
  Search,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import "react-quill/dist/quill.snow.css";

// Dynamic import for React Quill (client-side only)
const ReactQuill = dynamic(() => import("react-quill"), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
});

interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
}

interface WordPressSite {
  ID: number;
  name: string;
  URL: string;
}

interface BlogPost {
  id?: string;
  title: string;
  content: string;
  author: string;
  tags: string;
  categories?: string; // WordPress-specific: comma-separated categories
  imageUrl?: string;
  summary?: string;
}

type PublishPlatform = "shopify" | "wordpress" | "wordpress_self_hosted";

function BlogPageContent() {
  const { isRtl, t, language } = useLanguage();
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  
  // Platform selection
  const [selectedPlatform, setSelectedPlatform] = useState<PublishPlatform>("shopify");
  
  // Shopify state
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [blogs, setBlogs] = useState<ShopifyBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  
  // WordPress.com state
  const [wordpressConnected, setWordpressConnected] = useState(false);
  const [wordpressUsername, setWordpressUsername] = useState("");
  const [wordpressSiteName, setWordpressSiteName] = useState("");
  const [wordpressSiteUrl, setWordpressSiteUrl] = useState("");
  const [wordpressSites, setWordpressSites] = useState<WordPressSite[]>([]);
  const [selectedWordPressSiteId, setSelectedWordPressSiteId] = useState<number | null>(null);
  const [loadingWordPressSites, setLoadingWordPressSites] = useState(false);

  // Self-hosted WordPress state
  const [wordpressSelfHostedConnected, setWordpressSelfHostedConnected] = useState(false);
  const [wordpressSelfHostedSiteUrl, setWordpressSelfHostedSiteUrl] = useState("");

  // Blog post form state
  const [topic, setTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [contentGenerationLanguage, setContentGenerationLanguage] = useState<"en" | "he">("en");
  const [post, setPost] = useState<BlogPost>({
    title: "",
    content: "",
    author: "",
    tags: "",
    categories: "",
    imageUrl: "",
    summary: "",
  });
  
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentGenerated, setContentGenerated] = useState(false);
  const [sendingToPublication, setSendingToPublication] = useState(false);
  const sendingToPublicationRef = useRef(false);

  // Image selection state (Pixabay + manual upload)
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [fetchingImages, setFetchingImages] = useState(false);
  const [pixabayImages, setPixabayImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingManualImage, setUploadingManualImage] = useState(false);
  const [imageModalView, setImageModalView] = useState<"search" | "upload">("search");
  const blogImageFileInputRef = useRef<HTMLInputElement>(null);


  // Published posts state
  const [publishedPosts, setPublishedPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // React Quill editor configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  // Pre-fill from action plan when redirected from action-plans (e.g. blog step)
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const keywordsParam = searchParams.get("keywords");
    const platformParam = searchParams.get("platform");
    if (topicParam) setTopic(topicParam);
    if (keywordsParam) setTargetKeywords(keywordsParam);
    if (platformParam === "wordpress" || platformParam === "shopify" || platformParam === "wordpress_self_hosted") {
      setSelectedPlatform(platformParam);
    }
  }, [searchParams]);

  // Check platform connections on mount
  useEffect(() => {
    checkConnections();
    loadPublishedPosts();
  }, []);

  const checkConnections = async () => {
    setLoading(true);
    try {
      // Check both platforms in parallel
      const [shopifyRes, wordpressRes, wpSelfHostedRes] = await Promise.all([
        fetch("/api/integrations/shopify"),
        fetch("/api/integrations/wordpress"),
        fetch("/api/integrations/wordpress-self-hosted"),
      ]);

      // Handle Shopify
      if (shopifyRes.ok) {
        const data = await shopifyRes.json();
        if (data.success && data.connected && data.config) {
          setShopifyConnected(true);
          setShopName(data.config.shopName || "");
          setShopDomain(data.config.shopDomain || "");
          setSelectedPlatform("shopify");
          // Load available blogs
          await loadShopifyBlogs(data.config.shopDomain);
        }
      }

      // Handle WordPress.com
      if (wpSelfHostedRes.ok) {
        const data = await wpSelfHostedRes.json();
        if (data.success && data.connected && data.config) {
          setWordpressSelfHostedConnected(true);
          setWordpressSelfHostedSiteUrl(data.config.siteUrl || "");
        }
      }

      if (wordpressRes.ok) {
        const data = await wordpressRes.json();
        if (data.success && data.connected && data.config) {
          setWordpressConnected(true);
          setWordpressUsername(data.config.username || "");
          setWordpressSiteName(data.config.siteName || "");
          setWordpressSiteUrl(data.config.siteUrl || "");
          if (data.config.siteId) {
            setSelectedWordPressSiteId(parseInt(data.config.siteId));
          }
          // If Shopify not connected, default to WordPress
          if (!shopifyConnected) {
            setSelectedPlatform("wordpress");
          }
        }
      }
    } catch (error) {
      console.error("Error checking connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkShopifyConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/integrations/shopify");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.connected && data.config) {
          setShopifyConnected(true);
          setShopName(data.config.shopName || "");
          setShopDomain(data.config.shopDomain || "");
          // Load available blogs
          await loadShopifyBlogs(data.config.shopDomain);
        }
      }
    } catch (error) {
      console.error("Error checking Shopify connection:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadShopifyBlogs = async (domain: string) => {
    if (!domain) return;
    
    setLoadingBlogs(true);
    try {
      const response = await fetch("/api/blog/shopify/blogs");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.blogs) {
          setBlogs(data.blogs);
          // Auto-select first blog if available
          if (data.blogs.length > 0) {
            setSelectedBlogId(data.blogs[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading Shopify blogs:", error);
    } finally {
      setLoadingBlogs(false);
    }
  };

  const loadWordPressSites = async () => {
    setLoadingWordPressSites(true);
    try {
      const response = await fetch("/api/integrations/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-sites" }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sites) {
          setWordpressSites(data.sites);
          // Auto-select first site if available and none selected
          if (data.sites.length > 0 && !selectedWordPressSiteId) {
            setSelectedWordPressSiteId(data.sites[0].ID);
          }
        }
      }
    } catch (error) {
      console.error("Error loading WordPress sites:", error);
    } finally {
      setLoadingWordPressSites(false);
    }
  };

  const loadPublishedPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get posts published to Shopify and WordPress
      const { data, error } = await supabase
        .from("published_content")
        .select("*, content_strategy(*)")
        .eq("user_id", user.id)
        .in("platform", ["shopify", "wordpress", "wordpress_self_hosted"])
        .order("published_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setPublishedPosts(data);
      }
    } catch (error) {
      console.error("Error loading published posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!topic.trim()) {
      toast.error(t.dashboard.blogPage.enterTopic);
      return;
    }

    setGeneratingContent(true);
    try {
      // Call the content generation API (skip schema - will be generated when sending to publication)
      const response = await fetch("/api/geo-core/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          targetPlatform: selectedPlatform,
          targetKeywords: targetKeywords ? targetKeywords.split(",").map(k => k.trim()) : [],
          influenceLevel: "moderate",
          contentType: "blog_article",
          language: contentGenerationLanguage,
          skipSchema: true, // Schema will be generated when clicking "Send to Publication"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      
      if (data.content) {
        // Generate a summary from the content (first 2-3 sentences or 150-200 chars)
        let generatedSummary = data.structuredSEO?.metaDescription || "";
        if (!generatedSummary) {
          // Extract summary from content - get text without HTML tags
          const textContent = data.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          // Get first ~200 characters ending at a word boundary
          if (textContent.length > 200) {
            generatedSummary = textContent.substring(0, 200).replace(/\s+\S*$/, '') + '...';
          } else {
            generatedSummary = textContent;
          }
        }

        // Update the post with generated content and summary
        // NOTE: Schema will be generated separately when clicking "Send to Publication"
        setPost({
          ...post,
          title: topic.trim(),
          content: data.content,
          tags: targetKeywords || "",
          summary: generatedSummary,
        });
        
        setContentGenerated(true);
        
        // Set image search query and show image modal
        setImageSearchQuery(topic.trim());
        setShowImageModal(true);
        
        toast.success(t.dashboard.blogPage.contentGenerated);
      } else {
        throw new Error("No content generated");
      }
    } catch (error: any) {
      console.error("Content generation error:", error);
      toast.error(t.dashboard.blogPage.failedToGenerate + ": " + (error.message || ""));
    } finally {
      setGeneratingContent(false);
    }
  };

  // Fetch images from Pixabay
  const handleFetchImages = async () => {
    if (!imageSearchQuery || imageSearchQuery.trim().length === 0) {
      toast.error(t.dashboard.blogPage.enterSearchQuery);
      return;
    }

    setFetchingImages(true);
    setPixabayImages([]);

    try {
      const response = await fetch("/api/geo-core/pixabay-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imageSearchQuery,
          keywords: targetKeywords ? targetKeywords.split(",").map(k => k.trim()) : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch images");
      }

      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setPixabayImages(data.images);
      } else {
        toast.error(t.dashboard.blogPage.noImagesFound);
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      toast.error(err instanceof Error ? err.message : t.dashboard.blogPage.failedToFetchImages);
    } finally {
      setFetchingImages(false);
    }
  };

  // Upload image to Supabase Storage
  const uploadImageToStorage = async (imageUrl: string, imageId: number): Promise<string | null> => {
    try {
      setUploadingImage(true);

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const timestamp = Date.now();
      const filename = `blog-image-${imageId}-${timestamp}.jpg`;

      const { data, error } = await supabase.storage
        .from("platform-content-images")
        .upload(filename, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Error uploading image:", error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("platform-content-images")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Failed to upload image:", err);
      toast.error(t.dashboard.blogPage.failedToUpload);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image selection
  const handleSelectImage = async (image: any) => {
    setSelectedImage(image);

    // Upload image to Supabase Storage
    toast.loading(t.dashboard.blogPage.uploadingImage, { id: "image-upload" });
    const publicUrl = await uploadImageToStorage(image.largeImageURL, image.id);

    if (publicUrl) {
      setPost({ ...post, imageUrl: publicUrl });
      toast.success(t.dashboard.blogPage.imageUploadedSelected, { id: "image-upload" });
    } else {
      toast.error(t.dashboard.blogPage.failedToUploadImage, { id: "image-upload" });
    }
  };

  // Manual upload from computer (saved to Supabase storage via /api/upload-image)
  const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error(t.dashboard.blogPage.chooseValidImage);
      e.target.value = "";
      return;
    }
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t.dashboard.blogPage.imageTooLarge);
      e.target.value = "";
      return;
    }
    setUploadingManualImage(true);
    toast.loading(t.dashboard.blogPage.uploadingImage, { id: "blog-image-upload" });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      if (data.url) {
        setUploadedImageUrl(data.url);
        setPost({ ...post, imageUrl: data.url });
        setSelectedImage({ id: "manual", tags: t.dashboard.blogPage.uploadFromComputer, user: "You" });
        toast.success(t.dashboard.blogPage.imageUploadedSelected, { id: "blog-image-upload" });
      }
    } catch (err) {
      console.error("Manual image upload:", err);
      toast.error(err instanceof Error ? err.message : t.dashboard.blogPage.failedToUpload, { id: "blog-image-upload" });
    } finally {
      setUploadingManualImage(false);
      e.target.value = "";
    }
  };

  const clearBlogModalImage = () => {
    setUploadedImageUrl(null);
    setSelectedImage(null);
    setPost({ ...post, imageUrl: "" });
    if (blogImageFileInputRef.current) blogImageFileInputRef.current.value = "";
  };

  // Confirm image selection and close modal
  const handleConfirmImage = () => {
    const hasImage = selectedImage || uploadedImageUrl || post.imageUrl;
    if (!hasImage) {
      toast.error(t.dashboard.blogPage.chooseImageForPost);
      return;
    }
    if (uploadedImageUrl && !post.imageUrl) setPost({ ...post, imageUrl: uploadedImageUrl });
    setShowImageModal(false);
    setImageModalView("search");
    toast.success(t.dashboard.blogPage.imageSet);
  };

  // Skip image selection
  const handleSkipImage = () => {
    setUploadedImageUrl(null);
    setSelectedImage(null);
    setShowImageModal(false);
    setImageModalView("search");
    toast.success(t.dashboard.blogPage.imageSkipped);
  };

  const handleStartOver = () => {
    setTopic("");
    setTargetKeywords("");
    setPost({
      title: "",
      content: "",
      author: "",
      tags: "",
      categories: "",
      imageUrl: "",
      summary: "",
    });
    // Reset image selection state
    setSelectedImage(null);
    setUploadedImageUrl(null);
    setPixabayImages([]);
    setImageSearchQuery("");
    setImageModalView("search");
    setContentGenerated(false);
  };

  const handleSendToPublication = async () => {
    if (!post.title.trim()) {
      toast.error(t.dashboard.blogPage.enterTitle);
      return;
    }
    if (!post.content.trim()) {
      toast.error(t.dashboard.blogPage.enterContent);
      return;
    }

    // Prevent double-click (ref is synchronous; state update may lag)
    if (sendingToPublicationRef.current || sendingToPublication) {
      return;
    }
    sendingToPublicationRef.current = true;
    setSendingToPublication(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.dashboard.blogPage.pleaseLogin);
        sendingToPublicationRef.current = false;
        setSendingToPublication(false);
        return;
      }

      // Clean up imageUrl - don't store base64 data URLs (too large)
      const cleanImageUrl = post.imageUrl && !post.imageUrl.startsWith('data:') ? post.imageUrl : "";
      const keywordsArray = post.tags ? post.tags.split(",").map(t => t.trim()) : [];

      let schemaData = null;
      let structuredSEO = null;

      // Generate schema for the content
      toast.loading(t.dashboard.blogPage.generatingSchema, { id: "schema-generation" });
      console.log("🔄 Generating schema for blog content...");
      
      const schemaResponse = await fetch("/api/geo-core/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: post.title,
          targetPlatform: selectedPlatform,
          targetKeywords: keywordsArray,
          influenceLevel: "moderate",
          contentType: "blog_article",
          skipGeneration: true, // Use existing content, just generate schema
          schemaOnly: true, // Do not insert; blog will insert/update one row
          generatedContent: post.content,
          imageUrl: cleanImageUrl || undefined,
        }),
      });

      if (schemaResponse.ok) {
        const schemaResult = await schemaResponse.json();
        schemaData = schemaResult.schema || null;
        structuredSEO = schemaResult.structuredSEO || null;
        console.log("✅ Schema generated:", JSON.stringify(schemaData, null, 2));
        console.log("✅ Structured SEO:", JSON.stringify(structuredSEO, null, 2));
        toast.success(t.dashboard.blogPage.schemaGenerated, { id: "schema-generation" });
      } else {
        const errorData = await schemaResponse.json().catch(() => ({}));
        console.error("❌ Schema generation failed:", errorData);
        toast.error(t.dashboard.blogPage.failedToGenerate + ": " + (errorData.error || ""), { id: "schema-generation" });
      }

      // Debug: Log what we're about to save
      console.log("📋 Schema data to save:", schemaData ? "Present" : "Missing");
      console.log("📋 StructuredSEO to save:", structuredSEO ? "Present" : "Missing");

      // Step 2: Check for existing draft with same title
      // Normalize topic for reliable matching (Hebrew/Unicode: trim + NFC)
      const normalizedTitle = (post.title || "").trim().normalize("NFC");
      const { data: existingContent } = await supabase
        .from("content_strategy")
        .select("id")
        .eq("user_id", user.id)
        .eq("topic", normalizedTitle)
        .eq("target_platform", selectedPlatform)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let contentRecord;
      let insertError;

      // Build metadata with schema (platform-specific)
      const contentMetadata: Record<string, any> = {
        author: post.author || "GeoRepute.ai",
        tags: post.tags,
        imageUrl: cleanImageUrl,
        summary: post.summary,
        contentType: "blog_article",
        schema: schemaData,
        structuredSEO: structuredSEO,
      };
      
      // Add platform-specific fields
      if (selectedPlatform === "shopify") {
        contentMetadata.shopifyBlogId = selectedBlogId;
      } else if (selectedPlatform === "wordpress") {
        contentMetadata.wordpressSiteId = selectedWordPressSiteId;
        // Add WordPress-specific categories
        if (post.categories) {
          contentMetadata.categories = post.categories;
        }
      } else if (selectedPlatform === "wordpress_self_hosted") {
        // Self-hosted uses single site from integration; no site ID needed
        if (post.categories) {
          contentMetadata.categories = post.categories;
        }
      }

      if (existingContent) {
        // Update existing draft
        const { data, error } = await supabase
          .from("content_strategy")
          .update({
            generated_content: post.content,
            target_keywords: keywordsArray,
            metadata: contentMetadata,
          })
          .eq("id", existingContent.id)
          .select()
          .single();
        
        contentRecord = data;
        insertError = error;
      } else {
        // Create new content record (use normalized title for consistency)
        const { data, error } = await supabase
          .from("content_strategy")
          .insert({
            user_id: user.id,
            topic: normalizedTitle || post.title,
            generated_content: post.content,
            target_platform: selectedPlatform,
            status: "draft",
            target_keywords: keywordsArray,
            metadata: contentMetadata,
          })
          .select()
          .single();
        
        contentRecord = data;
        insertError = error;
      }

      if (insertError) {
        console.error("Failed to save content:", insertError);
        throw new Error(t.dashboard.blogPage.failedToSave);
      }

      // Store content data in sessionStorage for the publication page
      const publishData = {
        contentId: contentRecord.id,
        content: post.content,
        topic: post.title,
        targetPlatform: selectedPlatform,
        targetKeywords: keywordsArray,
        metadata: contentMetadata,
        schema: schemaData,
        structuredSEO: structuredSEO,
        generatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem('contentToPublish', JSON.stringify(publishData));

      toast.success(t.dashboard.blogPage.contentSaved);
      
      // Clear form and reset state
      setTopic("");
      setTargetKeywords("");
      setPost({
        title: "",
        content: "",
        author: "",
        tags: "",
        categories: "",
        imageUrl: "",
        summary: "",
      });
      setContentGenerated(false);

      // Navigate to publication page
      router.push('/dashboard/content');
    } catch (error: any) {
      console.error("Send to publication error:", error);
      toast.error(t.dashboard.blogPage.failedToSend + ": " + (error.message || ""));
    } finally {
      sendingToPublicationRef.current = false;
      setSendingToPublication(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">{t.dashboard.blogPage.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            {t.dashboard.blogPage.title}
          </h1>
          <p className="text-gray-600 mt-2">
            {t.dashboard.blogPage.subtitle}
          </p>
        </div>

        {/* Not Connected State */}
        {!shopifyConnected && !wordpressConnected && !wordpressSelfHostedConnected && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t.dashboard.blogPage.connectTitle}
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {t.dashboard.blogPage.connectDesc}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard/settings?tab=integrations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Image src="/shopify.svg" alt="Shopify" width={20} height={20} />
                {t.dashboard.blogPage.connectShopify}
              </Link>
              <Link
                href="/dashboard/settings?tab=integrations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Image src="/wordpress.svg" alt="WordPress" width={20} height={20} />
                {t.dashboard.blogPage.connectWordpress}
              </Link>
              <Link
                href="/dashboard/settings?tab=integrations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <Image src="/wordpress.svg" alt="WordPress" width={20} height={20} />
                {t.dashboard.blogPage.connectSelfHosted}
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {t.dashboard.blogPage.goToSettings}
              </p>
            </div>
          </div>
        )}

        {/* Connected State - Create Blog Post */}
        {(shopifyConnected || wordpressConnected || wordpressSelfHostedConnected) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Blog Editor */}
            <div className="lg:col-span-2 space-y-6">
              {/* Platform Selector - Always show both platforms */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">{t.dashboard.blogPage.publishTo}</p>
                <div className="flex flex-wrap gap-3">
                  {/* Shopify */}
                  {shopifyConnected ? (
                    <button
                      onClick={() => setSelectedPlatform("shopify")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        selectedPlatform === "shopify"
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Image src="/shopify.svg" alt="Shopify" width={20} height={20} />
                      <span className="font-medium">Shopify</span>
                      {selectedPlatform === "shopify" && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/settings?tab=integrations"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600 transition-colors"
                    >
                      <Image src="/shopify.svg" alt="Shopify" width={20} height={20} className="opacity-50" />
                      <span className="font-medium">{t.dashboard.blogPage.connectShopify}</span>
                    </Link>
                  )}

                  {/* WordPress.com */}
                  {wordpressConnected ? (
                    <button
                      onClick={() => setSelectedPlatform("wordpress")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        selectedPlatform === "wordpress"
                          ? "bg-blue-50 border-blue-500 text-blue-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Image src="/wordpress.svg" alt="WordPress" width={20} height={20} />
                      <span className="font-medium">WordPress.com</span>
                      {selectedPlatform === "wordpress" && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/settings?tab=integrations"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <Image src="/wordpress.svg" alt="WordPress" width={20} height={20} className="opacity-50" />
                      <span className="font-medium">{t.dashboard.blogPage.connectWordpress}</span>
                    </Link>
                  )}

                  {/* Self-Hosted WordPress */}
                  {wordpressSelfHostedConnected ? (
                    <button
                      onClick={() => setSelectedPlatform("wordpress_self_hosted")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        selectedPlatform === "wordpress_self_hosted"
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <Image src="/wordpress.svg" alt="WordPress" width={20} height={20} />
                      <span className="font-medium">WordPress (Self-Hosted)</span>
                      {selectedPlatform === "wordpress_self_hosted" && (
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/settings?tab=integrations"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <Image src="/wordpress.svg" alt="WordPress" width={20} height={20} className="opacity-50" />
                      <span className="font-medium">{t.dashboard.blogPage.connectSelfHosted}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Connection Status - Only show for the currently selected connected platform */}
              {((selectedPlatform === "shopify" && shopifyConnected) || 
                (selectedPlatform === "wordpress" && wordpressConnected) ||
                (selectedPlatform === "wordpress_self_hosted" && wordpressSelfHostedConnected)) && (
                <div className={`${
                  selectedPlatform === "shopify" 
                    ? "bg-green-50 border-green-200" 
                    : selectedPlatform === "wordpress_self_hosted"
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-blue-50 border-blue-200"
                } border rounded-lg p-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`w-5 h-5 ${
                      selectedPlatform === "shopify" ? "text-green-600" : selectedPlatform === "wordpress_self_hosted" ? "text-indigo-600" : "text-blue-600"
                    }`} />
                    <div>
                      {selectedPlatform === "shopify" && shopifyConnected ? (
                        <p className="text-sm font-medium text-green-900">
                          {t.dashboard.blogPage.connectedTo} Shopify: {shopName || shopDomain}
                        </p>
                      ) : selectedPlatform === "wordpress" && wordpressConnected ? (
                        <p className="text-sm font-medium text-blue-900">
                          {t.dashboard.blogPage.connectedTo} WordPress.com: {wordpressSiteName || wordpressUsername}
                          {wordpressSiteUrl && (
                            <a 
                              href={wordpressSiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:underline text-xs"
                            >
                              ({wordpressSiteUrl})
                            </a>
                          )}
                        </p>
                      ) : selectedPlatform === "wordpress_self_hosted" && wordpressSelfHostedConnected ? (
                        <p className="text-sm font-medium text-indigo-900">
                          {t.dashboard.blogPage.connectedTo} WordPress: {wordpressSelfHostedSiteUrl}
                          {wordpressSelfHostedSiteUrl && (
                            <a 
                              href={wordpressSelfHostedSiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-indigo-600 hover:underline text-xs"
                            >
                              ({t.dashboard.blogPage.viewSite})
                            </a>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href="/dashboard/settings?tab=integrations"
                    className={`text-sm font-medium ${
                      selectedPlatform === "shopify" 
                        ? "text-green-700 hover:text-green-800" 
                        : selectedPlatform === "wordpress_self_hosted"
                        ? "text-indigo-700 hover:text-indigo-800"
                        : "text-blue-700 hover:text-blue-800"
                    }`}
                  >
                    {t.dashboard.blogPage.manage}
                  </Link>
                </div>
              )}

              {/* Blog Post Form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {!contentGenerated ? (
                      <>
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        {t.dashboard.blogPage.generateBlogPost}
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-5 h-5 text-purple-600" />
                        {t.dashboard.blogPage.reviewEditContent}
                      </>
                    )}
                  </h2>
                  {contentGenerated && (
                    <button
                      onClick={handleStartOver}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t.dashboard.blogPage.startOver}
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-6">
                  {/* Step 1: Topic Input (when content not generated) */}
                  {!contentGenerated && (
                    <>
                      {/* Topic */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.blogTopic}
                        </label>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder={t.dashboard.blogPage.topicPlaceholder}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t.dashboard.blogPage.topicHint}
                        </p>
                      </div>

                      {/* Target Keywords */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.targetKeywords}
                        </label>
                        <input
                          type="text"
                          value={targetKeywords}
                          onChange={(e) => setTargetKeywords(e.target.value)}
                          placeholder={t.dashboard.blogPage.keywordsPlaceholder}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t.dashboard.blogPage.keywordsHint}
                        </p>
                      </div>

                      {/* Content language */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.generateContentIn}
                        </label>
                        <select
                          value={contentGenerationLanguage}
                          onChange={(e) => setContentGenerationLanguage(e.target.value as "en" | "he")}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                        >
                          <option value="en">{t.dashboard.blogPage.english}</option>
                          <option value="he">{t.dashboard.blogPage.hebrew}</option>
                        </select>
                      </div>

                      {/* Generate Button */}
                      <button
                        onClick={handleGenerateContent}
                        disabled={generatingContent || !topic.trim()}
                        className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {generatingContent ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {t.dashboard.blogPage.generatingContent}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            {t.dashboard.blogPage.generateBlogContent}
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {/* Step 2: Review & Edit (when content is generated) */}
                  {contentGenerated && (
                    <>
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.postTitle}
                        </label>
                        <input
                          type="text"
                          value={post.title}
                          onChange={(e) => setPost({ ...post, title: e.target.value })}
                          placeholder={t.dashboard.blogPage.postTitlePlaceholder}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                      </div>

                      {/* Content - Rich Text Editor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.contentLabel}
                        </label>
                        <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                          <ReactQuill
                            theme="snow"
                            value={post.content}
                            onChange={(content) => setPost({ ...post, content })}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder={t.dashboard.blogPage.contentPlaceholder}
                            className="bg-white"
                            style={{ minHeight: '350px' }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t.dashboard.blogPage.toolbarHint}
                        </p>
                      </div>

                      {/* Author & Tags Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t.dashboard.blogPage.author}
                          </label>
                          <input
                            type="text"
                            value={post.author}
                            onChange={(e) => setPost({ ...post, author: e.target.value })}
                            placeholder={t.dashboard.blogPage.authorPlaceholder}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t.dashboard.blogPage.tags}
                          </label>
                          <input
                            type="text"
                            value={post.tags}
                            onChange={(e) => setPost({ ...post, tags: e.target.value })}
                            placeholder={t.dashboard.blogPage.tagsPlaceholder}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                          />
                          <p className="text-xs text-gray-500 mt-1">{t.dashboard.blogPage.commaSeparated}</p>
                        </div>

                        {/* Categories - WordPress only */}
                        {(selectedPlatform === "wordpress" || selectedPlatform === "wordpress_self_hosted") && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t.dashboard.blogPage.categories}
                              <span className="ml-2 text-xs font-normal text-blue-600">({t.dashboard.blogPage.wordpress})</span>
                            </label>
                            <input
                              type="text"
                              value={post.categories || ""}
                              onChange={(e) => setPost({ ...post, categories: e.target.value })}
                              placeholder={t.dashboard.blogPage.categoriesPlaceholder}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                            <p className="text-xs text-gray-500 mt-1">{t.dashboard.blogPage.categoriesHint}</p>
                          </div>
                        )}
                      </div>

                      {/* Featured Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.featuredImageUrl}
                        </label>
                        <input
                          type="url"
                          value={post.imageUrl}
                          onChange={(e) => setPost({ ...post, imageUrl: e.target.value })}
                          placeholder={t.dashboard.blogPage.featuredImagePlaceholder}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                      </div>

                      {/* Summary/Excerpt */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.dashboard.blogPage.summaryExcerpt}
                        </label>
                        <textarea
                          value={post.summary}
                          onChange={(e) => setPost({ ...post, summary: e.target.value })}
                          placeholder={t.dashboard.blogPage.summaryPlaceholder}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
                        />
                      </div>

                      {/* Send to Publication Button */}
                      <div className="pt-4 border-t border-gray-200">
                        <button
                          onClick={handleSendToPublication}
                          disabled={sendingToPublication || !post.title.trim() || !post.content.trim()}
                          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {sendingToPublication ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              {t.dashboard.blogPage.sending}
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-5 h-5" />
                              {t.dashboard.blogPage.sendToPublication}
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          {t.dashboard.blogPage.reviewBeforePublishing}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Published Posts */}
            <div className="space-y-6">
              {/* Shopify Blog Selector */}
              {selectedPlatform === "shopify" && blogs.length > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.dashboard.blogPage.selectShopifyBlog}
                  </label>
                  <select
                    value={selectedBlogId || ""}
                    onChange={(e) => setSelectedBlogId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                  >
                    {blogs.map((blog) => (
                      <option key={blog.id} value={blog.id}>
                        {blog.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* WordPress Site Selector */}
              {selectedPlatform === "wordpress" && wordpressConnected && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t.dashboard.blogPage.wordpressSite}
                    </label>
                    <button
                      onClick={loadWordPressSites}
                      disabled={loadingWordPressSites}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      {loadingWordPressSites ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      {t.dashboard.blogPage.refresh}
                    </button>
                  </div>
                  
                  {wordpressSites.length > 0 ? (
                    <select
                      value={selectedWordPressSiteId || ""}
                      onChange={(e) => setSelectedWordPressSiteId(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    >
                      {wordpressSites.map((site) => (
                        <option key={site.ID} value={site.ID}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-gray-500 py-2">
                      {wordpressSiteName ? (
                        <span className="text-gray-700 font-medium">{wordpressSiteName}</span>
                      ) : (
                        <button
                          onClick={loadWordPressSites}
                          className="text-blue-600 hover:underline"
                        >
                          {t.dashboard.blogPage.loadSites}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Published Posts */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">{t.dashboard.blogPage.recentPosts}</h3>
                </div>
                <div className="p-4">
                  {loadingPosts ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500">{t.dashboard.blogPage.loading}</p>
                    </div>
                  ) : publishedPosts.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">{t.dashboard.blogPage.noPostsYet}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publishedPosts.slice(0, 5).map((post) => (
                        <div
                          key={post.id}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900 text-sm truncate flex-1">
                              {post.content_strategy?.topic || "Untitled"}
                            </p>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              post.platform === "wordpress" 
                                ? "bg-blue-100 text-blue-700" 
                                : post.platform === "wordpress_self_hosted"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {post.platform === "wordpress" ? "WP.com" : post.platform === "wordpress_self_hosted" ? "WP Self" : "Shopify"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {new Date(post.published_at).toLocaleDateString()}
                            </span>
                            {post.published_url && (
                              <a
                                href={post.published_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t.dashboard.blogPage.tips}
                </h3>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    {t.dashboard.blogPage.tipKeywords}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    {t.dashboard.blogPage.tipImage}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    {t.dashboard.blogPage.tipTags}
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    {t.dashboard.blogPage.tipSummary}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Selection Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                  <Camera className="w-5 h-5 text-purple-600" />
                  {t.dashboard.blogPage.selectFeaturedImage}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t.dashboard.blogPage.chooseImageForPost}
                </p>
              </div>
              <button
                onClick={handleSkipImage}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {imageModalView === "upload" ? (
                /* Manual upload from computer (saved to Supabase storage) */
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setImageModalView("search")}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                  >
                    ← {t.dashboard.blogPage.backToSearch}
                  </button>
                  <h4 className="text-base font-semibold text-gray-900">{t.dashboard.blogPage.uploadFromComputer}</h4>
                  <p className="text-sm text-gray-500">{t.dashboard.blogPage.uploadHint}</p>
                  <input
                    ref={blogImageFileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleManualImageUpload}
                    disabled={uploadingManualImage}
                    className="hidden"
                  />
                  {!uploadedImageUrl ? (
                    <button
                      type="button"
                      onClick={() => blogImageFileInputRef.current?.click()}
                      disabled={uploadingManualImage}
                      className="flex items-center justify-center gap-2 w-full py-10 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50/50 text-gray-600 hover:text-purple-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      {uploadingManualImage ? (
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                      ) : (
                        <ImageIcon className="w-8 h-8" />
                      )}
                      {uploadingManualImage ? t.dashboard.blogPage.uploading : t.dashboard.blogPage.uploadHint}
                    </button>
                  ) : (
                    <div className="flex items-center gap-4 p-4 rounded-lg border-2 border-green-200 bg-green-50">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-green-300">
                        <Image src={uploadedImageUrl} alt="Uploaded" fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900">{t.dashboard.blogPage.imageUploaded}</p>
                        <p className="text-xs text-green-700">{t.dashboard.blogPage.savedToStorage}</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearBlogModalImage}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t.dashboard.blogPage.removeImage}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.dashboard.blogPage.searchForImages}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetchImages()}
                    placeholder={t.dashboard.blogPage.searchPlaceholder}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm text-gray-800"
                  />
                  <button
                    onClick={handleFetchImages}
                    disabled={fetchingImages || !imageSearchQuery.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {fetchingImages ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.dashboard.blogPage.searching}
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        {t.dashboard.blogPage.search}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload option — switch to manual upload */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setImageModalView("upload")}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50/50 text-gray-600 hover:text-purple-700 transition-colors font-medium text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  {t.dashboard.blogPage.uploadFromComputerBtn}
                </button>
              </div>

              {/* Image Grid */}
              {fetchingImages ? (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
                  <p className="text-gray-600">{t.dashboard.blogPage.searchingForImages}</p>
                </div>
              ) : pixabayImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {pixabayImages.slice(0, 9).map((image) => (
                      <button
                        key={image.id}
                        onClick={() => handleSelectImage(image)}
                        disabled={uploadingImage || uploadingManualImage}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage?.id === image.id
                            ? "border-purple-500 ring-2 ring-purple-500/30"
                            : "border-gray-200 hover:border-purple-300"
                        } ${(uploadingImage || uploadingManualImage) ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Image
                          src={image.webformatURL}
                          alt={image.tags || "Image"}
                          fill
                          className="object-cover"
                        />
                        {selectedImage?.id === image.id && (
                          <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        )}
                        {(uploadingImage || uploadingManualImage) && selectedImage?.id === image.id && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    {t.dashboard.blogPage.imagesPoweredBy}{" "}
                    <a
                      href="https://pixabay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      {t.dashboard.blogPage.pixabay}
                    </a>
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>{t.dashboard.blogPage.searchToSeeResults}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {t.dashboard.blogPage.tryKeywords} &quot;{topic || "..."}&quot;
                  </p>
                </div>
              )}

              {/* Selected Image Preview (Pixabay or uploaded) */}
              {(selectedImage || uploadedImageUrl) && (post.imageUrl || uploadedImageUrl) && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-14 rounded-lg overflow-hidden border-2 border-green-300">
                      <Image
                        src={post.imageUrl || uploadedImageUrl || ""}
                        alt="Selected image"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900">{t.dashboard.blogPage.imageSelected}</p>
                      <p className="text-xs text-green-700">
                        {selectedImage?.tags || t.dashboard.blogPage.featuredImage}
                      </p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
              <button
                onClick={handleSkipImage}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
              >
                {t.dashboard.blogPage.skipForNow}
              </button>
              <button
                onClick={handleConfirmImage}
                disabled={(!selectedImage && !uploadedImageUrl) || uploadingImage || uploadingManualImage}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploadingImage || uploadingManualImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.dashboard.blogPage.uploading}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {t.dashboard.blogPage.useSelectedImage}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}>
      <BlogPageContent />
    </Suspense>
  );
}
