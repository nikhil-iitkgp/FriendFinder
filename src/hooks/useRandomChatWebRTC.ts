"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRandomChat } from '@/context/RandomChatContext';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  connectionState: RTCPeerConnectionState;
  isConnecting: boolean;
  callError: string | null;
}

export function useRandomChatWebRTC() {
  const { activeSession, endSession } = useRandomChat();
  const { socket, isConnected } = useSocket();
  
  const [webrtcState, setWebrtcState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isAudioEnabled: true,
    isVideoEnabled: true,
    connectionState: 'new',
    isConnecting: false,
    callError: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pendingICECandidates = useRef<RTCIceCandidate[]>([]);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // In production, add TURN servers for better connectivity
    ]
  };

  // Initialize WebRTC for voice/video calls
  const initializeWebRTC = useCallback(async (chatType: 'voice' | 'video') => {
    if (!activeSession || chatType === 'text') return;

    try {
      setWebrtcState(prev => ({ ...prev, isConnecting: true, callError: null }));

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC is not supported in this browser');
      }

      // Get user media with fallback constraints
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: chatType === 'video' ? {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, max: 30 }
          } : false
        });
      } catch (error) {
        // Fallback to basic constraints if high-quality fails
        console.warn('High-quality media failed, trying basic constraints:', error);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: chatType === 'video' ? true : false
        });
      }

      setWebrtcState(prev => ({ 
        ...prev, 
        localStream: stream,
        isVideoEnabled: chatType === 'video',
      }));

      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setWebrtcState(prev => ({ ...prev, remoteStream }));
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        setWebrtcState(prev => ({ 
          ...prev, 
          connectionState: pc.connectionState,
          isConnecting: pc.connectionState === 'connecting'
        }));

        if (pc.connectionState === 'connected') {
          toast.success('Voice/video call connected');
        } else if (pc.connectionState === 'failed') {
          setWebrtcState(prev => ({ 
            ...prev, 
            callError: 'Connection failed. Please try again.' 
          }));
          toast.error('Call connection failed');
        } else if (pc.connectionState === 'disconnected') {
          cleanup();
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && activeSession) {
          socket.emit('random-chat:webrtc-ice-candidate', {
            sessionId: activeSession.sessionId,
            candidate: event.candidate
          });
        }
      };

      // Add any pending ICE candidates
      for (const candidate of pendingICECandidates.current) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.warn('Failed to add ICE candidate:', error);
        }
      }
      pendingICECandidates.current = [];

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      let errorMessage = 'Failed to access camera/microphone';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera/microphone found. Please check your devices.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera/microphone is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera/microphone constraints not supported.';
        }
      }
      
      setWebrtcState(prev => ({ 
        ...prev, 
        callError: errorMessage,
        isConnecting: false
      }));
      toast.error(errorMessage);
    }
  }, [activeSession, socket]);

  // Create WebRTC offer (for initiator)
  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !activeSession || !socket) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('random-chat:webrtc-offer', {
        sessionId: activeSession.sessionId,
        offer
      });
    } catch (error) {
      console.error('Failed to create offer:', error);
      setWebrtcState(prev => ({ 
        ...prev, 
        callError: 'Failed to create call offer' 
      }));
    }
  }, [activeSession, socket]);

  // Handle WebRTC offer (for receiver)
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc || !activeSession || !socket) return;

    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('random-chat:webrtc-answer', {
        sessionId: activeSession.sessionId,
        answer
      });
    } catch (error) {
      console.error('Failed to handle offer:', error);
      setWebrtcState(prev => ({ 
        ...prev, 
        callError: 'Failed to handle call offer' 
      }));
    }
  }, [activeSession, socket]);

  // Handle WebRTC answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(answer);
    } catch (error) {
      console.error('Failed to handle answer:', error);
      setWebrtcState(prev => ({ 
        ...prev, 
        callError: 'Failed to handle call answer' 
      }));
    }
  }, []);

  // Handle ICE candidate
  const handleICECandidate = useCallback(async (candidate: RTCIceCandidate) => {
    const pc = peerConnectionRef.current;
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn('Failed to add ICE candidate:', error);
      }
    } else {
      // Store candidate for later if remote description is not set yet
      pendingICECandidates.current.push(candidate);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const { localStream } = webrtcState;
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setWebrtcState(prev => ({ 
          ...prev, 
          isAudioEnabled: audioTrack.enabled 
        }));
        return audioTrack.enabled;
      }
    }
    return webrtcState.isAudioEnabled;
  }, [webrtcState.localStream, webrtcState.isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const { localStream } = webrtcState;
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setWebrtcState(prev => ({ 
          ...prev, 
          isVideoEnabled: videoTrack.enabled 
        }));
        return videoTrack.enabled;
      }
    }
    return webrtcState.isVideoEnabled;
  }, [webrtcState.localStream, webrtcState.isVideoEnabled]);

  // Cleanup WebRTC resources
  const cleanup = useCallback(() => {
    // Stop local stream
    if (webrtcState.localStream) {
      webrtcState.localStream.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Clear pending ICE candidates
    pendingICECandidates.current = [];

    // Reset state
    setWebrtcState({
      localStream: null,
      remoteStream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      connectionState: 'new',
      isConnecting: false,
      callError: null,
    });
  }, [webrtcState.localStream]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleWebRTCOffer = (data: { 
      sessionId: string; 
      offer: RTCSessionDescriptionInit 
    }) => {
      if (activeSession?.sessionId === data.sessionId) {
        handleOffer(data.offer);
      }
    };

    const handleWebRTCAnswer = (data: { 
      sessionId: string; 
      answer: RTCSessionDescriptionInit 
    }) => {
      if (activeSession?.sessionId === data.sessionId) {
        handleAnswer(data.answer);
      }
    };

    const handleWebRTCICE = (data: { 
      sessionId: string; 
      candidate: RTCIceCandidate 
    }) => {
      if (activeSession?.sessionId === data.sessionId) {
        handleICECandidate(data.candidate);
      }
    };

    socket.on('random-chat:webrtc-offer-received', handleWebRTCOffer);
    socket.on('random-chat:webrtc-answer-received', handleWebRTCAnswer);
    socket.on('random-chat:webrtc-ice-candidate-received', handleWebRTCICE);

    return () => {
      socket.off('random-chat:webrtc-offer-received', handleWebRTCOffer);
      socket.off('random-chat:webrtc-answer-received', handleWebRTCAnswer);
      socket.off('random-chat:webrtc-ice-candidate-received', handleWebRTCICE);
    };
  }, [socket, isConnected, activeSession, handleOffer, handleAnswer, handleICECandidate]);

  // Initialize WebRTC when session starts with voice/video
  useEffect(() => {
    if (activeSession && (activeSession.chatType === 'voice' || activeSession.chatType === 'video')) {
      initializeWebRTC(activeSession.chatType);
    }

    // Cleanup when session ends
    return () => {
      if (!activeSession) {
        cleanup();
      }
    };
  }, [activeSession, initializeWebRTC, cleanup]);

  // Start WebRTC connection (for initiator)
  const startWebRTCConnection = useCallback(async () => {
    if (activeSession && (activeSession.chatType === 'voice' || activeSession.chatType === 'video')) {
      await initializeWebRTC(activeSession.chatType);
      await createOffer();
    }
  }, [activeSession, initializeWebRTC, createOffer]);

  return {
    // State
    ...webrtcState,
    
    // Refs for video elements
    localVideoRef,
    remoteVideoRef,
    
    // Actions
    startWebRTCConnection,
    toggleAudio,
    toggleVideo,
    cleanup,
    
    // Helper properties
    isWebRTCSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    isCallActive: !!(webrtcState.localStream || webrtcState.remoteStream),
    hasVideo: activeSession?.chatType === 'video',
    hasAudio: activeSession?.chatType === 'voice' || activeSession?.chatType === 'video',
  };
}