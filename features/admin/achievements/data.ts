import { AchievementItem, AchievementLayer, AchievementTheme } from "./types";

export const themes: AchievementTheme[] = [
  { id: "twilight", name: "Twilight", baseColor: "#8661ff", backgroundColor: "#00c7b0", foregroundColor: "#ffd166", symbolColor: "#ffffff" },
  { id: "ember", name: "Ember", baseColor: "#f97316", backgroundColor: "#1f2937", foregroundColor: "#facc15", symbolColor: "#ffffff" },
  { id: "aurora", name: "Aurora", baseColor: "#22c55e", backgroundColor: "#0ea5e9", foregroundColor: "#a855f7", symbolColor: "#ffffff" },
  { id: "slate", name: "Slate", baseColor: "#1f2937", backgroundColor: "#334155", foregroundColor: "#cbd5e1", symbolColor: "#f8fafc" },
  { id: "sunrise", name: "Sunrise", baseColor: "#fb7185", backgroundColor: "#fbbf24", foregroundColor: "#22c55e", symbolColor: "#0f172a" },
  { id: "arctic", name: "Arctic", baseColor: "#0ea5e9", backgroundColor: "#e0f2fe", foregroundColor: "#0284c7", symbolColor: "#0f172a" },
];

export const layers: AchievementLayer[] = [
  { id: "base-shield", type: "base", name: "Shield", asset: "/achievements/base/shield.svg", tintable: true },
  { id: "base-circle", type: "base", name: "Circle", asset: "/achievements/base/circle.svg", tintable: true },
  { id: "base-ribbon", type: "base", name: "Ribbon", asset: "/achievements/base/ribbon.svg", tintable: true },
  { id: "bg-wings", type: "background", name: "Wings", asset: "/achievements/background/wings.svg", tintable: true },
  { id: "bg-laurel", type: "background", name: "Laurel", asset: "/achievements/background/laurel.svg", tintable: true },
  { id: "fg-stars", type: "foreground", name: "Stars", asset: "/achievements/foreground/stars.svg", tintable: true },
  { id: "fg-crown", type: "foreground", name: "Crown", asset: "/achievements/foreground/crown.svg", tintable: true },
  { id: "sym-heart", type: "symbol", name: "Heart", asset: "/achievements/symbol/heart.svg", tintable: true },
  { id: "sym-lightning", type: "symbol", name: "Lightning", asset: "/achievements/symbol/lightning.svg", tintable: true },
  { id: "sym-book", type: "symbol", name: "Book", asset: "/achievements/symbol/book.svg", tintable: true },
  { id: "sym-dice", type: "symbol", name: "Dice", asset: "/achievements/symbol/dice.svg", tintable: true },
];

export const mockAchievements: AchievementItem[] = [
  {
    id: "achv-1",
    title: "Core Pathfinder",
    subtitle: "Complete onboarding",
    description: "Finish the onboarding flow and unlock the core badge.",
    rewardCoins: 50,
    themeId: "twilight",
    profileFrameSync: true,
    publishedRoles: ["admin", "creator"],
    status: "published",
    version: 3,
    availableForOrgs: ["org-1", "org-2"],
    layers: {
      base: "base-shield",
      background: "bg-laurel",
      foreground: "fg-stars",
      symbol: "sym-lightning",
    },
  },
  {
    id: "achv-2",
    title: "Gamification Pro",
    subtitle: "Launch your first quest",
    description: "Publish a gamified quest with rewards.",
    rewardCoins: 120,
    themeId: "aurora",
    profileFrameSync: false,
    publishedRoles: ["admin"],
    status: "draft",
    version: 1,
    availableForOrgs: [],
    layers: {
      base: "base-ribbon",
      background: "bg-wings",
      foreground: "fg-crown",
      symbol: "sym-heart",
    },
  },
];
