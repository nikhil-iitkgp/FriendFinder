import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import { hashSSID } from "@/lib/hash";
import dbConnect from "@/lib/mongoose";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ssid } = await req.json();
    
    if (!ssid || typeof ssid !== 'string' || ssid.trim().length === 0) {
      return NextResponse.json({ 
        error: "Valid SSID required (1-32 characters)" 
      }, { status: 400 });
    }

    if (ssid.trim().length > 32) {
      return NextResponse.json({ 
        error: "SSID too long (max 32 characters)" 
      }, { status: 400 });
    }

    await dbConnect();

    const hashedSSID = hashSSID(ssid);

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        hashedBSSID: hashedSSID,
        lastSeenWiFi: new Date(),
        lastSeen: new Date(),
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: "WiFi network updated successfully",
      lastSeenWiFi: updatedUser.lastSeenWiFi
    });

  } catch (error) {
    console.error("WiFi update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
      hasWiFi: !!currentUser.hashedBSSID,
      lastSeenWiFi: currentUser.lastSeenWiFi,
    });

  } catch (error) {
    console.error("WiFi status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
