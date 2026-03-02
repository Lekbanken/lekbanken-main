import {
  AcademicCapIcon,
  SparklesIcon,
  HeartIcon,
  TrophyIcon,
  HomeIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  UsersIcon,
  CalendarDaysIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

// =============================================================================
// Shared types (used by server page + client components)
// =============================================================================

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price: string;
  /** Default price ID for checkout link (nullable when no price exists) */
  priceId: string | null;
  description: string;
  category: string;
  categorySlug: string;
  imageUrl: string | null;
};

export type CategoryGroup = {
  name: string;
  slug: string;
  iconKey: string | null;
  descriptionShort: string | null;
  productCount: number;
  gameCount: number;
  products: ProductCard[];
};

// =============================================================================
// Icon + gradient registry (keyed by DB icon_key from categories table)
// =============================================================================

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const ICON_MAP: Record<string, HeroIcon> = {
  HeartIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  UsersIcon,
  HomeIcon,
  CalendarDaysIcon,
  GiftIcon,
  AcademicCapIcon,
  TrophyIcon,
  SparklesIcon,
};

export const GRADIENT_MAP: Record<string, string> = {
  HeartIcon: "from-purple-400 to-violet-500",
  BriefcaseIcon: "from-slate-400 to-gray-600",
  ComputerDesktopIcon: "from-cyan-400 to-blue-500",
  UsersIcon: "from-orange-400 to-red-500",
  HomeIcon: "from-green-400 to-emerald-500",
  CalendarDaysIcon: "from-indigo-400 to-purple-500",
  GiftIcon: "from-pink-400 to-rose-500",
  AcademicCapIcon: "from-blue-400 to-indigo-500",
  TrophyIcon: "from-amber-400 to-orange-500",
  SparklesIcon: "from-primary to-[#00c7b0]",
};

export const ICON_COLOR_MAP: Record<string, string> = {
  HeartIcon: "text-purple-500",
  BriefcaseIcon: "text-slate-500",
  ComputerDesktopIcon: "text-cyan-500",
  UsersIcon: "text-orange-500",
  HomeIcon: "text-green-500",
  CalendarDaysIcon: "text-indigo-500",
  GiftIcon: "text-pink-500",
  AcademicCapIcon: "text-blue-500",
  TrophyIcon: "text-amber-500",
  SparklesIcon: "text-primary",
};

export const ACCENT_BORDER_MAP: Record<string, string> = {
  HeartIcon: "border-t-purple-400",
  BriefcaseIcon: "border-t-slate-400",
  ComputerDesktopIcon: "border-t-cyan-400",
  UsersIcon: "border-t-orange-400",
  HomeIcon: "border-t-green-400",
  CalendarDaysIcon: "border-t-indigo-400",
  GiftIcon: "border-t-pink-400",
  AcademicCapIcon: "border-t-blue-400",
  TrophyIcon: "border-t-amber-400",
  SparklesIcon: "border-t-primary",
};

export const ICON_BG_MAP: Record<string, string> = {
  HeartIcon: "bg-purple-100 dark:bg-purple-500/20",
  BriefcaseIcon: "bg-slate-100 dark:bg-slate-500/20",
  ComputerDesktopIcon: "bg-cyan-100 dark:bg-cyan-500/20",
  UsersIcon: "bg-orange-100 dark:bg-orange-500/20",
  HomeIcon: "bg-green-100 dark:bg-green-500/20",
  CalendarDaysIcon: "bg-indigo-100 dark:bg-indigo-500/20",
  GiftIcon: "bg-pink-100 dark:bg-pink-500/20",
  AcademicCapIcon: "bg-blue-100 dark:bg-blue-500/20",
  TrophyIcon: "bg-amber-100 dark:bg-amber-500/20",
  SparklesIcon: "bg-primary/10",
};

export const BORDER_COLOR_MAP: Record<string, string> = {
  HeartIcon: "border-purple-300",
  BriefcaseIcon: "border-slate-300",
  ComputerDesktopIcon: "border-cyan-300",
  UsersIcon: "border-orange-300",
  HomeIcon: "border-green-300",
  CalendarDaysIcon: "border-indigo-300",
  GiftIcon: "border-pink-300",
  AcademicCapIcon: "border-blue-300",
  TrophyIcon: "border-amber-300",
  SparklesIcon: "border-primary/40",
};

// Legacy mapping: database category text → icon + gradient (fallback during migration)
const LEGACY_CATEGORY_CONFIG: Record<string, { iconKey: string; gradient: string }> = {
  specialpedagog: { iconKey: "HeartIcon", gradient: "from-purple-400 to-violet-500" },
  arbetsplatsen: { iconKey: "BriefcaseIcon", gradient: "from-slate-400 to-gray-600" },
  "digitala aktiviteter": { iconKey: "ComputerDesktopIcon", gradient: "from-cyan-400 to-blue-500" },
  ungdomsverksamhet: { iconKey: "UsersIcon", gradient: "from-orange-400 to-red-500" },
  föräldrar: { iconKey: "HomeIcon", gradient: "from-green-400 to-emerald-500" },
  "event & högtider": { iconKey: "CalendarDaysIcon", gradient: "from-indigo-400 to-purple-500" },
  festligheter: { iconKey: "GiftIcon", gradient: "from-pink-400 to-rose-500" },
  pedagoger: { iconKey: "AcademicCapIcon", gradient: "from-blue-400 to-indigo-500" },
  tränare: { iconKey: "TrophyIcon", gradient: "from-amber-400 to-orange-500" },
};

export function getCategoryVisuals(iconKey: string | null, categoryTextFallback?: string) {
  // Prefer DB-driven icon_key
  if (iconKey && ICON_MAP[iconKey]) {
    return {
      Icon: ICON_MAP[iconKey],
      gradient: GRADIENT_MAP[iconKey] ?? GRADIENT_MAP.SparklesIcon,
      iconColor: ICON_COLOR_MAP[iconKey] ?? ICON_COLOR_MAP.SparklesIcon,
      iconBg: ICON_BG_MAP[iconKey] ?? ICON_BG_MAP.SparklesIcon,
      borderColor: BORDER_COLOR_MAP[iconKey] ?? BORDER_COLOR_MAP.SparklesIcon,
    };
  }
  // Fallback: match legacy category text
  if (categoryTextFallback) {
    const legacy = LEGACY_CATEGORY_CONFIG[categoryTextFallback.toLowerCase()];
    if (legacy) {
      return {
        Icon: ICON_MAP[legacy.iconKey] ?? SparklesIcon,
        gradient: legacy.gradient,
        iconColor: ICON_COLOR_MAP[legacy.iconKey] ?? ICON_COLOR_MAP.SparklesIcon,
        iconBg: ICON_BG_MAP[legacy.iconKey] ?? ICON_BG_MAP.SparklesIcon,
        borderColor: BORDER_COLOR_MAP[legacy.iconKey] ?? BORDER_COLOR_MAP.SparklesIcon,
      };
    }
  }
  // Default
  return {
    Icon: SparklesIcon,
    gradient: GRADIENT_MAP.SparklesIcon,
    iconColor: ICON_COLOR_MAP.SparklesIcon,
    iconBg: ICON_BG_MAP.SparklesIcon,
    borderColor: BORDER_COLOR_MAP.SparklesIcon,
  };
}
