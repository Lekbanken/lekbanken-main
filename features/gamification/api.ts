import type { FactionId } from "@/types/journey";
import type { GamificationPayload } from "./types";

const API_PATH = "/api/gamification";

export type { GamificationPayload };

/**
 * Save the user's faction choice (or null to reset).
 * Accepts an AbortSignal to cancel in-flight requests on rapid clicks.
 */
export async function saveFaction(
  factionId: FactionId,
  signal?: AbortSignal,
): Promise<{ factionId: FactionId }> {
  const res = await fetch(`${API_PATH}/faction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ factionId }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Faction API failed with status ${res.status}`);
  }
  return (await res.json()) as { factionId: FactionId };
}

export async function fetchGamificationSnapshot(): Promise<GamificationPayload> {
  const res = await fetch(API_PATH, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Gamification API failed with status ${res.status}`);
  }

  const payload = (await res.json()) as GamificationPayload;
  return payload;
}

// ---------------------------------------------------------------------------
// Showcase — user's 4 pinned achievement slots for Journey
// ---------------------------------------------------------------------------

export type ShowcaseSlotPayload = { slot: number; achievementId: string };

export async function saveShowcase(
  slots: ShowcaseSlotPayload[],
  signal?: AbortSignal,
): Promise<{ slots: ShowcaseSlotPayload[] }> {
  const res = await fetch(`${API_PATH}/showcase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slots }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Showcase API failed with status ${res.status}`);
  }
  return (await res.json()) as { slots: ShowcaseSlotPayload[] };
}

export type PinnedAchievementsPayload = {
  tenantId: string;
  pinnedIds: string[];
  achievements: Array<{ 
    id: string; 
    name: string; 
    description: string | null; 
    icon_url?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon_config?: Record<string, any> | null;
  }>;
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
    identity: {
      displayName: "Test Spelare",
      avatarUrl: null,
      factionId: null,
    },
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
