"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FactionTheme } from "@/types/journey";
import type { SkillNode, CosmeticCategory } from "../data/skill-trees";
import { getSkillTree, getUnlockedCount, NODES_PER_TREE } from "../data/skill-trees";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELL_W = 80;
const CELL_H = 68;
const GAP_X = 8;
const GAP_Y = 20;

function cx(col: number) {
  return col * (CELL_W + GAP_X) + CELL_W / 2;
}
function cy(row: number) {
  return row * (CELL_H + GAP_Y) + CELL_H / 2;
}

// ---------------------------------------------------------------------------
// Cosmetic category → readable label + emoji
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<CosmeticCategory, { emoji: string; sv: string; en: string }> = {
  root: { emoji: "⭐", sv: "Startpunkt", en: "Starting point" },
  bg: { emoji: "🌌", sv: "Bakgrundseffekt", en: "Background effect" },
  avatar: { emoji: "👤", sv: "Avatar-effekt", en: "Avatar effect" },
  xp: { emoji: "⚡", sv: "XP-bar skin", en: "XP bar skin" },
  divider: { emoji: "✨", sv: "Sektionsavdelare", en: "Section divider" },
  header: { emoji: "🖼️", sv: "Profilram", en: "Profile frame" },
  color: { emoji: "🎨", sv: "Färgläge", en: "Color mode" },
  prestige: { emoji: "👑", sv: "Prestigetitel", en: "Prestige title" },
};

// ---------------------------------------------------------------------------
// SVG connection lines with animated flowing dots
// ---------------------------------------------------------------------------

function Connections({
  tree,
  accent,
}: {
  tree: SkillNode[];
  accent: string;
}) {
  const maxCol = Math.max(...tree.map((n) => n.col));
  const maxRow = Math.max(...tree.map((n) => n.row));
  const w = (maxCol + 1) * CELL_W + maxCol * GAP_X;
  const h = (maxRow + 1) * CELL_H + maxRow * GAP_Y;

  return (
    <svg
      className="absolute pointer-events-none"
      width={w}
      height={h}
      style={{ zIndex: 1, left: 12, top: 8 }}
      aria-hidden
    >
      {tree.flatMap((node) =>
        node.connectsFrom.map((fromId) => {
          const from = tree.find((n) => n.id === fromId);
          if (!from) return null;

          const x1 = cx(from.col);
          const y1 = cy(from.row) + CELL_H / 2 - 4;
          const x2 = cx(node.col);
          const y2 = cy(node.row) - CELL_H / 2 + 4;
          const midY = (y1 + y2) / 2;
          const active = from.status === "unlocked";
          const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

          return (
            <g key={`${fromId}-${node.id}`}>
              {/* Glow layer */}
              {active && (
                <path
                  d={d}
                  fill="none"
                  stroke={accent}
                  strokeWidth={4}
                  opacity={0.15}
                  style={{ filter: "blur(4px)" }}
                />
              )}
              {/* Main line */}
              <path
                d={d}
                fill="none"
                stroke={active ? accent : "rgba(255,255,255,0.12)"}
                strokeWidth={active ? 2 : 1}
                strokeDasharray={active ? "none" : "4 4"}
                opacity={active ? 0.7 : 0.4}
              />
            </g>
          );
        }),
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Node icon SVGs (inline, no dependencies)
// ---------------------------------------------------------------------------

function NodeIcon({ icon }: { icon: SkillNode["icon"] }) {
  const cls = "w-5 h-5";
  switch (icon) {
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case "crown":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
        </svg>
      );
    case "flame":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case "badge":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      );
    case "gift":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Node detail popover
// ---------------------------------------------------------------------------

function NodePopover({
  node,
  accent,
  onClose,
  t,
}: {
  node: SkillNode;
  accent: string;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const meta = CATEGORY_META[node.cosmeticCategory];

  // Close on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-xl border bg-[#1a1a2e]/95 backdrop-blur-md shadow-xl p-3 min-w-[160px] max-w-[200px]"
      style={{
        border: `1px solid ${accent}40`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 12px ${accent}15`,
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {/* Arrow */}
      <div
        className="absolute w-2 h-2 rotate-45"
        style={{
          bottom: -4,
          left: "calc(50% - 4px)",
          backgroundColor: "#1a1a2e",
          borderRight: `1px solid ${accent}40`,
          borderBottom: `1px solid ${accent}40`,
        }}
      />

      {/* Category badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{meta.emoji}</span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: accent }}
        >
          {meta.sv}
        </span>
      </div>

      {/* Node name */}
      <p className="text-sm font-bold text-white mb-1">{node.label}</p>

      {/* Status */}
      {node.status === "unlocked" ? (
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="text-[10px] text-white/60">{t("nodeUnlocked")}</span>
        </div>
      ) : node.status === "available" ? (
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full border"
            style={{ borderColor: accent }}
          />
          <span className="text-[10px] text-white/60">
            {t("availableAt", { level: node.requiredLevel })}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <LockIcon />
          <span className="text-[10px] text-white/40">
            {t("unlockAt", { level: node.requiredLevel })}
          </span>
        </div>
      )}

      {/* Cosmetic key preview */}
      {node.cosmeticKey && (
        <p className="text-[9px] text-white/25 mt-1.5 font-mono truncate">
          {node.cosmeticKey}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkillTreeSection — the public component for the hub
// ---------------------------------------------------------------------------

type SkillTreeSectionProps = {
  factionId: Parameters<typeof getSkillTree>[0];
  userLevel: number;
  theme: FactionTheme;
};

/**
 * Skill tree interactive section for the gamification hub.
 * Shows the 9-node tree for the active faction with:
 * - Animated flowing dots on unlocked connections (SVG animateMotion, 0 keyframe cost)
 * - Click-to-inspect node popover with cosmetic details
 * - Hover scale on interactive nodes
 */
export function SkillTreeSection({ factionId, userLevel, theme }: SkillTreeSectionProps) {
  const t = useTranslations("gamification.skillTree");
  const tree = getSkillTree(factionId, userLevel);
  const unlocked = getUnlockedCount(factionId, userLevel);
  const accent = theme.accentColor;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleNodeClick = (node: SkillNode) => {
    if (node.status === "locked") return;
    setSelectedNode((prev) => (prev === node.id ? null : node.id));
  };

  // Reset selection when faction/level changes (React-recommended pattern)
  const [prevFactionId, setPrevFactionId] = useState(factionId);
  const [prevLevel, setPrevLevel] = useState(userLevel);
  if (prevFactionId !== factionId || prevLevel !== userLevel) {
    setPrevFactionId(factionId);
    setPrevLevel(userLevel);
    setSelectedNode(null);
  }

  const maxCol = Math.max(...tree.map((n) => n.col));
  const maxRow = Math.max(...tree.map((n) => n.row));
  const gridWidth = (maxCol + 1) * CELL_W + maxCol * GAP_X + 24;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-base font-bold text-white">{t("title")}</h2>
        <p className="text-xs text-white/40 mt-0.5">
          {t("unlockedCount", { unlocked, total: NODES_PER_TREE })}
        </p>
      </div>

      {/* Tree grid */}
      <div className="flex justify-center">
        <div
          className="relative px-3 py-2"
          style={{ width: gridWidth }}
        >
          <Connections tree={tree} accent={accent} />

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${maxCol + 1}, ${CELL_W}px)`,
              gap: `${GAP_Y}px ${GAP_X}px`,
              zIndex: 10,
            }}
          >
            {Array.from({ length: maxRow + 1 }).flatMap((_, r) =>
              Array.from({ length: maxCol + 1 }).map((_, c) => {
                const node = tree.find((n) => n.row === r && n.col === c);
                if (!node) {
                  return <div key={`e-${r}-${c}`} style={{ width: CELL_W, height: CELL_H }} />;
                }

                const isUnlocked = node.status === "unlocked";
                const isAvailable = node.status === "available";
                const isLocked = node.status === "locked";
                const isPrestige = node.cosmeticCategory === "prestige";
                const isSelected = selectedNode === node.id;
                const isInteractive = !isLocked;

                return (
                  <div
                    key={node.id}
                    className={[
                      "relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200",
                      isInteractive && "cursor-pointer",
                      isInteractive && !isSelected && "hover:scale-105",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      width: CELL_W,
                      height: CELL_H,
                      backgroundColor: isSelected
                        ? `${accent}25`
                        : isUnlocked
                          ? `${accent}15`
                          : isAvailable
                            ? "rgba(255,255,255,0.12)"
                            : "rgba(255,255,255,0.03)",
                      border: isSelected
                        ? `2px solid ${accent}`
                        : isUnlocked
                          ? `1.5px solid ${accent}50`
                          : isAvailable
                            ? "1.5px solid rgba(255,255,255,0.35)"
                            : "1px solid rgba(255,255,255,0.08)",
                      opacity: isLocked ? 0.35 : 1,
                      boxShadow: isSelected
                        ? `0 0 16px ${accent}30`
                        : isPrestige && isUnlocked
                          ? `0 0 16px ${accent}25`
                          : "none",
                    }}
                    onClick={() => handleNodeClick(node)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNodeClick(node);
                      }
                    }}
                    role={isInteractive ? "button" : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    aria-label={`${node.label} — ${
                      isUnlocked
                        ? t("nodeUnlocked")
                        : isAvailable
                          ? t("availableAt", { level: node.requiredLevel })
                          : t("unlockAt", { level: node.requiredLevel })
                    }`}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        color: isUnlocked
                          ? accent
                          : isAvailable
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {isLocked ? <LockIcon /> : <NodeIcon icon={node.icon} />}
                    </div>

                    {/* Label */}
                    <span
                      className="text-[9px] font-medium text-center leading-tight px-1"
                      style={{
                        color: isUnlocked
                          ? "rgba(255,255,255,0.85)"
                          : isAvailable
                            ? "rgba(255,255,255,0.8)"
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {node.label}
                    </span>

                    {/* Level requirement badge for available nodes */}
                    {isAvailable && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[7px] font-bold flex items-center justify-center"
                        style={{
                          backgroundColor: accent,
                          color: "white",
                          boxShadow: `0 0 6px ${accent}60`,
                        }}
                      >
                        {node.requiredLevel}
                      </span>
                    )}

                    {/* Unlocked check for completed nodes */}
                    {isUnlocked && node.cosmeticCategory !== "root" && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                        style={{
                          backgroundColor: accent,
                          color: "white",
                        }}
                      >
                        ✓
                      </span>
                    )}

                    {/* Click popover */}
                    {isSelected && (
                      <NodePopover
                        node={node}
                        accent={accent}
                        onClose={() => setSelectedNode(null)}
                        t={t}
                      />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-[10px] text-white/30 mt-3">
        {t("hintClick")}
      </p>
    </div>
  );
}
