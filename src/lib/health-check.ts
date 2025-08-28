/**
 * Development environment health checker
 * Validates that all services and dependencies are properly configured
 */

import dbConnect from '@/lib/mongoose'
import { validateEnv } from '@/lib/env'
import { getDatabaseHealth } from '@/lib/db-optimization'

export interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'warning'
  message: string
  details?: any
}

/**
 * Check MongoDB connection health
 */
export async function checkDatabase(): Promise<HealthCheck> {
  try {
    await dbConnect()
    const health = await getDatabaseHealth()
    
    return {
      service: 'MongoDB',
      status: 'healthy',
      message: `Connected successfully. ${health.totalUsers} users, ${health.activeUsers} active`,
      details: health
    }
  } catch (error) {
    return {
      service: 'MongoDB',
      status: 'unhealthy',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Check environment variables
 */
export function checkEnvironment(): HealthCheck {
  try {
    const requiredVars = ['MONGODB_URI', 'NEXTAUTH_SECRET']
    const missing = requiredVars.filter(varName => !process.env[varName])
    
    if (missing.length > 0) {
      return {
        service: 'Environment',
        status: 'unhealthy',
        message: `Missing required variables: ${missing.join(', ')}`
      }
    }
    
    const warnings = []
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      warnings.push('Google OAuth not configured')
    }
    
    return {
      service: 'Environment',
      status: warnings.length > 0 ? 'warning' : 'healthy',
      message: warnings.length > 0 
        ? `Configured with warnings: ${warnings.join(', ')}`
        : 'All required variables configured',
      details: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      }
    }
  } catch (error) {
    return {
      service: 'Environment',
      status: 'unhealthy',
      message: `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Check Socket.IO availability
 */
export function checkSocketIO(): HealthCheck {
  if (process.env.NODE_ENV === 'development') {
    return {
      service: 'Socket.IO',
      status: 'warning',
      message: 'Real-time features disabled in development mode with App Router'
    }
  }
  
  return {
    service: 'Socket.IO',
    status: 'healthy',
    message: 'Real-time features available'
  }
}

/**
 * Run comprehensive health check
 */
export async function runHealthCheck(): Promise<{
  overall: 'healthy' | 'unhealthy' | 'warning'
  checks: HealthCheck[]
  timestamp: string
}> {
  const checks: HealthCheck[] = []
  
  // Run all checks
  checks.push(checkEnvironment())
  checks.push(checkSocketIO())
  checks.push(await checkDatabase())
  
  // Determine overall status
  const hasUnhealthy = checks.some(check => check.status === 'unhealthy')
  const hasWarning = checks.some(check => check.status === 'warning')
  
  let overall: 'healthy' | 'unhealthy' | 'warning'
  if (hasUnhealthy) {
    overall = 'unhealthy'
  } else if (hasWarning) {
    overall = 'warning'
  } else {
    overall = 'healthy'
  }
  
  return {
    overall,
    checks,
    timestamp: new Date().toISOString()
  }
}

/**
 * Log health check results
 */
export function logHealthCheck(healthCheck: Awaited<ReturnType<typeof runHealthCheck>>): void {
  const statusEmoji = {
    healthy: '✅',
    warning: '⚠️',
    unhealthy: '❌'
  }
  
  console.log(`\n${statusEmoji[healthCheck.overall]} Overall Status: ${healthCheck.overall.toUpperCase()}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  healthCheck.checks.forEach(check => {
    console.log(`${statusEmoji[check.status]} ${check.service}: ${check.message}`)
    if (check.details) {
      console.log(`   Details:`, check.details)
    }
  })
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}
