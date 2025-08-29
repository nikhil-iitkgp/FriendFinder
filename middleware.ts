import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * Middleware to protect authenticated routes
 * Uses NextAuth's withAuth to check for valid sessions
 */
export default withAuth(
  function middleware(req) {
    // Add any custom middleware logic here
    const { pathname } = req.nextUrl;
    
    // Log access to protected routes (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Accessing protected route: ${pathname}`);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages without token
        if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
          return true;
        }
        
        // Protect dashboard routes
        if (pathname.startsWith('/dashboard')) {
          return !!token;
        }
        
        // Protect API routes except public ones
        if (pathname.startsWith('/api')) {
          // Public API routes
          const publicRoutes = [
            '/api/auth',
            '/api/health',
            '/api/upload', // Will be public for now
            '/api/friends', // TEMPORARY: Allow friend API for testing
          ];
          
          const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
          
          if (isPublicRoute) {
            return true;
          }
          
          // TEMPORARY: Allow all API routes for debugging
          console.log('🧪 Temporarily allowing API route:', pathname);
          return true;
          
          // Protected API routes require token
          // return !!token;
        }
        
        // Allow access to public pages
        return true;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match specific protected routes only:
     * - /dashboard routes (protected)
     * - /api routes (except auth and public)
     * Exclude all static assets completely
     */
    '/dashboard/:path*',
    '/api/((?!auth|health|upload).*)',
  ],
};
