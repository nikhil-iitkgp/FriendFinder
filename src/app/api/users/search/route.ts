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
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    await dbConnect()

    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    // Build search query
    const searchQuery: any = {
      _id: { $ne: currentUser._id }, // Exclude current user
    }

    if (query) {
      searchQuery.$or = [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }

    const users = await User.find(searchQuery)
      .select('username email profilePicture lastSeen isDiscoveryEnabled')
      .limit(limit)
      .sort({ lastSeen: -1 }) // Most recently active first

    const searchResults = users.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      lastSeen: user.lastSeen,
      isOnline: user.lastSeen && (Date.now() - user.lastSeen.getTime()) < 5 * 60 * 1000,
      isDiscoveryEnabled: user.isDiscoveryEnabled,
      // Indicate relationship status
      isFriend: currentUser.isFriendWith(user._id as any),
      hasPendingRequestFrom: currentUser.hasPendingRequestFrom(user._id as any),
      hasPendingRequestTo: currentUser.hasPendingRequestTo(user._id as any),
    }))

    return NextResponse.json({
      results: searchResults,
      count: searchResults.length,
      query,
    })

  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
