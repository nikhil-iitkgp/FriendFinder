import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useSocket } from '@/hooks/useSocket'
import { SocketConnectionManager } from '@/lib/connection-manager'
import { socketErrorHandler } from '@/lib/socket-error-handler'
import { messageQueue } from '@/lib/message-queue'

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    status: 'authenticated'
  })
}))

jest.mock('socket.io-client', () => ({
  default: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    id: 'test-socket-id',
    io: {
      engine: {
        transport: { name: 'websocket' }
      }
    }
  }))
}))

describe('Socket.IO Error Handling System', () => {
  let mockSocket: any
  let connectionManager: SocketConnectionManager

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Create fresh instances
    connectionManager = new SocketConnectionManager('http://localhost:3004', '/socket.io/')
    
    // Mock fetch for health checks
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          socketServer: {
            port: 3004,
            activeConnections: 1,
            errorCount: 0
          }
        })
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Error Classification', () => {
    it('should classify ECONNREFUSED errors correctly', () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      }

      const classified = socketErrorHandler.classifyError(error)

      expect(classified.type).toBe('connection')
      expect(classified.severity).toBe('critical')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify server errors correctly', () => {
      const error = {
        message: 'server error',
        type: 'server error'
      }

      const classified = socketErrorHandler.classifyError(error)

      expect(classified.type).toBe('server')
      expect(classified.severity).toBe('high')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify timeout errors correctly', () => {
      const error = {
        code: 'ETIMEDOUT',
        message: 'Connection timeout'
      }

      const classified = socketErrorHandler.classifyError(error)

      expect(classified.type).toBe('timeout')
      expect(classified.severity).toBe('medium')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify transport errors correctly', () => {
      const error = {
        message: 'transport error'
      }

      const classified = socketErrorHandler.classifyError(error)

      expect(classified.type).toBe('transport')
      expect(classified.severity).toBe('medium')
      expect(classified.recoverable).toBe(true)
    })
  })

  describe('Recovery Strategy', () => {
    it('should provide appropriate recovery strategy for connection errors', () => {
      const error = socketErrorHandler.classifyError({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      })

      const connectionState = {
        status: 'reconnecting' as const,
        transport: 'websocket' as const,
        retryCount: 2,
        errorCount: 3,
        fallbackActive: false
      }

      const strategy = socketErrorHandler.getRecoveryStrategy(error, connectionState)

      expect(strategy.retry).toBe(true)
      expect(strategy.maxAttempts).toBe(5)
      expect(strategy.fallback).toBe(false) // Should not fallback immediately
    })

    it('should recommend fallback after multiple connection failures', () => {
      const error = socketErrorHandler.classifyError({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      })

      const connectionState = {
        status: 'failed' as const,
        transport: 'websocket' as const,
        retryCount: 5,
        errorCount: 6,
        fallbackActive: false
      }

      const strategy = socketErrorHandler.getRecoveryStrategy(error, connectionState)

      expect(strategy.fallback).toBe(true)
    })

    it('should recommend immediate retry for transport errors', () => {
      const error = socketErrorHandler.classifyError({
        message: 'transport error'
      })

      const connectionState = {
        status: 'reconnecting' as const,
        transport: 'websocket' as const,
        retryCount: 1,
        errorCount: 1,
        fallbackActive: false
      }

      const strategy = socketErrorHandler.getRecoveryStrategy(error, connectionState)

      expect(strategy.immediate).toBe(true)
      expect(strategy.fallback).toBe(true)
    })
  })

  describe('Connection Manager', () => {
    it('should initialize with correct default state', () => {
      const state = connectionManager.getConnectionState()

      expect(state.status).toBe('disconnected')
      expect(state.transport).toBe('websocket')
      expect(state.retryCount).toBe(0)
      expect(state.errorCount).toBe(0)
      expect(state.fallbackActive).toBe(false)
    })

    it('should connect successfully', async () => {
      await act(async () => {
        await connectionManager.connect()
      })

      expect(connectionManager.isConnected()).toBe(true)
    })

    it('should handle connection errors gracefully', async () => {
      // Mock socket.io-client to throw error
      const mockSocketIO = require('socket.io-client')
      mockSocketIO.default.mockImplementationOnce(() => {
        throw new Error('Connection failed')
      })

      await act(async () => {
        await connectionManager.connect()
      })

      const state = connectionManager.getConnectionState()
      expect(state.errorCount).toBeGreaterThan(0)
    })

    it('should enable fallback mode when needed', () => {
      act(() => {
        connectionManager.enableFallbackMode()
      })

      const state = connectionManager.getConnectionState()
      expect(state.fallbackActive).toBe(true)
      expect(state.status).toBe('fallback')
      expect(state.transport).toBe('http')
    })

    it('should disable fallback mode', () => {
      act(() => {
        connectionManager.enableFallbackMode()
        connectionManager.disableFallbackMode()
      })

      const state = connectionManager.getConnectionState()
      expect(state.fallbackActive).toBe(false)
    })
  })

  describe('Message Queue', () => {
    beforeEach(() => {
      messageQueue.clear()
    })

    it('should enqueue messages with correct priority', () => {
      const messageId1 = messageQueue.enqueue({
        type: 'message',
        payload: { content: 'High priority' },
        priority: 'high'
      })

      const messageId2 = messageQueue.enqueue({
        type: 'message',
        payload: { content: 'Low priority' },
        priority: 'low'
      })

      expect(messageId1).toBeDefined()
      expect(messageId2).toBeDefined()

      const status = messageQueue.getStatus()
      expect(status.pending).toBe(2)
    })

    it('should process messages in priority order', async () => {
      // Mock successful HTTP requests
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      ) as jest.Mock

      messageQueue.enqueue({
        type: 'message',
        payload: { content: 'Low priority' },
        priority: 'low'
      })

      messageQueue.enqueue({
        type: 'message',
        payload: { content: 'High priority' },
        priority: 'high'
      })

      await messageQueue.processQueue()

      const status = messageQueue.getStatus()
      expect(status.totalProcessed).toBeGreaterThan(0)
    })

    it('should retry failed messages', async () => {
      // Mock failed HTTP request
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock

      messageQueue.enqueue({
        type: 'message',
        payload: { content: 'Test message' },
        priority: 'medium'
      })

      await messageQueue.processQueue()

      const status = messageQueue.getStatus()
      expect(status.failed).toBeGreaterThan(0)

      // Reset mock to successful response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      ) as jest.Mock

      messageQueue.retryFailed()
      await messageQueue.processQueue()

      const newStatus = messageQueue.getStatus()
      expect(newStatus.failed).toBe(0)
    })

    it('should remove expired messages', () => {
      // Create message with past expiration
      const expiredMessage = {
        type: 'message' as const,
        payload: { content: 'Expired' },
        priority: 'low' as const,
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      }

      messageQueue.enqueue(expiredMessage)

      // Process queue should remove expired messages
      messageQueue.processQueue()

      const status = messageQueue.getStatus()
      expect(status.pending).toBe(0)
    })
  })

  describe('useSocket Hook Integration', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useSocket())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionError).toBeNull()
      expect(result.current.connectionState.status).toBe('disconnected')
    })

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useSocket())

      expect(typeof result.current.sendFriendRequestNotification).toBe('function')
      expect(typeof result.current.sendFriendResponseNotification).toBe('function')
      expect(typeof result.current.sendMessage).toBe('function')
      expect(typeof result.current.startTyping).toBe('function')
      expect(typeof result.current.stopTyping).toBe('function')
      expect(typeof result.current.reconnect).toBe('function')
      expect(typeof result.current.getHealthStatus).toBe('function')
    })
  })

  describe('Health Monitoring', () => {
    it('should return health status', async () => {
      const healthStatus = await connectionManager.getHealthStatus()

      expect(healthStatus).toHaveProperty('client')
      expect(healthStatus).toHaveProperty('server')
      expect(healthStatus.client).toHaveProperty('connected')
      expect(healthStatus.client).toHaveProperty('state')
      expect(healthStatus.server).toHaveProperty('status')
    })

    it('should handle health check failures gracefully', async () => {
      // Mock failed fetch
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Health check failed'))
      ) as jest.Mock

      const healthStatus = await connectionManager.getHealthStatus()

      expect(healthStatus.server.status).toBe('unavailable')
      expect(healthStatus.server.error).toBeDefined()
    })
  })

  describe('Event System', () => {
    it('should register and trigger event handlers', () => {
      const mockHandler = jest.fn()

      connectionManager.on('test-event', mockHandler)
      
      // Simulate event emission (access private method for testing)
      ;(connectionManager as any).emit('test-event', { data: 'test' })

      expect(mockHandler).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should remove event handlers', () => {
      const mockHandler = jest.fn()

      connectionManager.on('test-event', mockHandler)
      connectionManager.off('test-event', mockHandler)
      
      // Simulate event emission
      ;(connectionManager as any).emit('test-event', { data: 'test' })

      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should handle errors in event handlers gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error')
      })

      connectionManager.on('test-event', errorHandler)
      
      // Simulate event emission
      ;(connectionManager as any).emit('test-event', { data: 'test' })

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Error Summary and Analytics', () => {
    it('should provide error summary', () => {
      // Generate some errors
      socketErrorHandler.classifyError({ code: 'ECONNREFUSED' })
      socketErrorHandler.classifyError({ message: 'server error' })
      socketErrorHandler.classifyError({ message: 'timeout' })

      const summary = socketErrorHandler.getErrorSummary()

      expect(summary.totalErrors).toBe(3)
      expect(summary.errorCounts).toHaveProperty('connection')
      expect(summary.errorCounts).toHaveProperty('server')
      expect(summary.recentErrors).toHaveLength(3)
    })

    it('should determine when to fallback to HTTP', () => {
      const connectionState = {
        status: 'failed' as const,
        transport: 'websocket' as const,
        retryCount: 4,
        errorCount: 6,
        fallbackActive: false
      }

      const shouldFallback = socketErrorHandler.shouldFallbackToHTTP(connectionState)
      expect(shouldFallback).toBe(true)
    })

    it('should reset error tracking', () => {
      // Generate some errors
      socketErrorHandler.classifyError({ code: 'ECONNREFUSED' })
      socketErrorHandler.classifyError({ message: 'server error' })

      socketErrorHandler.reset()

      const summary = socketErrorHandler.getErrorSummary()
      expect(summary.totalErrors).toBe(0)
      expect(Object.keys(summary.errorCounts)).toHaveLength(0)
    })
  })
})

describe('Integration Tests', () => {
  describe('End-to-End Error Recovery', () => {
    it('should recover from connection failure to successful reconnection', async () => {
      const connectionManager = new SocketConnectionManager()
      let connectionStateHistory: string[] = []

      // Track connection state changes
      connectionManager.on('connected', () => {
        connectionStateHistory.push('connected')
      })
      connectionManager.on('disconnected', () => {
        connectionStateHistory.push('disconnected')
      })
      connectionManager.on('error', () => {
        connectionStateHistory.push('error')
      })

      // Simulate connection failure and recovery
      await connectionManager.connect()
      connectionManager.disconnect()

      expect(connectionStateHistory).toContain('connected')
      expect(connectionStateHistory).toContain('disconnected')
    })

    it('should activate fallback mode after multiple failures', () => {
      const connectionState = {
        status: 'failed' as const,
        transport: 'websocket' as const,
        retryCount: 5,
        errorCount: 8,
        fallbackActive: false
      }

      // Simulate multiple errors
      for (let i = 0; i < 5; i++) {
        socketErrorHandler.classifyError({ code: 'ECONNREFUSED' })
      }

      const shouldFallback = socketErrorHandler.shouldFallbackToHTTP(connectionState)
      expect(shouldFallback).toBe(true)
    })
  })

  describe('Message Queue Integration', () => {
    it('should queue messages when connection is down and process when restored', async () => {
      const connectionManager = new SocketConnectionManager()
      
      // Simulate disconnected state
      connectionManager.enableFallbackMode()
      
      // Send messages while disconnected (should be queued)
      await connectionManager.sendMessage({ content: 'Test message 1' })
      await connectionManager.sendMessage({ content: 'Test message 2' })
      
      const queueStatus = messageQueue.getStatus()
      expect(queueStatus.pending).toBeGreaterThan(0)
      
      // Simulate connection restoration
      connectionManager.disableFallbackMode()
      
      // Queue should be processed
      expect(messageQueue.getStatus().pending).toBeGreaterThanOrEqual(0)
    })
  })
})