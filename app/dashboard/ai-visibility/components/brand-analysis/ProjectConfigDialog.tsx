"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Button from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Badge from '@/components/Badge';
import Card from '@/components/Card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Save, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { BrandAnalysisProject } from '@/hooks/useBrandAnalysisProjects';
import { useQueryClient } from '@tanstack/react-query';
import { PlatformLogo } from './PlatformLogo';
import { CompetitorLogo } from '@/components/ui/CompetitorLogo';
import { extractDomainFromName } from '@/lib/utils/competitorUtils';

// Define available AI platforms
const AI_PLATFORMS = [
  { id: "chatgpt", name: "ChatGPT & GPT-4", description: "OpenAI's flagship models", popular: true },
  { id: "claude", name: "Claude", description: "Anthropic's AI assistant", popular: true },
  { id: "perplexity", name: "Perplexity AI", description: "AI-powered search engine", popular: true },
  { id: "gemini", name: "Google Gemini", description: "Google's advanced AI model", popular: true },
  { id: "groq", name: "Grok", description: "Fast LLaMA model inference", popular: true },
];

interface ProjectConfigDialogProps {
  project: BrandAnalysisProject;
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectConfigDialog({ project, isOpen, onClose }: ProjectConfigDialogProps) {
  const [brandName, setBrandName] = useState(project.brand_name);
  const [websiteUrl, setWebsiteUrl] = useState(project.website_url || '');
  const [industry, setIndustry] = useState(project.industry || '');
  const [competitors, setCompetitors] = useState<string[]>(project.competitors || []);
  const [targetKeywords, setTargetKeywords] = useState<string[]>(project.target_keywords || []);
  const [platforms, setPlatforms] = useState<string[]>(project.active_platforms || ['chatgpt', 'claude', 'perplexity', 'gemini', 'grok']);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  
  // Query configuration state
  const [queryMode, setQueryMode] = useState<'ai-only' | 'manual' | 'both'>(project.query_generation_mode || 'ai-only');
  const [manualQueries, setManualQueries] = useState<Array<{query: string, language: string, country?: string}>>(project.manual_queries || []);
  const [newQuery, setNewQuery] = useState({ query: '', language: 'en-US', country: '' });
  const [targetLanguages, setTargetLanguages] = useState<string[]>(project.target_languages || ['en-US']);
  const [targetCountries, setTargetCountries] = useState<string[]>(project.target_countries || []);

  // Reset form when project changes
  useEffect(() => {
    if (isOpen) {
      console.log('Loading project config dialog with platforms:', project.active_platforms);
      setBrandName(project.brand_name);
      setWebsiteUrl(project.website_url || '');
      setIndustry(project.industry || '');
      setCompetitors(project.competitors || []);
      setTargetKeywords(project.target_keywords || []);
      const loadedPlatforms = project.active_platforms || ['chatgpt', 'claude', 'perplexity', 'gemini', 'grok'];
      console.log('Setting platforms to:', loadedPlatforms);
      setPlatforms(loadedPlatforms);
      setNewCompetitor('');
      setNewKeyword('');
      setQueryMode(project.query_generation_mode || 'ai-only');
      setManualQueries(project.manual_queries || []);
      setNewQuery({ query: '', language: 'en-US', country: '' });
      setTargetLanguages(project.target_languages || ['en-US']);
      setTargetCountries(project.target_countries || []);
    }
  }, [isOpen, project]);

  const processCompetitorInput = (input: string) => {
    if (!input.trim()) return;
    
    // Split by commas and process each competitor
    const newCompetitors = input
      .split(',')
      .map(item => item.trim())
      .filter(item => item && !competitors.includes(item));
    
    if (newCompetitors.length > 0) {
      setCompetitors([...competitors, ...newCompetitors]);
      setNewCompetitor('');
    }
  };

  const handleRemoveCompetitor = (competitor: string) => {
    setCompetitors(competitors.filter(c => c !== competitor));
  };

  const processKeywordInput = (input: string) => {
    if (!input.trim()) return;
    
    // Split by commas and process each keyword
    const newKeywords = input
      .split(',')
      .map(item => item.trim())
      .filter(item => item && !targetKeywords.includes(item));
    
    if (newKeywords.length > 0) {
      setTargetKeywords([...targetKeywords, ...newKeywords]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setTargetKeywords(targetKeywords.filter(k => k !== keyword));
  };

  const togglePlatform = (platformId: string) => {
    setPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleAddManualQuery = () => {
    if (!newQuery.query.trim()) {
      toast.error('Please enter a query text');
      return;
    }

    setManualQueries([...manualQueries, {
      query: newQuery.query.trim(),
      language: newQuery.language,
      country: newQuery.country || undefined
    }]);
    
    setNewQuery({ query: '', language: 'en-US', country: '' });
  };

  const handleRemoveManualQuery = (index: number) => {
    setManualQueries(manualQueries.filter((_, i) => i !== index));
  };

  // Calculate total queries
  const totalQueries = useMemo(() => {
    const platformCount = platforms.length || 1;
    const languageCount = targetLanguages.length || 1;
    const countryCount = targetCountries.length || 0;
    
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
    const manualQueryCount = manualQueries.length;
    
    // Total queries = (AI queries per platform + manual queries) × platforms
    if (queryMode === 'ai-only') {
      return aiGeneratedQueriesPerPlatform * platformCount;
    } else if (queryMode === 'manual') {
      return manualQueryCount * platformCount;
    } else {
      return (aiGeneratedQueriesPerPlatform + manualQueryCount) * platformCount;
    }
  }, [queryMode, platforms.length, targetLanguages.length, targetCountries.length, manualQueries.length]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Process any pending inputs before saving
      if (newCompetitor.trim()) {
        processCompetitorInput(newCompetitor);
      }
      
      if (newKeyword.trim()) {
        processKeywordInput(newKeyword);
      }
      
      // Ensure at least one platform is selected
      if (platforms.length === 0) {
        toast.error('Please select at least one AI platform');
        setIsSaving(false);
        return;
      }
      
      // Validate query configuration
      if (queryMode === 'manual' && manualQueries.length === 0) {
        toast.error('Please add at least one manual query or select Auto Generated queries');
        setIsSaving(false);
        return;
      }

      if (queryMode === 'both' && manualQueries.length === 0) {
        toast.error('Please add manual queries or select "Auto Generated Only" mode');
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('brand_analysis_projects')
        .update({
          brand_name: brandName,
          website_url: websiteUrl || null,
          industry: industry || null,
          competitors: competitors,
          target_keywords: targetKeywords,
          active_platforms: platforms,
          query_generation_mode: queryMode,
          manual_queries: manualQueries,
          target_languages: targetLanguages,
          target_countries: targetCountries
        })
        .eq('id', project.id);

      if (error) {
        throw error;
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['brand-analysis-project', project.id] });
      queryClient.invalidateQueries({ queryKey: ['brand-analysis-projects'] });
      
      toast.success('Project configuration updated successfully');
      
      onClose();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Configuration</DialogTitle>
          <DialogDescription>
            Update your brand visibility project settings, parameters, and query configuration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input 
              id="brandName" 
              value={brandName} 
              onChange={(e) => setBrandName(e.target.value)} 
              placeholder="Your brand name"
            />
          </div>
          
          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL (optional)</Label>
            <Input 
              id="websiteUrl" 
              value={websiteUrl} 
              onChange={(e) => setWebsiteUrl(e.target.value)} 
              placeholder="https://yourbrand.com"
            />
          </div>
          
          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input 
              id="industry" 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)} 
              placeholder="Technology, Finance, Healthcare, etc."
            />
          </div>
          
          {/* AI Platforms */}
          <div className="space-y-2">
            <Label>AI Platforms</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AI_PLATFORMS.map((platform) => (
                <div
                  key={platform.id}
                  className={`flex items-center gap-2 p-3 rounded-md cursor-pointer border transition-all ${
                    platforms.includes(platform.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    platforms.includes(platform.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-muted-foreground'
                  }`}>
                    {platforms.includes(platform.id) && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    <PlatformLogo platform={platform.id} size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center">
                      {platform.name}
                      {platform.popular && (
                        <Badge variant="secondary" className="ml-2 text-xs">Popular</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{platform.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {platforms.length === 0 && (
              <p className="text-sm text-amber-500 mt-2">
                Please select at least one AI platform for analysis
              </p>
            )}
          </div>
          
          {/* Competitors */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Competitors</Label>
              <span className="text-xs text-muted-foreground">Type and separate with commas</span>
            </div>
            <div className="w-full">
              <Input 
                value={newCompetitor} 
                onChange={(e) => {
                  const value = e.target.value;
                  setNewCompetitor(value);
                  
                  // If the user types a comma, process the input
                  if (value.endsWith(',')) {
                    processCompetitorInput(value.slice(0, -1));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    processCompetitorInput(newCompetitor);
                  }
                }}
                placeholder="Type competitor names, separate with commas (e.g., Competitor1, Competitor2)"
                onBlur={() => processCompetitorInput(newCompetitor)}
                className="w-full"
              />
            </div>
            
            {competitors.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {competitors.map((competitor) => {
                  const domain = extractDomainFromName(competitor);
                  return (
                    <Badge key={competitor} variant="secondary" className="px-2 py-1 text-xs flex items-center gap-1.5">
                      <CompetitorLogo 
                        name={competitor}
                        domain={domain}
                        size={14}
                        className="rounded-sm"
                      />
                    {competitor}
                    <button 
                      type="button" 
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveCompetitor(competitor)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                No competitors added yet. Type competitor names separated by commas (e.g., "Competitor1, Competitor2").
              </p>
            )}
          </div>
          
          {/* Target Keywords */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Target Keywords</Label>
              <span className="text-xs text-muted-foreground">Type and separate with commas</span>
            </div>
            <div className="w-full">
              <Input 
                value={newKeyword} 
                onChange={(e) => {
                  const value = e.target.value;
                  setNewKeyword(value);
                  
                  // If the user types a comma, process the input
                  if (value.endsWith(',')) {
                    processKeywordInput(value.slice(0, -1));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    processKeywordInput(newKeyword);
                  }
                }}
                placeholder="Type keywords, separate with commas (e.g., keyword1, keyword2)"
                onBlur={() => processKeywordInput(newKeyword)}
                className="w-full"
              />
            </div>
            
            {targetKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {targetKeywords.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="px-2 py-1 text-xs">
                    {keyword}
                    <button 
                      type="button" 
                      className="ml-2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                No keywords added yet. Type keywords separated by commas (e.g., "keyword1, keyword2").
              </p>
            )}
          </div>

          {/* Query Configuration Section */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-2">Query Configuration</h3>
              <p className="text-sm text-muted-foreground">Configure how queries are generated for brand visibility</p>
            </div>

            {/* Query Mode Selection */}
            <Card className="p-0">
              <div className="p-4 pb-2">
                <h3 className="text-base font-semibold">Query Generation Mode</h3>
              </div>
              <div className="px-4 pb-4">
                <RadioGroup 
                  value={queryMode} 
                  onValueChange={(value: 'ai-only' | 'manual' | 'both') => setQueryMode(value)}
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
              </div>
            </Card>

            {/* Total Queries Display */}
            <Card className="bg-primary/5 border-primary/20 p-0">
              <div className="p-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Queries:</span>
                    <span className="text-xl font-bold text-primary">{totalQueries}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Platforms: {platforms.length} ({platforms.join(', ') || 'none'})</p>
                    <p>• Languages: {targetLanguages.length} ({targetLanguages.join(', ')})</p>
                    {targetCountries.length > 0 && (
                      <p>• Regions: {targetCountries.length} ({targetCountries.join(', ')})</p>
                    )}
                    {queryMode !== 'manual' && (
                      <>
                        <p className="pt-1 border-t font-medium">• 200 queries per platform</p>
                        <p className="pl-2">Distributed: {Math.floor(200 / (targetLanguages.length * (targetCountries.length || 1)))} queries × {targetLanguages.length} language(s) × {targetCountries.length || 1} region(s)</p>
                      </>
                    )}
                    {queryMode !== 'ai-only' && (
                      <p>• Manual queries: {manualQueries.length}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Manual Query Input (shown when manual or both mode) */}
            {(queryMode === 'manual' || queryMode === 'both') && (
              <Card className="p-0">
                <div className="p-4 pb-2">
                  <h3 className="text-base font-semibold">Add Manual Queries</h3>
                </div>
                <div className="px-4 pb-4 space-y-4">
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
                  {manualQueries.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Manual Queries ({manualQueries.length})</Label>
                      <ScrollArea className="h-[150px] border rounded-md p-3">
                        <div className="space-y-2">
                          {manualQueries.map((q, index) => (
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
                </div>
              </Card>
            )}

            {/* Warning for AI-only mode */}
            {queryMode === 'ai-only' && (
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
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !brandName || platforms.length === 0}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 