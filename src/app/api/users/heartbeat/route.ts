import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await dbConnect()

    // Find current user and update lastSeen
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update lastSeen timestamp
    await User.findByIdAndUpdate(
      currentUser._id,
      { lastSeen: new Date() },
      { new: true }
    )

    // Get friends list with their current online status
    const friends = await User.find({
      _id: { $in: currentUser.friends }
    }).select('_id username lastSeen')

    const friendsWithStatus = friends.map(friend => ({
      id: friend._id?.toString() || '',
      username: friend.username,
      isOnline: friend.lastSeen && (Date.now() - friend.lastSeen.getTime()) < 5 * 60 * 1000
    }))

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      friends: friendsWithStatus
    })

  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}