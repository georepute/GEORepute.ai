"use client";
import React, { useState, useMemo } from "react";
import Button from "@/components/Button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Badge from "@/components/Badge";
import { Card } from "@/components/Card";
import { 
  Plus, 
  ChevronLeft, 
  Search, 
  X, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  CheckSquare, 
  Square, 
  CheckSquare2 
} from "lucide-react";
import { BrandAnalysisConversationItem } from "./BrandAnalysisConversationItem";
import { Conversation } from "../dashboard/askfreddie/hooks/useConversations";

interface BrandAnalysisSidebarProps {
  conversations: Conversation[];
  activeConversation: string | null;
  project: any;
  brandMetrics: {
    visibilityScore: number;
    totalQueries: number;
    mentionedQueries: number;
    platforms: number;
  };
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string, event: React.MouseEvent) => void;
  onEditConversationTitle: (id: string, newTitle: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}

export const BrandAnalysisSidebar: React.FC<BrandAnalysisSidebarProps> = ({
  conversations,
  activeConversation,
  project,
  brandMetrics,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onEditConversationTitle,
  onBulkDelete,
  onToggleCollapse,
  isCollapsed
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);

  // Filter conversations for brand visibility - include conversations that:
  // 1. Have "Brand Analysis" or "Brand Visibility" in title, OR
  // 2. Have scan_type indicating brand analysis context, OR  
  // 3. Were created in brand analysis context (fallback)
  const brandConversations = useMemo(() => {
    const filtered = conversations.filter(conv => {
      const titleMatch = conv.title?.includes('Brand Analysis') || conv.title?.includes('Brand Visibility');
      const scanTypeMatch = conv.scan_type === 'brand_analysis' || conv.scan_type === 'single_page';
      
      console.log('BrandAnalysisSidebar: Filtering conversation', {
        id: conv.id,
        title: conv.title,
        scan_type: conv.scan_type,
        titleMatch,
        scanTypeMatch,
        included: titleMatch || scanTypeMatch
      });
      
      return titleMatch || scanTypeMatch;
    });
    
    console.log('BrandAnalysisSidebar: Filtered conversations', {
      totalConversations: conversations.length,
      brandConversations: filtered.length,
      filteredIds: filtered.map(c => c.id)
    });
    
    return filtered;
  }, [conversations]);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return brandConversations;
    
    const query = searchQuery.toLowerCase();
    return brandConversations.filter(conversation =>
      conversation.title?.toLowerCase().includes(query)
    );
  }, [brandConversations, searchQuery]);

  const handleConversationClick = (id: string) => {
    if (isSelectionMode) {
      toggleConversationSelection(id);
    } else {
      onSelectConversation(id);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedConversationIds([]);
  };

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversationIds(prev => {
      if (prev.includes(conversationId)) {
        return prev.filter(id => id !== conversationId);
      } else {
        return [...prev, conversationId];
      }
    });
  };

  const isConversationSelected = (conversationId: string) => {
    return selectedConversationIds.includes(conversationId);
  };

  const handleSelectAll = () => {
    if (selectedConversationIds.length === filteredConversations.length) {
      setSelectedConversationIds([]);
    } else {
      setSelectedConversationIds(filteredConversations.map(c => c.id));
    }
  };

  const handleBulkDeleteClick = () => {
    onBulkDelete(selectedConversationIds);
    setSelectedConversationIds([]);
    setIsSelectionMode(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (isCollapsed) {
    return (
      <div className="w-12 transition-all duration-300 border-r bg-muted/30 flex flex-col">
        <div className="p-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 transition-all duration-300 border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            disabled={isSelectionMode}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-xs text-muted-foreground px-1">
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} found
          </div>
        )}

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Brand Visibility Chat</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        
        <Button onClick={onNewConversation} className="w-full" size="sm" disabled={isSelectionMode}>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Selection Controls */}
      {brandConversations.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <Button 
            onClick={toggleSelectionMode}
            className="w-full justify-start" 
            variant="outline"
            size="sm"
          >
            {isSelectionMode ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancel Selection
              </>
            ) : (
              <>
                <CheckSquare className="mr-2 h-4 w-4" />
                Select Multiple
              </>
            )}
          </Button>

          {isSelectionMode && (
            <div className="space-y-2">
              <Button 
                onClick={handleSelectAll}
                className="w-full justify-start" 
                variant="outline"
                size="sm"
              >
                {selectedConversationIds.length === filteredConversations.length ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare2 className="mr-2 h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
              
              {selectedConversationIds.length > 0 && (
                <>
                  <div className="text-sm text-muted-foreground px-2">
                    {selectedConversationIds.length} conversation{selectedConversationIds.length !== 1 ? 's' : ''} selected
                  </div>
                  <Button 
                    onClick={handleBulkDeleteClick}
                    className="w-full justify-start" 
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Conversations List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No conversations found matching your search.' : 'No conversations found. Start a new conversation to begin chatting with Freddie.'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <BrandAnalysisConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversation === conversation.id}
                isSelectionMode={isSelectionMode}
                isSelected={isConversationSelected(conversation.id)}
                onConversationClick={handleConversationClick}
                onDeleteConversation={onDeleteConversation}
                onToggleConversationSelection={toggleConversationSelection}
                onEditConversationTitle={onEditConversationTitle}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};