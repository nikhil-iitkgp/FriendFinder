import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
import Message from '@/models/Message'
import Conversation from '@/models/Conversation'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId, content, type = 'text', conversationId } = body

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Find or create conversation
    let conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId)
    } else {
      conversation = await Conversation.findOne({
        participants: { $all: [session.user.id, receiverId] }
      })
    }

    if (!conversation) {
      conversation = new Conversation({
        participants: [session.user.id, receiverId],
        lastMessage: null,
        lastActivity: new Date()
      })
      await conversation.save()
    }

    // Create message
    const message = new Message({
      sender: session.user.id,
      receiver: receiverId,
      conversation: conversation._id,
      content,
      type,
      timestamp: new Date(),
      status: 'sent'
    })

    await message.save()

    // Update conversation
    conversation.lastMessage = message._id
    conversation.lastActivity = new Date()
    await conversation.save()

    // Populate sender info for response
    await message.populate('sender', 'name email')

    return NextResponse.json({
      success: true,
      message: {
        id: message._id,
        content: message.content,
        type: message.type,
        timestamp: message.timestamp,
        sender: message.sender,
        conversation: conversation._id,
        status: 'sent'
      }
    })

  } catch (error) {
    console.error('HTTP message send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lastUpdate = searchParams.get('lastUpdate')
    const limit = parseInt(searchParams.get('limit') || '50')

    await dbConnect()

    const query: any = {
      $or: [
        { sender: session.user.id },
        { receiver: session.user.id }
      ]
    }

    if (lastUpdate) {
      query.timestamp = { $gt: new Date(lastUpdate) }
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit)

    return NextResponse.json({
      success: true,
      messages,
      hasMore: messages.length === limit
    })

  } catch (error) {
    console.error('HTTP message fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}