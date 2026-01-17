import { test as setup, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/regular-user.json');

/**
 * Regular User Authentication Setup
 * 
 * Creates auth state for a user with NO admin roles (member or no tenant membership).
 * Used by tests that verify regular users cannot access admin.
 */
setup('authenticate regular user', async ({ page }) => {
  const email = process.env.TEST_REGULAR_USER_EMAIL;
  const password = process.env.TEST_REGULAR_USER_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  TEST_REGULAR_USER_EMAIL and TEST_REGULAR_USER_PASSWORD not set. Skipping regular user auth setup (no regular user to test).');
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

  // Wait for redirect (regular users should go to /app or /legal/accept)
  await page.waitForURL(/\/(app|legal\/accept)/, { timeout: 10000 });

  // Handle legal acceptance if required
  if (page.url().includes('/legal/accept')) {
    await page.waitForTimeout(1000);
    
    // Dismiss cookie consent dialog first
    const cookieAcceptButton = page.locator('button').filter({ hasText: /godta alle|accept all|acceptera alla/i }).first();
    if (await cookieAcceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cookieAcceptButton.click();
      await page.waitForTimeout(500);
    }
    
    let attempts = 0;
    while (page.url().includes('/legal/accept') && attempts < 10) {
      attempts++;
      const checkbox = page.locator('input[type="checkbox"]:not(:checked)').first();
      if (await checkbox.count() > 0) {
        await checkbox.check({ force: true });
        await page.waitForTimeout(300);
      }
      const acceptButton = page.locator('button:not([disabled])').filter({ hasText: /godta og fortsett|acceptera|accept|godkänn|fortsätt|continue/i }).first();
      if (await acceptButton.count() > 0) {
        await acceptButton.click();
        await page.waitForTimeout(500);
      } else {
        await page.waitForTimeout(500);
      }
    }
    await page.waitForURL(/\/app/, { timeout: 15000 });
  }

  // Verify we're logged in but NOT on admin pages
  await expect(page).toHaveURL(/\/app/);

  // Save auth state
  await page.context().storageState({ path: authFile });
});
