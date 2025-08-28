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

    // Find current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user's Bluetooth ID and timestamp
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      {
        bluetoothId,
        bluetoothIdUpdatedAt: new Date(),
        lastSeen: new Date()
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Bluetooth ID updated successfully',
      lastSeenBluetooth: updatedUser?.bluetoothIdUpdatedAt
    })

  } catch (error) {
    console.error('Error updating Bluetooth ID:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasBluetooth: !!currentUser.bluetoothId,
      lastSeenBluetooth: currentUser.bluetoothIdUpdatedAt,
    });

  } catch (error) {
    console.error("Bluetooth status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Clear Bluetooth ID and timestamp
    await User.findByIdAndUpdate(
      currentUser._id,
      {
        $unset: {
          bluetoothId: "",
          bluetoothIdUpdatedAt: ""
        },
        lastSeen: new Date()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Bluetooth device cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing Bluetooth ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
