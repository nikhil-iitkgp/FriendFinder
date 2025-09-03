import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
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
    const { sessionId, reason, description, messageIds } = body;

    // Validate required fields
    if (!sessionId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Session ID and reason are required' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = ['spam', 'inappropriate_content', 'harassment', 'fake_profile', 'abusive_behavior', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report reason' },
        { status: 400 }
      );
    }

    // Find the session
    const chatSession = await RandomChatSession.findOne({
      sessionId,
      'participants.userId': user._id,
    });

    if (!chatSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found or you are not a participant' },
        { status: 404 }
      );
    }

    // Get the partner being reported
    const partner = chatSession.getPartner(user._id);
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found in session' },
        { status: 404 }
      );
    }

    // Check if user has already reported this session
    const existingReport = await RandomChatReport.findOne({
      reporterId: user._id,
      sessionId,
      reportedUserId: partner.userId,
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this session' },
        { status: 409 }
      );
    }

    // Validate message IDs if provided
    let validatedMessageIds: string[] = [];
    if (messageIds && Array.isArray(messageIds)) {
      // Filter to only include messages from this session
      validatedMessageIds = messageIds.filter(msgId =>
        chatSession.messages.some(msg => msg.messageId === msgId)
      );
    }

    // Create the report
    const report = new RandomChatReport({
      reporterId: user._id,
      reporterUsername: user.username,
      reportedUserId: partner.userId,
      reportedUsername: partner.username,
      sessionId,
      reason,
      description: description?.trim() || '',
      evidence: validatedMessageIds.length > 0 ? {
        messageIds: validatedMessageIds,
        description: description?.trim(),
      } : undefined,
    });

    await report.save();

    // Update session metadata
    chatSession.metadata.reportCount = (chatSession.metadata.reportCount || 0) + 1;
    
    // Mark session as reported if it's still active
    if (chatSession.status === 'active') {
      chatSession.status = 'reported';
    }

    await chatSession.save();

    // End the session immediately when reported
    if (chatSession.status !== 'ended') {
      await chatSession.endSession('reported');
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: report._id,
        status: report.status,
        message: 'Report submitted successfully. The session has been ended.',
      },
    });
  } catch (error) {
    console.error('Error submitting report:', error);
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

    // Get user's report history (last 10 reports)
    const reports = await RandomChatReport.find({
      reporterId: user._id,
    })
      .select('sessionId reason status createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map(report => ({
          reportId: report._id,
          sessionId: report.sessionId,
          reason: report.reason,
          status: report.status,
          createdAt: report.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting report history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}