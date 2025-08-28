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

    const { bssid } = await request.json()

    // Validate BSSID
    if (typeof bssid !== 'string' || !bssid.match(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)) {
      return NextResponse.json(
        { error: 'Invalid BSSID format' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user to exclude from results
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find nearby users by WiFi using the static method
    const nearbyUsers = await User.findNearbyByWiFi(bssid, currentUser._id)

    // Format response with WiFi-specific data
    const nearbyUsersFormatted = nearbyUsers.map(user => ({
      id: user._id.toString(),
      name: user.username,
      avatar: user.profilePicture,
      distance: 0, // WiFi users are on same network, so distance is effectively 0
      lastSeen: user.lastSeenWiFi || user.lastSeen,
      discoveryMethod: 'wifi' as const,
      networkName: 'Same WiFi Network', // In real implementation, this could be the SSID
      connectionStrength: Math.floor(Math.random() * 4) + 1, // Mock signal strength 1-4 bars
      estimatedRange: 'Same Building'
    }))

    return NextResponse.json(nearbyUsersFormatted)

  } catch (error) {
    console.error('Error finding nearby WiFi users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
