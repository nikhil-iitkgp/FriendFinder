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

    const { bluetoothId } = await request.json()

    // Validate bluetoothId
    if (typeof bluetoothId !== 'string' || bluetoothId.length === 0) {
      return NextResponse.json(
        { error: 'Invalid Bluetooth ID' },
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

    // Find nearby users by Bluetooth using the static method
    const nearbyUsers = await User.findNearbyByBluetooth(bluetoothId, currentUser._id)

    // Format response with mock data for demonstration
    const nearbyUsersFormatted = nearbyUsers.map(user => ({
      id: user._id.toString(),
      name: user.username,
      avatar: user.profilePicture,
      distance: Math.floor(Math.random() * 50) + 1, // Mock distance 1-50 meters for Bluetooth
      lastSeen: user.bluetoothIdUpdatedAt || user.lastSeen,
      discoveryMethod: 'bluetooth' as const,
      bluetoothSignalStrength: Math.floor(Math.random() * 100) + 1, // Mock signal strength
      estimatedRange: 'Very Close' // Bluetooth is typically very short range
    }))

    return NextResponse.json(nearbyUsersFormatted)

  } catch (error) {
    console.error('Error finding nearby Bluetooth users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
