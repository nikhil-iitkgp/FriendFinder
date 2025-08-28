import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import dbConnect from "@/lib/mongoose";
import mongoose from "mongoose";

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

    if (!currentUser.bluetoothId) {
      return NextResponse.json({ 
        error: "No Bluetooth device set. Please update your Bluetooth device first." 
      }, { status: 400 });
    }

    // Find users on the same Bluetooth network (using the deviceId for simulation)
    // In a real implementation, this would find users with similar/compatible Bluetooth IDs
    const nearbyUsers = await User.findNearbyByBluetooth(
      currentUser.bluetoothId,
      currentUser._id as mongoose.Types.ObjectId
    );

    // Format the response with additional user info
    const formattedUsers = nearbyUsers.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      lastSeenBluetooth: user.bluetoothIdUpdatedAt,
      lastSeen: user.lastSeen,
      // Check relationship status
      isFriend: currentUser.isFriendWith(user._id as mongoose.Types.ObjectId),
      hasPendingRequestFrom: currentUser.hasPendingRequestFrom(user._id as mongoose.Types.ObjectId),
      hasPendingRequestTo: currentUser.hasPendingRequestTo(user._id as mongoose.Types.ObjectId),
    }));

    return NextResponse.json({
      users: formattedUsers,
      count: formattedUsers.length,
      deviceId: currentUser.bluetoothId.substring(0, 8) + "...", // Show partial device ID for debugging
    });

  } catch (error) {
    console.error("Nearby Bluetooth users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}