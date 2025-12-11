# Component Inventory (Initial Pass)

Status: draft • Date: 2025-12-11 • Owner: Frontend

Scope: inventory of main React components/hooks by folder, plus current sandbox coverage. This is a working list to drive sandbox completeness and legacy cleanup.

## Core UI (components/ui)
- badge, button, card, dialog, dropdown-menu, input, label, select, sheet, skeleton, switch, tabs, textarea, toast, toggle, avatar, alert, breadcrumbs, empty-state, error-state, loading-spinner, media-picker.
- Sandbox coverage: buttons, cards, forms, primitives, colors, spacing, typography, navigation, feedback, marketing, pricing, testimonials, hero, logo, design-system pages already exist. Remaining: add explicit demos for media-picker/loading/error/empty states if missing.

## App Shell & Navigation (components/app, navigation)
- AppShell, SideNav, BottomNav, PageHeader, nav-items, ThemeToggle, ProfileMenu, LanguageSwitcher.
- Sandbox: app/sandbox/app/* (shell, dashboard, games, profile, planner, etc.) covers most; add focused nav/shell demo if needed.

## Admin (components/admin/*)
- AdminShell, AdminSidebar, AdminTopbar, AdminPageHeader/Layout, AdminStatCard, AdminDataTable, AdminStates.
- Sandbox: app/sandbox/admin/* pages exist per area; ensure AdminShell/Sidebar/Topbar/StatCard/DataTable are showcased explicitly.

## Achievements Builder (components/achievements/*)
- AchievementBuilder, AchievementPreview, ElementSelector, LayerBase/Front/Back, ColorSelector, ThemeSelector (themes.ts), ExportPanel, store, svg index.
- Sandbox: app/sandbox/admin/achievements-builder and achievement pages cover this; verify all subcomponents demoed (e.g., export panel, selectors).

## Billing (components/billing/*)
- SubscriptionCheckout, StripePaymentElement.
- Sandbox: stripe-test page exists; ensure both components rendered.

## Marketing (components/marketing/*)
- hero, header, footer, feature-grid, pricing-section, login-cta, steps-spotlight/timeline, testimonials.
- Sandbox: marketing/hero/pricing/testimonials pages exist; check steps timelines/spotlights present.

## Navigation Extras
- LanguageSwitcher, ProfileMenu, ThemeToggle (shared with app shell).
- Sandbox: navigation page; confirm these specific widgets shown.

## Achievements & Shared
- AchievementBadge (root), ScoreBoard (root).
- Sandbox: achievements badge preview present via previews; add dedicated badge + scoreboard demo if absent.

## Sandbox Components Toolkit (app/sandbox/components/*)
- Shell: SandboxShell/SandboxShellV2, ModuleNav/ModuleNavV2, ControlsPanel, ContextPanel, SandboxThemeProvider, SimpleModulePage, SubModuleLayout, StatusFilterControl, ViewportFrame.
- Previews: AchievementBadgePreview, CoinBalance, ColorPalettePreview, BodyTextPreview, HeadingRamp, LogoLockup.
- Controls: ColorControls, GlobalControls, LogoControls, SpacingControls, TypographyControls.
- Cards/Sections: ModuleCard, CategorySection.
- These power sandbox pages; leave as-is but expose in docs if needed.

## Coverage Gaps / Next Actions
- Now added demos: media-picker + loading/error/empty states + breadcrumbs/sheet/tabs/toggle/toast (`app/sandbox/components/ui-extras/page.tsx`), admin stat/empty/error (`app/sandbox/admin/components/page.tsx`), achievements + scoreboard (`app/sandbox/achievements/page.tsx`).
- Remaining: ensure AdminShell + data table have a consolidated admin style guide page; verify stripe-test renders both SubscriptionCheckout and StripePaymentElement; add breadcrumbs to marketing/app shells if desired.
- Mark orphaned/legacy once usage analysis is done (next pass: usage search + removal list).

## Notes
- This is an initial grouping based on filesystem; deeper pass should include hooks/services and usage checks to flag orphans/duplicates.
- When adding demos: place under `app/sandbox/<category>/` and list component names in-page for quick discovery.
