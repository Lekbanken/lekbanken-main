import type { Achievement, CoinsSummary, ProgressSnapshot, StreakSummary } from "./types";

export type GamificationPayload = {
  achievements: Achievement[];
  coins: CoinsSummary;
  streak: StreakSummary;
  progress: ProgressSnapshot;
};

// Temporary mock loader; replace with Supabase/API fetch when available.
export async function fetchGamificationSnapshot(): Promise<GamificationPayload> {
  await new Promise((resolve) => setTimeout(resolve, 300)); // mimic network

  const achievements: Achievement[] = [
    { id: "ach-1", name: "Session starter", description: "Complete your first play session", status: "unlocked", icon: "SS", points: 50 },
    { id: "ach-2", name: "Consistent coach", description: "Log sessions 3 days in a row", status: "in_progress", progress: 65, icon: "CC", points: 120 },
    { id: "ach-3", name: "Planner pro", description: "Create and run a planned session", status: "locked", icon: "PP", requirement: "Finish a planned session" },
    { id: "ach-4", name: "Community builder", description: "Invite a teammate to co-run a session", status: "locked", icon: "CB" },
    { id: "ach-5", name: "Momentum", description: "Run 5 sessions this month", status: "unlocked", icon: "M5", points: 200 },
    { id: "ach-6", name: "Playlist pilot", description: "Save 5 games to a planner playlist", status: "in_progress", progress: 40, icon: "PL" },
  ];

  const coins: CoinsSummary = {
    balance: 2450,
    recentTransactions: [
      { id: "tx-1", type: "earn", amount: 120, description: "Completed 3 sessions this week", date: "Today" },
      { id: "tx-2", type: "spend", amount: 200, description: "Unlocked badge frame", date: "Yesterday" },
      { id: "tx-3", type: "earn", amount: 80, description: "Daily streak reward", date: "Mon" },
    ],
  };

  const streak: StreakSummary = {
    currentStreakDays: 7,
    bestStreakDays: 14,
    lastActiveDate: "Today",
  };

  const progress: ProgressSnapshot = {
    level: 4,
    currentXp: 2200,
    nextLevelXp: 3000,
    completedAchievements: achievements.filter((a) => a.status === "unlocked").length,
    totalAchievements: achievements.length,
    nextReward: "Profile frame",
  };

  return { achievements, coins, streak, progress };
}

// Supabase-backed loader (skeleton). Wire up once tables exist.
// Example table expectations (adjust to your schema):
// - user_achievements: { id, name, description, status, icon, progress, points, requirement }
// - user_coins: { balance }
// - coin_transactions: { id, type, amount, description, created_at }
// - user_streaks: { current_days, best_days, last_active_date }
// NOTE: This function is disabled until the required tables are created in Supabase.

/*
 * Placeholder for Supabase-backed gamification data loader.
 * Re-enable once the following tables exist:
 * - user_achievements, user_coins, coin_transactions, user_streaks
 *
async function _fetchGamificationFromSupabase(userId?: string): Promise<GamificationPayload> {
  // Implementation removed - tables do not yet exist in schema
}
*/
