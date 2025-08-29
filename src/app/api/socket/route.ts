import { NextRequest, NextResponse } from "next/server";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSocketIO } from '@/lib/socketServer';

// Store the socket server instance
let io: Server | null = null;

export async function GET(request: NextRequest) {
  // Initialize Socket.IO server if not already initialized
  if (!io) {
    try {
      // For App Router, we need to handle this differently
      // The socket will be handled by the client-side connection
      console.log('Socket.IO endpoint accessed - ready for connections');
      
      // Store reference for global access
      if (typeof global !== 'undefined') {
        (global as any).socketIO = io;
      }
    } catch (error) {
      console.error('Error initializing Socket.IO:', error);
    }
  }

  return NextResponse.json({ 
    message: "Socket.IO server ready",
    status: "running"
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  // Handle Socket.IO polling requests
  return NextResponse.json({ 
    message: "Socket.IO polling endpoint",
    status: "ready"
  }, { status: 200 });
}