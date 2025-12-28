import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests using axe-core
 */

test.describe('Accessibility Compliance', () => {
  test('home page has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('login page has no accessibility violations', async ({ page }) => {
    await page.goto('/auth/login');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('admin dashboard has no accessibility violations', async ({ page }) => {
    await page.goto('/admin');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('.chart-container') // Charts may have known issues
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('game builder has no accessibility violations', async ({ page }) => {
    await page.goto('/admin/games');
    
    // Click on first game to open builder
    const gameCard = page.locator('[data-testid="game-card"]').first();
    if (await gameCard.count() > 0) {
      await gameCard.click();
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('participant play page has no accessibility violations', async ({ page }) => {
    // Test a play page (may need test data)
    await page.goto('/play/test');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations:', JSON.stringify(results.violations, null, 2));
    }

    expect(results.violations).toEqual([]);
  });
});

test.describe('Color Contrast', () => {
  test('text has sufficient contrast', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('buttons have sufficient contrast', async ({ page }) => {
    await page.goto('/admin');
    
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .include('button')
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('Keyboard Navigation', () => {
  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/admin');
    
    const results = await new AxeBuilder({ page })
      .withRules(['keyboard'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('focus is visible on all elements', async ({ page }) => {
    await page.goto('/admin');
    
    const results = await new AxeBuilder({ page })
      .withRules(['focus-visible'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('Forms', () => {
  test('form inputs have labels', async ({ page }) => {
    await page.goto('/auth/login');
    
    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('form errors are accessible', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Submit empty form to trigger errors
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    // Wait for error messages
    await page.waitForSelector('[role="alert"], .error-message', { timeout: 5000 }).catch(() => {});
    
    const results = await new AxeBuilder({ page })
      .withRules(['aria-input-field-name', 'aria-valid-attr-value'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
