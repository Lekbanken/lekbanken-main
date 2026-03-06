import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerRlsClient } from "@/lib/supabase/server";
import type {
  Achievement,
  AchievementStatus,
  CoinsSummary,
  CosmeticsSnapshot,
  GamificationIdentity,
  GamificationPayload,
  JourneyPreference,
  ProgressSnapshot,
  ShowcaseSlot,
  ShowcaseSummary,
  StreakSummary,
} from "@/features/gamification/types";
import type { Database } from "@/types/supabase";
import type { ActiveLoadout, RenderConfig } from "@/features/journey/cosmetic-types";

type AchievementRow = {
  id: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  icon_config?: Record<string, unknown> | null;
  condition_type?: string | null;
  condition_value?: number | null;
  is_easter_egg?: boolean | null;
  hint_text?: string | null;
};

type UserAchievementRow = {
  achievement_id: string;
  unlocked_at?: string | null;
};

type UserCoinRow = {
  balance: number | null;
};

type CoinTransactionRow = {
  id: string;
  type: "earn" | "spend" | string;
  amount: number;
  description?: string | null;
  created_at: string;
};

type UserStreakRow = {
  current_streak_days: number | null;
  best_streak_days: number | null;
  last_active_date: string | null;
};

type UserProgressRow = {
  level: number | null;
  current_xp: number | null;
  next_level_xp: number | null;
  tenant_id?: string | null;
};

type LevelDefinitionRow = {
  level: number;
  name: string | null;
  next_level_xp: number;
  next_reward: string | null;
  reward_asset_key: string | null;
  scope_tenant_id: string | null;
};

type GamificationDatabase = Database & {
  public: {
    Tables: Database["public"]["Tables"] & {
      achievements: { Row: AchievementRow };
      user_achievements: { Row: UserAchievementRow };
      user_coins: { Row: UserCoinRow };
      coin_transactions: { Row: CoinTransactionRow };
      user_streaks: { Row: UserStreakRow };
      user_progress: { Row: UserProgressRow };
    };
  };
};

type GamificationClient = SupabaseClient<GamificationDatabase>;

export const dynamic = "force-dynamic";

function inferRequirement(conditionType?: string, conditionValue?: number | null) {
  if (!conditionType) return undefined;
  if (conditionType === "session_count" && conditionValue) return `Spela ${conditionValue} sessioner`;
  if (conditionType === "score_milestone" && conditionValue) return `Nå ${conditionValue} poäng`;
  return conditionType;
}

function mapAchievements(
  achievements: Array<{
    id: string;
    name: string;
    description?: string | null;
    icon_url?: string | null;
    icon_config?: Record<string, unknown> | null;
    condition_type?: string | null;
    condition_value?: number | null;
    is_easter_egg?: boolean | null;
    hint_text?: string | null;
  }>,
  unlocked: Array<{ achievement_id: string; unlocked_at?: string | null }>
): Achievement[] {
  const unlockedMap = new Map(unlocked.map((a) => [a.achievement_id, a.unlocked_at]));
  return achievements.map((a) => {
    const unlockedAt = unlockedMap.get(a.id);
    const status: AchievementStatus = unlockedAt !== undefined ? "unlocked" : "locked";
    const points = a.condition_value ?? undefined;
    return {
      id: a.id,
      name: a.name,
      description: a.description ?? "",
      status,
      icon: a.icon_url ?? undefined,
      icon_config: a.icon_config ?? null,
      points,
      requirement: inferRequirement(a.condition_type ?? undefined, a.condition_value ?? undefined),
      hint: a.hint_text ?? null,
      hintText: a.hint_text ?? null,
      isEasterEgg: Boolean(a.is_easter_egg ?? false),
      unlockedAt: unlockedAt ?? null,
    } satisfies Achievement;
  });
}

function mapCoins(balanceRow: { balance?: number | null } | null, transactions: Array<{ id: string; type: string; amount: number; description?: string | null; reason_code?: string | null; created_at: string }> | null): CoinsSummary {
  const formatter = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });
  return {
    balance: balanceRow?.balance ?? 0,
    recentTransactions:
      transactions?.map((t) => ({
        id: t.id,
        type: t.type === "spend" ? "spend" : "earn",
        amount: t.amount,
        description: t.description ?? "",
        reasonCode: t.reason_code ?? null,
        date: formatter.format(new Date(t.created_at)),
      })) ?? [],
  };
}

function mapStreak(row: { current_streak_days?: number | null; best_streak_days?: number | null; last_active_date?: string | null } | null): StreakSummary {
  return {
    currentStreakDays: row?.current_streak_days ?? 0,
    bestStreakDays: row?.best_streak_days ?? 0,
    lastActiveDate: row?.last_active_date ?? "-",
  };
}

function mapProgress(row: { level?: number | null; current_xp?: number | null; next_level_xp?: number | null } | null, achievements: Achievement[]): ProgressSnapshot {
  const completedAchievements = achievements.filter((a) => a.status === "unlocked").length;
  return {
    level: row?.level ?? 1,
    currentXp: row?.current_xp ?? completedAchievements * 100,
    nextLevelXp: row?.next_level_xp ?? 1000,
    completedAchievements,
    totalAchievements: achievements.length,
    nextReward: "Ny badge snart",
  };
}

function applyLevelDefinitions(progress: ProgressSnapshot, levelDefs: LevelDefinitionRow[] | null): ProgressSnapshot {
  const defs = Array.isArray(levelDefs) ? levelDefs : [];
  const current = defs.find((d) => d.level === progress.level) ?? null;

  return {
    ...progress,
    levelName: current?.name ?? progress.levelName,
    nextLevelXp: typeof current?.next_level_xp === 'number' ? current.next_level_xp : progress.nextLevelXp,
    nextReward: current?.next_reward ?? progress.nextReward,
    rewardAssetKey: current?.reward_asset_key ?? progress.rewardAssetKey,
  };
}

export async function GET() {
  const supabase = (await createServerRlsClient()) as unknown as GamificationClient;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  // First get progress to know tenant context
  const progressRes = await supabase
    .from("user_progress")
    .select("level,current_xp,next_level_xp,tenant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const tenantId = (progressRes.data as { tenant_id?: string | null } | null)?.tenant_id ?? null;

  // Faction + Journey activation state lives in its own table — 1 row per user, no tenant dependency.
  type PrefsRow = { faction_id: string | null; journey_enabled: boolean; journey_decision_at: string | null };
  const prefsRes = await (
    supabase.from("user_journey_preferences" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: PrefsRow | null; error: unknown }>;
        };
      };
    }
  )
    .select("faction_id,journey_enabled,journey_decision_at")
    .eq("user_id", userId)
    .maybeSingle();

  // Build achievements query: global (tenant_id IS NULL) + tenant-specific active achievements
  let achievementsQuery = supabase
    .from("achievements")
    .select("id,name,description,icon_url,icon_config,condition_type,condition_value,is_easter_egg,hint_text,tenant_id")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (tenantId) {
    // Include global achievements OR this tenant's achievements
    achievementsQuery = achievementsQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  } else {
    // Only global achievements
    achievementsQuery = achievementsQuery.is("tenant_id", null);
  }

  const [achievementsRes, userAchievementsRes, coinsRes, txRes, streakRes, showcaseRes, loadoutRes, recentUnlocksRes, unlockedCountRes] = await Promise.all([
    achievementsQuery,
    supabase.from("user_achievements").select("achievement_id,unlocked_at").eq("user_id", userId),
    supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("coin_transactions")
      .select("id,type,amount,description,reason_code,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("user_streaks")
      .select("current_streak_days,best_streak_days,last_active_date")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    // Showcase — user's pinned badges (max 4)
    (supabase.from("user_achievement_showcase" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Array<{ slot: number; achievement_id: string }> | null; error: unknown }>;
        };
      };
    })
      .select("slot,achievement_id")
      .eq("user_id", userId)
      .order("slot", { ascending: true }),
    // Cosmetics — loadout, recent unlocks, count
    supabase
      .from("user_cosmetic_loadout")
      .select("slot,cosmetic_id")
      .eq("user_id", userId),
    supabase
      .from("user_cosmetics")
      .select("cosmetic_id,unlocked_at,cosmetics!inner(key)")
      .eq("user_id", userId)
      .gte("unlocked_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("unlocked_at", { ascending: false }),
    supabase
      .from("user_cosmetics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const achievements = mapAchievements(achievementsRes.data ?? [], userAchievementsRes.data ?? []);
  const coins = mapCoins(coinsRes.data ?? null, txRes.data ?? null);
  const streak = mapStreak(streakRes.data ?? null);
  const baseProgress = mapProgress(progressRes.data ?? null, achievements);

  let levelDefs: LevelDefinitionRow[] | null = null;
  try {
    const res = await supabase.rpc('get_gamification_level_definitions_v1', { p_tenant_id: tenantId ?? undefined })
    levelDefs = (res.data as LevelDefinitionRow[] | null) ?? null
  } catch {
    levelDefs = null
  }

  const progress = applyLevelDefinitions(baseProgress, levelDefs);

  // Showcase — map pinned slots to Achievement objects
  const showcaseRows = (showcaseRes as { data: Array<{ slot: number; achievement_id: string }> | null }).data ?? [];
  const showcaseSlots: [ShowcaseSlot, ShowcaseSlot, ShowcaseSlot, ShowcaseSlot] = [
    { slot: 1, achievement: null },
    { slot: 2, achievement: null },
    { slot: 3, achievement: null },
    { slot: 4, achievement: null },
  ];
  for (const row of showcaseRows) {
    const idx = row.slot - 1;
    if (idx >= 0 && idx < 4) {
      showcaseSlots[idx] = {
        slot: row.slot as 1 | 2 | 3 | 4,
        achievement: achievements.find((a) => a.id === row.achievement_id) ?? null,
      };
    }
  }
  const showcase: ShowcaseSummary = { slots: showcaseSlots };

  // Identity — auth metadata + faction from user_journey_preferences
  const rawFaction = (prefsRes.data as PrefsRow | null)?.faction_id ?? null;
  const VALID_FACTIONS = new Set<string>(["forest", "sea", "desert", "void"]);
  const factionId = rawFaction && VALID_FACTIONS.has(rawFaction)
    ? (rawFaction as "forest" | "sea" | "desert" | "void")
    : null;
  const identity: GamificationIdentity = {
    displayName:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "Spelare",
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
    factionId,
  };

  // Journey activation preference
  const prefsData = prefsRes.data as PrefsRow | null;
  const journeyPreference: JourneyPreference = {
    enabled: prefsData?.journey_enabled ?? false,
    decisionAt: prefsData?.journey_decision_at ?? null,
  };

  // Cosmetics — build loadout with render configs
  const loadoutRows = (loadoutRes.data ?? []) as Array<{ slot: string; cosmetic_id: string }>;
  const loadout: ActiveLoadout = {};
  if (loadoutRows.length > 0) {
    const cosmeticIds = loadoutRows.map((r) => r.cosmetic_id);
    const { data: cosmeticRows } = await supabase
      .from("cosmetics")
      .select("id,category,render_type,render_config")
      .in("id", cosmeticIds);
    const cosmeticMap = new Map((cosmeticRows ?? []).map((c) => [c.id, c]));
    for (const row of loadoutRows) {
      const c = cosmeticMap.get(row.cosmetic_id);
      if (c) {
        const config = (typeof c.render_config === 'object' && c.render_config !== null ? c.render_config : {}) as Record<string, unknown>;
        let renderConfig: RenderConfig;
        switch (c.render_type) {
          case 'svg_frame': renderConfig = { renderType: 'svg_frame', variant: String(config.variant ?? ''), glowColor: config.glowColor as string | undefined }; break;
          case 'css_background': renderConfig = { renderType: 'css_background', className: String(config.className ?? ''), keyframes: config.keyframes as string | undefined }; break;
          case 'css_particles': renderConfig = { renderType: 'css_particles', className: String(config.className ?? ''), count: typeof config.count === 'number' ? config.count : undefined }; break;
          case 'xp_skin': renderConfig = { renderType: 'xp_skin', skin: String(config.skin ?? ''), colorMode: config.colorMode as string | undefined }; break;
          case 'css_divider': renderConfig = { renderType: 'css_divider', variant: String(config.variant ?? ''), className: config.className as string | undefined }; break;
          default: continue;
        }
        loadout[c.category as keyof ActiveLoadout] = renderConfig;
      }
    }
  }

  const recentUnlockRows = (recentUnlocksRes.data ?? []) as Array<{ cosmetic_id: string; unlocked_at: string | null; cosmetics: { key: string } }>;
  const cosmetics: CosmeticsSnapshot = {
    loadout,
    unlockedCount: unlockedCountRes.count ?? 0,
    recentUnlocks: recentUnlockRows.map((r) => ({
      cosmeticKey: r.cosmetics.key,
      unlockedAt: r.unlocked_at ?? '',
    })),
  };

  const payload: GamificationPayload = {
    identity,
    achievements,
    coins,
    streak,
    progress,
    showcase,
    journeyPreference,
    cosmetics,
  };

  return NextResponse.json(payload, { status: 200 });
}
