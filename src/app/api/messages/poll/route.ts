import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * Messages Polling API
 * GET /api/messages/poll
 * 
 * Fallback for real-time message delivery when Socket.IO is unavailable
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const lastMessageId = searchParams.get('lastMessageId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!chatId) {
      return createErrorResponse('Chat ID is required', 400);
    }

    // TODO: Replace with actual database query
    const messages = [
      // Mock response for now
      {
        _id: 'msg_' + Date.now(),
        chatId,
        content: 'This is a polling fallback message',
        senderId: {
          _id: 'user_123',
          username: 'TestUser',
        },
        receiverId: 'user_456',
        type: 'text',
        status: 'delivered',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    return createSuccessResponse({
      messages,
      hasMore: false,
      nextCursor: null,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Message polling error:', error);
    return createErrorResponse('Failed to poll messages', 500);
  }
}

/**
 * Send Message API
 * POST /api/messages/poll
 * 
 * Fallback for sending messages when Socket.IO is unavailable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, content, type = 'text', receiverId } = body;

    if (!chatId || !content || !receiverId) {
      return createErrorResponse('Chat ID, content, and receiver ID are required', 400);
    }

    // TODO: Replace with actual database insertion
    const message = {
      _id: 'msg_' + Date.now(),
      chatId,
      content,
      senderId: {
        _id: 'current_user_id', // TODO: Get from session
        username: 'CurrentUser',
      },
      receiverId,
      type,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return createSuccessResponse({
      message,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Message send error:', error);
    return createErrorResponse('Failed to send message', 500);
  }
}