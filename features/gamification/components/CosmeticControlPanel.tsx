"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  fetchCosmeticCatalog,
  equipCosmetic,
  unequipCosmetic,
  type CosmeticCatalogResponse,
} from "@/features/journey/api";
import {
  COSMETIC_SLOTS,
  type CosmeticSlot,
  type CosmeticItem,
} from "@/features/journey/cosmetic-types";
import type { FactionTheme } from "@/types/journey";
import { CosmeticCard } from "./CosmeticCard";

// ---------------------------------------------------------------------------
// Inject pulse keyframe once (SSR-safe)
// ---------------------------------------------------------------------------
const PULSE_KEYFRAME_ID = "__cosmetic-pulse-kf";
if (typeof document !== "undefined" && !document.getElementById(PULSE_KEYFRAME_ID)) {
  const style = document.createElement("style");
  style.id = PULSE_KEYFRAME_ID;
  style.textContent = `@keyframes cosmeticPulse{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.15;transform:scale(1.04)}}`;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Tab icons (inline SVG, no deps)
// ---------------------------------------------------------------------------

const TAB_ICONS: Record<CosmeticSlot, string> = {
  avatar_frame: "🖼",
  scene_background: "🌄",
  particles: "✨",
  xp_bar: "📊",
  section_divider: "➖",
  title: "🏷",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CosmeticControlPanelProps = {
  theme: FactionTheme;
  /** Called after a successful equip/unequip so the parent can refresh loadout */
  onLoadoutChange?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CosmeticControlPanel({
  theme,
  onLoadoutChange,
}: CosmeticControlPanelProps) {
  const t = useTranslations("gamification.cosmeticPanel");
  const tCosmetics = useTranslations();

  const [activeTab, setActiveTab] = useState<CosmeticSlot>("avatar_frame");
  const [catalog, setCatalog] = useState<CosmeticItem[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loadout, setLoadout] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  // ── Fetch catalog on mount ──
  useEffect(() => {
    let mounted = true;
    fetchCosmeticCatalog()
      .then((data: CosmeticCatalogResponse) => {
        if (!mounted) return;
        setCatalog(data.catalog);
        setUnlocked(new Set(data.unlocked));
        setLoadout(data.loadout);
        setError(null);
      })
      .catch(() => {
        if (mounted) setError("error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // ── Equip handler with optimistic update ──
  const handleEquip = useCallback(
    async (slot: CosmeticSlot, cosmeticId: string) => {
      const prevLoadout = { ...loadout };
      // Optimistic
      setLoadout((prev) => ({ ...prev, [slot]: cosmeticId }));
      setPendingSlot(slot);

      try {
        await equipCosmetic(slot, cosmeticId);
        onLoadoutChange?.();
      } catch {
        // Rollback
        setLoadout(prevLoadout);
      } finally {
        setPendingSlot(null);
      }
    },
    [loadout, onLoadoutChange],
  );

  // ── Unequip handler with optimistic update ──
  const handleUnequip = useCallback(
    async (slot: CosmeticSlot) => {
      const prevLoadout = { ...loadout };
      // Optimistic
      setLoadout((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      setPendingSlot(slot);

      try {
        await unequipCosmetic(slot);
        onLoadoutChange?.();
      } catch {
        // Rollback
        setLoadout(prevLoadout);
      } finally {
        setPendingSlot(null);
      }
    },
    [loadout, onLoadoutChange],
  );

  // ── Filter items for active tab, sort by sortOrder ──
  const tabItems = catalog
    .filter((item) => item.category === activeTab)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const accent = theme.accentColor;

  // ── Unlock count per tab ──
  const tabUnlockCount = (slot: CosmeticSlot) => {
    const total = catalog.filter((c) => c.category === slot).length;
    const owned = catalog.filter((c) => c.category === slot && unlocked.has(c.id)).length;
    return { owned, total };
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <div
          className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${accent}60`, borderTopColor: "transparent" }}
        />
        <span className="text-xs text-white/40">{t("loading")}</span>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-red-400">{t(error)}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ── Title with unlock progress ── */}
      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-white">
          {t("title")}
        </h2>
        <p className="text-[10px] text-white/35 mt-0.5">
          {(() => {
            const total = catalog.length;
            const owned = catalog.filter((c) => unlocked.has(c.id)).length;
            return `${owned} / ${total} ${t("unlockedCount")}`;
          })()}
        </p>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex justify-center gap-1.5 mb-4 flex-wrap">
        {COSMETIC_SLOTS.map((slot) => {
          const isActive = slot === activeTab;
          const { owned, total } = tabUnlockCount(slot);
          return (
            <button
              key={slot}
              onClick={() => setActiveTab(slot)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60"
              style={{
                backgroundColor: isActive ? `${accent}20` : "rgba(255,255,255,0.05)",
                border: isActive ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.10)",
                color: isActive ? "white" : "rgba(255,255,255,0.6)",
                boxShadow: isActive ? `0 0 12px ${accent}20` : "none",
              }}
            >
              <span className="text-sm">{TAB_ICONS[slot]}</span>
              {t(`tabs.${slot}`)}
              {total > 0 && (
                <span
                  className="text-[9px] ml-0.5 opacity-50"
                >
                  {owned}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Currently equipped indicator ── */}
      {loadout[activeTab] && (
        <div className="text-center mb-3">
          <span className="text-[10px] text-white/40">
            {t("active", {
              name:
                (() => {
                  const item = catalog.find((c) => c.id === loadout[activeTab]);
                  return item ? tCosmetics(item.nameKey) : "—";
                })(),
            })}
          </span>
        </div>
      )}

      {/* ── Cosmetics Grid ── */}
      {tabItems.length === 0 ? (
        <p className="text-center text-xs text-white/30 py-8">
          {t("noItems")}
        </p>
      ) : (
        <>
          {/* ── Progression separator ── */}
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accent}30, transparent)` }} />
            <span className="text-[9px] uppercase tracking-widest text-white/25 font-medium">
              {t(`tabs.${activeTab}`)}
            </span>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accent}30, transparent)` }} />
          </div>

          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            }}
          >
            {tabItems.map((item) => {
              const isItemUnlocked = unlocked.has(item.id);
              const isEquipped = loadout[activeTab] === item.id;

              // Build lock label from sortOrder (which maps to unlock level)
              const itemLockLabel = !isItemUnlocked
                ? `Lv${item.sortOrder + 1}`
                : undefined;

              return (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isUnlocked={isItemUnlocked}
                  isEquipped={isEquipped}
                  onEquip={() => handleEquip(activeTab, item.id)}
                  onUnequip={() => handleUnequip(activeTab)}
                  displayName={tCosmetics(item.nameKey)}
                  rarityLabel={t(`rarity.${item.rarity}`)}
                  lockLabel={itemLockLabel}
                  accentColor={accent}
                />
              );
            })}
          </div>
        </>
      )}

      {/* ── Pending indicator ── */}
      {pendingSlot && (
        <div className="flex justify-center mt-3">
          <div
            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${accent}60`, borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* ── Footer hint ── */}
      <p className="text-center text-[10px] text-white/30 mt-3">
        {t("hint")}
      </p>
    </div>
  );
}
