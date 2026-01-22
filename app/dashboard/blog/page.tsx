"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useLanguage } from "@/lib/language-context";
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
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface ShopifyBlog {
  id: number;
  title: string;
  handle: string;
}

interface BlogPost {
  id?: string;
  title: string;
  content: string;
  author: string;
  tags: string;
  imageUrl?: string;
  summary?: string;
}

export default function BlogPage() {
  const { isRtl, t } = useLanguage();
  const supabase = createClientComponentClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [blogs, setBlogs] = useState<ShopifyBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

  // Blog post form state
  const [topic, setTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [post, setPost] = useState<BlogPost>({
    title: "",
    content: "",
    author: "",
    tags: "",
    imageUrl: "",
    summary: "",
  });
  
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentGenerated, setContentGenerated] = useState(false);
  const [sendingToPublication, setSendingToPublication] = useState(false);

  // Published posts state
  const [publishedPosts, setPublishedPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Check Shopify connection on mount
  useEffect(() => {
    checkShopifyConnection();
    loadPublishedPosts();
  }, []);

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

  const loadPublishedPosts = async () => {
    setLoadingPosts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get posts published to Shopify
      const { data, error } = await supabase
        .from("published_content")
        .select("*, content_strategy(*)")
        .eq("user_id", user.id)
        .eq("platform", "shopify")
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
      toast.error("Please enter a topic for your blog post");
      return;
    }

    setGeneratingContent(true);
    try {
      // Call the content generation API
      const response = await fetch("/api/geo-core/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          targetPlatform: "shopify",
          targetKeywords: targetKeywords ? targetKeywords.split(",").map(k => k.trim()) : [],
          influenceLevel: "moderate",
          contentType: "blog_article",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      
      if (data.content) {
        // Update the post with generated content
        setPost({
          ...post,
          title: topic.trim(),
          content: data.content,
          tags: targetKeywords || "",
          summary: data.metadata?.summary || "",
        });
        setContentGenerated(true);
        toast.success("Blog content generated! Review and edit as needed.");
      } else {
        throw new Error("No content generated");
      }
    } catch (error: any) {
      console.error("Content generation error:", error);
      toast.error("Failed to generate content: " + (error.message || "Unknown error"));
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleStartOver = () => {
    setTopic("");
    setTargetKeywords("");
    setPost({
      title: "",
      content: "",
      author: "",
      tags: "",
      imageUrl: "",
      summary: "",
    });
    setContentGenerated(false);
  };

  const handleSendToPublication = async () => {
    if (!post.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!post.content.trim()) {
      toast.error("Please enter content");
      return;
    }

    // Prevent double-click
    if (sendingToPublication) {
      return;
    }

    setSendingToPublication(true);
    try {
      // First, save the content to content_strategy table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to continue");
        setSendingToPublication(false);
        return;
      }

      // Check for existing draft with same title - update it instead of creating duplicate
      const { data: existingContent } = await supabase
        .from("content_strategy")
        .select("id")
        .eq("user_id", user.id)
        .eq("topic", post.title)
        .eq("target_platform", "shopify")
        .eq("status", "draft")
        .maybeSingle();

      let contentRecord;
      let insertError;

      // Clean up imageUrl - don't store base64 data URLs (too large)
      const cleanImageUrl = post.imageUrl && !post.imageUrl.startsWith('data:') ? post.imageUrl : "";

      if (existingContent) {
        // Update existing draft
        const { data, error } = await supabase
          .from("content_strategy")
          .update({
            generated_content: post.content,
            target_keywords: post.tags ? post.tags.split(",").map(t => t.trim()) : [],
            metadata: {
              author: post.author || "GeoRepute.ai",
              tags: post.tags,
              imageUrl: cleanImageUrl,
              summary: post.summary,
              shopifyBlogId: selectedBlogId,
              contentType: "blog_article",
            },
          })
          .eq("id", existingContent.id)
          .select()
          .single();
        
        contentRecord = data;
        insertError = error;
        toast.success("Updated existing draft!");
      } else {
        // Create new content record
        const { data, error } = await supabase
          .from("content_strategy")
          .insert({
            user_id: user.id,
            topic: post.title,
            generated_content: post.content,
            target_platform: "shopify",
            status: "draft",
            target_keywords: post.tags ? post.tags.split(",").map(t => t.trim()) : [],
            metadata: {
              author: post.author || "GeoRepute.ai",
              tags: post.tags,
              imageUrl: cleanImageUrl,
              summary: post.summary,
              shopifyBlogId: selectedBlogId,
              contentType: "blog_article",
            },
          })
          .select()
          .single();
        
        contentRecord = data;
        insertError = error;
      }

      if (insertError) {
        console.error("Failed to save content:", insertError);
        throw new Error("Failed to save content");
      }

      // Store content data in sessionStorage for the publication page
      const publishData = {
        contentId: contentRecord.id,
        content: post.content,
        topic: post.title,
        targetPlatform: "shopify",
        targetKeywords: post.tags ? post.tags.split(",").map(t => t.trim()) : [],
        metadata: {
          author: post.author || "GeoRepute.ai",
          tags: post.tags,
          imageUrl: cleanImageUrl,
          summary: post.summary,
          shopifyBlogId: selectedBlogId,
          contentType: "blog_article",
        },
        generatedAt: new Date().toISOString(),
      };

      sessionStorage.setItem('contentToPublish', JSON.stringify(publishData));

      toast.success("Content saved! Redirecting to publication page...");
      
      // Clear form and reset state
      setTopic("");
      setTargetKeywords("");
      setPost({
        title: "",
        content: "",
        author: "",
        tags: "",
        imageUrl: "",
        summary: "",
      });
      setContentGenerated(false);

      // Navigate to publication page
      router.push('/dashboard/content');
    } catch (error: any) {
      console.error("Send to publication error:", error);
      toast.error("Failed to send to publication: " + (error.message || "Unknown error"));
    } finally {
      setSendingToPublication(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-600" />
            Blog Publishing
          </h1>
          <p className="text-gray-600 mt-2">
            Create and publish blog posts to your connected platforms
          </p>
        </div>

        {/* Not Connected State */}
        {!shopifyConnected && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connect Your Blog Platform
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Connect your Shopify store to start publishing blog posts directly from GeoRepute.ai
            </p>
            <Link
              href="/dashboard/settings?tab=integrations"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Settings className="w-5 h-5" />
              Connect Shopify
            </Link>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Coming Soon</p>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-400">
                  <span className="text-lg">📝</span>
                  <span className="text-sm">WordPress</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connected State - Create Blog Post */}
        {shopifyConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Blog Editor */}
            <div className="lg:col-span-2 space-y-6">
              {/* Connection Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Connected to Shopify: {shopName || shopDomain}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings?tab=integrations"
                  className="text-sm text-green-700 hover:text-green-800 font-medium"
                >
                  Manage
                </Link>
              </div>

              {/* Blog Post Form */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {!contentGenerated ? (
                      <>
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Generate Blog Post
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-5 h-5 text-purple-600" />
                        Review & Edit Content
                      </>
                    )}
                  </h2>
                  {contentGenerated && (
                    <button
                      onClick={handleStartOver}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Start Over
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
                          Blog Topic *
                        </label>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g., How to Improve Your SEO Rankings in 2025"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the topic you want to write about
                        </p>
                      </div>

                      {/* Target Keywords */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Keywords <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={targetKeywords}
                          onChange={(e) => setTargetKeywords(e.target.value)}
                          placeholder="seo, rankings, search optimization"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Comma-separated keywords to include in your content
                        </p>
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
                            Generating Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate Blog Content
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
                          Post Title *
                        </label>
                        <input
                          type="text"
                          value={post.title}
                          onChange={(e) => setPost({ ...post, title: e.target.value })}
                          placeholder="Enter your blog post title"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                      </div>

                      {/* Content */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content * <span className="text-gray-400 font-normal">(HTML supported)</span>
                        </label>
                        <textarea
                          value={post.content}
                          onChange={(e) => setPost({ ...post, content: e.target.value })}
                          placeholder="Write your blog post content here... HTML tags are supported."
                          rows={12}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Tip: Use HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;strong&gt; for formatting
                        </p>
                      </div>

                      {/* Author & Tags Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Author
                          </label>
                          <input
                            type="text"
                            value={post.author}
                            onChange={(e) => setPost({ ...post, author: e.target.value })}
                            placeholder="Author name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tags
                          </label>
                          <input
                            type="text"
                            value={post.tags}
                            onChange={(e) => setPost({ ...post, tags: e.target.value })}
                            placeholder="seo, marketing, tips"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                          />
                          <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
                        </div>
                      </div>

                      {/* Featured Image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Featured Image URL
                        </label>
                        <input
                          type="url"
                          value={post.imageUrl}
                          onChange={(e) => setPost({ ...post, imageUrl: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        />
                      </div>

                      {/* Summary/Excerpt */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Summary/Excerpt
                        </label>
                        <textarea
                          value={post.summary}
                          onChange={(e) => setPost({ ...post, summary: e.target.value })}
                          placeholder="Brief summary of the post (appears in blog listings)"
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
                              Sending...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-5 h-5" />
                              Send to Publication
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Review and approve your blog post before publishing
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Published Posts */}
            <div className="space-y-6">
              {/* Select Blog */}
              {blogs.length > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Blog
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

              {/* Recent Published Posts */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Posts</h3>
                </div>
                <div className="p-4">
                  {loadingPosts ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 text-gray-400 animate-spin" />
                      <p className="text-sm text-gray-500">Loading...</p>
                    </div>
                  ) : publishedPosts.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">No posts published yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publishedPosts.slice(0, 5).map((post) => (
                        <div
                          key={post.id}
                          className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {post.content_strategy?.topic || "Untitled"}
                          </p>
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
                  Tips
                </h3>
                <ul className="space-y-2 text-sm text-purple-800">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    Use keywords naturally in your title and content
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    Add a featured image for better engagement
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    Use tags to help categorize your content
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400">•</span>
                    Write a compelling summary for blog listings
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
