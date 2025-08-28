import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/friends/request/route'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
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

// Mock User model
jest.mock('@/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
}))

// Mock mongoose ObjectId
jest.mock('mongoose', () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(),
    },
  },
}))

// Create a mock ObjectId class for testing
class MockObjectId {
  constructor(public id: string) {}
  equals(other: MockObjectId | string) {
    return this.id === (typeof other === 'string' ? other : other.id)
  }
  toString() {
    return this.id
  }
}

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>
const mockUser = User as jest.Mocked<typeof User>
const mockMongoose = mongoose as jest.Mocked<typeof mongoose>

// Helper function to create mock user with friend request methods
function createMockUser(data: any) {
  return {
    ...data,
    _id: new MockObjectId(data._id),
    isFriendWith: jest.fn(),
    hasPendingRequestTo: jest.fn(),
    hasPendingRequestFrom: jest.fn(),
    save: jest.fn().mockResolvedValue(data),
    friendRequests: data.friendRequests || [],
  }
}

describe('/api/friends/request', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue({} as any)
    ;(mockMongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(true)
  })

  describe('POST /api/friends/request', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ targetUserId: 'target123' }),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid target user ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      ;(mockMongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(false)

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ targetUserId: 'invalid-id' }),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid target user ID')
    })

    it('should return 400 for missing target user ID', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockRequest = {
        json: jest.fn().mockResolvedValue({}),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid target user ID')
    })

    it('should return 404 when current user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockUser.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: 'target123' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Current user not found')
    })

    it('should return 404 when target user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockUser.findById.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: 'target123' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Target user not found')
    })

    it('should return 400 when trying to send request to self', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const userId = 'user123'
      const mockCurrentUser = createMockUser({
        _id: userId,
        email: 'test@example.com',
        username: 'testuser',
      })
      const mockTargetUser = createMockUser({
        _id: userId,
        email: 'test@example.com',
        username: 'testuser',
      })

      // Mock equals method for ObjectId comparison
      mockCurrentUser._id.equals = jest.fn().mockReturnValue(true)
      mockTargetUser._id.equals = jest.fn().mockReturnValue(true)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockUser.findById.mockResolvedValue(mockTargetUser)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: userId },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot send friend request to yourself')
    })

    it('should return 400 when users are already friends', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })
      const mockTargetUser = createMockUser({
        _id: 'target123',
        email: 'target@example.com',
        username: 'targetuser',
      })

      mockCurrentUser._id.equals = jest.fn().mockReturnValue(false)
      mockCurrentUser.isFriendWith.mockReturnValue(true)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockUser.findById.mockResolvedValue(mockTargetUser)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: 'target123' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Already friends with this user')
    })

    it('should return 400 when friend request already sent', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })
      const mockTargetUser = createMockUser({
        _id: 'target123',
        email: 'target@example.com',
        username: 'targetuser',
      })

      mockCurrentUser._id.equals = jest.fn().mockReturnValue(false)
      mockCurrentUser.isFriendWith.mockReturnValue(false)
      mockCurrentUser.hasPendingRequestTo.mockReturnValue(true)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockUser.findById.mockResolvedValue(mockTargetUser)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: 'target123' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Friend request already sent')
    })

    it('should return 400 when target user has already sent a request', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })
      const mockTargetUser = createMockUser({
        _id: 'target123',
        email: 'target@example.com',
        username: 'targetuser',
      })

      mockCurrentUser._id.equals = jest.fn().mockReturnValue(false)
      mockCurrentUser.isFriendWith.mockReturnValue(false)
      mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)
      mockCurrentUser.hasPendingRequestFrom.mockReturnValue(true)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockUser.findById.mockResolvedValue(mockTargetUser)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: 'target123' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This user has already sent you a friend request. Check your pending requests.')
    })

    it('should successfully send friend request', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })
      const mockTargetUser = createMockUser({
        _id: 'target123',
        email: 'target@example.com',
        username: 'targetuser',
        profilePicture: 'https://example.com/pic.jpg',
        friendRequests: [],
      })

      mockCurrentUser._id.equals = jest.fn().mockReturnValue(false)
      mockCurrentUser.isFriendWith.mockReturnValue(false)
      mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)
      mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      mockUser.findById.mockResolvedValue(mockTargetUser)

      const { req } = createMocks({
        method: 'POST',
        body: { targetUserId: 'target123' },
      })
      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Friend request sent successfully')
      expect(data.targetUser.id).toBe('target123')
      expect(data.targetUser.username).toBe('targetuser')
      expect(mockTargetUser.friendRequests).toHaveLength(1)
      expect(mockTargetUser.save).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ targetUserId: 'target123' }),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/friends/request', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const mockRequest = {
        url: 'http://localhost:3000/api/friends/request?type=received',
      } as unknown as NextRequest

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockUser.findOne.mockResolvedValue(null)

      const mockRequest = {
        url: 'http://localhost:3000/api/friends/request?type=received',
      } as unknown as NextRequest

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return received friend requests', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockUsersWithRequests = [
        {
          _id: 'sender1',
          username: 'sender1',
          email: 'sender1@example.com',
          profilePicture: null,
          friendRequests: [
            {
              _id: 'req1',
              from: new mongoose.Types.ObjectId('sender1'),
              to: new mongoose.Types.ObjectId('user123'),
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ]

      // Mock the equals method for ObjectId comparison
      mockUsersWithRequests[0].friendRequests[0].to.equals = jest.fn().mockReturnValue(true)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      
      const mockFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(mockUsersWithRequests),
        }),
      })
      mockUser.find.mockImplementation(mockFind)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/friends/request?type=received',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(1)
      expect(data.requests[0].from.username).toBe('sender1')
      expect(data.type).toBe('received')
      expect(data.count).toBe(1)
    })

    it('should return sent friend requests', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      const mockUsersWithRequests = [
        {
          _id: 'target1',
          username: 'target1',
          email: 'target1@example.com',
          profilePicture: null,
          friendRequests: [
            {
              _id: 'req1',
              from: new mongoose.Types.ObjectId('user123'),
              to: new mongoose.Types.ObjectId('target1'),
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ]

      // Mock the equals method for ObjectId comparison
      mockUsersWithRequests[0].friendRequests[0].from.equals = jest.fn().mockReturnValue(true)

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      
      const mockFind = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsersWithRequests),
      })
      mockUser.find.mockImplementation(mockFind)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/friends/request?type=sent',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(1)
      expect(data.requests[0].to.username).toBe('target1')
      expect(data.type).toBe('sent')
      expect(data.count).toBe(1)
    })

    it('should default to received requests when type is not specified', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      const mockCurrentUser = createMockUser({
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
      })

      mockUser.findOne.mockResolvedValue(mockCurrentUser)
      
      const mockFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        }),
      })
      mockUser.find.mockImplementation(mockFind)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/friends/request',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.type).toBe('received')
    })

    it('should handle database errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/friends/request?type=received',
      })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})