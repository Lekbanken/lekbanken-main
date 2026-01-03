import { test as setup, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars (override to ensure fresh values)
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const authFile = path.join(__dirname, '../.auth/tenant-admin.json');

/**
 * Tenant Admin Authentication Setup
 * 
 * Creates auth state for a user with tenant owner/admin role (but NOT system_admin).
 * Used by tests that verify tenant-scoped admin functionality.
 */
setup('authenticate tenant admin', async ({ page }) => {
  // Fallback to AUTH_TEST_EMAIL if no separate tenant admin exists
  const email = process.env.TEST_TENANT_ADMIN_EMAIL || process.env.AUTH_TEST_EMAIL;
  const password = process.env.TEST_TENANT_ADMIN_PASSWORD || process.env.AUTH_TEST_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  TEST_TENANT_ADMIN_EMAIL/AUTH_TEST_EMAIL not set. Skipping tenant admin auth setup.');
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

  // Wait for redirect (tenant admins may go to /admin/tenant/[id] or /app)
  await page.waitForURL(/\/(admin|app)/, { timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
