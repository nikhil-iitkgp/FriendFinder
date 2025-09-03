import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO
    }
  }
}

export interface SocketUser {
  userId: string
  username: string
  email: string
  socketId: string
}

// Store active users and their socket connections
export const activeUsers = new Map<string, SocketUser>()

export function initializeSocketIO(server: NetServer): ServerIO {
  const io = new ServerIO(server, {
    path: '/api/socket.io',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXTAUTH_URL 
        : ['http://localhost:3000', 'http://localhost:3003'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  io.on('connection', async (socket) => {
    console.log('Socket connected:', socket.id)

    // Handle user authentication and registration
    socket.on('authenticate', async (data: { sessionToken?: string }) => {
      try {
        // For now, we'll handle authentication differently since we can't access session directly
        // The client will send user info after authenticating
        console.log('Socket authentication requested for:', socket.id)
        socket.emit('auth_requested')
      } catch (error) {
        console.error('Socket authentication error:', error)
        socket.emit('auth_error', { message: 'Authentication failed' })
      }
    })

    // Handle user registration (after client-side authentication)
    socket.on('register_user', async (userData: { userId: string, username: string, email: string }) => {
      try {
        const { userId, username, email } = userData
        
        // Validate user data
        if (!userId || !username || !email) {
          socket.emit('registration_error', { message: 'Invalid user data' })
          return
        }

        // Remove user from any existing connections (in case of reconnection)
        for (const [socketId, user] of activeUsers.entries()) {
          if (user.userId === userId) {
            activeUsers.delete(socketId)
            break
          }
        }

        // Register the user with their socket
        const socketUser: SocketUser = {
          userId,
          username,
          email,
          socketId: socket.id
        }

        activeUsers.set(socket.id, socketUser)
        socket.join(`user:${userId}`) // Join a room for this user

        console.log(`User registered: ${username} (${userId}) on socket ${socket.id}`)
        
        // Notify client of successful registration
        socket.emit('registration_success', { 
          message: 'Successfully connected to real-time services',
          userId,
          socketId: socket.id
        })

        // Notify friends that user is online
        await notifyFriendsOnlineStatus(userId, true)

      } catch (error) {
        console.error('Socket registration error:', error)
        socket.emit('registration_error', { message: 'Registration failed' })
      }
    })

    // Handle friend request events
    socket.on('friend_request_sent', async (data: { 
      targetUserId: string, 
      fromUserId: string, 
      fromUserName: string,
      fromUserAvatar?: string 
    }) => {
      try {
        const { targetUserId, fromUserId, fromUserName, fromUserAvatar } = data
        
        // Send real-time notification to target user
        io.to(`user:${targetUserId}`).emit('friend_request_received', {
          requestId: `${fromUserId}_${Date.now()}`, // Temporary ID for UI
          from: fromUserId,
          fromName: fromUserName,
          fromAvatar: fromUserAvatar,
          message: `${fromUserName} sent you a friend request`,
          timestamp: new Date().toISOString()
        })

        console.log(`Friend request notification sent from ${fromUserName} to user ${targetUserId}`)
      } catch (error) {
        console.error('Friend request notification error:', error)
      }
    })

    // Handle friend request response events
    socket.on('friend_request_responded', async (data: {
      requesterId: string,
      responderName: string,
      action: 'accepted' | 'rejected'
    }) => {
      try {
        const { requesterId, responderName, action } = data

        // Notify the original requester
        io.to(`user:${requesterId}`).emit('friend_request_response', {
          action,
          responderName,
          message: action === 'accepted' 
            ? `${responderName} accepted your friend request!`
            : `${responderName} declined your friend request`,
          timestamp: new Date().toISOString()
        })

        console.log(`Friend request ${action} notification sent to user ${requesterId}`)
      } catch (error) {
        console.error('Friend request response notification error:', error)
      }
    })

    // Handle chat messages
    socket.on('send_message', async (data: {
      targetUserId: string,
      message: string,
      senderId: string,
      senderName: string
    }) => {
      try {
        const { targetUserId, message, senderId, senderName } = data

        // TODO: Save message to database (will be implemented in Step 19)
        
        // Send message to target user
        io.to(`user:${targetUserId}`).emit('message_received', {
          messageId: `msg_${Date.now()}`, // Temporary ID
          from: senderId,
          fromName: senderName,
          message,
          timestamp: new Date().toISOString()
        })

        // Send confirmation back to sender
        socket.emit('message_sent', {
          messageId: `msg_${Date.now()}`,
          targetUserId,
          message,
          timestamp: new Date().toISOString()
        })

        console.log(`Message sent from ${senderName} to user ${targetUserId}`)
      } catch (error) {
        console.error('Message sending error:', error)
        socket.emit('message_error', { message: 'Failed to send message' })
      }
    })

    // Handle typing indicators
    socket.on('typing_start', (data: { targetUserId: string, senderName: string }) => {
      io.to(`user:${data.targetUserId}`).emit('user_typing', {
        userId: activeUsers.get(socket.id)?.userId,
        userName: data.senderName
      })
    })

    socket.on('typing_stop', (data: { targetUserId: string }) => {
      io.to(`user:${data.targetUserId}`).emit('user_stopped_typing', {
        userId: activeUsers.get(socket.id)?.userId
      })
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        const user = activeUsers.get(socket.id)
        if (user) {
          console.log(`User disconnected: ${user.username} (${user.userId})`)
          
          // Notify friends that user is offline
          await notifyFriendsOnlineStatus(user.userId, false)
          
          // Remove from active users
          activeUsers.delete(socket.id)
        }
      } catch (error) {
        console.error('Disconnect handling error:', error)
      }
    })
  })

  return io
}

// Helper function to notify friends about online status
async function notifyFriendsOnlineStatus(userId: string, isOnline: boolean) {
  try {
    await dbConnect()
    
    // Get user's friends
    const user = await User.findById(userId).select('friends username').lean()
    if (!user) return

    // Get the socket instance from global
    const io = (global as any).socketIO as ServerIO
    if (!io) return

    // Notify each friend
    for (const friendId of user.friends) {
      io.to(`user:${friendId.toString()}`).emit('friend_status_change', {
        userId,
        username: user.username,
        isOnline,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error notifying friends of status change:', error)
  }
}

// Global variable to store the io instance
declare global {
  var socketIO: ServerIO | undefined
}
