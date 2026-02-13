"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getAllFactions, DEFAULT_THEME } from "@/lib/factions";
import type { FactionId, FactionTheme } from "@/types/journey";

type FactionSelectorProps = {
  currentFactionId: FactionId;
  onSelect: (factionId: FactionId) => Promise<void>;
};

const factions = getAllFactions();

/**
 * Faction selector – a compact row of faction buttons for the Journey hub.
 * Purely cosmetic: changes theme colors, nothing else.
 * 0 new keyframes (uses transitions only).
 */
export function FactionSelector({ currentFactionId, onSelect }: FactionSelectorProps) {
  const t = useTranslations("gamification.faction");
  const [pending, setPending] = useState<FactionId | "idle">("idle");
  const [isPending, startTransition] = useTransition();

  const options: Array<FactionTheme & { selected: boolean }> = [
    { ...DEFAULT_THEME, selected: currentFactionId === null },
    ...factions.map((f) => ({ ...f, selected: currentFactionId === f.id })),
  ];

  async function handleSelect(factionId: FactionId) {
    if (factionId === currentFactionId) return;
    setPending(factionId);
    try {
      await onSelect(factionId);
    } finally {
      startTransition(() => {
        setPending("idle");
      });
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
        {t("label")}
      </p>
      <div className="flex gap-2" role="radiogroup" aria-label={t("chooseFaction")}>
        {options.map((opt) => {
          const isLoading = pending === opt.id && isPending;
          return (
            <button
              key={opt.id ?? "neutral"}
              role="radio"
              aria-checked={opt.selected}
              aria-label={opt.name}
              disabled={isLoading}
              onClick={() => handleSelect(opt.id)}
              className="group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-50"
              style={{
                backgroundColor: opt.selected ? `${opt.accentColor}20` : "transparent",
                borderColor: opt.selected ? opt.accentColor : "transparent",
                borderWidth: "2px",
                borderStyle: "solid",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ["--tw-ring-color" as any]: opt.accentColor,
              }}
            >
              {/* Color swatch */}
              <span
                className="block w-8 h-8 rounded-full border-2 border-white/20 transition-transform duration-200 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${opt.gradientFrom}, ${opt.accentColor})`,
                  boxShadow: opt.selected
                    ? `0 0 12px ${opt.glowColor ?? opt.accentColor}`
                    : "none",
                }}
              />
              {/* Label */}
              <span
                className="text-[10px] font-semibold transition-colors duration-200"
                style={{ color: opt.selected ? opt.accentColor : "rgba(255,255,255,0.5)" }}
              >
                {opt.name}
              </span>

              {/* Selected indicator dot */}
              {opt.selected && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[#1a1a2e]"
                  style={{ backgroundColor: opt.accentColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
