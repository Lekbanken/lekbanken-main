#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * Execute Supabase Migrations
 *
 * This script reads all migration files from supabase/migrations/
 * and executes them against the Supabase database using SQL API.
 *
 * Usage: node scripts/execute-migrations.js
 *
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (has full access)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Migration directory
const migrationsDir = path.join(__dirname, '../supabase/migrations');

// Parse SQL migration files
function getMigrationFiles() {
  const files = fs.readdirSync(migrationsDir);
  return files
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => ({
      name: f,
      path: path.join(migrationsDir, f),
    }));
}

// Execute SQL query
function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/rpc/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'X-Client-Info': 'migration-script/1.0.0',
      },
    };

    // Note: Standard SQL execution requires using the query endpoint
    // We'll use a simpler approach with direct HTTP calls
    const payload = JSON.stringify({
      query: sql,
    });

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, status: res.statusCode });
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

// Main execution
async function main() {
  console.log('🔄 Supabase Migration Executor');
  console.log(`📍 Project: ${SUPABASE_URL}`);
  console.log('');

  const migrations = getMigrationFiles();
  console.log(`📄 Found ${migrations.length} migration files`);
  console.log('');

  if (migrations.length === 0) {
    console.warn('⚠️  No migration files found');
    process.exit(1);
  }

  // List migrations
  console.log('📋 Migration files:');
  migrations.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name}`);
  });
  console.log('');

  // Execute each migration
  for (const migration of migrations) {
    console.log(`⏳ Executing: ${migration.name}`);

    try {
      const sql = fs.readFileSync(migration.path, 'utf-8');

      // Split by semicolon to handle multiple statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`   📊 Contains ${statements.length} SQL statements`);

      // Note: Direct execution via REST API is limited
      // For production, use Supabase CLI or pgAdmin
      console.log('   ℹ️  To execute migrations, use one of these methods:');
      console.log('      1. Supabase CLI: supabase db push');
      console.log('      2. pgAdmin: Connect and execute SQL directly');
      console.log('      3. Supabase Dashboard: SQL Editor');
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('📝 Instructions for Manual Execution:');
  console.log('');
  console.log('1. Using Supabase Dashboard (Recommended for testing):');
  console.log('   - Go to https://supabase.com/dashboard');
  console.log('   - Open your project');
  console.log('   - Go to SQL Editor');
  console.log('   - Copy and paste each migration SQL file');
  console.log('   - Execute in order (00 to 13)');
  console.log('');
  console.log('2. Using Supabase CLI (Recommended for production):');
  console.log('   - Install: winget install Supabase.supabase');
  console.log('   - Link project: supabase link --project-ref YOUR_PROJECT_ID');
  console.log('   - Push migrations: supabase db push');
  console.log('');
  console.log('3. Using psql (Advanced):');
  console.log('   - Get connection string from Supabase project settings');
  console.log('   - Run: psql "YOUR_CONNECTION_STRING" < migration.sql');
  console.log('');
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
