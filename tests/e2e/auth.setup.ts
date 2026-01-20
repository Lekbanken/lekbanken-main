import { test as setup } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication setup - runs once before all tests
 * Stores auth state for reuse across tests
 */
setup('authenticate', async ({ page }) => {
  // Use AUTH_TEST_EMAIL from .env.local
  const email = process.env.AUTH_TEST_EMAIL;
  const password = process.env.AUTH_TEST_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  AUTH_TEST_EMAIL and AUTH_TEST_PASSWORD not set. Skipping auth setup.');
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

  // Wait for redirect (may include /legal/accept for pending documents)
  await page.waitForURL(/\/(app|admin|dashboard|legal\/accept)/, { timeout: 10000 });

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
    await page.waitForURL(/\/(app|admin|dashboard)/, { timeout: 15000 });
  }

  // Save auth state
  await page.context().storageState({ path: authFile });
});
