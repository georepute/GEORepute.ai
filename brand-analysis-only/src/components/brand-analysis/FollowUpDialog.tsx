import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: Date, notes?: string) => void;
  isLoading?: boolean;
  sourceName?: string;
}

export const FollowUpDialog: React.FC<FollowUpDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  sourceName,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 3));
  const [notes, setNotes] = useState("");

  const quickOptions = [
    { label: "Tomorrow", days: 1 },
    { label: "3 days", days: 3 },
    { label: "1 week", days: 7 },
    { label: "2 weeks", days: 14 },
  ];

  const handleConfirm = () => {
    onConfirm(selectedDate, notes || undefined);
    setNotes("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setNotes("");
    setSelectedDate(addDays(new Date(), 3));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Set Follow-up Reminder
          </DialogTitle>
          <DialogDescription>
            {sourceName
              ? `Schedule a follow-up for "${sourceName}"`
              : "Schedule when to follow up on this outreach"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Options */}
          <div>
            <Label className="text-sm font-medium">Quick Select</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {quickOptions.map((option) => (
                <Button
                  key={option.days}
                  variant={
                    format(selectedDate, "yyyy-MM-dd") ===
                    format(addDays(new Date(), option.days), "yyyy-MM-dd")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedDate(addDays(new Date(), option.days))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <Label className="text-sm font-medium">Or pick a date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-2",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="followup-notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="followup-notes"
              placeholder="E.g., Check if they opened the email, send revised pitch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Setting..." : "Set Follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
