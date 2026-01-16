"use client";
import React, { useState, useMemo } from "react";
import Card, CardDescription } from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Calendar,
  MoreHorizontal,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Eye,
  AlertCircle,
  Inbox,
  ArrowRight,
} from "lucide-react";
import {
  SourceOutreachCampaign,
  useAllOutreachCampaigns,
  useUpdateOutreachCampaign,
  useAllOutreachStats,
} from "@/hooks/useSourceOutreachCampaigns";
import { FollowUpDialog } from "./FollowUpDialog";
import { LogResponseDialog } from "./LogResponseDialog";
import { formatDistanceToNow, format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { useToast } import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "pending" | "responded" | "success" | "follow_up" | "overdue";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  not_started: { label: "Not Started", icon: <Clock className="h-3 w-3" />, color: "text-muted-foreground" },
  researched: { label: "Researched", icon: <Search className="h-3 w-3" />, color: "text-blue-500" },
  draft_ready: { label: "Draft Ready", icon: <Mail className="h-3 w-3" />, color: "text-blue-600" },
  sent: { label: "Sent", icon: <Send className="h-3 w-3" />, color: "text-primary" },
  opened: { label: "Opened", icon: <Eye className="h-3 w-3" />, color: "text-amber-500" },
  replied: { label: "Replied", icon: <MessageSquare className="h-3 w-3" />, color: "text-green-500" },
  success: { label: "Success", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-600" },
  declined: { label: "Declined", icon: <XCircle className="h-3 w-3" />, color: "text-destructive" },
  follow_up: { label: "Follow Up", icon: <RefreshCw className="h-3 w-3" />, color: "text-amber-600" },
};

interface TimelineEvent {
  type: string;
  date: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function buildTimeline(campaign: SourceOutreachCampaign): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    type: "created",
    date: campaign.created_at,
    label: "Campaign created",
    icon: <Inbox className="h-3 w-3" />,
    color: "text-muted-foreground",
  });

  if (campaign.researched_at) {
    events.push({
      type: "researched",
      date: campaign.researched_at,
      label: "Source researched",
      icon: <Search className="h-3 w-3" />,
      color: "text-blue-500",
    });
  }

  if (campaign.sent_at) {
    events.push({
      type: "sent",
      date: campaign.sent_at,
      label: "Email sent",
      icon: <Send className="h-3 w-3" />,
      color: "text-primary",
    });
  }

  if (campaign.opened_at) {
    events.push({
      type: "opened",
      date: campaign.opened_at,
      label: "Email opened",
      icon: <Eye className="h-3 w-3" />,
      color: "text-amber-500",
    });
  }

  if (campaign.replied_at) {
    events.push({
      type: "replied",
      date: campaign.replied_at,
      label: "Received reply",
      icon: <MessageSquare className="h-3 w-3" />,
      color: "text-green-500",
    });
  }

  if (campaign.response_logged_at && campaign.response_outcome) {
    const outcomeLabels: Record<string, string> = {
      interested: "Marked as interested",
      not_interested: "Marked as not interested",
      needs_info: "Needs more info",
      success: "Marked as success",
      no_response: "No response",
    };
    events.push({
      type: "response_logged",
      date: campaign.response_logged_at,
      label: outcomeLabels[campaign.response_outcome] || "Response logged",
      icon: campaign.response_outcome === "success" ? <CheckCircle className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />,
      color: campaign.response_outcome === "success" ? "text-green-600" : "text-muted-foreground",
    });
  }

  if (campaign.follow_up_at) {
    const isOverdue = isPast(new Date(campaign.follow_up_at)) && campaign.outreach_status === "follow_up";
    events.push({
      type: "follow_up",
      date: campaign.follow_up_at,
      label: isOverdue ? "Follow-up overdue" : "Follow-up scheduled",
      icon: isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />,
      color: isOverdue ? "text-destructive" : "text-amber-600",
    });
  }

  // Sort by date descending (most recent first)
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getFollowUpLabel(date: Date): string {
  if (isPast(date)) return "Overdue";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const days = differenceInDays(date, new Date());
  if (days <= 7) return `In ${days} days`;
  return format(date, "MMM d");
}

export const OutreachInbox: React.FC = () => {
  const { data: campaigns = [], isLoading } = useAllOutreachCampaigns();
  const { data: stats } = useAllOutreachStats();
  const updateCampaign = useUpdateOutreachCampaign();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showLogResponseDialog, setShowLogResponseDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<SourceOutreachCampaign | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Search filter
      const matchesSearch =
        !search ||
        c.source_url.toLowerCase().includes(search.toLowerCase()) ||
        c.source_domain.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.source_title?.toLowerCase().includes(search.toLowerCase());

      // Tab filter
      let matchesTab = true;
      switch (activeTab) {
        case "pending":
          matchesTab = ["sent", "opened"].includes(c.outreach_status);
          break;
        case "responded":
          matchesTab = ["replied"].includes(c.outreach_status);
          break;
        case "success":
          matchesTab = c.outreach_status === "success";
          break;
        case "follow_up":
          matchesTab = c.outreach_status === "follow_up" || (c.follow_up_at !== null && c.outreach_status !== "success" && c.outreach_status !== "declined");
          break;
        case "overdue":
          matchesTab = c.follow_up_at !== null && isPast(new Date(c.follow_up_at)) && !["success", "declined"].includes(c.outreach_status);
          break;
      }

      return matchesSearch && matchesTab;
    });
  }, [campaigns, search, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = { all: 0, pending: 0, responded: 0, success: 0, follow_up: 0, overdue: 0 };
    campaigns.forEach((c) => {
      counts.all++;
      if (["sent", "opened"].includes(c.outreach_status)) counts.pending++;
      if (c.outreach_status === "replied") counts.responded++;
      if (c.outreach_status === "success") counts.success++;
      if (c.outreach_status === "follow_up" || (c.follow_up_at && !["success", "declined"].includes(c.outreach_status))) counts.follow_up++;
      if (c.follow_up_at && isPast(new Date(c.follow_up_at)) && !["success", "declined"].includes(c.outreach_status)) counts.overdue++;
    });
    return counts;
  }, [campaigns]);

  const handleSetFollowUp = async (date: Date, notes?: string) => {
    if (!selectedCampaign) return;
    try {
      await updateCampaign.mutateAsync({
        id: selectedCampaign.id,
        updates: {
          outreach_status: "follow_up",
          follow_up_at: date.toISOString(),
          notes: notes || selectedCampaign.notes,
        },
      });
      toast({ title: "Follow-up scheduled", description: `Reminder set for ${format(date, "PPP")}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to set follow-up", variant: "destructive" });
    }
    setShowFollowUpDialog(false);
    setSelectedCampaign(null);
  };

  const handleLogResponse = async (data: { summary: string; outcome: string; notes: string }) => {
    if (!selectedCampaign) return;
    const statusMap: Record<string, string> = {
      interested: "replied",
      not_interested: "declined",
      needs_info: "replied",
      success: "success",
    };
    try {
      await updateCampaign.mutateAsync({
        id: selectedCampaign.id,
        updates: {
          outreach_status: statusMap[data.outcome] || "replied",
          response_summary: data.summary,
          response_outcome: data.outcome as any,
          response_logged_at: new Date().toISOString(),
          replied_at: new Date().toISOString(),
          notes: data.notes
            ? `${selectedCampaign.notes ? selectedCampaign.notes + "\n\n" : ""}${data.notes}`
            : selectedCampaign.notes,
        },
      });
      toast({ title: "Response logged", description: `Campaign marked as ${statusMap[data.outcome] || "replied"}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to log response", variant: "destructive" });
    }
    setShowLogResponseDialog(false);
    setSelectedCampaign(null);
  };

  const handleMarkSent = async (campaign: SourceOutreachCampaign) => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      updates: { outreach_status: "sent", sent_at: new Date().toISOString() },
    });
    toast({ title: "Marked as sent" });
  };

  const handleSendFollowUp = (campaign: SourceOutreachCampaign) => {
    // Open email client with follow-up
    const subject = `Following up: ${campaign.email_subject || campaign.source_title || "Our previous conversation"}`;
    const body = `Hi${campaign.contact_name ? ` ${campaign.contact_name}` : ""},\n\nI wanted to follow up on my previous email regarding ${campaign.source_title || campaign.source_domain}.\n\nBest regards`;
    window.open(`mailto:${campaign.contact_email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Outreach Inbox
              </CardTitle>
              <CardDescription>Unified view of all your outreach activity</CardDescription>
            </div>
            {stats && (
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{stats.sent}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{stats.responseRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Response</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{stats.success}</div>
                  <div className="text-xs text-muted-foreground">Success</div>
                </div>
                {stats.pendingFollowUps > 0 && (
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-600">{stats.pendingFollowUps}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Tabs */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full md:w-auto">
                <TabsTrigger value="all" className="text-xs">
                  All ({tabCounts.all})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">
                  Pending ({tabCounts.pending})
                </TabsTrigger>
                <TabsTrigger value="responded" className="text-xs">
                  Responded ({tabCounts.responded})
                </TabsTrigger>
                <TabsTrigger value="success" className="text-xs">
                  Success ({tabCounts.success})
                </TabsTrigger>
                <TabsTrigger value="follow_up" className="text-xs">
                  Follow-Up ({tabCounts.follow_up})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-xs text-destructive">
                  Overdue ({tabCounts.overdue})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Campaign List */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {campaigns.length === 0 ? "No outreach campaigns yet." : "No campaigns match your filters."}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredCampaigns.map((campaign) => {
                  const status = statusConfig[campaign.outreach_status] || statusConfig.not_started;
                  const timeline = buildTimeline(campaign);
                  const isExpanded = expandedCampaign === campaign.id;
                  const isOverdue = campaign.follow_up_at && isPast(new Date(campaign.follow_up_at)) && !["success", "declined"].includes(campaign.outreach_status);

                  return (
                    <Collapsible
                      key={campaign.id}
                      open={isExpanded}
                      onOpenChange={() => setExpandedCampaign(isExpanded ? null : campaign.id)}
                    >
                      <div className={cn(
                        "border rounded-lg transition-colors",
                        isOverdue && "border-destructive/50 bg-destructive/5",
                        isExpanded && "ring-1 ring-primary/20"
                      )}>
                        {/* Campaign Header */}
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50">
                            <div className="flex-shrink-0">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {campaign.source_title || campaign.source_domain}
                                </span>
                                <a
                                  href={campaign.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                {campaign.contact_email && (
                                  <>
                                    <span>{campaign.contact_name || campaign.contact_email}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{campaign.source_domain}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={cn("flex items-center gap-1", status.color)}>
                                {status.icon}
                                {status.label}
                              </Badge>
                              {campaign.follow_up_at && campaign.outreach_status === "follow_up" && (
                                <Badge variant={isOverdue ? "destructive" : "secondary"} className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {getFollowUpLabel(new Date(campaign.follow_up_at))}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground hidden md:inline">
                                {formatDistanceToNow(new Date(campaign.updated_at), { addSuffix: true })}
                              </span>
                            </div>
                            {/* Quick Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCampaign(campaign);
                                    setShowLogResponseDialog(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Log Response
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCampaign(campaign);
                                    setShowFollowUpDialog(true);
                                  }}
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Set Follow-Up
                                </DropdownMenuItem>
                                {campaign.outreach_status === "follow_up" && campaign.contact_email && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendFollowUp(campaign);
                                    }}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Follow-Up Email
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {campaign.outreach_status === "draft_ready" && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkSent(campaign);
                                    }}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                {campaign.source_url && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={campaign.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View Source
                                    </a>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CollapsibleTrigger>

                        {/* Expanded Timeline */}
                        <CollapsibleContent>
                          <Separator />
                          <div className="p-4 bg-muted/30">
                            <div className="flex flex-col md:flex-row gap-6">
                              {/* Timeline */}
                              <div className="flex-1">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Activity Timeline
                                </h4>
                                <div className="space-y-3">
                                  {timeline.map((event, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                      <div className={cn("flex-shrink-0 mt-0.5", event.color)}>
                                        {event.icon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm">{event.label}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex-1 space-y-4">
                                {campaign.response_summary && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Response Summary</h4>
                                    <p className="text-sm text-muted-foreground">{campaign.response_summary}</p>
                                  </div>
                                )}
                                {campaign.notes && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.notes}</p>
                                  </div>
                                )}
                                {campaign.email_subject && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-1">Last Email Subject</h4>
                                    <p className="text-sm text-muted-foreground">{campaign.email_subject}</p>
                                  </div>
                                )}
                                {/* Quick Action Buttons */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedCampaign(campaign);
                                      setShowLogResponseDialog(true);
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Log Response
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedCampaign(campaign);
                                      setShowFollowUpDialog(true);
                                    }}
                                  >
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Set Follow-Up
                                  </Button>
                                  {campaign.contact_email && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendFollowUp(campaign)}
                                    >
                                      <Send className="h-4 w-4 mr-1" />
                                      Send Follow-Up
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <FollowUpDialog
        open={showFollowUpDialog}
        onOpenChange={setShowFollowUpDialog}
        onConfirm={handleSetFollowUp}
        isLoading={updateCampaign.isPending}
        sourceName={selectedCampaign?.source_title || selectedCampaign?.source_domain}
      />
      <LogResponseDialog
        open={showLogResponseDialog}
        onOpenChange={setShowLogResponseDialog}
        onConfirm={handleLogResponse}
        isLoading={updateCampaign.isPending}
        sourceName={selectedCampaign?.source_title || selectedCampaign?.source_domain}
      />
    </>
  );
};
