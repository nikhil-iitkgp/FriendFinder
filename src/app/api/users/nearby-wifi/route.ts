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

    if (!currentUser.hashedBSSID) {
      return NextResponse.json({ 
        error: "No WiFi network set. Please update your WiFi network first." 
      }, { status: 400 });
    }

    // Find users on the same WiFi network
    const nearbyUsers = await User.findNearbyByWiFi(
      currentUser.hashedBSSID,
      currentUser._id as mongoose.Types.ObjectId
    );

    // Format the response with additional user info
    const formattedUsers = nearbyUsers.map(user => ({
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      lastSeenWiFi: user.lastSeenWiFi,
      lastSeen: user.lastSeen,
      // Check relationship status
      isFriend: currentUser.isFriendWith(user._id as mongoose.Types.ObjectId),
      hasPendingRequestFrom: currentUser.hasPendingRequestFrom(user._id as mongoose.Types.ObjectId),
      hasPendingRequestTo: currentUser.hasPendingRequestTo(user._id as mongoose.Types.ObjectId),
    }));

    return NextResponse.json({
      users: formattedUsers,
      count: formattedUsers.length,
      networkHash: currentUser.hashedBSSID.substring(0, 8) + "...", // Show partial hash for debugging
    });

  } catch (error) {
    console.error("Nearby WiFi users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
