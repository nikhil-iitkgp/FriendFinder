import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMITS = {
  auth: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  api: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
  upload: { requests: 10, window: 60 * 1000 }, // 10 uploads per minute
  message: { requests: 50, window: 60 * 1000 } // 50 messages per minute
};

export async function applySecurityHeaders(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "connect-src 'self' https:; " +
    "frame-src 'none'; " +
    "object-src 'none';"
  );

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXTAUTH_URL || 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  return response;
}

export async function rateLimit(request: NextRequest, type: keyof typeof RATE_LIMITS) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const key = `${type}:${ip}`;
  const now = Date.now();
  const limit = RATE_LIMITS[type];

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.window
    });
    return { allowed: true, remaining: limit.requests - 1 };
  }

  if (current.count >= limit.requests) {
    return { 
      allowed: false, 
      remaining: 0,
      resetTime: current.resetTime 
    };
  }

  current.count++;
  rateLimitStore.set(key, current);

  return { 
    allowed: true, 
    remaining: limit.requests - current.count 
  };
}

export async function validateApiKey(request: NextRequest) {
  // For internal API calls that require additional security
  const apiKey = request.headers.get('X-API-Key');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (!internalApiKey) return true; // Skip if not configured

  return apiKey === internalApiKey;
}

export async function validateSession(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return { valid: false, user: null };
    }

    // Additional session validation
    const sessionAge = Date.now() - ((token.iat as number) || 0) * 1000;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (sessionAge > maxAge) {
      return { valid: false, user: null };
    }

    return { 
      valid: true, 
      user: {
        id: token.sub,
        email: token.email,
        name: token.name
      }
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, user: null };
  }
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

export function createApiResponse(data: any, options: {
  status?: number;
  message?: string;
  pagination?: any;
  rateLimit?: any;
} = {}) {
  const response = {
    success: options.status ? options.status < 400 : true,
    data,
    message: options.message,
    pagination: options.pagination,
    timestamp: new Date().toISOString()
  };

  const nextResponse = NextResponse.json(response, { 
    status: options.status || 200 
  });

  // Add rate limit headers
  if (options.rateLimit) {
    nextResponse.headers.set('X-RateLimit-Remaining', options.rateLimit.remaining.toString());
    if (options.rateLimit.resetTime) {
      nextResponse.headers.set('X-RateLimit-Reset', options.rateLimit.resetTime.toString());
    }
  }

  return nextResponse;
}

export function logSecurityEvent(event: {
  type: string;
  ip?: string;
  userId?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event
  };

  console.log('Security Event:', logEntry);

  // TODO: Send to monitoring service in production
  // if (process.env.NODE_ENV === 'production') {
  //   sendToMonitoring(logEntry);
  // }
}
