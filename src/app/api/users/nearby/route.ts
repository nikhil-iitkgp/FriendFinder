import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { latitude, longitude, radius = 1000 } = await request.json().catch(() => ({}))

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

    // Validate radius (max 10km for performance)
    if (typeof radius !== 'number' || radius < 0 || radius > 10000) {
      return NextResponse.json(
        { error: 'Invalid radius. Must be between 0 and 10000 meters.' },
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

    // Convert radius from meters to radians (for MongoDB $geoWithin query)
    const radiusInRadians = radius / 6371000 // Earth's radius in meters

    // Find nearby users using MongoDB geospatial query
    const nearbyUsers = await User.find({
      _id: { $ne: currentUser._id }, // Exclude current user
      isDiscoveryEnabled: true, // Only include users who have discovery enabled
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInRadians]
        }
      },
      // Only include users seen within last 24 hours
      lastSeen: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    })
    .select('username email profilePicture location lastSeen')
    .limit(50) // Limit results for performance

    // Calculate distance for each user and format response
    const nearbyUsersWithDistance = nearbyUsers.map(user => {
      const userLat = user.location?.coordinates[1] || 0
      const userLng = user.location?.coordinates[0] || 0
      
      // Calculate distance using Haversine formula
      const distance = calculateDistance(latitude, longitude, userLat, userLng)
      
      return {
        id: (user._id as mongoose.Types.ObjectId).toString(),
        name: user.username,
        avatar: user.profilePicture,
        distance: Math.round(distance),
        lastSeen: user.lastSeen,
        location: {
          latitude: userLat,
          longitude: userLng,
        },
        discoveryMethod: 'gps' as const,
        // Add relationship status for messaging functionality
        isFriend: currentUser.isFriendWith(user._id as mongoose.Types.ObjectId),
        hasPendingRequestFrom: currentUser.hasPendingRequestFrom(user._id as mongoose.Types.ObjectId),
        hasPendingRequestTo: currentUser.hasPendingRequestTo(user._id as mongoose.Types.ObjectId),
      }
    })

    // Sort by distance
    nearbyUsersWithDistance.sort((a, b) => a.distance - b.distance)

    return NextResponse.json(nearbyUsersWithDistance)

  } catch (error) {
    console.error('Error finding nearby users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
