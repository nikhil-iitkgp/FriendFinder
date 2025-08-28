import geolocationService, { LocationCoordinates } from '@/lib/geolocation'

// Mock the global navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}

// Mock permissions API
const mockPermissions = {
  query: jest.fn(),
}

// Safely mock navigator properties
const originalNavigator = global.navigator
const mockNavigator = {
  ...originalNavigator,
  geolocation: mockGeolocation,
  permissions: mockPermissions,
}

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
  configurable: true,
})

describe('GeolocationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    geolocationService.destroy()
  })

  afterAll(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  describe('isSupported', () => {
    it('should return true when geolocation is available', () => {
      expect(geolocationService.isSupported()).toBe(true)
    })

    it('should return false when geolocation is not available', () => {
      const originalGeolocation = global.navigator.geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      })
      
      expect(geolocationService.isSupported()).toBe(false)
      
      Object.defineProperty(global.navigator, 'geolocation', {
        value: originalGeolocation,
        configurable: true,
      })
    })
  })

  describe('getCurrentPosition', () => {
    it('should return coordinates on successful geolocation', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      }

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition)
      })

      const result = await geolocationService.getCurrentPosition()
      
      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: undefined,
        altitudeAccuracy: undefined,
        heading: undefined,
        speed: undefined,
        timestamp: expect.any(Number),
      })
    })

    it('should throw error on geolocation failure', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError)
      })

      await expect(geolocationService.getCurrentPosition()).rejects.toThrow('Location access denied by user')
    })

    it('should use custom options', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5,
        },
        timestamp: Date.now(),
      }

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition)
      })

      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000,
      }

      await geolocationService.getCurrentPosition(options)
      
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      )
    })
  })

  describe('startWatching', () => {
    it('should start watching position', () => {
      const watchId = 123
      mockGeolocation.watchPosition.mockReturnValue(watchId)

      const result = geolocationService.startWatching()
      
      expect(result).toBe(true)
      expect(mockGeolocation.watchPosition).toHaveBeenCalled()
    })

    it('should return false if geolocation is not supported', () => {
      const originalGeolocation = global.navigator.geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      })
      
      const result = geolocationService.startWatching()
      
      expect(result).toBe(false)
      
      Object.defineProperty(global.navigator, 'geolocation', {
        value: originalGeolocation,
        configurable: true,
      })
    })

    it('should call onLocationUpdated callback on position update', () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      }

      const onLocationUpdated = jest.fn()
      geolocationService.onLocationUpdated(onLocationUpdated)

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition)
      })

      geolocationService.startWatching()
      
      expect(onLocationUpdated).toHaveBeenCalledWith({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        altitude: undefined,
        altitudeAccuracy: undefined,
        heading: undefined,
        speed: undefined,
        timestamp: expect.any(Number),
      })
    })

    it('should call onError callback on position error', () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }

      const onError = jest.fn()
      geolocationService.onError(onError)

      mockGeolocation.watchPosition.mockImplementation((success, error) => {
        error(mockError)
      })

      geolocationService.startWatching()
      
      expect(onError).toHaveBeenCalledWith('Location information unavailable')
    })
  })

  describe('stopWatching', () => {
    it('should stop watching position', () => {
      const watchId = 123
      mockGeolocation.watchPosition.mockReturnValue(watchId)
      
      geolocationService.startWatching()
      geolocationService.stopWatching()
      
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId)
    })

    it('should not call clearWatch if not watching', () => {
      geolocationService.stopWatching()
      
      expect(mockGeolocation.clearWatch).not.toHaveBeenCalled()
    })
  })

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const point1: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060, timestamp: Date.now() }
      const point2: LocationCoordinates = { latitude: 40.7614, longitude: -73.9776, timestamp: Date.now() }
      
      const distance = geolocationService.calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude)
      
      // Distance between these two points should be approximately 5.9 km
      expect(distance).toBeGreaterThan(5000)
      expect(distance).toBeLessThan(7000)
    })

    it('should return 0 for same coordinates', () => {
      const point1: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060, timestamp: Date.now() }
      const point2: LocationCoordinates = { latitude: 40.7128, longitude: -74.0060, timestamp: Date.now() }
      
      const distance = geolocationService.calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude)
      
      expect(distance).toBe(0)
    })

    it('should handle coordinates at the equator', () => {
      const point1: LocationCoordinates = { latitude: 0, longitude: 0, timestamp: Date.now() }
      const point2: LocationCoordinates = { latitude: 0, longitude: 1, timestamp: Date.now() }
      
      const distance = geolocationService.calculateDistance(point1.latitude, point1.longitude, point2.latitude, point2.longitude)
      
      // 1 degree longitude at equator is approximately 111 km
      expect(distance).toBeGreaterThan(110000)
      expect(distance).toBeLessThan(112000)
    })
  })

  describe('formatDistance', () => {
    it('should format distances in meters for small values', () => {
      expect(geolocationService.formatDistance(100)).toBe('100m')
      expect(geolocationService.formatDistance(999)).toBe('999m')
    })

    it('should format distances in kilometers for large values', () => {
      expect(geolocationService.formatDistance(1000)).toBe('1.0km')
      expect(geolocationService.formatDistance(1500)).toBe('1.5km')
      expect(geolocationService.formatDistance(2000)).toBe('2.0km')
    })

    it('should handle decimal precision correctly', () => {
      expect(geolocationService.formatDistance(1234)).toBe('1.2km')
      expect(geolocationService.formatDistance(1567)).toBe('1.6km')
    })
  })

  describe('checkPermissionStatus', () => {
    it('should return permission status when permissions API is available', async () => {
      mockPermissions.query.mockResolvedValue({ state: 'granted' })
      
      const status = await geolocationService.checkPermissionStatus()
      
      expect(status).toBe('granted')
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' })
    })

    it('should return null when permissions API is not available', async () => {
      const originalPermissions = global.navigator.permissions
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        configurable: true,
      })
      
      const status = await geolocationService.checkPermissionStatus()
      expect(status).toBe(null)
      
      Object.defineProperty(global.navigator, 'permissions', {
        value: originalPermissions,
        configurable: true,
      })
    })
  })

  describe('requestPermission', () => {
    it('should return true when permission is granted', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      }

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition)
      })

      const result = await geolocationService.requestPermission()
      
      expect(result).toBe(true)
    })

    it('should return false when permission is denied', async () => {
      const mockError = {
        code: 1,
        message: 'Permission denied',
      }

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError)
      })

      const result = await geolocationService.requestPermission()
      
      expect(result).toBe(false)
    })
  })

  describe('event handlers', () => {
    it('should register and call onLocationUpdated callback', () => {
      const callback = jest.fn()
      geolocationService.onLocationUpdated(callback)
      
      const mockLocation: LocationCoordinates = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        timestamp: Date.now(),
      }
      
      // Test through the start watching functionality
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      }

      mockGeolocation.watchPosition.mockImplementation((success) => {
        success(mockPosition)
      })

      geolocationService.startWatching()
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
      }))
    })

    it('should register and call onError callback', () => {
      const callback = jest.fn()
      geolocationService.onError(callback)
      
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      }

      mockGeolocation.watchPosition.mockImplementation((success, error) => {
        error(mockError)
      })

      geolocationService.startWatching()
      
      expect(callback).toHaveBeenCalledWith('Location information unavailable')
    })

    it('should register and call onPermissionChanged callback', async () => {
      const callback = jest.fn()
      geolocationService.onPermissionChanged(callback)
      
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        },
        timestamp: Date.now(),
      }

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition)
      })

      await geolocationService.requestPermission()
      
      expect(callback).toHaveBeenCalledWith(true)
    })
  })

  describe('destroy', () => {
    it('should clean up all resources', () => {
      const watchId = 123
      mockGeolocation.watchPosition.mockReturnValue(watchId)
      
      geolocationService.startWatching()
      geolocationService.destroy()
      
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId)
    })
  })
})