import type React from "react";
import type { JSX } from "react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: JSX.Element;
};

const iconBase = "h-5 w-5";

const iconHome = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1v-9.5Z" />
  </svg>
);

const iconGrid = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" />
  </svg>
);

const iconMap = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 4 3.5 6.2v13l5.5-2.2 6 2.2 5.5-2.2v-13L15 6.2 9 4Z" />
    <path d="m9 4 .5 13m5.5-10.8.5 13" />
  </svg>
);

const iconHeart = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 20s-6.5-3.7-8.5-8A5 5 0 0 1 12 6a5 5 0 0 1 8.5 6c-2 4.3-8.5 8-8.5 8Z" />
  </svg>
);

const iconUser = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="4" />
    <path d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6" />
  </svg>
);

export const appNavItems: AppNavItem[] = [
  { href: "/app", label: "Hem", icon: iconHome },
  { href: "/app/categories", label: "Kategorier", icon: iconGrid },
  { href: "/app/journey", label: "Lekresa", icon: iconMap },
  { href: "/app/favorites", label: "Favoriter", icon: iconHeart },
  { href: "/app/profile", label: "Profil", icon: iconUser },
];
