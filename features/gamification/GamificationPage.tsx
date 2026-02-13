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
import { AchievementsSection } from "./components/AchievementsSection";
import { CoinsSection } from "./components/CoinsSection";
import { FactionSelector } from "./components/FactionSelector";
import { StreakSection } from "./components/StreakSection";
import { CallToActionSection } from "./components/CallToActionSection";
import { SectionDivider } from "./components/SectionDivider";

type GamificationPageProps = {
  fetcher?: () => Promise<GamificationPayload>;
};

export function GamificationPage({ fetcher = fetchGamificationSnapshot }: GamificationPageProps) {
  const t = useTranslations("gamification");
  const [data, setData] = useState<GamificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Resolve theme – currently always DEFAULT, ready for faction_id
  const theme = identity.factionId
    ? getFactionTheme(identity.factionId)
    : DEFAULT_THEME;

  const xpPercent = getLevelProgress(data.progress.currentXp, data.progress.nextLevelXp);

  return (
    <JourneyScene theme={theme} className="min-h-screen rounded-2xl px-4 pb-32 pt-10 sm:px-6">
      {/* ── Ambient particles ── */}
      <ParticleField accentColor={theme.accentColor} />

      {/* ── Hero: Avatar + Name + Level ── */}
      <div className="mb-8 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative mb-4">
          {/* Glow ring */}
          <div
            className="absolute -inset-1 w-[7.5rem] h-[7.5rem] rounded-full blur-xl opacity-50"
            style={{ backgroundColor: theme.accentColor }}
          />
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

        {/* Display name */}
        <h1 className="mt-2 text-xl font-bold text-white">
          {identity.displayName}
        </h1>
        {data.progress.levelName && (
          <p className="text-sm text-white/50">{data.progress.levelName}</p>
        )}

        {/* ── Faction Selector ── */}
        <div className="mt-4">
          <FactionSelector
            currentFactionId={identity.factionId}
            onSelect={handleFactionSelect}
          />
        </div>
      </div>

      {/* ── XP Progress Bar ── */}
      <div className="mx-auto mb-6 max-w-sm">
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>{data.progress.currentXp.toLocaleString("sv-SE")} XP</span>
          <span>{data.progress.nextLevelXp.toLocaleString("sv-SE")} XP</span>
        </div>
        <div className="relative h-4 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${xpPercent}%`,
              backgroundColor: theme.accentColor,
              boxShadow: `0 0 20px ${theme.glowColor}, 0 0 8px ${theme.accentColor}`,
            }}
          />
          {/* shimmer */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              animation: "xp-shimmer 2.5s infinite",
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1">
          <span>Level {data.progress.level}</span>
          <span>Level {data.progress.level + 1}</span>
        </div>
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
        <AchievementsSection achievements={data.achievements} />
        <SectionDivider variant="glow" label="Nästa steg" />
        <CallToActionSection />
      </div>

      {/* XP shimmer keyframes + reduced-motion guard */}
      <style jsx>{`
        @keyframes xp-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .xp-shimmer, [style*="xp-shimmer"] {
            animation: none !important;
          }
        }
      `}</style>
    </JourneyScene>
  );
}
