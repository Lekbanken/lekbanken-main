/**
 * Skill Tree Data Definitions
 *
 * 9 nodes per faction arranged in a 4-row tree.
 * Unlock is level-gated: node.requiredLevel <= user level → unlocked.
 *
 * Row 0: [Root]                          (level 1)
 * Row 1: [Background] [Avatar] [XP Bar]  (level 2–3)
 * Row 2: [Background2] [Divider] [Frame] (level 4–6)
 * Row 3: [Color Mode] [Prestige Title]   (level 8–10)
 */

import type { FactionId } from "@/types/journey";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillNodeStatus = "locked" | "available" | "unlocked";

export type SkillNodeIcon =
  | "badge"
  | "coin"
  | "shop"
  | "star"
  | "crown"
  | "flame"
  | "heart"
  | "gift";

export type CosmeticCategory =
  | "root"
  | "bg"
  | "avatar"
  | "xp"
  | "divider"
  | "header"
  | "color"
  | "prestige";

export interface SkillNodeDef {
  id: string;
  label: string;
  icon: SkillNodeIcon;
  row: number;
  col: number;
  connectsFrom: string[];
  requiredLevel: number;
  cosmeticKey?: string;
  cosmeticCategory: CosmeticCategory;
}

export interface SkillNode extends SkillNodeDef {
  status: SkillNodeStatus;
}

// ---------------------------------------------------------------------------
// Non-nullable faction helper
// ---------------------------------------------------------------------------

type NonNullFaction = Exclude<FactionId, null>;

// ---------------------------------------------------------------------------
// Per-faction skill tree definitions
// ---------------------------------------------------------------------------

const TREES: Record<NonNullFaction, SkillNodeDef[]> = {
  void: [
    { id: "root", label: "Välj Void", icon: "star", row: 0, col: 1, connectsFrom: [], requiredLevel: 1, cosmeticCategory: "root" },
    { id: "bg1", label: "Stjärnfält", icon: "star", row: 1, col: 0, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "backgroundEffect:stars", cosmeticCategory: "bg" },
    { id: "avatar", label: "Orbital", icon: "heart", row: 1, col: 1, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "avatarEffect:orbit", cosmeticCategory: "avatar" },
    { id: "xp", label: "Hyperspace", icon: "flame", row: 1, col: 2, connectsFrom: ["root"], requiredLevel: 3, cosmeticKey: "xpBarSkin:warp", cosmeticCategory: "xp" },
    { id: "bg2", label: "Meteorer", icon: "star", row: 2, col: 0, connectsFrom: ["bg1"], requiredLevel: 4, cosmeticKey: "backgroundEffect:meteors", cosmeticCategory: "bg" },
    { id: "divider", label: "Nebulosa", icon: "badge", row: 2, col: 1, connectsFrom: ["avatar"], requiredLevel: 5, cosmeticKey: "sectionDivider:nebula", cosmeticCategory: "divider" },
    { id: "header", label: "Stjärnbild", icon: "crown", row: 2, col: 2, connectsFrom: ["xp"], requiredLevel: 6, cosmeticKey: "headerFrame:constellation", cosmeticCategory: "header" },
    { id: "color", label: "Galaktisk", icon: "gift", row: 3, col: 0, connectsFrom: ["bg2", "divider"], requiredLevel: 8, cosmeticKey: "colorMode:galaxy", cosmeticCategory: "color" },
    { id: "title", label: "Void Walker", icon: "crown", row: 3, col: 2, connectsFrom: ["divider", "header"], requiredLevel: 10, cosmeticCategory: "prestige" },
  ],
  sea: [
    { id: "root", label: "Välj Hav", icon: "star", row: 0, col: 1, connectsFrom: [], requiredLevel: 1, cosmeticCategory: "root" },
    { id: "bg1", label: "Bubblor", icon: "heart", row: 1, col: 0, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "backgroundEffect:bubbles", cosmeticCategory: "bg" },
    { id: "avatar", label: "Krusning", icon: "heart", row: 1, col: 1, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "avatarEffect:ripple", cosmeticCategory: "avatar" },
    { id: "xp", label: "Havsström", icon: "flame", row: 1, col: 2, connectsFrom: ["root"], requiredLevel: 3, cosmeticKey: "xpBarSkin:current", cosmeticCategory: "xp" },
    { id: "bg2", label: "Vågor", icon: "star", row: 2, col: 0, connectsFrom: ["bg1"], requiredLevel: 4, cosmeticKey: "backgroundEffect:waves", cosmeticCategory: "bg" },
    { id: "divider", label: "Tidvatten", icon: "badge", row: 2, col: 1, connectsFrom: ["avatar"], requiredLevel: 5, cosmeticKey: "sectionDivider:tide", cosmeticCategory: "divider" },
    { id: "header", label: "Korallrev", icon: "crown", row: 2, col: 2, connectsFrom: ["xp"], requiredLevel: 6, cosmeticKey: "headerFrame:coral", cosmeticCategory: "header" },
    { id: "color", label: "Iskristall", icon: "gift", row: 3, col: 0, connectsFrom: ["bg2", "divider"], requiredLevel: 8, cosmeticKey: "colorMode:ice", cosmeticCategory: "color" },
    { id: "title", label: "Sea Walker", icon: "crown", row: 3, col: 2, connectsFrom: ["divider", "header"], requiredLevel: 10, cosmeticCategory: "prestige" },
  ],
  forest: [
    { id: "root", label: "Välj Skog", icon: "star", row: 0, col: 1, connectsFrom: [], requiredLevel: 1, cosmeticCategory: "root" },
    { id: "bg1", label: "Löv", icon: "heart", row: 1, col: 0, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "backgroundEffect:leaves", cosmeticCategory: "bg" },
    { id: "avatar", label: "Sporer", icon: "heart", row: 1, col: 1, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "avatarEffect:spores", cosmeticCategory: "avatar" },
    { id: "xp", label: "Tillväxt", icon: "flame", row: 1, col: 2, connectsFrom: ["root"], requiredLevel: 3, cosmeticKey: "xpBarSkin:growth", cosmeticCategory: "xp" },
    { id: "bg2", label: "Eldflugor", icon: "star", row: 2, col: 0, connectsFrom: ["bg1"], requiredLevel: 4, cosmeticKey: "backgroundEffect:fireflies", cosmeticCategory: "bg" },
    { id: "divider", label: "Rötter", icon: "badge", row: 2, col: 1, connectsFrom: ["avatar"], requiredLevel: 5, cosmeticKey: "sectionDivider:roots", cosmeticCategory: "divider" },
    { id: "header", label: "Rankor", icon: "crown", row: 2, col: 2, connectsFrom: ["xp"], requiredLevel: 6, cosmeticKey: "headerFrame:vines", cosmeticCategory: "header" },
    { id: "color", label: "Giftig Neon", icon: "gift", row: 3, col: 0, connectsFrom: ["bg2", "divider"], requiredLevel: 8, cosmeticKey: "colorMode:toxic", cosmeticCategory: "color" },
    { id: "title", label: "Forest Walker", icon: "crown", row: 3, col: 2, connectsFrom: ["divider", "header"], requiredLevel: 10, cosmeticCategory: "prestige" },
  ],
  sky: [
    { id: "root", label: "Välj Himmel", icon: "star", row: 0, col: 1, connectsFrom: [], requiredLevel: 1, cosmeticCategory: "root" },
    { id: "bg1", label: "Moln", icon: "heart", row: 1, col: 0, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "backgroundEffect:clouds", cosmeticCategory: "bg" },
    { id: "avatar", label: "Gloria", icon: "heart", row: 1, col: 1, connectsFrom: ["root"], requiredLevel: 2, cosmeticKey: "avatarEffect:halo", cosmeticCategory: "avatar" },
    { id: "xp", label: "Regnbåge", icon: "flame", row: 1, col: 2, connectsFrom: ["root"], requiredLevel: 3, cosmeticKey: "xpBarSkin:rainbow", cosmeticCategory: "xp" },
    { id: "bg2", label: "Gudastrålar", icon: "star", row: 2, col: 0, connectsFrom: ["bg1"], requiredLevel: 4, cosmeticKey: "backgroundEffect:rays", cosmeticCategory: "bg" },
    { id: "divider", label: "Bris", icon: "badge", row: 2, col: 1, connectsFrom: ["avatar"], requiredLevel: 5, cosmeticKey: "sectionDivider:breeze", cosmeticCategory: "divider" },
    { id: "header", label: "Norrsken", icon: "crown", row: 2, col: 2, connectsFrom: ["xp"], requiredLevel: 6, cosmeticKey: "headerFrame:aurora", cosmeticCategory: "header" },
    { id: "color", label: "Solnedgång", icon: "gift", row: 3, col: 0, connectsFrom: ["bg2", "divider"], requiredLevel: 8, cosmeticKey: "colorMode:sunset", cosmeticCategory: "color" },
    { id: "title", label: "Sky Walker", icon: "crown", row: 3, col: 2, connectsFrom: ["divider", "header"], requiredLevel: 10, cosmeticCategory: "prestige" },
  ],
};

// ---------------------------------------------------------------------------
// Resolve tree for a faction + user level → SkillNode[] with status
// ---------------------------------------------------------------------------

export function getSkillTree(factionId: FactionId, userLevel: number): SkillNode[] {
  const key = factionId ?? "forest";
  const defs = TREES[key as NonNullFaction] ?? TREES.forest;

  return defs.map((def) => {
    let status: SkillNodeStatus = "locked";

    if (userLevel >= def.requiredLevel) {
      status = "unlocked";
    } else {
      // "available" = all prerequisites are unlocked AND this is the next tier
      const allPrereqsMet = def.connectsFrom.every((preId) => {
        const pre = defs.find((d) => d.id === preId);
        return pre ? userLevel >= pre.requiredLevel : false;
      });
      if (allPrereqsMet) {
        status = "available";
      }
    }

    return { ...def, status };
  });
}

/** How many nodes are unlocked for a given faction + level */
export function getUnlockedCount(factionId: FactionId, userLevel: number): number {
  return getSkillTree(factionId, userLevel).filter((n) => n.status === "unlocked").length;
}

/** Total nodes per tree (always 9) */
export const NODES_PER_TREE = 9;
