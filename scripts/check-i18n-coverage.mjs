#!/usr/bin/env node
/**
 * i18n Coverage Check
 *
 * Compares leaf-key sets across locales (sv as source-of-truth).
 * Exits with code 1 if `en` is missing any key from `sv` (hard fail).
 * Warns (but does not fail) if `no` is missing keys (falls back to sv).
 *
 * Usage:
 *   node scripts/check-i18n-coverage.mjs            # check all namespaces
 *   node scripts/check-i18n-coverage.mjs play        # check only play.* namespace
 *   node scripts/check-i18n-coverage.mjs --strict     # fail on ANY missing key in any locale
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Parse Args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const namespaceFilter = args.find(a => !a.startsWith('--')) ?? null;

// ── Load Locale Files ───────────────────────────────────────────────────
function loadLocale(locale) {
  const path = resolve(root, 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

const sv = loadLocale('sv');
const en = loadLocale('en');
const no_ = loadLocale('no');

// ── Flatten Keys ────────────────────────────────────────────────────────
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

// If namespace filter, scope to that subtree
function scopedKeys(locale, ns) {
  if (!ns) return flattenKeys(locale);
  const subtree = ns.split('.').reduce((o, k) => o?.[k], locale);
  if (!subtree) return [];
  return flattenKeys(subtree).map(k => `${ns}.${k}`);
}

const svKeys = new Set(scopedKeys(sv, namespaceFilter));
const enKeys = new Set(scopedKeys(en, namespaceFilter));
const noKeys = new Set(scopedKeys(no_, namespaceFilter));

// ── Diff ────────────────────────────────────────────────────────────────
const missingInEn = [...svKeys].filter(k => !enKeys.has(k)).sort();
const missingInNo = [...svKeys].filter(k => !noKeys.has(k)).sort();
const extraInEn = [...enKeys].filter(k => !svKeys.has(k)).sort();
const extraInNo = [...noKeys].filter(k => !svKeys.has(k)).sort();

// ── Report ──────────────────────────────────────────────────────────────
const scope = namespaceFilter ? ` (namespace: ${namespaceFilter})` : '';
console.log(`\n📋 i18n Coverage Report${scope}`);
console.log(`   sv (source): ${svKeys.size} keys`);
console.log(`   en:          ${enKeys.size} keys`);
console.log(`   no:          ${noKeys.size} keys\n`);

let exitCode = 0;

if (missingInEn.length > 0) {
  console.log(`❌ Missing in en (${missingInEn.length} keys):`);
  missingInEn.forEach(k => console.log(`   - ${k}`));
  console.log();
  exitCode = 1; // Always fail for missing en keys
}

if (missingInNo.length > 0) {
  const icon = strict ? '❌' : '⚠️';
  console.log(`${icon} Missing in no (${missingInNo.length} keys) — ${strict ? 'FAIL' : 'falls back to sv'}:`);
  missingInNo.forEach(k => console.log(`   - ${k}`));
  console.log();
  if (strict) exitCode = 1;
}

if (extraInEn.length > 0) {
  console.log(`ℹ️  Extra in en (${extraInEn.length} keys, not in sv):`);
  extraInEn.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  if (extraInEn.length > 10) console.log(`   ... and ${extraInEn.length - 10} more`);
  console.log();
}

if (extraInNo.length > 0) {
  console.log(`ℹ️  Extra in no (${extraInNo.length} keys, not in sv):`);
  extraInNo.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  if (extraInNo.length > 10) console.log(`   ... and ${extraInNo.length - 10} more`);
  console.log();
}

if (exitCode === 0) {
  console.log('✅ All required keys present.\n');
} else {
  console.log('💥 Coverage check failed. Add missing keys before merging.\n');
}

process.exit(exitCode);
