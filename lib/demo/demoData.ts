// Demo data for demo mode

export const demoUser = {
  id: "demo-user-id",
  email: "demo@georepute.ai",
  user_metadata: {
    full_name: "Demo User",
  },
};

export const demoStats = {
  totalVisibility: 91,
  visibilityChange: 12,
  keywordsTracked: 247,
  keywordsChange: 23,
  aiPlatforms: 15,
  platformsChange: 3,
  avgPosition: 3.2,
  positionChange: -0.8,
};

export const demoRankingData = [
  { date: "Jan", google: 45, bing: 38, ai: 25 },
  { date: "Feb", google: 52, bing: 42, ai: 35 },
  { date: "Mar", google: 61, bing: 48, ai: 48 },
  { date: "Apr", google: 73, bing: 55, ai: 62 },
  { date: "May", google: 82, bing: 61, ai: 75 },
  { date: "Jun", google: 91, bing: 68, ai: 88 },
];

export const demoVisibilityData = [
  { platform: "GPT-4", score: 85, color: "#3b82f6" },
  { platform: "Gemini", score: 78, color: "#8b5cf6" },
  { platform: "Perplexity", score: 82, color: "#14b8a6" },
  { platform: "Claude", score: 71, color: "#ec4899" },
];

export const demoKeywordData = [
  { 
    id: 1,
    keyword: "AI SEO tools", 
    position: 3, 
    change: 2, 
    volume: 8900,
    difficulty: 65,
    url: "https://example.com/ai-seo-tools"
  },
  { 
    id: 2,
    keyword: "GEO optimization", 
    position: 1, 
    change: 0, 
    volume: 3200,
    difficulty: 45,
    url: "https://example.com/geo-optimization"
  },
  { 
    id: 3,
    keyword: "AI search visibility", 
    position: 5, 
    change: -1, 
    volume: 5400,
    difficulty: 55,
    url: "https://example.com/ai-search"
  },
  { 
    id: 4,
    keyword: "reputation management", 
    position: 7, 
    change: 3, 
    volume: 12100,
    difficulty: 70,
    url: "https://example.com/reputation"
  },
];

export const demoContent = [
  {
    id: 1,
    title: "Complete Guide to AI-Driven SEO in 2024",
    status: "published",
    views: 12500,
    engagement: 8.5,
    publishedAt: "2024-06-15",
    author: "Demo User"
  },
  {
    id: 2,
    title: "How to Optimize for AI Search Engines",
    status: "draft",
    views: 0,
    engagement: 0,
    publishedAt: null,
    author: "Demo User"
  },
  {
    id: 3,
    title: "The Future of Generative Engine Optimization",
    status: "scheduled",
    views: 0,
    engagement: 0,
    publishedAt: "2024-07-01",
    author: "Demo User"
  },
];

export const demoClients = [
  { 
    id: 1,
    name: "Acme Corp", 
    visibility: 92, 
    change: "+8%", 
    status: "active",
    keywords: 156,
    monthlySpend: 2500
  },
  { 
    id: 2,
    name: "TechStart Inc", 
    visibility: 88, 
    change: "+12%", 
    status: "active",
    keywords: 98,
    monthlySpend: 1800
  },
  { 
    id: 3,
    name: "Global Retail", 
    visibility: 85, 
    change: "+5%", 
    status: "active",
    keywords: 203,
    monthlySpend: 3200
  },
  { 
    id: 4,
    name: "FinanceHub", 
    visibility: 79, 
    change: "-2%", 
    status: "needs attention",
    keywords: 142,
    monthlySpend: 2100
  },
];

export const demoReports = [
  {
    id: 1,
    name: "Monthly SEO Performance Report",
    type: "monthly",
    generatedAt: "2024-06-30",
    status: "ready",
    format: "pdf"
  },
  {
    id: 2,
    name: "Weekly Rankings Update",
    type: "weekly",
    generatedAt: "2024-06-25",
    status: "ready",
    format: "pdf"
  },
  {
    id: 3,
    name: "AI Visibility Analysis",
    type: "custom",
    generatedAt: "2024-06-28",
    status: "ready",
    format: "pdf"
  },
];

export const demoTeamMembers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    status: "active",
    lastActive: "2 hours ago"
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    role: "agency",
    status: "active",
    lastActive: "5 minutes ago"
  },
  {
    id: 3,
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "client",
    status: "active",
    lastActive: "1 day ago"
  },
];




