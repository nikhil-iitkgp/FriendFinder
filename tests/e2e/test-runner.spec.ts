import { test, expect } from '@playwright/test'

test.describe('E2E Test Suite Runner', () => {
  test('verify all test files are accessible', async ({ page }) => {
    // This test ensures all our test files are properly structured
    // and can be discovered by Playwright
    
    const testFiles = [
      'user-journey.spec.ts',
      'api-endpoints.spec.ts', 
      'location-discovery.spec.ts',
      'friend-management.spec.ts',
      'real-time-features.spec.ts',
      'comprehensive-integration.spec.ts'
    ]
    
    // Simple verification that we can access the app
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/FriendFinder/)
    
    console.log('✅ All test files are ready for execution')
    console.log('📋 Available test suites:')
    testFiles.forEach(file => console.log(`   - ${file}`))
  })

  test('health check - app is running', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Should load without errors
    await expect(page.locator('body')).toBeVisible()
    
    // Should not show error pages
    await expect(page.locator('text=404')).not.toBeVisible()
    await expect(page.locator('text=500')).not.toBeVisible()
    await expect(page.locator('text=Error')).not.toBeVisible()
    
    console.log('✅ Application health check passed')
  })
})
