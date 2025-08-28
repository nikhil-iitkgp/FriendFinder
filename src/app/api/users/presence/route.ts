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

    // Validate BSSID (MAC address format)
    if (typeof bssid !== 'string' || !bssid.match(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)) {
      return NextResponse.json(
        { error: 'Invalid BSSID format. Expected MAC address format (e.g., 00:11:22:33:44:55)' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Find current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user's WiFi presence
    await User.findByIdAndUpdate(
      currentUser._id,
      {
        currentBSSID: bssid,
        lastSeenWiFi: new Date(),
        lastSeen: new Date()
      }
    )

    return NextResponse.json({
      success: true,
      message: 'WiFi presence updated successfully'
    })

  } catch (error) {
    console.error('Error updating WiFi presence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
