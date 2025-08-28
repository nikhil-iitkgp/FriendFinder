import Peer from 'simple-peer'
import socketService from './socket'

export type CallType = 'video' | 'audio'
export type CallStatus = 'idle' | 'calling' | 'receiving' | 'connected' | 'ended' | 'declined' | 'failed'

export interface CallData {
  callId: string
  callerId: string
  callerName: string
  recipientId: string
  recipientName: string
  type: CallType
  status: CallStatus
  startTime?: Date
  endTime?: Date
  duration?: number
}

export interface CallOffer {
  callId: string
  signal: any
  callerId: string
  callerName: string
  type: CallType
}

export interface CallAnswer {
  callId: string
  signal: any
  accepted: boolean
}

class WebRTCService {
  private peer: Peer.Instance | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private currentCall: CallData | null = null
  private callTimeoutId: NodeJS.Timeout | null = null

  // ICE servers for STUN/TURN
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]

  // Event callbacks
  private onCallStatusChange: ((status: CallStatus) => void) | null = null
  private onRemoteStream: ((stream: MediaStream) => void) | null = null
  private onCallEnded: (() => void) | null = null
  private onIncomingCall: ((call: CallData) => void) | null = null
  private onCallError: ((error: string) => void) | null = null

  constructor() {
    this.setupSocketListeners()
  }

  private setupSocketListeners() {
    // Listen for incoming call offers
    socketService.getSocket()?.on('call:offer', (data: CallOffer) => {
      this.handleIncomingCall(data)
    })

    // Listen for call answers
    socketService.getSocket()?.on('call:answer', (data: CallAnswer) => {
      this.handleCallAnswer(data)
    })

    // Listen for call end
    socketService.getSocket()?.on('call:end', (data: { callId: string }) => {
      this.handleCallEnd(data.callId)
    })

    // Listen for call decline
    socketService.getSocket()?.on('call:decline', (data: { callId: string }) => {
      this.handleCallDecline(data.callId)
    })

    // Listen for ICE candidates
    socketService.getSocket()?.on('call:ice-candidate', (data: { callId: string, candidate: any }) => {
      if (this.peer && this.currentCall?.callId === data.callId) {
        this.peer.signal(data.candidate)
      }
    })
  }

  // Start a call
  async initiateCall(recipientId: string, recipientName: string, type: CallType): Promise<string> {
    try {
      if (this.currentCall) {
        throw new Error('Already in a call')
      }

      const callId = this.generateCallId()
      
      // Get user media
      const stream = await this.getUserMedia(type)
      this.localStream = stream

      // Create peer connection
      this.peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
        config: { iceServers: this.iceServers }
      })

      // Setup peer events
      this.setupPeerEvents(callId)

      // Create call data
      this.currentCall = {
        callId,
        callerId: socketService.getUserId()!,
        callerName: 'You',
        recipientId,
        recipientName,
        type,
        status: 'calling',
        startTime: new Date()
      }

      this.updateCallStatus('calling')

      // Set call timeout (30 seconds)
      this.callTimeoutId = setTimeout(() => {
        this.endCall('timeout')
      }, 30000)

      // Wait for peer to generate offer
      this.peer.on('signal', (signal) => {
        // Send call offer to recipient
        socketService.getSocket()?.emit('call:offer', {
          callId,
          recipientId,
          callerName: this.currentCall?.callerName || 'Unknown',
          type,
          signal
        })
      })

      return callId
    } catch (error) {
      this.handleError(`Failed to initiate call: ${error}`)
      throw error
    }
  }

  // Answer an incoming call
  async answerCall(callId: string, accept: boolean): Promise<void> {
    try {
      if (!this.currentCall || this.currentCall.callId !== callId) {
        throw new Error('No matching call found')
      }

      if (!accept) {
        this.declineCall(callId)
        return
      }

      // Get user media
      const stream = await this.getUserMedia(this.currentCall.type)
      this.localStream = stream

      // Create peer connection (not initiator)
      this.peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
        config: { iceServers: this.iceServers }
      })

      // Setup peer events
      this.setupPeerEvents(callId)

      this.updateCallStatus('connected')

      // Answer the call
      this.peer.on('signal', (signal) => {
        socketService.getSocket()?.emit('call:answer', {
          callId,
          callerId: this.currentCall?.callerId,
          signal,
          accepted: true
        })
      })

    } catch (error) {
      this.handleError(`Failed to answer call: ${error}`)
      this.declineCall(callId)
    }
  }

  // Decline a call
  declineCall(callId: string): void {
    if (this.currentCall?.callId === callId) {
      socketService.getSocket()?.emit('call:decline', {
        callId,
        callerId: this.currentCall.callerId
      })
      
      this.updateCallStatus('declined')
      this.cleanup()
    }
  }

  // End current call
  endCall(reason?: string): void {
    if (this.currentCall) {
      socketService.getSocket()?.emit('call:end', {
        callId: this.currentCall.callId,
        reason: reason || 'user_ended'
      })
      
      this.updateCallStatus('ended')
      this.cleanup()
    }
  }

  // Handle incoming call offer
  private handleIncomingCall(data: CallOffer): void {
    if (this.currentCall) {
      // Already in a call, decline automatically
      socketService.getSocket()?.emit('call:decline', {
        callId: data.callId,
        callerId: data.callerId
      })
      return
    }

    this.currentCall = {
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      recipientId: socketService.getUserId()!,
      recipientName: 'You',
      type: data.type,
      status: 'receiving'
    }

    this.updateCallStatus('receiving')
    this.onIncomingCall?.(this.currentCall)

    // Store the signal for when user accepts
    ;(this.currentCall as any).signal = data.signal
  }

  // Handle call answer
  private handleCallAnswer(data: CallAnswer): void {
    if (this.peer && this.currentCall?.callId === data.callId) {
      if (data.accepted) {
        this.peer.signal(data.signal)
        this.updateCallStatus('connected')
        
        // Clear timeout
        if (this.callTimeoutId) {
          clearTimeout(this.callTimeoutId)
          this.callTimeoutId = null
        }
      } else {
        this.updateCallStatus('declined')
        this.cleanup()
      }
    }
  }

  // Handle call end
  private handleCallEnd(callId: string): void {
    if (this.currentCall?.callId === callId) {
      this.updateCallStatus('ended')
      this.cleanup()
    }
  }

  // Handle call decline
  private handleCallDecline(callId: string): void {
    if (this.currentCall?.callId === callId) {
      this.updateCallStatus('declined')
      this.cleanup()
    }
  }

  // Setup peer connection events
  private setupPeerEvents(callId: string): void {
    if (!this.peer) return

    this.peer.on('stream', (stream) => {
      this.remoteStream = stream
      this.onRemoteStream?.(stream)
    })

    this.peer.on('connect', () => {
      console.log('Peer connected')
    })

    this.peer.on('error', (error) => {
      console.error('Peer error:', error)
      this.handleError(`Call failed: ${error.message}`)
    })

    this.peer.on('close', () => {
      console.log('Peer connection closed')
      this.endCall('connection_closed')
    })
  }

  // Get user media (camera/microphone)
  private async getUserMedia(type: CallType): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? { 
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    }

    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (error) {
      throw new Error(`Failed to access ${type === 'video' ? 'camera/microphone' : 'microphone'}: ${error}`)
    }
  }

  // Generate unique call ID
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Update call status and notify listeners
  private updateCallStatus(status: CallStatus): void {
    if (this.currentCall) {
      this.currentCall.status = status
      this.onCallStatusChange?.(status)
      
      if (status === 'ended' || status === 'declined' || status === 'failed') {
        this.currentCall.endTime = new Date()
        if (this.currentCall.startTime) {
          this.currentCall.duration = this.currentCall.endTime.getTime() - this.currentCall.startTime.getTime()
        }
      }
    }
  }

  // Handle errors
  private handleError(error: string): void {
    console.error('WebRTC Error:', error)
    this.updateCallStatus('failed')
    this.onCallError?.(error)
    this.cleanup()
  }

  // Clean up resources
  private cleanup(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Close peer connection
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    // Clear timeout
    if (this.callTimeoutId) {
      clearTimeout(this.callTimeoutId)
      this.callTimeoutId = null
    }

    // Clear remote stream
    this.remoteStream = null

    // Notify call ended
    setTimeout(() => {
      this.onCallEnded?.()
      this.currentCall = null
    }, 100)
  }

  // Mute/unmute audio
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return audioTrack.enabled
      }
    }
    return false
  }

  // Enable/disable video
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return videoTrack.enabled
      }
    }
    return false
  }

  // Getters
  getCurrentCall(): CallData | null {
    return this.currentCall
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  isInCall(): boolean {
    return this.currentCall !== null && ['calling', 'receiving', 'connected'].includes(this.currentCall.status)
  }

  // Event handlers
  onStatusChange(callback: (status: CallStatus) => void): void {
    this.onCallStatusChange = callback
  }

  onRemoteStreamReceived(callback: (stream: MediaStream) => void): void {
    this.onRemoteStream = callback
  }

  onCallEndedEvent(callback: () => void): void {
    this.onCallEnded = callback
  }

  onIncomingCallEvent(callback: (call: CallData) => void): void {
    this.onIncomingCall = callback
  }

  onErrorEvent(callback: (error: string) => void): void {
    this.onCallError = callback
  }
}

// Create singleton instance
const webRTCService = new WebRTCService()

export default webRTCService
