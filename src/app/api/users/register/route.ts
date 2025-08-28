import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * User Registration API
 * POST /api/users/register
 * 
 * Creates a new user account with email/password credentials
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input data
    const validatedData = registerSchema.parse(body);

    // Connect to database
    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: validatedData.email },
        { username: validatedData.username },
      ],
    });

    if (existingUser) {
      if (existingUser.email === validatedData.email) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email already registered',
            field: 'email',
          },
          { status: 409 }
        );
      }

      if (existingUser.username === validatedData.username) {
        return NextResponse.json(
          {
            success: false,
            error: 'Username already taken',
            field: 'username',
          },
          { status: 409 }
        );
      }
    }

    // Create new user
    const newUser = await User.create({
      username: validatedData.username,
      email: validatedData.email,
      password: validatedData.password,
      isDiscoveryEnabled: true,
      discoveryRange: 1000, // 1km default
      friends: [],
      friendRequests: [],
      lastSeen: new Date(),
    });

    // Return success response (password automatically excluded by schema)
    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            isDiscoveryEnabled: newUser.isDiscoveryEnabled,
            discoveryRange: newUser.discoveryRange,
            createdAt: newUser.createdAt,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const fieldErrors = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    // Handle MongoDB duplicate key errors
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      const duplicateField = Object.keys((error as any).keyValue)[0];
      return NextResponse.json(
        {
          success: false,
          error: `${duplicateField} already exists`,
          field: duplicateField,
        },
        { status: 409 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Registration failed',
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
