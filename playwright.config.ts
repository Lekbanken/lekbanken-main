import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local for test credentials
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright configuration for E2E tests
 *
 * Run tests:
 *   npx playwright test
 *   npx playwright test --ui
 *   npx playwright test --project=chromium
 *
 * Generate tests:
 *   npx playwright codegen localhost:3000
 */

export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',
  },

  /* Configure projects for browsers */
  projects: (() => {
    // Local default: run only Chromium to avoid requiring extra browser installs.
    // Opt in to the full matrix via CI or PW_ALL_BROWSERS=1.
    const allBrowsers = !!process.env.CI || process.env.PW_ALL_BROWSERS === '1';

    const base = [
      /* Setup projects for authentication - runs different auth setup for each role */
      {
        name: 'setup',
        testMatch: /auth\.setup\.ts$/,
      },
      {
        name: 'setup:system-admin',
        testMatch: /auth\.setup\.system-admin\.ts$/,
      },
      {
        name: 'setup:tenant-admin',
        testMatch: /auth\.setup\.tenant-admin\.ts$/,
      },
      {
        name: 'setup:regular-user',
        testMatch: /auth\.setup\.regular-user\.ts$/,
      },

      {
        name: 'chromium',
        use: {
          ...devices['Desktop Chrome'],
        },
        dependencies: ['setup', 'setup:system-admin', 'setup:tenant-admin', 'setup:regular-user'],
      },
    ];

    if (!allBrowsers) return base;

    return [
      ...base,

      {
        name: 'firefox',
        use: {
          ...devices['Desktop Firefox'],
        },
        dependencies: ['setup'],
      },

      {
        name: 'webkit',
        use: {
          ...devices['Desktop Safari'],
        },
        dependencies: ['setup'],
      },

      /* Test against mobile viewports */
      {
        name: 'mobile-chrome',
        use: {
          ...devices['Pixel 5'],
        },
        dependencies: ['setup'],
      },

      {
        name: 'mobile-safari',
        use: {
          ...devices['iPhone 12'],
        },
        dependencies: ['setup'],
      },
    ];
  })(),

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
