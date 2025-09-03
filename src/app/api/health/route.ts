import { NextResponse } from 'next/server';
import { runHealthCheck, logHealthCheck } from '@/lib/health-check';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils';

/**
 * Health Check API for Next.js Server
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    server: 'Next.js',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
}

/**
 * Simple health ping
 * HEAD /api/health
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
