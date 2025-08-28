"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWebRTC } from "@/hooks/useWebRTC";
import { toast } from "sonner";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  MoreVertical,
} from "lucide-react";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  callData?: {
    callId: string;
    callerId: string;
    callerName: string;
    calleeId: string;
    calleeName: string;
    type: "voice" | "video";
    status: "ringing" | "connecting" | "connected" | "ended";
  };
  isIncoming?: boolean;
  onAnswer?: () => void;
  onReject?: () => void;
}

export default function CallModal({
  isOpen,
  onClose,
  callData,
  isIncoming = false,
  onAnswer,
  onReject,
}: CallModalProps) {
  const {
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    localVideoRef,
    remoteVideoRef,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useWebRTC();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (callData?.status === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callData?.status]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    endCall();
    onClose();
    toast.success("Call ended");
  };

  const handleAnswer = () => {
    if (onAnswer) {
      onAnswer();
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject();
    }
    onClose();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen || !callData) return null;

  const isVideoCall = callData.type === "video";
  const isConnected = callData.status === "connected";
  const isRinging = callData.status === "ringing";

  return (
    <div className={`fixed inset-0 z-50 bg-black ${isFullscreen ? "" : "p-4"}`}>
      <Card
        className={`w-full h-full ${
          isFullscreen ? "rounded-none" : "rounded-lg"
        } overflow-hidden`}
      >
        <CardContent className="p-0 h-full flex flex-col">
          {/* Video Area */}
          <div className="flex-1 relative bg-gray-900">
            {isVideoCall ? (
              <>
                {/* Remote Video (Main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Local Video (Picture-in-Picture) */}
                {localStream && isVideoEnabled && (
                  <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}

                {/* No video overlay */}
                {!remoteStream && !isRinging && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Avatar className="w-24 h-24 mx-auto mb-4">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-2xl">
                          {callData.calleeName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-lg">Connecting...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Voice Call UI */
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <Avatar className="w-32 h-32 mx-auto mb-6">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-4xl">
                      {callData.calleeName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-semibold mb-2">
                    {callData.calleeName}
                  </h2>
                  <Badge
                    variant="outline"
                    className="text-white border-white/50"
                  >
                    {callData.status === "ringing"
                      ? "Calling..."
                      : callData.status === "connecting"
                      ? "Connecting..."
                      : callData.status === "connected"
                      ? formatDuration(callDuration)
                      : "Call Ended"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {callData.calleeName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{callData.calleeName}</p>
                    <p className="text-xs opacity-75">
                      {callData.status === "connected"
                        ? formatDuration(callDuration)
                        : callData.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      connectionState === "connected"
                        ? "bg-green-500"
                        : connectionState === "connecting"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  >
                    {connectionState}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 p-6">
            {isIncoming && isRinging ? (
              /* Incoming Call Controls */
              <div className="flex justify-center gap-8">
                <Button
                  onClick={handleReject}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>

                <Button
                  onClick={handleAnswer}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                >
                  <Phone className="w-6 h-6" />
                </Button>
              </div>
            ) : (
              /* Active Call Controls */
              <div className="flex justify-center gap-4">
                <Button
                  onClick={toggleAudio}
                  variant="outline"
                  className={`w-12 h-12 rounded-full ${
                    isAudioEnabled
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {isAudioEnabled ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </Button>

                {isVideoCall && (
                  <Button
                    onClick={toggleVideo}
                    variant="outline"
                    className={`w-12 h-12 rounded-full ${
                      isVideoEnabled
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {isVideoEnabled ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <VideoOff className="w-5 h-5" />
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleEndCall}
                  className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
