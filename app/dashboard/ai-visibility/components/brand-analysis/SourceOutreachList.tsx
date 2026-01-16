"use client";
import React, { useState, useMemo } from "react";
import Card, CardDescription } from "@/components/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { 
  Mail, 
  MoreHorizontal, 
  ExternalLink, 
  Search, 
  Filter, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Trash2,
  Edit,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { 
  SourceOutreachCampaign, 
  useSourceOutreachCampaigns, 
  useUpdateOutreachCampaign,
  useDeleteOutreachCampaign,
} from "@/hooks/useSourceOutreachCampaigns";
import { SourceOutreachDialog } from "./SourceOutreachDialog";
import { FollowUpDialog } from "./FollowUpDialog";
import { LogResponseDialog } from "./LogResponseDialog";
import { OutreachAnalytics } from "./OutreachAnalytics";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } import toast from "react-hot-toast";

interface SourceOutreachListProps {
  projectId: string;
  brandName: string;
  brandWebsite: string;
  brandDescription: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: "Not Started", icon: <Clock className="h-3 w-3" />, variant: "outline" },
  researched: { label: "Researched", icon: <Search className="h-3 w-3" />, variant: "secondary" },
  draft_ready: { label: "Draft Ready", icon: <Edit className="h-3 w-3" />, variant: "secondary" },
  sent: { label: "Sent", icon: <Send className="h-3 w-3" />, variant: "default" },
  opened: { label: "Opened", icon: <Mail className="h-3 w-3" />, variant: "default" },
  replied: { label: "Replied", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  success: { label: "Success", icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
  declined: { label: "Declined", icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
  follow_up: { label: "Follow Up", icon: <RefreshCw className="h-3 w-3" />, variant: "secondary" },
};

export const SourceOutreachList: React.FC<SourceOutreachListProps> = ({
  projectId,
  brandName,
  brandWebsite,
  brandDescription,
}) => {
  const { data: campaigns = [], isLoading } = useSourceOutreachCampaigns(projectId);
  const updateCampaign = useUpdateOutreachCampaign();
  const deleteCampaign = useDeleteOutreachCampaign();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<SourceOutreachCampaign | null>(null);
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpCampaign, setFollowUpCampaign] = useState<SourceOutreachCampaign | null>(null);
  const [showLogResponseDialog, setShowLogResponseDialog] = useState(false);
  const [logResponseCampaign, setLogResponseCampaign] = useState<SourceOutreachCampaign | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const { toast } = useToast();

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        !search ||
        c.source_url.toLowerCase().includes(search.toLowerCase()) ||
        c.source_domain.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || c.outreach_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const researched = campaigns.filter((c) => c.source_analysis && Object.keys(c.source_analysis).length > 0).length;
    const sent = campaigns.filter((c) => ["sent", "opened", "replied", "success"].includes(c.outreach_status)).length;
    const opened = campaigns.filter((c) => ["opened", "replied", "success"].includes(c.outreach_status)).length;
    const replied = campaigns.filter((c) => ["replied", "success"].includes(c.outreach_status)).length;
    const success = campaigns.filter((c) => c.outreach_status === "success").length;
    const pending = campaigns.filter((c) => ["not_started", "researched", "draft_ready"].includes(c.outreach_status)).length;
    const followUp = campaigns.filter((c) => c.outreach_status === "follow_up").length;

    // Calculate response time (average days between sent_at and replied/success)
    const respondedCampaigns = campaigns.filter(
      (c) => ["replied", "success"].includes(c.outreach_status) && c.sent_at
    );
    let avgResponseTime = 0;
    if (respondedCampaigns.length > 0) {
      const totalDays = respondedCampaigns.reduce((acc, c) => {
        const sentDate = new Date(c.sent_at!);
        const responseDate = new Date(c.updated_at);
        return acc + (responseDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResponseTime = totalDays / respondedCampaigns.length;
    }

    return {
      total,
      researched,
      sent,
      opened,
      replied,
      success,
      pending,
      followUp,
      responseRate: sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0",
      successRate: sent > 0 ? ((success / sent) * 100).toFixed(1) : "0",
      avgResponseTime: avgResponseTime > 0 ? avgResponseTime.toFixed(1) : "—",
    };
  }, [campaigns]);

  const handleOpenOutreach = (campaign: SourceOutreachCampaign) => {
    setSelectedCampaign(campaign);
    setShowOutreachDialog(true);
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    await updateCampaign.mutateAsync({
      id: campaignId,
      updates: { outreach_status: newStatus },
    });
  };

  const handleDelete = async (campaignId: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      await deleteCampaign.mutateAsync(campaignId);
    }
  };

  const handleOpenFollowUp = (campaign: SourceOutreachCampaign) => {
    setFollowUpCampaign(campaign);
    setShowFollowUpDialog(true);
  };

  const handleSetFollowUp = async (date: Date, notes?: string) => {
    if (!followUpCampaign) return;

    try {
      await updateCampaign.mutateAsync({
        id: followUpCampaign.id,
        updates: {
          outreach_status: "follow_up",
          follow_up_at: date.toISOString(),
          notes: notes || followUpCampaign.notes,
        },
      });
      toast({ title: "Follow-up scheduled", description: `Reminder set for ${format(date, "PPP")}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to set follow-up", variant: "destructive" });
    }
    setShowFollowUpDialog(false);
    setFollowUpCampaign(null);
  };

  const handleOpenLogResponse = (campaign: SourceOutreachCampaign) => {
    setLogResponseCampaign(campaign);
    setShowLogResponseDialog(true);
  };

  const handleLogResponse = async (data: { summary: string; outcome: string; notes: string }) => {
    if (!logResponseCampaign) return;

    // Map outcome to status
    const statusMap: Record<string, string> = {
      interested: "replied",
      not_interested: "declined",
      needs_info: "replied",
      success: "success",
    };

    try {
      await updateCampaign.mutateAsync({
        id: logResponseCampaign.id,
        updates: {
          outreach_status: statusMap[data.outcome] || "replied",
          response_summary: data.summary,
          response_outcome: data.outcome as 'interested' | 'not_interested' | 'needs_info' | 'success' | 'no_response',
          response_logged_at: new Date().toISOString(),
          notes: data.notes 
            ? `${logResponseCampaign.notes ? logResponseCampaign.notes + "\n\n" : ""}${data.notes}`
            : logResponseCampaign.notes,
        },
      });
      toast({ 
        title: "Response logged", 
        description: `Campaign marked as ${statusMap[data.outcome] || "replied"}` 
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to log response", variant: "destructive" });
    }
    setShowLogResponseDialog(false);
    setLogResponseCampaign(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Outreach Pipeline
              </CardTitle>
              <CardDescription>Track and manage your source outreach campaigns</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.researched}</div>
                <div className="text-xs text-muted-foreground">Researched</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.sent}</div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.replied}</div>
                <div className="text-xs text-muted-foreground">Replied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-xs text-muted-foreground">Success</div>
              </div>
              <div className="border-l pl-4 text-center">
                <div className="text-2xl font-bold">{stats.responseRate}%</div>
                <div className="text-xs text-muted-foreground">Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
                <div className="text-xs text-muted-foreground">Avg. Days to Reply</div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                {showAnalytics ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Analytics Section (Collapsible) */}
        {showAnalytics && (
          <div className="px-6 pb-4">
            <OutreachAnalytics campaigns={campaigns} />
          </div>
        )}

        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {campaigns.length === 0
                ? "No outreach campaigns yet. Research a source to get started."
                : "No campaigns match your filters."}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const status = statusConfig[campaign.outreach_status] || statusConfig.not_started;

                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium truncate max-w-[200px]">
                                {campaign.source_title || campaign.source_domain}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {campaign.source_domain}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign.contact_email ? (
                            <div>
                              <div className="text-sm">{campaign.contact_name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{campaign.contact_email}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No contact</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                                    {status.icon}
                                    {status.label}
                                  </Badge>
                                  {campaign.outreach_status === "follow_up" && campaign.follow_up_at && (
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(campaign.follow_up_at), "MMM d")}
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              {campaign.follow_up_at && campaign.outreach_status === "follow_up" && (
                                <TooltipContent>
                                  <p>Follow-up scheduled: {format(new Date(campaign.follow_up_at), "PPP")}</p>
                                  {campaign.notes && <p className="text-xs text-muted-foreground mt-1">{campaign.notes}</p>}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {campaign.outreach_type ? (
                            <Badge variant="outline" className="text-xs">
                              {campaign.outreach_type.replace(/_/g, " ")}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(campaign.updated_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenOutreach(campaign)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Compose Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(campaign.source_url, "_blank")}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Source
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenLogResponse(campaign)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Log Response
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, "success")}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Success
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(campaign.id, "replied")}>
                                <Mail className="h-4 w-4 mr-2" />
                                Mark as Replied
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenFollowUp(campaign)}>
                                <Calendar className="h-4 w-4 mr-2" />
                                Set Follow-up
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(campaign.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SourceOutreachDialog
        open={showOutreachDialog}
        onOpenChange={setShowOutreachDialog}
        campaign={selectedCampaign}
        brandName={brandName}
        brandWebsite={brandWebsite}
        brandDescription={brandDescription}
      />

      <FollowUpDialog
        open={showFollowUpDialog}
        onOpenChange={setShowFollowUpDialog}
        onConfirm={handleSetFollowUp}
        isLoading={updateCampaign.isPending}
        sourceName={followUpCampaign?.source_title || followUpCampaign?.source_domain}
      />

      <LogResponseDialog
        open={showLogResponseDialog}
        onOpenChange={setShowLogResponseDialog}
        onConfirm={handleLogResponse}
        isLoading={updateCampaign.isPending}
        sourceName={logResponseCampaign?.source_title || logResponseCampaign?.source_domain}
      />
    </>
  );
};

export default SourceOutreachList;
