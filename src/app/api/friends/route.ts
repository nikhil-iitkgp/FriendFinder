import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
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

    await dbConnect()

    const currentUser = await User.findOne({ email: session.user.email })
      .populate('friends', 'username email profilePicture bio lastSeen')

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const friends = currentUser.friends.map((friend: any) => ({
      id: friend._id,
      username: friend.username,
      email: friend.email,
      profilePicture: friend.profilePicture,
      bio: friend.bio,
      lastSeen: friend.lastSeen,
      isOnline: friend.lastSeen && (Date.now() - friend.lastSeen.getTime()) < 5 * 60 * 1000, // Online if last seen within 5 minutes
    }))

    return NextResponse.json({
      friends,
      count: friends.length
    })

  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { friendId } = await request.json()

    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      return NextResponse.json(
        { error: 'Invalid friend ID' },
        { status: 400 }
      )
    }

    await dbConnect()

    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    const friendUser = await User.findById(friendId)
    if (!friendUser) {
      return NextResponse.json(
        { error: 'Friend not found' },
        { status: 404 }
      )
    }

    // Remove friend from current user's friends list
    currentUser.friends = currentUser.friends.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(friendId)
    )

    // Remove current user from friend's friends list
    friendUser.friends = friendUser.friends.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(currentUser._id as mongoose.Types.ObjectId)
    )

    await currentUser.save()
    await friendUser.save()

    return NextResponse.json({
      message: 'Friend removed successfully',
      removedFriend: {
        id: friendUser._id,
        username: friendUser.username,
      }
    })

  } catch (error) {
    console.error('Error removing friend:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
