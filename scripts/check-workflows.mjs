#!/usr/bin/env node
/**
 * Validate GitHub Actions workflow files locally.
 * Uses action-validator to catch YAML / workflow schema errors
 * before they reach GitHub.
 */

import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), '.github', 'workflows');

let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
} catch {
  console.log('ℹ️  No .github/workflows/ directory found — skipping.');
  process.exit(0);
}

if (files.length === 0) {
  console.log('ℹ️  No workflow files found — skipping.');
  process.exit(0);
}

let hasErrors = false;

for (const file of files) {
  const path = join(dir, file);
  try {
    execSync(`npx action-validator "${path}"`, { stdio: 'pipe', encoding: 'utf-8' });
  } catch (err) {
    console.error(`❌ ${file}:`);
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n❌ Workflow validation failed.');
  process.exit(1);
} else {
  console.log(`✅ ${files.length} workflow file(s) valid.`);
}
