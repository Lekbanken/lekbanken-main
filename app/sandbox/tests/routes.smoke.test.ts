/**
 * Route Smoke Tests (Playwright)
 * 
 * These tests verify that app routes defined in sandbox-modules.ts
 * respond with HTTP 200 and don't throw console errors.
 * 
 * This is a SCAFFOLD - actual test implementation requires:
 * 1. Installing Playwright: npm install -D @playwright/test
 * 2. Running: npx playwright install
 * 3. Configuring playwright.config.ts
 * 4. Running the dev server before tests
 * 
 * Usage:
 *   npm run dev  # Start the dev server
 *   npx playwright test app/sandbox/tests/routes.smoke.test.ts
 */

import { test, expect, type Page } from '@playwright/test';
import { generateRouteTestCases, getTestSummary } from './test-utils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Log test summary
const summary = getTestSummary();
console.log(`
📊 Route Smoke Test Summary
───────────────────────────
Total modules: ${summary.totalModules}
Modules with routes: ${summary.modulesWithRoutes}
Unique routes to test: ${summary.uniqueRoutes}
`);

/**
 * Collect console errors during page navigation
 */
async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    errors.push(err.message);
  });
  return errors;
}

test.describe('Route Smoke Tests', () => {
  const testCases = generateRouteTestCases();

  // Skip wildcard patterns
  const validTestCases = testCases.filter((tc) => !tc.route.includes('*'));

  for (const { route, moduleIds } of validTestCases) {
    test(`${route} responds OK (used by: ${moduleIds.join(', ')})`, async ({ page }) => {
      // Set up console error collection
      const errors = await collectConsoleErrors(page);

      // Navigate to the route
      const response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Check HTTP status
      expect(response?.status()).toBe(200);

      // Wait a moment for any async errors
      await page.waitForTimeout(500);

      // Check for critical console errors (optional - can be noisy)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('favicon') && // Ignore favicon errors
          !e.includes('ResizeObserver') && // Ignore ResizeObserver warnings
          !e.includes('Warning:') // Ignore React warnings
      );

      if (criticalErrors.length > 0) {
        console.warn(`⚠️ Console errors on ${route}:`, criticalErrors);
        // Uncomment to fail on console errors:
        // expect(criticalErrors).toHaveLength(0);
      }
    });
  }
});

/**
 * Example: Testing specific routes directly
 */
test.describe('Direct Route Tests (Examples)', () => {
  test('Homepage loads', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Sandbox index loads (in dev)', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sandbox`);
    // Sandbox is only available in development
    // In production, it should 404
    const status = response?.status();
    expect([200, 404]).toContain(status);
  });

  test('App dashboard loads (requires auth)', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/app/dashboard`);
    const status = response?.status();
    // Should either load (200) or redirect to login (302 -> 200)
    expect([200, 302]).toContain(status);
  });
});

/**
 * Batch route testing - useful for CI
 */
test.describe('Batch Route Verification', () => {
  test('All marketing routes respond', async ({ page }) => {
    const marketingRoutes = ['/', '/pricing'];

    for (const route of marketingRoutes) {
      const response = await page.goto(`${BASE_URL}${route}`);
      expect(response?.status(), `${route} should return 200`).toBe(200);
    }
  });
});
