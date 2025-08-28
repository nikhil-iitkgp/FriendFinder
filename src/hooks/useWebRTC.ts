"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
}

interface CallData {
  callId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'connecting' | 'connected' | 'ended';
}

export function useWebRTC() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers for production
    ]
  };

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // TODO: Send ICE candidate via Socket.IO
        console.log('ICE candidate:', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed') {
        toast.error('Call connection failed');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // Get user media
  const getUserMedia = async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720 } : false,
        audio: audio
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  };

  // Start a call
  const startCall = async (userId: string, userName: string, type: 'voice' | 'video' = 'video') => {
    try {
      const stream = await getUserMedia(type === 'video', true);
      const pc = createPeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      setCallData({
        callId,
        callerId: 'current-user', // TODO: Get from session
        callerName: 'You',
        calleeId: userId,
        calleeName: userName,
        type,
        status: 'ringing'
      });

      setIsCallActive(true);

      // TODO: Send call offer via Socket.IO
      console.log('Sending call offer:', { callId, userId, offer, type });

      return callId;
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
      throw error;
    }
  };

  // Answer a call
  const answerCall = async (callData: CallData, offer: RTCSessionDescriptionInit) => {
    try {
      const stream = await getUserMedia(callData.type === 'video', true);
      const pc = createPeerConnection();

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(offer);

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setCallData({ ...callData, status: 'connecting' });
      setIsCallActive(true);

      // TODO: Send answer via Socket.IO
      console.log('Sending call answer:', { callId: callData.callId, answer });

      return answer;
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Failed to answer call');
      throw error;
    }
  };

  // End call
  const endCall = () => {
    try {
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Clear remote stream
      setRemoteStream(null);

      // Update call state
      if (callData) {
        setCallData({ ...callData, status: 'ended' });
        // TODO: Send end call signal via Socket.IO
        console.log('Ending call:', callData.callId);
      }

      setIsCallActive(false);
      setConnectionState('new');

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      toast.success('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  // Handle answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
        setCallData(prev => prev ? { ...prev, status: 'connected' } : null);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  return {
    // State
    localStream,
    remoteStream,
    isCallActive,
    callData,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    
    // Refs
    localVideoRef,
    remoteVideoRef,
    
    // Actions
    startCall,
    answerCall,
    endCall,
    toggleVideo,
    toggleAudio,
    handleIceCandidate,
    handleAnswer,
    getUserMedia
  };
}
