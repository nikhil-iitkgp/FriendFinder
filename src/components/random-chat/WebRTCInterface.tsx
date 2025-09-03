"use client";

import { useEffect } from "react";
import { useRandomChatWebRTC } from "@/hooks/useRandomChatWebRTC";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff,
  Loader2,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { RandomChatSession } from "@/context/RandomChatContext";

interface WebRTCInterfaceProps {
  session: RandomChatSession;
  onEndCall: () => void;
}

export default function WebRTCInterface({ session, onEndCall }: WebRTCInterfaceProps) {
  const {
    localStream,
    remoteStream,
    isAudioEnabled,
    isVideoEnabled,
    connectionState,
    isConnecting,
    callError,
    localVideoRef,
    remoteVideoRef,
    startWebRTCConnection,
    toggleAudio,
    toggleVideo,
    isWebRTCSupported,
    hasVideo,
    hasAudio,
  } = useRandomChatWebRTC();

  // Auto-start WebRTC connection when component mounts
  useEffect(() => {
    if (session.chatType !== 'text' && connectionState === 'new') {
      startWebRTCConnection();
    }
  }, [session.chatType, connectionState, startWebRTCConnection]);

  if (!isWebRTCSupported) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium">WebRTC Not Supported</h3>
            <p className="text-muted-foreground">
              Your browser doesn't support voice/video calls. Please use a modern browser.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (callError) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Call Error</h3>
            <p className="text-muted-foreground mb-4">{callError}</p>
            <Button onClick={startWebRTCConnection} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Call Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {hasVideo && <Video className="h-5 w-5" />}
              {hasAudio && !hasVideo && <Mic className="h-5 w-5" />}
              <span className="font-medium">
                {session.chatType === 'video' ? 'Video Call' : 'Voice Call'}
              </span>
            </div>
            <Badge 
              variant={connectionState === 'connected' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {connectionState === 'connected' ? 'Connected' : 
               isConnecting ? 'Connecting...' : 
               connectionState}
            </Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {session.partner.anonymousId}
          </div>
        </div>
      </div>

      {/* Video/Call Area */}
      <CardContent className="flex-1 p-0 relative bg-gray-900">
        {hasVideo ? (
          <>
            {/* Remote Video (main) */}
            <div className="relative w-full h-full">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Connecting to your partner...</p>
                      </>
                    ) : (
                      <>
                        <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Waiting for partner's video...</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Local Video (picture-in-picture) */}
              {localStream && (
                <div className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 bg-black rounded-lg overflow-hidden border-2 border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Voice Call Interface */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white space-y-6">
              <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                {isConnecting ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-medium mb-2">Voice Call</h3>
                <p className="text-white/80">
                  {isConnecting ? 'Connecting...' : 
                   connectionState === 'connected' ? 'Call in progress' :
                   'Setting up call...'}
                </p>
              </div>

              {/* Audio Visualization (placeholder) */}
              {connectionState === 'connected' && (
                <div className="flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white/60 rounded-full animate-pulse"
                      style={{
                        height: Math.random() * 20 + 10 + 'px',
                        animationDelay: i * 0.1 + 's'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Status Overlay */}
        {isConnecting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-black/80 rounded-lg p-4 text-white text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Establishing connection...</p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Call Controls */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-center gap-4">
          {/* Audio Toggle */}
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "outline" : "destructive"}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            title={isAudioEnabled ? "Mute" : "Unmute"}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          {/* Video Toggle (only for video calls) */}
          {hasVideo && (
            <Button
              onClick={toggleVideo}
              variant={isVideoEnabled ? "outline" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* End Call */}
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
            title="End call"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        {/* Call Info */}
        <div className="mt-3 text-center">
          <div className="text-sm text-muted-foreground">
            {connectionState === 'connected' && (
              <span className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Connected
              </span>
            )}
            {connectionState === 'connecting' && (
              <span>Connecting to {session.partner.anonymousId}...</span>
            )}
            {connectionState === 'disconnected' && (
              <span className="text-orange-600">Connection lost</span>
            )}
            {connectionState === 'failed' && (
              <span className="text-destructive">Connection failed</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}