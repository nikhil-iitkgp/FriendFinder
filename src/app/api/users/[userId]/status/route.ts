import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import { Types } from 'mongoose'

/**
 * GET /api/users/[userId]/status
 * Get the online status of a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Validate user ID
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user to verify authorization
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    // Find the target user
    const targetUser = await User.findById(userId)
      .select('_id username lastSeen')
      .lean()

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user is friends with target user (for privacy)
    const isFriend = currentUser.friends.some(friendId => 
      friendId.toString() === userId
    )

    // Only allow status check for friends or self
    if (userId !== currentUser._id?.toString() && !isFriend) {
      return NextResponse.json(
        { error: 'Not authorized to view this user\'s status' },
        { status: 403 }
      )
    }

    // Calculate online status (5 minutes threshold)
    const isOnline = targetUser.lastSeen && 
      (Date.now() - targetUser.lastSeen.getTime()) < 5 * 60 * 1000

    return NextResponse.json({
      success: true,
      userId: targetUser._id,
      username: targetUser.username,
      isOnline,
      lastSeen: targetUser.lastSeen,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting user status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}