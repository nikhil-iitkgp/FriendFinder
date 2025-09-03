"use client";

import { useState, useEffect, useRef } from "react";
import { useRandomChat } from "@/context/RandomChatContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shuffle,
  Users,
  MessageCircle,
  Video,
  Mic,
  Send,
  Settings,
  LogOut,
  Clock,
  AlertTriangle,
  Flag,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import PreferencesSelector from "@/components/random-chat/PreferencesSelector";
import QueueStatus from "@/components/random-chat/QueueStatus";
import ChatInterface from "@/components/random-chat/ChatInterface";
import WebRTCInterface from "@/components/random-chat/WebRTCInterface";
import ReportModal from "@/components/random-chat/ReportModal";
import type { ChatPreferences } from "@/context/RandomChatContext";

export default function RandomChatPage() {
  const {
    queueStatus,
    activeSession,
    messages,
    isConnected,
    connectionError,
    isJoiningQueue,
    isLeavingQueue,
    isLoadingSession,
    joinQueue,
    leaveQueue,
    endSession,
  } = useRandomChat();

  const [showPreferences, setShowPreferences] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentChatType, setCurrentChatType] = useState<
    "text" | "voice" | "video"
  >("text");

  // Hide preferences when user is in queue or has active session
  useEffect(() => {
    if (queueStatus.inQueue || activeSession) {
      setShowPreferences(false);
    } else {
      setShowPreferences(true);
    }
  }, [queueStatus.inQueue, activeSession]);

  const handleJoinQueue = async (preferences: ChatPreferences) => {
    setCurrentChatType(preferences.chatType);
    const result = await joinQueue(preferences);

    if (!result.success) {
      toast.error(result.error || "Failed to join queue");
    }
  };

  const handleLeaveQueue = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const result = await leaveQueue();

    if (!result.success) {
      toast.error(result.error || "Failed to leave queue");
    }

    return result;
  };

  const handleEndSession = async () => {
    const result = await endSession();

    if (!result.success) {
      toast.error(result.error || "Failed to end session");
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
  };

  // Show loading state
  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading random chat...</p>
        </div>
      </div>
    );
  }

  // Show connection error
  if (!isConnected || connectionError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Random Chat</h1>
            <p className="text-muted-foreground">
              Connect with strangers from around the world
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {connectionError ||
              "Unable to connect to chat servers. Please check your internet connection and try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
            Random Chat
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Connect with strangers from around the world
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Panel - Preferences/Queue/Session Info */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
          {/* Preferences Selector */}
          {showPreferences && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  Chat Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PreferencesSelector
                  onJoinQueue={handleJoinQueue}
                  isLoading={isJoiningQueue}
                  disabled={queueStatus.inQueue || !!activeSession}
                />
              </CardContent>
            </Card>
          )}

          {/* Queue Status */}
          {queueStatus.inQueue && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  In Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QueueStatus
                  queueStatus={queueStatus}
                  onLeaveQueue={handleLeaveQueue}
                  isLoading={isLeavingQueue}
                />
              </CardContent>
            </Card>
          )}

          {/* Active Session Info */}
          {activeSession && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {currentChatType === "text" && (
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  {currentChatType === "voice" && (
                    <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  {currentChatType === "video" && (
                    <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  Active Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                    <AvatarFallback>
                      {activeSession.partner.anonymousId.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {activeSession.partner.anonymousId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeSession.partner.isActive ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Chat Type:{" "}
                    <span className="capitalize">{activeSession.chatType}</span>
                  </p>
                  <p>
                    Started:{" "}
                    {new Date(activeSession.startTime).toLocaleTimeString()}
                  </p>
                  <p>Messages: {activeSession.messagesCount}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReportUser}
                    className="flex items-center gap-1 h-9"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEndSession}
                    className="flex items-center gap-1 h-9"
                  >
                    <LogOut className="h-4 w-4" />
                    End Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!queueStatus.inQueue && !activeSession && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    1
                  </div>
                  <p className="pt-1">
                    Choose your chat preferences (text, voice, or video)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    2
                  </div>
                  <p className="pt-1">Join the queue and wait to be matched</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    3
                  </div>
                  <p className="pt-1">Start chatting with a random stranger</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    4
                  </div>
                  <p className="pt-1">
                    End the chat anytime or report inappropriate behavior
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          {activeSession ? (
            activeSession.chatType === "text" ? (
              <ChatInterface session={activeSession} />
            ) : (
              <WebRTCInterface
                session={activeSession}
                onEndCall={handleEndSession}
              />
            )
          ) : queueStatus.inQueue ? (
            <Card className="h-[500px] sm:h-[600px] flex items-center justify-center">
              <div className="text-center space-y-4 p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <div>
                  <h3 className="text-lg font-medium">
                    Looking for a chat partner...
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Position in queue: {queueStatus.position}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Estimated wait:{" "}
                    {Math.ceil(queueStatus.estimatedWaitTime / 60)} minutes
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-[500px] sm:h-[600px] flex items-center justify-center">
              <div className="text-center space-y-4 p-6">
                <Shuffle className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">
                    Ready to start chatting?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Select your preferences and join the queue to be matched
                    with someone new.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {activeSession && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          session={activeSession}
          messages={messages}
        />
      )}
    </div>
  );
}
