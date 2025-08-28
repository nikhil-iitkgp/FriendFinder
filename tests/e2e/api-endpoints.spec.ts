import { test, expect } from '@playwright/test'

test.describe('API Endpoints E2E Tests', () => {
  let authToken: string
  let userId: string

  test.beforeAll(async ({ request }) => {
    // Create a test user and get auth token
    const timestamp = Date.now()
    const testUser = {
      username: `apitest${timestamp}`,
      email: `apitest${timestamp}@example.com`,
      password: 'password123'
    }

    // Register test user
    const registerResponse = await request.post('http://localhost:3000/api/users/register', {
      data: testUser
    })
    expect(registerResponse.ok()).toBeTruthy()

    // Login to get session
    const loginResponse = await request.post('http://localhost:3000/api/auth/signin/credentials', {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    })
    expect(loginResponse.ok()).toBeTruthy()
  })

  test.describe('User Management APIs', () => {
    test('GET /api/users/me should return current user', async ({ request, page }) => {
      // Login first to get session
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await expect(page).toHaveURL('/dashboard')

      // Get cookies for API request
      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const response = await request.get('http://localhost:3000/api/users/me', {
        headers: {
          'Cookie': cookieString
        }
      })

      expect(response.status()).toBe(200)
      const user = await response.json()
      expect(user).toHaveProperty('username')
      expect(user).toHaveProperty('email')
    })

    test('PUT /api/users/profile should update user profile', async ({ request, page }) => {
      // Login first
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await expect(page).toHaveURL('/dashboard')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const updateData = {
        bio: `Updated bio ${Date.now()}`,
        isDiscoveryEnabled: true,
        discoveryRange: 1000
      }

      const response = await request.put('http://localhost:3000/api/users/profile', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: updateData
      })

      expect(response.status()).toBe(200)
      const result = await response.json()
      expect(result.bio).toBe(updateData.bio)
    })
  })

  test.describe('Location APIs', () => {
    test('POST /api/users/location should update user location', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const locationData = {
        latitude: 40.7128,
        longitude: -74.0060
      }

      const response = await request.post('http://localhost:3000/api/users/location', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: locationData
      })

      expect(response.status()).toBe(200)
      const result = await response.json()
      expect(result.message).toBe('Location updated successfully')
    })

    test('POST /api/users/nearby should find nearby users', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const searchData = {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 1000
      }

      const response = await request.post('http://localhost:3000/api/users/nearby', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: searchData
      })

      expect(response.status()).toBe(200)
      const result = await response.json()
      expect(Array.isArray(result)).toBeTruthy()
    })
  })

  test.describe('Friend Request APIs', () => {
    test('POST /api/friends/request should send friend request', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      // First, search for a user to send request to
      const searchResponse = await request.get('http://localhost:3000/api/users/search?q=john', {
        headers: {
          'Cookie': cookieString
        }
      })

      if (searchResponse.status() === 200) {
        const users = await searchResponse.json()
        if (users.length > 0) {
          const targetUserId = users[0].id

          const response = await request.post('http://localhost:3000/api/friends/request', {
            headers: {
              'Cookie': cookieString,
              'Content-Type': 'application/json'
            },
            data: { targetUserId }
          })

          // Should either succeed or fail with a specific reason
          expect([200, 400]).toContain(response.status())
        }
      }
    })

    test('GET /api/friends/request should fetch friend requests', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const response = await request.get('http://localhost:3000/api/friends/request?type=received', {
        headers: {
          'Cookie': cookieString
        }
      })

      expect(response.status()).toBe(200)
      const result = await response.json()
      expect(result).toHaveProperty('requests')
      expect(result).toHaveProperty('count')
      expect(Array.isArray(result.requests)).toBeTruthy()
    })
  })

  test.describe('Messaging APIs', () => {
    test('GET /api/messages should fetch messages with friend', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      // Use a dummy friend ID - should return 403 if not friends
      const dummyFriendId = '507f1f77bcf86cd799439011'
      
      const response = await request.get(`http://localhost:3000/api/messages?friendId=${dummyFriendId}`, {
        headers: {
          'Cookie': cookieString
        }
      })

      // Should return 403 (not friends) or 200 (if they are friends)
      expect([200, 403]).toContain(response.status())
    })

    test('POST /api/messages should send message to friend', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const messageData = {
        friendId: '507f1f77bcf86cd799439011',
        content: 'Test message',
        type: 'text'
      }

      const response = await request.post('http://localhost:3000/api/messages', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: messageData
      })

      // Should return 403 (not friends) or 200 (if they are friends)
      expect([200, 403]).toContain(response.status())
    })
  })

  test.describe('Discovery APIs', () => {
    test('POST /api/users/presence should update WiFi presence', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const presenceData = {
        bssid: 'aa:bb:cc:dd:ee:ff',
        ssid: 'TestNetwork'
      }

      const response = await request.post('http://localhost:3000/api/users/presence', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: presenceData
      })

      expect(response.status()).toBe(200)
    })

    test('POST /api/users/bluetooth should update Bluetooth presence', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const bluetoothData = {
        bluetoothId: 'bt-device-123'
      }

      const response = await request.post('http://localhost:3000/api/users/bluetooth', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: bluetoothData
      })

      expect(response.status()).toBe(200)
    })
  })

  test.describe('Error Handling', () => {
    test('should return 401 for unauthorized requests', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/users/me')
      expect(response.status()).toBe(401)
    })

    test('should validate request data', async ({ request, page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const cookies = await page.context().cookies()
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      // Test invalid location data
      const response = await request.post('http://localhost:3000/api/users/location', {
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json'
        },
        data: {
          latitude: 'invalid',
          longitude: 'invalid'
        }
      })

      expect(response.status()).toBe(400)
    })
  })
})
