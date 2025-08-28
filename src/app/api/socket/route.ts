import { Server } from "socket.io";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Socket.IO should be handled by the socket.io library
  // This endpoint is just for polling transport compatibility
  return new NextResponse("Socket.IO server running", { status: 200 });
}

export async function POST(request: NextRequest) {
  // Handle Socket.IO polling requests
  return new NextResponse("Socket.IO server running", { status: 200 });
}