#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

console.log('\n🔄 Supabase Migration Executor\n');

// Get connection string from user
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('📍 Get your connection string from:');
  console.log('https://supabase.com/dashboard/project/qohhnufxididbmzqnjwg/settings/database');
  console.log('Use "Session" mode (not "Connection pooler")\n');

  const connStr = await askQuestion('Enter connection string: ');
  rl.close();

  if (!connStr) {
    console.error('❌ No connection string provided');
    process.exit(1);
  }

  console.log('\n🧪 Testing connection...');

  // Test with a simple query
  try {
    const output = execSync(`psql "${connStr}" -c "SELECT 1;"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('✅ Connection successful\n');
  } catch (err) {
    if (err.message.includes('psql') || err.message.includes('not found')) {
      console.error('❌ PostgreSQL client (psql) not found');
      console.error('Install from: https://www.postgresql.org/download/windows/');
      process.exit(1);
    }
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  // Find migrations
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📄 Found ${migrations.length} migrations\n`);

  // Confirm
  const confirm = await askQuestion('Execute all migrations? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    process.exit(0);
  }

  console.log('\n⏳ Executing migrations...\n');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    const filePath = path.join(migrationsDir, migration);

    process.stdout.write(`[${i + 1}/${migrations.length}] ${migration}... `);

    try {
      execSync(`psql "${connStr}" -f "${filePath}" -v ON_ERROR_STOP=1`, {
        stdio: 'pipe'
      });
      console.log('✅');
      success++;
    } catch (err) {
      console.log('❌');
      failed++;
    }
  }

  console.log(`\n✅ Done: ${success} succeeded, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 All migrations executed successfully!\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
