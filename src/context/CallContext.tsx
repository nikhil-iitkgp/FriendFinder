"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import webRTCService, { CallData, CallStatus, CallType } from "@/lib/webrtc";
import { useAuth } from "@/context/AuthContext";

interface CallContextType {
  currentCall: CallData | null;
  incomingCall: CallData | null;
  callStatus: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isInCall: boolean;
  initiateCall: (
    recipientId: string,
    recipientName: string,
    type: CallType
  ) => Promise<void>;
  answerCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  dismissIncomingCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { user } = useAuth();
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Setup WebRTC service event listeners
    webRTCService.onStatusChange((status) => {
      setCallStatus(status);
      if (status === "connected") {
        setCurrentCall(webRTCService.getCurrentCall());
        setIncomingCall(null);
      } else if (
        status === "ended" ||
        status === "declined" ||
        status === "failed"
      ) {
        setCurrentCall(null);
        setIncomingCall(null);
        setLocalStream(null);
        setRemoteStream(null);
        setIsAudioEnabled(true);
        setIsVideoEnabled(true);
      }
    });

    webRTCService.onIncomingCallEvent((call) => {
      setIncomingCall(call);
      setCallStatus("receiving");
    });

    webRTCService.onRemoteStreamReceived((stream) => {
      setRemoteStream(stream);
    });

    webRTCService.onCallEndedEvent(() => {
      setCurrentCall(null);
      setIncomingCall(null);
      setLocalStream(null);
      setRemoteStream(null);
      setCallStatus("idle");
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
    });

    webRTCService.onErrorEvent((error) => {
      console.error("Call error:", error);
      // You could show a toast notification here
    });

    return () => {
      // Cleanup if user logs out
      if (webRTCService.isInCall()) {
        webRTCService.endCall();
      }
    };
  }, [user]);

  const initiateCall = async (
    recipientId: string,
    recipientName: string,
    type: CallType
  ) => {
    try {
      const callId = await webRTCService.initiateCall(
        recipientId,
        recipientName,
        type
      );
      setCurrentCall(webRTCService.getCurrentCall());
      setLocalStream(webRTCService.getLocalStream());

      // Set initial audio/video state based on call type
      setIsVideoEnabled(type === "video");
      setIsAudioEnabled(true);
    } catch (error) {
      console.error("Failed to initiate call:", error);
      throw error;
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      await webRTCService.answerCall(incomingCall.callId, true);
      setCurrentCall(webRTCService.getCurrentCall());
      setLocalStream(webRTCService.getLocalStream());

      // Set initial audio/video state based on call type
      setIsVideoEnabled(incomingCall.type === "video");
      setIsAudioEnabled(true);
    } catch (error) {
      console.error("Failed to answer call:", error);
      declineCall();
    }
  };

  const declineCall = () => {
    if (incomingCall) {
      webRTCService.declineCall(incomingCall.callId);
      setIncomingCall(null);
      setCallStatus("idle");
    }
  };

  const endCall = () => {
    webRTCService.endCall();
  };

  const toggleAudio = () => {
    const enabled = webRTCService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const toggleVideo = () => {
    const enabled = webRTCService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const dismissIncomingCall = () => {
    setIncomingCall(null);
    setCallStatus("idle");
  };

  const isInCall =
    callStatus === "calling" ||
    callStatus === "receiving" ||
    callStatus === "connected";

  return (
    <CallContext.Provider
      value={{
        currentCall,
        incomingCall,
        callStatus,
        localStream,
        remoteStream,
        isAudioEnabled,
        isVideoEnabled,
        isInCall,
        initiateCall,
        answerCall,
        declineCall,
        endCall,
        toggleAudio,
        toggleVideo,
        dismissIncomingCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
