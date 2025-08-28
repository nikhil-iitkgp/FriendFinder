import { NextResponse } from 'next/server';
import { runHealthCheck, logHealthCheck } from '@/lib/health-check';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * Health Check API
 * GET /api/health
 * 
 * Returns comprehensive system health status including database, environment, and services
 */
export async function GET() {
  try {
    const healthCheck = await runHealthCheck()
    
    // Log health check in development
    if (process.env.NODE_ENV === 'development') {
      logHealthCheck(healthCheck)
    }
    
    // Add basic system info
    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }
    
    return createSuccessResponse(
      { ...healthCheck, system: systemInfo }, 
      healthCheck.overall === 'healthy' ? 200 : 503
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return createErrorResponse(
      'Health check failed',
      500,
      [{ field: 'healthCheck', message: error instanceof Error ? error.message : 'Unknown error' }]
    )
  }
}

/**
 * Simple health ping
 * HEAD /api/health
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
