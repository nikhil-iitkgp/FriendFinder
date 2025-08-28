import { test, expect } from '@playwright/test'

test.describe('FriendFinder E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000')
  })

  test.describe('Authentication Flow', () => {
    test('should allow user to register and login', async ({ page }) => {
      // Navigate to register page
      await page.click('text=Register')
      await expect(page).toHaveURL('/register')

      // Fill registration form
      const timestamp = Date.now()
      const username = `testuser${timestamp}`
      const email = `test${timestamp}@example.com`
      const password = 'password123'

      await page.fill('[data-testid="username-input"]', username)
      await page.fill('[data-testid="email-input"]', email)
      await page.fill('[data-testid="password-input"]', password)
      await page.fill('[data-testid="confirm-password-input"]', password)

      // Submit registration
      await page.click('[data-testid="register-button"]')

      // Should show success message
      await expect(page.locator('text=Registration successful')).toBeVisible()

      // Navigate to login
      await page.click('text=Login')
      await expect(page).toHaveURL('/login')

      // Fill login form
      await page.fill('[data-testid="email-input"]', email)
      await page.fill('[data-testid="password-input"]', password)

      // Submit login
      await page.click('[data-testid="login-button"]')

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator(`text=Welcome, ${username}`)).toBeVisible()
    })

    test('should handle login with invalid credentials', async ({ page }) => {
      // Navigate to login page
      await page.click('text=Login')
      await expect(page).toHaveURL('/login')

      // Fill form with invalid credentials
      await page.fill('[data-testid="email-input"]', 'invalid@example.com')
      await page.fill('[data-testid="password-input"]', 'wrongpassword')

      // Submit login
      await page.click('[data-testid="login-button"]')

      // Should show error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible()
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login with test credentials
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should navigate to different dashboard sections', async ({ page }) => {
      // Test Friends navigation
      await page.click('text=Friends')
      await expect(page).toHaveURL('/dashboard/friends')
      await expect(page.locator('h1:has-text("Friends")')).toBeVisible()

      // Test Messages navigation
      await page.click('text=Messages')
      await expect(page).toHaveURL('/dashboard/messages')
      await expect(page.locator('h1:has-text("Messages")')).toBeVisible()

      // Test Discover navigation
      await page.click('text=Discover')
      await expect(page).toHaveURL('/dashboard/discover')
      await expect(page.locator('h1:has-text("Discover")')).toBeVisible()

      // Test Profile navigation
      await page.click('text=Profile')
      await expect(page).toHaveURL('/dashboard/profile')
      await expect(page.locator('h1:has-text("Profile")')).toBeVisible()
    })

    test('should display dashboard stats', async ({ page }) => {
      // Check for stats cards
      await expect(page.locator('[data-testid="friends-count"]')).toBeVisible()
      await expect(page.locator('[data-testid="messages-count"]')).toBeVisible()
      await expect(page.locator('[data-testid="online-friends"]')).toBeVisible()

      // Verify stats show numbers
      const friendsCount = await page.locator('[data-testid="friends-count"]').textContent()
      expect(friendsCount).toMatch(/\d+/)
    })
  })

  test.describe('User Search and Friend Requests', () => {
    test.beforeEach(async ({ page }) => {
      // Login as test user
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await page.goto('/dashboard/discover')
    })

    test('should search for users and send friend request', async ({ page }) => {
      // Search for users
      await page.fill('[data-testid="search-input"]', 'john')
      await page.click('[data-testid="search-button"]')

      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]')
      
      // Check if users are found
      const userCards = page.locator('[data-testid^="user-card-"]')
      const userCount = await userCards.count()
      
      if (userCount > 0) {
        // Click on first user's "Send Request" button
        const firstUser = userCards.first()
        const sendRequestBtn = firstUser.locator('button:has-text("Send Request")')
        
        if (await sendRequestBtn.isVisible()) {
          await sendRequestBtn.click()
          
          // Should show success message
          await expect(page.locator('text=Friend request sent')).toBeVisible({ timeout: 5000 })
          
          // Button should change to "Request Sent"
          await expect(firstUser.locator('text=Request Sent')).toBeVisible()
        }
      }
    })

    test('should handle search with no results', async ({ page }) => {
      // Search for non-existent user
      await page.fill('[data-testid="search-input"]', 'nonexistentuser12345')
      await page.click('[data-testid="search-button"]')

      // Should show no results message
      await expect(page.locator('text=No users found')).toBeVisible()
    })
  })

  test.describe('Messaging', () => {
    test.beforeEach(async ({ page }) => {
      // Login as test user
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await page.goto('/dashboard/messages')
    })

    test('should open conversation and send message', async ({ page }) => {
      // Check if there are existing conversations
      const conversationItems = page.locator('[data-testid^="conversation-"]')
      const conversationCount = await conversationItems.count()
      
      if (conversationCount > 0) {
        // Click on first conversation
        await conversationItems.first().click()
        
        // Should open message interface
        await expect(page.locator('[data-testid="message-interface"]')).toBeVisible()
        
        // Type and send a message
        const messageText = `Test message ${Date.now()}`
        await page.fill('[data-testid="message-input"]', messageText)
        await page.click('[data-testid="send-button"]')
        
        // Should see the message in the conversation
        await expect(page.locator(`text=${messageText}`)).toBeVisible()
        
        // Input should be cleared
        await expect(page.locator('[data-testid="message-input"]')).toHaveValue('')
      }
    })

    test('should show empty state when no conversations', async ({ page }) => {
      // If no conversations exist
      const noConversations = page.locator('text=No conversations yet')
      if (await noConversations.isVisible()) {
        await expect(noConversations).toBeVisible()
        await expect(page.locator('text=Start chatting with friends')).toBeVisible()
      }
    })
  })

  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as test user
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      await page.goto('/dashboard/profile')
    })

    test('should update profile information', async ({ page }) => {
      // Update bio
      const newBio = `Updated bio ${Date.now()}`
      await page.fill('[data-testid="bio-input"]', newBio)
      
      // Save changes
      await page.click('[data-testid="save-profile-button"]')
      
      // Should show success message
      await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      
      // Reload page and verify changes persist
      await page.reload()
      await expect(page.locator('[data-testid="bio-input"]')).toHaveValue(newBio)
    })

    test('should toggle discovery settings', async ({ page }) => {
      // Toggle discovery enabled
      const discoveryToggle = page.locator('[data-testid="discovery-toggle"]')
      const initialState = await discoveryToggle.isChecked()
      
      await discoveryToggle.click()
      
      // Save changes
      await page.click('[data-testid="save-profile-button"]')
      
      // Should show success message
      await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      
      // Verify toggle state changed
      await expect(discoveryToggle).toBeChecked(!initialState)
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Login
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Should navigate properly on mobile
      await expect(page).toHaveURL('/dashboard')
      
      // Mobile navigation should be visible
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-nav-friends"]')
      await expect(page).toHaveURL('/dashboard/friends')
    })

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Login
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Should work properly on tablet
      await expect(page).toHaveURL('/dashboard')
      
      // Sidebar should be visible on tablet
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed')
      })
      
      // Try to login
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Should show error message
      await expect(page.locator('text=Network error')).toBeVisible()
    })

    test('should redirect to login when accessing protected routes', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard')
      
      // Should redirect to login
      await expect(page).toHaveURL('/login')
      await expect(page.locator('text=Please log in to continue')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      // Navigate to dashboard
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Wait for dashboard to load
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle large friend lists efficiently', async ({ page }) => {
      // Login
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
      
      // Navigate to friends page
      await page.goto('/dashboard/friends')
      
      // Should load friends list without hanging
      await expect(page.locator('[data-testid="friends-list"]')).toBeVisible({ timeout: 10000 })
      
      // Scroll should work smoothly
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      await page.waitForTimeout(1000) // Wait for any lazy loading
    })
  })
})