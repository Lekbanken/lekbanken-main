import Image from "next/image";
import type { JSX } from "react";

export type AppNavItem = {
  href: string;
  labelKey: string;
  icon: JSX.Element;
  iconActive: JSX.Element;
};

function navPngIcon({ src, alt, size }: { src: string; alt: string; size: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="block"
    />
  );
}

const iconBrowse = navPngIcon({ src: "/icons/app-nav/browse.png", alt: "Upptäck", size: 24 });
const iconBrowseActive = iconBrowse;

const iconLekvaluta = navPngIcon({ src: "/icons/app-nav/lekvaluta.png", alt: "Poäng", size: 24 });
const iconLekvalutaActive = iconLekvaluta;

const iconPlanning = navPngIcon({ src: "/icons/app-nav/planning.png", alt: "Planera", size: 24 });
const iconPlanningActive = iconPlanning;

const iconPlay = navPngIcon({ src: "/icons/app-nav/play.png", alt: "Spela", size: 28 });
const iconPlayActive = iconPlay;

const iconUser = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
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
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" stroke="none">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

export const appNavItems: AppNavItem[] = [
  { href: "/app/gamification", labelKey: "app.nav.gamification", icon: iconLekvaluta, iconActive: iconLekvalutaActive },
  { href: "/app/browse", labelKey: "app.nav.browse", icon: iconBrowse, iconActive: iconBrowseActive },
  { href: "/app/play", labelKey: "app.nav.play", icon: iconPlay, iconActive: iconPlayActive },
  { href: "/app/planner", labelKey: "app.nav.planner", icon: iconPlanning, iconActive: iconPlanningActive },
  { href: "/app/profile", labelKey: "app.nav.profile", icon: iconUser, iconActive: iconUserActive },
];
