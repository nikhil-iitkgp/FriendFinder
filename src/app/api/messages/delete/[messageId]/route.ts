import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'
import mongoose from 'mongoose'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { messageId } = params

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: 'Valid message ID is required' },
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

    // Check if user is the sender of the message
    if (message.senderId.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { error: 'Can only delete your own messages' },
        { status: 403 }
      )
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId)

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
