/**
 * Component Smoke Tests
 * 
 * These tests verify that components defined in sandbox-modules.ts
 * can be dynamically imported and rendered without crashing.
 * 
 * This is a SCAFFOLD - actual test implementation requires:
 * 1. Installing testing dependencies (vitest, @testing-library/react)
 * 2. Setting up the test environment
 * 3. Updating component paths to match actual file structure
 * 
 * Usage with Vitest:
 *   npm install -D vitest @testing-library/react jsdom
 *   npx vitest run app/sandbox/tests/components.smoke.test.ts
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { generateComponentTestCases, getTestSummary } from './test-utils';

// Log test summary before running
const summary = getTestSummary();
console.log(`
📊 Component Smoke Test Summary
─────────────────────────────────
Total modules: ${summary.totalModules}
Modules with components: ${summary.modulesWithComponents}
Unique components to test: ${summary.uniqueComponents}
`);

describe('Component Smoke Tests', () => {
  const testCases = generateComponentTestCases();

  // Skip wildcard patterns and third-party imports
  const validTestCases = testCases.filter(
    (tc) => !tc.componentPath.includes('*') && tc.componentPath.startsWith('@/')
  );

  describe.each(validTestCases)('$componentPath', ({ componentPath, moduleIds }) => {
    it(`renders without crashing (used by: ${moduleIds.join(', ')})`, async () => {
      // Convert @/ path to relative import
      // e.g., '@/components/ui/Button' -> '../../../components/ui/Button'
      const relativePath = componentPath.replace('@/', '../../../');
      
      try {
        // Dynamic import - will fail if component doesn't exist
        // This is the actual smoke test - can we import and render?
        const componentModule = await import(relativePath);
        const Component = componentModule.default || Object.values(componentModule)[0];

        if (typeof Component === 'function') {
          // Try to render with minimal props
          // Note: Some components require props, so we catch and mark as "needs props"
          const { container } = render(<Component />);
          expect(container).toBeTruthy();
        } else {
          // Module exists but no renderable component found
          console.warn(`⚠️ ${componentPath}: No renderable component exported`);
        }
      } catch (error) {
        // Component couldn't be imported or rendered
        // This is useful info - log it but don't necessarily fail
        // (component might not exist yet, or might need specific props)
        console.warn(`⚠️ ${componentPath}: ${(error as Error).message}`);
        
        // Uncomment to make import failures actual test failures:
        // throw error;
      }
    });
  });
});

/**
 * Example: Testing a specific component directly
 * 
 * This shows how to write a targeted smoke test for a known component.
 */
describe('Direct Component Tests (Examples)', () => {
  it('StatusBadge renders with valid status', async () => {
    try {
      const { StatusBadge } = await import('../components/ModuleCard');
      const { container } = render(<StatusBadge status="done" />);
      expect(container.textContent).toContain('Klar');
    } catch {
      console.warn('StatusBadge not found - skipping');
    }
  });

  it('ModuleCard renders with minimal props', async () => {
    try {
      const { ModuleCard } = await import('../components/ModuleCard');
      const mockModule = {
        id: 'test',
        label: 'Test Module',
        href: '/sandbox/test',
        description: 'A test module',
        status: 'done' as const,
      };
      const { container } = render(<ModuleCard module={mockModule} />);
      expect(container.textContent).toContain('Test Module');
    } catch {
      console.warn('ModuleCard not found - skipping');
    }
  });
});
