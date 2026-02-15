"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/error-state";
import { JourneyScene } from "@/components/journey/JourneyScene";
import { JourneyStats } from "@/components/journey/JourneyStats";
import { ParticleField } from "@/components/journey/ParticleField";
import { DEFAULT_THEME, getFactionTheme, getLevelProgress } from "@/lib/factions";
import { fetchGamificationSnapshot, saveFaction, type GamificationPayload } from "./api";
import { BadgeShowcase } from "./components/BadgeShowcase";
import { CoinsSection } from "./components/CoinsSection";
import { FactionSelector } from "./components/FactionSelector";
import { StreakSection } from "./components/StreakSection";
import { CallToActionSection } from "./components/CallToActionSection";
import { SectionDivider } from "./components/SectionDivider";
import { SkillTreeSection } from "./components/SkillTreeSection";
import { XPProgressBar, resolveXPBarSkin, resolveXPBarColorMode } from "./components/XPProgressBar";
import { AvatarFrame, resolveAvatarFrame } from "./components/AvatarFrame";
import { getSkillTree } from "./data/skill-trees";

type GamificationPageProps = {
  fetcher?: () => Promise<GamificationPayload>;
};

export function GamificationPage({ fetcher = fetchGamificationSnapshot }: GamificationPageProps) {
  const t = useTranslations("gamification");
  const [data, setData] = useState<GamificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const result = await fetcher();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch {
        if (isMounted) setError("Kunde inte ladda gamification just nu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [fetcher]);

  // AbortController ref to cancel stale faction requests on rapid clicks
  const factionAbortRef = useRef<AbortController | null>(null);

  const handleFactionSelect = useCallback(
    async (factionId: Parameters<typeof saveFaction>[0]) => {
      // Abort any in-flight request
      factionAbortRef.current?.abort();
      const controller = new AbortController();
      factionAbortRef.current = controller;

      // Capture previous value for rollback
      const prevFaction = data?.identity?.factionId ?? null;

      // Optimistic update
      setData((prev) =>
        prev
          ? { ...prev, identity: { ...prev.identity!, factionId } }
          : prev,
      );

      try {
        await saveFaction(factionId, controller.signal);
      } catch (err) {
        // Ignore aborted requests (user clicked another faction)
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Rollback on real failure
        setData((prev) =>
          prev
            ? { ...prev, identity: { ...prev.identity!, factionId: prevFaction } }
            : prev,
        );
      }
    },
    [data?.identity?.factionId],
  );

  if (error) {
    return (
      <ErrorState
        title={t("errorTitle")}
        description={error}
        onRetry={() => {
          setIsLoading(true);
          setError(null);
          setData(null);
          fetcher()
            .then((result) => {
              setData(result);
              setError(null);
            })
            .catch(() => setError("Kunde inte ladda gamification just nu."))
            .finally(() => setIsLoading(false));
        }}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen rounded-2xl bg-gradient-to-b from-[#1a1a2e] to-[#16162a] px-4 pb-32 pt-8 sm:px-6 space-y-6">
        {/* Avatar skeleton */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="h-5 w-32 rounded bg-white/10" />
          <div className="h-3 w-20 rounded bg-white/8" />
        </div>
        {/* XP bar skeleton */}
        <div className="mx-auto max-w-sm">
          <div className="h-3 w-full rounded-full bg-white/10" />
        </div>
        {/* Stats pills skeleton */}
        <div className="flex justify-center gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 rounded-full bg-white/10" />
          ))}
        </div>
        {/* Nav grid skeleton */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
        {/* Content sections skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  // Runtime fallback – identity is optional in the type for backwards compat
  const identity = data.identity ?? {
    displayName: "Player",
    avatarUrl: null,
    factionId: null,
  };

  // Resolve theme from persisted faction
  const theme = identity.factionId
    ? getFactionTheme(identity.factionId)
    : DEFAULT_THEME;

  const xpPercent = getLevelProgress(data.progress.currentXp, data.progress.nextLevelXp);

  // Resolve cosmetics from skill tree
  const skillTree = getSkillTree(identity.factionId, data.progress.level);
  const xpNode = skillTree.find(
    (n) => n.cosmeticCategory === "xp" && n.status === "unlocked",
  );
  const xpSkin = resolveXPBarSkin(xpNode?.cosmeticKey);
  const xpColorMode = resolveXPBarColorMode(xpNode?.cosmeticKey);

  const headerNode = skillTree.find(
    (n) => n.cosmeticCategory === "header" && n.status === "unlocked",
  );
  const avatarFrameStyle = resolveAvatarFrame(headerNode?.cosmeticKey);

  return (
    <JourneyScene theme={theme} className="min-h-screen rounded-2xl px-4 pb-32 pt-10 sm:px-6">
      {/* ── Ambient particles ── */}
      <ParticleField accentColor={theme.accentColor} />

      {/* ── Hero: Avatar + Name + Skill Tree ── */}
      <div
        className="relative mb-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
        style={{
          boxShadow: isSkillTreeOpen
            ? `0 0 40px ${theme.glowColor}50`
            : `0 0 16px ${theme.glowColor}15`,
          transition: "box-shadow 500ms ease",
        }}
      >
        {/* Avatar hint-pulse keyframe (replaces skill-node-pulse — same slot 13/15) */}
        <style>{`
          @keyframes avatar-tap-hint {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
          @media (prefers-reduced-motion: reduce) {
            [style*="avatar-tap-hint"] { animation: none !important; }
          }
        `}</style>

        <div
          className="relative z-10 flex flex-col items-center text-center"
          style={{
            padding: isSkillTreeOpen ? "16px 24px 12px" : "40px 24px",
            transition: "padding 400ms ease",
          }}
        >
          {/* Close button — top-right, only when tree is open */}
          <button
            onClick={() => setIsSkillTreeOpen(false)}
            aria-label="Close"
            tabIndex={isSkillTreeOpen ? 0 : -1}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{
              opacity: isSkillTreeOpen ? 1 : 0,
              pointerEvents: isSkillTreeOpen ? "auto" : "none",
              transition: "opacity 300ms ease",
            }}
          >
            ✕
          </button>

          {/* Avatar — clickable, shrinks when tree is open */}
          <div
            onClick={() => setIsSkillTreeOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsSkillTreeOpen((v) => !v);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t("skillTree.avatarHint")}
            aria-expanded={isSkillTreeOpen}
            className="relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60"
            style={{
              transform: isSkillTreeOpen ? "scale(0.55)" : "scale(1)",
              transformOrigin: "top center",
              marginBottom: isSkillTreeOpen ? 0 : 16,
              transition: "transform 400ms ease, margin-bottom 400ms ease",
            }}
          >
            {/* Glow ring — breathes when closed to hint interactivity */}
            <div
              className="absolute -inset-1 w-[7.5rem] h-[7.5rem] rounded-full blur-xl opacity-50"
              style={{
                backgroundColor: theme.accentColor,
                ...(isSkillTreeOpen
                  ? {}
                  : { animation: "avatar-tap-hint 3s ease-in-out infinite" }),
              }}
            />
            {/* Cosmetic frame overlay */}
            <AvatarFrame style={avatarFrameStyle} accentColor={theme.accentColor} />
            <div
              className="relative w-28 h-28 rounded-full border-4 overflow-hidden bg-gradient-to-br from-white/10 to-white/5"
              style={{ borderColor: theme.accentColor }}
            >
              {identity.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={identity.avatarUrl}
                  alt={identity.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60">
                  <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Level badge */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-bold text-white text-sm shadow-lg"
              style={{
                backgroundColor: theme.accentColor,
                boxShadow: `0 4px 14px ${theme.glowColor}`,
              }}
            >
              Lvl {data.progress.level}
            </div>
          </div>

          {/* Name + faction banner — collapses when tree is open */}
          <div
            style={{
              opacity: isSkillTreeOpen ? 0 : 1,
              maxHeight: isSkillTreeOpen ? 0 : 200,
              overflow: "hidden",
              pointerEvents: isSkillTreeOpen ? "none" : "auto",
              transition: "opacity 250ms ease, max-height 400ms ease",
            }}
          >
            <h1 className="mt-2 text-xl font-bold text-white">
              {identity.displayName}
            </h1>
            {data.progress.levelName && (
              <p className="text-sm text-white/50">{data.progress.levelName}</p>
            )}
            {identity.factionId && (
              <div
                className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 border transition-all duration-300"
                style={{
                  backgroundColor: `${theme.accentColor}10`,
                  borderColor: `${theme.accentColor}30`,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: theme.accentColor, boxShadow: `0 0 8px ${theme.glowColor}` }}
                />
                <span className="text-xs font-medium text-white/70">
                  {t(`faction.banner.${identity.factionId}`)}
                </span>
              </div>
            )}
          </div>

          {/* Faction selector — always visible, shifts up when name collapses */}
          <div style={{ marginTop: isSkillTreeOpen ? 4 : 16, transition: "margin-top 400ms ease" }}>
            <FactionSelector
              currentFactionId={identity.factionId}
              onSelect={handleFactionSelect}
            />
          </div>

          {/* Skill tree inline — slides up when tree is open */}
          <div
            style={{
              opacity: isSkillTreeOpen ? 1 : 0,
              maxHeight: isSkillTreeOpen ? 2000 : 0,
              overflow: isSkillTreeOpen ? "visible" : "hidden",
              transform: isSkillTreeOpen ? "translateY(0)" : "translateY(15px)",
              pointerEvents: isSkillTreeOpen ? "auto" : "none",
              transition: isSkillTreeOpen
                ? "opacity 400ms ease 200ms, max-height 500ms ease, transform 400ms ease 200ms"
                : "opacity 200ms ease, max-height 400ms ease 100ms, transform 200ms ease",
              width: "100%",
              marginTop: isSkillTreeOpen ? 8 : 0,
            }}
          >
            {isSkillTreeOpen && (
              <SkillTreeSection
                factionId={identity.factionId}
                userLevel={data.progress.level}
                theme={theme}
              />
            )}
          </div>

          {/* Avatar tap hint — only visible when closed */}
          <div
            style={{
              opacity: isSkillTreeOpen ? 0 : 1,
              maxHeight: isSkillTreeOpen ? 0 : 30,
              overflow: "hidden",
              transition: "opacity 200ms ease, max-height 300ms ease",
            }}
          >
            <p className="text-[10px] text-white/30 mt-2 select-none">
              {t("skillTree.avatarHint")}
            </p>
          </div>
        </div>
      </div>

      {/* ── XP Progress Bar ── */}
      <div className="mb-6">
        <XPProgressBar
          percent={xpPercent}
          currentXp={data.progress.currentXp}
          nextLevelXp={data.progress.nextLevelXp}
          level={data.progress.level}
          accentColor={theme.accentColor}
          glowColor={theme.glowColor}
          skin={xpSkin}
          colorMode={xpColorMode}
        />
      </div>

      {/* ── Stat Pills (Coins · Badges · Streak) ── */}
      <div className="mb-8">
        <JourneyStats
          coins={data.coins.balance}
          badges={data.progress.completedAchievements}
          streak={data.streak.currentStreakDays}
          theme={theme}
        />
      </div>

      {/* ── Quick Nav Grid ── */}
      <div className="mb-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { href: "/app/learning", icon: "/icons/journey/kurs_webp.webp", label: t("nav.courses"), desc: t("nav.coursesDesc") },
          { href: "/app/gamification/achievements", icon: "/icons/journey/utmarkelser_v2_webp.webp", label: t("nav.achievements"), desc: t("nav.achievementsDesc") },
          { href: "/app/gamification/coins", icon: "/icons/journey/dicecoin_webp.webp", label: t("nav.dicecoin"), desc: t("nav.dicecoinDesc") },
          { href: "/app/shop", icon: "/icons/journey/butik_webp.webp", label: t("nav.shop"), desc: t("nav.shopDesc") },
          { href: "/app/gamification/events", icon: "/icons/journey/streak_webp.webp", label: t("nav.eventlog"), desc: t("nav.eventlogDesc") },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-[var(--journey-accent)]/30 hover:shadow-[0_0_12px_var(--journey-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <Image src={item.icon} alt="" width={28} height={28} className="shrink-0" />
            <div>
              {item.label}
              <p className="mt-0.5 text-xs font-normal text-white/50">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Content Sections (glassmorphism cards) ── */}
      <div className="space-y-8">
        <CoinsSection summary={data.coins} />
        <SectionDivider variant="glow" />
        <StreakSection streak={data.streak} />
        <SectionDivider variant="ornament" />
        <BadgeShowcase showcase={data.showcase!} achievements={data.achievements} />
        <SectionDivider variant="glow" label={t("nextStepLabel")} />
        <CallToActionSection />
      </div>

      {/* XP shimmer keyframe + reduced-motion guard */}
      <style jsx>{`
        @keyframes xp-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="xp-shimmer"],
          [style*="xp-energy-flow"] {
            animation: none !important;
          }
        }
      `}</style>
    </JourneyScene>
  );
}
