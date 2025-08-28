import { cn, formatDistance, formatRelativeTime, debounce } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
    })

    it('should handle conditional classes', () => {
      expect(cn('btn', { 'btn-primary': true, 'btn-secondary': false })).toBe('btn btn-primary')
    })

    it('should handle undefined and null values', () => {
      expect(cn('btn', undefined, null, 'btn-primary')).toBe('btn btn-primary')
    })

    it('should override conflicting classes correctly', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })
  })

  describe('formatDistance', () => {
    it('should format distances in meters', () => {
      expect(formatDistance(100)).toBe('100m')
      expect(formatDistance(500)).toBe('500m')
      expect(formatDistance(999)).toBe('999m')
    })

    it('should format distances in kilometers', () => {
      expect(formatDistance(1000)).toBe('1.0km')
      expect(formatDistance(1500)).toBe('1.5km')
      expect(formatDistance(2000)).toBe('2.0km')
      expect(formatDistance(10000)).toBe('10.0km')
    })

    it('should handle edge cases', () => {
      expect(formatDistance(0)).toBe('0m')
      expect(formatDistance(-100)).toBe('100m') // absolute value
    })

    it('should handle decimal precision correctly', () => {
      expect(formatDistance(1234)).toBe('1.2km')
      expect(formatDistance(1567)).toBe('1.6km')
    })
  })

  describe('formatRelativeTime', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    
    beforeAll(() => {
      jest.useFakeTimers()
      jest.setSystemTime(now)
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('should format recent times', () => {
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)

      expect(formatRelativeTime(oneMinuteAgo)).toBe('1m ago')
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')
      expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30m ago')
    })

    it('should format times in hours', () => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
      
      expect(formatRelativeTime(oneHourAgo)).toBe('1h ago')
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago')
    })

    it('should format times in days', () => {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      
      expect(formatRelativeTime(oneDayAgo)).toBe('1d ago')
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
    })

    it('should handle just now', () => {
      const justNow = new Date(now.getTime() - 10 * 1000) // 10 seconds ago
      expect(formatRelativeTime(justNow)).toBe('Just now')
    })

    it('should handle future dates', () => {
      const future = new Date(now.getTime() + 60 * 1000)
      expect(formatRelativeTime(future)).toBe('Just now')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should debounce function calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments correctly', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2')

      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      jest.advanceTimersByTime(50)
      debouncedFn()
      jest.advanceTimersByTime(50)

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should work with different delay values', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 200)

      debouncedFn()

      jest.advanceTimersByTime(100)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })
})