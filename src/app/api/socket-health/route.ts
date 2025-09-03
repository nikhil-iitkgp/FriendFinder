import { NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * Socket Health Check API
 * GET /api/socket-health
 * 
 * Returns Socket.IO server health status
 */
export async function GET() {
  try {
    const socketPort = process.env.SOCKET_PORT || 3004;
    const healthPort = parseInt(socketPort) + 1; // Health server runs on next port
    
    // Try to check if socket server is running by hitting its health endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://localhost:${healthPort}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const serverHealth = await response.json();
        return createSuccessResponse(serverHealth, 200);
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (fetchError) {
      // Socket server is not available
      const healthData = {
        status: 'unavailable',
        server: 'socket.io',
        port: socketPort,
        timestamp: new Date().toISOString(),
        error: fetchError instanceof Error ? fetchError.message : 'Socket server not responding',
        services: {
          realtime: 'unavailable',
          messageQueue: 'degraded',
          errorHandler: 'operational'
        }
      };
      
      return createSuccessResponse(healthData, 200);
    }
  } catch (error) {
    console.error('Socket health check failed:', error)
    return createErrorResponse(
      'Socket health check failed',
      503,
      [{ field: 'socketHealth', message: error instanceof Error ? error.message : 'Socket server unavailable' }]
    )
  }
}

/**
 * Simple socket ping
 * HEAD /api/socket-health
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}