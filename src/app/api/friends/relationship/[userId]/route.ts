import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import { Types } from 'mongoose'

/**
 * GET /api/friends/relationship/[userId]
 * Get the relationship status between current user and target user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = params

    // Validate user ID
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
      .select('friends friendRequests sentRequests')
      .lean()

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    // Check if they are friends
    if (currentUser.friends.some(friendId => friendId.toString() === userId)) {
      return NextResponse.json({
        status: 'friends',
        message: 'You are friends with this user'
      })
    }

    // Check if current user has sent a pending request to target user
    const sentRequest = currentUser.sentRequests?.find(
      req => req.to?.toString() === userId && req.status === 'pending'
    )
    if (sentRequest) {
      return NextResponse.json({
        status: 'pending',
        message: 'Friend request sent',
        requestId: sentRequest._id
      })
    }

    // Check if target user has sent a pending request to current user
    const receivedRequest = currentUser.friendRequests?.find(
      req => req.from.toString() === userId && req.status === 'pending'
    )
    if (receivedRequest) {
      return NextResponse.json({
        status: 'received_request',
        message: 'This user has sent you a friend request',
        requestId: receivedRequest._id
      })
    }

    // No relationship
    return NextResponse.json({
      status: 'none',
      message: 'No relationship with this user'
    })

  } catch (error) {
    console.error('Error getting relationship status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
