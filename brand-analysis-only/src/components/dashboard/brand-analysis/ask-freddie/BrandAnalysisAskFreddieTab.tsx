import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FreddieAvatar } from "@/components/dashboard/askfreddie/FreddieAvatar";
import { BrandAnalysisConversationStarters } from "@/components/dashboard/brand-analysis/BrandAnalysisConversationStarters";
import { MessageInput } from "@/components/dashboard/askfreddie/MessageInput";
import { SuggestedQuestionsModal } from "@/components/dashboard/askfreddie/SuggestedQuestionsModal";
import { BrandAnalysisSidebar } from "./BrandAnalysisSidebar";
import { useBrandAnalysisContext } from "@/hooks/useBrandAnalysisContext";
import { useBrandAnalysisProject } from "@/hooks/useBrandAnalysisProjects";
import { useBrandAnalysisResults } from "@/hooks/useBrandAnalysisResults";
import { useConversations } from "@/components/dashboard/askfreddie/hooks/useConversations";
import { useMessages } from "@/components/dashboard/askfreddie/hooks/useMessages";
import { useDeleteDialog } from "@/components/dashboard/askfreddie/hooks/useDeleteDialog";
import { useBulkSelection } from "@/components/dashboard/askfreddie/hooks/useBulkSelection";
import { AskFreddieDeleteDialog } from "@/components/dashboard/askfreddie/AskFreddieDeleteDialog";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Send, BarChart3, Plus, MessageSquare, Trash2, Edit2, ChevronLeft, ChevronRight, BrainCircuit, Zap, Target, LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Attachment } from "@/components/dashboard/askfreddie/AttachmentManager";
import { MarkdownFormatter } from "@/components/brand-analysis/MarkdownFormatter";
import { MessageActions } from "@/components/dashboard/askfreddie/MessageActions";
import { useFreddieProfile } from "@/hooks/useFreddieProfile";

// Update the component props interface to include initialContext
interface BrandAnalysisAskFreddieTabProps {
  projectId: string;
  initialContext?: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const BrandAnalysisAskFreddieTab: React.FC<BrandAnalysisAskFreddieTabProps> = ({
  projectId,
  initialContext
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState(false);
  
  
  // Update the useEffect to handle initialContext with more detailed prompt
  useEffect(() => {
    if (initialContext) {
      try {
        // Parse the context
        const parsedContext = JSON.parse(initialContext);
        
        // Create a comprehensive, detailed message based on the context
        let contextMessage = `I need a detailed strategic plan to improve brand visibility for my brand ${parsedContext.brandName}`;
        
        // Add executive summary if available
        if (parsedContext.executiveSummary) {
          contextMessage += `\n\nExecutive Summary: ${parsedContext.executiveSummary}`;
        } else {
          contextMessage += `\n\nCurrent visibility metrics:
- Visibility Score: ${parsedContext.visibilityScore}% (${parsedContext.mentionedQueries} out of ${parsedContext.totalQueries} queries)
- Industry: ${parsedContext.industry}
- Website: ${parsedContext.website || 'Not provided'}`;
        }
        
        // Add platform performance details
        if (parsedContext.platformPerformance && parsedContext.platformPerformance.length > 0) {
          contextMessage += `\n\nPlatform Performance:`;
          parsedContext.platformPerformance.forEach(platform => {
            contextMessage += `\n- ${platform.name}: ${platform.mentionRate}% visibility (${platform.mentions}/${platform.queries} queries)`;
          });
        } else if (parsedContext.bestPlatform && parsedContext.worstPlatform) {
          contextMessage += `\n\nPlatform Performance:
- Best: ${parsedContext.bestPlatform.name} (${parsedContext.bestPlatform.mentionRate}%)
- Worst: ${parsedContext.worstPlatform.name} (${parsedContext.worstPlatform.mentionRate}%)`;
        }
        
        // Add sentiment analysis
        if (parsedContext.sentimentBreakdown) {
          contextMessage += `\n\nSentiment Analysis:
- Overall: ${parsedContext.overallSentiment}%
- Positive mentions: ${parsedContext.sentimentBreakdown.positive}
- Neutral mentions: ${parsedContext.sentimentBreakdown.neutral}
- Negative mentions: ${parsedContext.sentimentBreakdown.negative}`;
        }
        
        // Add competitor information
        if (parsedContext.topCompetitors && parsedContext.topCompetitors.length > 0) {
          contextMessage += `\n\nCompetitor Analysis:
- Brand share of voice: ${parsedContext.competitorMetrics?.brandShareOfVoice || 0}%
- Top competitors: ${parsedContext.topCompetitors.map(c => `${c.name} (${c.mentionRate}%)`).join(', ')}`;
        }
        
        // Add sample queries
        if (parsedContext.missedQueries && parsedContext.missedQueries.length > 0) {
          contextMessage += `\n\nSample missed queries:`;
          parsedContext.missedQueries.slice(0, 3).forEach(q => {
            contextMessage += `\n- "${q.query}" (${q.platform})`;
          });
        }
        
        // Add request for actionable recommendations
        contextMessage += `\n\nBased on this comprehensive analysis, please provide:
1. A detailed strategic plan to improve my brand visibility across AI platforms
2. Give me platform-specific optimization recommendations
3. Also suggest content strategy recommendations to address gaps
4. List, some competitive positioning strategies
5. And specific, actionable next steps I can take immediately

Please be specific and provide actionable advice tailored to my brand's situation.`;
        
        // Set the message and send it after a short delay
        setInputMessage(contextMessage);
        
        // Clear localStorage to prevent reusing the same context
        localStorage.removeItem('brandAnalysisContext');
        
        // Send the message after a short delay to ensure component is fully mounted
        const timer = setTimeout(() => {
          handleSendMessage(contextMessage);
        }, 500);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error parsing initialContext:', error);
      }
    }
  }, [initialContext]);

  const { toast } = useToast();
  const { data: project } = useBrandAnalysisProject(projectId);
  const { data: analysisResults = [] } = useBrandAnalysisResults(projectId);
  const brandAnalysisContext = useBrandAnalysisContext(projectId);
  const { profileSettings } = useFreddieProfile();

  // Derive dynamic classes and styles from profile settings
  const bubbleStyleClass = profileSettings.messageStyle.bubbleStyle === 'rounded'
    ? 'rounded-xl'
    : profileSettings.messageStyle.bubbleStyle === 'classic'
      ? 'rounded-md'
      : 'rounded-lg';

  const textSizeClass = profileSettings.messageStyle.textSize === 'small'
    ? 'text-sm'
    : profileSettings.messageStyle.textSize === 'large'
      ? 'text-lg'
      : 'text-base';

  const animationClass = profileSettings.messageStyle.animation === 'dynamic'
    ? 'transition-transform duration-200'
    : profileSettings.messageStyle.animation === 'subtle'
      ? 'transition-colors duration-150'
      : '';

  // Use main Ask Freddie chat bubble styles (no inline colors), rely on design tokens
  // Assistant messages: neutral background with border
  // User messages: primary tint background with border

  // --- Default starters ---
  const defaultStarters: Array<{ text: string; prompt: string; icon?: React.ReactNode }> = [
    {
      icon: <LineChart className="w-5 h-5 text-primary" />,
      text: "Give me a detailed breakdown of my brand visibility score.",
      prompt: "Give me a detailed breakdown of my current brand visibility score and explain key contributing factors.",
    },
    {
      icon: <Target className="w-5 h-5 text-primary" />,
      text: "How do I outperform my top competitor?",
      prompt: "My top competitor is getting more mentions. What are 3 specific strategies I can use to outperform them based on my current analysis?",
    },
    {
      icon: <Zap className="w-5 h-5 text-primary" />,
      text: "Create a content plan to fix my visibility gaps.",
      prompt: "Based on the queries where my brand was not mentioned, create a prioritized list of 5 content ideas (like blog posts or FAQ pages) that I can create to fill these gaps.",
    },
    {
      icon: <BrainCircuit className="w-5 h-5 text-primary" />,
      text: "Explain how to improve my worst-performing platform.",
      prompt: "My visibility is lowest on one of the platforms. What are some specific actions I can take to improve my brand's performance on that specific platform?",
    },
  ];

  // Normalize starters from profile
  const starterItems: Array<{ text: string; prompt: string; icon?: React.ReactNode }> = (profileSettings.conversationStarters && profileSettings.conversationStarters.length > 0)
    ? profileSettings.conversationStarters.map(s => ({ text: s, prompt: s }))
    : defaultStarters;

  // Use individual hooks
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    fetchConversations
  } = useConversations();

  const {
    messages: dbMessages,
    sendMessage,
    fetchMessages,
    isTyping
  } = useMessages(activeConversation);

  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    conversationToDelete,
    conversationsToDelete,
    isBulkDelete,
    openDeleteDialog,
    openBulkDeleteDialog,
    closeDeleteDialog
  } = useDeleteDialog();

  const {
    isSelectionMode,
    selectedConversationIds,
    toggleSelectionMode,
    toggleConversationSelection,
    clearSelection,
    isConversationSelected,
    selectAllConversations,
    areAllConversationsSelected,
    toggleSelectAll
  } = useBulkSelection();

  // Convert database messages to display format
  const chatMessages: ChatMessage[] = dbMessages.map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.created_at)
  }));

  // Handle bulk delete
  const handleBulkDelete = (ids: string[]) => {
    openBulkDeleteDialog(ids);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      if (isBulkDelete && conversationsToDelete.length > 0) {
        for (const id of conversationsToDelete) {
          await deleteConversation(id);
        }
        toast({
          title: "Success",
          description: `Deleted ${conversationsToDelete.length} conversation${conversationsToDelete.length !== 1 ? 's' : ''}.`,
        });
      } else if (conversationToDelete) {
        await deleteConversation(conversationToDelete);
        toast({
          title: "Success",
          description: "Conversation deleted successfully.",
        });
      }
      
      // Reset active conversation if it was deleted
      if (conversationToDelete === activeConversation || conversationsToDelete.includes(activeConversation || '')) {
        setActiveConversation('');
      }
      
      await fetchConversations();
      closeDeleteDialog();
      clearSelection();
    } catch (error) {
      console.error('Error deleting conversation(s):', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation(s). Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNewConversation = async () => {
    if (!project) return;
    
    const conversationId = await createNewConversation(
      `Brand Visibility: ${project.brand_name}`,
      {
        type: 'brand-analysis',
        projectId: projectId,
        brandName: project.brand_name
      }
    );
    
    if (conversationId) {
      setActiveConversation(conversationId);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
  };

  const handleSendMessage = async (message?: string, messageAttachments?: Attachment[]) => {
    const messageText = message || inputMessage;
    const messageFiles = messageAttachments || attachments;
    
    if (!messageText.trim() || isLoading || !project) return;

    // Clear the input immediately for a better user experience
    setInputMessage('');
    
    setIsLoading(true);
    setIsProcessingAttachments(messageFiles.length > 0);
    
    try {
      // Create conversation if none active
      let currentConversationId = activeConversation;
      if (!currentConversationId) {
        currentConversationId = await createNewConversation(
          `Brand Visibility: ${project.brand_name}`,
          {
            type: 'brand-analysis',
            projectId: projectId,
            brandName: project.brand_name
          }
        );
        if (currentConversationId) {
          setActiveConversation(currentConversationId);
        }
      }

      if (!currentConversationId) {
        toast({
          title: "Error",
          description: "Failed to create conversation. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Prepare comprehensive brand analysis context
      const contextData = {
        type: 'brand-analysis',
        brandName: project.brand_name,
        industry: project.industry || 'technology',
        website: project.website_url,
        totalQueries: analysisResults.length,
        mentionedQueries: analysisResults.filter(r => r.mention_found).length,
        visibilityScore: analysisResults.length > 0 
          ? Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100)
          : 0,
        platforms: [...new Set(analysisResults.map(r => r.ai_platform))],
        missedQueries: analysisResults.filter(r => !r.mention_found).slice(0, 10).map(r => ({
          query: r.query_text,
          platform: r.ai_platform
        })),
        topPerformingQueries: analysisResults
          .filter(r => r.mention_found)
          .sort((a, b) => (a.mention_position || 999) - (b.mention_position || 999))
          .slice(0, 10)
          .map(r => ({
            query: r.query_text,
            position: r.mention_position,
            platform: r.ai_platform
          })),
        competitors: project.competitors || [],
        keywords: project.target_keywords || [],
        brandAnalysisContext: brandAnalysisContext
      };

      // Send message using the hook
      await sendMessage(currentConversationId, messageText, messageFiles, contextData);
      setAttachments([]);
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsProcessingAttachments(false);
    }
  };

  const brandMetrics = {
    visibilityScore: analysisResults.length > 0 
      ? Math.round((analysisResults.filter(r => r.mention_found).length / analysisResults.length) * 100)
      : 0,
    totalQueries: analysisResults.length,
    mentionedQueries: analysisResults.filter(r => r.mention_found).length,
    platforms: [...new Set(analysisResults.map(r => r.ai_platform))].length
  };

  const conversationStarters = profileSettings.conversationStarters || [
    {
      icon: <LineChart className="w-5 h-5 text-primary" />,
      text: "Give me a detailed breakdown of my brand visibility score.",
      prompt: `Can you give me a detailed breakdown of my current brand visibility score of ${brandMetrics.visibilityScore}%? Explain what it means and what factors are contributing to it.`,
    },
    {
      icon: <Target className="w-5 h-5 text-primary" />,
      text: "How do I outperform my top competitor?",
      prompt: `My top competitor is getting more mentions. What are 3 specific strategies I can use to outperform them based on my current analysis?`,
    },
    {
      icon: <Zap className="w-5 h-5 text-primary" />,
      text: "Create a content plan to fix my visibility gaps.",
      prompt: "Based on the queries where my brand was not mentioned, create a prioritized list of 5 content ideas (like blog posts or FAQ pages) that I can create to fill these gaps.",
    },
    {
      icon: <BrainCircuit className="w-5 h-5 text-primary" />,
      text: "Explain how to improve my worst-performing platform.",
      prompt: "My visibility is lowest on one of the platforms. What are some specific actions I can take to improve my brand's performance on that specific platform?",
    },
  ];

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] border rounded-lg overflow-hidden bg-background flex">
      {/* Enhanced Sidebar */}
      <BrandAnalysisSidebar
        conversations={conversations}
        activeConversation={activeConversation}
        project={project}
        brandMetrics={brandMetrics}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={openDeleteDialog}
        onEditConversationTitle={updateConversationTitle}
        onBulkDelete={handleBulkDelete}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Main Content Area - Exact same layout as main Ask Freddie */}
      <div className="w-3/4 flex flex-col h-full overflow-hidden bg-muted/30">
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Brand Visibility Chat
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Specialized analysis for {project?.brand_name} visibility optimization
            </p>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2 scroll-smooth">
            {chatMessages.length > 0 ? (
              chatMessages.map((message, index) => (
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-3 duration-300 group">
                  {message.role === "user" ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-medium text-sm">You</span>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-4 max-w-[80%] text-sm border">
                        <div className="text-left leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <FreddieAvatar size="sm" />
                        <span className="font-medium text-sm">
                          {profileSettings.displayName || "Freddie"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-background border rounded-lg p-4 max-w-[85%] shadow-sm">
                        <div className="text-left w-full">
                          <MarkdownFormatter content={message.content} />
                        </div>
                        <MessageActions
                          messageId={message.id}
                          conversationId={activeConversation || ''}
                          content={message.content}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md p-6">
                  <FreddieAvatar 
                    size="lg" 
                    className="mx-auto mb-4" 
                  />
                  <h3 className="text-xl font-semibold mb-2">
                    Welcome to Ask Freddie
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Hello! I'm Freddie, your AI LLM SEO guide. How can I help you today?
                  </p>
                  
                  {profileSettings.conversationStarters && profileSettings.conversationStarters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-3">Try asking:</p>
                      <div className="space-y-2">
                        {profileSettings.conversationStarters.slice(0, 3).map((starter, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full text-left justify-start h-auto py-3 px-4"
                            onClick={() => {
                              setInputMessage(starter);
                              setTimeout(() => handleSendMessage(starter), 100);
                            }}
                          >
                            <span className="text-sm">{starter}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(isLoading || isTyping) && (
              <div className="flex items-start gap-3 mb-1 animate-pulse">
                <FreddieAvatar size="sm" className="mt-1" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {profileSettings.displayName?.split(",")[0] || "Freddie"}
                    </span>
                    <span className="text-xs text-muted-foreground">is typing...</span>
                  </div>
                  <div className="flex gap-1.5 items-center p-3 bg-background border rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area - Exact same as main Ask Freddie */}
        <div className="p-4 border-t bg-background space-y-3">
          {profileSettings.conversationStarters && profileSettings.conversationStarters.length > 0 && (
            <SuggestedQuestionsModal
              questions={profileSettings.conversationStarters.filter(q => q && q.trim())}
              onQuestionClick={(question) => {
                setInputMessage(question);
                setTimeout(() => handleSendMessage(question), 100);
              }}
            />
          )}
          <MessageInput 
            onSendMessage={handleSendMessage} 
            initialMessage={inputMessage}
            onMessageChange={setInputMessage}
            placeholder="Type your message here..."
          />
        </div>
      </div>

      {/* Delete Dialog */}
      <AskFreddieDeleteDialog
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        conversationsToDelete={conversationsToDelete}
        isBulkDelete={isBulkDelete}
        handleDeleteConfirm={handleDeleteConfirm}
      />
    </div>
  );
};