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

