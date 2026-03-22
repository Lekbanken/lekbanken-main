import { test as setup } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { finishLoginFlow, resetMfaFactorsForTestUser, waitForPostLoginRedirect } from './utils/auth-flow';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/tenant-admin.json');
const defaultTenantAdminEmail = 'test-tenant-admin@lekbanken.no';
const defaultTenantAdminPassword = 'TestAdmin123!';

/**
 * Tenant Admin Authentication Setup
 * 
 * Creates auth state for a user with tenant owner/admin role (but NOT system_admin).
 * Used by tests that verify tenant-scoped admin functionality.
 */
setup('authenticate tenant admin', async ({ page }) => {
  const email = process.env.TEST_TENANT_ADMIN_EMAIL || defaultTenantAdminEmail;
  const password = process.env.TEST_TENANT_ADMIN_PASSWORD || defaultTenantAdminPassword;

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

  // Save auth state
  await page.context().storageState({ path: authFile });
});
