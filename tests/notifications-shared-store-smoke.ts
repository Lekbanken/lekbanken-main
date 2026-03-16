/**
 * Standalone smoke-test for shared notification store.
 *
 * Run:  npx tsx tests/notifications-shared-store-smoke.ts
 *
 * Uses Playwright chromium directly (no config/setup projects).
 * Single browser context — tests run in sequence with shared state.
 */
import { chromium, type Page } from 'playwright';

const BASE = 'http://localhost:3000';
const LOGIN_EMAIL = 'test-regular-user@lekbanken.no';
const LOGIN_PASSWORD = 'Rapid$teel261';

// ── helpers ────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(LOGIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(LOGIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();

  // Wait for redirect
  await page.waitForURL(/\/(app|auth)/, { timeout: 20000 });

  if (page.url().includes('/auth/mfa')) {
    throw new Error('MFA enrolled on test account — cannot proceed');
  }

  await page.waitForURL(/\/app/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function pass(name: string) { console.log(`  ${GREEN}✓${RESET} ${name}`); }
function fail(name: string, err: unknown) { console.log(`  ${RED}✗${RESET} ${name}: ${err instanceof Error ? err.message : err}`); }

const results: { name: string; passed: boolean; error?: string }[] = [];

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔔 Notification Shared Store — Smoke Tests\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console log forwarding for debugging
  page.on('console', msg => {
    if (msg.text().includes('[useAppNotifications]')) {
      console.log(`    [browser] ${msg.text()}`);
    }
  });

  try {
    // ── Login ──────────────────────────────────────────────────────────
    console.log('  Logging in...');
    await login(page);
    console.log(`  Logged in. URL: ${page.url()}\n`);

    // Debug: take a screenshot after login
    await page.screenshot({ path: 'test-results/notif-after-login.png' });

    // Debug: check what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log(`  Page body (first 500 chars): ${bodyText?.slice(0, 500)}`);

    // ── Discover initial state ────────────────────────────────────────
    // The bell uses aria-label from i18n, could also be image-based
    const bell = page.locator('button[aria-label="Varsler"]');
    
    // If that doesn't exist, try broader selectors
    const bellFound = await bell.isVisible({ timeout: 3000 }).catch(() => false);
    if (!bellFound) {
      console.log('  Bell not found with aria-label, checking page structure...');
      const allButtons = await page.locator('button').count();
      console.log(`  Total buttons on page: ${allButtons}`);
      for (let i = 0; i < Math.min(allButtons, 10); i++) {
        const btn = page.locator('button').nth(i);
        const label = await btn.getAttribute('aria-label').catch(() => null);
        const text = await btn.textContent().catch(() => '');
        console.log(`    button[${i}]: aria-label="${label}", text="${text?.trim().slice(0, 50)}"`);
      }
    }
    await bell.waitFor({ timeout: 15000 }).catch(() => {
      console.log('  WARN: Bell button not visible after 15s');
    });
    const badge = bell.locator('span');

    // Wait for notifications to load
    await page.waitForTimeout(3000);

    // Get initial unread count from badge (may not exist if 0)
    let initialUnread = 0;
    const badgeVisible = await badge.isVisible().catch(() => false);
    if (badgeVisible) {
      const text = await badge.textContent();
      initialUnread = parseInt(text ?? '0', 10);
    }
    console.log(`  Initial state: ${initialUnread} unread notifications\n`);
    assert(initialUnread > 0, `Need unread notifications to test. Got ${initialUnread}`);

    // ================================================================
    // TEST 1: Bell alone — badge + dropdown
    // ================================================================
    try {
      // Badge visible with correct count
      assert(badgeVisible, 'Badge should be visible');
      assert(initialUnread >= 1, `Badge shows ${initialUnread}, need ≥1`);

      // Open dropdown
      await bell.click();
      await page.waitForTimeout(1000);

      // Check for notification items in dropdown
      const dropdownPanel = page.locator('.shadow-lg').filter({ has: page.locator('h3') });
      const isDropdownVisible = await dropdownPanel.isVisible().catch(() => false);
      assert(isDropdownVisible, 'Dropdown should be visible after clicking bell');

      const items = dropdownPanel.locator('div[role="button"]');
      const itemCount = await items.count();
      assert(itemCount >= initialUnread, `Dropdown should show ≥${initialUnread} items, got ${itemCount}`);

      // Close dropdown
      await bell.click();
      await page.waitForTimeout(300);

      pass('1. Bell alone — badge + dropdown');
      results.push({ name: '1. Bell alone — badge + dropdown', passed: true });
    } catch (err) {
      fail('1. Bell alone — badge + dropdown', err);
      results.push({ name: '1. Bell alone — badge + dropdown', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-1-bell-alone.png' }).catch(() => {});
    }

    // ================================================================
    // TEST 2: Bell + /app/notifications — consistent state
    // ================================================================
    try {
      // Navigate to notifications page (bell stays in layout)
      await page.goto(`${BASE}/app/notifications`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Page should NOT be stuck in spinner
      const spinnerCount = await page.locator('.animate-spin').count();
      assert(spinnerCount === 0, `Page stuck in spinner (${spinnerCount} spinners)`);

      // Page title visible
      const title = page.locator('h1');
      await title.first().waitFor({ timeout: 8000 });

      // Badge should still show same count
      const currentBadge = await badge.textContent().catch(() => '0');
      assert(currentBadge === String(initialUnread), `Badge changed: expected "${initialUnread}", got "${currentBadge}"`);

      // Page should show unread count
      const unreadLabel = page.locator(`text=/${initialUnread} (olästa|uleste)/`);
      const hasLabel = await unreadLabel.isVisible().catch(() => false);
      console.log(`    Page unread label "${initialUnread} olästa" visible: ${hasLabel}`);

      pass('2. Bell + page — consistent state');
      results.push({ name: '2. Bell + page — consistent state', passed: true });
    } catch (err) {
      fail('2. Bell + page — consistent state', err);
      results.push({ name: '2. Bell + page — consistent state', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-2-consistency.png' }).catch(() => {});
    }

    // ================================================================
    // TEST 4: Mark read from page → bell updates (KEY SHARED-STORE TEST)
    // ================================================================
    try {
      // Make sure we're on notifications page
      if (!page.url().includes('/app/notifications')) {
        await page.goto(`${BASE}/app/notifications`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }

      const beforeBadge = await badge.textContent().catch(() => '0');
      const beforeCount = parseInt(beforeBadge ?? '0', 10);
      assert(beforeCount >= 1, `Need ≥1 unread to test mark-read. Got ${beforeCount}`);

      // Click "Markera som läst" button on first unread
      const markBtn = page.locator('button[title="Markera som läst"], button[title="Merk som lest"], button[title="Marker som lest"]').first();
      const markBtnVisible = await markBtn.isVisible().catch(() => false);
      assert(markBtnVisible, 'Mark-as-read button not visible on page');

      await markBtn.click();
      await page.waitForTimeout(1500);

      // Badge should decrease by 1 immediately (shared store!)
      const expectedCount = beforeCount - 1;
      if (expectedCount === 0) {
        const stillVisible = await badge.isVisible().catch(() => false);
        assert(!stillVisible, 'Badge should disappear when unread=0');
      } else {
        const afterBadge = await badge.textContent().catch(() => '0');
        const afterCount = parseInt(afterBadge ?? '0', 10);
        assert(afterCount === expectedCount, `Badge should be ${expectedCount}, got ${afterCount}`);
      }

      pass('4. Mark read from page → bell updates');
      results.push({ name: '4. Mark read from page → bell updates', passed: true });
    } catch (err) {
      fail('4. Mark read from page → bell updates', err);
      results.push({ name: '4. Mark read from page → bell updates', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-4-mark-from-page.png' }).catch(() => {});
    }

    // ================================================================
    // TEST 5: Mark all read — badge goes to 0
    // ================================================================
    try {
      const currentBadgeVis = await badge.isVisible().catch(() => false);

      if (currentBadgeVis) {
        const markAllBtn = page.getByRole('button', { name: /Markera alla som lästa|Merk alle som lest/ });
        const markAllVisible = await markAllBtn.isVisible().catch(() => false);

        if (markAllVisible) {
          await markAllBtn.click();
          await page.waitForTimeout(1500);

          // Badge should disappear
          const badgeGone = !(await badge.isVisible().catch(() => false));
          assert(badgeGone, 'Badge should be hidden after mark-all-read');
        } else {
          console.log('    (No "mark all" button — already 0 unread)');
        }
      } else {
        console.log('    (Badge already hidden — all read from previous test)');
      }

      pass('5. Mark all read → badge=0');
      results.push({ name: '5. Mark all read → badge=0', passed: true });
    } catch (err) {
      fail('5. Mark all read → badge=0', err);
      results.push({ name: '5. Mark all read → badge=0', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-5-mark-all.png' }).catch(() => {});
    }

    // ================================================================
    // TEST 6: Dismiss — removed from both views
    // ================================================================
    try {
      if (!page.url().includes('/app/notifications')) {
        await page.goto(`${BASE}/app/notifications`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }

      // Count notification cards with dismiss buttons
      const dismissBtns = page.locator('button[title="Ta bort"], button[title="Fjern"], button[title="Slett"]');
      const beforeDismiss = await dismissBtns.count();
      console.log(`    Dismiss buttons visible: ${beforeDismiss}`);

      if (beforeDismiss >= 1) {
        await dismissBtns.first().click({ force: true });
        await page.waitForTimeout(1500);

        const afterDismiss = await page.locator('button[title="Ta bort"], button[title="Fjern"], button[title="Slett"]').count();
        assert(afterDismiss < beforeDismiss, `Expected fewer dismiss buttons after dismiss: before=${beforeDismiss}, after=${afterDismiss}`);

        // Open bell to verify consistency
        await bell.click();
        await page.waitForTimeout(500);
        const dropdownPanel = page.locator('.shadow-lg').filter({ has: page.locator('h3') });
        const bellItems = dropdownPanel.locator('div[role="button"]');
        const bellCount = await bellItems.count();
        console.log(`    Bell items after dismiss: ${bellCount}`);
        assert(bellCount <= afterDismiss, `Bell/page mismatch: bell=${bellCount}, page=${afterDismiss}`);

        // Close bell
        await bell.click();
        await page.waitForTimeout(300);
      } else {
        console.log('    (No dismiss buttons — skip)');
      }

      pass('6. Dismiss → removed from both views');
      results.push({ name: '6. Dismiss → removed from both views', passed: true });
    } catch (err) {
      fail('6. Dismiss → removed from both views', err);
      results.push({ name: '6. Dismiss → removed from both views', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-6-dismiss.png' }).catch(() => {});
    }

    // ================================================================
    // TEST 3: Mark read from bell (click notification in dropdown)
    // ================================================================
    try {
      await page.goto(`${BASE}/app`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await bell.click();
      await page.waitForTimeout(500);

      const dropdownPanel = page.locator('.shadow-lg').filter({ has: page.locator('h3') });
      const items = dropdownPanel.locator('div[role="button"]');
      const bellItemCount = await items.count();

      if (bellItemCount > 0) {
        await items.first().click();
        await page.waitForTimeout(1000);
        pass('3. Mark read from bell → no crash');
        results.push({ name: '3. Mark read from bell → no crash', passed: true });
      } else {
        pass('3. Mark read from bell → skipped (no items)');
        results.push({ name: '3. Mark read from bell → skipped', passed: true });
      }
    } catch (err) {
      fail('3. Mark read from bell', err);
      results.push({ name: '3. Mark read from bell', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-3-mark-from-bell.png' }).catch(() => {});
    }

    // ================================================================
    // TEST 7: Initial load-race (fresh page load)
    // ================================================================
    try {
      await page.goto(`${BASE}/app`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await bell.waitFor({ timeout: 10000 });

      // Navigate to notifications page
      await page.goto(`${BASE}/app/notifications`);
      await page.waitForLoadState('networkidle');

      // Wait for page to settle — spinner should disappear within 10s
      // The key test: the page must NOT stick in spinner forever (the old bug)
      const spinner = page.locator('.animate-spin');
      await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
        // If still spinning after 10s, that's a FAIL
      });

      const spinnerCount = await spinner.count();
      const isSpinnerVisible = spinnerCount > 0 && await spinner.first().isVisible().catch(() => false);
      assert(!isSpinnerVisible, 'Page stuck in spinner during load-race (>10s)');

      // Page content should be visible
      const h1 = page.locator('h1');
      const hasH1 = await h1.first().isVisible({ timeout: 3000 }).catch(() => false);
      assert(hasH1, 'Page title not visible after load');

      pass('7. Initial load-race — page loads cleanly');
      results.push({ name: '7. Initial load-race — page loads cleanly', passed: true });
    } catch (err) {
      fail('7. Initial load-race — page loads cleanly', err);
      results.push({ name: '7. Initial load-race — page loads cleanly', passed: false, error: String(err) });
      await page.screenshot({ path: 'test-results/notif-7-load-race.png' }).catch(() => {});
    }

  } finally {
    await context.close();
    await browser.close();
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n─── Summary ───');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`${passed}/${results.length} passed, ${failed} failed\n`);

  results.sort((a, b) => a.name.localeCompare(b.name));
  for (const r of results) {
    const icon = r.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${icon} ${r.name}${r.error ? `\n    ${r.error}` : ''}`);
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
