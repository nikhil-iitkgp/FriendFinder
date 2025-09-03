import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'
import { getToken } from 'next-auth/jwt'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'
import RandomChatSession from '@/models/RandomChatSession'
import RandomChatQueue from '@/models/RandomChatQueue'
import { moderateContent } from '@/lib/content-moderation'

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
  // Random Chat Events
  'random-chat:match-found': (data: any) => void
  'random-chat:message-received': (message: any) => void
  'random-chat:partner-typing': () => void
  'random-chat:partner-stopped-typing': () => void
  'random-chat:partner-left': () => void
  'random-chat:session-ended': (reason: string) => void
  'random-chat:queue-position': (data: { position: number; estimatedWait: number }) => void
  // WebRTC Events for Random Chat
  'random-chat:webrtc-offer-received': (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => void
  'random-chat:webrtc-answer-received': (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => void
  'random-chat:webrtc-ice-candidate-received': (data: { sessionId: string; candidate: RTCIceCandidate }) => void
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
  // Random Chat Events
  'random-chat:join-queue': (preferences: any) => void
  'random-chat:leave-queue': () => void
  'random-chat:message-send': (data: {
    sessionId: string
    content: string
    type?: 'text' | 'image'
  }) => void
  'random-chat:typing-start': (sessionId: string) => void
  'random-chat:typing-stop': (sessionId: string) => void
  'random-chat:end-session': (sessionId: string) => void
  'random-chat:join-session': (sessionId: string) => void
  // WebRTC Events for Random Chat
  'random-chat:webrtc-offer': (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => void
  'random-chat:webrtc-answer': (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => void
  'random-chat:webrtc-ice-candidate': (data: { sessionId: string; candidate: RTCIceCandidate }) => void
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

// Random Chat Matching Service
let matchingInterval: NodeJS.Timeout | null = null

const startRandomChatMatching = (io: SocketIOServer) => {
  if (matchingInterval) {
    clearInterval(matchingInterval)
  }

  matchingInterval = setInterval(async () => {
    try {
      await performRandomChatMatching(io)
    } catch (error) {
      console.error('Error in random chat matching:', error)
    }
  }, 5000) // Run every 5 seconds

  console.log('Random chat matching service started')
}

const stopRandomChatMatching = () => {
  if (matchingInterval) {
    clearInterval(matchingInterval)
    matchingInterval = null
    console.log('Random chat matching service stopped')
  }
}

const performRandomChatMatching = async (io: SocketIOServer) => {
  try {
    await dbConnect()
    
    // Get all active queue entries
    const queueEntries = await RandomChatQueue.find({ isActive: true })
      .sort({ priority: -1, joinedAt: 1 })
    
    if (queueEntries.length < 2) {
      return // Need at least 2 people to match
    }

    const processedUsers = new Set<string>()
    
    for (const entry of queueEntries) {
      if (processedUsers.has(entry.userId.toString())) {
        continue
      }
      
      // Find a match for this user
      const match = await RandomChatQueue.findNextMatch(entry.userId, entry.preferences)
      
      if (match && !processedUsers.has(match.userId.toString())) {
        // Create session
        const sessionId = RandomChatSession.generateSessionId()
        
        const participants = [
          {
            userId: entry.userId,
            username: entry.username,
            anonymousId: entry.anonymousId,
            joinedAt: new Date(),
            isActive: true,
          },
          {
            userId: match.userId,
            username: match.username,
            anonymousId: match.anonymousId,
            joinedAt: new Date(),
            isActive: true,
          },
        ]

        const session = new RandomChatSession({
          sessionId,
          participants,
          status: 'active',
          chatType: entry.preferences.chatType,
          preferences: entry.preferences,
          metadata: {
            startTime: new Date(),
            messagesCount: 0,
            reportCount: 0,
          },
        })

        await session.save()
        
        // Remove both users from queue
        await RandomChatQueue.deleteMany({
          userId: { $in: [entry.userId, match.userId] },
        })
        
        // Notify both users
        const matchData1 = {
          sessionId,
          partner: {
            anonymousId: match.anonymousId,
            username: match.anonymousId,
          },
          chatType: entry.preferences.chatType,
          userAnonymousId: entry.anonymousId,
        }
        
        const matchData2 = {
          sessionId,
          partner: {
            anonymousId: entry.anonymousId,
            username: entry.anonymousId,
          },
          chatType: entry.preferences.chatType,
          userAnonymousId: match.anonymousId,
        }
        
        io.to(`user:${entry.userId}`).emit('random-chat:match-found', matchData1)
        io.to(`user:${match.userId}`).emit('random-chat:match-found', matchData2)
        
        console.log(`Random chat match created: ${entry.anonymousId} <-> ${match.anonymousId}`)
        
        // Mark as processed
        processedUsers.add(entry.userId.toString())
        processedUsers.add(match.userId.toString())
      } else {
        // No match found, increment retry count
        await entry.incrementRetry()
        
        // Send queue position update
        const position = await RandomChatQueue.countDocuments({
          'preferences.chatType': entry.preferences.chatType,
          joinedAt: { $lt: entry.joinedAt },
          isActive: true,
        }) + 1
        
        const estimatedWait = Math.max(30, 300 - entry.retryCount * 30) // Decrease wait time estimate
        
        io.to(`user:${entry.userId}`).emit('random-chat:queue-position', {
          position,
          estimatedWait,
        })
      }
    }
    
    // Clean up old queue entries
    await RandomChatQueue.cleanupOldEntries()
    
  } catch (error) {
    console.error('Error in performRandomChatMatching:', error)
  }
}

export function initializeSocketIO(server: NetServer): SocketIOServer {
  const io = new ServerIO<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    path: '/api/socket.io',
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

  io.on('connection', async (socket) => {
    const user = socket.data.user
    console.log(`User connected: ${user.username} (${socket.id})`)

    try {
      // Update user's last seen immediately on connection
      await dbConnect()
      await User.findByIdAndUpdate(user.id, { lastSeen: new Date() })

      // Add user to online users
      onlineUsers.set(user.id, user)

      // Join user to their personal room
      socket.join(`user:${user.id}`)

      // Broadcast user online status to friends
      await notifyFriendsOnlineStatus(user.id, true)

      console.log(`User ${user.username} is now online`)
    } catch (error) {
      console.error('Error updating user online status:', error)
    }

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

    // Random Chat Event Handlers
    
    // Join user to random chat session room
    socket.on('random-chat:join-session', async (sessionId: string) => {
      try {
        const session = await RandomChatSession.findOne({
          sessionId,
          'participants.userId': user.id,
        })
        
        if (session) {
          socket.join(`random-chat:${sessionId}`)
          console.log(`User ${user.username} joined random chat session: ${sessionId}`)
        }
      } catch (error) {
        console.error('Error joining random chat session:', error)
      }
    })

    // Handle random chat messages
    socket.on('random-chat:message-send', async (data) => {
      try {
        const { sessionId, content, type = 'text' } = data

        // Find the session
        const session = await RandomChatSession.findOne({
          sessionId,
          'participants.userId': user.id,
          status: 'active',
        })

        if (!session) {
          socket.emit('error', 'Session not found or inactive')
          return
        }

        // Get user's anonymous ID
        const anonymousId = session.getAnonymousId(user.id)
        if (!anonymousId) {
          socket.emit('error', 'Invalid session state')
          return
        }

        // Basic content filtering
        const filteredContent = content.trim()
        if (!filteredContent || filteredContent.length > 1000) {
          socket.emit('error', 'Invalid message content')
          return
        }

        // Apply content moderation
        const moderationResult = moderateContent(filteredContent, user.id)
        if (!moderationResult.isAllowed) {
          socket.emit('error', moderationResult.reason || 'Message blocked by content filter')
          return
        }

        // Add message to session (use moderated content)
        await session.addMessage(user.id, anonymousId, moderationResult.filteredContent || filteredContent, type)

        const messageData = {
          messageId: session.messages[session.messages.length - 1].messageId,
          sessionId,
          anonymousId,
          content: moderationResult.filteredContent || filteredContent,
          timestamp: new Date(),
          type,
          isOwn: false, // Will be set to true for sender
        }

        // Send to all participants in the session
        socket.to(`random-chat:${sessionId}`).emit('random-chat:message-received', messageData)
        
        // Send back to sender with isOwn flag
        socket.emit('random-chat:message-received', { ...messageData, isOwn: true })

        console.log(`Random chat message sent in session ${sessionId}`)
      } catch (error) {
        console.error('Error sending random chat message:', error)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Handle random chat typing indicators
    socket.on('random-chat:typing-start', (sessionId: string) => {
      socket.to(`random-chat:${sessionId}`).emit('random-chat:partner-typing')
    })

    socket.on('random-chat:typing-stop', (sessionId: string) => {
      socket.to(`random-chat:${sessionId}`).emit('random-chat:partner-stopped-typing')
    })

    // Handle ending random chat session
    socket.on('random-chat:end-session', async (sessionId: string) => {
      try {
        const session = await RandomChatSession.findOne({
          sessionId,
          'participants.userId': user.id,
          status: { $in: ['waiting', 'active'] },
        })

        if (session) {
          // End the session
          await session.endSession('user_left')
          
          // Notify partner
          socket.to(`random-chat:${sessionId}`).emit('random-chat:partner-left')
          
          // Notify all participants that session ended
          io.to(`random-chat:${sessionId}`).emit('random-chat:session-ended', 'user_left')
          
          // Remove users from session room
          const socketsInRoom = await io.in(`random-chat:${sessionId}`).fetchSockets()
          socketsInRoom.forEach(s => s.leave(`random-chat:${sessionId}`))
          
          console.log(`Random chat session ${sessionId} ended by ${user.username}`)
        }
      } catch (error) {
        console.error('Error ending random chat session:', error)
      }
    })

    // WebRTC Event Handlers for Random Chat
    
    // Handle WebRTC offer
    socket.on('random-chat:webrtc-offer', (data: { sessionId: string; offer: RTCSessionDescriptionInit }) => {
      socket.to(`random-chat:${data.sessionId}`).emit('random-chat:webrtc-offer-received', data)
    })

    // Handle WebRTC answer
    socket.on('random-chat:webrtc-answer', (data: { sessionId: string; answer: RTCSessionDescriptionInit }) => {
      socket.to(`random-chat:${data.sessionId}`).emit('random-chat:webrtc-answer-received', data)
    })

    // Handle ICE candidates
    socket.on('random-chat:webrtc-ice-candidate', (data: { sessionId: string; candidate: RTCIceCandidate }) => {
      socket.to(`random-chat:${data.sessionId}`).emit('random-chat:webrtc-ice-candidate-received', data)
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.username} (${socket.id})`)
      
      // Remove from online users
      onlineUsers.delete(user.id)
      
      // Update last seen
      try {
        await User.findByIdAndUpdate(user.id, { lastSeen: new Date() })
        
        // Notify friends that user is offline
        await notifyFriendsOnlineStatus(user.id, false)
        
        console.log(`User ${user.username} is now offline`)
      } catch (error) {
        console.error('Error updating last seen:', error)
      }
    })
  })

  // Start random chat matching service
  startRandomChatMatching(io)

  return io
}

// Helper function to notify friends about online status changes
async function notifyFriendsOnlineStatus(userId: string, isOnline: boolean) {
  try {
    await dbConnect()
    
    // Get user's friends
    const user = await User.findById(userId).select('friends username').lean()
    if (!user) return

    // Get online users to check who to notify
    const friendsToNotify = user.friends.filter(friendId => {
      // Check if friend is currently online
      for (const [socketId, socketUser] of onlineUsers.entries()) {
        if (socketUser.id === friendId.toString()) {
          return true
        }
      }
      return false
    })

    // Get the global io instance  
    if (friendsToNotify.length > 0) {
      const io = (global as any).socketIO
      if (io) {
        // Notify each online friend
        friendsToNotify.forEach(friendId => {
          io.to(`user:${friendId.toString()}`).emit('user:online', {
            userId,
            username: user.username,
            isOnline,
            timestamp: new Date().toISOString()
          })
        })
      }
    }

    console.log(`Notified ${friendsToNotify.length} friends of ${user.username}'s status: ${isOnline ? 'online' : 'offline'}`)
  } catch (error) {
    console.error('Error notifying friends of status change:', error)
  }
}

export { onlineUsers, startRandomChatMatching, stopRandomChatMatching }
