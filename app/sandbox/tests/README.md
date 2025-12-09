# Sandbox Smoke Tests

This directory contains lightweight smoke tests for the Lekbanken sandbox modules.
The tests are generated from `sandbox-modules.ts` configuration.

## Overview

The smoke test system provides:

1. **Component Render Tests** - Verify components can import and render without crashing
2. **Route Smoke Tests** - Verify app routes respond with HTTP 200

## Test Files

| File | Description | Framework |
|------|-------------|-----------|
| `test-utils.ts` | Test data extraction and generation utilities | - |
| `components.smoke.test.tsx` | Component render smoke tests | Vitest + Testing Library |
| `routes.smoke.test.ts` | Route availability tests | Playwright |

## Setup

### For Component Tests (Vitest)

```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react

# Add to package.json scripts:
"test:components": "vitest run app/sandbox/tests/components.smoke.test.tsx"
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': './.',
    },
  },
});
```

### For Route Tests (Playwright)

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Add to package.json scripts:
"test:routes": "playwright test app/sandbox/tests/routes.smoke.test.ts"
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './app/sandbox/tests',
  testMatch: '**/*.smoke.test.ts',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

## Running Tests

```bash
# Component smoke tests
npm run test:components

# Route smoke tests (starts dev server automatically)
npm run test:routes

# All smoke tests
npm run test:smoke
```

## How It Works

### Test Generation

Tests are generated from `sandbox-modules.ts`:

```ts
import { generateComponentTestCases, generateRouteTestCases } from './test-utils';

// Get all component test cases
const componentTests = generateComponentTestCases();
// Returns: [{ componentPath: '@/components/ui/Button', moduleIds: ['buttons'] }, ...]

// Get all route test cases
const routeTests = generateRouteTestCases();
// Returns: [{ route: '/app/dashboard', moduleIds: ['app-dashboard'] }, ...]
```

### Adding New Modules

When you add a new module to `sandbox-modules.ts` with `components` or `routes`:

```ts
{
  id: 'my-module',
  label: 'My Module',
  // ...
  components: ['@/components/MyComponent'],
  routes: ['/app/my-page'],
}
```

The smoke tests will automatically include these in the next test run.

## Test Summary

Run this to see what would be tested:

```ts
import { getTestSummary } from './test-utils';

const summary = getTestSummary();
console.log(summary);
// {
//   totalModules: 39,
//   modulesWithComponents: 35,
//   modulesWithRoutes: 28,
//   uniqueComponents: 87,
//   uniqueRoutes: 45,
//   categories: [...]
// }
```

## Limitations

- Component tests use dynamic imports, which may not work for all components
- Some components require specific props to render
- Route tests require the dev server to be running
- Auth-protected routes may return 302 redirects

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add accessibility smoke tests
- [ ] Add performance budgets
- [ ] Integrate with CI/CD pipeline
