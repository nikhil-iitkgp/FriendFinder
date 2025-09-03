import { socketErrorHandler, SocketError } from './socket-error-handler'
import { messageQueue, MessageQueue } from './message-queue'

export interface ConnectionManager {
  connect(): Promise<void>
  disconnect(): void
  isConnected(): boolean
  getConnectionState(): ConnectionState
  sendMessage(data: any): Promise<void>
  sendFriendRequest(data: any): Promise<void>
  sendFriendResponse(data: any): Promise<void>
  updatePresence(data: any): Promise<void>
  startTyping(data: any): Promise<void>
  stopTyping(data: any): Promise<void>
  enableFallbackMode(): void
  disableFallbackMode(): void
  isFallbackMode(): boolean
  getHealthStatus(): Promise<any>
  on(event: string, callback: Function): void
  off(event: string, callback?: Function): void
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'fallback'
  transport: 'websocket' | 'polling' | 'http'
  lastConnected?: Date
  retryCount: number
  errorCount: number
  fallbackActive: boolean
}

export class SocketConnectionManager implements ConnectionManager {
  private socket: any | null = null
  private connectionState: ConnectionState = {
    status: 'disconnected',
    transport: 'websocket',
    retryCount: 0,
    errorCount: 0,
    fallbackActive: false
  }
  
  private eventHandlers: Map<string, Function[]> = new Map()
  private reconnectTimeout: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private maxRetries = 5
  private baseDelay = 1000
  
  constructor(
    private socketUrl: string = 'http://localhost:3004',
    private socketPath: string = '/socket.io/'
  ) {}
  
  async connect(): Promise<void> {
    if (this.connectionState.status === 'connecting' || 
        this.connectionState.status === 'connected') {
      return
    }
    
    this.connectionState.status = 'connecting'
    
    try {
      const socketIO = await import('socket.io-client')
      const io = socketIO.default || socketIO
      
      this.socket = io(this.socketUrl, {
        path: this.socketPath,
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: false,
        reconnection: false, // We handle reconnection manually
        autoConnect: true
      })
      
      this.setupSocketEventHandlers()
      
    } catch (error) {
      console.error('Failed to initialize socket:', error)
      this.handleConnectionError(error)
    }
  }
  
  private setupSocketEventHandlers(): void {
    if (!this.socket) return
    
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)
      this.connectionState = {
        ...this.connectionState,
        status: 'connected',
        transport: this.socket.io.engine.transport.name,
        lastConnected: new Date(),
        retryCount: 0
      }
      
      this.startHealthCheck()
      
      // If fallback was active, try to sync queued messages
      if (this.connectionState.fallbackActive) {
        this.disableFallbackMode()
      }
      
      this.emit('connected', { socketId: this.socket.id })
    })
    
    this.socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason)
      this.connectionState.status = 'disconnected'
      this.stopHealthCheck()
      
      this.emit('disconnected', { reason })
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect()
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Network issues, try to reconnect
        this.scheduleReconnect()
      }
    })
    
    this.socket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error)
      this.handleConnectionError(error)
    })
    
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
      this.handleSocketError(error)
    })
    
    // Set up message event handlers
    this.setupMessageHandlers()
  }
  
  private setupMessageHandlers(): void {
    if (!this.socket) return
    
    const events = [
      'friend-request-received',
      'friend-request-response',
      'message-received',
      'user-status-changed',
      'user-typing',
      'user-stopped-typing',
      'random-chat:match-found',
      'random-chat:message-received',
      'random-chat:partner-typing',
      'random-chat:partner-stopped-typing',
      'random-chat:session-ended'
    ]
    
    events.forEach(event => {
      this.socket.on(event, (data: any) => {
        this.emit(event, data)
      })
    })
  }
  
  private handleConnectionError(error: any): void {
    try {
      const socketError = socketErrorHandler.classifyError(error)
      const strategy = socketErrorHandler.getRecoveryStrategy(socketError, this.connectionState)
      
      this.connectionState.errorCount++
      
      console.log('Connection error strategy:', strategy)
      
      if (strategy.fallback || socketErrorHandler.shouldFallbackToHTTP(this.connectionState)) {
        this.enableFallbackMode()
      } else if (strategy.retry && this.connectionState.retryCount < strategy.maxAttempts) {
        this.scheduleReconnect(strategy.delay)
      } else {
        this.connectionState.status = 'failed'
        this.enableFallbackMode()
      }
      
      this.emit('error', { error: socketError, strategy })
    } catch (handlerError) {
      console.error('Error in connection error handler:', handlerError)
      // Fallback to simple error handling
      this.connectionState.errorCount++
      this.connectionState.status = 'failed'
      this.enableFallbackMode()
      this.emit('error', { 
        error: { 
          message: error?.message || 'Unknown error', 
          type: 'connection',
          timestamp: new Date(),
          recoverable: true,
          severity: 'high'
        }, 
        strategy: null 
      })
    }
  }
  
  private handleSocketError(error: any): void {
    try {
      const socketError = socketErrorHandler.classifyError(error)
      
      if (!socketError.recoverable) {
        // Non-recoverable error, just log it
        console.error('Non-recoverable socket error:', error)
        return
      }
      
      this.handleConnectionError(error)
    } catch (handlerError) {
      console.error('Error in socket error handler:', handlerError)
      // Fallback to basic error handling
      this.handleConnectionError(error)
    }
  }
  
  private scheduleReconnect(delay?: number): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    
    if (this.connectionState.retryCount >= this.maxRetries) {
      console.log('Max reconnection attempts reached, enabling fallback mode')
      this.enableFallbackMode()
      return
    }
    
    const reconnectDelay = delay || Math.min(
      this.baseDelay * Math.pow(2, this.connectionState.retryCount),
      30000
    )
    
    console.log(`Scheduling reconnect in ${reconnectDelay}ms (attempt ${this.connectionState.retryCount + 1}/${this.maxRetries})`)
    
    this.connectionState.status = 'reconnecting'
    this.connectionState.retryCount++
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnect()
    }, reconnectDelay)
  }
  
  private reconnect(): void {
    console.log('Attempting to reconnect...')
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    this.connect().catch(error => {
      console.error('Reconnection failed:', error)
      this.handleConnectionError(error)
    })
  }
  
  private startHealthCheck(): void {
    this.stopHealthCheck()
    
    this.healthCheckInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', Date.now())
      }
    }, 30000) // Health check every 30 seconds
  }
  
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
  
  disconnect(): void {
    this.stopHealthCheck()
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    messageQueue.stopAutoSync()
    
    this.connectionState = {
      status: 'disconnected',
      transport: 'websocket',
      retryCount: 0,
      errorCount: 0,
      fallbackActive: false
    }
  }
  
  isConnected(): boolean {
    return this.connectionState.status === 'connected' && 
           this.socket && 
           this.socket.connected
  }
  
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }
  
  async sendMessage(data: any): Promise<void> {
    if (this.isConnected()) {
      this.socket.emit('send-message', {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      })
    } else {
      // Queue for HTTP fallback
      messageQueue.enqueue({
        type: 'message',
        payload: data,
        priority: 'high'
      })
    }
  }
  
  async sendFriendRequest(data: any): Promise<void> {
    if (this.isConnected()) {
      this.socket.emit('send-friend-request', {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      })
    } else {
      messageQueue.enqueue({
        type: 'friend_request',
        payload: data,
        priority: 'medium'
      })
    }
  }
  
  async sendFriendResponse(data: any): Promise<void> {
    if (this.isConnected()) {
      this.socket.emit('send-friend-response', {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      })
    } else {
      messageQueue.enqueue({
        type: 'friend_response',
        payload: data,
        priority: 'medium'
      })
    }
  }
  
  async updatePresence(data: any): Promise<void> {
    if (this.isConnected()) {
      this.socket.emit('user-status-update', data)
    } else {
      messageQueue.enqueue({
        type: 'presence',
        payload: data,
        priority: 'low'
      })
    }
  }
  
  async startTyping(data: any): Promise<void> {
    if (this.isConnected()) {
      this.socket.emit('start-typing', data)
    }
    // Don't queue typing indicators for HTTP fallback
  }
  
  async stopTyping(data: any): Promise<void> {
    if (this.isConnected()) {
      this.socket.emit('stop-typing', data)
    }
    // Don't queue typing indicators for HTTP fallback
  }
  
  enableFallbackMode(): void {
    if (!this.connectionState.fallbackActive) {
      console.log('Enabling HTTP fallback mode')
      this.connectionState.fallbackActive = true
      this.connectionState.status = 'fallback'
      this.connectionState.transport = 'http'
      
      messageQueue.startAutoSync()
      
      this.emit('fallback-enabled', {
        reason: 'Connection failed',
        queueStatus: messageQueue.getStatus()
      })
    }
  }
  
  disableFallbackMode(): void {
    if (this.connectionState.fallbackActive) {
      console.log('Disabling HTTP fallback mode')
      this.connectionState.fallbackActive = false
      
      // Process any remaining queued messages via socket
      messageQueue.stopAutoSync()
      
      this.emit('fallback-disabled', {
        queueStatus: messageQueue.getStatus()
      })
    }
  }
  
  isFallbackMode(): boolean {
    return this.connectionState.fallbackActive
  }
  
  async getHealthStatus(): Promise<any> {
    try {
      const response = await fetch('http://localhost:3001/api/socket-health')
      if (response.ok) {
        const serverHealth = await response.json()
        
        return {
          client: {
            connected: this.isConnected(),
            state: this.connectionState,
            errorSummary: socketErrorHandler.getErrorSummary(),
            queueStatus: messageQueue.getStatus()
          },
          server: serverHealth
        }
      }
      throw new Error('Health check failed')
    } catch (error) {
      return {
        client: {
          connected: this.isConnected(),
          state: this.connectionState,
          errorSummary: socketErrorHandler.getErrorSummary(),
          queueStatus: messageQueue.getStatus()
        },
        server: { status: 'unavailable', error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(callback)
  }
  
  off(event: string, callback?: Function): void {
    if (!this.eventHandlers.has(event)) return
    
    if (callback) {
      const handlers = this.eventHandlers.get(event)!
      const index = handlers.indexOf(callback)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    } else {
      this.eventHandlers.delete(event)
    }
  }
  
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }
}

// Export a singleton instance
export const connectionManager = new SocketConnectionManager()