import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * Notifications Sync API
 * GET /api/notifications/sync
 * 
 * Fallback for real-time notifications when Socket.IO is unavailable
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lastSyncTime = searchParams.get('lastSync');
    const limit = parseInt(searchParams.get('limit') || '20');

    // TODO: Replace with actual database query
    const notifications = [
      {
        _id: 'notif_' + Date.now(),
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'John Doe sent you a friend request',
        senderId: 'user_123',
        senderName: 'John Doe',
        read: false,
        createdAt: new Date().toISOString(),
      }
    ];

    return createSuccessResponse({
      notifications,
      hasMore: false,
      lastSync: new Date().toISOString(),
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notifications sync error:', error);
    return createErrorResponse('Failed to sync notifications', 500);
  }
}

/**
 * Mark Notification as Read API
 * POST /api/notifications/sync
 * 
 * Fallback for marking notifications as read when Socket.IO is unavailable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, action = 'mark_read' } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return createErrorResponse('Notification IDs array is required', 400);
    }

    // TODO: Replace with actual database update
    const updatedNotifications = notificationIds.map(id => ({
      _id: id,
      read: action === 'mark_read',
      updatedAt: new Date().toISOString(),
    }));

    return createSuccessResponse({
      updatedNotifications,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notification update error:', error);
    return createErrorResponse('Failed to update notifications', 500);
  }
}