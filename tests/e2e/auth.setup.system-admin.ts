import { test as setup, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { finishLoginFlow } from './utils/auth-flow';

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

  await finishLoginFlow(page, /\/(admin|app)/);

  // Verify we're logged in
  await expect(page).toHaveURL(/\/(admin|app)/);

  // Save auth state
  await page.context().storageState({ path: authFile });
});
