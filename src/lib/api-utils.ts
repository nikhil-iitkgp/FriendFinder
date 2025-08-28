import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: Array<{
    field: string
    message: string
  }>
  timestamp: string
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
  
  return NextResponse.json(response, { status })
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: string,
  status = 500,
  errors?: Array<{ field: string; message: string }>
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    errors,
    timestamp: new Date().toISOString(),
  }
  
  // Log errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`API Error [${status}]:`, error, errors)
  }
  
  return NextResponse.json(response, { status })
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError): NextResponse {
  const errors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }))
  
  return createErrorResponse(
    'Validation failed',
    400,
    errors
  )
}

/**
 * Handle common API errors
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)
  
  if (error instanceof ZodError) {
    return handleValidationError(error)
  }
  
  if (error instanceof Error) {
    return createErrorResponse(error.message, 500)
  }
  
  return createErrorResponse('Internal server error', 500)
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests = new Map<string, number[]>()
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
  
  getRemainingRequests(identifier: string): number {
    const userRequests = this.requests.get(identifier) || []
    const now = Date.now()
    const validRequests = userRequests.filter(time => now - time < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}

// Create default rate limiters
export const defaultRateLimiter = new RateLimiter(100, 60 * 1000) // 100 requests per minute
export const authRateLimiter = new RateLimiter(10, 60 * 1000) // 10 auth requests per minute
