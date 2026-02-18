import Image from "next/image";
import type { JSX } from "react";

export type AppNavItem = {
  href: string;
  labelKey: string;
  icon: JSX.Element;
  iconActive: JSX.Element;
  isHero?: boolean; // For the central "Play" button
};

function navPngIcon({ src, alt, size, className }: { src: string; alt: string; size: number; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className || "block"}
    />
  );
}

// Larger icons for better visibility (32px standard, 36px for hero)
const iconBrowse = navPngIcon({ src: "/icons/app-nav/browse_v2.webp", alt: "Upptäck", size: 32 });
const iconBrowseActive = navPngIcon({ src: "/icons/app-nav/browse_v2.webp", alt: "Upptäck", size: 32, className: "block drop-shadow-lg" });

const iconLekvaluta = navPngIcon({ src: "/icons/app-nav/dicecoin_v2.webp", alt: "DiceCoin", size: 32 });
const iconLekvalutaActive = navPngIcon({ src: "/icons/app-nav/dicecoin_v2.webp", alt: "DiceCoin", size: 32, className: "block drop-shadow-lg" });

const iconPlanning = navPngIcon({ src: "/icons/app-nav/planner_v3.webp", alt: "Planera", size: 32 });
const iconPlanningActive = navPngIcon({ src: "/icons/app-nav/planner_v3.webp", alt: "Planera", size: 32, className: "block drop-shadow-lg" });

// Hero Play button - even larger
const iconPlay = navPngIcon({ src: "/icons/app-nav/play_v2.webp", alt: "Spela", size: 36 });
const iconPlayActive = navPngIcon({ src: "/icons/app-nav/play_v2.webp", alt: "Spela", size: 36 });

const iconUser = (
  <svg
    viewBox="0 0 24 24"
    className="h-7 w-7"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

const iconUserActive = (
  <svg viewBox="0 0 24 24" className="h-7 w-7 drop-shadow-lg" fill="currentColor" stroke="none">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

export const appNavItems: AppNavItem[] = [
  { href: "/app/gamification", labelKey: "app.nav.gamification", icon: iconLekvaluta, iconActive: iconLekvalutaActive },
  { href: "/app/browse", labelKey: "app.nav.browse", icon: iconBrowse, iconActive: iconBrowseActive },
  { href: "/app/play", labelKey: "app.nav.play", icon: iconPlay, iconActive: iconPlayActive, isHero: true },
  { href: "/app/planner", labelKey: "app.nav.planner", icon: iconPlanning, iconActive: iconPlanningActive },
  { href: "/app/profile", labelKey: "app.nav.profile", icon: iconUser, iconActive: iconUserActive },
];
