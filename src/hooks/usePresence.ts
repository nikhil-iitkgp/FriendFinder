import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface UsePresenceOptions {
  interval?: number // Heartbeat interval in milliseconds
  enabled?: boolean
}

export function usePresence(options: UsePresenceOptions = {}) {
  const { data: session, status } = useSession()
  const { interval = 30000, enabled = true } = options // Default 30 seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === 'loading' || !session?.user || !enabled) {
      return
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (error) {
        console.error('Failed to send presence heartbeat:', error)
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up periodic heartbeat
    intervalRef.current = setInterval(sendHeartbeat, interval)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [session, status, interval, enabled])

  // Send heartbeat on page focus
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user && enabled) {
        fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch(error => {
          console.error('Failed to send focus heartbeat:', error)
        })
      }
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [session, enabled])

  // Send heartbeat on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session?.user && enabled) {
        fetch('/api/users/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch(error => {
          console.error('Failed to send visibility heartbeat:', error)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [session, enabled])
}