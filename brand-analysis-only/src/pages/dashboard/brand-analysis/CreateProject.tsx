import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  X, 
  Building,
  Target,
  Settings,
  PlayCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateBrandAnalysisProject, CreateProjectData } from "@/hooks/useBrandAnalysisProjects";
import { CountrySelector } from "@/components/geo-monitor/CountrySelector";
import { useToast } from "@/components/ui/use-toast";
import adminSettings from "@/lib/admin/settings";
import { WebsiteFavicon } from "@/components/ui/WebsiteFavicon";
import { getFaviconUrl } from "@/utils/faviconUtils";
import { PlatformLogo } from "@/components/brand-analysis/PlatformLogo";
import { CompetitorLogo } from "@/components/ui/CompetitorLogo";
import { extractDomainFromName as extractDomain } from "@/utils/competitorUtils";
import { LanguageFlag } from "@/components/ui/LanguageFlag";

interface Competitor {
  name: string;
  domain?: string;
}

interface WizardData {
  brandName: string;
  websiteUrl: string;
  industry: string;
  competitors: Competitor[];
  targetKeywords: string[];
  platforms: string[];
  languages: string[];
  countries: string[];
  frequency: string;
  queryGenerationMode: 'ai-only' | 'manual' | 'both';
  manualQueries: Array<{query: string, language: string, country?: string}>;
}

const STEPS = [
  { id: 1, title: "Brand Setup", icon: Building, description: "Basic brand information" },
  { id: 2, title: "Competitive Intelligence", icon: Target, description: "Competitors and keywords" },
  { id: 3, title: "Platform & Language Selection", icon: Settings, description: "Choose AI platforms and languages to monitor" },
  { id: 4, title: "Query Configuration", icon: MessageSquare, description: "Configure how queries are generated" },
  { id: 5, title: "Review & Launch", icon: PlayCircle, description: "Review settings and start analysis" }
];

const AI_PLATFORMS = [
  { id: "chatgpt", name: "ChatGPT & GPT-4", description: "OpenAI's flagship models", popular: true },
  { id: "claude", name: "Claude", description: "Anthropic's AI assistant", popular: true },
  { id: "perplexity", name: "Perplexity AI", description: "AI-powered search engine", popular: true },
  { id: "gemini", name: "Google Gemini", description: "Google's advanced AI model", popular: true },
  { id: "grok", name: "Grok (xAI)", description: "xAI's advanced AI model", popular: true },
];

const INDUSTRIES = [
  "Technology", 
  "Healthcare", 
  "Finance", 
  "Education", 
  "E-commerce", 
  "Manufacturing", 
  "Real Estate", 
  "Marketing", 
  "Consulting",
  "Retail",
  "Food & Beverage",
  "Hospitality & Tourism",
  "Transportation & Logistics",
  "Energy & Utilities",
  "Telecommunications",
  "Media & Entertainment",
  "Sports & Fitness",
  "Beauty & Personal Care",
  "Fashion & Apparel",
  "Automotive",
  "Aerospace & Defense",
  "Agriculture",
  "Construction",
  "Legal Services",
  "Non-profit",
  "Government",
  "Other"
];

const LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
];

// URL validation function for website input
const validateWebsiteUrl = (input: string): { 
  valid: boolean; 
  error?: string; 
  suggestion?: string;
} => {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { valid: false };
  }

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  
  // If no protocol, suggest adding https://
  if (!hasProtocol) {
    return { 
      valid: false, 
      error: 'URL must start with https://', 
      suggestion: `Try: https://${trimmed}` 
    };
  }

  // Validate it's a proper URL
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http:// or https://' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format. Please enter a valid website address.' };
  }
};

export default function CreateProject() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    brandName: "",
    websiteUrl: "",
    industry: "",
    competitors: [],
    targetKeywords: [],
    platforms: ["chatgpt", "claude", "perplexity"],
    languages: ["en-US"], // Default to English (US)
    countries: [], // Default to empty - user must select
    frequency: "weekly",
    queryGenerationMode: "ai-only",
    manualQueries: []
  });

  const [newCompetitor, setNewCompetitor] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newQuery, setNewQuery] = useState({ query: '', language: 'en-US', country: '' });
  const [isGeneratingIntelligence, setIsGeneratingIntelligence] = useState(false);
  const [customIndustry, setCustomIndustry] = useState("");
  const hasGeneratedIntelligence = useRef(false);
  
  const createProject = useCreateBrandAnalysisProject();
  const { toast } = useToast();

  // Real-time URL validation
  const urlValidation = useMemo(() => validateWebsiteUrl(data.websiteUrl), [data.websiteUrl]);

  // Function to generate competitors and keywords using OpenAI
  const generateCompetitiveIntelligence = async () => {
    if (!data.brandName.trim() || !data.websiteUrl.trim() || !data.industry) {
      toast({
        title: "Missing Information",
        description: "Please complete Brand Setup (Step 1) first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingIntelligence(true);
    
    try {
      // Get OpenAI API key
      const apiKey = await adminSettings.getAPIKey();
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured. Please configure it in Admin Settings.');
      }

      // Create prompt for OpenAI
      const prompt = `Based on the following brand information, generate a comprehensive competitive intelligence analysis:

Brand Name: ${data.brandName}
Website: ${data.websiteUrl}
Industry: ${data.industry}

Please provide:
1. A list of 8-12 main competitors (company/brand names) that operate in the same industry and market space. For each competitor, provide both the company name and their primary website domain/URL. IMPORTANT: Research and provide the actual, real website domain for each competitor - this is critical for fetching their logos.
2. A list of 15-20 relevant target keywords that would be important for brand monitoring and SEO in this industry

Format your response as JSON with this exact structure:
{
  "competitors": [
    {"name": "Competitor 1", "domain": "competitor1.com"},
    {"name": "Competitor 2", "domain": "competitor2.com"},
    ...
  ],
  "keywords": ["Keyword 1", "Keyword 2", "Keyword 3", ...]
}

CRITICAL REQUIREMENTS for competitors:
- Always include both "name" and "domain" fields
- The domain MUST be the actual, real website domain (e.g., "example.com" without http:// or https://)
- Use your knowledge to provide accurate domains for well-known companies
- For lesser-known competitors, make your best educated guess based on the company name
- Only use null for the domain field if you truly cannot determine any reasonable domain

Only return valid JSON, no additional text or explanation.`;

      const systemPrompt = "You are a competitive intelligence analyst. Provide accurate, relevant competitors and keywords based on the brand information provided. Return only valid JSON.";

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate competitive intelligence');
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content || '';

      // Parse JSON response
      let parsedData;
      try {
        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', content);
        throw new Error('Failed to parse AI response. Please try again.');
      }

      // Update state with generated data
      // Handle both old format (string[]) and new format (Competitor[])
      let competitors: Competitor[] = [];
      if (Array.isArray(parsedData.competitors)) {
        competitors = parsedData.competitors
          .map((c: any) => {
            if (typeof c === 'string') {
              // Old format: just a string
              return { name: c.trim(), domain: undefined };
            } else if (c && typeof c === 'object' && c.name) {
              // New format: object with name and domain
              return {
                name: c.name.trim(),
                domain: c.domain ? c.domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') : undefined
              };
            }
            return null;
          })
          .filter((c: Competitor | null): c is Competitor => c !== null && c.name.length > 0);
      }
      
      const keywords = Array.isArray(parsedData.keywords)
        ? parsedData.keywords.filter((k: string) => k && k.trim())
        : [];

      if (competitors.length > 0 || keywords.length > 0) {
        setData(prev => ({
          ...prev,
          competitors: competitors.length > 0 ? competitors : prev.competitors,
          targetKeywords: keywords.length > 0 ? keywords : prev.targetKeywords
        }));

        toast({
          title: "Intelligence Generated",
          description: `Found ${competitors.length} competitors and ${keywords.length} keywords. You can edit these as needed.`,
        });
      } else {
        throw new Error('No competitors or keywords were generated');
      }

    } catch (error) {
      console.error('Error generating competitive intelligence:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate competitive intelligence. Please try again or enter manually.',
        variant: "destructive"
      });
    } finally {
      setIsGeneratingIntelligence(false);
    }
  };

  // Sync customIndustry when data.industry is a custom value
  useEffect(() => {
    if (data.industry && 
        data.industry !== "other" && 
        !INDUSTRIES.some(ind => ind.toLowerCase() === data.industry.toLowerCase())) {
      setCustomIndustry(data.industry);
    } else if (data.industry && INDUSTRIES.some(ind => ind.toLowerCase() === data.industry.toLowerCase())) {
      setCustomIndustry("");
    }
  }, [data.industry]);

  // Auto-generate when entering step 2 if we have brand info and haven't generated yet
  useEffect(() => {
    if (currentStep === 2 && 
        data.brandName.trim() && 
        data.websiteUrl.trim() && 
        data.industry && 
        !hasGeneratedIntelligence.current &&
        data.competitors.length === 0 &&
        data.targetKeywords.length === 0) {
      hasGeneratedIntelligence.current = true;
      // Call the function directly
      generateCompetitiveIntelligence();
    }
    // Reset flag when leaving step 2 (but keep generated data)
    if (currentStep !== 2 && currentStep < 2) {
      hasGeneratedIntelligence.current = false;
    }
  }, [currentStep, data.brandName, data.websiteUrl, data.industry, data.competitors.length, data.targetKeywords.length]);

  const handleLaunchAnalysis = async () => {
    if (!canProceed()) return;
    
    // Process any pending inputs before submission
    if (newCompetitor.trim()) {
      processCompetitorInput(newCompetitor);
    }
    
    if (newKeyword.trim()) {
      processKeywordInput(newKeyword);
    }
    
    const projectData: CreateProjectData = {
      brandName: data.brandName,
      websiteUrl: data.websiteUrl,
      industry: data.industry,
      // Convert competitors to string array for API compatibility (extract names)
      competitors: data.competitors.map(c => c.name),
      targetKeywords: data.targetKeywords,
      platforms: data.platforms,
      languages: data.languages,
      countries: data.countries,
      frequency: data.frequency,
      queryGenerationMode: data.queryGenerationMode,
      manualQueries: data.manualQueries,
    };

    try {
      const result = await createProject.mutateAsync(projectData);
      
      // Show success toast
      toast({
        title: "Project Created!",
        description: "Redirecting to project page...",
      });
      
      // Navigate to project page first
      navigate(`/dashboard/brand-analysis/project/${result.id}`, {
        state: { 
          autoStartAnalysis: true,
          queryConfig: {
            queryGenerationMode: data.queryGenerationMode,
            manualQueries: data.manualQueries
          }
        }
      });
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };


  const processCompetitorInput = (input: string) => {
    if (!input.trim()) return;
    
    // Split by commas and process each competitor
    const newCompetitors = input
      .split(',')
      .map(item => item.trim())
      .filter(item => item && !data.competitors.some(c => c.name === item))
      .map(name => ({
        name,
        domain: extractDomain(name)
      }));
    
    if (newCompetitors.length > 0) {
      setData(prev => ({
        ...prev,
        competitors: [...prev.competitors, ...newCompetitors]
      }));
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (competitorName: string) => {
    setData(prev => ({
      ...prev,
      competitors: prev.competitors.filter(c => c.name !== competitorName)
    }));
  };

  const processKeywordInput = (input: string) => {
    if (!input.trim()) return;
    
    // Split by commas and process each keyword
    const keywords = input
      .split(',')
      .map(item => item.trim())
      .filter(item => item && !data.targetKeywords.includes(item));
    
    if (keywords.length > 0) {
      setData(prev => ({
        ...prev,
        targetKeywords: [...prev.targetKeywords, ...keywords]
      }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setData(prev => ({
      ...prev,
      targetKeywords: prev.targetKeywords.filter(k => k !== keyword)
    }));
  };

  const togglePlatform = (platformId: string) => {
    console.log(`Toggling platform ${platformId}. Current platforms:`, data.platforms);
    setData(prev => {
      const newPlatforms = prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId];
      console.log(`Updated platforms:`, newPlatforms);
      return {
        ...prev,
        platforms: newPlatforms
      };
    });
  };

  const handleAddManualQuery = () => {
    if (!newQuery.query.trim()) {
      return;
    }

    setData(prev => ({
      ...prev,
      manualQueries: [...prev.manualQueries, {
        query: newQuery.query.trim(),
        language: newQuery.language,
        country: newQuery.country || undefined
      }]
    }));
    
    setNewQuery({ query: '', language: 'en-US', country: '' });
  };

  const handleRemoveManualQuery = (index: number) => {
    setData(prev => ({
      ...prev,
      manualQueries: prev.manualQueries.filter((_, i) => i !== index)
    }));
  };

  // Calculate total queries
  const calculateTotalQueries = () => {
    const platformCount = data.platforms.length || 1;
    const languageCount = data.languages.length || 1;
    const countryCount = data.countries.length || 0;
    
    // NEW LOGIC: 200 queries per platform, distributed across languages and regions
    const QUERIES_PER_PLATFORM = 200;
    const regionCount = countryCount > 0 ? countryCount : 1;
    const totalCombinations = languageCount * regionCount;
    
    // Distribute 200 queries across all language-region combinations
    const queriesPerCombination = Math.floor(QUERIES_PER_PLATFORM / totalCombinations);
    const finalQueriesPerCombination = Math.max(1, Math.min(queriesPerCombination, QUERIES_PER_PLATFORM));
    
    // AI-generated queries per platform (always 200 or less)
    const aiGeneratedQueriesPerPlatform = finalQueriesPerCombination * totalCombinations;
    
    // Manual queries
    const manualQueryCount = data.manualQueries.length;
    
    // Total queries = (AI queries per platform + manual queries) × platforms
    if (data.queryGenerationMode === 'ai-only') {
      return aiGeneratedQueriesPerPlatform * platformCount;
    } else if (data.queryGenerationMode === 'manual') {
      return manualQueryCount * platformCount;
    } else {
      return (aiGeneratedQueriesPerPlatform + manualQueryCount) * platformCount;
    }
  };

  const selectAllPlatforms = () => {
    const allPlatformIds = AI_PLATFORMS.map(p => p.id);
    console.log(`Selecting all platforms:`, allPlatformIds);
    setData(prev => ({
      ...prev,
      platforms: allPlatformIds
    }));
  };
  
  const deselectAllPlatforms = () => {
    console.log(`Deselecting all platforms`);
    setData(prev => ({
      ...prev,
      platforms: []
    }));
  };

  const canProceed = () => {
    console.log('Checking if can proceed from step:', currentStep);
    console.log('Current data:', {
      brandName: data.brandName,
      industry: data.industry,
      targetKeywords: data.targetKeywords,
      platforms: data.platforms
    });
    
    switch (currentStep) {
      case 1:
        const urlValid = validateWebsiteUrl(data.websiteUrl);
        const step1Valid = data.brandName.trim() && 
                          urlValid.valid && // Use proper URL validation
                          data.industry && 
                          data.industry !== "other" &&
                          data.industry.trim().length > 0;
        console.log('Step 1 validation:', step1Valid, {
          brandName: data.brandName.trim(),
          websiteUrl: data.websiteUrl.trim(),
          urlValid: urlValid.valid,
          industry: data.industry
        });
        return step1Valid;
      case 2:
        // Make keywords optional too since they can be auto-discovered
        console.log('Step 2 validation:', true);
        return true;
      case 3:
        const step3Valid = data.platforms.length > 0;
        console.log('Step 3 validation:', step3Valid);
        return step3Valid;
      case 4:
        // Validate query configuration
        if (data.queryGenerationMode === 'manual' && data.manualQueries.length === 0) {
          return false;
        }
        if (data.queryGenerationMode === 'both' && data.manualQueries.length === 0) {
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                placeholder="e.g., Acme Corp"
                value={data.brandName}
                onChange={(e) => setData(prev => ({ ...prev, brandName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL *</Label>
              <Input
                id="websiteUrl"
                placeholder="https://yourbrand.com"
                value={data.websiteUrl}
                onChange={(e) => setData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                className={data.websiteUrl && !urlValidation.valid ? 'border-destructive focus-visible:ring-destructive' : urlValidation.valid ? 'border-green-500 focus-visible:ring-green-500' : ''}
              />
              {/* Empty state helper */}
              {!data.websiteUrl && (
                <p className="text-xs text-muted-foreground">
                  Enter the full URL including <code className="px-1 py-0.5 bg-muted rounded text-xs">https://</code>
                </p>
              )}
              {/* Error state with suggestion */}
              {data.websiteUrl && !urlValidation.valid && urlValidation.error && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-destructive">
                    <p>{urlValidation.error}</p>
                    {urlValidation.suggestion && (
                      <p className="mt-1 font-medium">{urlValidation.suggestion}</p>
                    )}
                  </div>
                </div>
              )}
              {/* Valid state */}
              {data.websiteUrl && urlValidation.valid && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Valid URL</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select 
                value={
                  !data.industry 
                    ? "" 
                    : INDUSTRIES.some(ind => ind.toLowerCase() === data.industry.toLowerCase()) 
                      ? (data.industry.toLowerCase() === "other" ? "other" : data.industry.toLowerCase())
                      : "other"
                }
                onValueChange={(value) => {
                  if (value === "other") {
                    setData(prev => {
                      // If there was a custom industry value, preserve it
                      if (prev.industry && prev.industry !== "other" && !INDUSTRIES.some(ind => ind.toLowerCase() === prev.industry.toLowerCase())) {
                        setCustomIndustry(prev.industry);
                      } else {
                        setCustomIndustry("");
                      }
                      return { ...prev, industry: "other" };
                    });
                  } else {
                    setData(prev => ({ ...prev, industry: value }));
                    setCustomIndustry("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry === "Other" ? "other" : industry.toLowerCase()}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(data.industry === "other" || (data.industry && data.industry !== "other" && !INDUSTRIES.some(ind => ind.toLowerCase() === data.industry.toLowerCase()))) && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter your industry"
                    value={customIndustry || (data.industry !== "other" && data.industry ? data.industry : "")}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomIndustry(value);
                      setData(prev => ({ ...prev, industry: value.trim() || "other" }));
                    }}
                    onBlur={() => {
                      if (customIndustry.trim()) {
                        setData(prev => ({ ...prev, industry: customIndustry.trim() }));
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter a custom industry name
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* AI Generation Section */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">AI-Powered Suggestions</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateCompetitiveIntelligence}
                  disabled={isGeneratingIntelligence || !data.brandName.trim() || !data.websiteUrl.trim() || !data.industry}
                >
                  {isGeneratingIntelligence ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                AI will automatically generate competitors and keywords based on your brand information. You can edit the results below.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Competitors (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter competitors separated by commas (e.g., "Acme Corp, Tech Solutions, Market Leader") or use AI generation above.
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Enter competitors separated by commas"
                    value={newCompetitor}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewCompetitor(value);
                      
                      // If the user types a comma, process the input
                      if (value.endsWith(',')) {
                        processCompetitorInput(value.slice(0, -1));
                      }
                    }}
                    onBlur={() => processCompetitorInput(newCompetitor)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        processCompetitorInput(newCompetitor);
                      }
                    }}
                    disabled={isGeneratingIntelligence}
                  />
                  
                </div>
                {isGeneratingIntelligence && data.competitors.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finding competitors...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.competitors.map((competitor) => {
                      const domain = competitor.domain || extractDomain(competitor.name);
                      return (
                        <Badge key={competitor.name} variant="secondary" className="flex items-center gap-2 px-2.5 py-1.5">
                          <CompetitorLogo 
                            name={competitor.name}
                              domain={domain} 
                            size={18}
                              className="rounded-sm"
                            />
                          <span>{competitor.name}</span>
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-destructive" 
                            onClick={() => removeCompetitor(competitor.name)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Target Keywords</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter keywords relevant to your industry separated by commas (e.g., "AI technology, machine learning, market trends") or use AI generation above.
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Enter keywords separated by commas"
                    value={newKeyword}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewKeyword(value);
                      
                      // If the user types a comma, process the input
                      if (value.endsWith(',')) {
                        processKeywordInput(value.slice(0, -1));
                      }
                    }}
                    onBlur={() => processKeywordInput(newKeyword)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        processKeywordInput(newKeyword);
                      }
                    }}
                    disabled={isGeneratingIntelligence}
                  />
                </div>
                {isGeneratingIntelligence && data.targetKeywords.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finding keywords...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.targetKeywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                        {keyword}
                        <X 
                          className="w-3 h-3 cursor-pointer" 
                          onClick={() => removeKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium mb-2">Select AI Platforms to Monitor</h3>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllPlatforms}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={deselectAllPlatforms}
                    className="text-xs"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which AI platforms you want to track for brand mentions
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {data.platforms.map(platformId => {
                  const platform = AI_PLATFORMS.find(p => p.id === platformId);
                  return platform ? (
                    <Badge key={platformId} variant="secondary" className="flex items-center gap-1.5">
                      <PlatformLogo platform={platformId} size={14} />
                      {platform.name}
                    </Badge>
                  ) : null;
                })}
                {data.platforms.length === 0 && (
                  <p className="text-sm text-muted-foreground">No platforms selected</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {AI_PLATFORMS.map((platform) => (
                <Card 
                  key={platform.id}
                  className={`cursor-pointer transition-all ${
                    data.platforms.includes(platform.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={data.platforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                      />
                      <div className="flex items-center gap-2 mr-2">
                        <PlatformLogo platform={platform.id} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1 mb-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium text-sm md:text-base">{platform.name}</h4>
                            {platform.popular && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">{platform.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Analysis Frequency</Label>
              <Select value={data.frequency} onValueChange={(value) => setData(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-6 mt-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-lg font-medium">Select Languages for Global Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your brand visibility across different languages and regions
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Languages</Label>
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !data.languages.includes(value)) {
                        setData(prev => ({ ...prev, languages: [...prev.languages, value] }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select languages to monitor" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {LANGUAGES.filter(lang => !data.languages.includes(lang.code)).map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2">
                            <LanguageFlag flag={lang.flag} className="text-lg" />
                            <span>{lang.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {LANGUAGES.filter(lang => !data.languages.includes(lang.code)).length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">All languages selected</div>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.languages.map(langCode => {
                      const lang = LANGUAGES.find(l => l.code === langCode);
                      return lang ? (
                        <Badge key={langCode} variant="secondary" className="flex items-center gap-1.5">
                          <LanguageFlag flag={lang.flag} />
                          <span>{lang.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setData(prev => ({
                                ...prev,
                                languages: prev.languages.filter(l => l !== langCode)
                              }));
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                    {data.languages.length === 0 && (
                      <p className="text-sm text-muted-foreground">No languages selected</p>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Each platform will have up to 200 queries distributed across {data.languages.length} language(s) and {data.countries.length || 1} region(s). Total: {data.platforms.length} platform(s) × 200 queries = {data.platforms.length * 200} queries
              </p>
            </div>

            <div className="border-t pt-6 mt-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="text-lg font-medium">Select Countries/Regions for Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your brand visibility in specific countries and regions
                    </p>
                  </div>
                </div>
                <CountrySelector
                  selectedCountries={data.countries}
                  onChange={(countries) => setData(prev => ({ ...prev, countries }))}
                  maxCountries={50}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Select countries to generate geography-specific queries. If none selected, queries will be general (not country-specific).
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Query Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure how queries are generated for your brand visibility analysis
              </p>
            </div>

            {/* Query Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Query Generation Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={data.queryGenerationMode} 
                  onValueChange={(value: 'ai-only' | 'manual' | 'both') => 
                    setData(prev => ({ ...prev, queryGenerationMode: value }))
                  }
                  className="space-y-3"
                >
                  <label htmlFor="ai-only" className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="ai-only" id="ai-only" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        Auto Generated Queries Only
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generate up to 200 queries per platform, distributed across your selected languages and regions
                      </p>
                    </div>
                  </label>
                  
                  <label htmlFor="manual" className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="manual" id="manual" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        Manual Queries Only
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use only your custom queries (add them below)
                      </p>
                    </div>
                  </label>
                  
                  <label htmlFor="both" className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="both" id="both" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        Auto Generated + Manual Queries
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Combine 200 auto-generated queries per platform with your custom queries
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Total Queries Display */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Queries:</span>
                    <span className="text-xl font-bold text-primary">{calculateTotalQueries()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Platforms: {data.platforms.length} ({data.platforms.join(', ') || 'none'})</p>
                    <p>• Languages: {data.languages.length} ({data.languages.join(', ')})</p>
                    {data.countries.length > 0 && (
                      <p>• Regions: {data.countries.length} ({data.countries.join(', ')})</p>
                    )}
                    {data.queryGenerationMode !== 'manual' && (
                      <>
                        <p className="pt-1 border-t font-medium">• 200 queries per platform</p>
                        <p className="pl-2">Distributed: {Math.floor(200 / (data.languages.length * (data.countries.length || 1)))} queries × {data.languages.length} language(s) × {data.countries.length || 1} region(s)</p>
                      </>
                    )}
                    {data.queryGenerationMode !== 'ai-only' && (
                      <p>• Manual queries: {data.manualQueries.length}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manual Query Input */}
            {(data.queryGenerationMode === 'manual' || data.queryGenerationMode === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Manual Queries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Query Text</Label>
                    <Textarea
                      placeholder="e.g., What are the best project management tools for small teams?"
                      value={newQuery.query}
                      onChange={(e) => setNewQuery({ ...newQuery, query: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Language</Label>
                      <Input
                        value={newQuery.language}
                        onChange={(e) => setNewQuery({ ...newQuery, language: e.target.value })}
                        placeholder="en-US"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Country (Optional)</Label>
                      <Input
                        value={newQuery.country}
                        onChange={(e) => setNewQuery({ ...newQuery, country: e.target.value })}
                        placeholder="US"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={handleAddManualQuery} variant="outline" size="sm" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Query
                  </Button>

                  {/* Manual Queries List */}
                  {data.manualQueries.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Manual Queries ({data.manualQueries.length})</Label>
                      <ScrollArea className="h-[200px] border rounded-md p-3">
                        <div className="space-y-2">
                          {data.manualQueries.map((q, index) => (
                            <div key={index} className="flex items-start justify-between p-2 bg-muted rounded-md text-sm">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium break-words text-xs">{q.query}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{q.language}</Badge>
                                  {q.country && (
                                    <Badge variant="outline" className="text-xs">{q.country}</Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveManualQuery(index)}
                                className="ml-2 flex-shrink-0 h-6 w-6 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Warning for AI-only mode */}
            {data.queryGenerationMode === 'ai-only' && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Auto Generated Queries</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    The system will automatically generate up to 200 queries per platform based on your brand information, industry, keywords, and selected languages/regions. These queries will be distributed evenly across all language and region combinations.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Launch Analysis</h3>
              <p className="text-muted-foreground">
                Review your settings below and click "Launch Analysis" to start monitoring. 
                Competitors will be discovered automatically during the analysis process.
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Brand Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium">{data.brandName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Industry:</span>
                    <span className="font-medium">{data.industry}</span>
                  </div>
                  {data.websiteUrl && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Website:</span>
                      <span className="font-medium">{data.websiteUrl}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Monitoring Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-muted-foreground">Competitors ({data.competitors.length}):</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {data.competitors.map((competitor) => {
                        const domain = competitor.domain || extractDomain(competitor.name);
                        return (
                          <Badge key={competitor.name} variant="outline" className="text-xs flex items-center gap-1.5 px-2 py-1">
                            <CompetitorLogo 
                              name={competitor.name}
                                domain={domain} 
                              size={16}
                                className="rounded-sm"
                              />
                            <span>{competitor.name}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Keywords ({data.targetKeywords.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.targetKeywords.map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Platforms ({data.platforms.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.platforms.map((platformId) => {
                        const platform = AI_PLATFORMS.find(p => p.id === platformId);
                        return (
                          <Badge key={platformId} variant="outline" className="text-xs flex items-center gap-1.5">
                            <PlatformLogo platform={platformId} size={12} />
                            {platform?.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="font-medium">{data.frequency}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Create Brand Visibility Project</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Set up automated brand monitoring across major AI platforms
          </p>
        </div>

        {/* Step Progress - Mobile Layout */}
        <div className="sm:hidden mb-6">
          {/* Mobile progress bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100)}% complete
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Current step indicator */}
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              {(() => {
                const currentStepData = STEPS[currentStep - 1];
                const Icon = currentStepData.icon;
                return <Icon className="w-5 h-5" />;
              })()}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {STEPS[currentStep - 1].title}
              </p>
              <p className="text-xs text-muted-foreground">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
          </div>
        </div>

        {/* Step Progress - Desktop Horizontal Layout */}
        <div className="hidden sm:block mb-6 md:mb-8">
          <div className="flex items-center justify-between overflow-x-auto">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center min-w-0">
                  <div 
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 aspect-square transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </div>
                  <div className="ml-2 md:ml-3">
                    <p className={`text-xs md:text-sm font-medium transition-colors duration-300 ${
                      isCompleted ? 'text-green-600 dark:text-green-400' : isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden md:block">{step.description}</p>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className={`w-3 h-3 md:w-4 md:h-4 mx-2 md:mx-4 transition-colors duration-300 ${
                      currentStep > step.id ? 'text-green-500' : 'text-muted-foreground'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 relative">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-primary to-green-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
            {/* Step markers */}
            <div className="absolute top-0 left-0 w-full flex justify-between" style={{ transform: 'translateY(-1px)' }}>
              {STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                return (
                  <div 
                    key={step.id}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500' 
                        : isActive 
                          ? 'bg-primary border-primary ring-2 ring-primary/30' 
                          : 'bg-background border-muted-foreground/30'
                    }`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Step counter */}
          <div className="mt-2 text-center">
            <span className="text-xs text-muted-foreground">
              Step <span className="font-medium text-foreground">{currentStep}</span> of {STEPS.length}
            </span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="min-h-[300px] md:min-h-[400px]">
          <CardContent className="p-4 md:p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 pt-4 md:pt-6">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => {
              if (currentStep === 1) {
                navigate('/dashboard/brand-analysis');
              } else {
                setCurrentStep(prev => Math.max(1, prev - 1));
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </Button>
          
          {currentStep < STEPS.length ? (
            <Button 
              className="w-full sm:w-auto"
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              className="w-full sm:w-auto"
              onClick={handleLaunchAnalysis}
              disabled={!canProceed() || createProject.isPending}
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  Launch Analysis
                  <PlayCircle className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}