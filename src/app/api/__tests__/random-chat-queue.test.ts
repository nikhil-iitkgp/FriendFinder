/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { POST, DELETE, GET } from '@/app/api/random-chat/queue/route';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock authOptions
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock mongoose connection
jest.mock('@/lib/mongoose', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// Mock models
const mockUser = {
  _id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
};

const mockQueueEntry = {
  _id: 'queue123',
  userId: 'user123',
  username: 'testuser',
  anonymousId: 'TestUser123',
  preferences: {
    chatType: 'text',
    language: 'en',
  },
  save: jest.fn().mockResolvedValue(true),
};

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/models/RandomChatQueue', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findNextMatch: jest.fn(),
    getQueueStats: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

jest.mock('@/models/RandomChatSession', () => ({
  __esModule: true,
  default: {
    findActiveSessionForUser: jest.fn(),
    generateSessionId: jest.fn().mockReturnValue('session123'),
    generateAnonymousId: jest.fn().mockReturnValue('TestUser123'),
  },
}));

jest.mock('@/models/RandomChatReport', () => ({
  __esModule: true,
  default: {
    hasRecentReports: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import User from '@/models/User';
import RandomChatQueue from '@/models/RandomChatQueue';
import RandomChatSession from '@/models/RandomChatSession';
import RandomChatReport from '@/models/RandomChatReport';

describe('/api/random-chat/queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/random-chat/queue', () => {
    test('should join queue successfully', async () => {
      // Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      // Mock user found
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock no existing queue entry
      (RandomChatQueue.findOne as jest.Mock).mockResolvedValue(null);

      // Mock no active session
      (RandomChatSession.findActiveSessionForUser as jest.Mock).mockResolvedValue(null);

      // Mock no recent reports
      (RandomChatReport.hasRecentReports as jest.Mock).mockResolvedValue(0);

      // Mock no immediate match
      (RandomChatQueue.findNextMatch as jest.Mock).mockResolvedValue(null);

      // Mock queue stats
      (RandomChatQueue.getQueueStats as jest.Mock).mockResolvedValue([]);
      (RandomChatQueue.countDocuments as jest.Mock).mockResolvedValue(0);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          chatType: 'text',
          preferences: {
            language: 'en',
          },
        },
      });

      // Mock the queue constructor and save
      const mockQueueConstructor = jest.fn().mockImplementation(() => ({
        ...mockQueueEntry,
        save: jest.fn().mockResolvedValue(mockQueueEntry),
      }));
      RandomChatQueue.prototype.constructor = mockQueueConstructor;

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('queued');
    });

    test('should reject unauthenticated requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { req } = createMocks({
        method: 'POST',
        body: {
          chatType: 'text',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    test('should reject invalid chat type', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const { req } = createMocks({
        method: 'POST',
        body: {
          chatType: 'invalid',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid chat type. Must be text, voice, or video');
    });

    test('should reject if already in queue', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock existing queue entry
      (RandomChatQueue.findOne as jest.Mock).mockResolvedValue(mockQueueEntry);

      const { req } = createMocks({
        method: 'POST',
        body: {
          chatType: 'text',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Already in queue');
    });

    test('should reject if has active session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (RandomChatQueue.findOne as jest.Mock).mockResolvedValue(null);

      // Mock active session
      (RandomChatSession.findActiveSessionForUser as jest.Mock).mockResolvedValue({
        sessionId: 'active-session',
      });

      const { req } = createMocks({
        method: 'POST',
        body: {
          chatType: 'text',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Already in an active chat session');
    });

    test('should reject if too many recent reports', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (RandomChatQueue.findOne as jest.Mock).mockResolvedValue(null);
      (RandomChatSession.findActiveSessionForUser as jest.Mock).mockResolvedValue(null);

      // Mock too many reports
      (RandomChatReport.hasRecentReports as jest.Mock).mockResolvedValue(5);

      const { req } = createMocks({
        method: 'POST',
        body: {
          chatType: 'text',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Too many recent reports. Please try again later.');
    });
  });

  describe('DELETE /api/random-chat/queue', () => {
    test('should leave queue successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock successful queue removal
      (RandomChatQueue.findOneAndDelete as jest.Mock).mockResolvedValue(mockQueueEntry);

      const { req } = createMocks({
        method: 'DELETE',
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Successfully removed from queue');
    });

    test('should return 404 if not in queue', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock no queue entry found
      (RandomChatQueue.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      const { req } = createMocks({
        method: 'DELETE',
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not in queue');
    });
  });

  describe('GET /api/random-chat/queue', () => {
    test('should return queue status when in queue', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock queue entry found
      (RandomChatQueue.findOne as jest.Mock).mockResolvedValue({
        ...mockQueueEntry,
        joinedAt: new Date(),
      });

      (RandomChatQueue.countDocuments as jest.Mock).mockResolvedValue(2);

      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.inQueue).toBe(true);
      expect(data.data.position).toBe(3); // countDocuments returns 2, so position is 3
    });

    test('should return not in queue when no queue entry', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { email: 'test@example.com' },
      });

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      // Mock no queue entry
      (RandomChatQueue.findOne as jest.Mock).mockResolvedValue(null);

      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.inQueue).toBe(false);
    });
  });
});