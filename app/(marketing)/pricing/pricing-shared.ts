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
  description: string;
  category: string;
  categorySlug: string;
  imageUrl: string | null;
};

export type CategoryGroup = {
  name: string;
  slug: string;
  iconKey: string | null;
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
    };
  }
  // Fallback: match legacy category text
  if (categoryTextFallback) {
    const legacy = LEGACY_CATEGORY_CONFIG[categoryTextFallback.toLowerCase()];
    if (legacy) {
      return {
        Icon: ICON_MAP[legacy.iconKey] ?? SparklesIcon,
        gradient: legacy.gradient,
      };
    }
  }
  // Default
  return { Icon: SparklesIcon, gradient: GRADIENT_MAP.SparklesIcon };
}
