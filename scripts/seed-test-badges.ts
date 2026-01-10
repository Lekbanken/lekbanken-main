/**
 * CLI script to seed test badges directly into the database.
 * 
 * Usage:
 *   npx tsx scripts/seed-test-badges.ts
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { createHash } from 'crypto';
import { mockAchievements } from '../features/admin/achievements/data';
import { buildExportJson } from '../features/admin/achievements/export-utils';
import { normalizeIconConfig } from '../features/admin/achievements/icon-utils';
import type { AchievementItem } from '../features/admin/achievements/types';

// Deterministic UUID v5-style from string using SHA256
function stringToUuid(str: string): string {
  const hash = createHash('sha256').update(str).digest('hex');
  // Format as UUID (8-4-4-4-12)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Load env
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Filter to only get the graded wing badges
const TEST_BADGE_PREFIXES = [
  'shield-ruby-',
  'circle-emerald-',
  'hexagon-arctic-',
  'diamond-amethyst-',
  'gold-series-',
];

function getTestBadges(): AchievementItem[] {
  return mockAchievements
    .filter((b) => TEST_BADGE_PREFIXES.some((prefix) => b.id.startsWith(prefix)))
    .map((b) => ({
      ...b,
      icon: normalizeIconConfig(b.icon),
    }));
}

async function main() {
  console.log('🏅 Seeding test badges...\n');

  const testBadges = getTestBadges();
  console.log(`Found ${testBadges.length} test badges to seed.\n`);

  if (testBadges.length === 0) {
    console.log('No test badges found. Check that data.ts contains badges with prefixes:');
    console.log(TEST_BADGE_PREFIXES.join(', '));
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const actorUserId = '00000000-0000-0000-0000-000000000000'; // System user
  const scopeType = 'global';
  
  let created = 0;
  let errors = 0;

  for (const badge of testBadges) {
    const exportId = stringToUuid(`global-${badge.id}`);
    
    try {
      const exportJson = buildExportJson({
        scope: { type: 'global' },
        actorUserId,
        tool: 'seed-test-badges-cli',
        nowIso,
        exportId,
        badge,
      });

      const { error: insertError } = await supabase
        .from('award_builder_exports')
        .upsert({
          id: exportId,
          tenant_id: null,
          scope_type: scopeType,
          schema_version: '1.0',
          exported_at: nowIso,
          exported_by_user_id: actorUserId,
          exported_by_tool: 'seed-test-badges-cli',
          export: exportJson,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.log(`❌ ${badge.id}: ${insertError.message}`);
        errors++;
      } else {
        console.log(`✅ ${badge.id} - "${badge.title}"`);
        created++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.log(`❌ ${badge.id}: ${message}`);
      errors++;
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${errors} errors`);
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
