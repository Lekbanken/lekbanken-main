export type JourneySnapshot = {
  userId: string;
  tenantId?: string | null;
  streakDays: number | null;
  coinsBalance: number | null;
  unlockedAchievements: number | null;
  totalAchievements: number | null;
  level: number | null;
  currentXp: number | null;
  nextLevelXp: number | null;
};

export type JourneyActivityType =
  | 'coin_earned'
  | 'coin_spent'
  | 'achievement_unlocked'
  | 'session_completed'
  | 'plan_progressed';

export type JourneyActivity = {
  id: string;
  type: JourneyActivityType;
  occurredAt: string; // ISO
  title: string;
  description?: string;
  href?: string;
  meta?: Record<string, unknown>;
};

export type JourneyFeed = {
  items: JourneyActivity[];
  nextCursor?: string;
};
