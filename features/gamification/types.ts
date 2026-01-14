import type { AchievementIconConfig } from "@/features/admin/achievements/types";

export type AchievementStatus = "unlocked" | "locked" | "in_progress";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  status: AchievementStatus;
  icon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon_config?: AchievementIconConfig | Record<string, any> | null;
  progress?: number; // 0-100 when in progress
  points?: number;
  requirement?: string;
  hint?: string | null;
  hintText?: string | null;
  isEasterEgg?: boolean;
  unlockedAt?: string | null;
};

export type CoinTransaction = {
  id: string;
  type: "earn" | "spend";
  amount: number;
  description: string;
  date: string;
};

export type CoinsSummary = {
  balance: number;
  recentTransactions: CoinTransaction[];
};

export type StreakSummary = {
  currentStreakDays: number;
  bestStreakDays: number;
  lastActiveDate: string;
};

export type ProgressSnapshot = {
  level: number;
  levelName?: string;
  currentXp: number;
  nextLevelXp: number;
  completedAchievements: number;
  totalAchievements: number;
  nextReward?: string;
  // Placeholder for future layered badge / frame references
  rewardAssetKey?: string;
};

export type GamificationPayload = {
  achievements: Achievement[];
  coins: CoinsSummary;
  streak: StreakSummary;
  progress: ProgressSnapshot;
};
