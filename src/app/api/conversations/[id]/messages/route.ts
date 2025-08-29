import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import { Conversation } from '@/models/Conversation'
import Message from '@/models/Message'

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversationId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    await dbConnect()

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: session.user.id,
      isActive: true
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Build query - use chatId instead of conversationId
    const query: any = { 
      chatId: conversationId, 
      isDeleted: false
    }
    
    if (before) {
      query.createdAt = { $lt: new Date(before) }
    }

    // Get messages
    const messages = await Message.find(query)
      .populate('senderId', 'username profilePicture')
      .populate('receiverId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ messages: messages.reverse() })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[id]/messages - Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversationId = params.id
    const { content, type = 'text' } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: session.user.id,
      isActive: true
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // For the main Message schema, we need to determine the receiver
    // Since this is a conversation-based approach, we need to find the other participant
    const otherParticipantId = conversation.participants.find(
      (p: string) => p !== session.user.id
    )

    if (!otherParticipantId) {
      return NextResponse.json(
        { error: 'Other participant not found' },
        { status: 400 }
      )
    }

    // Create message using the main Message schema format
    const message = new Message({
      chatId: conversationId,
      senderId: session.user.id,
      receiverId: otherParticipantId,
      content: content.trim(),
      type,
      status: 'sent'
    })

    await message.save()

    // Populate sender info for response
    await message.populate('senderId', 'username profilePicture')
    await message.populate('receiverId', 'username profilePicture')

    // Update conversation's last message
    conversation.lastMessage = {
      messageId: (message._id as any).toString(),
      content: message.content,
      senderId: (message.senderId as any).toString(),
      timestamp: message.createdAt
    }
    
    await conversation.save()

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
