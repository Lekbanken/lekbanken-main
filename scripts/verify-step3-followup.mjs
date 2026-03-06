/**
 * Step 3 Follow-up — verify gamification snapshot with actual data.
 * Kept as regression tooling.
 * (confirms recentUnlocks shape and loadout rendering after grants)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testEmail = process.env.AUTH_TEST_EMAIL;
const testPassword = process.env.AUTH_TEST_PASSWORD;

const admin = createClient(url, serviceKey);
const userClient = createClient(url, anonKey);

const PASS = '✅';
const FAIL = '❌';
const results = [];

function report(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? PASS : FAIL} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log(' FOLLOW-UP: Snapshot with actual data');
  console.log('══════════════════════════════════════════\n');

  const { data: auth } = await userClient.auth.signInWithPassword({
    email: testEmail, password: testPassword,
  });
  const userId = auth.user.id;
  console.log(`User: ${auth.user.email}\n`);

  // The previous test granted 8 cosmetics at level 2 — check these show up

  // 1. unlockedCount
  const { count } = await userClient
    .from('user_cosmetics')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  report('A. unlockedCount reflects grants', count >= 8, `count = ${count}`);

  // 2. recentUnlocks shape (< 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRows, error: recentErr } = await userClient
    .from('user_cosmetics')
    .select('cosmetic_id, unlocked_at, cosmetics!inner(key)')
    .eq('user_id', userId)
    .gte('unlocked_at', cutoff)
    .order('unlocked_at', { ascending: false });

  report('B. Recent unlocks query with data', !recentErr && recentRows.length > 0,
    `${recentRows?.length || 0} recent unlocks`);

  if (recentRows && recentRows.length > 0) {
    const first = recentRows[0];
    report('B2. Shape: cosmetics.key is string', typeof first.cosmetics.key === 'string',
      `key = "${first.cosmetics.key}"`);
    report('B3. Shape: unlocked_at is string', typeof first.unlocked_at === 'string',
      `unlocked_at = "${first.unlocked_at}"`);

    // Check all keys are unique
    const keys = recentRows.map(r => r.cosmetics.key);
    const uniqueKeys = new Set(keys);
    report('B4. All cosmetic keys unique', keys.length === uniqueKeys.size);

    // Check sorting (desc by unlocked_at)
    let sorted = true;
    for (let i = 1; i < recentRows.length; i++) {
      if (new Date(recentRows[i].unlocked_at) > new Date(recentRows[i - 1].unlocked_at)) {
        sorted = false;
        break;
      }
    }
    report('B5. Sorted by unlocked_at desc', sorted);

    // Print all for visibility
    console.log('\n   Recent unlocks:');
    for (const r of recentRows) {
      console.log(`     • ${r.cosmetics.key} (${r.unlocked_at})`);
    }
  }

  // 3. Equip one cosmetic and verify loadout build
  const firstOwned = recentRows?.[0];
  if (firstOwned) {
    const { data: cosmeticDetail } = await userClient
      .from('cosmetics')
      .select('id,category,render_type,render_config')
      .eq('id', firstOwned.cosmetic_id)
      .single();

    // Equip it
    await userClient
      .from('user_cosmetic_loadout')
      .upsert(
        { user_id: userId, slot: cosmeticDetail.category, cosmetic_id: cosmeticDetail.id },
        { onConflict: 'user_id,slot' },
      );

    // Read back loadout
    const { data: loadoutRows } = await userClient
      .from('user_cosmetic_loadout')
      .select('slot,cosmetic_id')
      .eq('user_id', userId);

    report('C. Loadout has equipped item', loadoutRows.length > 0,
      `${loadoutRows.length} slot(s) filled`);

    // Build ActiveLoadout (same logic as route)
    if (loadoutRows.length > 0) {
      const ids = loadoutRows.map(r => r.cosmetic_id);
      const { data: cosmeticRows } = await userClient
        .from('cosmetics')
        .select('id,category,render_type,render_config')
        .in('id', ids);

      const map = new Map(cosmeticRows.map(c => [c.id, c]));
      const loadout = {};
      for (const row of loadoutRows) {
        const c = map.get(row.cosmetic_id);
        if (c) {
          const config = typeof c.render_config === 'object' ? c.render_config : {};
          loadout[c.category] = { renderType: c.render_type, ...config };
        }
      }

      const slot = Object.keys(loadout)[0];
      const cfg = loadout[slot];
      report('C2. Loadout render config has renderType', typeof cfg?.renderType === 'string',
        `slot=${slot}, renderType=${cfg?.renderType}`);

      console.log('\n   Active loadout:');
      console.log(`     ${JSON.stringify(loadout, null, 2)}`);
    }

    // Clean up: unequip
    await userClient
      .from('user_cosmetic_loadout')
      .delete()
      .eq('user_id', userId)
      .eq('slot', cosmeticDetail.category);
  }

  // 4. Clean up: remove all granted cosmetics from test user
  console.log('\n── Cleanup ──');
  await admin
    .from('user_cosmetic_loadout')
    .delete()
    .eq('user_id', userId);
  await admin
    .from('user_cosmetics')
    .delete()
    .eq('user_id', userId);
  console.log('   Removed all test user cosmetics and loadout\n');

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total: ${results.length} | ${PASS} ${passed} | ${FAIL} ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
