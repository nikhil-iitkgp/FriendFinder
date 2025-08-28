import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dbConnect } from '@/lib/mongoose'
import { Conversation, Message } from '@/models/Conversation'

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

    // Build query
    const query: any = { 
      conversationId, 
      deletedAt: { $exists: false } 
    }
    
    if (before) {
      query.createdAt = { $lt: new Date(before) }
    }

    // Get messages
    const messages = await Message.find(query)
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

    // Create message
    const message = new Message({
      conversationId,
      senderId: session.user.id,
      content: content.trim(),
      type
    })

    await message.save()

    // Update conversation's last message
    conversation.lastMessage = {
      messageId: message._id.toString(),
      content: message.content,
      senderId: message.senderId,
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
