import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageSquare, ThumbsUp, ThumbsDown, HelpCircle, Trophy } from "lucide-react";

interface LogResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { summary: string; outcome: string; notes: string }) => void;
  isLoading?: boolean;
  sourceName?: string;
}

const outcomeOptions = [
  { 
    value: "interested", 
    label: "Interested", 
    description: "They want to proceed",
    icon: ThumbsUp,
    color: "text-green-600"
  },
  { 
    value: "not_interested", 
    label: "Not Interested", 
    description: "They declined",
    icon: ThumbsDown,
    color: "text-red-500"
  },
  { 
    value: "needs_info", 
    label: "Needs More Info", 
    description: "They have questions",
    icon: HelpCircle,
    color: "text-amber-500"
  },
  { 
    value: "success", 
    label: "Success!", 
    description: "Link/mention obtained",
    icon: Trophy,
    color: "text-primary"
  },
];

export function LogResponseDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  sourceName = "this source"
}: LogResponseDialogProps) {
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    if (!summary.trim() || !outcome) return;
    onConfirm({ summary: summary.trim(), outcome, notes: notes.trim() });
  };

  const handleClose = () => {
    setSummary("");
    setOutcome("");
    setNotes("");
    onOpenChange(false);
  };

  const isValid = summary.trim() && outcome;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Log Response
          </DialogTitle>
          <DialogDescription>
            Record the response you received from {sourceName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Response Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Response Summary *</Label>
            <Textarea
              id="summary"
              placeholder="Paste or summarize their response here..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Copy the key points from their email or message
            </p>
          </div>

          {/* Outcome Selection */}
          <div className="space-y-3">
            <Label>Outcome *</Label>
            <RadioGroup value={outcome} onValueChange={setOutcome} className="grid grid-cols-2 gap-3">
              {outcomeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                    >
                      <Icon className={`h-5 w-5 mb-1 ${option.color}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any follow-up actions needed, key details to remember..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
            {isLoading ? "Saving..." : "Log Response"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
