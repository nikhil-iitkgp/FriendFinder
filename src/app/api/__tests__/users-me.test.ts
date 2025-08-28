import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'
import { GET, PUT } from '@/app/api/users/me/route'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

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
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>
const mockUser = User as jest.Mocked<typeof User>

// Helper function to create mock NextRequest
function createMockRequest(method: string, body?: any) {
  const url = 'http://localhost:3000/api/users/me'
  const request = {
    method,
    url,
    json: async () => body || {},
    headers: new Headers(),
  } as NextRequest
  
  return request
}

describe('/api/users/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue({} as any)
  })

  describe('GET /api/users/me', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Not authenticated')
    })

    it('should return 404 when user is not found in database', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockPopulate = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockResolvedValue(null)
      
      mockUser.findById.mockReturnValue({
        populate: mockPopulate,
        select: mockSelect,
      } as any)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User not found')
      expect(mockDbConnect).toHaveBeenCalled()
    })

    it('should return user data when authenticated and user exists', async () => {
      const mockUserData = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Test bio',
        profilePicture: 'https://example.com/pic.jpg',
        isDiscoveryEnabled: true,
        discoveryRange: 1000,
        friends: [
          {
            _id: 'friend1',
            username: 'friend1',
            email: 'friend1@example.com',
            profilePicture: null,
            lastSeen: new Date(),
          },
        ],
        friendRequests: [
          { status: 'pending' },
          { status: 'accepted' },
          { status: 'pending' },
        ],
        location: { type: 'Point', coordinates: [-74.006, 40.7128] },
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockPopulate = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockResolvedValue(mockUserData)
      
      mockUser.findById.mockReturnValue({
        populate: mockPopulate,
        select: mockSelect,
      } as any)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user.id).toBe('user123')
      expect(data.data.user.username).toBe('testuser')
      expect(data.data.user.email).toBe('test@example.com')
      expect(data.data.user.friendRequestsCount).toBe(2) // Only pending requests
      expect(data.data.user.friends).toHaveLength(1)
      expect(mockPopulate).toHaveBeenCalledWith('friends', 'username email profilePicture lastSeen')
      expect(mockSelect).toHaveBeenCalledWith('-password')
    })

    it('should handle database connection errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to get user information')
    })

    it('should handle user query errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockPopulate = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockRejectedValue(new Error('Database query failed'))
      
      mockUser.findById.mockReturnValue({
        populate: mockPopulate,
        select: mockSelect,
      } as any)

      const { req } = createMocks({ method: 'GET' })
      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to get user information')
    })
  })

  describe('PUT /api/users/me', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'PUT',
        body: { bio: 'Updated bio' },
      })
      const response = await PUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Not authenticated')
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      mockUser.findByIdAndUpdate.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'PUT',
        body: { bio: 'Updated bio' },
      })
      const response = await PUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User not found')
    })

    it('should successfully update user profile', async () => {
      const updateData = {
        bio: 'Updated bio',
        isDiscoveryEnabled: false,
        discoveryRange: 2000,
      }

      const updatedUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Updated bio',
        profilePicture: null,
        isDiscoveryEnabled: false,
        discoveryRange: 2000,
        lastSeen: new Date(),
        updatedAt: new Date(),
      }

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockSelect = jest.fn().mockResolvedValue(updatedUser)
      mockUser.findByIdAndUpdate.mockReturnValue({
        select: mockSelect,
      } as any)

      const { req } = createMocks({
        method: 'PUT',
        body: updateData,
      })
      const response = await PUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.data.user.bio).toBe('Updated bio')
      expect(data.data.user.isDiscoveryEnabled).toBe(false)
      expect(data.data.user.discoveryRange).toBe(2000)

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        {
          $set: {
            bio: 'Updated bio',
            isDiscoveryEnabled: false,
            discoveryRange: 2000,
            updatedAt: expect.any(Date),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
    })

    it('should handle partial updates', async () => {
      const updateData = { bio: 'Only bio update' }

      const updatedUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Only bio update',
        profilePicture: null,
        isDiscoveryEnabled: true,
        discoveryRange: 1000,
        lastSeen: new Date(),
        updatedAt: new Date(),
      }

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockSelect = jest.fn().mockResolvedValue(updatedUser)
      mockUser.findByIdAndUpdate.mockReturnValue({
        select: mockSelect,
      } as any)

      const { req } = createMocks({
        method: 'PUT',
        body: updateData,
      })
      const response = await PUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user.bio).toBe('Only bio update')

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        'user123',
        {
          $set: {
            bio: 'Only bio update',
            updatedAt: expect.any(Date),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
    })

    it('should handle update errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockSelect = jest.fn().mockRejectedValue(new Error('Update failed'))
      mockUser.findByIdAndUpdate.mockReturnValue({
        select: mockSelect,
      } as any)

      const { req } = createMocks({
        method: 'PUT',
        body: { bio: 'Updated bio' },
      })
      const response = await PUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to update user profile')
    })

    it('should handle malformed request body', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      // Mock request.json() to throw an error
      const { req } = createMocks({ method: 'PUT' })
      
      // Override the json method to simulate parsing error
      const originalJson = req.json
      req.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await PUT(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to update user profile')
    })
  })
})