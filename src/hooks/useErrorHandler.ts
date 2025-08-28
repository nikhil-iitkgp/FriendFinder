/**
 * Client-side error handling and logging
 */

import { useEffect } from 'react'
import { toast } from 'sonner'

export interface AppError {
  type: 'network' | 'validation' | 'auth' | 'general'
  message: string
  statusCode?: number
  field?: string
  timestamp: Date
}

/**
 * Hook for handling and displaying errors consistently
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string): AppError => {
    let appError: AppError

    if (error instanceof Error) {
      // Check if it's a fetch error
      if (error.message.includes('fetch')) {
        appError = {
          type: 'network',
          message: 'Unable to connect to server. Please check your internet connection.',
          timestamp: new Date()
        }
      } else {
        appError = {
          type: 'general',
          message: error.message,
          timestamp: new Date()
        }
      }
    } else if (typeof error === 'string') {
      appError = {
        type: 'general',
        message: error,
        timestamp: new Date()
      }
    } else {
      appError = {
        type: 'general',
        message: 'An unexpected error occurred',
        timestamp: new Date()
      }
    }

    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context || 'App'}] Error:`, error)
    }

    // Show user-friendly toast
    if (appError.type === 'network') {
      toast.error('Connection Error', {
        description: appError.message,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      })
    } else if (appError.type === 'auth') {
      toast.error('Authentication Error', {
        description: appError.message,
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login'
        }
      })
    } else {
      toast.error('Error', {
        description: appError.message
      })
    }

    return appError
  }

  const handleApiError = async (response: Response, context?: string): Promise<AppError> => {
    try {
      const errorData = await response.json()
      
      const appError: AppError = {
        type: response.status === 401 ? 'auth' : 
              response.status === 400 ? 'validation' : 'general',
        message: errorData.error || `Request failed with status ${response.status}`,
        statusCode: response.status,
        field: errorData.errors?.[0]?.field,
        timestamp: new Date()
      }

      return handleError(appError.message, context)
    } catch {
      return handleError(`Request failed with status ${response.status}`, context)
    }
  }

  return {
    handleError,
    handleApiError
  }
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
    
    if (process.env.NODE_ENV === 'development') {
      toast.error('Unhandled Error', {
        description: 'Check console for details'
      })
    }
  })

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    
    if (process.env.NODE_ENV === 'development') {
      toast.error('JavaScript Error', {
        description: event.error?.message || 'Check console for details'
      })
    }
  })
}

/**
 * Fetch wrapper with error handling
 */
export async function apiRequest<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const error: AppError = {
        type: response.status === 401 ? 'auth' : 
              response.status === 400 ? 'validation' : 'general',
        message: errorData.error || `Request failed with status ${response.status}`,
        statusCode: response.status,
        field: errorData.errors?.[0]?.field,
        timestamp: new Date()
      }
      return { data: null, error }
    }

    const data = await response.json()
    return { data: data.data || data, error: null }
  } catch (error) {
    const appError: AppError = {
      type: 'network',
      message: 'Network error occurred',
      timestamp: new Date()
    }
    return { data: null, error: appError }
  }
}
