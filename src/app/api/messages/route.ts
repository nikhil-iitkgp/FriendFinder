import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const friendId = searchParams.get('friendId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      return NextResponse.json(
        { error: 'Valid friend ID is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify friendship
    if (!currentUser.isFriendWith(friendId as any)) {
      return NextResponse.json(
        { error: 'Can only view messages with friends' },
        { status: 403 }
      )
    }

    // Get messages
    const beforeDate = before ? new Date(before) : undefined
    const messages = await Message.getChatMessages(
      (currentUser._id as any).toString(),
      friendId,
      limit,
      beforeDate
    )

    // Reverse to get chronological order (oldest first)
    const messagesData = messages.reverse().map(message => {
      // Convert reactions Map to object
      const reactionsObj: { [key: string]: string } = {}
      if (message.reactions) {
        message.reactions.forEach((value, key) => {
          reactionsObj[key] = value
        })
      }
      
      return {
        _id: message._id,
        chatId: message.chatId,
        senderId: {
          _id: message.senderId._id,
          username: (message.senderId as any).username,
          profilePicture: (message.senderId as any).profilePicture,
        },
        receiverId: message.receiverId,
        content: message.content,
        type: message.type,
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        readAt: message.readAt,
        deliveredAt: message.deliveredAt,
        reactions: reactionsObj,
        replyTo: message.replyTo,
        isEdited: message.isEdited,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
      }
    })

    return NextResponse.json({
      messages: messagesData,
      count: messagesData.length,
      hasMore: messages.length === limit,
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { friendId, content, type = 'text', replyToId } = await request.json()

    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      return NextResponse.json(
        { error: 'Valid friend ID is required' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 2000 characters' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify friendship
    if (!currentUser.isFriendWith(friendId as any)) {
      return NextResponse.json(
        { error: 'Can only send messages to friends' },
        { status: 403 }
      )
    }

    // Handle reply functionality
    let replyToData = null
    if (replyToId && mongoose.Types.ObjectId.isValid(replyToId)) {
      const originalMessage = await Message.findById(replyToId)
        .populate('senderId', 'username')
      
      if (originalMessage) {
        replyToData = {
          _id: (originalMessage._id as any).toString(),
          content: originalMessage.content,
          senderName: (originalMessage.senderId as any).username
        }
      }
    }

    // Create chat ID
    const chatId = Message.createChatId((currentUser._id as any).toString(), friendId)

    // Create message
    const message = new Message({
      chatId,
      senderId: currentUser._id,
      receiverId: friendId,
      content: content.trim(),
      type,
      status: 'sent',
      replyTo: replyToData,
    })

    await message.save()

    // Populate sender info
    await message.populate('senderId', 'username profilePicture')

    // Convert reactions Map to object
    const reactionsObj: { [key: string]: string } = {}
    if (message.reactions) {
      message.reactions.forEach((value, key) => {
        reactionsObj[key] = value
      })
    }

    const messageData = {
      _id: message._id,
      chatId: message.chatId,
      senderId: {
        _id: message.senderId._id,
        username: (message.senderId as any).username,
        profilePicture: (message.senderId as any).profilePicture,
      },
      receiverId: message.receiverId,
      content: message.content,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      reactions: reactionsObj,
      replyTo: message.replyTo,
      isEdited: message.isEdited,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
    }

    return NextResponse.json({
      message: messageData,
      success: true,
    })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
