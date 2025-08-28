import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/messages/route'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
import Message from '@/models/Message'
import User from '@/models/User'
import mongoose from 'mongoose'
import { createMocks } from 'node-mocks-http'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock database connection
jest.mock('@/lib/mongoose', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Message model
jest.mock('@/models/Message', () => ({
  getChatMessages: jest.fn(),
  createChatId: jest.fn(),
}))

// Mock User model
jest.mock('@/models/User', () => ({
  findOne: jest.fn(),
}))

// Mock mongoose ObjectId
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>
const mockMessage = Message as jest.Mocked<typeof Message>
const mockUser = User as jest.Mocked<typeof User>
const mockMongoose = mongoose as jest.Mocked<typeof mongoose>

// Helper function to create mock user
function createMockUser(data: any) {
  return {
    ...data,
    _id: data._id,
    isFriendWith: jest.fn(),
  }
}

// Helper function to create mock message
function createMockMessage(data: any) {
  return {
    ...data,
    _id: data._id || 'msg123',
    senderId: {
      _id: data.senderId,
      username: data.senderUsername || 'sender',
      profilePicture: data.senderPicture || null,
    },
    createdAt: data.createdAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  }
}

// Mock Message constructor
const MockMessageConstructor = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'new-message-id',
  save: jest.fn().mockResolvedValue(data),
  populate: jest.fn().mockResolvedValue({
    ...data,
    senderId: {
      _id: data.senderId,
      username: 'testuser',
      profilePicture: null,
    },
  }),
}))

// Replace the Message mock with constructor
jest.mock('@/models/Message', () => MockMessageConstructor)
MockMessageConstructor.getChatMessages = jest.fn()
MockMessageConstructor.createChatId = jest.fn()

describe('/api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue(undefined)
    mockMongoose.Types.ObjectId.isValid.mockReturnValue(true)
  })

  describe('GET /api/messages', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages?friendId=friend123',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid friend ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(false)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages?friendId=invalid-id',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid friend ID is required')
    })

    it('should return 400 for missing friend ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid friend ID is required')
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockUser.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages?friendId=friend123',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 403 when users are not friends', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockCurrentUser.isFriendWith.mockReturnValue(false)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages?friendId=friend123',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Can only view messages with friends')
    })

    it('should return messages successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockMessages = [
        createMockMessage({
          _id: 'msg2',
          chatId: 'chat123',
          senderId: 'friend123',
          receiverId: 'user123',
          content: 'Second message',
          type: 'text',
          status: 'delivered',
          senderUsername: 'friend',
        }),
        createMockMessage({
          _id: 'msg1',
          chatId: 'chat123',
          senderId: 'user123',
          receiverId: 'friend123',
          content: 'First message',
          type: 'text',
          status: 'read',
          senderUsername: 'testuser',
        }),
      ]

      mockCurrentUser.isFriendWith.mockReturnValue(true)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      MockMessageConstructor.getChatMessages.mockResolvedValue(mockMessages)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages?friendId=friend123&limit=50',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toHaveLength(2)
      expect(data.messages[0].content).toBe('First message') // Reversed order
      expect(data.messages[1].content).toBe('Second message')
      expect(data.count).toBe(2)
      expect(data.hasMore).toBe(false)
      expect(MockMessageConstructor.getChatMessages).toHaveBeenCalledWith(
        'user123',
        'friend123',
        50,
        undefined
      )
    })

    it('should handle pagination with before parameter', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockMessages = new Array(25).fill(null).map((_, i) => createMockMessage({
        _id: `msg${i}`,
        chatId: 'chat123',
        senderId: 'user123',
        receiverId: 'friend123',
        content: `Message ${i}`,
      }))

      mockCurrentUser.isFriendWith.mockReturnValue(true)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      MockMessageConstructor.getChatMessages.mockResolvedValue(mockMessages)

      const beforeDate = '2023-01-01T00:00:00.000Z'
      const { req } = createMocks({
        method: 'GET',
        url: `/api/messages?friendId=friend123&limit=25&before=${beforeDate}`,
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toHaveLength(25)
      expect(data.hasMore).toBe(true)
      expect(MockMessageConstructor.getChatMessages).toHaveBeenCalledWith(
        'user123',
        'friend123',
        25,
        new Date(beforeDate)
      )
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/messages?friendId=friend123',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/messages', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: 'Hello' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid friend ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(false)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'invalid-id', content: 'Hello' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid friend ID is required')
    })

    it('should return 400 for missing content', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: '' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Message content is required')
    })

    it('should return 400 for content exceeding character limit', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const longContent = 'a'.repeat(2001)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: longContent },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Message cannot exceed 2000 characters')
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockUser.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: 'Hello' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 403 when users are not friends', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockCurrentUser.isFriendWith.mockReturnValue(false)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: 'Hello' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Can only send messages to friends')
    })

    it('should send message successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const chatId = 'user123_friend123'

      mockCurrentUser.isFriendWith.mockReturnValue(true)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      MockMessageConstructor.createChatId.mockReturnValue(chatId)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: 'Hello there!', type: 'text' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message.content).toBe('Hello there!')
      expect(data.message.type).toBe('text')
      expect(data.message.status).toBe('sent')
      expect(data.message.chatId).toBe(chatId)
      expect(MockMessageConstructor).toHaveBeenCalledWith({
        chatId,
        senderId: 'user123',
        receiverId: 'friend123',
        content: 'Hello there!',
        type: 'text',
        status: 'sent',
      })
    })

    it('should default to text type when not specified', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const chatId = 'user123_friend123'

      mockCurrentUser.isFriendWith.mockReturnValue(true)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      MockMessageConstructor.createChatId.mockReturnValue(chatId)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: 'Hello without type' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message.type).toBe('text')
    })

    it('should trim whitespace from content', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const chatId = 'user123_friend123'

      mockCurrentUser.isFriendWith.mockReturnValue(true)
      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      MockMessageConstructor.createChatId.mockReturnValue(chatId)

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: '   Hello with spaces   ' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(MockMessageConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello with spaces',
        })
      )
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'POST',
        body: { friendId: 'friend123', content: 'Hello' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})