import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * User Presence API
 * GET /api/presence/status
 * 
 * Fallback for real-time presence updates when Socket.IO is unavailable
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds')?.split(',') || [];

    if (userIds.length === 0) {
      return createErrorResponse('User IDs are required', 400);
    }

    // TODO: Replace with actual database query
    const presenceData = userIds.map(userId => ({
      userId,
      status: Math.random() > 0.5 ? 'online' : 'offline',
      lastSeen: new Date().toISOString(),
      isTyping: false,
    }));

    return createSuccessResponse({
      presence: presenceData,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Presence status error:', error);
    return createErrorResponse('Failed to get presence status', 500);
  }
}

/**
 * Update User Presence API
 * POST /api/presence/status
 * 
 * Fallback for updating user presence when Socket.IO is unavailable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, isTyping, chatId } = body;

    if (!status) {
      return createErrorResponse('Status is required', 400);
    }

    // TODO: Replace with actual database update
    const updatedPresence = {
      userId: 'current_user_id', // TODO: Get from session
      status,
      isTyping: isTyping || false,
      chatId: chatId || null,
      lastSeen: new Date().toISOString(),
    };

    return createSuccessResponse({
      presence: updatedPresence,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Presence update error:', error);
    return createErrorResponse('Failed to update presence', 500);
  }
}