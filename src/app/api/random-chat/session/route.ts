import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import RandomChatSession from '@/models/RandomChatSession';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get user from database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find active session for user
    const activeSession = await RandomChatSession.findActiveSessionForUser(user._id);

    if (!activeSession) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveSession: false,
        },
      });
    }

    // Get partner information
    const partner = activeSession.getPartner(user._id);
    const userAnonymousId = activeSession.getAnonymousId(user._id);

    if (!partner || !userAnonymousId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session state' },
        { status: 500 }
      );
    }

    // Get recent messages (last 50)
    const recentMessages = activeSession.messages
      .slice(-50)
      .map(msg => ({
        messageId: msg.messageId,
        anonymousId: msg.anonymousId,
        content: msg.content,
        timestamp: msg.timestamp,
        type: msg.type,
        isOwn: msg.senderId.equals(user._id),
      }));

    return NextResponse.json({
      success: true,
      data: {
        hasActiveSession: true,
        sessionId: activeSession.sessionId,
        partner: {
          anonymousId: partner.anonymousId,
          username: partner.anonymousId, // Use anonymous ID as display name
          isActive: partner.isActive,
        },
        userAnonymousId,
        status: activeSession.status,
        chatType: activeSession.chatType,
        startTime: activeSession.metadata.startTime,
        messagesCount: activeSession.metadata.messagesCount,
        messages: recentMessages,
      },
    });
  } catch (error) {
    console.error('Error getting active session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get user from database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, sessionId, reason } = body;

    if (action === 'end') {
      // End the session
      const activeSession = await RandomChatSession.findOne({
        sessionId,
        'participants.userId': user._id,
        status: { $in: ['waiting', 'active'] },
      });

      if (!activeSession) {
        return NextResponse.json(
          { success: false, error: 'Session not found or already ended' },
          { status: 404 }
        );
      }

      // End the session
      await activeSession.endSession(reason || 'user_left');

      return NextResponse.json({
        success: true,
        message: 'Session ended successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error handling session action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}