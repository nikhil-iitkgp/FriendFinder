import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Get current authenticated user session
 * GET /api/auth/user
 * 
 * Returns the current NextAuth session information
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          session: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session retrieved successfully',
      data: {
        session: {
          user: {
            id: session.user.id,
            username: session.user.username,
            email: session.user.email,
            image: session.user.image,
          },
          expires: session.expires,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get session error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
