import { NextRequest } from 'next/server'
import { GET } from '@/app/api/users/search/route'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
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
  find: jest.fn(),
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>
const mockUser = User as jest.Mocked<typeof User>

// Helper function to create mock user
function createMockUser(data: any) {
  return {
    ...data,
    _id: data._id,
    isFriendWith: jest.fn(),
    hasPendingRequestFrom: jest.fn(),
    hasPendingRequestTo: jest.fn(),
    lastSeen: data.lastSeen || new Date(),
    getTime: function() {
      return this.lastSeen?.getTime?.() || Date.now()
    },
  }
}

describe('/api/users/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue(undefined)
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=test',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 404 when current user is not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    mockUser.findOne.mockResolvedValue(null)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=test',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Current user not found')
  })

  it('should search users by username', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const mockSearchResults = [
      {
        _id: 'user456',
        username: 'testuser2',
        email: 'test2@example.com',
        profilePicture: null,
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        isDiscoveryEnabled: true,
      },
      {
        _id: 'user789',
        username: 'anothertestuser',
        email: 'test3@example.com',
        profilePicture: 'https://example.com/pic.jpg',
        lastSeen: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        isDiscoveryEnabled: false,
      },
    ]

    mockCurrentUser.isFriendWith.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockSearchResults),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=test&limit=10',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.results[0].username).toBe('testuser2')
    expect(data.results[0].isOnline).toBe(true) // 2 minutes ago, within 5 minute threshold
    expect(data.results[1].username).toBe('anothertestuser')
    expect(data.results[1].isOnline).toBe(false) // 10 minutes ago, outside threshold
    expect(data.count).toBe(2)
    expect(data.query).toBe('test')

    // Verify search query structure
    expect(mockFind).toHaveBeenCalledWith({
      _id: { $ne: 'user123' },
      $or: [
        { username: { $regex: 'test', $options: 'i' } },
        { email: { $regex: 'test', $options: 'i' } }
      ]
    })
  })

  it('should search users by email', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const mockSearchResults = [
      {
        _id: 'user456',
        username: 'differentuser',
        email: 'search@domain.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
    ]

    mockCurrentUser.isFriendWith.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockSearchResults),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=search@domain',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].email).toBe('search@domain.com')
    expect(data.query).toBe('search@domain')
  })

  it('should return all users when no query is provided', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const mockSearchResults = [
      {
        _id: 'user456',
        username: 'user1',
        email: 'user1@example.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
      {
        _id: 'user789',
        username: 'user2',
        email: 'user2@example.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
    ]

    mockCurrentUser.isFriendWith.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockSearchResults),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.query).toBe('')

    // Verify search query excludes current user but has no text search
    expect(mockFind).toHaveBeenCalledWith({
      _id: { $ne: 'user123' },
    })
  })

  it('should include relationship status in results', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const mockSearchResults = [
      {
        _id: 'friend456',
        username: 'myfriend',
        email: 'friend@example.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
      {
        _id: 'pending789',
        username: 'pendinguser',
        email: 'pending@example.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
      {
        _id: 'requested101',
        username: 'requesteduser',
        email: 'requested@example.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
    ]

    // Mock different relationship statuses
    mockCurrentUser.isFriendWith.mockImplementation((userId: any) => {
      return userId === 'friend456'
    })
    mockCurrentUser.hasPendingRequestFrom.mockImplementation((userId: any) => {
      return userId === 'pending789'
    })
    mockCurrentUser.hasPendingRequestTo.mockImplementation((userId: any) => {
      return userId === 'requested101'
    })

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockSearchResults),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=user',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(3)
    
    // Check relationship statuses
    const friend = data.results.find((u: any) => u.username === 'myfriend')
    expect(friend.isFriend).toBe(true)
    expect(friend.hasPendingRequestFrom).toBe(false)
    expect(friend.hasPendingRequestTo).toBe(false)

    const pendingFrom = data.results.find((u: any) => u.username === 'pendinguser')
    expect(pendingFrom.isFriend).toBe(false)
    expect(pendingFrom.hasPendingRequestFrom).toBe(true)
    expect(pendingFrom.hasPendingRequestTo).toBe(false)

    const pendingTo = data.results.find((u: any) => u.username === 'requesteduser')
    expect(pendingTo.isFriend).toBe(false)
    expect(pendingTo.hasPendingRequestFrom).toBe(false)
    expect(pendingTo.hasPendingRequestTo).toBe(true)
  })

  it('should respect limit parameter', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const mockSearchResults = [
      {
        _id: 'user456',
        username: 'user1',
        email: 'user1@example.com',
        profilePicture: null,
        lastSeen: new Date(),
        isDiscoveryEnabled: true,
      },
    ]

    mockCurrentUser.isFriendWith.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockSearchResults),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=user&limit=5',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    
    // Verify limit was applied
    const mockFindChain = mockFind.mock.results[0].value
    expect(mockFindChain.limit).toHaveBeenCalledWith(5)
  })

  it('should default to limit 10 when not specified', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    mockCurrentUser.isFriendWith.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=user',
    })
    const response = await GET(req as any)

    expect(response.status).toBe(200)
    
    // Verify default limit was applied
    const mockFindChain = mockFind.mock.results[0].value
    expect(mockFindChain.limit).toHaveBeenCalledWith(10)
  })

  it('should handle database errors', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    mockDbConnect.mockRejectedValue(new Error('Database connection failed'))

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=test',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle user query errors', async () => {
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
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockRejectedValue(new Error('Query failed')),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=test',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should correctly calculate online status', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = createMockUser({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
    })

    const now = Date.now()
    const mockSearchResults = [
      {
        _id: 'online456',
        username: 'onlineuser',
        email: 'online@example.com',
        profilePicture: null,
        lastSeen: new Date(now - 2 * 60 * 1000), // 2 minutes ago - online
        isDiscoveryEnabled: true,
      },
      {
        _id: 'offline789',
        username: 'offlineuser',
        email: 'offline@example.com',
        profilePicture: null,
        lastSeen: new Date(now - 10 * 60 * 1000), // 10 minutes ago - offline
        isDiscoveryEnabled: true,
      },
      {
        _id: 'nolastseen101',
        username: 'newuser',
        email: 'new@example.com',
        profilePicture: null,
        lastSeen: null,
        isDiscoveryEnabled: true,
      },
    ]

    mockCurrentUser.isFriendWith.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestFrom.mockReturnValue(false)
    mockCurrentUser.hasPendingRequestTo.mockReturnValue(false)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)

    const mockFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(mockSearchResults),
    })
    mockUser.find.mockImplementation(mockFind)

    const { req } = createMocks({
      method: 'GET',
      url: '/api/users/search?q=user',
    })
    const response = await GET(req as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(3)
    
    const onlineUser = data.results.find((u: any) => u.username === 'onlineuser')
    expect(onlineUser.isOnline).toBe(true)

    const offlineUser = data.results.find((u: any) => u.username === 'offlineuser')
    expect(offlineUser.isOnline).toBe(false)

    const newUser = data.results.find((u: any) => u.username === 'newuser')
    expect(newUser.isOnline).toBe(false)
  })
})