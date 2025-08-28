import { NextResponse } from 'next/server';
import { testUserModel } from '@/lib/test-user-model';

/**
 * Test User Model API
 * GET /api/users/test
 * 
 * Runs comprehensive tests on the User model
 * Should only be used in development
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        error: 'Test endpoint only available in development',
      },
      { status: 403 }
    );
  }

  try {
    const testResult = await testUserModel();
    
    return NextResponse.json({
      success: true,
      message: 'User model test completed',
      data: {
        testPassed: testResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('User model test API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'User model test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
