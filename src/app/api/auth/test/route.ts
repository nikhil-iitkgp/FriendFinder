import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Test endpoint for NextAuth configuration
 * GET /api/auth/test
 * 
 * Returns current session information and auth configuration status
 */
export async function GET() {
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    // Check environment variables
    const envCheck = {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };

    const authStatus = {
      isConfigured: envCheck.hasNextAuthSecret && envCheck.hasNextAuthUrl,
      googleOAuthReady: envCheck.hasGoogleClientId && envCheck.hasGoogleClientSecret,
      session: session || null,
      providers: ['credentials', 'google'],
    };

    return NextResponse.json({
      success: true,
      message: 'NextAuth configuration test',
      data: {
        authStatus,
        envCheck,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Auth test endpoint error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Auth configuration test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
