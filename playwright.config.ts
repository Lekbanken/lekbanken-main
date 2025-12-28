import { defineConfig, devices } from '@playwright/test';

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

  /* Configure projects for major browsers */
  projects: [
    /* Setup project for authentication */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },

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
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
