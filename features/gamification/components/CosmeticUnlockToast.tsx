"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

type CosmeticRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type UnlockToastItem = {
  cosmeticKey: string;
  rarity?: CosmeticRarity;
};

type CosmeticUnlockToastProps = {
  items: UnlockToastItem[];
  /** Called when user taps "Show" — parent should open CosmeticControlPanel */
  onShow?: () => void;
  /** Auto-dismiss after this many ms (0 = no auto-dismiss). Default 6000 */
  autoDismissMs?: number;
};

const RARITY_GLOW: Record<CosmeticRarity, string> = {
  common: "shadow-[0_0_12px_rgba(156,163,175,0.4)]",
  uncommon: "shadow-[0_0_16px_rgba(74,222,128,0.5)]",
  rare: "shadow-[0_0_20px_rgba(96,165,250,0.6)]",
  epic: "shadow-[0_0_24px_rgba(168,85,247,0.7)]",
  legendary: "shadow-[0_0_30px_rgba(250,204,21,0.8)]",
};

const RARITY_BORDER: Record<CosmeticRarity, string> = {
  common: "border-gray-400/40",
  uncommon: "border-green-400/50",
  rare: "border-blue-400/60",
  epic: "border-purple-400/70",
  legendary: "border-yellow-400/80",
};

export function CosmeticUnlockToast({
  items,
  onShow,
  autoDismissMs = 6000,
}: CosmeticUnlockToastProps) {
  const t = useTranslations("gamification.unlockToast");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    // Small delay to trigger entrance animation
    const showTimer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(showTimer);
  }, [items.length]);

  useEffect(() => {
    if (!visible || autoDismissMs <= 0) return;
    const timer = setTimeout(() => setDismissed(true), autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible, autoDismissMs]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleShow = useCallback(() => {
    setDismissed(true);
    onShow?.();
  }, [onShow]);

  if (items.length === 0 || dismissed) return null;

  const highestRarity = items.reduce<CosmeticRarity>((best, item) => {
    const order: CosmeticRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
    const itemRarity = item.rarity ?? "common";
    return order.indexOf(itemRarity) > order.indexOf(best) ? itemRarity : best;
  }, "common");

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`rounded-xl border-2 ${RARITY_BORDER[highestRarity]} ${RARITY_GLOW[highestRarity]} bg-gray-900/95 px-5 py-4 backdrop-blur-sm`}
      >
        <p className="mb-1 text-sm font-bold text-white">{t("title")}</p>
        <div className="space-y-1">
          {items.map((item) => (
            <p key={item.cosmeticKey} className="text-sm text-gray-300">
              {t("unlocked", { name: item.cosmeticKey })}
            </p>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {onShow && (
            <button
              onClick={handleShow}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              {t("show")}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-white"
          >
            {t("dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
