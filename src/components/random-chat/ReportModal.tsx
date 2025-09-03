"use client";

import { useState } from "react";
import { useRandomChat } from "@/context/RandomChatContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Flag, 
  AlertTriangle, 
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { RandomChatSession, RandomChatMessage } from "@/context/RandomChatContext";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RandomChatSession;
  messages: RandomChatMessage[];
}

export default function ReportModal({ 
  isOpen, 
  onClose, 
  session, 
  messages 
}: ReportModalProps) {
  const { reportUser } = useRandomChat();
  
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportReasons = [
    {
      value: "spam",
      label: "Spam",
      description: "Repetitive or promotional messages"
    },
    {
      value: "inappropriate_content",
      label: "Inappropriate Content",
      description: "Sexual, violent, or offensive content"
    },
    {
      value: "harassment",
      label: "Harassment",
      description: "Bullying, threats, or personal attacks"
    },
    {
      value: "abusive_behavior",
      label: "Abusive Behavior",
      description: "Hate speech or discriminatory language"
    },
    {
      value: "fake_profile",
      label: "Fake Profile",
      description: "Impersonation or misleading identity"
    },
    {
      value: "other",
      label: "Other",
      description: "Other violation of community guidelines"
    }
  ];

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await reportUser(
        selectedReason,
        description.trim() || undefined,
        selectedMessages.length > 0 ? selectedMessages : undefined
      );

      if (result.success) {
        toast.success("Report submitted successfully");
        onClose();
        // Reset form
        setSelectedReason("");
        setDescription("");
        setSelectedMessages([]);
      } else {
        toast.error(result.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const formatMessageTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Filter messages from partner only
  const partnerMessages = messages.filter(msg => !msg.isOwn && msg.type !== 'system');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" onOpenChange={handleClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report User
          </DialogTitle>
          <DialogDescription>
            Report inappropriate behavior to help keep our community safe. 
            The reported user will be notified and the conversation will end immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm">
              <strong>Reporting:</strong> {session.partner.anonymousId}
            </div>
            <div className="text-xs text-muted-foreground">
              Session ID: {session.sessionId}
            </div>
          </div>

          {/* Report Reason */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Reason for reporting *</Label>
            <div className="space-y-2">
              {reportReasons.map((reason) => (
                <div
                  key={reason.value}
                  className={`
                    p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedReason === reason.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => setSelectedReason(reason.value)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${selectedReason === reason.value 
                        ? 'border-primary bg-primary' 
                        : 'border-border'
                      }
                    `}>
                      {selectedReason === reason.value && (
                        <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{reason.label}</div>
                      <div className="text-xs text-muted-foreground">{reason.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Additional details (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context that might help us review this report..."
              maxLength={2000}
              rows={3}
              disabled={isSubmitting}
            />
            <div className="text-xs text-muted-foreground text-right">
              {description.length}/2000
            </div>
          </div>

          {/* Evidence Selection */}
          {partnerMessages.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Select problematic messages (optional)
              </Label>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2">
                {partnerMessages.slice(-10).map((message) => (
                  <div
                    key={message.messageId}
                    className="flex items-start gap-2 p-2 rounded border"
                  >
                    <Checkbox
                      id={message.messageId}
                      checked={selectedMessages.includes(message.messageId)}
                      onCheckedChange={() => toggleMessageSelection(message.messageId)}
                      disabled={isSubmitting}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm break-words">{message.content}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatMessageTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedMessages.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {selectedMessages.length} message(s) selected as evidence
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Important:</strong> False reports may result in restrictions on your account. 
              Only report genuine violations of our community guidelines.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            variant="destructive"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}