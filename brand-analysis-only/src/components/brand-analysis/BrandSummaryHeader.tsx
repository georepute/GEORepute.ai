import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import type { WebsiteMetadata } from "@/hooks/useWebsiteMetadata";
import type { BrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import type { BrandSummaryResponse } from "@/hooks/useBrandSummary";
import { useFavicon, getFaviconUrl } from "@/utils/faviconUtils";

interface Props {
  project: BrandAnalysisProject;
  websiteMetadata?: WebsiteMetadata;
  summary?: BrandSummaryResponse | null;
  loading?: boolean;
}

export const BrandSummaryHeader: React.FC<Props> = ({ project, websiteMetadata, summary, loading }) => {
  const [expanded, setExpanded] = useState(false);
  const { favicon: fetchedFavicon } = useFavicon(project.website_url);
  const data = summary?.summary;
  
  // Use fetched favicon, or immediate Google favicon URL, or summary favicon
  const favicon = fetchedFavicon || getFaviconUrl(project.website_url) || summary?.favicon;

  const overview = data?.overview || websiteMetadata?.description || '';
  
  // Keep original 8 fields as before
  const sections = [
    { title: 'Overview', content: overview },
    { title: 'Industry', content: data?.industry || project.industry || '' },
    { title: 'Clients', content: data?.typical_clients || '' },
    { title: 'Business Model Summary', content: data?.business_model || '' },
    { title: 'Key Offerings', content: data?.key_offerings || '' },
    { title: 'Brand Essence', content: data?.brand_essence || '' },
    { title: 'Founded', content: data?.founded_year || '' },
    { title: 'Headquarters', content: data?.headquarters || '' },
  ].filter(s => s.content && s.content !== 'unknown');
  const shortOverview = overview.slice(0, 420) + (overview.length > 420 ? "…" : "");
  const canExpand = overview.length > 420 || sections.length > 1;

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 ring-1 ring-border">
            {favicon ? (
              <AvatarImage src={favicon} alt={`${project.brand_name} favicon`} />
            ) : (
              <AvatarFallback>{project.brand_name?.slice(0,2)?.toUpperCase() || 'BR'}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold truncate">{project.brand_name}</h2>
              {project.industry && <Badge variant="outline">{project.industry}</Badge>}
              {project.website_url && (
                <a href={project.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                  <Globe className="h-3.5 w-3.5 mr-1" />
                  {new URL(project.website_url).hostname}
                </a>
              )}
            </div>
            <div className="mt-2 text-sm">
              {loading ? (
                <div className="animate-pulse space-y-2 text-muted-foreground">
                  <div className="h-4 bg-muted rounded w-11/12" />
                  <div className="h-4 bg-muted rounded w-9/12" />
                </div>
              ) : sections.length > 0 ? (
                expanded ? (
                  <div className="space-y-4">
                    {sections.map((sec, idx) => (
                      <section key={idx}>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{sec.title}</div>
                        <p className="text-sm text-foreground mt-0.5">{sec.content}</p>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{shortOverview || 'No brand summary available yet.'}</p>
                )
              ) : (
                <p className="text-muted-foreground">{websiteMetadata?.description || 'No brand summary available yet.'}</p>
              )}
            </div>
            {canExpand && (
              <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setExpanded(v => !v)}>
                {expanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {project.last_analysis_at && (
              <span className="text-xs text-muted-foreground">Updated {new Date(project.last_analysis_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
