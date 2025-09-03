import { NextRequest, NextResponse } from 'next/server';

/**
 * Socket.IO API Route Handler
 * This endpoint handles Socket.IO HTTP fallback requests
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transport = searchParams.get('transport');
  const EIO = searchParams.get('EIO');
  
  // This is a Socket.IO polling request
  if (transport === 'polling') {
    // Proxy the request to the Socket.IO server
    const socketPort = process.env.SOCKET_PORT || 3006;
    const socketUrl = `http://localhost:${socketPort}/socket.io/?${searchParams.toString()}`;
    
    try {
      const response = await fetch(socketUrl, {
        method: 'GET',
        headers: request.headers,
      });
      
      // Copy the response
      const data = await response.text();
      
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (error) {
      console.error('Socket.IO proxy error:', error);
      return NextResponse.json(
        { error: 'Socket.IO server unavailable' },
        { status: 503 }
      );
    }
  }
  
  // For non-polling requests, return Socket.IO info
  return NextResponse.json({
    message: 'Socket.IO endpoint',
    socketPort: process.env.SOCKET_PORT || 3004,
    transport: transport || 'websocket',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transport = searchParams.get('transport');
  
  // This is a Socket.IO polling request
  if (transport === 'polling') {
    // Proxy the request to the Socket.IO server
    const socketPort = process.env.SOCKET_PORT || 3006;
    const socketUrl = `http://localhost:${socketPort}/socket.io/?${searchParams.toString()}`;
    
    try {
      const body = await request.text();
      
      const response = await fetch(socketUrl, {
        method: 'POST',
        headers: request.headers,
        body,
      });
      
      const data = await response.text();
      
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (error) {
      console.error('Socket.IO proxy error:', error);
      return NextResponse.json(
        { error: 'Socket.IO server unavailable' },
        { status: 503 }
      );
    }
  }
  
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}