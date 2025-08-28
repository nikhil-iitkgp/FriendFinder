import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Get chat list
    const chatList = await Message.getChatList((currentUser._id as any).toString())

    // Format chat list data
    const chats = chatList.map(chat => {
      const lastMessage = chat.lastMessage
      const isCurrentUserSender = lastMessage.senderId.toString() === (currentUser._id as any).toString()
      
      // Determine the other user (chat partner)
      const otherUser = isCurrentUserSender ? chat.receiver[0] : chat.sender[0]
      
      return {
        chatId: chat._id,
        friend: {
          id: otherUser._id,
          username: otherUser.username,
          email: otherUser.email,
          profilePicture: otherUser.profilePicture,
        },
        lastMessage: {
          _id: lastMessage._id,
          content: lastMessage.content,
          type: lastMessage.type,
          senderId: lastMessage.senderId,
          isFromCurrentUser: isCurrentUserSender,
          createdAt: lastMessage.createdAt,
          status: lastMessage.status,
        },
        unreadCount: chat.unreadCount,
        updatedAt: lastMessage.createdAt,
      }
    })

    // Sort by last message time (most recent first)
    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return NextResponse.json({
      chats,
      count: chats.length,
    })

  } catch (error) {
    console.error('Error fetching chat list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
