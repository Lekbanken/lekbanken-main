# Repo File Structure — Full Map

**Generated:** 2026-03-16  
**Total source files (ts/tsx/js/jsx):** ~1 951  
**Excluded from listing:** `node_modules/`, `.next/`, `.git/`, `playwright-report/`, `test-results/`

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Frozen repo tree snapshot from the 2026-03-16 structure audit. Treat it as a historical map, not a current exhaustive source without re-checking the file system.

---

## Root Directory

### Config / Tooling
```
.env.local                    # Local environment variables
.env.local.example            # Template for .env.local
.gitignore
.nvmrc                        # Node version pinning
eslint.config.mjs             # ESLint flat config
next.config.ts                # Next.js config
next-env.d.ts                 # Next.js type declarations
package.json
package-lock.json
playwright.config.ts           # Playwright E2E config
postcss.config.mjs
proxy.ts                       # Dev proxy (Supabase fetch instrumentation)
tsconfig.json
tsconfig.test.json
tsconfig.test.tsbuildinfo
tsconfig.tsbuildinfo
vercel.json                    # Vercel deployment config
vitest.config.ts               # Vitest unit test config
```

### Architecture / Audit / Implementation Docs (53 .md files in root)

#### Notifications domain
```
docs/notifications/app-shell-notifications-architecture.md
docs/notifications/app-shell-notifications-audit.md
docs/notifications/app-shell-notifications-implementation-plan.md
docs/notifications/app-shell-notifications-batch2-spec.md
notifications-architecture.md
notifications-e2e-audit.md
notifications-implementation-plan.md
```

#### GameDetails domain
```
GAMEDETAILS_CONTEXT_ARCHITECTURE.md
GAMEDETAILS_CONTEXT_AUDIT.md
GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md
GAMEDETAILS_IMPLEMENTATION_PLAN.md
GAMEDETAILS_SECTION_ANALYSIS.md
```

#### Journey / Gamification domain
```
Journey_v2_Architecture.md
Journey_v2_Audit.md
Journey_v2_CHANGELOG.md
Journey_v2_FinalReview.md
Journey_v2_ImplementationPlan.md
docs/journey/journey-activation-architecture.md
docs/journey/journey-activation-audit.md
docs/journey/journey-activation-implementation-plan.md
GAMIFICATION_JOURNEY_AUDIT.md
```

#### Planner domain
```
planner-architecture.md
planner-audit.md
planner-implementation-plan.md
```

#### Play domain
```
PLAY_IMPLEMENTATION_GUIDE_P0.md
PLAY_MODE_UI_AUDIT.md
PLAY_SYSTEM_DOCUMENTATION.md
PLAY_UI_CONTRACT.md
PARTICIPANT_PLAY_AUDIT.md
PARTICIPANT_PLAY_UI_LAWS.md
```

#### Browse / Game / Library
```
BROWSE_SCALING_IMPLEMENTATION_PLAN.md
GAMECARD_UNIFIED_IMPLEMENTATION.md
GAME_INTEGRITY_REPORT.md
LIBRARY_MASTER_IMPLEMENTATION.md
```

#### Artifacts / Signals
```
ARTIFACT_COMPONENTS.md
ARTIFACT_MATRIX.md
ARTIFACT_UI_CONTRACT.md
ATLAS_EVOLUTION_IMPLEMENTATION.md
play/signals/SIGNALS_SPEC.md
```

#### Cross-cutting / Status
```
API_ROUTE_AUDIT.md
GOLDEN_PATH_QA_CHECKLIST.md
i18n-audit.md
MEDIA_DOMAIN_COMPLETE.md
PERSONAL_LICENSE_IMPLEMENTATION.md
PROJECT_COMPLETION_SUMMARY.md
PROJECT_CONTEXT.md
PROJECT_STATUS.md
README.md
summary.md
SYSTEM_STATUS_RISK_OVERVIEW.md
TIMEOUT_DIAGNOSTIC_REPORT.md
```

#### Inventory system
```
INVENTORY_DECISIONS.md
INVENTORY_PLAYBOOK.md
INVENTORY_RULES.md
```

### Diagnostics / Reports / Dumps
```
dump.txt                       # DB dump
lint-output.txt                # Lint capture
play-lint.json                 # Play lint results
play-lint.txt                  # Play lint text
schema_dump.txt                # DB schema dump
test-output.txt                # Test output capture
```

### Inventory / Audit Data
```
i18n-audit.json
inventory.claude.json
inventory.json
INVENTORY_SCHEMA.json
```

### Backup files (should be removed)
```
GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak
GAMEDETAILS_SECTION_ANALYSIS.md.bak
```

### Hidden Directories
```
.atlas/                        # Atlas inventory system (4 files)
.github/                       # CI/CD, PR templates, copilot instructions
.husky/                        # Git hooks
.inventory/                    # Code inventory database
```

### Special Directory
```
2026-01-07/                    # DB performance snapshot (14 CSV files)
```

---

## `app/` — Next.js App Router (812 files)

```
app/
├── globals.css
├── layout.tsx                 # Root layout
├── providers.tsx              # Client providers
├── server-providers.tsx       # Server providers
├── favicon.ico
├── robots.ts                  # SEO robots.txt
├── sitemap.ts                 # SEO sitemap
│
├── (marketing)/               # Marketing route group
│   ├── layout.tsx
│   ├── marketing-layout-content.tsx
│   ├── page.tsx               # Landing page
│   ├── auth/
│   ├── checkout/
│   ├── components/
│   ├── enterprise/
│   ├── features/
│   ├── gift/
│   ├── play/                  # Public play entry
│   └── pricing/
│
├── app/                       # Authenticated user zone (/app/*)
│   ├── layout.tsx
│   ├── layout-client.tsx
│   ├── page.tsx               # Dashboard
│   ├── AppDashboardClient.tsx
│   ├── error.tsx
│   ├── components/
│   │   └── app-topbar.tsx     # Canonical topbar
│   ├── browse/
│   │   └── page.tsx
│   ├── games/
│   │   └── [gameId]/
│   │       ├── page.tsx
│   │       ├── error.tsx, loading.tsx
│   │       ├── start-session-cta.tsx
│   │       └── director-preview/
│   ├── play/
│   │   ├── page.tsx
│   │   ├── plan/
│   │   │   └── [planId]/ → page.tsx
│   │   ├── sessions/
│   │   │   ├── page.tsx, client.tsx
│   │   │   └── [id]/ → page.tsx, client.tsx
│   │   └── [gameId]/ → page.tsx, start-session-button.tsx
│   ├── planner/
│   │   ├── page.tsx
│   │   ├── calendar/ → page.tsx
│   │   ├── plan/ → [planId]/ → page.tsx
│   │   ├── plans/ → page.tsx
│   │   └── [planId]/ → page.tsx
│   ├── journey/ → page.tsx
│   ├── notifications/ → page.tsx
│   ├── gamification/
│   │   ├── page.tsx
│   │   ├── achievements/ → page.tsx
│   │   ├── coins/ → page.tsx
│   │   └── events/ → page.tsx
│   ├── learning/
│   │   ├── page.tsx
│   │   ├── LearningDashboardClient.tsx
│   │   └── course/
│   ├── leaderboard/ → page.tsx
│   ├── challenges/ → page.tsx
│   ├── shop/ → page.tsx
│   ├── profile/
│   │   ├── layout.tsx, page.tsx, error.tsx, loading.tsx
│   │   ├── general/, account/, activity/, friends/
│   │   ├── organizations/, preferences/, privacy/, security/
│   ├── subscription/ → page.tsx
│   ├── invoices/ → page.tsx
│   ├── preferences/
│   │   ├── page.tsx
│   │   ├── cookies/, legal/, privacy/
│   ├── support/
│   │   ├── page.tsx
│   │   ├── contact/, tickets/
│   ├── events/ → page.tsx
│   ├── select-tenant/ → page.tsx
│   └── no-access/ → page.tsx
│
├── admin/                     # Admin zone (/admin/*)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── components/
│   │   └── admin-nav-config.tsx
│   ├── (system)/
│   │   ├── layout.tsx
│   │   ├── audit-logs/, legal/, system-health/
│   ├── games/
│   │   ├── page.tsx
│   │   ├── builder/, new/
│   │   └── [gameId]/
│   ├── sessions/ → page.tsx, [sessionId]/
│   ├── play/ → sessions/
│   ├── planner/ → page.tsx, [planId]/
│   ├── categories/ → page.tsx
│   ├── media/ → page.tsx, _legacy-page.tsx
│   ├── users/ → page.tsx
│   ├── participants/ → page.tsx, [participantId]/
│   ├── organisations/ → page.tsx, [tenantId]/
│   ├── tenant/ → [tenantId]/
│   ├── learning/
│   │   ├── page.tsx
│   │   ├── courses/, paths/, reports/, requirements/
│   ├── achievements/ → page.tsx
│   ├── achievements-advanced/ → page.tsx
│   ├── gamification/
│   │   ├── page.tsx
│   │   ├── achievements/, analytics/, automation/, awards/
│   │   ├── campaigns/, dashboard/, dicecoin-xp/, levels/
│   │   ├── library-exports/, shop-rewards/
│   ├── billing/
│   │   ├── page.tsx
│   │   ├── analytics/, dunning/, invoices/, promo-codes/
│   │   ├── subscriptions/, usage/
│   ├── notifications/ → page.tsx
│   ├── products/ → page.tsx, new/, [productId]/, images/
│   ├── content/ → page.tsx
│   ├── marketing/ → page.tsx, features/, updates/
│   ├── marketplace/ → page.tsx, _legacy-page.tsx
│   ├── translations/ → page.tsx, audit/, content/, missing/, [namespace]/
│   ├── licenses/ → page.tsx, _legacy-page.tsx
│   ├── leaderboard/ → page.tsx, _legacy-page.tsx
│   ├── design/ → page.tsx, components/, DesignPageClient.tsx
│   ├── personalization/ → page.tsx
│   ├── cosmetics/ → page.tsx, 3 client components
│   ├── library/ → badges/, coach-diagrams/, spatial-editor/
│   ├── analytics/ → page.tsx, errors/
│   ├── settings/ → page.tsx
│   ├── support/ → page.tsx, automation/, bugs/, feedback/, kb/, notifications/
│   ├── tickets/ → page.tsx, page.tsx.bak
│   ├── moderation/ → page.tsx
│   ├── feature-flags/ → page.tsx
│   ├── api-keys/ → page.tsx
│   ├── demo/ → page.tsx, components/
│   ├── incidents/ → page.tsx
│   ├── scheduled-jobs/ → page.tsx
│   ├── release-notes/ → page.tsx
│   ├── cookies/ → page.tsx, components/
│   ├── webhooks/ → page.tsx
│   └── toolbelt/ → conversation-cards/
│       └── tools/ → page.tsx
│
├── api/                       # API routes (292 files across 34 domains)
│   ├── accounts/, admin/, atlas/, billing/, browse/
│   ├── checkout/, coach-diagrams/, consent/, cosmetics/
│   ├── demo/, enterprise/, game-reactions/, games/
│   ├── gamification/, gdpr/, geocode/, gift/, health/
│   ├── journey/, learning/, media/, participants/
│   ├── plans/, play/, products/, public/, purposes/
│   ├── readiness/, sandbox/, sessions/, shop/
│   ├── spatial-artifacts/, system/, tenants/, toolbelt/
│
├── auth/                      # Auth routes
│   ├── callback/, demo/, mfa-challenge/, recovery/, signout/
│
├── actions/                   # Server actions (21 files)
│
├── board/
│   └── [code]/                # Public board/code page
│
├── demo/ → page.tsx, error.tsx, loading.tsx, upgrade/
├── demo-expired/
│
├── participants/              # Participant routes
│   ├── analytics/, create/, history/, host/, join/, view/
│
├── playground/ → page.tsx
│
├── sandbox/                   # Dev sandbox routes (166 files)
│   ├── layout.tsx, page.tsx
│   ├── achievements/, admin/, app/, artifacts/, atlas/
│   ├── auth-demo/, avatar-builder/, buttons/, cards/, colors/
│   ├── components/, config/, design-system/, docs/, feedback/
│   ├── forms/, gamification/, hero/, hero-v2/, interactive/
│   ├── journey/, learning/, logo/, marketing/, navigation/
│   ├── play/, pricing/, primitives/, scenes/, spacing/
│   ├── spatial-capture/, spatial-editor/, store/, stripe-test/
│   ├── testimonials/, tests/, tokens/, types/, typography/
│
├── legal/
│   ├── layout.tsx
│   ├── accept/, cookie-policy/, privacy/, subprocessors/, terms/
│
├── privacy/ → (redirect/content)
└── terms/ → (redirect/content)
```

---

## `components/` — Shared UI Components (235 files)

```
components/
├── AchievementBadge.tsx       # Root-level loose component
├── CoinIdle.tsx + CoinIdle.module.css
├── DiceCoinIcon.tsx
├── ScoreBoard.tsx
│
├── achievements/              # Badge builder (14 files + svg/)
│   ├── AchievementBuilder.tsx, AchievementPreview.tsx
│   ├── color-utils.ts, ColorSelector.tsx, store.ts, themes.ts
│   ├── DEPRECATED.md          # Self-marked deprecated
│   ├── ElementSelector.tsx, ExportPanel.tsx
│   ├── Layer*.tsx (4 files), ThemeSelector.tsx
│   └── svg/
│
├── admin/                     # Admin shell + shared admin components (14 files)
│   ├── AdminShellV2.tsx       # Admin root shell
│   ├── AdminSidebarV2.tsx, AdminTopbarV2.tsx
│   ├── AdminCommandPalette.tsx, AdminOrgSwitcher.tsx
│   ├── AdminActivityFeed.tsx, AnalyticsDashboard.tsx
│   ├── ActingAsTenantBanner.tsx, SyncStatusBadge.tsx
│   ├── BadgePicker.tsx, SessionAnalyticsViewer.tsx, SessionReplay.tsx
│   ├── SystemAdminClientGuard.tsx, useAdminMode.ts
│   └── shared/
│
├── app/                       # App shell (8 files)
│   ├── AppShell.tsx           # Canonical app root shell
│   ├── BottomNav.tsx, SideNav.tsx
│   ├── NotificationBell.tsx
│   ├── PageHeader.tsx         # Legacy (1 remaining consumer)
│   ├── PageTitleHeader.tsx    # Current standard
│   ├── ProfileModal.tsx
│   └── nav-items.tsx
│
├── auth/                      # MFA components (5 files + index.ts)
│   ├── MFAChallenge.tsx, MFACodeInput.tsx
│   ├── MFARecoveryInput.tsx, TrustDeviceCheckbox.tsx
│
├── billing/                   # Purchase/cart UI (8 files)
│   ├── AddToCartButton.tsx, CartDrawer.tsx, CartItemRow.tsx
│   ├── LockedContent.tsx, StripePaymentElement.tsx
│   ├── SubscriptionCheckout.tsx, UpsellButton.tsx, UpsellModal.tsx
│
├── coach-diagram/ → svg-primitives.tsx
│
├── cookie/                    # Cookie consent (3 files + index.ts)
│   ├── CookieConsentBanner.tsx ⚠️ DUPLICATE (also in legal/)
│   ├── CookieDeclarationTable.tsx
│
├── demo/                      # Demo system (4 files)
│   ├── DemoBanner.tsx, DemoConversionModal.tsx
│   ├── DemoFeatureGate.tsx, FeatureGateMap.tsx
│
├── game/                      # Game display (5 files)
│   ├── GameActionsWithPlanModal.tsx, GameStartActions.tsx, LikeButton.tsx
│   ├── GameCard/              # Folder
│   └── GameDetails/           # Folder
│
├── icons/ → HeartIcon.tsx + index.ts
│
├── journey/                   # Journey UI (9 files + index.ts)
│   ├── JourneyActions.tsx, JourneyIdentity.tsx, JourneyOverview.tsx
│   ├── JourneyProgress.tsx, JourneyScene.tsx, JourneyStats.tsx
│   ├── ParticleField.tsx, SceneBackgroundEffect.tsx
│
├── layout/                    # ⚠️ EMPTY DIRECTORY
│
├── learning/ → TrainingRequired.tsx
│
├── legal/                     # Legal components (5 files)
│   ├── CookieConsentBanner.tsx  ⚠️ DUPLICATE (also in cookie/)
│   ├── LegalAcceptWizard.tsx, LegalPreviewDialog.tsx
│   ├── MarkdownAccordionPreview.tsx, MarkdownContent.tsx
│
├── marketing/                 # Marketing page components (15 files)
│   ├── actions.ts, activity-feed.tsx, category-hub*.tsx
│   ├── feature-grid*.tsx, features-page-content.tsx
│   ├── footer.tsx, header.tsx, hero*.tsx
│   ├── login-cta.tsx, pricing-cta.tsx
│   ├── steps-timeline.tsx, testimonials.tsx
│
├── navigation/                # Nav components (3 files)
│   ├── LanguageSwitcher.tsx, ProfileMenu.tsx, ThemeToggle.tsx
│
├── play/                      # Play/session components (~47 files + index.ts)
│   ├── AlphaKeypad.tsx, AudioPlayer.tsx, CipherDecoder.tsx
│   ├── CountdownOverlay.tsx, Counter.tsx, HintPanel.tsx
│   ├── HotspotImage.tsx, JoinSessionForm.tsx, Keypad.tsx
│   ├── KeypadDisplay.tsx, LobbyHub.tsx, LocationCheck.tsx
│   ├── LogicGrid.tsx, MultiAnswerForm.tsx
│   ├── ParticipantList.tsx, ParticipantRow.tsx, ParticipantStatusBadge.tsx
│   ├── PropConfirmation.tsx, QRScanner.tsx, ReadinessBadge.tsx
│   ├── ReplayMarker.tsx, RiddleInput.tsx
│   ├── SessionCard.tsx, SessionControls.tsx, SessionFeedback.tsx
│   ├── SessionHeader.tsx, SessionListItem.tsx, SessionStatusBadge.tsx
│   ├── SoundLevelMeter.tsx, StoryOverlay.tsx, TilePuzzle.tsx
│   ├── TriggerCard.tsx, TriggerList.tsx, TriggerWizard.tsx
│   ├── TypewriterText.tsx
│   ├── hooks/
│   └── lobby/
│
├── profile/ → ProfileNavigation.tsx
│
├── sandbox/ → AuthDebugPanel.tsx
│
├── tenant/                    # Tenant selector (2 files + index.ts)
│   └── TenantSelector.tsx
│
└── ui/                        # Design system primitives (38 files + index.tsx)
    ├── alert-dialog.tsx, alert.tsx, avatar.tsx, badge.tsx
    ├── breadcrumbs.tsx, button.tsx, card.tsx, checkbox.tsx
    ├── collapsible.tsx, copy-button.tsx, dialog.tsx
    ├── dropdown-menu.tsx, empty-state.tsx, error-state.tsx
    ├── help-text.tsx, input.tsx, label.tsx, loading-spinner.tsx
    ├── popover.tsx, progress.tsx, scroll-area.tsx, select.tsx
    ├── sheet.tsx, skeleton.tsx, slider.tsx, switch.tsx
    ├── table.tsx, tabs.tsx, textarea.tsx, toast.tsx
    ├── toggle.tsx, tooltip.tsx
    ├── audio-upload-editor.tsx, diagram-thumbnail.tsx
    ├── interactive-image-editor.tsx, language-switcher.tsx
    └── media-picker.tsx
```

---

## `features/` — Feature Modules (493 files)

```
features/
├── admin/                     # Admin feature modules (16 subdirs)
│   ├── achievements/, categories/, dashboard/, games/
│   ├── hooks/, legal/, library/, licenses/
│   ├── marketing/, media/, organisations/
│   ├── participants/, products/, shared/
│   ├── translations/, users/
│
├── browse/                    # Browse/discovery (7 files)
│   ├── BrowsePage.tsx, capabilities.ts, filterRegistry.ts
│   ├── components/, hooks/
│   ├── index.ts, types.ts
│
├── conversation-cards/        # Conversation cards tool
│   ├── components/, csv-format.ts
│
├── gamification/              # Gamification feature (9 files)
│   ├── GamificationPage.tsx, GamificationStandardPage.tsx
│   ├── AchievementsOverviewPage.tsx
│   ├── api.ts, types.ts
│   ├── components/, data/, hooks/
│
├── journey/                   # Journey feature (5 files)
│   ├── AppDashboardPage.tsx, JourneyPage.tsx
│   ├── api.ts, cosmetic-types.ts, types.ts
│
├── participants/              # Participant management
│   ├── components/, hooks/
│
├── planner/                   # Planner feature (7+ files)
│   ├── api.ts, types.ts
│   ├── calendar/, components/, hooks/
│   ├── styles/, wizard/
│
├── play/                      # Play system (12+ files)
│   ├── PlayPage.tsx, PlayPlanPage.tsx
│   ├── api.ts, api/, haptics.ts, sound.ts
│   ├── components/, contracts/, hooks/, utils/
│   ├── index.ts, types.ts
│
├── play-participant/          # Participant-side play (2 files)
│   ├── api.ts, tokenStorage.ts
│
├── profile/                   # Profile feature
│   └── avatarPresets.ts
│
├── profile-overview/          # Profile overview page (6 files)
│   ├── ProfileHero.tsx, StatsCards.tsx
│   ├── AchievementShowcaseCard.tsx, JourneyToggleCard.tsx
│   ├── SecurityStatusCard.tsx, index.ts
│
└── tools/                     # Tools domain (4 files)
    ├── api.ts, registry.ts, types.ts
    └── components/
```

---

## `hooks/` — Global Hooks (11 files)

```
hooks/
├── useAchievementProgress.ts
├── useAppNotifications.ts     # Shared store (NotificationStore + useSyncExternalStore)
├── useBrowserSupabase.ts
├── useGameBuilder.ts
├── useGameReaction.ts
├── useIsDemo.ts
├── useLatestRef.ts
├── useMFAChallenge.ts
├── useProfileQuery.ts
├── useSessionCapabilities.ts
└── useSubscription.ts
```

---

## `lib/` — Shared Libraries (213 files)

```
lib/
├── currency.ts, factions.ts, multi-language-script.ts
├── palette.ts, trigger-templates.ts, utils.ts
│
├── accessibility/             # A11y utilities (3 files)
├── achievements/              # Achievement data/assets (5 files)
├── admin/                     # Admin nav (2 files)
├── ai/                        # AI feature gate (1 file)
├── analytics/                 # Tracking (2 files)
├── api/                       # API route helpers (4 files)
├── auth/                      # Auth system (8 files)
├── builder/                   # Game builder logic (5+ files)
├── cart/                      # Cart context (2 files)
├── coach-diagrams/            # SVG/court resources (2 files)
├── config/                    # Env config (1 file)
├── consent/                   # Cookie consent manager (4 files)
├── constants/                 # Constants (1 file)
├── context/                   # React contexts (2 files)
├── crypto/                    # Vault encryption (1 file)
├── demo/                      # Demo feature config (1 file)
├── design/                    # Design system resolution (5 files)
├── domain/                    # Domain enums (1 file)
├── features/                  # Feature flags (3 files)
├── game-authoring/            # Game authoring (2 files)
├── game-display/              # Game display logic (5 files)
├── games/                     # Game utils (1 file)
├── gdpr/                      # GDPR handling (2 files)
├── i18n/                      # Internationalization (9 files)
├── import/                    # CSV/JSON import (5 files)
├── journey/                   # Journey logic (3 files)
├── learning/                  # Learning module (3 files)
├── legal/                     # Legal documents (8 files)
├── marketing/                 # Marketing API (4 files)
├── media/                     # Media template (1 file)
├── planner/                   # Planner domain logic (10+ files)
│   ├── ai-assist.ts, analytics.ts, dto.ts, labels.ts
│   ├── index.ts, require-plan-access.ts, scope.ts
│   ├── state-machine.ts
│   ├── hooks/
│   └── server/
├── play/                      # Play runtime logic (5 files)
├── profile/                   # Profile service (5 files)
├── rate-limit/                # Rate limiting (1 file)
├── realtime/                  # Realtime broadcast (3 files)
├── services/                  # Server services (30+ files)
│   ├── achievementService.ts, analyticsService.ts
│   ├── billingService.ts, contentService.ts
│   ├── games.server.ts, gameService.ts
│   ├── gamification-*.server.ts (7 files)
│   ├── imageOptimization.server.ts
│   ├── leaderboardService.ts, marketplaceService.ts
│   ├── mediaFallback.server.ts, moderationService.ts
│   ├── personalizationService.ts, planner.server.ts
│   ├── productAudit.server.ts, progressionService.ts
│   ├── sessionService.ts, socialService.ts
│   ├── supportService.ts, webhook-service.ts
│   ├── mfa/, participants/
├── shop/                      # Shop translations (1 file)
├── stripe/                    # Stripe integration (3 files)
├── supabase/                  # Supabase client factory (8 files)
├── tenant/                    # Tenant resolution (4 files)
├── utils/                     # General utilities (14 files)
└── validation/                # Validation schemas (7 files)
```

---

## `types/` — TypeScript Type Definitions (30 files)

```
types/
├── index.ts                   # Type barrel
├── database.ts, database.types.ts  # DB types (generated + manual)
├── games.ts, game-builder-state.ts, game-snapshot.ts, game-reaction.ts
├── auth.ts, mfa.ts
├── achievement.ts, achievements-builder.ts
├── analytics.ts, design.ts, journey.ts
├── keypad.ts, learning.ts, lobby.ts
├── participant-session-extended.ts
├── planner.ts, play-runtime.ts
├── puzzle-modules.ts, public-api.ts
├── session-cockpit.ts, session-event.ts
├── supabase.ts, tenant.ts, trigger.ts
├── builder-error.ts, csv-import.ts
└── qrcode.d.ts
```

---

## `supabase/` — Database & Edge Functions (341 files)

```
supabase/
├── config.toml                # Supabase local config
├── seed.sql                   # Default seed
├── staging-seed.sql
├── verify_rls_coverage.sql
├── .gitignore
├── .branches/ → _current_branch
├── .temp/                     # CLI cache (versions, refs)
│
├── migrations/                # SQL migrations (12 files)
│   ├── 00000000000000_baseline.sql
│   ├── 20251129000015_participants_domain.sql
│   ├── 20251208130000_role_enum_and_permissions.sql
│   ├── 20251209100000_tenant_domain.sql
│   ├── 20251209103000_tenant_rls_hardening.sql
│   ├── 20260125154500_fix_artifact_state_view_conflict.sql
│   ├── 20260313200000_drop_duplicate_notification_indexes.sql
│   ├── 20260314100000_fix_rls_grants_and_admin_function.sql
│   ├── 20260314200000_fix_demo_sessions_rls_and_rpcs.sql
│   ├── 20260315100000_planner_subtable_rls_tenant_admin.sql
│   ├── 20260315100100_fix_membership_rls_recursion.sql
│   ├── 20260316200000_fix_notifications_global_rls.sql
│   ├── rollback/
│   └── _archived/
│
├── functions/                 # Edge functions (Deno)
│   ├── deno.json
│   ├── cleanup-demo-data/
│   └── purge-anonymized-tenants/
│
├── seeds/                     # Seed data
│   ├── 01_demo_tenant.sql
│   ├── 02_demo_content.sql
│   └── demo_sessions_participants.sql
│
├── snippets/                  # ⚠️ EMPTY
│
└── tests/
    └── test_tenant_rls_isolation.sql
```

---

## `tests/` — Test Suite (106 files)

```
tests/
├── setup.ts                   # Global test setup
├── notifications-shared-store-smoke.ts  # Standalone smoke test
│
├── .auth/                     # Stored auth sessions (5 files)
│   ├── regular-user.json, system-admin.json, tenant-admin.json, user.json
│
├── e2e/                       # Playwright E2E tests (17 files)
│   ├── auth.setup.ts, auth.setup.regular-user.ts
│   ├── auth.setup.system-admin.ts, auth.setup.tenant-admin.ts
│   ├── accessibility.spec.ts, admin-auth.spec.ts
│   ├── director-preview.spec.ts, game-builder.spec.ts
│   ├── game-detail.spec.ts, login-flow-audit.spec.ts
│   ├── participant-experience.spec.ts, personal-license-access.spec.ts
│   ├── planner.spec.ts, profile-resilience.spec.ts
│   ├── session-lifecycle.spec.ts, system-admin-login-flow-audit.spec.ts
│   └── utils/
│
├── unit/                      # Unit tests
│   ├── app/ → browse-data-contract.test.ts, planner-data-contract.test.ts
│   ├── auth/ → (auth tests)
│   ├── builder/
│   ├── game-details/
│   ├── import/
│   ├── media/
│   ├── play/, play-triggers/
│
├── integration/
│   ├── builder/, import/
│
├── fixtures/
│   ├── games/, import/
│
├── helpers/ → buildTriggerIdMap.ts
├── hooks/ → useProfileQuery.test.ts
├── auth/ → server-context-dedupe.test.ts
│
├── admin/ → achievements/
├── browse/ → 4 test files
├── game-display/ → 7 test files + __snapshots__/
├── game-reactions/ → 1 test file
├── gamification/ → 9 test files
├── load/ → README.md, smoke.js
│
└── rls/                       # RLS policy tests
    ├── demo-policies.test.sql
    └── game-reactions-policies.test.sql
```

---

## `sandbox/` — Sandbox/Experimentation (9 files)

```
sandbox/
├── index.ts                   # ⚠️ Only an index file
├── lib-db-removed.md          # Note about removed DB lib
├── README.md
│
├── docs/
│   └── conversation-cards/
│
└── wiki/
    └── (wiki content)
```

---

## `deprecated/` — Deprecated Code (3 files)

```
deprecated/
├── index.ts
├── lib-db-removed.md
└── README.md
```

---

## `public/` — Static Assets (248 files)

```
public/
├── file.svg, globe.svg, next.svg, vercel.svg, window.svg
├── lekbanken-icon.png, lekbanken-icon-green.png
├── lekbanken-icon-purple.png, lekbanken-icon-turq.png
│
├── achievements/ → utmarkelser/    # Achievement badge assets
├── animations/                      # Lottie/animation files
├── avatars/                         # Avatar images
├── coach-diagram/                   # Diagram backgrounds
├── court/                           # Court/play area backgrounds
├── header-phone/                    # Marketing header images
├── icons/
│   ├── app-nav/                     # App navigation icons
│   ├── app-shell/                   # Shell icons
│   └── journey/                     # Journey icons
├── map-background/                  # Map assets
├── sandbox/                         # Sandbox test assets (5 files)
└── sfx/                             # Sound effects
    └── README.md
```

---

## Summarized Directories

### `scripts/` — Build/Migration/Seed Scripts (90 files)

Mix of PowerShell, Python, JavaScript, TypeScript, and SQL scripts for:
- DB migrations and execution (`run-migrations-*.{ps1,py,js}`, `execute-migrations.js`)
- Seed data (`seed-*.ts`)
- i18n audit tooling (`i18n-audit.mjs`, `check-i18n-coverage.mjs`)
- Debug/diagnostic scripts (`debug-*.ts`, `diagnose_*.sql`)
- Import test scripts (`test-*-import*.ts`)
- Inventory generation (`generate-inventory-*.ps1`)
- One-off verification scripts (`verify-*.{ts,mjs}`)
- SQL utility scripts (`sql/`)

### `docs/` — Documentation (297 files, 289 markdown)

18 subdirectories covering every domain. Major categories:
- Domain docs: `games/GAMES_DOMAIN.md`, `PLAY_DOMAIN.md`, `PLANNER_DOMAIN.md`, etc.
- Architecture: `AUTH_ARCHITECTURE_REDESIGN.md`, `play/sessions/SESSION_COCKPIT_ARCHITECTURE.md`
- Implementation plans: `GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md`, etc.
- Audits: `DATABASE_SECURITY_AUDIT.md`, `PROFILE_AUDIT_2026-03-05.md`
- Test plans: `ADMIN_GAMIFICATION_TEST_PLAN.md`, `TESTPLAN_GAME_BUILDER_P0.md`
- Subdirectories: `admin/`, `auth/`, `builder/`, `gamification/`, `gdpr/`, `import/`, `legal/`, `ops/`, `plans/`, `play/`, `qa/`, `reports/`, `sandbox/`, `templates/`, `toolkit/`, `validation/`, `archive/`, `examples/`

### `.github/` — CI/CD (9 files)

```
copilot-instructions.md           # AI agent instructions
pull_request_template.md
PULL_REQUEST_TEMPLATE/
    artifact-state-change.md
workflows/
    baseline-check.yml
    i18n-audit.yml
    rls-tests.yml
    typecheck.yml
    unit-tests.yml
    validate.yml
```

### `messages/` — i18n Translations (3 files)

```
sv.json                            # Swedish (primary)
en.json                            # English
no.json                            # Norwegian
```

### `launch-readiness/` — Launch Program (79 files)

```
launch-readiness/
├── 35+ top-level .md files (architecture, audits, plans)
├── audits/                    # 36 domain-specific audit files
└── implementation/            # 11 remediation/execution plans
```

### `eslint-rules/` — Custom ESLint Rules (3 files)

```
index.cjs
no-hardcoded-strings.cjs
no-manual-profile-fetch.cjs
```

---

## Legacy / Suspect Files

```
# _legacy-page.tsx files (6 total — in admin routes)
app/admin/gamification/levels/_legacy-page.tsx
app/admin/leaderboard/_legacy-page.tsx
app/admin/licenses/_legacy-page.tsx
app/admin/marketplace/_legacy-page.tsx
app/admin/media/_legacy-page.tsx
app/admin/purposes/_legacy-page.tsx

# .bak files (3 total)
GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak
GAMEDETAILS_SECTION_ANALYSIS.md.bak
app/admin/tickets/page.tsx.bak

# Legacy-named source files
app/sandbox/atlas/hooks/useInventoryLegacy.ts
features/play/components/ParticipantPlayView.legacy.tsx

# Empty directories
components/layout/                  # Empty
supabase/snippets/                  # Empty
```
