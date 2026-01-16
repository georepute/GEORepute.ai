"use client";
import React, { useMemo, useState } from "react";
import Card } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ExternalLink, MoreHorizontal, Search, Mail, Send, Loader2, CheckCircle } from "lucide-react";
import { useBrandAnalysisSources, BrandAnalysisSource } from "@/hooks/useBrandAnalysisSources";
import { BrandMentionAnalysis } from "@/hooks/useBrandAnalysisResults";
import { DateRange } from "react-day-picker";
import { 
  useSourceOutreachCampaigns, 
  useCreateOutreachCampaign, 
  useAnalyzeSource,
  SourceOutreachCampaign,
} from "@/hooks/useSourceOutreachCampaigns";
import { SourceOutreachDialog } from "./SourceOutreachDialog";
import { SourceOutreachList } from "./SourceOutreachList";

interface SourcesTableProps {
  projectId: string;
  analysisResults?: BrandMentionAnalysis[];
  brandName?: string;
  brandWebsite?: string;
  brandDescription?: string;
  competitors?: string[];
}

export const SourcesTable: React.FC<SourcesTableProps> = ({ 
  projectId, 
  analysisResults = [],
  brandName = "",
  brandWebsite = "",
  brandDescription = "",
  competitors = [],
}) => {
  const { data: sources = [], isLoading } = useBrandAnalysisSources(projectId);
  const { data: outreachCampaigns = [] } = useSourceOutreachCampaigns(projectId);
  const createCampaign = useCreateOutreachCampaign();
  const analyzeSource = useAnalyzeSource();
  
  const [openFor, setOpenFor] = useState<BrandAnalysisSource | null>(null);
  const [useDerived, setUseDerived] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [excludeSearchEngines, setExcludeSearchEngines] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("sources");
  const [researchingSource, setResearchingSource] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<SourceOutreachCampaign | null>(null);
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);
  const { toast } = useToast();

  // Map source URLs to their outreach campaign status
  const outreachStatusMap = useMemo(() => {
    const map = new Map<string, SourceOutreachCampaign>();
    outreachCampaigns.forEach((c) => map.set(c.source_url, c));
    return map;
  }, [outreachCampaigns]);

  // Exclude search engines by default
  const excludeDomains = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'baidu.', 'yandex.'];

  const sorted = useMemo(() => {
    return [...sources].sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0) || (b.occurrence_count || 0) - (a.occurrence_count || 0));
  }, [sources]);

  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    analysisResults.forEach(r => r.ai_platform && set.add(r.ai_platform));
    sources.forEach(s => (s.platforms || []).forEach(p => set.add(p)));
    return Array.from(set);
  }, [analysisResults, sources]);

  const derivedSources: BrandAnalysisSource[] = useMemo(() => {
    const nor = (u: string) => u?.replace(/https?:\/\//i, '').replace(/www\./i, '').replace(/#.*$/, '').trim();
    // using global excludeDomains
    const map = new Map<string, BrandAnalysisSource>();
    analysisResults.forEach((r) => {
      const arr = (r?.raw_response?.sources || []) as any[];
      arr.forEach((s: any) => {
        const val = typeof s === 'string' ? s : (s?.url || s?.link || '');
        if (!val) return;
        const urlStr = val.toString();
        const host = (() => {
          try { return new URL(urlStr).hostname; } catch { return (urlStr.split('/')[0] || ''); }
        })().toLowerCase();
        if (!host || excludeDomains.some(ed => host.includes(ed))) return;
        const key = nor(urlStr);
        const existing = map.get(key);
        const platform = (r as any).ai_platform || 'unknown';
        if (existing) {
          existing.citation_count = (existing.citation_count || 0) + 1;
          const set = new Set([...(existing.platforms || []), platform]);
          existing.platforms = Array.from(set);
          existing.last_seen_at = new Date(Math.max(new Date(existing.last_seen_at).getTime(), new Date(r.analysis_date).getTime())).toISOString();
          existing.occurrence_count = Math.max(existing.occurrence_count || 0, 1);
        } else {
          map.set(key, {
            id: `derived-${map.size + 1}`,
            project_id: projectId,
            session_id: null,
            platforms: platform ? [platform] : [],
            url: urlStr,
            domain: host,
            title: null,
            occurrence_count: 1,
            citation_count: 1,
            metadata: {},
            first_seen_at: new Date(r.analysis_date).toISOString?.() || new Date().toISOString(),
            last_seen_at: new Date(r.analysis_date).toISOString?.() || new Date().toISOString(),
          } as BrandAnalysisSource);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
  }, [analysisResults, projectId]);

  const showDerived = useDerived || (sorted.length < 10 && analysisResults.length > 0);
  const baseSources = showDerived ? derivedSources : sorted;
  const displayed = baseSources
    .filter(s => (excludeSearchEngines ? !excludeDomains.some(ed => s.domain?.toLowerCase().includes(ed)) : true))
    .filter(s => (platformFilter === 'all' ? true : (s.platforms || []).includes(platformFilter)))
    .filter(s => {
      if (!search) return true;
      const t = (s.title || '').toLowerCase();
      const u = (s.url || '').toLowerCase();
      const d = (s.domain || '').toLowerCase();
      const q = search.toLowerCase();
      return t.includes(q) || u.includes(q) || d.includes(q);
    })
    .filter(s => {
      if (!dateRange?.from && !dateRange?.to) return true;
      const ts = new Date(s.last_seen_at).getTime();
      const from = dateRange?.from ? new Date(dateRange.from).getTime() : -Infinity;
      const to = dateRange?.to ? new Date(dateRange.to).getTime() : Infinity;
      return ts >= from && ts <= to;
    });

  const findMatchingResults = (src: BrandAnalysisSource) => {
    const norm = (u: string) => u.replace(/https?:\/\//i, '').replace(/www\./i, '').replace(/#.*$/, '').toLowerCase();
    const u = norm(src.url);
    const d = src.domain?.toLowerCase();
    return analysisResults.filter(r => {
      const content = r.raw_response?.content || '';
      const hasInText = typeof content === 'string' && (content.includes(src.url) || content.toLowerCase().includes(d));
      const arr = (r.raw_response?.sources || []) as any[];
      const hasInMeta = Array.isArray(arr) && arr.some((s) => {
        const val = (typeof s === 'string') ? s : (s?.url || s?.link || '');
        return val && norm(val).includes(u);
      });
      return hasInText || hasInMeta;
    });
  };

  // Build a flat list of citation occurrences (one entry per citation),
  // so the count matches what users expect in the table.
  const getCitationsForSource = (src: BrandAnalysisSource) => {
    const norm = (u: string) => u?.replace(/https?:\/\//i, '').replace(/www\./i, '').replace(/#.*$/, '').trim().toLowerCase();
    const targetUrl = norm(src.url);
    const targetDomain = (src.domain || '').toLowerCase();
    const citations: Array<{ id: string; ai_platform: string; analysis_date: string; query_text?: string; raw_response?: any; matched_url?: string }>
      = [];

    analysisResults.forEach((r) => {
      const arr = (r.raw_response?.sources || []) as any[];
      if (Array.isArray(arr) && arr.length > 0) {
        arr.forEach((s) => {
          const val = typeof s === 'string' ? s : (s?.url || s?.link || '');
          if (!val) return;
          const nv = norm(val);
          if ((targetUrl && nv.includes(targetUrl)) || (targetDomain && nv.includes(targetDomain))) {
            citations.push({
              id: `${r.id}-${citations.length}`,
              ai_platform: r.ai_platform,
              analysis_date: r.analysis_date,
              query_text: r.query_text,
              raw_response: r.raw_response,
              matched_url: val,
            });
          }
        });
      } else {
        // Fallback: match by content when structured sources missing
        const content = r.raw_response?.content || '';
        if (typeof content === 'string' && ((targetUrl && content.toLowerCase().includes(targetUrl)) || (targetDomain && content.toLowerCase().includes(targetDomain)))) {
          citations.push({
            id: `${r.id}-${citations.length}`,
            ai_platform: r.ai_platform,
            analysis_date: r.analysis_date,
            query_text: r.query_text,
            raw_response: r.raw_response,
          });
        }
      }
    });

    return citations;
  };

  // Get citing prompts for a source
  const getCitingPrompts = (src: BrandAnalysisSource) => {
    const citations = getCitationsForSource(src);
    return [...new Set(citations.map(c => c.query_text).filter(Boolean))];
  };

  // Handle research button click
  const handleResearchSource = async (source: BrandAnalysisSource) => {
    if (!brandName) {
      toast({ title: "Missing brand info", description: "Please configure your brand name in project settings", variant: "destructive" });
      return;
    }

    setResearchingSource(source.id);
    try {
      const citingPrompts = getCitingPrompts(source);
      
      const result = await analyzeSource.mutateAsync({
        sourceUrl: source.url,
        projectId,
        competitors,
        brandName,
        citingPrompts,
      });

      // Create outreach campaign with the analysis results
      await createCampaign.mutateAsync({
        project_id: projectId,
        source_id: source.id,
        source_url: source.url,
        source_domain: source.domain,
        source_title: result.pageTitle || source.title,
        contact_email: result.contact?.email,
        contact_name: result.contact?.name,
        contact_role: result.contact?.role,
        social_links: result.contact?.socialLinks || {},
        source_analysis: result.analysis,
        competitors_mentioned: result.analysis?.competitorMentions?.map((m: any) => m.competitor) || [],
        citing_prompts: citingPrompts,
        outreach_status: "researched",
        researched_at: new Date().toISOString(),
      });

      toast({ title: "Research complete", description: "Source has been analyzed and added to outreach pipeline" });
    } catch (error: any) {
      toast({ title: "Research failed", description: error.message, variant: "destructive" });
    } finally {
      setResearchingSource(null);
    }
  };

  // Handle outreach button click
  const handleOpenOutreach = (source: BrandAnalysisSource) => {
    const campaign = outreachStatusMap.get(source.url);
    if (campaign) {
      setSelectedCampaign(campaign);
      setShowOutreachDialog(true);
    } else {
      // Need to research first
      handleResearchSource(source);
    }
  };

  // Get outreach status badge for a source
  const getOutreachStatusBadge = (source: BrandAnalysisSource) => {
    const campaign = outreachStatusMap.get(source.url);
    if (!campaign) return null;

    const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      not_started: { label: "—", variant: "outline" },
      researched: { label: "Researched", variant: "secondary" },
      draft_ready: { label: "Draft", variant: "secondary" },
      sent: { label: "Sent", variant: "default" },
      opened: { label: "Opened", variant: "default" },
      replied: { label: "Replied", variant: "default" },
      success: { label: "Success", variant: "default" },
      declined: { label: "Declined", variant: "destructive" },
      follow_up: { label: "Follow Up", variant: "secondary" },
    };

    const status = statusLabels[campaign.outreach_status] || statusLabels.not_started;
    return <Badge variant={status.variant} className="text-xs">{status.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Sources</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{displayed.length} sources</Badge>
            {analysisResults.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setUseDerived(!useDerived)}>
                {showDerived ? 'Show All Sessions (DB)' : 'Show Current Run'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabs for Sources vs Outreach Pipeline */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="outreach" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Outreach Pipeline
              {outreachCampaigns.length > 0 && (
                <Badge variant="secondary" className="text-xs ml-1">{outreachCampaigns.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sources">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading sources...</div>
            ) : displayed.length === 0 ? (
              <div className="text-sm text-muted-foreground">No sources found yet</div>
            ) : (
              <>
                <div className="rounded-lg border overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[60px]">Rank</TableHead>
                        <TableHead>Source URL</TableHead>
                        <TableHead className="w-[180px]">Cited By</TableHead>
                        <TableHead className="w-[100px]">Citations</TableHead>
                        <TableHead className="w-[100px]">Outreach</TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayed.slice(0, visibleCount).map((s, idx) => {
                        const campaign = outreachStatusMap.get(s.url);
                        const isResearching = researchingSource === s.id;
                        
                        return (
                          <TableRow key={s.id} className="hover:bg-muted/50">
                            <TableCell className="font-semibold">#{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block max-w-[300px]" title={s.title || s.url}>
                                  {s.title || s.url}
                                </a>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(s.platforms || []).slice(0, 3).map((p) => (
                                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getCitationsForSource(s).length}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getOutreachStatusBadge(s) || <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setOpenFor(s)}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View Prompts
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {!campaign ? (
                                    <DropdownMenuItem 
                                      onClick={() => handleResearchSource(s)}
                                      disabled={isResearching}
                                    >
                                      {isResearching ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Search className="h-4 w-4 mr-2" />
                                      )}
                                      Research Source
                                    </DropdownMenuItem>
                                  ) : (
                                    <>
                                      <DropdownMenuItem onClick={() => handleOpenOutreach(s)}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Compose Outreach
                                      </DropdownMenuItem>
                                      {campaign.outreach_status === "sent" && (
                                        <DropdownMenuItem>
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Mark as Success
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {displayed.length > visibleCount && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={() => setVisibleCount((c) => c + 50)}>
                      Load more ({Math.min(displayed.length - visibleCount, 50)} of {displayed.length} more)
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="outreach">
            <SourceOutreachList
              projectId={projectId}
              brandName={brandName}
              brandWebsite={brandWebsite}
              brandDescription={brandDescription}
            />
          </TabsContent>
        </Tabs>

        {/* View Prompts Dialog */}
        <Dialog open={!!openFor} onOpenChange={(v) => !v && setOpenFor(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Prompts citing this source</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-3">
                {openFor && getCitationsForSource(openFor).map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{c.ai_platform}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(c.analysis_date).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-medium">{c.query_text}</div>
                    {c.matched_url && (
                      <div className="mt-1 text-xs text-muted-foreground">Matched: {c.matched_url}</div>
                    )}
                    {c.raw_response?.content && (
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-3">{c.raw_response.content}</div>
                    )}
                  </div>
                ))}
                {openFor && getCitationsForSource(openFor).length === 0 && (
                  <div className="text-sm text-muted-foreground">No citations matched in current data.</div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Outreach Dialog */}
        <SourceOutreachDialog
          open={showOutreachDialog}
          onOpenChange={setShowOutreachDialog}
          campaign={selectedCampaign}
          brandName={brandName}
          brandWebsite={brandWebsite}
          brandDescription={brandDescription}
        />
      </CardContent>
    </Card>
  );
};

export default SourcesTable;
