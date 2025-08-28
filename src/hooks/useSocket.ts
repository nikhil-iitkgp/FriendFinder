'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface UseSocketReturn {
  socket: any | null
  isConnected: boolean
  connectionError: string | null
  sendFriendRequestNotification: (data: any) => void
  sendFriendResponseNotification: (data: any) => void
  sendMessage: (data: any) => void
  startTyping: (data: any) => void
  stopTyping: (data: any) => void
  onFriendRequestReceived: (callback: (data: any) => void) => void
  onFriendRequestResponse: (callback: (data: any) => void) => void
  onMessageReceived: (callback: (data: any) => void) => void
  onUserStatusChanged: (callback: (data: any) => void) => void
  onUserTyping: (callback: (data: any) => void) => void
  onUserStoppedTyping: (callback: (data: any) => void) => void
  removeAllListeners: () => void
}

export function useSocket(): UseSocketReturn {
  const { data: session, status } = useSession()
  const [socket, setSocket] = useState<any | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const friendRequestCallbackRef = useRef<((data: any) => void) | null>(null)
  const friendResponseCallbackRef = useRef<((data: any) => void) | null>(null)
  const messageCallbackRef = useRef<((data: any) => void) | null>(null)
  const statusChangeCallbackRef = useRef<((data: any) => void) | null>(null)
  const typingCallbackRef = useRef<((data: any) => void) | null>(null)
  const stoppedTypingCallbackRef = useRef<((data: any) => void) | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || !session?.user) return

    console.log('Initializing Socket.IO connection...')

    import('socket.io-client').then((socketIO) => {
      const io = socketIO.default || socketIO.io || socketIO

      const socketInstance = io({
        path: '/api/socket',
        transports: ['polling', 'websocket'],
        timeout: 10000,
      })

      setSocket(socketInstance)

      socketInstance.on('connect', () => {
        console.log('Socket.IO connected:', socketInstance.id)
        setIsConnected(true)
        setConnectionError(null)

        const userData = {
          userId: session.user.id || '',
          username: session.user.name || '',
          email: session.user.email || '',
        }
        
        socketInstance.emit('user-register', userData)
      })

      socketInstance.on('disconnect', () => {
        console.log('Socket.IO disconnected')
        setIsConnected(false)
      })

      socketInstance.on('connect_error', (error: any) => {
        console.error('Socket.IO connection error:', error)
        setConnectionError(error.message)
        setIsConnected(false)
      })

      socketInstance.on('friend-request-received', (data: any) => {
        if (friendRequestCallbackRef.current) {
          friendRequestCallbackRef.current(data)
        }
      })

      socketInstance.on('friend-request-response', (data: any) => {
        if (friendResponseCallbackRef.current) {
          friendResponseCallbackRef.current(data)
        }
      })

      socketInstance.on('message-received', (data: any) => {
        if (messageCallbackRef.current) {
          messageCallbackRef.current(data)
        }
      })

      socketInstance.on('user-status-changed', (data: any) => {
        if (statusChangeCallbackRef.current) {
          statusChangeCallbackRef.current(data)
        }
      })

      socketInstance.on('user-typing', (data: any) => {
        if (typingCallbackRef.current) {
          typingCallbackRef.current(data)
        }
      })

      socketInstance.on('user-stopped-typing', (data: any) => {
        if (stoppedTypingCallbackRef.current) {
          stoppedTypingCallbackRef.current(data)
        }
      })
    }).catch((error) => {
      console.error('Failed to load socket.io-client:', error)
      setConnectionError('Failed to load socket.io-client')
    })

    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [session, status])

  const sendFriendRequestNotification = useCallback((data: any) => {
    if (socket && isConnected) {
      const payload = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      socket.emit('send-friend-request', payload)
    }
  }, [socket, isConnected])

  const sendFriendResponseNotification = useCallback((data: any) => {
    if (socket && isConnected) {
      const payload = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      socket.emit('send-friend-response', payload)
    }
  }, [socket, isConnected])

  const sendMessage = useCallback((data: any) => {
    if (socket && isConnected) {
      const payload = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      }
      socket.emit('send-message', payload)
    }
  }, [socket, isConnected])

  const startTyping = useCallback((data: any) => {
    if (socket && isConnected) {
      socket.emit('start-typing', data)
    }
  }, [socket, isConnected])

  const stopTyping = useCallback((data: any) => {
    if (socket && isConnected) {
      socket.emit('stop-typing', data)
    }
  }, [socket, isConnected])

  const onFriendRequestReceived = useCallback((callback: (data: any) => void) => {
    friendRequestCallbackRef.current = callback
  }, [])

  const onFriendRequestResponse = useCallback((callback: (data: any) => void) => {
    friendResponseCallbackRef.current = callback
  }, [])

  const onMessageReceived = useCallback((callback: (data: any) => void) => {
    messageCallbackRef.current = callback
  }, [])

  const onUserStatusChanged = useCallback((callback: (data: any) => void) => {
    statusChangeCallbackRef.current = callback
  }, [])

  const onUserTyping = useCallback((callback: (data: any) => void) => {
    typingCallbackRef.current = callback
  }, [])

  const onUserStoppedTyping = useCallback((callback: (data: any) => void) => {
    stoppedTypingCallbackRef.current = callback
  }, [])

  const removeAllListeners = useCallback(() => {
    friendRequestCallbackRef.current = null
    friendResponseCallbackRef.current = null
    messageCallbackRef.current = null
    statusChangeCallbackRef.current = null
    typingCallbackRef.current = null
    stoppedTypingCallbackRef.current = null
  }, [])

  return {
    socket,
    isConnected,
    connectionError,
    sendFriendRequestNotification,
    sendFriendResponseNotification,
    sendMessage,
    startTyping,
    stopTyping,
    onFriendRequestReceived,
    onFriendRequestResponse,
    onMessageReceived,
    onUserStatusChanged,
    onUserTyping,
    onUserStoppedTyping,
    removeAllListeners,
  }
}
