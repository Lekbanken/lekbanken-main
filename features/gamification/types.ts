export type AchievementStatus = "unlocked" | "locked" | "in_progress";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  status: AchievementStatus;
  icon?: string;
  progress?: number; // 0-100 when in progress
  points?: number;
  requirement?: string;
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
  currentXp: number;
  nextLevelXp: number;
  completedAchievements: number;
  totalAchievements: number;
  nextReward?: string;
  // Placeholder for future layered badge / frame references
  rewardAssetKey?: string;
};
