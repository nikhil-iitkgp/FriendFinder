import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import Message from '@/models/Message'
import User from '@/models/User'
import mongoose from 'mongoose'

// GET /api/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all chat IDs where current user is involved
    const chatIds = await Message.distinct('chatId', {
      $or: [
        { senderId: currentUser._id },
        { receiverId: currentUser._id }
      ],
      isDeleted: false
    })

    // Get conversations with the most recent message and counts
    const conversations = await Promise.all(
      chatIds.map(async (chatId) => {
        // Get the most recent message
        const latestMessage = await Message.findOne({ chatId })
          .populate('senderId', 'username profilePicture')
          .populate('receiverId', 'username profilePicture')
          .sort({ createdAt: -1 })

        if (!latestMessage) return null

        // Get total message count for this chat
        const messageCount = await Message.countDocuments({ chatId, isDeleted: false })

        // Get unread count for current user
        const unreadCount = await Message.countDocuments({
          chatId,
          receiverId: currentUser._id,
          status: { $ne: 'read' },
          isDeleted: false
        })

        // Determine the other participant
        const senderId = latestMessage.senderId as any
        const receiverId = latestMessage.receiverId as any
        const otherParticipantId = senderId._id.equals(currentUser._id)
          ? receiverId._id
          : senderId._id

        const otherParticipant = await User.findById(otherParticipantId)
          .select('username email profilePicture lastSeen')

        if (!otherParticipant) return null

        return {
          chatId,
          participant: {
            id: otherParticipant._id,
            username: otherParticipant.username,
            email: otherParticipant.email,
            profilePicture: otherParticipant.profilePicture,
            lastSeen: otherParticipant.lastSeen,
          },
          latestMessage: {
            content: latestMessage.content,
            type: latestMessage.type,
            createdAt: latestMessage.createdAt,
            senderId: latestMessage.senderId._id,
          },
          messageCount,
          unreadCount,
          updatedAt: latestMessage.createdAt
        }
      })
    )

    // Filter out null conversations and sort by latest message
    const validConversations = conversations
      .filter(conv => conv !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    
    return NextResponse.json({ conversations: validConversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create a new conversation or get existing one
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { participantId } = await request.json()

    if (!participantId || !mongoose.Types.ObjectId.isValid(participantId)) {
      return NextResponse.json(
        { error: 'Valid participant ID is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get participant user
    const participant = await User.findById(participantId)
      .select('username email profilePicture lastSeen')
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Create chat ID
    const chatId = Message.createChatId((currentUser._id as any).toString(), participantId)

    // Check if any messages exist for this chat
    const existingMessages = await Message.countDocuments({ chatId })
    
    const conversation = {
      chatId,
      participant: {
        id: participant._id,
        username: participant.username,
        email: participant.email,
        profilePicture: participant.profilePicture,
        lastSeen: participant.lastSeen,
      },
      messageCount: existingMessages,
      unreadCount: await Message.countDocuments({
        chatId,
        receiverId: currentUser._id,
        status: { $ne: 'read' },
        isDeleted: false
      }),
      latestMessage: null,
      updatedAt: new Date()
    }

    // Get latest message if exists
    if (existingMessages > 0) {
      const latestMessage = await Message.findOne({ chatId })
        .sort({ createdAt: -1 })
      
      if (latestMessage) {
        conversation.latestMessage = {
          content: latestMessage.content,
          type: latestMessage.type,
          createdAt: latestMessage.createdAt,
          senderId: latestMessage.senderId,
        } as any
        conversation.updatedAt = latestMessage.createdAt
      }
    }

    return NextResponse.json({ conversation }, { status: 200 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
