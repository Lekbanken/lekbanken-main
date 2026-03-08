import { test as setup } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { finishLoginFlow, waitForPostLoginRedirect } from './utils/auth-flow';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication setup - runs once before all tests
 * Stores auth state for reuse across tests
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_REGULAR_USER_EMAIL || process.env.AUTH_TEST_EMAIL;
  const password = process.env.TEST_REGULAR_USER_PASSWORD || process.env.AUTH_TEST_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  No generic auth setup credentials configured. Skipping auth setup.');
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

  await waitForPostLoginRedirect(page, /\/(app|admin|dashboard|legal\/accept|auth\/mfa-challenge|app\/profile\/security)/);

  await finishLoginFlow(page, /\/(app|admin|dashboard)/);

  // Save auth state
  await page.context().storageState({ path: authFile });
});
