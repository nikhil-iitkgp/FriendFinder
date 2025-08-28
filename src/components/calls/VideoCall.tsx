"use client";

import React, { useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "@/context/CallContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface VideoCallProps {
  onClose?: () => void;
}

export default function VideoCall({ onClose }: VideoCallProps) {
  const {
    currentCall,
    callStatus,
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    endCall,
    toggleAudio,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Setup local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Setup remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle call end
  const handleEndCall = () => {
    endCall();
    onClose?.();
  };

  if (!currentCall) return null;

  const isVideoCall = currentCall.type === "video";
  const isConnected = callStatus === "connected";
  const isCalling = callStatus === "calling";

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white">
        <div>
          <h3 className="text-lg font-semibold">
            {currentCall.recipientName || currentCall.callerName}
          </h3>
          <p className="text-sm text-gray-300 capitalize">
            {isCalling ? "Calling..." : isConnected ? "Connected" : callStatus}
          </p>
        </div>
        <div className="text-sm text-gray-300">
          {isVideoCall ? "Video Call" : "Voice Call"}
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-gray-900">
        {isVideoCall ? (
          <>
            {/* Remote Video (Full Screen) */}
            <div className="absolute inset-0">
              {remoteStream && isConnected ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <Avatar className="w-32 h-32 mx-auto mb-4">
                      <AvatarFallback className="text-4xl bg-gray-600">
                        {(currentCall.recipientName || currentCall.callerName)
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xl">
                      {isCalling ? "Connecting..." : "Waiting for video..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture in Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
              {localStream && isVideoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-gray-600 text-white">
                      You
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Audio Call Interface */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
            <div className="text-center text-white">
              <Avatar className="w-48 h-48 mx-auto mb-8">
                <AvatarFallback className="text-6xl bg-white/20">
                  {(currentCall.recipientName || currentCall.callerName)
                    ?.charAt(0)
                    ?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-3xl font-bold mb-2">
                {currentCall.recipientName || currentCall.callerName}
              </h2>
              <p className="text-xl text-blue-200 capitalize">
                {isCalling
                  ? "Calling..."
                  : isConnected
                  ? "Connected"
                  : callStatus}
              </p>
              {isConnected && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isAudioEnabled ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm">
                    {isAudioEnabled ? "Microphone on" : "Microphone off"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-gray-900">
        <div className="flex justify-center items-center space-x-6">
          {/* Audio Toggle */}
          <Button
            onClick={toggleAudio}
            size="lg"
            variant={isAudioEnabled ? "secondary" : "destructive"}
            className="w-14 h-14 rounded-full"
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </Button>

          {/* Video Toggle (only for video calls) */}
          {isVideoCall && (
            <Button
              onClick={toggleVideo}
              size="lg"
              variant={isVideoEnabled ? "secondary" : "destructive"}
              className="w-14 h-14 rounded-full"
            >
              {isVideoEnabled ? (
                <Video className="w-6 h-6" />
              ) : (
                <VideoOff className="w-6 h-6" />
              )}
            </Button>
          )}

          {/* Screen Share (placeholder for future implementation) */}
          {isVideoCall && isConnected && (
            <Button
              size="lg"
              variant="outline"
              className="w-14 h-14 rounded-full"
              disabled
            >
              <Monitor className="w-6 h-6" />
            </Button>
          )}

          {/* End Call */}
          <Button
            onClick={handleEndCall}
            size="lg"
            variant="destructive"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>

        {/* Call Duration (when connected) */}
        {isConnected && (
          <div className="text-center mt-4">
            <CallTimer startTime={currentCall.startTime} />
          </div>
        )}
      </div>
    </div>
  );
}

// Call Timer Component
function CallTimer({ startTime }: { startTime?: Date }) {
  const [duration, setDuration] = React.useState<string>("00:00");

  React.useEffect(() => {
    if (!startTime) return;

    const updateDuration = () => {
      const now = new Date();
      const diff = now.getTime() - startTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setDuration(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`
      );
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return <p className="text-white text-sm">{duration}</p>;
}
