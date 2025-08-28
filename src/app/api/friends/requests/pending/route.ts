import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    await dbConnect()
    
    // Find the current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find all pending friend requests sent to this user
    const pendingRequests = await User.find({
      'friendRequests.to': currentUser._id,
      'friendRequests.status': 'pending'
    }, {
      _id: 1,
      name: 1,
      email: 1,
      avatar: 1,
      friendRequests: {
        $elemMatch: {
          to: currentUser._id,
          status: 'pending'
        }
      }
    })

    // Format the response
    const formattedRequests = pendingRequests
      .filter(user => user.friendRequests && user.friendRequests.length > 0)
      .map(user => {
        const request = user.friendRequests[0]
        if (!request || !request._id) {
          return null
        }
        return {
          id: request._id.toString(),
          fromUserId: user._id?.toString() || '',
          fromUserName: user.username || '',
          fromUserEmail: user.email || '',
          fromUserAvatar: user.profilePicture || null,
          createdAt: request.createdAt,
          status: 'pending' as const
        }
      })
      .filter((request): request is NonNullable<typeof request> => request !== null)

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      count: formattedRequests.length
    })

  } catch (error) {
    console.error('Error fetching pending friend requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
