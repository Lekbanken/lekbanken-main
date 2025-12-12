import {
  SwatchIcon,
  DevicePhoneMobileIcon,
  CogIcon,
  MegaphoneIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

// -----------------------------------------------------------------------------
// Module Registry - Single source of truth for sandbox navigation
// -----------------------------------------------------------------------------

export interface SandboxModule {
  id: string;
  label: string;
  href: string;
  description?: string;
}

export interface ModuleGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultExpanded: boolean;
  modules: SandboxModule[];
}

export const moduleGroups: ModuleGroup[] = [
  {
    id: 'design-system',
    label: 'Design System',
    icon: SwatchIcon,
    defaultExpanded: false,
    modules: [
      { id: 'typography', label: 'Typography', href: '/sandbox/typography', description: 'Fonts, type scale, weights' },
      { id: 'colors', label: 'Colors', href: '/sandbox/colors', description: 'Accent hues and palettes' },
      { id: 'gamification', label: 'Gamification', href: '/sandbox/gamification', description: 'Lekvalutan, achievements' },
      { id: 'achievements', label: 'Achievements & Scoreboard', href: '/sandbox/achievements', description: 'Badges och scoreboard-overlay' },
      { id: 'spacing', label: 'Spacing', href: '/sandbox/spacing', description: 'Spacing scale, border radius' },
      { id: 'icons', label: 'Icon & Logo', href: '/sandbox/design-system/icons', description: 'Ikonfärg och logolayout' },
    ],
  },
  {
    id: 'app',
    label: 'App Sandbox',
    icon: DevicePhoneMobileIcon,
    defaultExpanded: false,
    modules: [
      { id: 'app-main', label: 'App Overview', href: '/sandbox/app', description: 'Shell, Dashboard, GameCard, Leaderboard' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin Sandbox',
    icon: CogIcon,
    defaultExpanded: false,
    modules: [
      { id: 'admin-main', label: 'Admin Overview', href: '/sandbox/admin', description: 'Dashboard, Users, Content, Analytics' },
      { id: 'admin-components', label: 'Admin Components', href: '/sandbox/admin/components', description: 'Stat cards, empty/error states' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: MegaphoneIcon,
    defaultExpanded: false,
    modules: [
      { id: 'hero', label: 'Hero', href: '/sandbox/hero', description: 'Hero section with stats' },
      { id: 'pricing', label: 'Pricing', href: '/sandbox/pricing', description: 'Three tiers with toggle' },
      { id: 'testimonials', label: 'Testimonials', href: '/sandbox/testimonials', description: 'Grid layout testimonials' },
      { id: 'header', label: 'Header', href: '/sandbox/navigation', description: 'Navigation with mobile menu' },
    ],
  },
  {
    id: 'primitives',
    label: 'UI Primitives',
    icon: CubeIcon,
    defaultExpanded: false,
    modules: [
      { id: 'buttons', label: 'Buttons & Badges', href: '/sandbox/buttons', description: 'Button and badge variants' },
      { id: 'cards', label: 'Cards', href: '/sandbox/cards', description: 'Card variants and layouts' },
      { id: 'forms', label: 'Forms', href: '/sandbox/forms', description: 'Input, Textarea, Select' },
      { id: 'feedback', label: 'Feedback & States', href: '/sandbox/feedback', description: 'Empty, Error, Loading, Skeletons' },
      { id: 'interactive', label: 'Interactive', href: '/sandbox/interactive', description: 'Dialog, Dropdown, Tabs, etc.' },
    ],
  },
];

// Helper to find current module by pathname
export function findModuleByPath(pathname: string): { group: ModuleGroup; module: SandboxModule } | null {
  for (const group of moduleGroups) {
    for (const mod of group.modules) {
      if (pathname === mod.href || pathname.startsWith(mod.href + '/')) {
        return { group, module: mod };
      }
    }
  }
  return null;
}

// Helper to get all modules flat
export function getAllModules(): SandboxModule[] {
  return moduleGroups.flatMap((g) => g.modules);
}
