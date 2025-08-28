import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

/**
 * Get User Settings API
 * GET /api/users/settings
 * 
 * Returns the current user's settings
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
    const user = await User.findById(session.user.id).select('settings');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Return default settings if none exist
    const defaultSettings = {
      pushNotifications: false,
      emailNotifications: false,
      friendRequests: true,
      newMessages: true,
      nearbyFriends: true,
      profileVisibility: "friends",
      discoveryMode: false,
      locationSharing: false,
      readReceipts: true,
      twoFactorAuth: false,
      discoveryRange: 100,
      gpsDiscovery: false,
      wifiDiscovery: false,
      bluetoothDiscovery: false,
      soundEnabled: true,
      vibrationEnabled: true,
      language: "English",
    };

    const userSettings = user.settings || {};
    const mergedSettings = { ...defaultSettings, ...userSettings };

    return NextResponse.json({
      success: true,
      data: {
        settings: mergedSettings,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get settings',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Update User Settings API
 * PUT /api/users/settings
 * 
 * Updates the current user's settings
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
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid settings data',
        },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Find and update user settings
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          settings: settings,
          updatedAt: new Date(),
        },
      },
      { 
        new: true,
        runValidators: true,
      }
    ).select('settings');

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
      message: 'Settings updated successfully',
      data: {
        settings: updatedUser.settings,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}