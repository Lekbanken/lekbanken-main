import {
  SwatchIcon,
  DevicePhoneMobileIcon,
  CogIcon,
  MegaphoneIcon,
  CubeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// -----------------------------------------------------------------------------
// Module Status Types
// -----------------------------------------------------------------------------

export type ModuleStatus = 'design' | 'done' | 'implemented';

export const statusConfig: Record<ModuleStatus, { label: string; color: string }> = {
  design: { label: 'Design', color: 'yellow' },
  done: { label: 'Klar', color: 'green' },
  implemented: { label: 'Implementerad', color: 'primary' },
};

// -----------------------------------------------------------------------------
// Module & Category Types (Extended with inventory data)
// -----------------------------------------------------------------------------

export interface SandboxModule {
  id: string;
  label: string;
  href: string;
  description: string;
  status: ModuleStatus;
  
  /** Components this sandbox module "owns" or primarily showcases */
  components?: string[];
  
  /** Routes in the real app where these components are used */
  routes?: string[];
  
  /** Design tokens heavily used here (for future use) */
  tokens?: string[];
}

export interface SandboxCategory {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  modules: SandboxModule[];
}

// -----------------------------------------------------------------------------
// Category Registry - Single source of truth
// -----------------------------------------------------------------------------

export const sandboxCategories: SandboxCategory[] = [
  {
    id: 'docs',
    label: 'Docs & Wiki',
    href: '/sandbox/docs',
    description: 'Visuellt docs-bibliotek för onboarding (dev-only)',
    icon: CubeIcon,
    modules: [
      {
        id: 'repo-docs',
        label: 'Repo Docs',
        href: '/sandbox/docs/repo',
        description: 'Renderar docs/*.md som läsbara UI-sidor',
        status: 'implemented',
        routes: ['/sandbox/docs/repo', '/sandbox/docs/repo/*'],
      },
      {
        id: 'wiki',
        label: 'Sandbox Wiki',
        href: '/sandbox/docs/wiki',
        description: 'Renderar sandbox/wiki som läsbara UI-sidor',
        status: 'implemented',
        routes: ['/sandbox/docs/wiki', '/sandbox/docs/wiki/*'],
      },
      {
        id: 'conversation-cards',
        label: 'Samtalskort',
        href: '/sandbox/docs/conversation-cards',
        description: 'Systemöversikt: Admin, CSV, Toolbelt och Artifact (read-only)',
        status: 'implemented',
        components: [
          '@/features/tools/components/ConversationCardsV1',
          '@/features/play/components/ConversationCardsCollectionArtifact',
        ],
        routes: ['/admin/toolbelt/conversation-cards', '/api/toolbelt/conversation-cards/*', '/api/play/sessions/*/conversation-cards/*'],
      },
    ],
  },
  {
    id: 'design-system',
    label: 'Design System',
    href: '/sandbox/design-system',
    description: 'Grundläggande designelement och visuellt språk',
    icon: SwatchIcon,
    modules: [
      { 
        id: 'typography', 
        label: 'Typography', 
        href: '/sandbox/typography', 
        description: 'Fonts, type scale, weights', 
        status: 'done',
        components: ['@/app/sandbox/components/previews/HeadingRamp', '@/app/sandbox/components/previews/BodyTextPreview'],
        tokens: ['font.primary', 'font.secondary', 'font.size.*', 'font.weight.*'],
      },
      { 
        id: 'colors', 
        label: 'Colors', 
        href: '/sandbox/colors', 
        description: 'Accent hues and palettes', 
        status: 'done',
        components: ['@/app/sandbox/components/previews/ColorPalette'],
        tokens: ['color.primary', 'color.accent', 'color.surface.*', 'color.semantic.*'],
      },
      { 
        id: 'achievements', 
        label: 'Achievements & Scoreboard', 
        href: '/sandbox/achievements', 
        description: 'Badges, lås/öppna-states och scoreboard-overlay', 
        status: 'done',
        components: ['@/components/AchievementBadge', '@/components/ScoreBoard'],
        routes: ['/app/profile', '/app/leaderboard'],
      },
      { 
        id: 'spacing', 
        label: 'Spacing', 
        href: '/sandbox/spacing', 
        description: 'Spacing scale, border radius', 
        status: 'done',
        components: ['@/app/sandbox/components/previews/SpacingScale'],
        tokens: ['spacing.*', 'radius.*'],
      },
      { 
        id: 'tokens', 
        label: 'Design Tokens', 
        href: '/sandbox/design-system/tokens', 
        description: 'CSS-variabler och semantiska tokens', 
        status: 'done',
        tokens: ['*'],
      },
      { 
        id: 'icons', 
        label: 'Icon & Logo', 
        href: '/sandbox/design-system/icons', 
        description: 'Ikonvarianter, färgtester och logolayout',
        status: 'done',
        components: ['@heroicons/react/*', '@/app/sandbox/components/previews/LogoLockup'],
      },
    ],
  },
  {
    id: 'gamification',
    label: 'Gamification',
    href: '/sandbox/gamification',
    description: 'Coins, achievements, rewards, exports, and admin tooling',
    icon: SparklesIcon,
    modules: [
      {
        id: 'gamification-hub',
        label: 'Overview',
        href: '/sandbox/gamification',
        description: 'Central hub for gamification surfaces and test paths',
        status: 'implemented',
        components: ['@/features/gamification/*', '@/app/sandbox/gamification/*'],
        routes: ['/app/gamification', '/app/profile/coins', '/app/shop', '/admin/gamification/awards'],
        tokens: ['color.xp', 'color.coin', 'color.achievement.*'],
      },
      {
        id: 'gamification-dicecoin',
        label: 'DiceCoin & Coins',
        href: '/sandbox/gamification/dicecoin',
        description: 'Balance, ledger, and coin transactions',
        status: 'implemented',
        components: ['@/features/gamification/components/CoinsSection', '@/app/sandbox/components/previews/CoinBalance'],
        routes: ['/app/profile/coins', '/api/gamification/coins/transaction', '/admin/gamification/awards'],
      },
      {
        id: 'gamification-achievements',
        label: 'Achievements',
        href: '/sandbox/gamification/achievements',
        description: 'Unlocks, pins, progress, and achievements list',
        status: 'implemented',
        components: ['@/features/gamification/components/AchievementsSection', '@/features/gamification/components/AchievementCard'],
        routes: ['/app/gamification/achievements', '/api/gamification', '/api/gamification/pins'],
      },
      {
        id: 'gamification-badges',
        label: 'Badges & Builder',
        href: '/sandbox/gamification/badges',
        description: 'Badge rendering and builder exports',
        status: 'implemented',
        components: ['@/components/AchievementBadge', '@/features/admin/library/badges/*'],
        routes: ['/admin/library/badges', '/api/admin/award-builder/exports'],
      },
      {
        id: 'gamification-rewards',
        label: 'Rewards & Shop',
        href: '/sandbox/gamification/rewards',
        description: 'Shop items, unlockables, and marketplace admin',
        status: 'implemented',
        components: ['@/app/shop', '@/app/sandbox/app/shop'],
        routes: ['/app/shop', '/admin/marketplace', '/api/shop'],
      },
      {
        id: 'gamification-library-exports',
        label: 'Library Exports',
        href: '/sandbox/gamification/library-exports',
        description: 'Award builder export schema and APIs',
        status: 'implemented',
        components: ['@/lib/validation/awardBuilderExportSchemaV1', '@/docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md'],
        routes: ['/api/admin/award-builder/exports', '/api/admin/award-builder/exports/[exportId]'],
      },
    ],
  },
  {
    id: 'app',
    label: 'App Sandbox',
    href: '/sandbox/app',
    description: 'Komponenter för spelarappen',
    icon: DevicePhoneMobileIcon,
    modules: [
      { 
        id: 'app-shell', 
        label: 'App Shell', 
        href: '/sandbox/app/shell', 
        description: 'SideNav + BottomNav + Layout', 
        status: 'done',
        components: ['@/components/app/AppShell', '@/components/app/SideNav', '@/components/app/BottomNav'],
        routes: ['/app', '/app/*'],
      },
      { 
        id: 'app-dashboard', 
        label: 'Dashboard', 
        href: '/sandbox/app/dashboard', 
        description: 'Välkomst, stats, senaste aktivitet', 
        status: 'done',
        components: ['@/features/journey/components/DashboardHero', '@/features/journey/components/StatsCards'],
        routes: ['/app', '/app/dashboard'],
      },
      { 
        id: 'app-game-card', 
        label: 'Game Card', 
        href: '/sandbox/app/game-card', 
        description: 'Aktivitetskort med varianter', 
        status: 'done',
        components: ['@/features/browse/components/GameCard', '@/features/browse/components/GameCardCompact'],
        routes: ['/app/games', '/app/browse', '/app/favorites'],
      },
      { 
        id: 'app-games', 
        label: 'Games / Utforska', 
        href: '/sandbox/app/games', 
        description: 'Lista + filter + sök + grid/list', 
        status: 'done',
        components: ['@/features/browse/components/GameGrid', '@/features/browse/components/FilterPanel'],
        routes: ['/app/games', '/app/browse'],
      },
      { 
        id: 'app-game-detail', 
        label: 'Game Detail / Lek', 
        href: '/sandbox/app/game-detail', 
        description: 'Detaljvy f\u00f6r en lek, med spell\u00e4gen', 
        status: 'design',
        routes: ['/app/games/[gameId]'],
      },
      { 
        id: 'app-profile', 
        label: 'Profile / Profil', 
        href: '/sandbox/app/profile', 
        description: 'Nivå, XP, achievements, milestones', 
        status: 'done',
        components: ['@/features/profile/components/ProfileHeader', '@/features/profile/components/AchievementList'],
        routes: ['/app/profile', '/app/profile/achievements'],
      },
      { 
        id: 'app-leaderboard', 
        label: 'Leaderboard', 
        href: '/sandbox/app/leaderboard', 
        description: 'Podium och rankning', 
        status: 'done',
        components: ['@/features/gamification/components/Leaderboard', '@/features/gamification/components/Podium'],
        routes: ['/app/leaderboard'],
      },
      { 
        id: 'app-events', 
        label: 'Events / Händelser', 
        href: '/sandbox/app/events', 
        description: 'Event-kort, progress, belöningar', 
        status: 'done',
        components: ['@/features/journey/components/EventCard', '@/features/journey/components/EventProgress'],
        routes: ['/app/events', '/app/events/*'],
      },
      { 
        id: 'app-planner', 
        label: 'Planner', 
        href: '/sandbox/app/planner', 
        description: 'Mål, schema, progress tracking', 
        status: 'done',
        components: ['@/features/planner/components/PlannerCalendar', '@/features/planner/components/GoalTracker'],
        routes: ['/app/planner', '/app/goals'],
      },
      { 
        id: 'app-shop', 
        label: 'Shop / Butik', 
        href: '/sandbox/app/shop', 
        description: 'Artiklar, valutor, köp', 
        status: 'done',
        components: ['@/features/gamification/components/Shop', '@/features/gamification/components/ItemCard'],
        routes: ['/app/shop'],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin Sandbox',
    href: '/sandbox/admin',
    description: 'Komponenter för adminpanelen',
    icon: CogIcon,
    modules: [
      { 
        id: 'admin-dashboard', 
        label: 'Dashboard', 
        href: '/sandbox/admin/dashboard', 
        description: 'Översikt, KPI-kort, aktivitetsfeed', 
        status: 'done',
        components: ['@/components/admin/DashboardStats', '@/components/admin/ActivityFeed'],
        routes: ['/admin', '/admin/dashboard'],
      },
      { 
        id: 'admin-users', 
        label: 'Users', 
        href: '/sandbox/admin/users', 
        description: 'Användarlista, roller, filter, actions', 
        status: 'done',
        components: ['@/features/admin/components/UserTable', '@/features/admin/components/UserFilters'],
        routes: ['/admin/users', '/admin/users/*'],
      },
      { 
        id: 'admin-content', 
        label: 'Content', 
        href: '/sandbox/admin/content', 
        description: 'Aktiviteter, kategorier, CRUD', 
        status: 'done',
        components: ['@/features/admin/components/ContentEditor', '@/features/admin/components/ContentList'],
        routes: ['/admin/content', '/admin/content/*'],
      },
      {
        id: 'admin-coach-diagrams',
        label: 'Coach Diagrams',
        href: '/sandbox/admin/coach-diagrams',
        description: 'QA coach diagram SVG primitives and court backgrounds',
        status: 'implemented',
        components: ['@/components/coach-diagram/svg-primitives', '@/features/admin/library/coach-diagrams/*'],
        routes: ['/admin/library/coach-diagrams', '/admin/library/coach-diagrams/[id]'],
      },
      { 
        id: 'admin-analytics', 
        label: 'Analytics', 
        href: '/sandbox/admin/analytics', 
        description: 'Statistik, grafer, rapporter', 
        status: 'done',
        components: ['@/features/admin/components/Charts', '@/features/admin/components/ReportBuilder'],
        routes: ['/admin/analytics'],
      },
      { 
        id: 'admin-organisations', 
        label: 'Organisations', 
        href: '/sandbox/admin/organisations', 
        description: 'Organisationshantering, tenants', 
        status: 'done',
        components: ['@/features/admin/components/OrgTable', '@/features/admin/components/TenantSettings'],
        routes: ['/admin/organisations', '/admin/tenants'],
      },
      { 
        id: 'admin-billing', 
        label: 'Billing', 
        href: '/sandbox/admin/billing', 
        description: 'Prenumerationer, betalningar', 
        status: 'done',
        components: ['@/features/admin/components/BillingOverview', '@/features/admin/components/InvoiceTable'],
        routes: ['/admin/billing'],
      },
      { 
        id: 'admin-moderation', 
        label: 'Moderation', 
        href: '/sandbox/admin/moderation', 
        description: 'Rapporter, användarhantering', 
        status: 'done',
        components: ['@/features/admin/components/ModerationQueue', '@/features/admin/components/ReportCard'],
        routes: ['/admin/moderation'],
      },
      { 
        id: 'admin-notifications', 
        label: 'Notifications', 
        href: '/sandbox/admin/notifications', 
        description: 'Push, e-post, meddelanden', 
        status: 'done',
        components: ['@/features/admin/components/NotificationEditor', '@/features/admin/components/CampaignList'],
        routes: ['/admin/notifications'],
      },
      { 
        id: 'admin-support', 
        label: 'Support', 
        href: '/sandbox/admin/support', 
        description: 'Ärenden, feedback', 
        status: 'done',
        components: ['@/features/admin/components/TicketList', '@/features/admin/components/TicketDetail'],
        routes: ['/admin/support', '/admin/support/*'],
      },
      { 
        id: 'admin-licenses', 
        label: 'Licenses', 
        href: '/sandbox/admin/licenses', 
        description: 'Licensnycklar, organisationer', 
        status: 'done',
        components: ['@/features/admin/components/LicenseTable', '@/features/admin/components/LicenseGenerator'],
        routes: ['/admin/licenses'],
      },
      { 
        id: 'admin-leaderboard', 
        label: 'Leaderboard', 
        href: '/sandbox/admin/leaderboard', 
        description: 'Topplistor, statistik', 
        status: 'done',
        components: ['@/features/admin/components/LeaderboardConfig', '@/features/admin/components/TopUsersTable'],
        routes: ['/admin/leaderboard'],
      },
      { 
        id: 'admin-achievements', 
        label: 'Achievements', 
        href: '/sandbox/admin/achievements', 
        description: 'Prestationer, badges', 
        status: 'done',
        components: ['@/features/admin/components/AchievementBuilder', '@/features/admin/components/BadgeEditor'],
        routes: ['/admin/achievements', '/admin/badges'],
      },
      { 
        id: 'admin-components', 
        label: 'Admin Components', 
        href: '/sandbox/admin/components', 
        description: 'Stat cards, tom-/felvyer, filter', 
        status: 'done',
        components: ['@/components/admin/shared/AdminStatCard', '@/components/admin/shared/AdminStates'],
        routes: ['/admin/*'],
      },
      { 
        id: 'admin-personalization', 
        label: 'Personalization', 
        href: '/sandbox/admin/personalization', 
        description: 'Teman, avatarer, anpassning', 
        status: 'done',
        components: ['@/features/admin/components/ThemeEditor', '@/features/admin/components/AvatarManager'],
        routes: ['/admin/personalization'],
      },
      { 
        id: 'admin-settings', 
        label: 'Settings', 
        href: '/sandbox/admin/settings', 
        description: 'Systeminställningar, konfiguration', 
        status: 'done',
        components: ['@/features/admin/components/SettingsForm', '@/features/admin/components/ConfigPanel'],
        routes: ['/admin/settings'],
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    href: '/sandbox/marketing',
    description: 'Marknadsföringskomponenter för landningssidan',
    icon: MegaphoneIcon,
    modules: [
      { 
        id: 'hero', 
        label: 'Hero', 
        href: '/sandbox/hero', 
        description: 'Hero-section med stats', 
        status: 'done',
        components: ['@/components/marketing/Hero', '@/components/marketing/HeroStats'],
        routes: ['/'],
      },
      { 
        id: 'pricing', 
        label: 'Pricing', 
        href: '/sandbox/pricing', 
        description: 'Tre tiers med toggle', 
        status: 'done',
        components: ['@/components/marketing/PricingSection', '@/components/marketing/PricingCard'],
        routes: ['/', '/pricing'],
      },
      { 
        id: 'testimonials', 
        label: 'Testimonials', 
        href: '/sandbox/testimonials', 
        description: 'Grid-layout testimonials', 
        status: 'done',
        components: ['@/components/marketing/TestimonialGrid', '@/components/marketing/TestimonialCard'],
        routes: ['/'],
      },
      { 
        id: 'navigation', 
        label: 'Header', 
        href: '/sandbox/navigation', 
        description: 'Navigation med mobilmeny', 
        status: 'done',
        components: ['@/components/navigation/Header', '@/components/navigation/MobileNav'],
        routes: ['/', '/*'],
      },
    ],
  },
  {
    id: 'testing',
    label: 'Testing & Development',
    href: '/sandbox/testing',
    description: 'Test och utvecklingsverktyg',
    icon: CogIcon,
    modules: [
      { 
        id: 'stripe-test', 
        label: 'Stripe Payment Test', 
        href: '/sandbox/stripe-test', 
        description: 'Testa Stripe Payment Element och subscription flow', 
        status: 'done',
        components: ['@/components/billing/SubscriptionCheckout', '@/components/billing/StripePaymentElement'],
        routes: ['/sandbox/stripe-test'],
      },
      { 
        id: 'artifacts', 
        label: 'Artifacts Harness', 
        href: '/sandbox/artifacts', 
        description: 'Testa artifacts end-to-end (ADMIN / HOST / PARTICIPANT)', 
        status: 'implemented',
        components: ['@/app/sandbox/artifacts/*', '@/components/play/*', '@/types/puzzle-modules'],
        routes: ['/sandbox/artifacts'],
      },
      { 
        id: 'scenes', 
        label: 'Scenes Prototype', 
        href: '/sandbox/scenes', 
        description: 'Prototyp: karta + rum (hotspot-navigering, per deltagare, host controls)', 
        status: 'implemented',
        components: ['@/app/sandbox/scenes/*', '@/components/play/HotspotImage', '@/app/sandbox/artifacts/ArtifactRenderer'],
        routes: ['/sandbox/scenes'],
      },
      { 
        id: 'play', 
        label: 'Play Immersion', 
        href: '/sandbox/play', 
        description: 'Typewriter, Countdown, Keypad, Trigger, Lobby (Legendary Play)', 
        status: 'done',
        components: [
          '@/components/play/TypewriterText',
          '@/components/play/CountdownOverlay',
          '@/components/play/Keypad',
          '@/components/play/AlphaKeypad',
          '@/components/play/StoryOverlay',
          '@/components/play/TriggerCard',
          '@/components/play/TriggerList',
          '@/components/play/TriggerWizard',
          '@/components/play/LobbyHub',
          '@/components/play/lobby/*',
        ],
        routes: ['/sandbox/play'],
      },
    ],
  },
  {
    id: 'primitives',
    label: 'UI Primitives',
    href: '/sandbox/primitives',
    description: 'Grundläggande UI-komponenter',
    icon: CubeIcon,
    modules: [
      { 
        id: 'buttons', 
        label: 'Buttons & Badges', 
        href: '/sandbox/buttons', 
        description: 'Alla button- och badge-varianter', 
        status: 'done',
        components: ['@/components/ui/Button', '@/components/ui/Badge', '@/components/ui/IconButton'],
        routes: ['*'],
        tokens: ['color.primary', 'color.secondary', 'radius.button'],
      },
      { 
        id: 'cards', 
        label: 'Cards', 
        href: '/sandbox/cards', 
        description: 'Card-varianter och layouts', 
        status: 'done',
        components: ['@/components/ui/Card', '@/components/ui/CardHeader', '@/components/ui/CardContent'],
        routes: ['*'],
        tokens: ['shadow.card', 'radius.card', 'color.surface.*'],
      },
      { 
        id: 'forms', 
        label: 'Forms', 
        href: '/sandbox/forms', 
        description: 'Input, Textarea, Select', 
        status: 'done',
        components: ['@/components/ui/Input', '@/components/ui/Textarea', '@/components/ui/Select'],
        routes: ['*'],
        tokens: ['color.input.*', 'radius.input'],
      },
      { 
        id: 'feedback', 
        label: 'Feedback & States', 
        href: '/sandbox/feedback', 
        description: 'Empty, Error, Loading, Skeletons, Alerts, Toasts', 
        status: 'done',
        components: ['@/components/ui/Skeleton', '@/components/ui/Alert', '@/components/ui/Toast', '@/components/ui/EmptyState'],
        routes: ['*'],
        tokens: ['color.semantic.*'],
      },
      { 
        id: 'interactive', 
        label: 'Interactive', 
        href: '/sandbox/interactive', 
        description: 'Dialog, Dropdown, Avatar, Tabs, Breadcrumbs', 
        status: 'done',
        components: ['@/components/ui/Dialog', '@/components/ui/Dropdown', '@/components/ui/Avatar', '@/components/ui/Tabs'],
        routes: ['*'],
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

export function getCategoryById(categoryId: string): SandboxCategory | undefined {
  return sandboxCategories.find((c) => c.id === categoryId);
}

export function getModuleById(moduleId: string): { category: SandboxCategory; module: SandboxModule } | undefined {
  for (const category of sandboxCategories) {
    const mod = category.modules.find((m) => m.id === moduleId);
    if (mod) {
      return { category, module: mod };
    }
  }
  return undefined;
}

export function findModuleByPath(pathname: string): { category: SandboxCategory; module: SandboxModule } | null {
  for (const category of sandboxCategories) {
    // Check if pathname matches category overview
    if (pathname === category.href) {
      return null; // It's a category page, not a module
    }
    // Check modules
    for (const mod of category.modules) {
      if (pathname === mod.href || pathname.startsWith(mod.href + '/')) {
        return { category, module: mod };
      }
    }
  }
  return null;
}

export function findCategoryByPath(pathname: string): SandboxCategory | null {
  for (const category of sandboxCategories) {
    if (pathname === category.href || pathname.startsWith(category.href + '/')) {
      return category;
    }
  }
  return null;
}

export function getAllModules(): SandboxModule[] {
  return sandboxCategories.flatMap((c) => c.modules);
}

export function getModulesByStatus(status: ModuleStatus): SandboxModule[] {
  return getAllModules().filter((m) => m.status === status);
}

// For legacy compatibility with old module groups structure
export const moduleGroups = sandboxCategories.map((category) => ({
  id: category.id,
  label: category.label,
  icon: category.icon,
  defaultExpanded: false,
  modules: category.modules.map((m) => ({
    id: m.id,
    label: m.label,
    href: m.href,
    description: m.description,
  })),
}));



