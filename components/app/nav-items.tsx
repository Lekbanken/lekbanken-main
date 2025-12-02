import type { JSX } from "react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: JSX.Element;
  iconActive: JSX.Element;
};

const iconBase = "h-5 w-5";

// Outline icons (inactive)
const iconFlame = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const iconFlameActive = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="currentColor" stroke="currentColor" strokeWidth="0">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const iconSearch = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const iconSearchActive = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const iconPlay = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="m10 8 6 4-6 4V8z" />
  </svg>
);

const iconPlayActive = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="currentColor" stroke="none">
    <circle cx="12" cy="12" r="10" />
    <path d="m10 8 6 4-6 4V8z" fill="white" />
  </svg>
);

const iconPlanner = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
  </svg>
);

const iconPlannerActive = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="currentColor" stroke="currentColor" strokeWidth="0">
    <path d="M16 2a1 1 0 0 1 1 1v2h2a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2V3a1 1 0 1 1 2 0v2h6V3a1 1 0 0 1 1-1zM5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10H5z" />
  </svg>
);

const iconUser = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

const iconUserActive = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="currentColor" stroke="none">
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

export const appNavItems: AppNavItem[] = [
  { href: "/app/gamification", label: "Poäng", icon: iconFlame, iconActive: iconFlameActive },
  { href: "/app/browse", label: "Upptäck", icon: iconSearch, iconActive: iconSearchActive },
  { href: "/app/play", label: "Spela", icon: iconPlay, iconActive: iconPlayActive },
  { href: "/app/planner", label: "Planera", icon: iconPlanner, iconActive: iconPlannerActive },
  { href: "/app/profile", label: "Profil", icon: iconUser, iconActive: iconUserActive },
];
