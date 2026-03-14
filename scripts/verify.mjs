#!/usr/bin/env node
/**
 * Unified verify pipeline — "is this push/merge-safe?"
 *
 * Mirrors what GitHub Actions require so local and CI never drift apart.
 * Usage:
 *   npm run verify          # full pipeline
 *   npm run verify:quick    # lint + typecheck only (fast, for pre-commit)
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 */

import { execSync } from 'node:child_process';

const isQuick = process.argv.includes('--quick');

/** @type {{ name: string, cmd: string, quick?: boolean }[]} */
const checks = [
  { name: 'ESLint',             cmd: 'npm run lint',              quick: true },
  { name: 'TypeScript',         cmd: 'npm run type-check',        quick: true },
  { name: 'Workflow validation', cmd: 'npm run check:workflows',  quick: true },
  { name: 'i18n validation',    cmd: 'npm run validate:i18n',     quick: true },
  { name: 'Unit tests (vitest)', cmd: 'npx vitest run --reporter=default', quick: false },
  { name: 'Integration tests',  cmd: 'npm test',                  quick: false },
];

const toRun = isQuick ? checks.filter((c) => c.quick) : checks;

console.log(`\n🔍 Running ${isQuick ? 'quick' : 'full'} verify (${toRun.length} checks)...\n`);

const results = [];

for (const check of toRun) {
  process.stdout.write(`  ⏳ ${check.name}...`);
  const start = Date.now();
  try {
    execSync(check.cmd, { stdio: 'pipe', encoding: 'utf-8' });
    const ms = Date.now() - start;
    console.log(`  ✅ (${(ms / 1000).toFixed(1)}s)`);
    results.push({ name: check.name, ok: true });
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`  ❌ (${(ms / 1000).toFixed(1)}s)`);
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    results.push({ name: check.name, ok: false });
  }
}

console.log('\n─── Results ───');
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}`);
}

const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.log(`\n❌ ${failed.length}/${results.length} check(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${results.length} checks passed.\n`);
}
