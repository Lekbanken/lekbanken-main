import { test as setup, expect } from '@playwright/test';
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

  // Wait for redirect to dashboard or app
  await page.waitForURL(/\/(app|admin|dashboard)/, { timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
