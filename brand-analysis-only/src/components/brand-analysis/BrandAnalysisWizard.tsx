import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBrandAnalysisProject, CreateProjectData } from "@/hooks/useBrandAnalysisProjects";
import { PlatformLogo } from "./PlatformLogo";
import { CompetitorLogo } from "@/components/ui/CompetitorLogo";
import { extractDomainFromName } from "@/utils/competitorUtils";

interface BrandAnalysisWizardProps {
  onClose: () => void;
}

interface WizardData {
  brandName: string;
  websiteUrl: string;
  industry: string;
  competitors: string[];
  targetKeywords: string[];
  platforms: string[];
  frequency: string;
}

const STEPS = [
  { id: 1, title: "Brand Setup", icon: Building, description: "Basic brand information" },
  { id: 2, title: "Competitive Intelligence", icon: Target, description: "Competitors and keywords" },
  { id: 3, title: "Platform Selection", icon: Settings, description: "Choose AI platforms to monitor" },
  { id: 4, title: "Review & Launch", icon: PlayCircle, description: "Review settings and start analysis" }
];

const AI_PLATFORMS = [
  { id: "chatgpt", name: "ChatGPT & GPT-4", description: "OpenAI's flagship models", popular: true },
  { id: "claude", name: "Claude", description: "Anthropic's AI assistant", popular: true },
  { id: "perplexity", name: "Perplexity AI", description: "AI-powered search engine", popular: true },
  { id: "gemini", name: "Google Gemini", description: "Google's advanced AI model", popular: true },
  { id: "groq", name: "Grok", description: "Fast LLaMA model inference", popular: true },
];

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Education", "E-commerce", 
  "Manufacturing", "Real Estate", "Marketing", "Consulting", "Other"
];

export function BrandAnalysisWizard({ onClose }: BrandAnalysisWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    brandName: "",
    websiteUrl: "",
    industry: "",
    competitors: [],
    targetKeywords: [],
    platforms: ["chatgpt", "claude", "perplexity", "gemini", "grok"],
    frequency: "weekly"
  });

  const [newCompetitor, setNewCompetitor] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  
  const createProject = useCreateBrandAnalysisProject();

  const handleLaunchAnalysis = async () => {
    if (!canProceed()) return;
    
    console.log('Wizard: Launching analysis with platforms:', data.platforms);
    
    const projectData: CreateProjectData = {
      brandName: data.brandName,
      websiteUrl: data.websiteUrl,
      industry: data.industry,
      competitors: data.competitors,
      targetKeywords: data.targetKeywords,
      platforms: data.platforms,
      frequency: data.frequency,
    };

    console.log('Wizard: Project data being submitted:', projectData);

    try {
      await createProject.mutateAsync(projectData);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !data.competitors.includes(newCompetitor.trim())) {
      setData(prev => ({
        ...prev,
        competitors: [...prev.competitors, newCompetitor.trim()]
      }));
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setData(prev => ({
      ...prev,
      competitors: prev.competitors.filter(c => c !== competitor)
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !data.targetKeywords.includes(newKeyword.trim())) {
      setData(prev => ({
        ...prev,
        targetKeywords: [...prev.targetKeywords, newKeyword.trim()]
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
    setData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.brandName.trim() && data.industry;
      case 2:
        return data.competitors.length > 0 && data.targetKeywords.length > 0;
      case 3:
        return data.platforms.length > 0;
      case 4:
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
              <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
              <Input
                id="websiteUrl"
                placeholder="https://example.com"
                value={data.websiteUrl}
                onChange={(e) => setData(prev => ({ ...prev, websiteUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select value={data.industry} onValueChange={(value) => setData(prev => ({ ...prev, industry: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry.toLowerCase()}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Competitors</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Add your main competitors to track comparative mentions
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Competitor name"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                  />
                  <Button type="button" onClick={addCompetitor}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.competitors.map((competitor) => {
                    const domain = extractDomainFromName(competitor);
                    return (
                      <Badge key={competitor} variant="secondary" className="flex items-center gap-2 px-2.5 py-1.5">
                        <CompetitorLogo 
                          name={competitor}
                          domain={domain}
                          size={16}
                          className="rounded-sm"
                        />
                      {competitor}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeCompetitor(competitor)}
                      />
                    </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Target Keywords</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Keywords relevant to your industry for AI platform queries
                </p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Target keyword"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button type="button" onClick={addKeyword}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
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
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Select AI Platforms to Monitor</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose which AI platforms you want to track for brand mentions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={data.platforms.includes(platform.id)}
                        onCheckedChange={() => togglePlatform(platform.id)}
                        onPointerDownCapture={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-2 mr-2">
                        <PlatformLogo platform={platform.id} size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{platform.name}</h4>
                          {platform.popular && (
                            <Badge variant="secondary" className="text-xs">Popular</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{platform.description}</p>
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
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Launch Analysis</h3>
              <p className="text-muted-foreground">
                Review your settings below and click "Launch Analysis" to start monitoring
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.competitors.map((competitor) => {
                        const domain = extractDomainFromName(competitor);
                        return (
                          <Badge key={competitor} variant="outline" className="text-xs flex items-center gap-1.5">
                            <CompetitorLogo 
                              name={competitor}
                              domain={domain}
                              size={14}
                              className="rounded-sm"
                            />
                          {competitor}
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
                          <Badge key={platformId} variant="outline" className="text-xs flex items-center gap-1">
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Brand Visibility Project</DialogTitle>
        </DialogHeader>

        {/* Step Progress */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <div className="ml-3 hidden md:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground mx-4" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < STEPS.length ? (
            <Button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleLaunchAnalysis}
              disabled={!canProceed() || createProject.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createProject.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              {createProject.isPending ? 'Creating Project...' : 'Launch Analysis'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}