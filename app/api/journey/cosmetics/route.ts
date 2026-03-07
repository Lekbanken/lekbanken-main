import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { CosmeticSlot, CosmeticRarity, RenderConfig, UnlockType, UnlockRequirement } from '@/features/journey/cosmetic-types';

export const dynamic = 'force-dynamic';

/**
 * Map DB render_config JSON + render_type to typed RenderConfig.
 * Falls back gracefully if the JSON shape is unexpected.
 */
function toRenderConfig(renderType: string, raw: unknown): RenderConfig {
  const config = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  switch (renderType) {
    case 'svg_frame':
      return { renderType: 'svg_frame', variant: String(config.variant ?? ''), glowColor: config.glowColor as string | undefined };
    case 'css_background':
      return { renderType: 'css_background', className: String(config.className ?? ''), keyframes: config.keyframes as string | undefined };
    case 'css_particles':
      return { renderType: 'css_particles', className: String(config.className ?? ''), count: typeof config.count === 'number' ? config.count : undefined };
    case 'xp_skin':
      return { renderType: 'xp_skin', skin: String(config.skin ?? ''), colorMode: config.colorMode as string | undefined };
    case 'css_divider':
      return { renderType: 'css_divider', variant: String(config.variant ?? ''), className: config.className as string | undefined };
    case 'title':
      return { renderType: 'title', label: String(config.label ?? '') };
    default:
      return { renderType: 'svg_frame', variant: '' };
  }
}

export async function GET() {
  const supabase = await createServerRlsClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Parallel fetches — all reads, no writes
  const [catalogRes, grantsRes, loadoutRes, rulesRes, levelRes] = await Promise.all([
    supabase
      .from('cosmetics')
      .select('id,key,category,faction_id,rarity,name_key,description_key,render_type,render_config,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_cosmetics')
      .select('cosmetic_id,unlock_type')
      .eq('user_id', userId),
    supabase
      .from('user_cosmetic_loadout')
      .select('slot,cosmetic_id')
      .eq('user_id', userId),
    supabase
      .from('cosmetic_unlock_rules')
      .select('cosmetic_id,unlock_type,unlock_config,priority')
      .order('priority', { ascending: false }),
    supabase
      .from('user_progress')
      .select('level')
      .eq('user_id', userId)
      .order('level', { ascending: false })
      .limit(1),
  ]);

  const userLevel = levelRes.data?.[0]?.level ?? 0;

  // Build a map: cosmeticId → ALL unlock rules (highest priority first)
  const allRulesMap = new Map<string, Array<{ type: string; config: Record<string, unknown> }>>();
  for (const rule of (rulesRes.data ?? [])) {
    const list = allRulesMap.get(rule.cosmetic_id) ?? [];
    list.push({
      type: rule.unlock_type,
      config: (rule.unlock_config ?? {}) as Record<string, unknown>,
    });
    allRulesMap.set(rule.cosmetic_id, list);
  }

  // Build a map: cosmeticId → explicit grant type (from user_cosmetics)
  const grantMap = new Map<string, string>();
  for (const row of (grantsRes.data ?? [])) {
    grantMap.set(row.cosmetic_id, row.unlock_type);
  }

  const catalog = (catalogRes.data ?? []).map((row) => {
    const rules = allRulesMap.get(row.id) ?? [];
    const primaryRule = rules[0] ?? null;
    const grantType = grantMap.get(row.id);

    // Collect all active unlock sources
    const sources: UnlockType[] = [];

    // Explicit grant (achievement, shop, admin, event)
    if (grantType) {
      sources.push(grantType as UnlockType);
    }

    // Dynamic level eligibility — check all level rules
    for (const rule of rules) {
      if (rule.type === 'level') {
        const requiredLevel = Number(rule.config.required_level ?? 0);
        if (userLevel >= requiredLevel) {
          if (!sources.includes('level')) sources.push('level');
        }
      }
    }

    const isUnlocked = sources.length > 0;
    const primarySource = sources[0] ?? null;

    // Build requirement info for locked items
    let requirement: UnlockRequirement | null = null;
    if (!isUnlocked && primaryRule) {
      requirement = { type: primaryRule.type as UnlockType };
      if (primaryRule.type === 'level') {
        requirement.requiredLevel = Number(primaryRule.config.required_level ?? 0);
        requirement.currentLevel = userLevel;
      }
    }

    return {
      id: row.id,
      key: row.key,
      category: row.category as CosmeticSlot,
      factionId: row.faction_id,
      rarity: row.rarity as CosmeticRarity,
      nameKey: row.name_key,
      descriptionKey: row.description_key,
      renderType: row.render_type,
      renderConfig: toRenderConfig(row.render_type, row.render_config),
      sortOrder: row.sort_order ?? 0,
      isActive: row.is_active ?? true,
      unlockInfo: primaryRule
        ? {
            type: primaryRule.type as UnlockType,
            ...(primaryRule.type === 'level' && typeof primaryRule.config.required_level === 'number'
              ? { level: primaryRule.config.required_level }
              : {}),
          }
        : null,
      access: { isUnlocked, sources, primarySource, requirement },
    };
  });

  const loadout: Record<string, string> = {};
  for (const row of (loadoutRes.data ?? [])) {
    loadout[row.slot] = row.cosmetic_id;
  }

  return NextResponse.json({ catalog, loadout, userLevel }, { status: 200 });
}
