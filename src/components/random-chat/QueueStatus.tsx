"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Users, 
  Loader2, 
  X,
} from "lucide-react";
import type { QueueStatus as QueueStatusType } from "@/context/RandomChatContext";

interface QueueStatusProps {
  queueStatus: QueueStatusType;
  onLeaveQueue: () => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

export default function QueueStatus({ 
  queueStatus, 
  onLeaveQueue, 
  isLoading 
}: QueueStatusProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);

  // Calculate elapsed time since joining queue
  useEffect(() => {
    if (!queueStatus.joinedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(queueStatus.joinedAt!).getTime()) / 1000);
      setElapsedTime(elapsed);
      
      // Calculate progress (assuming max wait time of 5 minutes)
      const maxWaitTime = 300; // 5 minutes
      const progressPercent = Math.min((elapsed / maxWaitTime) * 100, 100);
      setProgress(progressPercent);
    }, 1000);

    return () => clearInterval(interval);
  }, [queueStatus.joinedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEstimatedWait = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-medium">Searching for partner...</span>
        </div>
        <Badge variant="secondary" className="capitalize">
          {queueStatus.chatType}
        </Badge>
      </div>

      {/* Queue Information */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              Position
            </div>
            <div className="font-medium text-lg">#{queueStatus.position}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Est. Wait
            </div>
            <div className="font-medium text-lg">
              {formatEstimatedWait(queueStatus.estimatedWaitTime)}
            </div>
          </div>
        </div>

        {/* Time Elapsed */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time elapsed:</span>
            <span className="font-medium">{formatTime(elapsedTime)}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Anonymous ID */}
      {queueStatus.anonymousId && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Your anonymous name:</div>
          <Badge variant="outline" className="font-mono">
            {queueStatus.anonymousId}
          </Badge>
        </div>
      )}

      {/* Status Messages */}
      <div className="space-y-2">
        {elapsedTime < 30 && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <Loader2 className="h-4 w-4 animate-spin mt-0.5 flex-shrink-0" />
            <span>Looking for the perfect match...</span>
          </div>
        )}
        
        {elapsedTime >= 30 && elapsedTime < 120 && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <Loader2 className="h-4 w-4 animate-spin mt-0.5 flex-shrink-0" />
            <span>Expanding search criteria to find you a match...</span>
          </div>
        )}
        
        {elapsedTime >= 120 && (
          <div className="text-sm text-muted-foreground flex items-start gap-2">
            <Loader2 className="h-4 w-4 animate-spin mt-0.5 flex-shrink-0" />
            <span>Still searching... Thanks for your patience!</span>
          </div>
        )}
      </div>

      {/* Leave Queue Button */}
      <Button
        onClick={onLeaveQueue}
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {isLoading ? 'Leaving...' : (
          <>
            <X className="h-4 w-4 mr-2" />
            Leave Queue
          </>
        )}
      </Button>

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Tip:</strong> Wait times are typically shorter during peak hours (6-10 PM local time).</p>
        <p><strong>Note:</strong> Closing this page will remove you from the queue.</p>
      </div>
    </div>
  );
}