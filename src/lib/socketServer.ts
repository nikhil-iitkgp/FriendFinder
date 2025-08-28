import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'
import { getToken } from 'next-auth/jwt'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'

export interface SocketUser {
  id: string
  username: string
  email: string
  socketId: string
}

export interface ServerToClientEvents {
  'message:received': (message: any) => void
  'message:delivered': (messageId: string) => void
  'message:read': (messageId: string) => void
  'user:online': (userId: string) => void
  'user:offline': (userId: string) => void
  'typing:start': (data: { chatId: string; userId: string; username: string }) => void
  'typing:stop': (data: { chatId: string; userId: string }) => void
  'friend:request': (data: any) => void
  'friend:accepted': (data: any) => void
  'error': (message: string) => void
}

export interface ClientToServerEvents {
  'message:send': (data: {
    chatId: string
    receiverId: string
    content: string
    type?: 'text' | 'image' | 'file'
  }) => void
  'message:read': (data: { chatId: string; messageId?: string }) => void
  'typing:start': (data: { chatId: string; receiverId: string }) => void
  'typing:stop': (data: { chatId: string; receiverId: string }) => void
  'user:join': () => void
}

export interface InterServerEvents {
  ping: () => void
}

export interface SocketData {
  user: SocketUser
}

export type SocketIOServer = ServerIO<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type SocketIOSocket = Parameters<Parameters<SocketIOServer['on']>[1]>[0]

// Store online users
const onlineUsers = new Map<string, SocketUser>()

export function initializeSocketIO(server: NetServer): SocketIOServer {
  const io = new ServerIO<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization

      if (!token) {
        return next(new Error('Authentication token required'))
      }

      // Verify JWT token
      const decoded = await getToken({
        req: {
          headers: {
            authorization: `Bearer ${token}`,
          },
        } as any,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (!decoded?.email) {
        return next(new Error('Invalid token'))
      }

      // Get user from database
      await dbConnect()
      const user = await User.findOne({ email: decoded.email }).select('username email')

      if (!user) {
        return next(new Error('User not found'))
      }

      // Store user data in socket
      socket.data.user = {
        id: (user._id as any).toString(),
        username: user.username,
        email: user.email,
        socketId: socket.id,
      }

      next()
    } catch (error) {
      console.error('Socket authentication error:', error)
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log(`User connected: ${user.username} (${socket.id})`)

    // Add user to online users
    onlineUsers.set(user.id, user)

    // Broadcast user online status to friends
    socket.broadcast.emit('user:online', user.id)

    // Handle user joining
    socket.on('user:join', async () => {
      try {
        // Update user's last seen
        await User.findByIdAndUpdate(user.id, { lastSeen: new Date() })
        
        // Join user to their personal room
        socket.join(`user:${user.id}`)
        
        console.log(`User ${user.username} joined their room`)
      } catch (error) {
        console.error('Error on user join:', error)
      }
    })

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        const { chatId, receiverId, content, type = 'text' } = data

        // Validate that users are friends
        const currentUser = await User.findById(user.id)
        const receiverUser = await User.findById(receiverId)

        if (!currentUser || !receiverUser) {
          socket.emit('error', 'User not found')
          return
        }

        if (!currentUser.isFriendWith(receiverId as any)) {
          socket.emit('error', 'Can only send messages to friends')
          return
        }

        // Create message
        const message = new Message({
          chatId,
          senderId: user.id,
          receiverId,
          content: content.trim(),
          type,
          status: 'sent',
        })

        await message.save()

        // Populate sender info
        await message.populate('senderId', 'username profilePicture')

        const messageData = {
          _id: message._id,
          chatId: message.chatId,
          senderId: {
            _id: message.senderId._id,
            username: (message.senderId as any).username,
            profilePicture: (message.senderId as any).profilePicture,
          },
          receiverId: message.receiverId,
          content: message.content,
          type: message.type,
          status: message.status,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        }

        // Send to receiver if online
        const receiverSocket = onlineUsers.get(receiverId)
        if (receiverSocket) {
          io.to(`user:${receiverId}`).emit('message:received', messageData)
          
          // Mark as delivered
          message.status = 'delivered'
          message.deliveredAt = new Date()
          await message.save()
          
          socket.emit('message:delivered', (message._id as any).toString())
        }

        // Send confirmation to sender
        socket.emit('message:received', messageData)

        console.log(`Message sent from ${user.username} to ${receiverId}`)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Handle marking messages as read
    socket.on('message:read', async (data) => {
      try {
        const { chatId, messageId } = data

        if (messageId) {
          // Mark specific message as read
          const message = await Message.findById(messageId)
          if (message && message.receiverId.toString() === user.id) {
            message.status = 'read'
            message.readAt = new Date()
            await message.save()

            // Notify sender
            const senderSocket = onlineUsers.get(message.senderId.toString())
            if (senderSocket) {
              io.to(`user:${message.senderId}`).emit('message:read', messageId)
            }
          }
        } else {
          // Mark all messages in chat as read
          await Message.markAsRead(chatId, user.id)
        }
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    })

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { chatId, receiverId } = data
      const receiverSocket = onlineUsers.get(receiverId)
      
      if (receiverSocket) {
        io.to(`user:${receiverId}`).emit('typing:start', {
          chatId,
          userId: user.id,
          username: user.username,
        })
      }
    })

    socket.on('typing:stop', (data) => {
      const { chatId, receiverId } = data
      const receiverSocket = onlineUsers.get(receiverId)
      
      if (receiverSocket) {
        io.to(`user:${receiverId}`).emit('typing:stop', {
          chatId,
          userId: user.id,
        })
      }
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.username} (${socket.id})`)
      
      // Remove from online users
      onlineUsers.delete(user.id)
      
      // Update last seen
      try {
        await User.findByIdAndUpdate(user.id, { lastSeen: new Date() })
      } catch (error) {
        console.error('Error updating last seen:', error)
      }
      
      // Broadcast user offline status
      socket.broadcast.emit('user:offline', user.id)
    })
  })

  return io
}

export { onlineUsers }
