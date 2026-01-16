import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Trash2, Edit2, Check, X } from "lucide-react";
import { Conversation } from "@/components/dashboard/askfreddie/hooks/useConversations";

interface BrandAnalysisConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isSelectionMode: boolean;
  isSelected: boolean;
  onConversationClick: (id: string) => void;
  onDeleteConversation: (id: string, event: React.MouseEvent) => void;
  onToggleConversationSelection: (id: string) => void;
  onEditConversationTitle: (id: string, newTitle: string) => Promise<void>;
}

export const BrandAnalysisConversationItem: React.FC<BrandAnalysisConversationItemProps> = ({
  conversation,
  isActive,
  isSelectionMode,
  isSelected,
  onConversationClick,
  onDeleteConversation,
  onToggleConversationSelection,
  onEditConversationTitle,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(conversation.title || '');
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || isSaving) return;
    
    console.log("BrandAnalysisConversationItem: Starting save operation", {
      conversationId: conversation.id,
      oldTitle: conversation.title,
      newTitle: editTitle.trim(),
      isSaving
    });
    
    setIsSaving(true);
    try {
      console.log("BrandAnalysisConversationItem: Calling onEditConversationTitle");
      await onEditConversationTitle(conversation.id, editTitle.trim());
      console.log("BrandAnalysisConversationItem: Successfully completed onEditConversationTitle");
      setIsEditing(false);
    } catch (error) {
      console.error('BrandAnalysisConversationItem: Failed to update conversation title:', error);
    } finally {
      setIsSaving(false);
      console.log("BrandAnalysisConversationItem: Save operation completed");
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditTitle(conversation.title || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleCheckboxClick = () => {
    onToggleConversationSelection(conversation.id);
  };

  return (
    <div
      className={`group relative w-full p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${
        isActive 
          ? 'bg-primary/10 border-primary/30 shadow-sm' 
          : 'bg-card border-border hover:border-border/70'
      } ${isSelected ? 'ring-2 ring-primary/50' : ''}`}
      onClick={() => onConversationClick(conversation.id)}
    >
      <div className="flex items-start gap-3 w-full">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="flex-shrink-0 mt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxClick}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Icon */}
        <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={editInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm"
                disabled={isSaving}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditSave}
                  disabled={isSaving || !editTitle.trim()}
                  className="h-6 w-6 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditCancel}
                  disabled={isSaving}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium truncate mb-1">
                {conversation.title || 'Brand Visibility Chat'}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(conversation.updated_at)}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        {!isSelectionMode && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEditStart}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => onDeleteConversation(conversation.id, e)}
              className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};