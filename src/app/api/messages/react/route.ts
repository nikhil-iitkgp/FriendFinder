import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { messageId, reaction } = await request.json()

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: 'Valid message ID is required' },
        { status: 400 }
      )
    }

    if (!reaction || typeof reaction !== 'string') {
      return NextResponse.json(
        { error: 'Reaction is required' },
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

    // Find the message
    const message = await Message.findById(messageId)
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Initialize reactions if not exists
    if (!message.reactions) {
      message.reactions = new Map()
    }

    const userId = currentUser._id.toString()
    
    // Toggle reaction - if same reaction exists, remove it; otherwise add/update it
    if (message.reactions.get(userId) === reaction) {
      message.reactions.delete(userId)
    } else {
      message.reactions.set(userId, reaction)
    }

    // Save the message
    await message.save()

    // Convert Map to object for response
    const reactionsObj: { [key: string]: string } = {}
    message.reactions.forEach((value, key) => {
      reactionsObj[key] = value
    })

    return NextResponse.json({
      success: true,
      reactions: reactionsObj,
      messageId: message._id
    })

  } catch (error) {
    console.error('Error adding reaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
