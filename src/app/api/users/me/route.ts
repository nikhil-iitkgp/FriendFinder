import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

/**
 * Get Current User API
 * GET /api/users/me
 * 
 * Returns the current authenticated user's information
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find user by ID
    const user = await User.findById(session.user.id)
      .populate('friends', 'username email profilePicture lastSeen')
      .select('-password');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Return user information
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
          isDiscoveryEnabled: user.isDiscoveryEnabled,
          discoveryRange: user.discoveryRange,
          friends: user.friends,
          friendRequestsCount: user.friendRequests.filter(req => req.status === 'pending').length,
          location: user.location,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user information',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Update Current User API
 * PUT /api/users/me
 * 
 * Updates the current authenticated user's profile information
 */
export async function PUT(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Connect to database
    await dbConnect();

    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          ...(body.username !== undefined && { username: body.username }),
          ...(body.bio !== undefined && { bio: body.bio }),
          ...(body.profilePicture !== undefined && { profilePicture: body.profilePicture }),
          ...(body.isDiscoveryEnabled !== undefined && { isDiscoveryEnabled: body.isDiscoveryEnabled }),
          ...(body.discoveryRange !== undefined && { discoveryRange: body.discoveryRange }),
          updatedAt: new Date(),
        },
      },
      { 
        new: true,
        runValidators: true,
      }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          bio: updatedUser.bio,
          profilePicture: updatedUser.profilePicture,
          isDiscoveryEnabled: updatedUser.isDiscoveryEnabled,
          discoveryRange: updatedUser.discoveryRange,
          lastSeen: updatedUser.lastSeen,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Update user error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user profile',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
