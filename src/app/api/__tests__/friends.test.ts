import { NextRequest } from 'next/server'
import { GET } from '@/app/api/friends/route'
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
  find: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>
const mockUser = User as jest.Mocked<typeof User>

// Helper function to create mock NextRequest
function createMockRequest(method: string) {
  const url = 'http://localhost:3000/api/friends'
  const request = {
    method,
    url,
    headers: new Headers(),
  } as NextRequest
  
  return request
}

describe('/api/friends', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue({} as any)
  })

  describe('GET /api/friends', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Not authenticated')
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockPopulate = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockResolvedValue(null)
      
      mockUser.findById.mockReturnValue({
        populate: mockPopulate,
        select: mockSelect,
      } as any)

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User not found')
    })

    it('should return friends list when user exists', async () => {
      const mockUserData = {
        _id: 'user123',
        friends: [
          {
            _id: 'friend1',
            username: 'friend1',
            email: 'friend1@example.com',
            profilePicture: null,
            isOnline: true,
            lastSeen: new Date(),
          },
          {
            _id: 'friend2',
            username: 'friend2',
            email: 'friend2@example.com',
            profilePicture: 'https://example.com/pic.jpg',
            isOnline: false,
            lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
          },
        ],
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

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.friends).toHaveLength(2)
      expect(data.data.friends[0].id).toBe('friend1')
      expect(data.data.friends[0].isOnline).toBe(true)
      expect(data.data.friends[1].id).toBe('friend2')
      expect(data.data.friends[1].isOnline).toBe(false)
    })

    it('should return empty friends list for new user', async () => {
      const mockUserData = {
        _id: 'user123',
        friends: [],
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

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.friends).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to get friends')
    })

    it('should handle user query errors', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', email: 'test@example.com' },
      } as any)

      const mockPopulate = jest.fn().mockReturnThis()
      const mockSelect = jest.fn().mockRejectedValue(new Error('Query failed'))
      
      mockUser.findById.mockReturnValue({
        populate: mockPopulate,
        select: mockSelect,
      } as any)

      const request = createMockRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to get friends')
    })
  })
})