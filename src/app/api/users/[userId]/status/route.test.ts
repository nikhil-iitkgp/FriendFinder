import { createMocks } from 'node-mocks-http'
import { GET } from './route'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/mongoose')
jest.mock('@/models/User')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>
const mockUser = User as jest.Mocked<typeof User>

describe('/api/users/[userId]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDbConnect.mockResolvedValue({} as any)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const { req } = createMocks({
      method: 'GET',
    })

    const response = await GET(req as any, { params: { userId: '507f1f77bcf86cd799439011' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 for invalid user ID', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const { req } = createMocks({
      method: 'GET',
    })

    const response = await GET(req as any, { params: { userId: 'invalid-id' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid user ID')
  })

  it('should return 404 when current user is not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    mockUser.findOne.mockResolvedValue(null)

    const { req } = createMocks({
      method: 'GET',
    })

    const response = await GET(req as any, { params: { userId: '507f1f77bcf86cd799439011' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Current user not found')
  })

  it('should return 404 when target user is not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    const mockCurrentUser = {
      _id: 'currentUserId',
      friends: [],
    }

    mockUser.findOne.mockResolvedValue(mockCurrentUser)
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    } as any)

    const { req } = createMocks({
      method: 'GET',
    })

    const response = await GET(req as any, { params: { userId: '507f1f77bcf86cd799439011' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should return user status for friends', async () => {
    const targetUserId = '507f1f77bcf86cd799439011'
    const mockCurrentUser = {
      _id: 'currentUserId',
      friends: [targetUserId],
    }

    const mockTargetUser = {
      _id: targetUserId,
      username: 'targetuser',
      lastSeen: new Date(),
    }

    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTargetUser),
      }),
    } as any)

    const { req } = createMocks({
      method: 'GET',
    })

    const response = await GET(req as any, { params: { userId: targetUserId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.userId).toBe(targetUserId)
    expect(data.username).toBe('targetuser')
    expect(data.isOnline).toBe(true) // Recent lastSeen
  })

  it('should return 403 for non-friends', async () => {
    const targetUserId = '507f1f77bcf86cd799439011'
    const mockCurrentUser = {
      _id: 'currentUserId',
      friends: [], // Not friends
    }

    const mockTargetUser = {
      _id: targetUserId,
      username: 'targetuser',
      lastSeen: new Date(),
    }

    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    } as any)

    mockUser.findOne.mockResolvedValue(mockCurrentUser)
    mockUser.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTargetUser),
      }),
    } as any)

    const { req } = createMocks({
      method: 'GET',
    })

    const response = await GET(req as any, { params: { userId: targetUserId } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Not authorized to view this user\'s status')
  })
})