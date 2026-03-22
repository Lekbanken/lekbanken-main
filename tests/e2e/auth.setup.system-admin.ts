import { test as setup, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { finishLoginFlow, resetMfaFactorsForTestUser, waitForPostLoginRedirect } from './utils/auth-flow';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/system-admin.json');
const defaultSystemAdminEmail = 'test-system-admin@lekbanken.no';
const defaultSystemAdminPassword = 'TestAdmin123!';

/**
 * System Admin Authentication Setup
 * 
 * Creates auth state for a user with system_admin role.
 * Used by tests that verify system-admin-only functionality.
 */
setup('authenticate system admin', async ({ page }) => {
  const email = process.env.AUTH_TEST_EMAIL || defaultSystemAdminEmail;
  const password = process.env.AUTH_TEST_PASSWORD || defaultSystemAdminPassword;

  await resetMfaFactorsForTestUser(email);

  // Navigate to login page
  await page.goto('/auth/login');

  // Fill in credentials (labels are sr-only, use id selectors)
  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill(password);

  // Click login button (type=submit to avoid Google button)
  await page.locator('button[type="submit"]').first().click();

  await waitForPostLoginRedirect(page, /\/(admin|app|legal\/accept|auth\/mfa-challenge|app\/profile\/security)/);

  await finishLoginFlow(page, /\/(admin|app)/);

  // Verify we're logged in
  await expect(page).toHaveURL(/\/(admin|app)/);

  // Save auth state
  await page.context().storageState({ path: authFile });
});
