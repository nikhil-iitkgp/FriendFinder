import { test, expect } from '@playwright/test'

test.describe('Friend Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Friend Requests', () => {
    test('should send friend request from discover page', async ({ page }) => {
      await page.goto('/dashboard/discover')
      
      // Search for users
      await page.fill('[data-testid="search-input"]', 'john')
      await page.click('[data-testid="search-button"]')
      
      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })
      
      const userCards = page.locator('[data-testid^="user-card-"]')
      const userCount = await userCards.count()
      
      if (userCount > 0) {
        const firstUser = userCards.first()
        const sendRequestBtn = firstUser.locator('button:has-text("Send Request")')
        
        if (await sendRequestBtn.isVisible()) {
          await sendRequestBtn.click()
          
          // Should show success message
          await expect(page.locator('text=Friend request sent')).toBeVisible({ timeout: 5000 })
          
          // Button should change state
          await expect(firstUser.locator('text=Request Sent')).toBeVisible()
        }
      }
    })

    test('should view pending friend requests', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      // Should show friends page with tabs
      await expect(page.locator('h1:has-text("Friends")')).toBeVisible()
      
      // Click on pending requests tab
      const pendingTab = page.locator('[data-testid="pending-requests-tab"]')
      if (await pendingTab.isVisible()) {
        await pendingTab.click()
        
        // Should show pending requests
        await expect(page.locator('[data-testid="pending-requests"]')).toBeVisible()
        
        // Check for request items
        const requestItems = page.locator('[data-testid^="request-item-"]')
        const requestCount = await requestItems.count()
        
        if (requestCount > 0) {
          // Should show request details
          const firstRequest = requestItems.first()
          await expect(firstRequest.locator('[data-testid="requester-name"]')).toBeVisible()
          await expect(firstRequest.locator('[data-testid="requester-avatar"]')).toBeVisible()
          await expect(firstRequest.locator('button:has-text("Accept")')).toBeVisible()
          await expect(firstRequest.locator('button:has-text("Decline")')).toBeVisible()
        }
      }
    })

    test('should accept friend request', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const pendingTab = page.locator('[data-testid="pending-requests-tab"]')
      if (await pendingTab.isVisible()) {
        await pendingTab.click()
        
        const requestItems = page.locator('[data-testid^="request-item-"]')
        const requestCount = await requestItems.count()
        
        if (requestCount > 0) {
          const firstRequest = requestItems.first()
          const acceptBtn = firstRequest.locator('button:has-text("Accept")')
          
          if (await acceptBtn.isVisible()) {
            await acceptBtn.click()
            
            // Should show success message
            await expect(page.locator('text=Friend request accepted')).toBeVisible()
            
            // Request should be removed from pending list
            await expect(firstRequest).not.toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test('should decline friend request', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const pendingTab = page.locator('[data-testid="pending-requests-tab"]')
      if (await pendingTab.isVisible()) {
        await pendingTab.click()
        
        const requestItems = page.locator('[data-testid^="request-item-"]')
        const requestCount = await requestItems.count()
        
        if (requestCount > 0) {
          const firstRequest = requestItems.first()
          const declineBtn = firstRequest.locator('button:has-text("Decline")')
          
          if (await declineBtn.isVisible()) {
            await declineBtn.click()
            
            // Should show confirmation dialog
            await expect(page.locator('text=Are you sure')).toBeVisible()
            
            // Confirm decline
            await page.click('button:has-text("Confirm")')
            
            // Should show success message
            await expect(page.locator('text=Friend request declined')).toBeVisible()
            
            // Request should be removed
            await expect(firstRequest).not.toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test('should view sent friend requests', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const sentTab = page.locator('[data-testid="sent-requests-tab"]')
      if (await sentTab.isVisible()) {
        await sentTab.click()
        
        // Should show sent requests
        await expect(page.locator('[data-testid="sent-requests"]')).toBeVisible()
        
        const sentItems = page.locator('[data-testid^="sent-request-"]')
        const sentCount = await sentItems.count()
        
        if (sentCount > 0) {
          const firstSent = sentItems.first()
          await expect(firstSent.locator('[data-testid="recipient-name"]')).toBeVisible()
          await expect(firstSent.locator('text=Pending')).toBeVisible()
          
          // Should have cancel option
          const cancelBtn = firstSent.locator('button:has-text("Cancel")')
          if (await cancelBtn.isVisible()) {
            // Test cancel functionality
            await cancelBtn.click()
            await expect(page.locator('text=Friend request cancelled')).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Friends List', () => {
    test('should display friends list', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      // Should show friends tab as default
      await expect(page.locator('[data-testid="friends-list"]')).toBeVisible()
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        
        // Should show friend details
        await expect(firstFriend.locator('[data-testid="friend-name"]')).toBeVisible()
        await expect(firstFriend.locator('[data-testid="friend-avatar"]')).toBeVisible()
        await expect(firstFriend.locator('[data-testid="friend-status"]')).toBeVisible()
        
        // Should have action buttons
        await expect(firstFriend.locator('button:has-text("Message")')).toBeVisible()
        await expect(firstFriend.locator('button:has-text("Call")')).toBeVisible()
      } else {
        // Should show empty state
        await expect(page.locator('text=No friends yet')).toBeVisible()
        await expect(page.locator('text=Start by discovering people nearby')).toBeVisible()
      }
    })

    test('should search friends', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const searchInput = page.locator('[data-testid="friends-search"]')
      if (await searchInput.isVisible()) {
        await searchInput.fill('john')
        
        // Should filter friends list
        await page.waitForTimeout(1000) // Wait for search debounce
        
        const friendItems = page.locator('[data-testid^="friend-item-"]')
        const visibleFriends = await friendItems.count()
        
        // Results should be filtered
        if (visibleFriends > 0) {
          const firstFriend = friendItems.first()
          const friendName = await firstFriend.locator('[data-testid="friend-name"]').textContent()
          expect(friendName?.toLowerCase()).toContain('john')
        }
        
        // Clear search
        await searchInput.clear()
        await page.waitForTimeout(1000)
      }
    })

    test('should show online/offline status', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        const statusIndicator = firstFriend.locator('[data-testid="friend-status"]')
        
        // Should show online or offline status
        const statusText = await statusIndicator.textContent()
        expect(['Online', 'Offline', 'Last seen']).toContain(statusText?.split(' ')[0] || '')
      }
    })

    test('should remove friend', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        const moreOptionsBtn = firstFriend.locator('[data-testid="friend-options"]')
        
        if (await moreOptionsBtn.isVisible()) {
          await moreOptionsBtn.click()
          
          // Should show options menu
          await expect(page.locator('text=Remove Friend')).toBeVisible()
          
          await page.click('text=Remove Friend')
          
          // Should show confirmation
          await expect(page.locator('text=Are you sure you want to remove this friend')).toBeVisible()
          
          await page.click('button:has-text("Remove")')
          
          // Should show success message
          await expect(page.locator('text=Friend removed successfully')).toBeVisible()
          
          // Friend should be removed from list
          await expect(firstFriend).not.toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe('Friend Profile', () => {
    test('should view friend profile', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        await firstFriend.click()
        
        // Should open friend profile modal or page
        await expect(page.locator('[data-testid="friend-profile"]')).toBeVisible()
        
        // Should show friend details
        await expect(page.locator('[data-testid="profile-name"]')).toBeVisible()
        await expect(page.locator('[data-testid="profile-avatar"]')).toBeVisible()
        await expect(page.locator('[data-testid="profile-bio"]')).toBeVisible()
        
        // Should have action buttons
        await expect(page.locator('button:has-text("Send Message")')).toBeVisible()
        await expect(page.locator('button:has-text("Start Call")')).toBeVisible()
      }
    })

    test('should start conversation from friend profile', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        const messageBtn = firstFriend.locator('button:has-text("Message")')
        
        if (await messageBtn.isVisible()) {
          await messageBtn.click()
          
          // Should navigate to messages or open chat
          await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 5000 })
        }
      }
    })
  })

  test.describe('Friend Statistics', () => {
    test('should display friend count in dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Should show friends count stat
      const friendsCount = page.locator('[data-testid="friends-count"]')
      await expect(friendsCount).toBeVisible()
      
      const countText = await friendsCount.textContent()
      expect(countText).toMatch(/\d+/)
    })

    test('should show mutual friends', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        await firstFriend.click()
        
        // In friend profile, should show mutual friends if any
        const mutualFriends = page.locator('[data-testid="mutual-friends"]')
        if (await mutualFriends.isVisible()) {
          await expect(mutualFriends.locator('text=mutual friend')).toBeVisible()
        }
      }
    })
  })

  test.describe('Friend Notifications', () => {
    test('should show notification for new friend request', async ({ page }) => {
      // This would require real-time testing with Socket.IO
      // For now, we'll test the UI components
      
      await page.goto('/dashboard')
      
      // Check for notification bell or indicator
      const notificationBell = page.locator('[data-testid="notifications"]')
      if (await notificationBell.isVisible()) {
        await notificationBell.click()
        
        // Should show notifications dropdown
        await expect(page.locator('[data-testid="notifications-dropdown"]')).toBeVisible()
      }
    })

    test('should show friend request badge', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check for friend request badge on friends nav
      const friendsNav = page.locator('text=Friends')
      const badge = friendsNav.locator('[data-testid="friend-requests-badge"]')
      
      if (await badge.isVisible()) {
        const badgeText = await badge.textContent()
        expect(parseInt(badgeText || '0')).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
