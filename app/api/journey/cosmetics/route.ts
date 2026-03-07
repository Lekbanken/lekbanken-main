import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { checkAndGrantCosmetics } from '@/lib/journey/cosmetic-grants';
import type { CosmeticSlot, CosmeticRarity, RenderConfig } from '@/features/journey/cosmetic-types';

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

  // ── Lazy sync: grant any cosmetics the user qualifies for but hasn't received ──
  // Fetch user's highest level across tenants, then call the idempotent grant function.
  try {
    const adminClient = getSupabaseAdmin();
    const { data: progressRows } = await adminClient
      .from('user_progress')
      .select('level')
      .eq('user_id', userId)
      .order('level', { ascending: false })
      .limit(1);

    const highestLevel = progressRows?.[0]?.level;
    if (highestLevel && highestLevel >= 1) {
      await checkAndGrantCosmetics(adminClient, userId, {
        type: 'level',
        level: highestLevel,
      });
    }
  } catch (e) {
    // Non-fatal — log and continue serving catalog
    console.error('[cosmetics] Lazy sync failed:', e);
  }

  // Parallel fetches — catalog (RLS: is_active=true), user's unlocked, user's loadout, unlock rules
  const [catalogRes, unlockedRes, loadoutRes, rulesRes] = await Promise.all([
    supabase
      .from('cosmetics')
      .select('id,key,category,faction_id,rarity,name_key,description_key,render_type,render_config,sort_order,is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_cosmetics')
      .select('cosmetic_id')
      .eq('user_id', userId),
    supabase
      .from('user_cosmetic_loadout')
      .select('slot,cosmetic_id')
      .eq('user_id', userId),
    supabase
      .from('cosmetic_unlock_rules')
      .select('cosmetic_id,unlock_type,unlock_config,priority')
      .order('priority', { ascending: false }),
  ]);

  // Build a map: cosmeticId → primary unlock rule (highest priority)
  const unlockRuleMap = new Map<string, { type: string; config: Record<string, unknown> }>();
  for (const rule of (rulesRes.data ?? [])) {
    if (!unlockRuleMap.has(rule.cosmetic_id)) {
      unlockRuleMap.set(rule.cosmetic_id, {
        type: rule.unlock_type,
        config: (rule.unlock_config ?? {}) as Record<string, unknown>,
      });
    }
  }

  const catalog = (catalogRes.data ?? []).map((row) => {
    const rule = unlockRuleMap.get(row.id);
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
      unlockInfo: rule
        ? {
            type: rule.type,
            ...(rule.type === 'level' && typeof rule.config.required_level === 'number'
              ? { level: rule.config.required_level }
              : {}),
          }
        : null,
    };
  });

  const unlocked = (unlockedRes.data ?? []).map((r) => r.cosmetic_id);

  const loadout: Record<string, string> = {};
  for (const row of (loadoutRes.data ?? [])) {
    loadout[row.slot] = row.cosmetic_id;
  }

  return NextResponse.json({ catalog, unlocked, loadout }, { status: 200 });
}
