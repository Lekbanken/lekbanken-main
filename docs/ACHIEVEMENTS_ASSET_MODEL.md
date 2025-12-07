# Achievements Badge Assets & Icon Model

This document explains how the **Utmärkelser** icon pack is wired into the Achievements Admin badge builder.

## Asset registry
- Source assets live locally at `C:\Users\infen\.codex\Utmärkelser\` with subfolders:
  - `SM - 128x128`
  - `MD - 256`
  - `LG - 512x512`
  - (`Org-size 2048x2048` exists but is not used right now)
- The code defines the registry in `features/admin/achievements/assets.ts`:
  - Types: `AchievementAsset`, `AchievementAssetType`, `AchievementAssetSize`
  - Functions: `getAssetsByType`, `getAssetById`, `resolveAssetUrl`
  - Assets are mapped to three sizes (sm/md/lg). The paths are built from either:
    - `NEXT_PUBLIC_ACHIEVEMENTS_ASSET_BASE_SM|MD|LG` (explicit), **or**
    - `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/custom_utmarkelser/{size}` (Supabase public bucket), **or**
    - `/achievements/utmarkelser/{size}` (local/public fallback)

## Storage layout (Supabase)
- Bucket name: `custom_utmarkelser`
- Paths inside bucket:
  - `sm/{assetId}.png`
  - `md/{assetId}.png`
  - `lg/{assetId}.png`
- Asset IDs match filenames without extension (e.g. `bg_wings_2.png` → `bg_wings_2`).

## Upload script
- Script: `scripts/upload-utmarkelser.ts`
- Reads from `ASSET_SOURCE_ROOT` (default `C:\Users\infen\.codex\Utmärkelser`)
- Uploads all PNGs from the three size folders to the `custom_utmarkelser` bucket (upsert).
- Requires env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (service role) – **do not expose publicly**
- Run: `npx ts-node scripts/upload-utmarkelser.ts` (or add an npm script if desired).

## Local mirror (fallback)
- Script: `scripts/sync-utmarkelser-local.ts`
- Copies PNGs from the local source into `public/achievements/utmarkelser/{sm,md,lg}` so dev builds can run without network.
- Run: `npm run sync:utmarkelser:local` (set `ASSET_SOURCE_ROOT` if different).

## Icon config model
- Types live in `features/admin/achievements/types.ts`
- `AchievementIconConfig`:
  - `mode`: `"theme"` | `"custom"`
  - `themeId`: optional, used in theme mode
  - `size`: `"sm" | "md" | "lg"`
  - `layers`: `{ base?: string; background?: string; foreground?: string; symbol?: string }`
  - `customColors`: per-layer hex overrides
- Assets are looked up by ID in the registry; the UI renders only the needed size (sm/md for selectors, lg for preview).

## Themes & colors
- Defined in `features/admin/achievements/data.ts` as `AchievementTheme[]`.
- Each theme provides per-layer colors: base, background, foreground, symbol.
- The builder supports:
  - **Theme mode**: pick a preset, uses theme colors.
  - **Custom mode**: per-layer color pickers; overrides the theme.

## Profile frame sync (structural support)
- Type: `ProfileFrameSyncConfig` (enabled + optional settings).
- Stored on `AchievementItem.profileFrameSync`. Currently only toggled in admin UI; runtime behaviour is not implemented yet.

## Referencing icons in the database
- Suggested columns (not migrated automatically):
  - `icon_base_id`, `icon_background_id`, `icon_foreground_id`, `icon_symbol_id`
  - `icon_size_preference`
  - `icon_config` (jsonb) mirroring `AchievementIconConfig` for future-proofing
- Current admin UI persists/stores registry-friendly asset IDs, not raw URLs.
