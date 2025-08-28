import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/mongoose';
import Message from '@/models/Message';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate other user exists
    const otherUserId = params.userId;
    if (!mongoose.isValidObjectId(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return NextResponse.json({ error: 'Chat partner not found' }, { status: 404 });
    }

    // Generate conversation ID (consistent between users)
    const conversationId = Message.generateConversationId(
      currentUser._id.toString(),
      otherUserId
    );

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // For pagination with timestamps

    // Build query
    const query: any = {
      conversationId,
      isDeleted: false
    };

    // Add timestamp filter for pagination
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch messages with pagination
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Latest first
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('sender', 'name email profilePicture')
      .populate('recipient', 'name email profilePicture')
      .lean();

    // Mark messages as read if they're sent to current user
    await Message.updateMany(
      {
        conversationId,
        recipient: currentUser._id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    // Get total count for pagination
    const totalCount = await Message.countDocuments({
      conversationId,
      isDeleted: false
    });

    // Get unread count
    const unreadCount = await Message.countDocuments({
      recipient: currentUser._id,
      sender: otherUser._id,
      isRead: false,
      isDeleted: false
    });

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        conversationId,
        pagination: {
          page,
          limit,
          totalCount,
          hasMore: messages.length === limit
        },
        unreadCount,
        chatPartner: {
          id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          profilePicture: otherUser.profilePicture,
          isOnline: otherUser.isOnline || false,
          lastSeen: otherUser.lastSeen
        }
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await dbConnect();

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate recipient
    const recipientId = params.userId;
    if (!mongoose.isValidObjectId(recipientId)) {
      return NextResponse.json({ error: 'Invalid recipient ID' }, { status: 400 });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const { content, messageType = 'text', metadata } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Create message
    const message = new Message({
      sender: currentUser._id,
      recipient: recipient._id,
      content: content.trim(),
      messageType: messageType || 'text',
      metadata: metadata || {}
    });

    await message.save();

    // Populate sender and recipient info
    await message.populate('sender', 'name email profilePicture');
    await message.populate('recipient', 'name email profilePicture');

    // TODO: Emit real-time event via Socket.IO
    // const io = getSocketIOInstance();
    // io.to(recipientId).emit('new_message', {
    //   message: message.toObject(),
    //   conversationId: message.conversationId
    // });

    return NextResponse.json({
      success: true,
      data: {
        message: message.toObject(),
        conversationId: message.conversationId
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
