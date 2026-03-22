# Journey v2.0 — Changelog

## Metadata

- Owner: -
- Status: archived
- Date: 2026-03-06
- Last updated: 2026-03-21
- Last validated: -

> Archived changelog for the superseded Journey v2 workstream. Keep as implementation history only.

**Purpose:** All changes from the Journey v2.0 implementation (Steps 1–8).

---

## Step 1 — Faction Rename (sky → desert)

- Renamed faction `sky` to `desert` across all code, types, i18n, and DB references
- Updated `FactionId` type union: `'forest' | 'sea' | 'desert' | 'void'`
- Updated faction theme colors: desert = `#f59e0b`

## Step 2 — Database Schema

- Created `cosmetics` table: catalog of all cosmetic items with `render_type` + `render_config` (JSONB)
- Created `user_cosmetics` table: tracks which cosmetics each user has unlocked
- Created `cosmetic_unlock_rules` table: configurable unlock conditions per cosmetic
- Created `cosmetic_loadout` table: user's active equipment (1 slot per category)
- RLS policies: users can SELECT cosmetics, SELECT own user_cosmetics, but NOT INSERT (service role only)

## Step 3 — Cosmetic API

- `GET /api/gamification/cosmetics` — Public catalog (active items only)
- `GET /api/gamification/cosmetics/loadout` — User's active loadout with resolved render configs
- `POST /api/gamification/cosmetics/equip` — Equip a cosmetic (validates ownership)
- `POST /api/gamification/cosmetics/unequip` — Unequip a slot

## Step 4 — Loadout Rendering

- 5 render types: `svg_frame`, `css_background`, `css_particles`, `xp_skin`, `css_divider`
- Typed render config interfaces: `SvgFrameConfig`, `CssBackgroundConfig`, `CssParticlesConfig`, `XpSkinConfig`, `CssDividerConfig`
- `GamificationPage` renders equipped cosmetics from loadout API
- `JourneyScene` supports `backgroundConfig`, `ParticleField` supports `loadoutConfig`

## Step 5 — CosmeticControlPanel

- Tab-based equip/unequip panel in `features/gamification/components/CosmeticControlPanel.tsx`
- 5 cosmetic category tabs: avatar_frame, scene_background, particles, xp_bar, section_divider
- `CosmeticCard` sub-component per item (rarity badge, faction indicator, equip/unequip)
- Optimistic UI updates on equip/unequip
- Replaced `SkillTreeSection` as the cosmetic management UI

## Step 6 — Unlock Motor

- `lib/journey/cosmetic-grants.ts` — `checkAndGrantCosmetics()` server-side auto-granter
- Evaluates `cosmetic_unlock_rules` against user progress (level, achievements, etc.)
- Uses service role client to insert into `user_cosmetics`
- Triggered after XP gain / level up events
- `CosmeticUnlockToast` client component for unlock notifications

## Step 7 — Admin UI

- `app/admin/cosmetics/` — System-admin-only cosmetic management
- 4 API routes under `app/api/admin/cosmetics/`:
  - `GET/POST /api/admin/cosmetics` — List + create cosmetics
  - `PUT/DELETE /api/admin/cosmetics/[id]` — Update + soft-delete
  - `GET/POST/DELETE /api/admin/cosmetics/[id]/rules` — Unlock rule CRUD
  - `POST /api/admin/cosmetics/grant` — Manual grant to user (idempotent upsert)
- `lib/journey/cosmetic-schemas.ts` — Zod validation schemas with per-render-type config validation
- All endpoints gated by `requireSystemAdmin()` (403 for non-admin, 401 for unauthenticated)
- i18n keys under `admin.gamification.cosmetics.*` in all 3 language files
- Admin nav registration in `lib/admin/nav.ts`

## Step 8 — Cleanup + Subroute-gating

### 8a — SkillTree Deprecation
- Marked `features/gamification/data/skill-trees.ts` as `@deprecated` (kept as fallback until v2.1)
- Marked `features/gamification/components/SkillTreeSection.tsx` as `@deprecated` (no production imports)

### 8b — Subroute Gating
- Created `lib/journey/getJourneyEnabled.ts` — server-side utility to check Journey activation
- Implemented proof-of-concept gating on `/app/gamification/achievements` page
- Documented gating plan for `/coins` and `/events` subroutes (future work)

### 8c — Profiling

**Verified (code-level):**
- `GamificationPage` is lazy-loaded via `next/dynamic` (ssr: false) — cosmetic chunk structurally isolated
- Admin cosmetic routes use `createServiceRoleClient()` (bypasses RLS correctly)

**Pending manual / operational verification:**
- Bundle separation: `ANALYZE=true next build` not run (`@next/bundle-analyzer` not installed)
- Standard-view chunk exclusion: not measured, only inferred from dynamic import structure
- API latency (< 300ms target): not measured against staging/production
- RLS verification for Journey tables (`cosmetics`, `user_cosmetics`, `user_cosmetic_loadout`, `cosmetic_unlock_rules`): requires manual Supabase testing

### 8d — Documentation
- Updated `PROJECT_CONTEXT.md` with Journey v2.0 domain and status
- Created this changelog (`Journey_v2_CHANGELOG.md`)

---

## Test Coverage Summary

| Test File | Tests | Scope |
|-----------|-------|-------|
| `step4-loadout-rendering.test.ts` | 24 | Render type schemas, config resolution |
| `step5-cosmetic-panel.test.ts` | 59 | CosmeticControlPanel contracts, category mapping |
| `step6-unlock-motor.test.ts` | 45 | Unlock rule evaluation, grant logic |
| `step7-admin-ui.test.ts` | 110 | Zod schemas, i18n completeness, nav registration |
| `step7-behavioral.test.ts` | 63 | Auth gates, API CRUD, render_config roundtrip, rule/grant behavior |
| `step8-cleanup.test.ts` | 21 | Deprecation markers, gating utility, bundle separation, documentation |

Full regression: **1504 passed, 48 skipped, 0 failures** (59 test files)

---

## Post-review Polish (2026-03-06)

### i18n: Cosmetic Item Names
- Added `cosmetics` namespace with all 24 item name/description translations to `sv.json`, `en.json`, `no.json`
- Fixed `CosmeticControlPanel` to translate `nameKey` via `useTranslations()` instead of showing raw i18n keys
- Fixed "Active" indicator to also translate the equipped item's nameKey

### UI Polish (CosmeticCard + CosmeticControlPanel)
- **Hover scale:** `hover:scale-105` on unlocked cards, `hover:scale-[1.03]` on equipped (matches SkillTreeSection feel)
- **Stronger equipped glow:** Dual-layer `boxShadow` (`0 0 16px accent50 + 0 0 30px accent20`), `2px solid` border, `accent20` background
- **Stronger locked/unlocked contrast:** Locked opacity `0.5 → 0.35` (matches SkillTree), lock overlay `bg-black/40 → bg-black/50`
- **Fixed card height:** `minHeight: 100px` + `justify-center` for consistent grid alignment
- **Grid width:** `minmax(90px, 1fr) → minmax(130px, 1fr)` for readable card content
- **Footer hint:** Added `"Tryck på en kostym för att aktivera eller byta"` below grid (`text-[10px] text-white/30`)
- Added `hint` i18n key to `cosmeticPanel` namespace in all 3 language files
