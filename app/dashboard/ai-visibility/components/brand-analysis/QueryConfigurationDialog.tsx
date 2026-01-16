"use client";
import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Button from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Badge from "@/components/Badge";
import Card } from "@/components/Card";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface QueryConfigurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (queries: Array<{query: string, language: string, country?: string}>, useAIGenerated: boolean) => void;
  project: {
    id: string;
    brand_name: string;
    active_platforms?: string[];
    target_languages?: string[];
    target_countries?: string[];
  };
  isLoading?: boolean;
}

export const QueryConfigurationDialog: React.FC<QueryConfigurationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  project,
  isLoading = false
}) => {
  const [queryMode, setQueryMode] = useState<'ai-only' | 'manual' | 'both'>('ai-only');
  const [manualQueries, setManualQueries] = useState<Array<{query: string, language: string, country?: string}>>([]);
  const [newQuery, setNewQuery] = useState({ query: '', language: 'en-US', country: '' });
  const { toast } = useToast();

  // Calculate total queries
  const totalQueries = useMemo(() => {
    const platforms = project.active_platforms?.length || 1;
    const languages = project.target_languages?.length || 1;
    const countries = project.target_countries?.length || 0;
    
    // NEW LOGIC: 200 queries per platform, distributed across languages and regions
    const QUERIES_PER_PLATFORM = 200;
    const regionCount = countries > 0 ? countries : 1;
    const totalCombinations = languages * regionCount;
    
    // Distribute 200 queries across all language-region combinations
    const queriesPerCombination = Math.floor(QUERIES_PER_PLATFORM / totalCombinations);
    const finalQueriesPerCombination = Math.max(1, Math.min(queriesPerCombination, QUERIES_PER_PLATFORM));
    
    // AI-generated queries per platform (always 200 or less)
    const aiGeneratedQueriesPerPlatform = finalQueriesPerCombination * totalCombinations;
    
    // Manual queries
    const manualQueryCount = manualQueries.length;
    
    // Total queries = (AI queries per platform + manual queries) × platforms
    if (queryMode === 'ai-only') {
      return aiGeneratedQueriesPerPlatform * platforms;
    } else if (queryMode === 'manual') {
      return manualQueryCount * platforms;
    } else {
      return (aiGeneratedQueriesPerPlatform + manualQueryCount) * platforms;
    }
  }, [queryMode, project.active_platforms, project.target_languages, project.target_countries, manualQueries.length]);

  const handleAddManualQuery = () => {
    if (!newQuery.query.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a query text",
        variant: "destructive"
      });
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

  const handleConfirm = () => {
    if (queryMode === 'manual' && manualQueries.length === 0) {
      toast({
        title: "No Queries",
        description: "Please add at least one manual query or select Auto Generated queries",
        variant: "destructive"
      });
      return;
    }

    if (queryMode === 'both' && manualQueries.length === 0) {
      toast({
        title: "No Manual Queries",
        description: "Please add manual queries or select 'Auto Generated Only' mode",
        variant: "destructive"
      });
      return;
    }

    // If AI-only, pass empty array (backend will generate)
    // If manual or both, pass the manual queries
    const queriesToPass = queryMode === 'ai-only' ? [] : manualQueries;
    const useAIGenerated = queryMode === 'ai-only' || queryMode === 'both';
    
    onConfirm(queriesToPass, useAIGenerated);
  };

  const languages = project.target_languages || ['en-US'];
  const countries = project.target_countries || [];
  const platforms = project.active_platforms || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Analysis Queries</DialogTitle>
          <DialogDescription>
            Choose how to generate queries for your brand visibility analysis
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Query Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Query Generation Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={queryMode} onValueChange={(value: 'ai-only' | 'manual' | 'both') => setQueryMode(value)}>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="ai-only" id="ai-only" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="ai-only" className="cursor-pointer font-semibold">
                      Auto Generated Queries Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate up to 200 queries per platform, distributed across your selected languages and regions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="manual" className="cursor-pointer font-semibold">
                      Manual Queries Only
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use only your custom queries (add them below)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="both" id="both" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="both" className="cursor-pointer font-semibold">
                      Auto Generated + Manual Queries
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Combine 200 auto-generated queries per platform with your custom queries
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Total Queries Display */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Queries:</span>
                  <span className="text-2xl font-bold text-primary">{totalQueries}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Platforms: {platforms.length} ({platforms.join(', ')})</p>
                  <p>• Languages: {languages.length} ({languages.join(', ')})</p>
                  {countries.length > 0 && (
                    <p>• Regions: {countries.length} ({countries.join(', ')})</p>
                  )}
                  {queryMode !== 'manual' && (
                    <>
                      <p className="pt-1 border-t font-medium">• 200 queries per platform</p>
                      <p className="pl-2">Distributed: {Math.floor(200 / (languages.length * (countries.length || 1)))} queries × {languages.length} language(s) × {countries.length || 1} region(s)</p>
                    </>
                  )}
                  {queryMode !== 'ai-only' && (
                    <p>• Manual queries: {manualQueries.length}</p>
                  )}
                  <p className="pt-2 border-t font-medium">
                    Total: {queryMode === 'ai-only' ? `${Math.floor(200 / (languages.length * (countries.length || 1))) * languages.length * (countries.length || 1)} AI queries` : queryMode === 'manual' ? `${manualQueries.length} manual queries` : `${Math.floor(200 / (languages.length * (countries.length || 1))) * languages.length * (countries.length || 1)} AI + ${manualQueries.length} manual`} × {platforms.length} platform(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Query Input (shown when manual or both mode) */}
          {(queryMode === 'manual' || queryMode === 'both') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Manual Queries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Query Text</Label>
                  <Textarea
                    placeholder="e.g., What are the best project management tools for small teams?"
                    value={newQuery.query}
                    onChange={(e) => setNewQuery({ ...newQuery, query: e.target.value })}
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Input
                      value={newQuery.language}
                      onChange={(e) => setNewQuery({ ...newQuery, language: e.target.value })}
                      placeholder="en-US"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country (Optional)</Label>
                    <Input
                      value={newQuery.country}
                      onChange={(e) => setNewQuery({ ...newQuery, country: e.target.value })}
                      placeholder="US"
                    />
                  </div>
                </div>
                
                <Button onClick={handleAddManualQuery} variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Query
                </Button>

                {/* Manual Queries List */}
                {manualQueries.length > 0 && (
                  <div className="space-y-2">
                    <Label>Manual Queries ({manualQueries.length})</Label>
                    <ScrollArea className="h-[200px] border rounded-md p-4">
                      <div className="space-y-2">
                        {manualQueries.map((q, index) => (
                          <div key={index} className="flex items-start justify-between p-3 bg-muted rounded-md">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium break-words">{q.query}</p>
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
                              className="ml-2 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
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
          {queryMode === 'ai-only' && (
            <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">Auto Generated Queries</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  The system will automatically generate up to 200 queries per platform based on your brand information, industry, keywords, and selected languages/regions. These queries will be distributed evenly across all language and region combinations.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Analysis'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

