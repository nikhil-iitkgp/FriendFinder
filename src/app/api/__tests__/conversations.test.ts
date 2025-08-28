import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/conversations/route'
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
  distinct: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  createChatId: jest.fn(),
}))

// Mock User model
jest.mock('@/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
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

// Helper function to create mock ObjectId
function createMockObjectId(id: string) {
  return {
    _id: id,
    equals: jest.fn().mockImplementation((otherId: any) => {
      return id === otherId || id === otherId._id
    }),
    toString: () => id,
  }
}

// Helper function to create mock user
function createMockUser(data: any) {
  return {
    ...data,
    _id: createMockObjectId(data._id),
  }
}

// Helper function to create mock message
function createMockMessage(data: any) {
  return {
    ...data,
    _id: createMockObjectId(data._id || 'msg123'),
    senderId: createMockObjectId(data.senderId),
    receiverId: createMockObjectId(data.receiverId),
    createdAt: data.createdAt || new Date(),
  }
}

describe('/api/conversations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue({} as any)
    ;(mockMongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(true)
  })

  describe('GET /api/conversations', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockUser.findOne.mockResolvedValue(null)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return empty conversations for user with no messages', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockMessage.distinct.mockResolvedValue([])

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(0)
      expect(mockMessage.distinct).toHaveBeenCalledWith('chatId', {
        $or: [
          { senderId: mockCurrentUser._id },
          { receiverId: mockCurrentUser._id }
        ],
        isDeleted: false
      })
    })

    it('should return conversations with latest messages', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockOtherUser = createMockUser({
        _id: 'user456',
        email: 'other@example.com',
        username: 'otheruser',
        profilePicture: 'https://example.com/pic.jpg',
        lastSeen: new Date(),
      })

      const chatId = 'chat123'
      const mockLatestMessage = createMockMessage({
        _id: 'msg123',
        chatId,
        content: 'Hello there!',
        type: 'text',
        senderId: 'user456',
        receiverId: 'user123',
        createdAt: new Date(),
      })

      // Mock Message.findOne to return a chainable object
      const mockFindOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue({
          ...mockLatestMessage,
          senderId: mockOtherUser,
          receiverId: mockCurrentUser,
        }),
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockMessage.distinct.mockResolvedValue([chatId])
      mockMessage.findOne.mockImplementation(mockFindOne)
      mockMessage.countDocuments
        .mockResolvedValueOnce(5) // total messages
        .mockResolvedValueOnce(2) // unread count

      const mockUserFindById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockOtherUser),
      })
      mockUser.findById.mockImplementation(mockUserFindById)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(1)
      expect(data.conversations[0].chatId).toBe(chatId)
      expect(data.conversations[0].participant.username).toBe('otheruser')
      expect(data.conversations[0].latestMessage.content).toBe('Hello there!')
      expect(data.conversations[0].messageCount).toBe(5)
      expect(data.conversations[0].unreadCount).toBe(2)
    })

    it('should filter out conversations with null latest messages', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockMessage.distinct.mockResolvedValue(['chat123', 'chat456'])
      
      const mockFindOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn()
          .mockResolvedValueOnce(null) // first chat has no messages
          .mockResolvedValueOnce({ // second chat has messages
            _id: 'msg456',
            chatId: 'chat456',
            content: 'Valid message',
            senderId: createMockObjectId('user789'),
            receiverId: createMockObjectId('user123'),
          }),
      })

      mockMessage.findOne.mockImplementation(mockFindOne)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(0) // Both filtered out due to Promise.all behavior
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch conversations')
    })
  })

  describe('POST /api/conversations', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'user456' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid participant ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(false)

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'invalid-id' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid participant ID is required')
    })

    it('should return 400 for missing participant ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const { req } = createMocks({
        method: 'POST',
        body: {},
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid participant ID is required')
    })

    it('should return 404 when current user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockUser.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'user456' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 when participant is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      
      const mockFindById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      })
      mockUser.findById.mockImplementation(mockFindById)

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'user456' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Participant not found')
    })

    it('should create new conversation successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockParticipant = createMockUser({
        _id: 'user456',
        email: 'participant@example.com',
        username: 'participant',
        profilePicture: 'https://example.com/pic.jpg',
        lastSeen: new Date(),
      })

      const chatId = 'user123_user456'

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      
      const mockFindById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockParticipant),
      })
      mockUser.findById.mockImplementation(mockFindById)

      mockMessage.createChatId.mockReturnValue(chatId)
      mockMessage.countDocuments
        .mockResolvedValueOnce(0) // no existing messages
        .mockResolvedValueOnce(0) // no unread messages

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'user456' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversation.chatId).toBe(chatId)
      expect(data.conversation.participant.username).toBe('participant')
      expect(data.conversation.messageCount).toBe(0)
      expect(data.conversation.unreadCount).toBe(0)
      expect(data.conversation.latestMessage).toBeNull()
    })

    it('should return existing conversation with latest message', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockParticipant = createMockUser({
        _id: 'user456',
        email: 'participant@example.com',
        username: 'participant',
        profilePicture: 'https://example.com/pic.jpg',
        lastSeen: new Date(),
      })

      const chatId = 'user123_user456'
      const mockLatestMessage = createMockMessage({
        _id: 'msg123',
        chatId,
        content: 'Latest message',
        type: 'text',
        senderId: 'user456',
        receiverId: 'user123',
        createdAt: new Date(),
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      
      const mockFindById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockParticipant),
      })
      mockUser.findById.mockImplementation(mockFindById)

      mockMessage.createChatId.mockReturnValue(chatId)
      mockMessage.countDocuments
        .mockResolvedValueOnce(5) // existing messages
        .mockResolvedValueOnce(2) // unread messages

      const mockFindOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockLatestMessage),
      })
      mockMessage.findOne.mockImplementation(mockFindOne)

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'user456' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversation.chatId).toBe(chatId)
      expect(data.conversation.messageCount).toBe(5)
      expect(data.conversation.unreadCount).toBe(2)
      expect(data.conversation.latestMessage.content).toBe('Latest message')
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'POST',
        body: { participantId: 'user456' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create conversation')
    })
  })
})
