export interface LocationCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: number
}

export interface LocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export interface NearbyUser {
  id: string
  name: string
  avatar?: string
  distance: number // in meters
  lastSeen: Date
  location: {
    latitude: number
    longitude: number
  }
  discoveryMethod: 'gps' | 'wifi' | 'bluetooth'
  // Friendship status for messaging functionality
  isFriend: boolean
  hasPendingRequestFrom: boolean
  hasPendingRequestTo: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

class GeolocationService {
  private watchId: number | null = null
  private currentLocation: LocationCoordinates | null = null
  private isWatching = false
  
  // Event callbacks
  private onLocationUpdate: ((location: LocationCoordinates) => void) | null = null
  private onLocationError: ((error: string) => void) | null = null
  private onPermissionChange: ((granted: boolean) => void) | null = null

  constructor() {
    this.checkPermissionStatus()
  }

  // Check if geolocation is supported
  isSupported(): boolean {
    return 'geolocation' in navigator
  }

  // Check current permission status
  async checkPermissionStatus(): Promise<PermissionState | null> {
    if (!this.isSupported()) return null

    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        return permission.state
      }
    } catch (error) {
      console.warn('Unable to check geolocation permission:', error)
    }
    return null
  }

  // Request geolocation permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      this.onLocationError?.('Geolocation is not supported by this browser')
      return false
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.onPermissionChange?.(true)
          resolve(true)
        },
        (error) => {
          this.onPermissionChange?.(false)
          this.handleGeolocationError(error)
          resolve(false)
        },
        { timeout: 10000 }
      )
    })
  }

  // Get current position once
  async getCurrentPosition(options?: LocationOptions): Promise<LocationCoordinates | null> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported')
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 15000,
      maximumAge: options?.maximumAge ?? 300000 // 5 minutes
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.convertPosition(position)
          this.currentLocation = location
          resolve(location)
        },
        (error) => {
          this.handleGeolocationError(error)
          reject(new Error(this.getErrorMessage(error)))
        },
        defaultOptions
      )
    })
  }

  // Start watching position changes
  startWatching(options?: LocationOptions): boolean {
    if (!this.isSupported()) {
      this.onLocationError?.('Geolocation is not supported')
      return false
    }

    if (this.isWatching) {
      console.warn('Already watching location')
      return true
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 15000,
      maximumAge: options?.maximumAge ?? 60000 // 1 minute
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.convertPosition(position)
        this.currentLocation = location
        this.onLocationUpdate?.(location)
      },
      (error) => {
        this.handleGeolocationError(error)
      },
      defaultOptions
    )

    this.isWatching = true
    return true
  }

  // Stop watching position changes
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      this.isWatching = false
    }
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Find nearby users within a specified radius
  async findNearbyUsers(radiusMeters: number = 1000): Promise<NearbyUser[]> {
    if (!this.currentLocation) {
      throw new Error('Current location not available')
    }

    try {
  const response = await fetch(`${API_BASE_URL}/api/users/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: radiusMeters,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch nearby users')
      }

      const nearbyUsers: NearbyUser[] = await response.json()
      
      // Calculate distances for each user
      return nearbyUsers.map(user => ({
        ...user,
        distance: this.calculateDistance(
          this.currentLocation!.latitude,
          this.currentLocation!.longitude,
          user.location.latitude,
          user.location.longitude
        )
      })).sort((a, b) => a.distance - b.distance)
    } catch (error) {
      console.error('Error finding nearby users:', error)
      throw error
    }
  }

  // Update user's location on server
  async updateUserLocation(location?: LocationCoordinates): Promise<void> {
    const loc = location || this.currentLocation
    if (!loc) {
      throw new Error('No location available to update')
    }

    try {
  const response = await fetch(`${API_BASE_URL}/api/users/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          timestamp: loc.timestamp,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update location')
      }
    } catch (error) {
      console.error('Error updating location:', error)
      throw error
    }
  }

  // Convert browser position to our format
  private convertPosition(position: GeolocationPosition): LocationCoordinates {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp,
    }
  }

  // Handle geolocation errors
  private handleGeolocationError(error: GeolocationPositionError): void {
    const message = this.getErrorMessage(error)
    console.error('Geolocation error:', message)
    this.onLocationError?.(message)
  }

  // Get user-friendly error messages
  private getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user'
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable'
      case error.TIMEOUT:
        return 'Location request timed out'
      default:
        return 'An unknown location error occurred'
    }
  }

  // Format distance for display
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    } else if (meters < 10000) {
      return `${(meters / 1000).toFixed(1)}km`
    } else {
      return `${Math.round(meters / 1000)}km`
    }
  }

  // Getters
  getCurrentLocation(): LocationCoordinates | null {
    return this.currentLocation
  }

  getIsWatching(): boolean {
    return this.isWatching
  }

  // Event handlers
  onLocationUpdated(callback: (location: LocationCoordinates) => void): void {
    this.onLocationUpdate = callback
  }

  onError(callback: (error: string) => void): void {
    this.onLocationError = callback
  }

  onPermissionChanged(callback: (granted: boolean) => void): void {
    this.onPermissionChange = callback
  }

  // Cleanup
  destroy(): void {
    this.stopWatching()
    this.onLocationUpdate = null
    this.onLocationError = null
    this.onPermissionChange = null
  }
}

// Create singleton instance
const geolocationService = new GeolocationService()

export default geolocationService
