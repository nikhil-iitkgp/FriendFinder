import { test, expect } from '@playwright/test'

test.describe('Location and Discovery E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('GPS Location Features', () => {
    test('should request location permission and update location', async ({ page, context }) => {
      // Grant geolocation permission
      await context.grantPermissions(['geolocation'])
      
      // Mock geolocation
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })
      
      // Navigate to discover page
      await page.goto('/dashboard/discover')
      
      // Should show GPS discovery option
      await expect(page.locator('text=GPS')).toBeVisible()
      
      // Click GPS discovery method
      await page.click('[data-testid="discovery-method-gps"]')
      
      // Should request location and show nearby users
      await expect(page.locator('[data-testid="nearby-users"]')).toBeVisible({ timeout: 10000 })
    })

    test('should handle location permission denied', async ({ page, context }) => {
      // Deny geolocation permission
      await context.clearPermissions()
      
      await page.goto('/dashboard/discover')
      
      // Click GPS discovery
      await page.click('[data-testid="discovery-method-gps"]')
      
      // Should show permission error
      await expect(page.locator('text=Location permission denied')).toBeVisible({ timeout: 5000 })
    })

    test('should update discovery range', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'])
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })
      
      await page.goto('/dashboard/profile')
      
      // Update discovery range
      await page.fill('[data-testid="discovery-range-input"]', '2000')
      await page.click('[data-testid="save-profile-button"]')
      
      await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      
      // Verify range is saved
      await page.reload()
      await expect(page.locator('[data-testid="discovery-range-input"]')).toHaveValue('2000')
    })
  })

  test.describe('WiFi Discovery Features', () => {
    test('should show WiFi discovery option', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Should show WiFi discovery method
      await expect(page.locator('text=WiFi')).toBeVisible()
      
      // Click WiFi discovery
      await page.click('[data-testid="discovery-method-wifi"]')
      
      // Should show WiFi discovery interface
      await expect(page.locator('[data-testid="wifi-discovery"]')).toBeVisible()
    })

    test('should simulate WiFi network detection', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Click WiFi discovery
      await page.click('[data-testid="discovery-method-wifi"]')
      
      // Should attempt to detect network
      await expect(page.locator('text=Detecting WiFi network')).toBeVisible({ timeout: 5000 })
      
      // Should show network info or error
      const networkInfo = page.locator('[data-testid="network-info"]')
      const networkError = page.locator('text=Unable to detect WiFi network')
      
      await expect(networkInfo.or(networkError)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Bluetooth Discovery Features', () => {
    test('should show Bluetooth discovery option', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Should show Bluetooth discovery method
      await expect(page.locator('text=Bluetooth')).toBeVisible()
      
      // Click Bluetooth discovery
      await page.click('[data-testid="discovery-method-bluetooth"]')
      
      // Should show Bluetooth discovery interface
      await expect(page.locator('[data-testid="bluetooth-discovery"]')).toBeVisible()
    })

    test('should show mobile app message for Bluetooth', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Click Bluetooth discovery
      await page.click('[data-testid="discovery-method-bluetooth"]')
      
      // Should show message about mobile app
      await expect(page.locator('text=Bluetooth discovery will be available in the mobile app')).toBeVisible()
    })

    test('should simulate Bluetooth scanning', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Click Bluetooth discovery
      await page.click('[data-testid="discovery-method-bluetooth"]')
      
      // Should show scanning status
      await expect(page.locator('text=Scanning for Bluetooth devices')).toBeVisible({ timeout: 5000 })
      
      // Should show simulated results or message
      const bluetoothResults = page.locator('[data-testid="bluetooth-results"]')
      const bluetoothMessage = page.locator('text=No Bluetooth devices found')
      
      await expect(bluetoothResults.or(bluetoothMessage)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Discovery Toggle and Settings', () => {
    test('should toggle discovery methods', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Test GPS toggle
      await page.click('[data-testid="discovery-method-gps"]')
      await expect(page.locator('[data-testid="gps-discovery"]')).toBeVisible()
      
      // Switch to WiFi
      await page.click('[data-testid="discovery-method-wifi"]')
      await expect(page.locator('[data-testid="wifi-discovery"]')).toBeVisible()
      await expect(page.locator('[data-testid="gps-discovery"]')).not.toBeVisible()
      
      // Switch to Bluetooth
      await page.click('[data-testid="discovery-method-bluetooth"]')
      await expect(page.locator('[data-testid="bluetooth-discovery"]')).toBeVisible()
      await expect(page.locator('[data-testid="wifi-discovery"]')).not.toBeVisible()
    })

    test('should disable discovery when setting is off', async ({ page }) => {
      // First disable discovery in profile
      await page.goto('/dashboard/profile')
      
      const discoveryToggle = page.locator('[data-testid="discovery-toggle"]')
      if (await discoveryToggle.isChecked()) {
        await discoveryToggle.click()
        await page.click('[data-testid="save-profile-button"]')
        await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      }
      
      // Navigate to discover page
      await page.goto('/dashboard/discover')
      
      // Should show discovery disabled message
      await expect(page.locator('text=Discovery is disabled')).toBeVisible()
      
      // Re-enable discovery
      await page.goto('/dashboard/profile')
      await discoveryToggle.click()
      await page.click('[data-testid="save-profile-button"]')
    })
  })

  test.describe('Nearby Users Display', () => {
    test('should display nearby users with correct information', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'])
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })
      
      await page.goto('/dashboard/discover')
      await page.click('[data-testid="discovery-method-gps"]')
      
      // Wait for nearby users to load
      await page.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })
      
      const userCards = page.locator('[data-testid^="user-card-"]')
      const userCount = await userCards.count()
      
      if (userCount > 0) {
        const firstUser = userCards.first()
        
        // Should show user information
        await expect(firstUser.locator('[data-testid="user-name"]')).toBeVisible()
        await expect(firstUser.locator('[data-testid="user-distance"]')).toBeVisible()
        await expect(firstUser.locator('[data-testid="user-avatar"]')).toBeVisible()
        
        // Should show action buttons
        const sendRequestBtn = firstUser.locator('button:has-text("Send Request")')
        const alreadyFriendsBtn = firstUser.locator('text=Friends')
        const requestSentBtn = firstUser.locator('text=Request Sent')
        
        // One of these should be visible
        await expect(sendRequestBtn.or(alreadyFriendsBtn).or(requestSentBtn)).toBeVisible()
      }
    })

    test('should show empty state when no users found', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'])
      // Set location to a remote area
      await page.setGeolocation({ latitude: 0, longitude: 0 })
      
      await page.goto('/dashboard/discover')
      await page.click('[data-testid="discovery-method-gps"]')
      
      // Should show no users found message
      await expect(page.locator('text=No users found nearby')).toBeVisible({ timeout: 10000 })
    })

    test('should refresh nearby users', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'])
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })
      
      await page.goto('/dashboard/discover')
      await page.click('[data-testid="discovery-method-gps"]')
      
      // Wait for initial load
      await page.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })
      
      // Click refresh button
      await page.click('[data-testid="refresh-button"]')
      
      // Should show loading state
      await expect(page.locator('text=Searching for nearby users')).toBeVisible()
      
      // Should reload results
      await page.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })
    })
  })

  test.describe('Location Privacy', () => {
    test('should respect location privacy settings', async ({ page }) => {
      await page.goto('/dashboard/profile')
      
      // Disable discovery
      const discoveryToggle = page.locator('[data-testid="discovery-toggle"]')
      if (await discoveryToggle.isChecked()) {
        await discoveryToggle.click()
        await page.click('[data-testid="save-profile-button"]')
        await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      }
      
      // User should not appear in other users' discovery
      // This would need to be tested with multiple user sessions
      
      // Re-enable for cleanup
      await discoveryToggle.click()
      await page.click('[data-testid="save-profile-button"]')
    })

    test('should clear location data', async ({ page }) => {
      await page.goto('/dashboard/profile')
      
      // Look for clear location button
      const clearLocationBtn = page.locator('[data-testid="clear-location-button"]')
      if (await clearLocationBtn.isVisible()) {
        await clearLocationBtn.click()
        
        // Should show confirmation
        await expect(page.locator('text=Location data cleared')).toBeVisible()
      }
    })
  })
})
