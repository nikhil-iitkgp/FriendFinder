/**
 * Socket.IO implementation for App Router
 * This provides a mock implementation for development
 */

import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'

let io: ServerIO | null = null

export const getSocketIO = (): ServerIO | null => {
  if (process.env.NODE_ENV === 'development') {
    // In development, return null to gracefully handle missing socket server
    console.warn('Socket.IO server not available in development mode with App Router')
    return null
  }
  
  return io
}

export const initSocketIO = (server: NetServer): ServerIO => {
  if (io) {
    return io
  }

  io = new ServerIO(server, {
    path: '/api/socket.io',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`)
      console.log(`User ${userId} joined their room`)
    })

    socket.on('send-message', (data) => {
      // Broadcast message to recipient
      socket.to(`user-${data.recipientId}`).emit('receive-message', data)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export default getSocketIO
