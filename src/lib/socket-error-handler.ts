import type { ConnectionState } from '@/lib/connection-manager'

export interface SocketError {
  type: 'connection' | 'transport' | 'server' | 'parse' | 'network' | 'timeout'
  code?: string | number
  message: string
  timestamp: Date
  recoverable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ErrorRecoveryStrategy {
  immediate: boolean
  retry: boolean
  fallback: boolean
  notify: boolean
  delay: number
  maxAttempts: number
}

export class SocketErrorHandler {
  private errorHistory: SocketError[] = []
  private errorCounts: Map<string, number> = new Map()
  
  classifyError(error: any): SocketError {
    const timestamp = new Date()
    let type: SocketError['type']
    let severity: SocketError['severity']
    let recoverable = true
    
    try {
      // Classify error based on message and code
      if (error?.message?.includes('server error') || error?.type === 'server error') {
        type = 'server'
        severity = 'high'
        recoverable = true
      } else if (error?.code === 'ECONNREFUSED') {
        type = 'connection'
        severity = 'critical'
        recoverable = true
      } else if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) {
        type = 'timeout'
        severity = 'medium'
        recoverable = true
      } else if (error?.message?.includes('transport')) {
        type = 'transport'
        severity = 'medium'
        recoverable = true
      } else if (error?.message?.includes('parse')) {
        type = 'parse'
        severity = 'low'
        recoverable = false
      } else if (error?.code === 'ENETUNREACH' || error?.code === 'EHOSTUNREACH') {
        type = 'network'
        severity = 'high'
        recoverable = true
      } else {
        type = 'connection'
        severity = 'medium'
        recoverable = true
      }
    } catch (classifyError) {
      console.error('Error classifying socket error:', classifyError)
      // Fallback classification
      type = 'connection'
      severity = 'medium'
      recoverable = true
    }
    
    const socketError: SocketError = {
      type,
      code: error?.code,
      message: error?.message || 'Unknown socket error',
      timestamp,
      recoverable,
      severity
    }
    
    this.errorHistory.push(socketError)
    this.errorCounts.set(type, (this.errorCounts.get(type) || 0) + 1)
    
    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50)
    }
    
    return socketError
  }
  
  getRecoveryStrategy(error: SocketError, connectionState: ConnectionState): ErrorRecoveryStrategy {
    try {
      const errorCount = this.errorCounts.get(error.type) || 0
      const baseStrategy: ErrorRecoveryStrategy = {
        immediate: false,
        retry: true,
        fallback: false,
        notify: true,
        delay: 1000,
        maxAttempts: 5
      }
      
      if (!connectionState) {
        console.warn('Connection state is null, using base strategy')
        return baseStrategy
      }
      
      switch (error.type) {
        case 'server':
          return {
            ...baseStrategy,
            retry: true,
            delay: Math.min(2000 * Math.pow(2, errorCount), 30000),
            maxAttempts: 3,
            fallback: errorCount > 2
          }
          
        case 'connection':
          return {
            ...baseStrategy,
            retry: true,
            delay: Math.min(1000 * Math.pow(2, connectionState.retryCount || 0), 30000),
            maxAttempts: 5,
            fallback: (connectionState.retryCount || 0) > 3
          }
          
        case 'timeout':
          return {
            ...baseStrategy,
            immediate: true,
            retry: true,
            delay: 2000,
            maxAttempts: 3
          }
          
        case 'transport':
          return {
            ...baseStrategy,
            immediate: true,
            retry: true,
            delay: 500,
            maxAttempts: 2,
            fallback: true
          }
          
        case 'network':
          return {
            ...baseStrategy,
            retry: true,
            delay: 5000,
            maxAttempts: 3,
            fallback: true
          }
          
        case 'parse':
          return {
            ...baseStrategy,
            retry: false,
            fallback: false,
            notify: false
          }
          
        default:
          return baseStrategy
      }
    } catch (strategyError) {
      console.error('Error generating recovery strategy:', strategyError)
      // Return safe fallback strategy
      return {
        immediate: false,
        retry: true,
        fallback: true,
        notify: true,
        delay: 5000,
        maxAttempts: 3
      }
    }
  }
  
  shouldFallbackToHTTP(connectionState: ConnectionState): boolean {
    const recentErrors = this.errorHistory.filter(
      error => Date.now() - error.timestamp.getTime() < 60000 // Last minute
    )
    
    const criticalErrors = recentErrors.filter(error => 
      error.severity === 'critical' || error.severity === 'high'
    ).length
    
    return (
      connectionState.retryCount >= 3 ||
      connectionState.errorCount >= 5 ||
      criticalErrors >= 3
    )
  }
  
  getErrorSummary() {
    return {
      totalErrors: this.errorHistory.length,
      errorCounts: Object.fromEntries(this.errorCounts),
      recentErrors: this.errorHistory.slice(-10),
      criticalErrorsLastHour: this.errorHistory.filter(
        error => Date.now() - error.timestamp.getTime() < 3600000 &&
        (error.severity === 'critical' || error.severity === 'high')
      ).length
    }
  }
  
  reset() {
    this.errorHistory = []
    this.errorCounts.clear()
  }
}

export const socketErrorHandler = new SocketErrorHandler()