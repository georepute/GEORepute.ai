"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Edit3,
  RefreshCw,
  Clock,
  Send,
  Loader2,
  LayoutList,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
});

const PUBLISHING_PLATFORMS = [
  { id: "blog", name: "Blog", icon: "/wordpress.svg" },
  { id: "linkedin", name: "LinkedIn", icon: "/linkedin.svg" },
  { id: "facebook", name: "Facebook", icon: "/facebook-color.svg" },
  { id: "reddit", name: "Reddit", icon: "/reddit-icon.svg" },
  { id: "x", name: "X", icon: "/x-icon.svg" },
  { id: "medium", name: "Medium", icon: "/medium-square.svg" },
  { id: "youtube", name: "YouTube", icon: "/youtube.svg" },
  { id: "instagram", name: "Instagram", icon: "/instagram-1-svgrepo-com.svg" },
  { id: "github", name: "GitHub", icon: "/github-142.svg" },
  { id: "shopify", name: "Shopify", icon: "/shopify.svg" },
  { id: "wordpress", name: "WordPress", icon: "/wordpress.svg" },
];

export default function PublicationPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [contentItem, setContentItem] = useState<any>(null);

  // Staging state (current editable content)
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [contentChanged, setContentChanged] = useState(false);

  // UI state
  const [expandedStaging, setExpandedStaging] = useState<Record<string, boolean>>({
    metaTitle: false,
    cta: false,
    image: false,
  });
  const [selectedPlatform, setSelectedPlatform] = useState("blog");
  const [editTextModal, setEditTextModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [committing, setCommitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [platformUsernames, setPlatformUsernames] = useState<Record<string, string>>({});

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ align: [] }],
        ["blockquote", "code-block"],
        ["link", "image"],
        [{ table: [] }],
        ["clean"],
      ],
      table: true,
    }),
    []
  );
  const quillFormats = [
    "header",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "list", "bullet", "indent",
    "align",
    "blockquote", "code-block",
    "link", "image",
    "table",
  ];

  const fetchContent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/geo-core/orchestrator?contentId=${id}`);
      if (!res.ok) throw new Error("Failed to load content");
      const data = await res.json();
      const list = data?.content || [];
      const item = list[0];
      if (!item || !["draft", "review"].includes(item.status)) {
        toast.error("Content not found or not available for preview");
        router.replace("/dashboard/content");
        return;
      }
      setContentItem(item);
      const raw = item.raw || {};
      setTitle(item.title || raw.topic || "");
      setBody(raw.generated_content || "");
      setImageUrl(
        raw.metadata?.imageUrl ||
          raw.metadata?.imageData?.url ||
          raw.metadata?.structuredSEO?.ogTags?.image ||
          ""
      );
      setCtaText(raw.metadata?.ctaText || "");
      setCtaUrl(raw.metadata?.ctaUrl || "");
      setMetaTitle(
        raw.metadata?.metaTitle ||
          getFirstFullLine(raw.generated_content || "") ||
          getFirstFullLine(raw.metadata?.structuredSEO?.metaDescription || "") ||
          ""
      );
      setLinks(Array.isArray(raw.metadata?.links) ? raw.metadata.links : []);
    } catch (e) {
      toast.error("Failed to load content");
      router.replace("/dashboard/content");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    const loadPlatformUsernames = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data: rows } = await supabase
        .from("platform_integrations")
        .select("platform, platform_username, metadata")
        .eq("user_id", session.user.id)
        .eq("status", "connected");
      if (!rows?.length) return;
      const map: Record<string, string> = {};
      for (const row of rows) {
        const platform = (row.platform as string)?.toLowerCase?.() || "";
        const meta = (row.metadata as Record<string, unknown>) || {};
        const username = row.platform_username?.trim() || "";
        const display =
          platform === "linkedin"
            ? (meta.fullName as string) || username
            : platform === "x"
              ? username ? (username.startsWith("@") ? username : `@${username}`) : ""
              : username;
        if (display) map[platform] = display;
      }
      setPlatformUsernames((prev) => ({ ...prev, ...map }));
    };
    loadPlatformUsernames();
  }, []);

  const toggleStaging = (key: string) => {
    setExpandedStaging((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveEditText = () => {
    setContentChanged(true);
    setEditTextModal(false);
  };

  const handleImageUploaded = (url: string) => {
    setImageUrl(url);
    setContentChanged(true);
  };

  const handleRegenerate = async () => {
    if (!id || !contentItem) return;
    const raw = contentItem.raw || {};
    const topic = title || raw.topic || "";
    const keywords = Array.isArray(raw.target_keywords)
      ? raw.target_keywords
      : typeof raw.target_keywords === "string"
        ? raw.target_keywords.split(",").map((k: string) => k.trim()).filter(Boolean)
        : [];
    const targetPlatform = raw.target_platform || contentItem.platforms?.[0] || "blog";
    if (!topic.trim()) {
      toast.error("Topic is required to regenerate");
      return;
    }
    if (keywords.length === 0) {
      toast.error("Keywords are required to regenerate");
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch("/api/geo-core/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          targetKeywords: keywords,
          targetPlatform,
          brandMention: raw.brand_mention || "",
          influenceLevel: raw.influence_level || "subtle",
          userContext: "Content must be humanized and professional, suitable for publication. Write like a real expert; avoid AI-sounding language.",
          imageUrl: imageUrl || undefined,
          language: "en",
          skipSchema: true,
          regenerateForContentId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to regenerate content");
      }
      const newContent = data.content ?? data.generated_content;
      if (!newContent) {
        throw new Error("No content returned");
      }
      setBody(newContent);
      setContentChanged(true);
      const newMeta = data.structuredSEO?.metaDescription;
      if (newMeta && typeof newMeta === "string") {
        setMetaTitle(newMeta.slice(0, 60));
      }
      const newMetadata = { ...(raw.metadata || {}) };
      newMetadata.imageUrl = imageUrl || newMetadata.imageUrl;
      if (data.schema?.jsonLd || data.schema?.scriptTags) {
        newMetadata.schema = {
          jsonLd: data.schema?.jsonLd,
          scriptTags: data.schema?.scriptTags,
          generatedAt: new Date().toISOString(),
        };
      }
      if (data.structuredSEO) {
        newMetadata.structuredSEO = {
          ...(raw.metadata?.structuredSEO || {}),
          ...data.structuredSEO,
          generatedAt: new Date().toISOString(),
        };
      }
      setContentItem((prev: any) =>
        prev
          ? {
              ...prev,
              raw: {
                ...prev.raw,
                topic: topic.trim(),
                generated_content: newContent,
                metadata: newMetadata,
              },
            }
            : prev
      );
      toast.success("Content regenerated and page updated.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to regenerate content");
    } finally {
      setRegenerating(false);
    }
  };

  const handlePublishNow = async () => {
    if (!id || !contentItem) return;
    setCommitting(true);
    try {
      const primaryPlatform = contentItem.raw?.target_platform || contentItem.platforms?.[0] || "blog";
      const keywords = contentItem.raw?.target_keywords || [];
      const schemaRes = await fetch("/api/geo-core/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaOnly: true,
          skipGeneration: true,
          topic: title,
          generatedContent: body,
          imageUrl: imageUrl || undefined,
          targetKeywords: keywords,
          targetPlatform: primaryPlatform,
        }),
      });
      let newMetadata = { ...(contentItem.raw?.metadata || {}) };
      newMetadata.imageUrl = imageUrl || newMetadata.imageUrl;
      newMetadata.ctaText = ctaText;
      newMetadata.ctaUrl = ctaUrl;
      newMetadata.metaTitle = metaTitle;
      newMetadata.links = links;
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (schemaData.schema) {
          newMetadata.schema = {
            jsonLd: schemaData.schema?.jsonLd,
            scriptTags: schemaData.schema?.scriptTags,
            generatedAt: new Date().toISOString(),
          };
        }
        if (schemaData.structuredSEO) {
          newMetadata.structuredSEO = schemaData.structuredSEO;
        }
      }

      const { error: updateError } = await supabase
        .from("content_strategy")
        .update({
          topic: title,
          generated_content: body,
          metadata: newMetadata,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      const orchRes = await fetch("/api/geo-core/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", contentId: id, autoPublish: true }),
      });
      if (!orchRes.ok) {
        const err = await orchRes.json();
        throw new Error(err.error || "Publish failed");
      }
      toast.success("Content published");
      router.replace("/dashboard/content");
    } catch (e: any) {
      toast.error(e.message || "Failed to publish");
    } finally {
      setCommitting(false);
    }
  };

  const handleSchedule = async () => {
    if (!id || !contentItem || !scheduleDate) {
      toast.error("Please select a date and time");
      return;
    }
    setCommitting(true);
    try {
      const primaryPlatform = contentItem.raw?.target_platform || contentItem.platforms?.[0] || "blog";
      const keywords = contentItem.raw?.target_keywords || [];
      const schemaRes = await fetch("/api/geo-core/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaOnly: true,
          skipGeneration: true,
          topic: title,
          generatedContent: body,
          imageUrl: imageUrl || undefined,
          targetKeywords: keywords,
          targetPlatform: primaryPlatform,
        }),
      });
      let newMetadata = { ...(contentItem.raw?.metadata || {}) };
      newMetadata.imageUrl = imageUrl || newMetadata.imageUrl;
      newMetadata.ctaText = ctaText;
      newMetadata.ctaUrl = ctaUrl;
      newMetadata.metaTitle = metaTitle;
      newMetadata.links = links;
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (schemaData.schema) {
          newMetadata.schema = {
            jsonLd: schemaData.schema?.jsonLd,
            scriptTags: schemaData.schema?.scriptTags,
            generatedAt: new Date().toISOString(),
          };
        }
        if (schemaData.structuredSEO) {
          newMetadata.structuredSEO = schemaData.structuredSEO;
        }
      }

      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const { error: updateError } = await supabase
        .from("content_strategy")
        .update({
          topic: title,
          generated_content: body,
          metadata: newMetadata,
          scheduled_at: scheduledAt,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      const orchRes = await fetch("/api/geo-core/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", contentId: id, scheduledAt }),
      });
      if (!orchRes.ok) {
        const err = await orchRes.json();
        throw new Error(err.error || "Schedule failed");
      }
      toast.success("Content scheduled");
      router.replace("/dashboard/content");
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule");
    } finally {
      setCommitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!contentItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/content"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Content
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Publication Preview</h1>
        </div>

        {contentChanged && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">
            Content or image changed – schema will be updated when you publish.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staging Area */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Staging Area
            </h2>
            <p className="text-xs text-gray-400 mb-4">Generated Content</p>
            <div className="space-y-3">
              <div className="font-semibold text-gray-900 text-lg border-b border-gray-100 pb-2">
                {title || "Untitled"}
              </div>
              <div>
                <button
                  onClick={() => toggleStaging("metaTitle")}
                  className="flex items-center gap-2 text-sm text-gray-600 w-full"
                >
                  {expandedStaging.metaTitle ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Meta Title
                </button>
                {expandedStaging.metaTitle && (
                  <div className="mt-1 text-sm text-gray-700 pl-6">{metaTitle || "—"}</div>
                )}
              </div>
              <div>
                <button
                  onClick={() => toggleStaging("cta")}
                  className="flex items-center gap-2 text-sm text-gray-600 w-full"
                >
                  {expandedStaging.cta ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  CTA
                </button>
                {expandedStaging.cta && (
                  <div className="mt-2 pl-6 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">CTA Text</label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => {
                          setCtaText(e.target.value);
                          setContentChanged(true);
                        }}
                        placeholder="e.g. Learn more"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">CTA URL</label>
                      <input
                        type="url"
                        value={ctaUrl}
                        onChange={(e) => {
                          setCtaUrl(e.target.value);
                          setContentChanged(true);
                        }}
                        placeholder="https://..."
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={() => toggleStaging("image")}
                  className="flex items-center gap-2 text-sm text-gray-600 w-full"
                >
                  {expandedStaging.image ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Change Image
                </button>
                {expandedStaging.image && (
                  <div className="mt-2 pl-6 space-y-3">
                    {imageUrl && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Current image URL</label>
                        <div className="flex gap-2 items-start">
                          <img
                            src={imageUrl}
                            alt=""
                            className="w-20 h-20 rounded object-cover border border-gray-200 flex-shrink-0"
                          />
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => {
                              setImageUrl(e.target.value);
                              setContentChanged(true);
                            }}
                            placeholder="https://..."
                            className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                    {!imageUrl && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setContentChanged(true);
                          }}
                          placeholder="https://..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Or upload image</label>
                      <ImageUpload
                        key={imageUrl || "no-image"}
                        currentImageUrl={imageUrl || undefined}
                        onImageUploaded={handleImageUploaded}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setEditTextModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {regenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Platform Previews - spans full height on right */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:row-span-2 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Platform Previews
            </h2>
            <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
              {PUBLISHING_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedPlatform === p.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {p.icon && (
                    <div className="relative w-4 h-4">
                      <Image src={p.icon} alt="" width={16} height={16} className="object-contain" />
                    </div>
                  )}
                  {p.name}
                </button>
              ))}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 flex-1 min-h-[280px] bg-gray-50 overflow-auto">
              <PlatformPreview
                platform={selectedPlatform}
                title={title}
                body={body}
                imageUrl={imageUrl}
                ctaText={ctaText}
                ctaUrl={ctaUrl}
                metaTitle={metaTitle}
                platformDisplayName={platformUsernames[selectedPlatform]}
              />
            </div>
          </div>

          {/* Scheduling Calendar - under Staging Area */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Scheduling Calendar
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {!contentChanged && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Edit the content (via Edit button), change the image, or regenerate to enable publishing.
                </p>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handlePublishNow}
                  disabled={committing || !contentChanged}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {committing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Publish now
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={committing || !scheduleDate || !contentChanged}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {committing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Text Modal */}
      {editTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 edit-text-modal">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-gray-900">Edit Text</h3>
              <button
                onClick={() => setEditTextModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <p className="text-xs text-gray-500 mb-1">Use the toolbar to format</p>
                <div className="publication-preview-quill border border-gray-300 rounded-lg overflow-visible focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all bg-white">
                  <ReactQuill
                    theme="snow"
                    value={body}
                    onChange={(value) => setBody(value ?? "")}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Write your content..."
                    className="bg-white publication-preview-quill-editor"
                    style={{ minHeight: "280px" }}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setEditTextModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditText}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Remove Markdown bold/emphasis markers (** and __) so they don't show in content. */
function stripMarkdownBoldMarkers(html: string): string {
  if (!html || typeof html !== "string") return html;
  let out = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<em>$1</em>");
  return out.replace(/\*\*/g, "").replace(/__/g, "");
}

/** Sanitize HTML for safe preview: strip script/iframe and event handlers so content can be rendered. */
function sanitizeHtmlForPreview(html: string): string {
  if (!html || typeof html !== "string") return "";
  const noMarkdownMarkers = stripMarkdownBoldMarkers(html);
  return noMarkdownMarkers
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\s+on\w+=["'][^"']*["']/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
}

/** First full line of text (no mid-word cut). Strips HTML, takes first line; if longer than maxChars, ends at last word. */
function getFirstFullLine(htmlOrText: string, maxChars: number = 160): string {
  if (!htmlOrText) return "";
  const plain = stripHtml(htmlOrText).trim();
  const firstLine = plain.split(/\n/)[0]?.trim() || plain;
  if (firstLine.length <= maxChars) return firstLine;
  const cut = firstLine.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

function PlatformPreview({
  platform,
  title,
  body,
  imageUrl,
  ctaText,
  ctaUrl,
  metaTitle,
  platformDisplayName,
}: {
  platform: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  metaTitle: string;
  platformDisplayName?: string;
}) {
  const plain = stripHtml(body);
  const truncated = plain.length > 200 ? plain.slice(0, 200) + "…" : plain;
  const truncatedShort = plain.length > 120 ? plain.slice(0, 120) + "…" : plain;
  const blogBodyHtml = platform === "blog" || platform === "wordpress" || platform === "medium" || platform === "shopify"
    ? sanitizeHtmlForPreview(body)
    : "";

  if (platform === "blog" || platform === "wordpress" || platform === "medium" || platform === "shopify") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left flex flex-col max-h-[70vh]">
        <h3 className="text-lg font-semibold text-gray-900 p-3 border-b flex-shrink-0">{title || "Untitled"}</h3>
        {imageUrl && (
          <div className="aspect-video bg-gray-100 flex-shrink-0">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3 text-sm text-gray-700 overflow-y-auto flex-1 min-h-0 blog-preview-content [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_table]:border [&_table]:border-gray-300 [&_table]:w-full [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_div]:my-1">
          {blogBodyHtml ? (
            <div dangerouslySetInnerHTML={{ __html: blogBodyHtml }} />
          ) : (
            <p className="whitespace-pre-wrap">{plain}</p>
          )}
        </div>
        {ctaText && (
          <div className="px-3 pb-3 flex-shrink-0">
            <span className="inline-block px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">
              {ctaText}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (platform === "linkedin") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left max-w-md">
        <div className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{platformDisplayName || "User Name"}</div>
            <div className="text-xs text-gray-500">Headline</div>
          </div>
        </div>
        <p className="px-3 pb-2 text-sm text-gray-800 whitespace-pre-wrap">{truncatedShort}</p>
        {imageUrl && (
          <div className="aspect-video bg-gray-100">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2 flex gap-4 text-gray-500 text-xs border-t">
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
    );
  }

  if (platform === "facebook") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left max-w-md">
        <div className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-200 flex-shrink-0" />
          <div className="font-semibold text-gray-900 text-sm">{platformDisplayName || "User Name"}</div>
        </div>
        <p className="px-3 pb-2 text-sm text-gray-800">{truncatedShort}</p>
        {imageUrl && (
          <div className="aspect-video bg-gray-100">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2 flex gap-4 text-gray-500 text-xs border-t">
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
    );
  }

  if (platform === "reddit") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left max-w-md">
        <div className="p-2 flex items-center gap-2 border-b bg-gray-50">
          <div className="w-6 h-6 rounded-full bg-orange-500 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-600">{platformDisplayName ? `u/${platformDisplayName}` : "r/subreddit"}</span>
        </div>
        <h3 className="px-3 py-2 font-semibold text-gray-900 text-sm">{title || "Post title"}</h3>
        <p className="px-3 pb-2 text-sm text-gray-700">{truncatedShort}</p>
        {imageUrl && (
          <div className="aspect-video bg-gray-100">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-2 flex gap-4 text-gray-500 text-xs border-t">
          <span>↑ Vote</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
    );
  }

  if (platform === "x") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left max-w-md">
        <div className="p-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">{platformDisplayName || "@username"}</div>
            <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{truncatedShort}</p>
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                <img src={imageUrl} alt="" className="w-full max-h-48 object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (platform === "youtube") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left max-w-md">
        {imageUrl ? (
          <div className="aspect-video bg-gray-100">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video bg-gray-800 flex items-center justify-center">
            <span className="text-white text-4xl">▶</span>
          </div>
        )}
        <h3 className="p-2 font-semibold text-gray-900 text-sm">{title || "Video title"}</h3>
        <p className="px-2 pb-2 text-xs text-gray-600">{truncatedShort}</p>
      </div>
    );
  }

  if (platform === "instagram") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left max-w-sm">
        <div className="p-2 flex items-center gap-2 border-b">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
          <span className="font-semibold text-sm">{platformDisplayName || "username"}</span>
        </div>
        {imageUrl ? (
          <div className="aspect-square bg-gray-100">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-square bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
            Image
          </div>
        )}
        <p className="p-2 text-sm text-gray-800">{truncatedShort}</p>
      </div>
    );
  }

  if (platform === "github") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-left">
        <div className="p-3 border-b bg-gray-50">
          <h3 className="font-mono font-semibold text-gray-900">{title || "README"}</h3>
        </div>
        <div className="p-3 text-sm text-gray-700 font-mono whitespace-pre-wrap">{truncated}</div>
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600">
      <strong>{title || "Untitled"}</strong>
      <p className="mt-2 whitespace-pre-wrap">{truncated}</p>
    </div>
  );
}
