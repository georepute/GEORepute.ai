import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, ExternalLink, Filter, MoreHorizontal, ChevronDown, ChevronUp, PenLine, Bookmark } from 'lucide-react';
import { useBrandAnalysisResults } from '@/hooks/useBrandAnalysisResults';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MarkdownFormatter } from './MarkdownFormatter';
import { useBrandAnalysisProject } from '@/hooks/useBrandAnalysisProjects';
import { useBrandAnalysisSources } from '@/hooks/useBrandAnalysisSources';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BlogPrefillFromQuery } from '@/types/blog-prefill';
import { generateBlogTitleFromQuery, generateBlogInstructionsFromQuery, generateBlogDescriptionFromQuery } from '@/lib/services/blog-prefill-service';

interface EnhancedAnalysisResultsProps {
  projectId: string;
  viewMode?: 'mentioned' | 'unmentioned' | 'all';
}

export const EnhancedAnalysisResults: React.FC<EnhancedAnalysisResultsProps> = ({ 
  projectId, 
  viewMode = 'all' 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: analysisResults = [], isLoading } = useBrandAnalysisResults(projectId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [sortField, setSortField] = useState<'rank' | 'date' | 'platform'>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [savingQuery, setSavingQuery] = useState<string | null>(null);

  const { data: project } = useBrandAnalysisProject(projectId);
  const { data: projectSources = [] } = useBrandAnalysisSources(projectId);

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

  const formatPlatformName = (platform: string) => {
    const p = (platform as string)?.toLowerCase?.() || platform;
    if (p === 'groq' || p === 'grok') return 'Grok';
    if (p === 'chatgpt') return 'ChatGPT';
    if (p === 'claude') return 'Claude';
    if (p === 'perplexity') return 'Perplexity';
    if (p === 'gemini') return 'Gemini';
    if (p === 'copilot') return 'Copilot';
    if (p === 'ai_overviews' || p === 'google_ai_overviews' || p === 'ai overviews') return 'Google AI Overviews';
    return platform;
  };

  // Filter and search results
  const filteredResults = useMemo(() => {
    let filtered = analysisResults;

    // Filter by view mode
    if (viewMode === 'mentioned') {
      filtered = filtered.filter(r => r.mention_found);
    } else if (viewMode === 'unmentioned') {
      filtered = filtered.filter(r => !r.mention_found);
    }

    // Filter by platform
    if (selectedPlatform !== 'all') {
      const normalize = (p: string) => {
        const v = p?.toLowerCase?.() || p;
        // Normalize both grok and groq to 'grok' for consistent filtering
        return v === 'groq' ? 'grok' : v;
      };
      filtered = filtered.filter(r => normalize(r.ai_platform) === normalize(selectedPlatform));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.query_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.raw_response?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.competitor_mentions?.some(comp => comp.toLowerCase().includes(searchTerm.toLowerCase()))
      );
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
  }, [analysisResults, searchTerm, selectedPlatform, viewMode, sortField, sortDirection]);

  // Get unique platforms for filter - ONLY show platforms that actually have results in this analysis
  const platforms = useMemo(() => {
    // Only include platforms that have actual results in the current analysis
    const platformsFromResults = new Set<string>(analysisResults.map(r => r.ai_platform).filter(Boolean));
    return Array.from(platformsFromResults).sort();
  }, [analysisResults]);

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

      // Helper: normalize URL for dedupe
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

      // 1) Direct structures commonly returned
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

      // 2) Parse content text for links
      const contentText = typeof rawResponse === 'string'
        ? rawResponse
        : rawResponse.content || rawResponse.text || JSON.stringify(rawResponse);

      if (contentText && typeof contentText === 'string') {
        // 2a) Markdown links: [title](https://example.com)
        const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        let mdMatch;
        while ((mdMatch = mdLinkRe.exec(contentText)) !== null) {
          pushItem(mdMatch[2], mdMatch[1], true);
        }

        // 2b) Footnotes style: [^1]: https://example.com
        const footnoteRe = /\[[^\]]+\]:\s*(https?:\/\/\S+)/g;
        let fnMatch;
        while ((fnMatch = footnoteRe.exec(contentText)) !== null) {
          pushItem(fnMatch[1], null, true);
        }

        // 2c) "Sources:" or "References:" sections
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

        // 2d) Fallback: all plain URLs
        const plainUrlRe = /(https?:\/\/[^\s)\]]+)/g;
        let pMatch;
        while ((pMatch = plainUrlRe.exec(contentText)) !== null) {
          pushItem(pMatch[1], null, false);
        }
      }

      // Cap to avoid rendering issues
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

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
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
            Run a brand visibility analysis to see detailed results across AI platforms.
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
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts, responses, competitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-56 sm:w-64"
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
                  {formatPlatformName(platform)}
                </option>
              ))}
            </select>
            {projectSources.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sources ({projectSources.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Project Sources ({projectSources.length})</DialogTitle>
                    <DialogDescription>
                      Most-cited domains and links found across AI platform responses
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-3">
                      {/* Top domains summary */}
                      <div className="text-sm text-muted-foreground">
                        Top domains:
                        {Array.from(
                          projectSources.reduce((map, s) => {
                            map.set(s.domain, (map.get(s.domain) || 0) + (s.citation_count || 0));
                            return map;
                          }, new Map<string, number>())
                        )
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([domain, count], i) => (
                            <span key={domain} className="ml-2">
                              {i > 0 && <span>,</span>} <span className="font-medium text-foreground">{domain}</span> ({count})
                            </span>
                          ))}
                      </div>

                      {/* Links list */}
                      {projectSources.slice(0, 200).map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate max-w-[240px]"
                              title={s.title || s.url}
                            >
                              {s.title || s.url}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-[10px]">{s.domain}</Badge>
                            {s.citation_count > 0 && (
                              <Badge variant="outline" className="text-[10px]">Citations: {s.citation_count}</Badge>
                            )}
                            {s.occurrence_count > 0 && (
                              <Badge variant="outline" className="text-[10px]">Mentions: {s.occurrence_count}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredResults.length} of {analysisResults.length} results
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-lg border overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('platform')} className="h-auto p-0 font-medium">
                    PROMPT
                    {sortField === 'platform' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] text-center">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('rank')} className="h-auto p-0 font-medium">
                    RANK
                    {sortField === 'rank' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[180px]">COMPETITORS</TableHead>
                <TableHead className="w-[180px]">SOURCES</TableHead>
                <TableHead className="w-[120px] text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => {
                const sources = extractSources(result.raw_response);
                const isExpanded = expandedRows.has(result.id);
                
                return (
                  <React.Fragment key={result.id}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell className="py-4">
                        <div className="space-y-2">
                          <div className="flex items-start gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(result.id)}
                              className="h-6 w-6 p-0 flex-shrink-0 mt-1"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-snug text-foreground line-clamp-2">
                                {result.query_text}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {formatPlatformName(result.ai_platform)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(result.analysis_date)}
                                </span>
                              </div>
                            </div>
                          </div>
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
                            <div className="space-y-1">
                              {sources.slice(0, 5).map((source: any, i: number) => (
                                <div key={i} className="flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <a 
                                    href={source.url || source.link || source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline truncate max-w-[140px]"
                                    title={source.title || source.url || source.link || source}
                                  >
                                    {source.title || source.url || source.link || source}
                                  </a>
                                </div>
                              ))}
                              {sources.length > 5 && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button className="text-xs text-primary hover:underline">
                                      View all {sources.length}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-xl">
                                    <DialogHeader>
                                      <DialogTitle>All Sources ({sources.length})</DialogTitle>
                                    </DialogHeader>
                                    <ScrollArea className="max-h-[60vh]">
                                      <div className="space-y-2">
                                        {sources.map((s: any, idx: number) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                            <a
                                              href={s.url || s.link || s}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-primary hover:underline truncate max-w-[360px]"
                                              title={s.title || s.url || s.link || s}
                                            >
                                              {s.title || s.url || s.link || s}
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          ) : (
                            projectSources.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="text-xs text-primary hover:underline">
                                    View project sources ({projectSources.length})
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Project Sources ({projectSources.length})</DialogTitle>
                                  </DialogHeader>
                                  <ScrollArea className="max-h-[60vh]">
                                    <div className="space-y-2">
                                      {projectSources.slice(0, 100).map((s) => (
                                        <div key={s.id} className="flex items-center gap-2">
                                          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                          <a
                                            href={s.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline truncate max-w-[240px]"
                                            title={s.title || s.url}
                                          >
                                            {s.title || s.url}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-xs text-muted-foreground">No sources</span>
                            )
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Dialog>
                              <DialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Response
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="max-w-5xl max-h-[90vh] w-[90vw]">
                                <DialogHeader>
                                  <DialogTitle>AI Response Details</DialogTitle>
                                  <DialogDescription>
                                    {formatPlatformName(result.ai_platform)} • {formatDate(result.analysis_date)}
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-4 bg-muted/30">
                          <div className="space-y-3">
                            {result.mention_context && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Context</h5>
                                <p className="text-sm text-muted-foreground">{result.mention_context}</p>
                              </div>
                            )}
                            {result.raw_response?.content && (
                              <div>
                                <h5 className="text-sm font-medium mb-1">Response Preview</h5>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {result.raw_response.content.substring(0, 300)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};