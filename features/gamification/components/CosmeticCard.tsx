"use client";

import type { CosmeticItem, CosmeticRarity, CosmeticSlot } from "@/features/journey/cosmetic-types";

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
  rare: "0 0 10px rgba(14,165,233,0.30)",
  epic: "0 0 14px rgba(168,85,247,0.40)",
  legendary: "0 0 18px rgba(245,158,11,0.45)",
};

// Faction emoji for compact badge
const FACTION_EMOJI: Record<string, string> = {
  forest: "🌿",
  sea: "🌊",
  desert: "☀️",
  void: "🌌",
};

// ---------------------------------------------------------------------------
// Slot SVG icons — gives each card a visual identity like skill tree nodes
// ---------------------------------------------------------------------------

function SlotIcon({ slot, color, size = 28 }: { slot: CosmeticSlot; color: string; size?: number }) {
  const s = size;
  const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (slot) {
    case "avatar_frame":
      return <svg {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><line x1="12" y1="3" x2="12" y2="1" /><line x1="12" y1="23" x2="12" y2="21" /><line x1="3" y1="12" x2="1" y2="12" /><line x1="23" y1="12" x2="21" y2="12" /></svg>;
    case "scene_background":
      return <svg {...props}><path d="M2 20 L8 12 L12 16 L17 9 L22 20 Z" fill={`${color}20`} /><circle cx="17" cy="6" r="2.5" fill={`${color}30`} /></svg>;
    case "particles":
      return <svg {...props}><circle cx="12" cy="6" r="1.5" fill={color} /><circle cx="6" cy="14" r="1" fill={color} opacity="0.7" /><circle cx="18" cy="12" r="1.2" fill={color} opacity="0.8" /><circle cx="10" cy="18" r="0.8" fill={color} opacity="0.5" /><circle cx="16" cy="17" r="1" fill={color} opacity="0.6" /><path d="M8 8 L10 6 M14 14 L16 12 M12 10 L14 8" opacity="0.4" /></svg>;
    case "xp_bar":
      return <svg {...props}><rect x="2" y="9" width="20" height="6" rx="3" stroke={color} fill={`${color}15`} /><rect x="3" y="10" width="12" height="4" rx="2" fill={`${color}50`} /></svg>;
    case "section_divider":
      return <svg {...props}><line x1="2" y1="12" x2="9" y2="12" /><polygon points="12,8 16,12 12,16" fill={`${color}40`} /><line x1="16" y1="12" x2="22" y2="12" /></svg>;
  }
}

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
  const rarityColor = RARITY_COLORS[item.rarity];
  const borderColor = isEquipped
    ? accentColor
    : isUnlocked
      ? `${rarityColor}`
      : "rgba(255,255,255,0.08)";
  const glow = isEquipped
    ? `0 0 18px ${accentColor}50, 0 0 36px ${accentColor}18`
    : isUnlocked
      ? RARITY_GLOW[item.rarity]
      : "none";

  const iconColor = isEquipped
    ? accentColor
    : isUnlocked
      ? "rgba(255,255,255,0.8)"
      : "rgba(255,255,255,0.25)";

  return (
    <div
      className={[
        "group relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200",
        isUnlocked && !isEquipped && "hover:scale-105 hover:brightness-110",
        isEquipped && "hover:scale-[1.03]",
      ].filter(Boolean).join(" ")}
      style={{
        minHeight: 110,
        padding: "14px 8px 10px",
        backgroundColor: isEquipped
          ? `${accentColor}18`
          : isUnlocked
            ? "rgba(255,255,255,0.07)"
            : "rgba(255,255,255,0.02)",
        border: isEquipped
          ? `2px solid ${accentColor}`
          : isUnlocked
            ? `1.5px solid ${borderColor}`
            : `1px solid ${borderColor}`,
        boxShadow: glow,
        opacity: isUnlocked ? 1 : 0.35,
        cursor: isUnlocked ? "pointer" : "default",
        backdropFilter: isUnlocked ? "blur(8px)" : undefined,
        WebkitBackdropFilter: isUnlocked ? "blur(8px)" : undefined,
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
      {/* ── Equipped pulse ring (CSS animation) ── */}
      {isEquipped && (
        <span
          className="absolute inset-0 rounded-xl animate-[cosmeticPulse_2.5s_ease-in-out_infinite] pointer-events-none"
          style={{ border: `1.5px solid ${accentColor}40` }}
        />
      )}

      {/* ── Faction badge ── */}
      {item.factionId && (
        <span
          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-[#1a1a2e] border border-white/10 z-20"
          title={item.factionId}
        >
          {FACTION_EMOJI[item.factionId] ?? "•"}
        </span>
      )}

      {/* ── Corner badge: ✓ for equipped/unlocked, level for locked ── */}
      {isEquipped ? (
        <span
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-20"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 8px ${accentColor}60`,
          }}
        >
          ✓
        </span>
      ) : isUnlocked ? (
        <span
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white/70 z-20"
          style={{
            backgroundColor: `${rarityColor}40`,
            border: `1px solid ${rarityColor}60`,
          }}
        >
          ✓
        </span>
      ) : lockLabel ? (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[8px] font-bold text-white/80 z-20"
          style={{
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.20)",
          }}
        >
          {lockLabel}
        </span>
      ) : null}

      {/* ── Lock overlay ── */}
      {!isUnlocked && (
        <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center bg-black/40 z-10">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/40">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
      )}

      {/* ── Slot icon (central visual identity) ── */}
      <SlotIcon slot={item.category} color={iconColor} size={26} />

      {/* ── Item name ── */}
      <span className="text-[11px] font-semibold text-white text-center leading-tight line-clamp-2 mt-0.5">
        {displayName}
      </span>

      {/* ── Rarity label ── */}
      <span
        className="text-[9px] font-medium tracking-wide uppercase"
        style={{ color: rarityColor }}
      >
        {rarityLabel}
      </span>
    </div>
  );
}
