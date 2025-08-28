import { signIn, signOut, getSession } from 'next-auth/react';
import type { SignInResponse } from 'next-auth/react';

/**
 * Client-side authentication utilities
 * Provides typed helpers for authentication actions
 */

/**
 * Sign in with credentials
 */
export async function signInWithCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result: SignInResponse | undefined = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        success: false,
        error: result.error === 'CredentialsSignin' 
          ? 'Invalid email or password' 
          : result.error,
      };
    }

    if (result?.ok) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Authentication failed',
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await signIn('google', {
      redirect: false,
      callbackUrl: '/dashboard',
    });

    if (result?.error) {
      return {
        success: false,
        error: 'Google sign-in failed',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Google sign in error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out user
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    await signOut({
      callbackUrl: '/login',
      redirect: true,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: 'Sign out failed',
    };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    return await getSession();
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getCurrentSession();
    return !!session?.user;
  } catch (error) {
    console.error('Authentication check error:', error);
    return false;
  }
}

/**
 * Get user ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getCurrentSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Get user ID error:', error);
    return null;
  }
}
