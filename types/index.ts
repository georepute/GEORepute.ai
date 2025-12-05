// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "agency" | "client";
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Keyword Types
export interface Keyword {
  id: string;
  keyword: string;
  position: number;
  change: number;
  volume: number;
  difficulty: number;
  roi: "Very High" | "High" | "Medium" | "Low";
  forecast: string;
  platform: "google" | "bing" | "ai";
}

// Content Types
export interface Content {
  id: string;
  title: string;
  type: string;
  status: "draft" | "review" | "scheduled" | "published";
  platforms: string[];
  publishDate?: Date;
  performance: {
    views: number;
    engagement: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// AI Platform Types
export interface AIPlatform {
  id: string;
  name: string;
  score: number;
  change: number;
  mentions: number;
  citations: number;
  color: string;
}

// Report Types
export interface Report {
  id: string;
  name: string;
  type: "PDF" | "CSV" | "Sheets";
  category: string;
  lastGenerated: Date;
  size: string;
  url?: string;
}

// Dashboard Stats
export interface DashboardStats {
  visibility: number;
  visibilityChange: number;
  keywords: number;
  keywordsChange: number;
  aiPlatforms: number;
  leads: number;
  leadsChange: number;
}

// Analytics Data
export interface AnalyticsData {
  date: string;
  google: number;
  bing: number;
  ai: number;
}

// Visibility Score
export interface VisibilityScore {
  overall: number;
  google: number;
  bing: number;
  ai: number;
  trend: "up" | "down" | "stable";
}

// Traffic Source
export interface TrafficSource {
  name: string;
  value: number;
  color: string;
  change?: number;
}

// Notification
export interface Notification {
  id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

// White Label Config
export interface WhiteLabelConfig {
  id: string;
  domain: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  customCSS?: string;
}

// Subscription
export interface Subscription {
  id: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  status: "active" | "cancelled" | "expired";
  currentPeriodEnd: Date;
  features: string[];
}

// Brand Voice Profile
export interface BrandVoiceProfile {
  id: string;
  user_id: string;
  brand_name: string;
  description?: string;
  is_default: boolean;
  personality_traits: string[];
  tone: "casual" | "professional" | "formal" | "friendly" | "humorous" | "authoritative" | "neutral";
  sentence_length: "short" | "medium" | "long" | "mixed";
  vocabulary_level: "simple" | "intermediate" | "advanced";
  use_emojis: boolean;
  emoji_style: "none" | "minimal" | "moderate" | "heavy";
  preferred_words: string[];
  avoid_words: string[];
  signature_phrases: string[];
  voice_examples: string[];
  created_at: string;
  updated_at: string;
}

// SEO Schema Types (JSON-LD Structured Data)
export interface SchemaData {
  "@context": string;
  "@type": string;
  [key: string]: any;
}

export interface ContentSchema {
  jsonLd: SchemaData | SchemaData[];
  scriptTags: string;
  generatedAt: string;
}

// Structured SEO Content Types
export interface StructuredSEOContent {
  metaDescription: string;
  headings: Array<{
    level: number;
    text: string;
    position: number;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  seoScore: number | null;
  wordCount: number;
  ogTags?: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    siteName?: string;
  };
  internalLinks?: Array<{
    anchorText: string;
    suggestedUrl: string;
    relevance: number;
    reason: string;
  }>;
  canonicalUrl?: string;
  generatedAt: string;
}

