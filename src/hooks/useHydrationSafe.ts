'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to prevent hydration mismatches with responsive design
 * Returns true only after component has mounted on client
 */
export function useHydrationSafe() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return mounted
}

/**
 * Hook for responsive breakpoints that are hydration-safe
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const mounted = useHydrationSafe()
  
  useEffect(() => {
    if (!mounted) return
    
    const checkBreakpoint = () => {
      if (window.innerWidth < 768) {
        setBreakpoint('mobile')
      } else if (window.innerWidth < 1024) {
        setBreakpoint('tablet')  
      } else {
        setBreakpoint('desktop')
      }
    }
    
    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [mounted])
  
  // Always return desktop during SSR to match initial render
  if (!mounted) {
    return 'desktop'
  }
  
  return breakpoint
}