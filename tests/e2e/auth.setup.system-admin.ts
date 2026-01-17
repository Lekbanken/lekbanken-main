import { test as setup, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/system-admin.json');

/**
 * System Admin Authentication Setup
 * 
 * Creates auth state for a user with system_admin role.
 * Used by tests that verify system-admin-only functionality.
 */
setup('authenticate system admin', async ({ page }) => {
  // Use existing AUTH_TEST_EMAIL/PASSWORD (admin@lekbanken.no is system_admin)
  const email = process.env.AUTH_TEST_EMAIL;
  const password = process.env.AUTH_TEST_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  AUTH_TEST_EMAIL and AUTH_TEST_PASSWORD not set. Skipping system admin auth setup.');
    // Create empty auth state to prevent test failures
    await page.context().storageState({ path: authFile });
    return;
  }

  // Navigate to login page
  await page.goto('/auth/login');

  // Fill in credentials (labels are sr-only, use id selectors)
  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill(password);

  // Click login button (type=submit to avoid Google button)
  await page.locator('button[type="submit"]').first().click();

  // Wait for redirect (may go to /admin, /app, or /legal/accept for pending documents)
  await page.waitForURL(/\/(admin|app|legal\/accept)/, { timeout: 10000 });

  // Handle legal acceptance if required
  if (page.url().includes('/legal/accept')) {
    // Wait for wizard to load
    await page.waitForTimeout(1000);
    
    // Dismiss cookie consent dialog first if present
    const cookieAcceptButton = page.locator('button').filter({ hasText: /godta alle|accept all|acceptera alla/i }).first();
    if (await cookieAcceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cookieAcceptButton.click();
      await page.waitForTimeout(500);
    }
    
    // Accept all documents by checking their checkboxes and submitting
    // Loop until no more documents or we're redirected
    let attempts = 0;
    while (page.url().includes('/legal/accept') && attempts < 10) {
      attempts++;
      
      // Find and check any unchecked checkbox
      const checkbox = page.locator('input[type="checkbox"]:not(:checked)').first();
      if (await checkbox.count() > 0) {
        await checkbox.check({ force: true });
        await page.waitForTimeout(300);
      }
      
      // Try to click the accept/submit button if enabled - Norwegian/Swedish
      const acceptButton = page.locator('button:not([disabled])').filter({ hasText: /godta og fortsett|acceptera|accept|godkänn|fortsätt|continue/i }).first();
      if (await acceptButton.count() > 0) {
        await acceptButton.click();
        await page.waitForTimeout(500);
      } else {
        // No enabled button found, wait a bit and continue
        await page.waitForTimeout(500);
      }
    }
    
    // Wait for redirect after acceptance
    await page.waitForURL(/\/(admin|app)/, { timeout: 15000 });
  }

  // Verify we're logged in
  await expect(page).toHaveURL(/\/(admin|app)/);

  // Save auth state
  await page.context().storageState({ path: authFile });
});
