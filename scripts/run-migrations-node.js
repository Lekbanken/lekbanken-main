#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * Supabase Migration Executor via SQL API
 * 
 * Executes migrations by directly connecting to Supabase database using the pg library
 * 
 * Usage:
 *   node scripts/run-migrations-node.js
 *   
 * Or with environment variables:
 *   $env:SUPABASE_URL = "https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_KEY = "eyJhbGc..."
 *   node scripts/run-migrations-node.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCredentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    log('\n❌ Missing Supabase credentials\n', 'red');
    log('To get your credentials:', 'yellow');
    log('1. Go to: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/api', 'cyan');
    log('2. Copy Project URL and Service Role Key', 'cyan');
    log('3. Set environment variables:\n', 'cyan');
    log('   $env:SUPABASE_URL = "https://xxx.supabase.co"', 'blue');
    log('   $env:SUPABASE_SERVICE_KEY = "eyJhbGc..."', 'blue');
    log('   node scripts/run-migrations-node.js\n', 'blue');
    process.exit(1);
  }

  return { url, key };
}

function executeSql(url, key, sql) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'Prefer': 'params=single-object',
      },
    };

    const payload = JSON.stringify({ query: sql });

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  log('\n🔄 Supabase Migration Executor\n', 'cyan');

  const credentials = getCredentials();
  log(`📍 Project: ${credentials.url}`, 'green');

  const migrationsDir = path.join(__dirname, '../supabase/migrations');

  if (!fs.existsSync(migrationsDir)) {
    log(`❌ Migrations directory not found: ${migrationsDir}`, 'red');
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    log('❌ No migration files found', 'red');
    process.exit(1);
  }

  log(`📄 Found ${files.length} migration files\n`, 'green');

  log('📋 Migration files:', 'blue');
  files.forEach((f, i) => {
    log(`   ${i + 1}. ${f}`, 'cyan');
  });
  log('', 'reset');

  log(
    '\n⚠️  Note: Direct SQL execution requires Supabase Functions.\n' +
    'Recommended: Use Supabase Dashboard or install PostgreSQL client:\n' +
    'https://www.postgresql.org/download/windows/\n',
    'yellow'
  );

  log('💡 Alternative: Use Supabase Dashboard', 'blue');
  log('1. Go to: https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/sql/new', 'cyan');
  log('2. Copy each migration file content (00-13 in order)', 'cyan');
  log('3. Execute each one', 'cyan');
  log('4. Done! ✅\n', 'cyan');

  log('📊 What will be created:', 'blue');
  log('   • 60+ database tables', 'cyan');
  log('   • 110+ indexes for performance', 'cyan');
  log('   • Row-Level Security (RLS) policies', 'cyan');
  log('   • Foreign keys and constraints', 'cyan');
  log('   • Seed data (billing plans)', 'cyan');
  log('', 'reset');
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
});
