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

// Organization Types
export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

// Role Types
export interface Role {
  id: string;
  name: "Admin" | "Manager" | "Editor" | "Viewer";
  description?: string;
  permissions: Record<string, any>;
  created_at: string;
}

// Organization User Types
export interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  status: "active" | "inactive" | "invited" | "suspended";
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface OrganizationWithRole extends Organization {
  role: Role;
  organization_user: OrganizationUser;
}

export interface UserWithOrganization extends User {
  organization?: Organization;
  organizations?: OrganizationWithRole[];
}

