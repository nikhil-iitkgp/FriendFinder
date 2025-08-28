import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { latitude, longitude, accuracy, timestamp } = await request.json().catch(() => ({}))

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Update user's location - replace entire location object to fix any corruption
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON format [lng, lat]
            accuracy: accuracy,
            lastUpdated: new Date(timestamp || Date.now())
          },
          lastSeen: new Date(),
        }
      },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp: updatedUser.location?.lastUpdated || new Date(),
      }
    })

  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const user = await User.findOne({ email: session.user.email })
      .select('location lastSeen')

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const response = {
      location: user.location?.coordinates ? {
        latitude: user.location.coordinates[1],
        longitude: user.location.coordinates[0],
        accuracy: user.location.accuracy,
        lastUpdated: user.location.lastUpdated,
      } : null,
      lastSeen: user.lastSeen,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
