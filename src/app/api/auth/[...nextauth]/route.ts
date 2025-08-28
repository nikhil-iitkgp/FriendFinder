import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Next-Auth API route handler
 * Handles all authentication-related requests
 * 
 * Routes:
 * - GET/POST /api/auth/signin
 * - GET/POST /api/auth/signout
 * - GET/POST /api/auth/callback/:provider
 * - GET /api/auth/session
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
