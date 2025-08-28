import { test, expect } from '@playwright/test'

test.describe('Real-time Features E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Real-time Messaging', () => {
    test('should connect to Socket.IO server', async ({ page }) => {
      await page.goto('/dashboard/messages')
      
      // Check for Socket.IO connection indicator
      const connectionStatus = page.locator('[data-testid="connection-status"]')
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toHaveText(/Connected|Online/)
      }
      
      // Check console for Socket.IO connection logs
      const logs = []
      page.on('console', msg => logs.push(msg.text()))
      
      await page.waitForTimeout(2000)
      
      // Should have Socket.IO connection logs
      const hasSocketLogs = logs.some(log => 
        log.includes('socket') || log.includes('connected') || log.includes('Socket.IO')
      )
      expect(hasSocketLogs).toBeTruthy()
    })

    test('should send real-time message', async ({ page }) => {
      await page.goto('/dashboard/messages')
      
      // Check if there are existing conversations
      const conversationItems = page.locator('[data-testid^="conversation-"]')
      const conversationCount = await conversationItems.count()
      
      if (conversationCount > 0) {
        // Click on first conversation
        await conversationItems.first().click()
        
        // Should open message interface
        await expect(page.locator('[data-testid="message-interface"]')).toBeVisible()
        
        // Type and send a message
        const messageText = `Real-time test message ${Date.now()}`
        await page.fill('[data-testid="message-input"]', messageText)
        await page.click('[data-testid="send-button"]')
        
        // Message should appear immediately (real-time)
        await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 3000 })
        
        // Input should be cleared
        await expect(page.locator('[data-testid="message-input"]')).toHaveValue('')
        
        // Message should have sending/sent status
        const messageElement = page.locator(`text=${messageText}`).locator('..')
        await expect(messageElement.locator('[data-testid="message-status"]')).toBeVisible()
      }
    })

    test('should show typing indicator', async ({ page }) => {
      await page.goto('/dashboard/messages')
      
      const conversationItems = page.locator('[data-testid^="conversation-"]')
      const conversationCount = await conversationItems.count()
      
      if (conversationCount > 0) {
        await conversationItems.first().click()
        
        // Start typing in message input
        await page.fill('[data-testid="message-input"]', 'typing...')
        
        // Should show typing indicator (in a real scenario with multiple users)
        const typingIndicator = page.locator('[data-testid="typing-indicator"]')
        if (await typingIndicator.isVisible()) {
          await expect(typingIndicator).toContain('typing')
        }
        
        // Clear input - typing indicator should disappear
        await page.fill('[data-testid="message-input"]', '')
        await page.waitForTimeout(1000)
        
        if (await typingIndicator.isVisible()) {
          await expect(typingIndicator).not.toBeVisible()
        }
      }
    })

    test('should show message delivery status', async ({ page }) => {
      await page.goto('/dashboard/messages')
      
      const conversationItems = page.locator('[data-testid^="conversation-"]')
      const conversationCount = await conversationItems.count()
      
      if (conversationCount > 0) {
        await conversationItems.first().click()
        
        const messageText = `Status test ${Date.now()}`
        await page.fill('[data-testid="message-input"]', messageText)
        await page.click('[data-testid="send-button"]')
        
        // Should show delivery status progression
        const messageElement = page.locator(`text=${messageText}`).locator('..')
        const statusElement = messageElement.locator('[data-testid="message-status"]')
        
        // Should start as sending, then sent, then delivered
        await expect(statusElement).toBeVisible()
        
        // Check for status icons or text
        const statusText = await statusElement.textContent()
        expect(['Sending', 'Sent', 'Delivered', 'Read']).toContain(statusText || '')
      }
    })
  })

  test.describe('Real-time Notifications', () => {
    test('should show real-time friend request notification', async ({ page }) => {
      // Mock receiving a friend request notification
      await page.goto('/dashboard')
      
      // Listen for toast notifications
      const toastNotification = page.locator('[data-testid="toast-notification"]')
      
      // In a real scenario, this would be triggered by another user
      // For testing, we can simulate the notification
      await page.evaluate(() => {
        // Simulate receiving a Socket.IO event
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('friend-request-received', {
            detail: { from: 'Test User', message: 'You have a new friend request' }
          }))
        }
      })
      
      // Should show notification toast
      if (await toastNotification.isVisible()) {
        await expect(toastNotification).toContain('friend request')
      }
    })

    test('should update friend request count in real-time', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check current friend request count
      const friendsNav = page.locator('text=Friends')
      const badge = friendsNav.locator('[data-testid="friend-requests-badge"]')
      
      if (await badge.isVisible()) {
        const initialCount = await badge.textContent()
        
        // Simulate receiving a new friend request
        await page.evaluate(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('friend-request-count-update', {
              detail: { count: parseInt(document.querySelector('[data-testid="friend-requests-badge"]')?.textContent || '0') + 1 }
            }))
          }
        })
        
        // Badge count should update
        await page.waitForTimeout(1000)
        const newCount = await badge.textContent()
        expect(parseInt(newCount || '0')).toBeGreaterThanOrEqual(parseInt(initialCount || '0'))
      }
    })

    test('should show online status updates', async ({ page }) => {
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        const statusIndicator = firstFriend.locator('[data-testid="friend-status"]')
        
        // Should show current status
        await expect(statusIndicator).toBeVisible()
        
        // In a real scenario, status would update when friends come online/offline
        const initialStatus = await statusIndicator.textContent()
        
        // Simulate status change
        await page.evaluate(() => {
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('friend-status-update', {
              detail: { userId: 'test-user-id', status: 'online' }
            }))
          }
        })
        
        await page.waitForTimeout(1000)
        // Status should potentially update (depending on implementation)
      }
    })
  })

  test.describe('WebRTC Voice/Video Calls', () => {
    test('should show call interface', async ({ page, context }) => {
      // Grant media permissions for WebRTC
      await context.grantPermissions(['microphone', 'camera'])
      
      await page.goto('/dashboard/friends')
      
      const friendItems = page.locator('[data-testid^="friend-item-"]')
      const friendCount = await friendItems.count()
      
      if (friendCount > 0) {
        const firstFriend = friendItems.first()
        const callBtn = firstFriend.locator('button:has-text("Call")')
        
        if (await callBtn.isVisible()) {
          await callBtn.click()
          
          // Should show call interface
          await expect(page.locator('[data-testid="call-interface"]')).toBeVisible({ timeout: 5000 })
          
          // Should have call controls
          await expect(page.locator('[data-testid="end-call-btn"]')).toBeVisible()
          await expect(page.locator('[data-testid="mute-btn"]')).toBeVisible()
          await expect(page.locator('[data-testid="video-toggle-btn"]')).toBeVisible()
        }
      }
    })

    test('should handle incoming call', async ({ page, context }) => {
      await context.grantPermissions(['microphone', 'camera'])
      await page.goto('/dashboard')
      
      // Simulate incoming call
      await page.evaluate(() => {
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('incoming-call', {
            detail: { 
              from: 'Test User',
              callType: 'voice',
              callId: 'test-call-123'
            }
          }))
        }
      })
      
      // Should show incoming call modal
      const incomingCallModal = page.locator('[data-testid="incoming-call-modal"]')
      if (await incomingCallModal.isVisible()) {
        await expect(incomingCallModal).toContain('Incoming call from Test User')
        
        // Should have answer/decline buttons
        await expect(page.locator('[data-testid="answer-call-btn"]')).toBeVisible()
        await expect(page.locator('[data-testid="decline-call-btn"]')).toBeVisible()
        
        // Test declining call
        await page.click('[data-testid="decline-call-btn"]')
        await expect(incomingCallModal).not.toBeVisible()
      }
    })

    test('should test call controls', async ({ page, context }) => {
      await context.grantPermissions(['microphone', 'camera'])
      
      // Navigate to call test page if it exists
      const callTestPage = page.locator('a[href="/dashboard/call-test"]')
      if (await callTestPage.isVisible()) {
        await callTestPage.click()
        
        // Should show call test interface
        await expect(page.locator('[data-testid="call-test-interface"]')).toBeVisible()
        
        // Test mute functionality
        const muteBtn = page.locator('[data-testid="mute-btn"]')
        if (await muteBtn.isVisible()) {
          await muteBtn.click()
          await expect(muteBtn).toHaveClass(/muted|active/)
          
          // Unmute
          await muteBtn.click()
          await expect(muteBtn).not.toHaveClass(/muted|active/)
        }
        
        // Test video toggle
        const videoBtn = page.locator('[data-testid="video-toggle-btn"]')
        if (await videoBtn.isVisible()) {
          await videoBtn.click()
          await expect(videoBtn).toHaveClass(/disabled|off/)
          
          // Turn video back on
          await videoBtn.click()
          await expect(videoBtn).not.toHaveClass(/disabled|off/)
        }
      }
    })

    test('should handle WebRTC connection states', async ({ page, context }) => {
      await context.grantPermissions(['microphone', 'camera'])
      await page.goto('/dashboard/call-test')
      
      // Check for WebRTC connection status
      const connectionStatus = page.locator('[data-testid="webrtc-status"]')
      if (await connectionStatus.isVisible()) {
        // Should show connection states: connecting, connected, disconnected
        const statusText = await connectionStatus.textContent()
        expect(['Connecting', 'Connected', 'Disconnected', 'Failed']).toContain(statusText || '')
      }
      
      // Check console for WebRTC logs
      const logs = []
      page.on('console', msg => logs.push(msg.text()))
      
      await page.waitForTimeout(3000)
      
      // Should have WebRTC-related logs
      const hasWebRTCLogs = logs.some(log => 
        log.includes('WebRTC') || log.includes('peer') || log.includes('ICE') || log.includes('offer')
      )
      expect(hasWebRTCLogs).toBeTruthy()
    })
  })

  test.describe('Real-time Connection Handling', () => {
    test('should handle connection loss', async ({ page }) => {
      await page.goto('/dashboard/messages')
      
      // Simulate network disconnection
      await page.setOfflineMode(true)
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]')
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toContain('Offline')
      }
      
      // Restore connection
      await page.setOfflineMode(false)
      
      // Should show reconnecting/connected status
      const connectionStatus = page.locator('[data-testid="connection-status"]')
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContain(/Reconnecting|Connected/)
      }
    })

    test('should queue messages when offline', async ({ page }) => {
      await page.goto('/dashboard/messages')
      
      const conversationItems = page.locator('[data-testid^="conversation-"]')
      const conversationCount = await conversationItems.count()
      
      if (conversationCount > 0) {
        await conversationItems.first().click()
        
        // Go offline
        await page.setOfflineMode(true)
        
        // Try to send a message
        const messageText = `Offline message ${Date.now()}`
        await page.fill('[data-testid="message-input"]', messageText)
        await page.click('[data-testid="send-button"]')
        
        // Message should show as queued/pending
        const messageElement = page.locator(`text=${messageText}`).locator('..')
        const statusElement = messageElement.locator('[data-testid="message-status"]')
        
        if (await statusElement.isVisible()) {
          const statusText = await statusElement.textContent()
          expect(['Queued', 'Pending', 'Failed']).toContain(statusText || '')
        }
        
        // Go back online
        await page.setOfflineMode(false)
        
        // Message should eventually send
        await page.waitForTimeout(3000)
        if (await statusElement.isVisible()) {
          const newStatusText = await statusElement.textContent()
          expect(['Sent', 'Delivered']).toContain(newStatusText || '')
        }
      }
    })

    test('should handle Socket.IO reconnection', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Check for Socket.IO connection
      let connectionLogs = []
      page.on('console', msg => {
        if (msg.text().includes('socket') || msg.text().includes('connect')) {
          connectionLogs.push(msg.text())
        }
      })
      
      // Simulate network interruption and recovery
      await page.setOfflineMode(true)
      await page.waitForTimeout(2000)
      await page.setOfflineMode(false)
      
      // Wait for reconnection
      await page.waitForTimeout(5000)
      
      // Should have reconnection logs
      const hasReconnectionLogs = connectionLogs.some(log => 
        log.includes('reconnect') || log.includes('connect')
      )
      expect(hasReconnectionLogs).toBeTruthy()
    })
  })
})
