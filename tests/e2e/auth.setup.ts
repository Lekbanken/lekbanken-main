import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication setup - runs once before all tests
 * Stores auth state for reuse across tests
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill in credentials
  // Note: These are test credentials - in CI, use environment variables
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL || 'test@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'testpassword123');

  // Click login button
  await page.getByRole('button', { name: /log in|sign in/i }).click();

  // Wait for redirect to dashboard or app
  await page.waitForURL(/\/(app|admin|dashboard)/);

  // Verify logged in
  await expect(page.getByRole('button', { name: /account|profile|settings/i })).toBeVisible();

  // Save auth state
  await page.context().storageState({ path: authFile });
});
