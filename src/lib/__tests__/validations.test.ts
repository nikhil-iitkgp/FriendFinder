import { 
  loginSchema, 
  registerSchema, 
  profileUpdateSchema, 
  locationSchema, 
  wifiDataSchema, 
  bluetoothDataSchema 
} from '@/lib/validations'

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email')
      }
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password')
      }
    })

    it('should reject missing fields', () => {
      const invalidData = { email: 'test@example.com' }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject short username', () => {
      const invalidData = {
        username: 'ab',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('username')
      }
    })

    it('should reject weak password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('password'))).toBe(true)
      }
    })

    it('should reject password mismatch', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword')
      }
    })

    it('should accept valid password with requirements', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('profileUpdateSchema', () => {
    it('should validate correct profile update data', () => {
      const validData = {
        bio: 'This is a test bio',
        isDiscoveryEnabled: true,
        discoveryRange: 1000
      }

      const result = profileUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty bio', () => {
      const validData = {
        bio: '',
        isDiscoveryEnabled: false,
        discoveryRange: 500
      }

      const result = profileUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject bio that is too long', () => {
      const invalidData = {
        bio: 'a'.repeat(501), // 501 characters
        isDiscoveryEnabled: true,
        discoveryRange: 1000
      }

      const result = profileUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('bio')
      }
    })

    it('should reject invalid discovery range', () => {
      const invalidData = {
        bio: 'Valid bio',
        isDiscoveryEnabled: true,
        discoveryRange: 50 // too small
      }

      const result = profileUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('discoveryRange')
      }
    })

    it('should reject discovery range that is too large', () => {
      const invalidData = {
        bio: 'Valid bio',
        isDiscoveryEnabled: true,
        discoveryRange: 20000 // too large
      }

      const result = profileUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('discoveryRange')
      }
    })
  })

  describe('locationSchema', () => {
    it('should validate correct location data', () => {
      const validData = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10
      }

      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid latitude', () => {
      const invalidData = {
        latitude: 91, // out of range
        longitude: -74.0060,
        accuracy: 10
      }

      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('latitude')
      }
    })

    it('should reject invalid longitude', () => {
      const invalidData = {
        latitude: 40.7128,
        longitude: 181, // out of range
        accuracy: 10
      }

      const result = locationSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('longitude')
      }
    })

    it('should accept optional accuracy', () => {
      const validData = {
        latitude: 40.7128,
        longitude: -74.0060
      }

      const result = locationSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('wifiDataSchema', () => {
    it('should validate correct WiFi data', () => {
      const validData = {
        bssid: '00:11:22:33:44:55',
        ssid: 'TestNetwork'
      }

      const result = wifiDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional SSID', () => {
      const validData = {
        bssid: '00:11:22:33:44:55'
      }

      const result = wifiDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty BSSID', () => {
      const invalidData = {
        bssid: '',
        ssid: 'TestNetwork'
      }

      const result = wifiDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('bssid')
      }
    })
  })

  describe('bluetoothDataSchema', () => {
    it('should validate correct Bluetooth data', () => {
      const validData = {
        deviceId: 'BT:00:11:22:33:44:55',
        deviceName: 'Test Device'
      }

      const result = bluetoothDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept optional device name', () => {
      const validData = {
        deviceId: 'BT:00:11:22:33:44:55'
      }

      const result = bluetoothDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty device ID', () => {
      const invalidData = {
        deviceId: '',
        deviceName: 'Test Device'
      }

      const result = bluetoothDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('deviceId')
      }
    })
  })
})