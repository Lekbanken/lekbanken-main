import type { GamificationPayload } from "./types";

const API_PATH = "/api/gamification";

export type { GamificationPayload };

export async function fetchGamificationSnapshot(): Promise<GamificationPayload> {
  const res = await fetch(API_PATH, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Gamification API failed with status ${res.status}`);
  }

  const payload = (await res.json()) as GamificationPayload;
  return payload;
}

export type PinnedAchievementsPayload = {
  tenantId: string;
  pinnedIds: string[];
  achievements: Array<{ id: string; name: string; description: string | null; icon_url?: string | null }>;
};

export async function fetchPinnedAchievements(tenantId: string): Promise<PinnedAchievementsPayload> {
  const res = await fetch(`/api/gamification/pins?tenantId=${encodeURIComponent(tenantId)}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Pinned achievements API failed with status ${res.status}`);
  }
  return (await res.json()) as PinnedAchievementsPayload;
}

export async function savePinnedAchievements(payload: { tenantId: string; achievementIds: string[] }): Promise<{ tenantId: string; pinnedIds: string[] }> {
  const res = await fetch('/api/gamification/pins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Save pins API failed with status ${res.status}`)
  }
  return (await res.json()) as { tenantId: string; pinnedIds: string[] }
}

// Optional fallback for Storybook/sandbox while backend data is empty
export async function fetchGamificationSnapshotMock(): Promise<GamificationPayload> {
  return {
    achievements: [
      { id: "mock-1", name: "Session starter", description: "Starta din första session", status: "unlocked", icon: "SS", points: 50 },
      { id: "mock-2", name: "Planner pro", description: "Planera och kör en session", status: "in_progress", progress: 40, icon: "PP", points: 120 },
      { id: "mock-3", name: "Momentum", description: "5 sessioner den här månaden", status: "locked", icon: "M5" },
    ],
    coins: {
      balance: 1200,
      recentTransactions: [
        { id: "tx-1", type: "earn", amount: 120, description: "Veckomål klart", date: "Idag" },
        { id: "tx-2", type: "spend", amount: 200, description: "Köpt badge", date: "Igår" },
      ],
    },
    streak: {
      currentStreakDays: 3,
      bestStreakDays: 7,
      lastActiveDate: "Idag",
    },
    progress: {
      level: 2,
      currentXp: 320,
      nextLevelXp: 600,
      completedAchievements: 1,
      totalAchievements: 3,
      nextReward: "Profilram",
    },
  };
}
