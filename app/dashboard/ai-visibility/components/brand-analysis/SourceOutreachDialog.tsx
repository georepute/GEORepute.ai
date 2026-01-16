"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Badge from "@/components/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Card } from "@/components/Card";
import { useToast } import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase/client";
import { useSmtpSettings } from "@/hooks/useSmtpSettings";
import { FreddieAvatar } from "../dashboard/askfreddie/FreddieAvatar";
import {
  Mail,
  Send,
  Wand2,
  ExternalLink,
  User,
  AtSign,
  Linkedin,
  Twitter,
  FileText,
  Target,
  Lightbulb,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import { SourceOutreachCampaign, useUpdateOutreachCampaign, useGenerateOutreachEmail } from "@/hooks/useSourceOutreachCampaigns";
import { 
  SOURCE_OUTREACH_TEMPLATES, 
  fillTemplate, 
  generateAICitationHook,
  type OutreachTemplate 
} from "@/lib/templates/source-outreach-templates";

interface SourceOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: SourceOutreachCampaign | null;
  brandName: string;
  brandWebsite: string;
  brandDescription: string;
}

const outreachTypes = [
  { value: "mention_request", label: "Mention Request", description: "Ask to be included as an alternative" },
  { value: "guest_post", label: "Guest Post", description: "Offer to contribute content" },
  { value: "link_request", label: "Link Request", description: "Request a backlink" },
  { value: "correction", label: "Correction", description: "Suggest an update with your brand" },
  { value: "partnership", label: "Partnership", description: "Propose collaboration" },
  { value: "review_request", label: "Review Request", description: "Ask for a product review" },
  { value: "directory_inclusion", label: "Directory Inclusion", description: "Request listing inclusion" },
];

export const SourceOutreachDialog: React.FC<SourceOutreachDialogProps> = ({
  open,
  onOpenChange,
  campaign,
  brandName,
  brandWebsite,
  brandDescription,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const { data: smtpSettings } = useSmtpSettings();
  const updateCampaign = useUpdateOutreachCampaign();
  const generateEmail = useGenerateOutreachEmail();

  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [outreachType, setOutreachType] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultSmtp = smtpSettings?.find((s) => s.is_default) || smtpSettings?.[0];
  const analysis = campaign?.source_analysis || {};

  useEffect(() => {
    if (campaign) {
      setEmailTo(campaign.contact_email || "");
      setEmailSubject(campaign.email_subject || "");
      setEmailBody(campaign.email_body || "");
      setOutreachType(campaign.outreach_type || analysis.suggestedOutreachType || "mention_request");
    }
  }, [campaign]);

  const handleGenerateEmail = async () => {
    if (!campaign) return;
    setIsGenerating(true);

    try {
      const result = await generateEmail.mutateAsync({
        sourceUrl: campaign.source_url,
        sourceAnalysis: analysis,
        brandName,
        brandWebsite,
        brandDescription,
        outreachType,
        citingPrompts: campaign.citing_prompts,
        contactName: campaign.contact_name || undefined,
      });

      setEmailSubject(result.subject);
      setEmailBody(result.body);
      toast({ title: "Email generated", description: "AI has drafted your outreach email" });
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      toast({ title: "Missing fields", description: "Please fill in all email fields", variant: "destructive" });
      return;
    }

    if (!defaultSmtp) {
      toast({ title: "No SMTP configured", description: "Please configure SMTP settings first", variant: "destructive" });
      return;
    }

    setIsSending(true);
    try {
      // Note: send-smtp-email expects "message" not "body"
      const { data, error } = await supabase.functions.invoke("send-smtp-email", {
        body: {
          to: emailTo,
          subject: emailSubject,
          message: emailBody,
          smtp_config_id: defaultSmtp.id,
          email_type: "outreach",
        },
      });

      if (error) throw new Error(error.message);

      // Update campaign status
      if (campaign) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          updates: {
            email_subject: emailSubject,
            email_body: emailBody,
            outreach_type: outreachType,
            outreach_status: "sent",
            sent_at: new Date().toISOString(),
          },
        });
      }

      toast({ title: "Email sent!", description: `Outreach email sent to ${emailTo}` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleAskFreddie = () => {
    if (!campaign) return;

    // Build outreach context for Freddie
    const outreachContext = {
      type: 'source_outreach',
      sourceUrl: campaign.source_url,
      sourceTitle: campaign.source_title || campaign.source_domain,
      contactName: campaign.contact_name,
      contactEmail: campaign.contact_email,
      articleType: analysis.articleType,
      competitorMentions: analysis.competitorMentions,
      keyTopics: analysis.keyTopics,
      summary: analysis.summary,
      pitchAngle: analysis.pitchAngle,
      citingPrompts: campaign.citing_prompts,
      brandName,
      brandDescription,
      brandWebsite,
      currentSubject: emailSubject,
      currentBody: emailBody,
      outreachType,
      timestamp: new Date().toISOString(),
    };

    // Store context in sessionStorage
    sessionStorage.setItem('outreachContext', JSON.stringify(outreachContext));

    // Navigate to Ask Freddie with context
    router.push('/dashboard/ask-freddie', {
      state: {
        outreachContext,
        initialQuestion: `Help me refine this outreach email for ${campaign.source_title || campaign.source_domain}. I'm reaching out to request ${outreachType.replace(/_/g, ' ')}. Here's my current draft:\n\nSubject: ${emailSubject || '[no subject yet]'}\n\n${emailBody || '[no body yet]'}\n\nPlease help me improve it.`,
        autoStartConversation: true,
      },
    });
  };

  const handleSaveDraft = async () => {
    if (!campaign) return;

    await updateCampaign.mutateAsync({
      id: campaign.id,
      updates: {
        email_subject: emailSubject,
        email_body: emailBody,
        outreach_type: outreachType,
        outreach_status: emailSubject || emailBody ? "draft_ready" : campaign.outreach_status,
      },
    });

    toast({ title: "Draft saved", description: "Your email draft has been saved" });
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Email copied to clipboard" });
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Source Outreach
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Source Intelligence */}
          <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-4">
              {/* Source Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm font-medium truncate">{campaign.source_title || campaign.source_domain}</p>
                  <a
                    href={campaign.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                  >
                    {campaign.source_url}
                  </a>
                  {analysis.articleType && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {analysis.articleType}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 space-y-2">
                  {campaign.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{campaign.contact_name}</span>
                      {campaign.contact_role && (
                        <Badge variant="outline" className="text-xs">
                          {campaign.contact_role}
                        </Badge>
                      )}
                    </div>
                  )}
                  {campaign.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <AtSign className="h-3 w-3 text-muted-foreground" />
                      <span>{campaign.contact_email}</span>
                    </div>
                  )}
                  {campaign.social_links?.twitter && (
                    <div className="flex items-center gap-2 text-sm">
                      <Twitter className="h-3 w-3 text-muted-foreground" />
                      <span>{campaign.social_links.twitter}</span>
                    </div>
                  )}
                  {campaign.social_links?.linkedin && (
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin className="h-3 w-3 text-muted-foreground" />
                      <a href={campaign.social_links.linkedin} target="_blank" rel="noopener" className="text-primary hover:underline truncate">
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {!campaign.contact_email && !campaign.contact_name && (
                    <p className="text-xs text-muted-foreground">No contact info found</p>
                  )}
                </CardContent>
              </Card>

              {/* Competitor Mentions */}
              {analysis.competitorMentions && analysis.competitorMentions.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Competitor Mentions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    {analysis.competitorMentions.map((mention, idx) => (
                      <div key={idx} className="text-sm border-l-2 border-primary/30 pl-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{mention.competitor}</span>
                          <Badge
                            variant={mention.sentiment === "positive" ? "default" : mention.sentiment === "negative" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {mention.sentiment}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{mention.context}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* AI Prompts Citing This Source */}
              {campaign.citing_prompts && campaign.citing_prompts.length > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      AI Prompts Citing This Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {campaign.citing_prompts.slice(0, 5).map((prompt, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          "{prompt}"
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This source is being cited when users search for these queries on AI platforms
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Pitch Angle */}
              {analysis.pitchAngle && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
                      <Lightbulb className="h-4 w-4" />
                      Suggested Pitch Angle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm">{analysis.pitchAngle}</p>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              {analysis.summary && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Article Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    {analysis.keyTopics && analysis.keyTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {analysis.keyTopics.map((topic, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          {/* Right Panel - Email Composer */}
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Template Selector */}
              <div>
                <Label htmlFor="template-select" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Start from Template
                </Label>
                <Select
                  value=""
                  onValueChange={(templateId) => {
                    const template = SOURCE_OUTREACH_TEMPLATES.find(t => t.id === templateId);
                    if (template && campaign) {
                      // Build template values from campaign data
                      const competitorName = analysis.competitorMentions?.[0]?.competitor || "[Competitor]";
                      const keyTopic = analysis.keyTopics?.[0] || "[topic]";
                      const aiHook = campaign.citing_prompts && campaign.citing_prompts.length > 0
                        ? generateAICitationHook(campaign.citing_prompts).replace("{brandName}", brandName)
                        : "";
                      
                      const values: Record<string, string> = {
                        contactName: campaign.contact_name || "there",
                        articleType: analysis.articleType || "article",
                        articleTitle: campaign.source_title || "[Article Title]",
                        topic: keyTopic,
                        category: keyTopic,
                        competitorName,
                        brandName,
                        brandDescription,
                        brandWebsite,
                        keyTopic,
                        valueProposition1: "[Your first key benefit]",
                        valueProposition2: "[Your second key benefit]",
                        valueProposition3: "[Your third key benefit]",
                        differentiator: "[What makes you different]",
                        proposedTopic: "[Your proposed article topic]",
                        subtopic1: "[First subtopic]",
                        subtopic2: "[Second subtopic]",
                        subtopic3: "[Third subtopic]",
                        useCase: "[specific use case]",
                        recentUpdate1: "[Recent feature or update]",
                        recentUpdate2: "[Another recent update]",
                        senderName: "[Your Name]",
                        senderTitle: "[Your Title]",
                        aiCitationHook: aiHook,
                      };
                      
                      const filled = fillTemplate(template, values);
                      setEmailSubject(filled.subject);
                      setEmailBody(filled.body);
                      setOutreachType(template.type);
                      toast({ title: "Template applied", description: `"${template.name}" template loaded. Customize the placeholders in brackets.` });
                    }
                  }}
                >
                  <SelectTrigger id="template-select">
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OUTREACH_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">{template.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-2" />

              <div>
                <Label htmlFor="outreach-type">Outreach Type</Label>
                <Select value={outreachType} onValueChange={setOutreachType}>
                  <SelectTrigger id="outreach-type">
                    <SelectValue placeholder="Select outreach type" />
                  </SelectTrigger>
                  <SelectContent>
                    {outreachTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email-to">To</Label>
                <Input
                  id="email-to"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>

              <div>
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject line"
                />
              </div>

              <div>
                <Label htmlFor="email-body">Email Body</Label>
                <Textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your outreach email..."
                  className="min-h-[220px] resize-none"
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateEmail}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>

              <Button
                variant="outline"
                onClick={handleAskFreddie}
                className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-primary/30 hover:from-blue-600/20 hover:to-purple-600/20"
              >
                <FreddieAvatar size="sm" className="mr-1" />
                Ask Freddie
              </Button>

              <Button variant="outline" onClick={handleCopyEmail} disabled={!emailBody}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} className="flex-1">
                Save Draft
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !emailTo || !emailSubject || !emailBody}
                className="flex-1"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Email
              </Button>
            </div>

            {!defaultSmtp && (
              <p className="text-xs text-muted-foreground text-center">
                Configure SMTP in Settings to send emails directly
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SourceOutreachDialog;
