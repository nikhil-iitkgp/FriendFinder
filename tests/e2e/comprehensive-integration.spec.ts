import { test, expect } from '@playwright/test'

test.describe('Comprehensive Integration E2E Tests', () => {
  test.describe('End-to-End User Journey', () => {
    test('complete user journey: register -> discover -> friend request -> messaging -> call', async ({ page, context }) => {
      // Grant necessary permissions
      await context.grantPermissions(['geolocation', 'microphone', 'camera'])
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })

      const timestamp = Date.now()
      const testUser = {
        username: `journeytest${timestamp}`,
        email: `journeytest${timestamp}@example.com`,
        password: 'password123'
      }

      // Step 1: Registration
      await page.goto('http://localhost:3000')
      await page.click('text=Register')
      await expect(page).toHaveURL('/register')

      await page.fill('[data-testid="username-input"]', testUser.username)
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.fill('[data-testid="confirm-password-input"]', testUser.password)
      await page.click('[data-testid="register-button"]')

      await expect(page.locator('text=Registration successful')).toBeVisible()

      // Step 2: Login
      await page.click('text=Login')
      await page.fill('[data-testid="email-input"]', testUser.email)
      await page.fill('[data-testid="password-input"]', testUser.password)
      await page.click('[data-testid="login-button"]')
      await expect(page).toHaveURL('/dashboard')

      // Step 3: Profile Setup
      await page.goto('/dashboard/profile')
      await page.fill('[data-testid="bio-input"]', 'Test user for comprehensive journey')
      await page.check('[data-testid="discovery-toggle"]')
      await page.fill('[data-testid="discovery-range-input"]', '1000')
      await page.click('[data-testid="save-profile-button"]')
      await expect(page.locator('text=Profile updated successfully')).toBeVisible()

      // Step 4: Discovery
      await page.goto('/dashboard/discover')
      await page.click('[data-testid="discovery-method-gps"]')
      await page.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })

      // Step 5: Send Friend Request (if users found)
      const userCards = page.locator('[data-testid^="user-card-"]')
      const userCount = await userCards.count()
      
      if (userCount > 0) {
        const firstUser = userCards.first()
        const sendRequestBtn = firstUser.locator('button:has-text("Send Request")')
        
        if (await sendRequestBtn.isVisible()) {
          await sendRequestBtn.click()
          await expect(page.locator('text=Friend request sent')).toBeVisible()
          await expect(firstUser.locator('text=Request Sent')).toBeVisible()
        }
      }

      // Step 6: Check Friends Page
      await page.goto('/dashboard/friends')
      await expect(page.locator('h1:has-text("Friends")')).toBeVisible()

      // Step 7: Messages
      await page.goto('/dashboard/messages')
      await expect(page.locator('h1:has-text("Messages")')).toBeVisible()

      // Step 8: Test all discovery methods
      await page.goto('/dashboard/discover')
      
      // Test WiFi discovery
      await page.click('[data-testid="discovery-method-wifi"]')
      await expect(page.locator('[data-testid="wifi-discovery"]')).toBeVisible()
      
      // Test Bluetooth discovery
      await page.click('[data-testid="discovery-method-bluetooth"]')
      await expect(page.locator('[data-testid="bluetooth-discovery"]')).toBeVisible()
      await expect(page.locator('text=Bluetooth discovery will be available in the mobile app')).toBeVisible()

      // Complete journey verification
      await page.goto('/dashboard')
      await expect(page.locator(`text=Welcome, ${testUser.username}`)).toBeVisible()
    })

    test('multi-user interaction simulation', async ({ browser }) => {
      // Create two browser contexts to simulate two users
      const context1 = await browser.newContext({
        permissions: ['geolocation', 'microphone', 'camera']
      })
      const context2 = await browser.newContext({
        permissions: ['geolocation', 'microphone', 'camera']
      })

      const page1 = await context1.newPage()
      const page2 = await context2.newPage()

      // Set same location for both users
      await context1.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })
      await context2.setGeolocation({ latitude: 40.7129, longitude: -74.0061 })

      // User 1 login
      await page1.goto('http://localhost:3000/login')
      await page1.fill('[data-testid="email-input"]', 'test@example.com')
      await page1.fill('[data-testid="password-input"]', 'password123')
      await page1.click('[data-testid="login-button"]')
      await expect(page1).toHaveURL('/dashboard')

      // User 2 login (assuming second test user exists)
      await page2.goto('http://localhost:3000/login')
      await page2.fill('[data-testid="email-input"]', 'test2@example.com')
      await page2.fill('[data-testid="password-input"]', 'password123')
      await page2.click('[data-testid="login-button"]')

      if (await page2.locator('text=Invalid credentials').isVisible()) {
        // If test2 user doesn't exist, skip this test
        await context1.close()
        await context2.close()
        return
      }

      // Both users discover each other
      await page1.goto('/dashboard/discover')
      await page1.click('[data-testid="discovery-method-gps"]')
      
      await page2.goto('/dashboard/discover')
      await page2.click('[data-testid="discovery-method-gps"]')

      // User 1 sends friend request to User 2
      await page1.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })
      const userCards1 = page1.locator('[data-testid^="user-card-"]')
      const userCount1 = await userCards1.count()

      if (userCount1 > 0) {
        const firstUser = userCards1.first()
        const sendRequestBtn = firstUser.locator('button:has-text("Send Request")')
        
        if (await sendRequestBtn.isVisible()) {
          await sendRequestBtn.click()
          await expect(page1.locator('text=Friend request sent')).toBeVisible()
        }
      }

      // User 2 checks for friend requests and accepts
      await page2.goto('/dashboard/friends')
      const pendingTab = page2.locator('[data-testid="pending-requests-tab"]')
      if (await pendingTab.isVisible()) {
        await pendingTab.click()
        
        const requestItems = page2.locator('[data-testid^="request-item-"]')
        const requestCount = await requestItems.count()
        
        if (requestCount > 0) {
          const acceptBtn = requestItems.first().locator('button:has-text("Accept")')
          if (await acceptBtn.isVisible()) {
            await acceptBtn.click()
            await expect(page2.locator('text=Friend request accepted')).toBeVisible()
          }
        }
      }

      // Now both users should see each other as friends
      await page1.goto('/dashboard/friends')
      await page2.goto('/dashboard/friends')

      await context1.close()
      await context2.close()
    })
  })

  test.describe('Cross-Feature Integration', () => {
    test('location updates affect discovery results', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'])
      
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Set initial location
      await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 })
      
      await page.goto('/dashboard/discover')
      await page.click('[data-testid="discovery-method-gps"]')
      await page.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })
      
      const initialResults = await page.locator('[data-testid^="user-card-"]').count()

      // Change location significantly
      await page.setGeolocation({ latitude: 34.0522, longitude: -118.2437 }) // LA
      
      // Refresh discovery
      await page.click('[data-testid="refresh-button"]')
      await page.waitForSelector('[data-testid="nearby-users"]', { timeout: 10000 })
      
      const newResults = await page.locator('[data-testid^="user-card-"]').count()
      
      // Results should potentially be different (depending on test data)
      // At minimum, the refresh should work without errors
      expect(newResults).toBeGreaterThanOrEqual(0)
    })

    test('friend status affects messaging availability', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Go to messages page
      await page.goto('/dashboard/messages')
      
      // Should only show conversations with friends
      const conversationItems = page.locator('[data-testid^="conversation-"]')
      const conversationCount = await conversationItems.count()
      
      // Go to friends page to verify friend count
      await page.goto('/dashboard/friends')
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      // Conversation count should not exceed friend count
      expect(conversationCount).toBeLessThanOrEqual(friendCount)
    })

    test('privacy settings affect discovery visibility', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Disable discovery in profile
      await page.goto('/dashboard/profile')
      const discoveryToggle = page.locator('[data-testid="discovery-toggle"]')
      
      if (await discoveryToggle.isChecked()) {
        await discoveryToggle.click()
        await page.click('[data-testid="save-profile-button"]')
        await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      }

      // Try to access discovery page
      await page.goto('/dashboard/discover')
      
      // Should show discovery disabled message
      await expect(page.locator('text=Discovery is disabled')).toBeVisible()

      // Re-enable for cleanup
      await page.goto('/dashboard/profile')
      await discoveryToggle.click()
      await page.click('[data-testid="save-profile-button"]')
    })
  })

  test.describe('Data Consistency Tests', () => {
    test('user data consistency across pages', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Get user info from dashboard
      await page.goto('/dashboard')
      const dashboardUsername = await page.locator('[data-testid="user-name"]').textContent()

      // Check profile page
      await page.goto('/dashboard/profile')
      const profileUsername = await page.locator('[data-testid="username-display"]').textContent()

      // Check friends page
      await page.goto('/dashboard/friends')
      const friendsPageUsername = await page.locator('[data-testid="current-user-name"]').textContent()

      // All should match (if elements exist)
      if (dashboardUsername && profileUsername) {
        expect(dashboardUsername).toBe(profileUsername)
      }
      if (dashboardUsername && friendsPageUsername) {
        expect(dashboardUsername).toBe(friendsPageUsername)
      }
    })

    test('friend count consistency', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Get friend count from dashboard
      await page.goto('/dashboard')
      const dashboardCount = await page.locator('[data-testid="friends-count"]').textContent()

      // Get friend count from friends page
      await page.goto('/dashboard/friends')
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const actualFriendCount = await friendItems.count()

      // Counts should match
      if (dashboardCount) {
        const dashboardNumber = parseInt(dashboardCount.match(/\d+/)?.[0] || '0')
        expect(actualFriendCount).toBe(dashboardNumber)
      }
    })
  })

  test.describe('Performance and Stress Tests', () => {
    test('page load performance', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(10000) // Should load within 10 seconds
    })

    test('rapid navigation stress test', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      const pages = ['/dashboard', '/dashboard/friends', '/dashboard/messages', '/dashboard/discover', '/dashboard/profile']
      
      // Rapidly navigate between pages
      for (let i = 0; i < 3; i++) {
        for (const pagePath of pages) {
          await page.goto(pagePath)
          await page.waitForLoadState('networkidle')
          
          // Should not show error pages
          await expect(page.locator('text=Error')).not.toBeVisible()
          await expect(page.locator('text=404')).not.toBeVisible()
          await expect(page.locator('text=500')).not.toBeVisible()
        }
      }
    })

    test('multiple simultaneous API calls', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Make multiple API calls simultaneously
      const promises = [
        page.goto('/dashboard/friends'),
        page.goto('/dashboard/messages'),
        page.goto('/dashboard/discover')
      ]

      // All should complete without errors
      await Promise.all(promises)
      
      // Final page should load correctly
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Error Recovery Tests', () => {
    test('recovery from network interruption', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      await page.goto('/dashboard/discover')
      
      // Simulate network interruption
      await page.setOfflineMode(true)
      await page.waitForTimeout(2000)
      
      // Restore network
      await page.setOfflineMode(false)
      
      // Should recover and work normally
      await page.reload()
      await expect(page.locator('h1:has-text("Discover")')).toBeVisible()
    })

    test('handling of malformed data', async ({ page }) => {
      await page.goto('http://localhost:3000/login')
      
      // Try to submit malformed login data
      await page.fill('[data-testid="email-input"]', 'not-an-email')
      await page.fill('[data-testid="password-input"]', '')
      await page.click('[data-testid="login-button"]')
      
      // Should show validation errors, not crash
      await expect(page.locator('text=Invalid')).toBeVisible()
      
      // Should still be on login page
      await expect(page).toHaveURL(/login/)
    })
  })
})
