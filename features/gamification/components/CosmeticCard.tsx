"use client";

import type { CosmeticItem, CosmeticRarity } from "@/features/journey/cosmetic-types";

// ---------------------------------------------------------------------------
// Rarity border colours
// ---------------------------------------------------------------------------

const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: "rgba(255,255,255,0.20)",
  uncommon: "#10b981",
  rare: "#0ea5e9",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const RARITY_GLOW: Record<CosmeticRarity, string> = {
  common: "none",
  uncommon: "0 0 8px rgba(16,185,129,0.25)",
  rare: "0 0 8px rgba(14,165,233,0.25)",
  epic: "0 0 12px rgba(168,85,247,0.35)",
  legendary: "0 0 16px rgba(245,158,11,0.40)",
};

// Faction emoji for compact badge
const FACTION_EMOJI: Record<string, string> = {
  forest: "🌿",
  sea: "🌊",
  desert: "☀️",
  void: "🌌",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CosmeticCardProps = {
  item: CosmeticItem;
  isUnlocked: boolean;
  isEquipped: boolean;
  onEquip: () => void;
  onUnequip: () => void;
  /** Translated name from nameKey */
  displayName: string;
  /** Translated rarity label */
  rarityLabel: string;
  /** Translated lock reason (e.g. "Nivå 6") */
  lockLabel?: string;
  accentColor: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CosmeticCard({
  item,
  isUnlocked,
  isEquipped,
  onEquip,
  onUnequip,
  displayName,
  rarityLabel,
  lockLabel,
  accentColor,
}: CosmeticCardProps) {
  const borderColor = isEquipped
    ? accentColor
    : RARITY_COLORS[item.rarity];
  const glow = isEquipped
    ? `0 0 16px ${accentColor}50, 0 0 30px ${accentColor}20`
    : RARITY_GLOW[item.rarity];

  return (
    <div
      className={[
        "relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all duration-200",
        isUnlocked && !isEquipped && "hover:scale-105",
        isEquipped && "hover:scale-[1.03]",
      ].filter(Boolean).join(" ")}
      style={{
        minHeight: 100,
        backgroundColor: isEquipped
          ? `${accentColor}20`
          : isUnlocked
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.02)",
        border: isEquipped
          ? `2px solid ${accentColor}`
          : `1.5px solid ${borderColor}`,
        boxShadow: glow,
        opacity: isUnlocked ? 1 : 0.35,
        cursor: isUnlocked ? "pointer" : "default",
      }}
      onClick={() => {
        if (!isUnlocked) return;
        if (isEquipped) onUnequip();
        else onEquip();
      }}
      onKeyDown={(e) => {
        if (!isUnlocked) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isEquipped) onUnequip();
          else onEquip();
        }
      }}
      role={isUnlocked ? "button" : undefined}
      tabIndex={isUnlocked ? 0 : undefined}
      aria-label={`${displayName} — ${isEquipped ? "equipped" : isUnlocked ? "available" : "locked"}`}
    >
      {/* Faction badge */}
      {item.factionId && (
        <span
          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-[#1a1a2e] border border-white/10"
          title={item.factionId}
        >
          {FACTION_EMOJI[item.factionId] ?? "•"}
        </span>
      )}

      {/* Equipped check */}
      {isEquipped && (
        <span
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 6px ${accentColor}60`,
          }}
        >
          ✓
        </span>
      )}

      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center bg-black/50 z-10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/50 mb-0.5">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          {lockLabel && (
            <span className="text-[9px] text-white/50 font-medium">{lockLabel}</span>
          )}
        </div>
      )}

      {/* Item name */}
      <span className="text-xs font-semibold text-white text-center leading-tight line-clamp-2">
        {displayName}
      </span>

      {/* Rarity label */}
      <span
        className="text-[9px] font-medium"
        style={{ color: RARITY_COLORS[item.rarity] }}
      >
        {rarityLabel}
      </span>
    </div>
  );
}
