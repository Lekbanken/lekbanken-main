import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerRlsClient } from "@/lib/supabase/server";
import type {
  Achievement,
  AchievementStatus,
  CoinsSummary,
  GamificationPayload,
  ProgressSnapshot,
  StreakSummary,
} from "@/features/gamification/types";
import type { Database } from "@/types/supabase";

type AchievementRow = {
  id: string;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  condition_type?: string | null;
  condition_value?: number | null;
  is_easter_egg?: boolean | null;
  hint_text?: string | null;
};

type UserAchievementRow = {
  achievement_id: string;
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
    condition_type?: string | null;
    condition_value?: number | null;
    is_easter_egg?: boolean | null;
    hint_text?: string | null;
  }>,
  unlocked: Array<{ achievement_id: string }>
): Achievement[] {
  const unlockedSet = new Set(unlocked.map((a) => a.achievement_id));
  return achievements.map((a) => {
    const status: AchievementStatus = unlockedSet.has(a.id) ? "unlocked" : "locked";
    const points = a.condition_value ?? undefined;
    return {
      id: a.id,
      name: a.name,
      description: a.description ?? "",
      status,
      icon: a.icon_url ?? undefined,
      points,
      requirement: inferRequirement(a.condition_type ?? undefined, a.condition_value ?? undefined),
      hintText: a.hint_text ?? null,
      isEasterEgg: Boolean(a.is_easter_egg ?? false),
    } satisfies Achievement;
  });
}

function mapCoins(balanceRow: { balance?: number | null } | null, transactions: Array<{ id: string; type: string; amount: number; description?: string | null; created_at: string }> | null): CoinsSummary {
  const formatter = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" });
  return {
    balance: balanceRow?.balance ?? 0,
    recentTransactions:
      transactions?.map((t) => ({
        id: t.id,
        type: t.type === "spend" ? "spend" : "earn",
        amount: t.amount,
        description: t.description ?? "",
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

  const [achievementsRes, userAchievementsRes, coinsRes, txRes, streakRes, progressRes] = await Promise.all([
    supabase
      .from("achievements")
      .select("id,name,description,icon_url,condition_type,condition_value,is_easter_egg,hint_text")
      .order("created_at", { ascending: true }),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
    supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("coin_transactions")
      .select("id,type,amount,description,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("user_streaks")
      .select("current_streak_days,best_streak_days,last_active_date")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_progress")
      .select("level,current_xp,next_level_xp,tenant_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ]);

  const achievements = mapAchievements(achievementsRes.data ?? [], userAchievementsRes.data ?? []);
  const coins = mapCoins(coinsRes.data ?? null, txRes.data ?? null);
  const streak = mapStreak(streakRes.data ?? null);
  const baseProgress = mapProgress(progressRes.data ?? null, achievements);

  const tenantId = (progressRes.data as { tenant_id?: string | null } | null)?.tenant_id ?? null;
  let levelDefs: LevelDefinitionRow[] | null = null;
  try {
    const res = await supabase.rpc('get_gamification_level_definitions_v1', { p_tenant_id: tenantId ?? undefined })
    levelDefs = (res.data as LevelDefinitionRow[] | null) ?? null
  } catch {
    levelDefs = null
  }

  const progress = applyLevelDefinitions(baseProgress, levelDefs);

  const payload: GamificationPayload = {
    achievements,
    coins,
    streak,
    progress,
  };

  return NextResponse.json(payload, { status: 200 });
}
