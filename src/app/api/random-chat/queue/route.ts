import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import RandomChatQueue from '@/models/RandomChatQueue';
import RandomChatSession from '@/models/RandomChatSession';
import RandomChatReport from '@/models/RandomChatReport';

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
    const { chatType, preferences } = body;

    // Validate chat type
    if (!chatType || !['text', 'voice', 'video'].includes(chatType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chat type. Must be text, voice, or video' },
        { status: 400 }
      );
    }

    // Check if user is already in queue or has active session
    const existingQueueEntry = await RandomChatQueue.findOne({
      userId: user._id,
      isActive: true,
    });

    if (existingQueueEntry) {
      return NextResponse.json(
        { success: false, error: 'Already in queue' },
        { status: 409 }
      );
    }

    const existingSession = await RandomChatSession.findActiveSessionForUser(user._id);
    if (existingSession) {
      return NextResponse.json(
        { success: false, error: 'Already in an active chat session' },
        { status: 409 }
      );
    }

    // Check if user has recent reports (anti-abuse measure)
    const recentReportsCount = await RandomChatReport.hasRecentReports(user._id, 24);
    if (recentReportsCount >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many recent reports. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate preferences
    const validatedPreferences = {
      chatType,
      language: preferences?.language || 'en',
      interests: Array.isArray(preferences?.interests) ? preferences.interests.slice(0, 5) : [],
      ageRange: preferences?.ageRange ? {
        min: Math.max(13, Math.min(100, preferences.ageRange.min || 18)),
        max: Math.max(13, Math.min(100, preferences.ageRange.max || 65)),
      } : undefined,
    };

    // Generate anonymous ID for this queue session
    const anonymousId = RandomChatSession.generateAnonymousId();

    // Try to find a match immediately
    const potentialMatch = await RandomChatQueue.findNextMatch(user._id, validatedPreferences);

    if (potentialMatch) {
      // Found a match! Create session immediately
      const sessionId = RandomChatSession.generateSessionId();
      
      // Create participants
      const participants = [
        {
          userId: user._id,
          username: user.username,
          anonymousId,
          joinedAt: new Date(),
          isActive: true,
        },
        {
          userId: potentialMatch.userId,
          username: potentialMatch.username,
          anonymousId: potentialMatch.anonymousId,
          joinedAt: new Date(),
          isActive: true,
        },
      ];

      // Create the session
      const session = new RandomChatSession({
        sessionId,
        participants,
        status: 'active',
        chatType: validatedPreferences.chatType,
        preferences: validatedPreferences,
        metadata: {
          startTime: new Date(),
          messagesCount: 0,
          reportCount: 0,
        },
      });

      await session.save();

      // Remove both users from queue
      await RandomChatQueue.deleteMany({
        userId: { $in: [user._id, potentialMatch.userId] },
      });

      // Return immediate match
      return NextResponse.json({
        success: true,
        data: {
          type: 'match_found',
          sessionId,
          partner: {
            anonymousId: potentialMatch.anonymousId,
            username: potentialMatch.anonymousId,
          },
          chatType: validatedPreferences.chatType,
          estimatedWaitTime: 0,
        },
      });
    } else {
      // No immediate match found, add to queue
      const queueEntry = new RandomChatQueue({
        userId: user._id,
        username: user.username,
        anonymousId,
        preferences: validatedPreferences,
        joinedAt: new Date(),
        priority: 0,
        retryCount: 0,
        isActive: true,
      });

      await queueEntry.save();

      // Get queue statistics for estimated wait time
      const queueStats = await RandomChatQueue.getQueueStats();
      const currentTypeStats = queueStats.find(stat => stat._id === chatType);
      const estimatedWaitTime = currentTypeStats ? Math.ceil(currentTypeStats.avgWaitTime / 1000) : 60;

      // Get current position in queue
      const position = await RandomChatQueue.countDocuments({
        'preferences.chatType': chatType,
        joinedAt: { $lt: queueEntry.joinedAt },
        isActive: true,
      }) + 1;

      return NextResponse.json({
        success: true,
        data: {
          type: 'queued',
          queueId: queueEntry._id,
          anonymousId,
          position,
          estimatedWaitTime: Math.min(estimatedWaitTime, 300), // Cap at 5 minutes
        },
      });
    }
  } catch (error) {
    console.error('Error joining random chat queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Remove user from queue
    const result = await RandomChatQueue.findOneAndDelete({
      userId: user._id,
      isActive: true,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Not in queue' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully removed from queue',
    });
  } catch (error) {
    console.error('Error leaving random chat queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Check queue status
    const queueEntry = await RandomChatQueue.findOne({
      userId: user._id,
      isActive: true,
    });

    if (!queueEntry) {
      return NextResponse.json({
        success: true,
        data: {
          inQueue: false,
          position: 0,
          estimatedWaitTime: 0,
        },
      });
    }

    // Calculate current position
    const position = await RandomChatQueue.countDocuments({
      'preferences.chatType': queueEntry.preferences.chatType,
      joinedAt: { $lt: queueEntry.joinedAt },
      isActive: true,
    }) + 1;

    // Calculate estimated wait time
    const waitTime = Math.floor((Date.now() - queueEntry.joinedAt.getTime()) / 1000);
    const estimatedWaitTime = Math.max(0, 60 - waitTime); // Assume 1 minute average

    return NextResponse.json({
      success: true,
      data: {
        inQueue: true,
        queueId: queueEntry._id,
        anonymousId: queueEntry.anonymousId,
        position,
        estimatedWaitTime,
        chatType: queueEntry.preferences.chatType,
        joinedAt: queueEntry.joinedAt,
      },
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}