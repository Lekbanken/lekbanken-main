/**
 * POST /api/admin/award-builder/seed-test-badges
 * 
 * Seeds the database with test badges for gamification testing.
 * Only available for system admins.
 * 
 * Query params:
 *   - scopeType: 'global' | 'tenant' (default: 'global')
 *   - tenantId: required if scopeType is 'tenant'
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { mockAchievements } from '@/features/admin/achievements/data';
import { buildExportJson } from '@/features/admin/achievements/export-utils';
import { normalizeIconConfig } from '@/features/admin/achievements/icon-utils';
import type { AchievementItem } from '@/features/admin/achievements/types';

export const dynamic = 'force-dynamic';

// Filter to only get the graded wing badges (the new ones we added)
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

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  
  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const scopeType = searchParams.get('scopeType') ?? 'global';
  const tenantId = searchParams.get('tenantId');

  if (scopeType === 'tenant' && !tenantId) {
    return NextResponse.json({ error: 'tenantId required for tenant scope' }, { status: 400 });
  }

  const testBadges = getTestBadges();
  
  if (testBadges.length === 0) {
    return NextResponse.json({ 
      error: 'No test badges found in mockAchievements', 
      hint: 'Make sure data.ts contains badges with IDs starting with: ' + TEST_BADGE_PREFIXES.join(', ')
    }, { status: 404 });
  }

  const scope = scopeType === 'global' 
    ? { type: 'global' as const }
    : { type: 'tenant' as const, tenantId: tenantId! };

  const nowIso = new Date().toISOString();
  const results: { id: string; title: string; status: 'created' | 'exists' | 'error'; error?: string }[] = [];

  for (const badge of testBadges) {
    try {
      // Check if badge already exists by looking for a matching achievement_key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingQuery = (supabase as any)
        .from('award_builder_exports')
        .select('id')
        .eq('scope_type', scopeType);
      
      if (scopeType === 'tenant') {
        existingQuery.eq('tenant_id', tenantId);
      } else {
        existingQuery.is('tenant_id', null);
      }

      // We need to check if any export contains this badge ID in the JSON
      // For simplicity, we'll use the badge.id as part of a lookup
      const { data: _existing } = await existingQuery;
      
      // Check if we already have this badge (by comparing export JSON)
      // For now, we'll generate a deterministic ID based on scope + badge.id
      const exportId = `${scopeType === 'global' ? 'global' : tenantId}-${badge.id}`;
      
      const exportJson = buildExportJson({
        scope,
        actorUserId: user.id,
        tool: 'seed-test-badges',
        nowIso,
        exportId,
        badge,
      });

      // Try to upsert the badge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('award_builder_exports')
        .upsert({
          id: exportId,
          tenant_id: scopeType === 'tenant' ? tenantId : null,
          scope_type: scopeType,
          schema_version: '1.0',
          exported_at: nowIso,
          exported_by_user_id: user.id,
          exported_by_tool: 'seed-test-badges',
          export: exportJson,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        results.push({ id: badge.id, title: badge.title ?? '', status: 'error', error: insertError.message });
      } else {
        results.push({ id: badge.id, title: badge.title ?? '', status: 'created' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ id: badge.id, title: badge.title ?? '', status: 'error', error: message });
    }
  }

  const created = results.filter(r => r.status === 'created').length;
  const errors = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    message: `Seeded ${created} badges, ${errors} errors`,
    scopeType,
    tenantId: tenantId ?? null,
    results,
  });
}

export async function GET(_request: NextRequest) {
  // Preview what would be seeded
  const testBadges = getTestBadges();
  
  return NextResponse.json({
    message: 'Test badges available for seeding',
    count: testBadges.length,
    badges: testBadges.map(b => ({
      id: b.id,
      title: b.title,
      description: b.description,
      theme: b.icon.themeId,
      base: b.icon.base?.id,
      backgrounds: b.icon.backgrounds?.map(bg => bg.id),
      rewardCoins: b.rewardCoins,
    })),
    hint: 'POST to this endpoint to seed the badges. Add ?scopeType=global or ?scopeType=tenant&tenantId=xxx',
  });
}
