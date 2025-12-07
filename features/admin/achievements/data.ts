import { AchievementItem, AchievementTheme } from "./types";

export const themes: AchievementTheme[] = [
  {
    id: "gold_default",
    name: "Guld",
    colors: {
      base: { color: "#F1C232" },
      background: { color: "#F59E0B" },
      foreground: { color: "#FBBF24" },
      symbol: { color: "#FFF7ED" },
    },
  },
  {
    id: "silver_default",
    name: "Silver",
    colors: {
      base: { color: "#D1D5DB" },
      background: { color: "#9CA3AF" },
      foreground: { color: "#E5E7EB" },
      symbol: { color: "#F9FAFB" },
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    colors: {
      base: { color: "#10B981" },
      background: { color: "#059669" },
      foreground: { color: "#34D399" },
      symbol: { color: "#ECFDF3" },
    },
  },
  {
    id: "amethyst",
    name: "Amethyst",
    colors: {
      base: { color: "#8B5CF6" },
      background: { color: "#7C3AED" },
      foreground: { color: "#A78BFA" },
      symbol: { color: "#F5F3FF" },
    },
  },
  {
    id: "ruby",
    name: "Ruby",
    colors: {
      base: { color: "#EF4444" },
      background: { color: "#B91C1C" },
      foreground: { color: "#F87171" },
      symbol: { color: "#FEF2F2" },
    },
  },
  {
    id: "arctic",
    name: "Arctic",
    colors: {
      base: { color: "#0EA5E9" },
      background: { color: "#0369A1" },
      foreground: { color: "#38BDF8" },
      symbol: { color: "#E0F2FE" },
    },
  },
];

export const mockAchievements: AchievementItem[] = [
  {
    id: "achv-1",
    title: "Core Pathfinder",
    subtitle: "Complete onboarding",
    description: "Finish the onboarding flow and unlock the core badge.",
    rewardCoins: 50,
    profileFrameSync: { enabled: true, durationDays: 7, useBase: true, useForeground: true },
    publishedRoles: ["admin", "creator"],
    status: "published",
    version: 3,
    availableForOrgs: ["org-1", "org-2"],
    icon: {
      mode: "theme",
      themeId: "amethyst",
      size: "lg",
      layers: {
        base: "base_shield",
        background: "bg_wings_2",
        foreground: "fg_stars_3",
        symbol: "ic_flash",
      },
    },
  },
  {
    id: "achv-2",
    title: "Gamification Pro",
    subtitle: "Launch your first quest",
    description: "Publish a gamified quest with rewards.",
    rewardCoins: 120,
    profileFrameSync: { enabled: false },
    publishedRoles: ["admin"],
    status: "draft",
    version: 1,
    availableForOrgs: [],
    icon: {
      mode: "custom",
      themeId: "emerald",
      size: "lg",
      layers: {
        base: "base_circle",
        background: "bg_spikes_3",
        foreground: "fg_queen_crown_1",
        symbol: "ic_medalj",
      },
      customColors: {
        base: "#0EA5E9",
        background: "#10B981",
        foreground: "#FBBF24",
        symbol: "#F8FAFC",
      },
    },
  },
];
