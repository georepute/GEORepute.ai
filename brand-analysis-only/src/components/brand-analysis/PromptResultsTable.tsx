import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, ExternalLink, ChevronDown, ChevronUp, Bot, Brain, Zap, Sparkles, Search as SearchIcon, PenLine, Bookmark } from 'lucide-react';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownFormatter } from './MarkdownFormatter';
import { PlatformLogo } from './PlatformLogo';
import { useBrandAnalysisProject } from '@/hooks/useBrandAnalysisProjects';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BlogPrefillFromQuery } from '@/types/blog-prefill';
import { generateBlogTitleFromQuery, generateBlogInstructionsFromQuery, generateBlogDescriptionFromQuery } from '@/lib/services/blog-prefill-service';

interface PromptResultsTableProps {
  projectId?: string;
  sessionId?: string; // Support for legacy interface
  viewMode?: 'mentioned' | 'unmentioned';
}

export const PromptResultsTable: React.FC<PromptResultsTableProps> = ({ projectId, sessionId, viewMode: externalViewMode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const effectiveProjectId = projectId || sessionId;
  const { data: analysisResults = [], isLoading } = useBrandAnalysisResults(effectiveProjectId || '', sessionId);
  const { data: project } = useBrandAnalysisProject(projectId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [internalViewMode, setInternalViewMode] = useState<'mentioned' | 'unmentioned'>('mentioned');
  const [sortField, setSortField] = useState<'rank' | 'date' | 'platform'>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [savingQuery, setSavingQuery] = useState<string | null>(null);
  
  // Use external viewMode if provided, otherwise use internal state
  const effectiveViewMode = externalViewMode || internalViewMode;

  const handleConvertToBlog = (result: any) => {
    const prefill: BlogPrefillFromQuery = {
      sourceType: 'brand-analysis-missed-prompt',
      queryText: result.query_text,
      aiPlatform: result.ai_platform,
      competitorMentions: result.competitor_mentions || [],
      aiResponseContent: result.raw_response?.content || '',
      sources: result.raw_response?.sources || [],
      projectId: result.project_id,
      brandName: project?.brand_name,
      brandWebsite: project?.website_url,
      brandIndustry: project?.industry
    };
    
    navigate('/dashboard/agent-tasks/new', { 
      state: { 
        prefill,
        prefilledTitle: generateBlogTitleFromQuery(result.query_text),
        prefilledDescription: generateBlogDescriptionFromQuery(prefill),
        prefilledInstructions: generateBlogInstructionsFromQuery(prefill)
      } 
    });
  };

  const handleSaveToQueue = async (result: any) => {
    setSavingQuery(result.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('saved_blog_queries').insert({
        user_id: user.id,
        project_id: result.project_id,
        query_text: result.query_text,
        ai_platform: result.ai_platform,
        competitor_mentions: result.competitor_mentions || [],
        ai_response_excerpt: result.raw_response?.content?.substring(0, 500),
        sources: result.raw_response?.sources || [],
        status: 'pending',
        // Include brand context for blog generation
        brand_name: project?.brand_name,
        brand_website: project?.website_url,
        brand_industry: project?.industry
      });

      if (error) throw error;
      
      toast({ 
        title: "Query Saved!", 
        description: "Added to your blog queue for later" 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save query", 
        variant: "destructive" 
      });
    } finally {
      setSavingQuery(null);
    }
  };

  // Filter and search results
  const filteredResults = useMemo(() => {
    let filtered = analysisResults;

    // Filter by platform
    if (selectedPlatform !== 'all') {
      const norm = (p: string) => {
        const v = (p || '').toLowerCase();
        // Normalize both grok and groq to 'grok' for consistent filtering
        return v === 'groq' ? 'grok' : v;
      };
      filtered = filtered.filter(r => norm(r.ai_platform) === norm(selectedPlatform));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.query_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.raw_response?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.competitor_mentions?.some(comp => comp.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by view mode
    if (effectiveViewMode === 'mentioned') {
      filtered = filtered.filter(r => r.mention_found);
    } else if (effectiveViewMode === 'unmentioned') {
      filtered = filtered.filter(r => !r.mention_found);
    }

    // Sort results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'rank':
          aValue = a.mention_position || 999;
          bValue = b.mention_position || 999;
          break;
        case 'date':
          aValue = new Date(a.analysis_date).getTime();
          bValue = new Date(b.analysis_date).getTime();
          break;
        case 'platform':
          aValue = a.ai_platform;
          bValue = b.ai_platform;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [analysisResults, searchTerm, selectedPlatform, effectiveViewMode, sortField, sortDirection]);

  // Pagination calculations
  const totalResults = filteredResults.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalResults);
  const paginatedResults = filteredResults.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedPlatform, effectiveViewMode]);

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 5);
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  // Get unique platforms for filter - ONLY show platforms that actually have results in this analysis
  const platforms = useMemo(() => {
    // Only include platforms that have actual results in the current analysis
    const platformsFromResults = new Set<string>(analysisResults.map(r => r.ai_platform).filter(Boolean));
    return Array.from(platformsFromResults).sort();
  }, [analysisResults]);

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    switch (platformLower) {
      case 'chatgpt':
        return Bot;
      case 'claude':
        return Brain;
      case 'perplexity':
        return SearchIcon;
      case 'gemini':
        return Sparkles;
      case 'copilot':
        return Zap;
      default:
        return Bot;
    }
  };

  const getPlatformName = (platform: string) => {
    const platformLower = platform.toLowerCase();
    switch (platformLower) {
      case 'chatgpt':
        return 'ChatGPT';
      case 'claude':
        return 'Claude';
      case 'perplexity':
        return 'Perplexity';
      case 'gemini':
        return 'Gemini';
      case 'copilot':
        return 'Copilot';
      case 'groq':
      case 'grok':
        return 'Grok';
      case 'ai_overviews':
      case 'google_ai_overviews':
        return 'Google AI Overviews';
      default:
        return platform;
    }
  };

  const getRankBadgeStyle = (position: number | null, platform: string) => {
    const platformColors = {
      chatgpt: 'border-green-500/20 bg-green-500/10',
      claude: 'border-purple-500/20 bg-purple-500/10',
      perplexity: 'border-amber-500/20 bg-amber-500/10',
      gemini: 'border-blue-500/20 bg-blue-500/10',
      copilot: 'border-red-500/20 bg-red-500/10'
    };

    const baseStyle = platformColors[platform.toLowerCase() as keyof typeof platformColors] || 'border-gray-500/20 bg-gray-500/10';

    if (!position) return `${baseStyle} text-muted-foreground`;
    if (position === 1) return `${baseStyle} text-primary font-bold ring-2 ring-primary/20`;
    if (position <= 3) return `${baseStyle} text-foreground font-semibold`;
    return `${baseStyle} text-muted-foreground`;
  };

  const extractSources = (rawResponse: any) => {
    try {
      if (!rawResponse) return [] as any[];

      const collected: Array<{ url: string; title?: string; is_citation?: boolean }> = [];

      const normalizeUrl = (u: string) => {
        if (!u) return '';
        let url = u.trim();
        url = url.replace(/[)\]>.,;:]+$/g, '');
        url = url.replace(/#.*$/, '');
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        return url.toLowerCase();
      };

      const pushItem = (u?: string | null, t?: string | null, isCitation = true) => {
        if (!u) return;
        const url = normalizeUrl(u);
        if (!url) return;
        if (!collected.find(s => normalizeUrl(s.url) === url)) {
          collected.push({ url, title: t || undefined, is_citation: isCitation });
        }
      };

      const directArrays = [
        rawResponse.sources,
        rawResponse.metadata?.sources,
        rawResponse.citations,
        rawResponse.references,
        rawResponse.metadata?.citations,
        rawResponse.related_links,
      ].filter(Boolean);

      directArrays.forEach((arr: any) => {
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            if (typeof item === 'string') pushItem(item, null, true);
            else if (item && typeof item === 'object') pushItem(item.url || item.link, item.title || item.text, true);
          });
        }
      });

      const contentText = typeof rawResponse === 'string'
        ? rawResponse
        : rawResponse.content || rawResponse.text || JSON.stringify(rawResponse);

      if (contentText && typeof contentText === 'string') {
        const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        let mdMatch;
        while ((mdMatch = mdLinkRe.exec(contentText)) !== null) {
          pushItem(mdMatch[2], mdMatch[1], true);
        }

        const footnoteRe = /\[[^\]]+\]:\s*(https?:\/\/\S+)/g;
        let fnMatch;
        while ((fnMatch = footnoteRe.exec(contentText)) !== null) {
          pushItem(fnMatch[1], null, true);
        }

        const sectionRe = /(Sources?|References?)\s*:\s*([\s\S]*?)(\n\n|$)/gi;
        let secMatch;
        while ((secMatch = sectionRe.exec(contentText)) !== null) {
          const block = secMatch[2];
          const urlRe = /(https?:\/\/[^\s)\]]+)/g;
          let uMatch;
          while ((uMatch = urlRe.exec(block)) !== null) {
            pushItem(uMatch[1], null, true);
          }
        }

        const plainUrlRe = /(https?:\/\/[^\s)\]]+)/g;
        let pMatch;
        while ((pMatch = plainUrlRe.exec(contentText)) !== null) {
          pushItem(pMatch[1], null, false);
        }
      }

      return collected.slice(0, 200);
    } catch (e) {
      console.error('extractSources error:', e);
      return [] as any[];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSort = (field: 'rank' | 'date' | 'platform') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-4"></div>
            <p className="text-sm text-muted-foreground">Loading analysis results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analysisResults.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Analysis Results</h3>
          <p className="text-muted-foreground mb-4">
            Run a brand visibility analysis to see detailed prompt results and AI responses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle className="text-lg font-semibold">Analysis Results</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts, responses, competitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="text-sm border rounded-md px-3 py-2 bg-background"
            >
              <option value="all">All Platforms</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>
                  {getPlatformName(platform)}
                </option>
              ))}
            </select>
            
            {/* Show view mode toggle only when externalViewMode is not provided */}
            {!externalViewMode && (
              <div className="flex items-center border rounded-md overflow-hidden">
                <button 
                  className={`px-3 py-1 text-sm ${internalViewMode === 'mentioned' 
                    ? 'bg-primary text-white' 
                    : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setInternalViewMode('mentioned')}
                >
                  Mentioned Prompts
                </button>
                <button 
                  className={`px-3 py-1 text-sm ${internalViewMode === 'unmentioned' 
                    ? 'bg-primary text-white' 
                    : 'bg-transparent text-muted-foreground hover:bg-muted'}`}
                  onClick={() => setInternalViewMode('unmentioned')}
                >
                  Missed Prompts
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredResults.length} of {analysisResults.length} results
          {effectiveViewMode === 'mentioned' ? ' (mentioned)' : effectiveViewMode === 'unmentioned' ? ' (unmentioned)' : ''}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-lg border overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px]">
                  PROMPT
                </TableHead>
                <TableHead className="w-[100px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('platform')} className="h-auto p-0 font-medium">
                    AI
                    {sortField === 'platform' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('rank')} className="h-auto p-0 font-medium">
                    RANK
                    {sortField === 'rank' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[150px]">COMPETITORS</TableHead>
                <TableHead className="w-[150px]">SOURCES</TableHead>
                <TableHead className="w-[100px] text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.map((result) => {
                const sources = extractSources(result.raw_response);
                
                return (
                  <TableRow key={result.id} className="hover:bg-muted/50">
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug text-foreground line-clamp-2">
                              {result.query_text}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDate(result.analysis_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <PlatformLogo platform={result.ai_platform} size={16} />
                        <span>{getPlatformName(result.ai_platform)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-bold ${getRankBadgeStyle(result.mention_position, result.ai_platform)}`}>
                          {result.mention_position ? `#${result.mention_position}` : '—'}
                        </div>
                        {result.sentiment_score && (
                          <div className="text-xs text-muted-foreground">
                            {Math.round(result.sentiment_score * 100)}%
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        {result.competitor_mentions && result.competitor_mentions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {result.competitor_mentions.slice(0, 3).map((competitor, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {competitor}
                              </Badge>
                            ))}
                            {result.competitor_mentions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{result.competitor_mentions.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None mentioned</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        {sources.length > 0 ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <button className="text-sm text-primary hover:underline cursor-pointer font-medium text-center">
                                {sources.length}
                                <br />
                                <span className="text-xs">sources</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Sources ({sources.length})</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh]">
                                <div className="space-y-3">
                                  {sources.map((source: any, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                      <ExternalLink className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                      <a 
                                        href={source.url || source.link || source}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline break-all"
                                        title={source.title || source.url || source.link || source}
                                      >
                                        {source.url || source.link || source}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-xs text-muted-foreground">No sources</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right py-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 px-3">
                            View Response
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw]">
                          <DialogHeader>
                            <DialogTitle>AI Response Details</DialogTitle>
                            <DialogDescription>
                              {getPlatformName(result.ai_platform)} • {formatDate(result.analysis_date)}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="max-h-[70vh]">
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium">Query</h4>
                                  {!result.mention_found && (
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleConvertToBlog(result)}
                                        className="h-8"
                                      >
                                        <PenLine className="h-4 w-4 mr-1" />
                                        Create Blog
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleSaveToQueue(result)}
                                        disabled={savingQuery === result.id}
                                        className="h-8"
                                      >
                                        <Bookmark className="h-4 w-4 mr-1" />
                                        {savingQuery === result.id ? 'Saving...' : 'Save to Queue'}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm bg-muted p-3 rounded">{result.query_text}</p>
                              </div>
                              {result.raw_response?.content && (
                                <div>
                                  <h4 className="font-medium mb-2">Response</h4>
                                  <MarkdownFormatter content={result.raw_response.content} />
                                </div>
                              )}
                              {sources.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Sources</h4>
                                  <div className="space-y-2">
                                    {sources.map((source: any, i: number) => (
                                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        <a 
                                          href={source.url || source.link || source}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline"
                                        >
                                          {source.title || source.url || source.link || source}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalResults > 0 && (
          <div className="border-t bg-background px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {totalResults} results
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">per page</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="text-sm border rounded px-2 py-1 bg-background"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  ‹
                </Button>
                
                {generatePageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  »
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};