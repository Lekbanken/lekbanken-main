# Implementation Log — Play Artifacts (Media Upload + Hotspots + Audio)

Date started: 2025-12-29

## Goal
Make Map/Hotspot + Audio artifacts usable end-to-end:
- Sandbox: upload image/audio + hotspot placement/editing
- Admin Game Builder: configure artifacts using same editor components
- Play: participant can use artifacts; host can see participant location/scene

## Process rules
- This is the single continuous log file for this initiative.
- Before each step/subtask: write a short plan + TODO checklist.
- After completing each step/subtask: mark TODOs done + notes + follow-ups.
- **Status semantics:** see `ARTIFACT_COMPONENTS.md §9 ArtifactStateStatus Contract` for the canonical list of allowed `ArtifactStateStatus` values, guard guidance, and the change checklist. Do not duplicate status tables here.

---

## Step 0 — Repo discovery (DONE)

### Plan
1. Identify current artifact data model + config storage (DB + types)
2. Identify existing sandbox map/hotspot + audio implementations
3. Identify existing Supabase Storage upload patterns (public vs signed URLs)
4. Identify existing auth/role helpers (system_admin/org_admin) and tenant isolation patterns
5. Summarize findings and refine an implementation checklist for Steps 1–6

### TODO
- [x] Find artifact config storage + schemas (DB fields, TypeScript types)
- [x] Find current sandbox map/hotspot/audio implementations
- [x] Find Supabase Storage usage patterns (bucket naming, signed/public URLs)
- [x] Find auth/role guards used in Admin routes + APIs
- [x] Decide URL strategy (signed vs public) consistent with repo
- [x] Update refined checklist for Step 1–6

### Findings (to be filled)

#### Media upload/storage (existing)
- API: [app/api/media/upload/route.ts](app/api/media/upload/route.ts)
	- Uses `createSignedUploadUrl(path)` (5 minutes TTL) and returns `{ uploadUrl, token, path, bucket, instructions }`.
	- Validates payload with Zod.
	- Bucket allowlist currently: `tenant-media`, `custom_utmarkelser`, `game-media`.
	- File size max: 10MB.
	- Path format:
		- If `tenantId` provided: `${tenantId}/${timestamp}-${sanitizedFileName}`
		- Else: `public/${timestamp}-${sanitizedFileName}`
- API: [app/api/media/upload/confirm/route.ts](app/api/media/upload/confirm/route.ts)
	- Requires authenticated user.
	- Returns `supabase.storage.from(bucket).getPublicUrl(path)`.
	- NOTE: currently does not Zod-validate bucket/path or enforce an allowlist.
- Admin UI uses this flow today:
	- [components/ui/media-picker.tsx](components/ui/media-picker.tsx): hard-codes upload bucket `tenant-media`.
	- [features/admin/media/TenantMediaBank.tsx](features/admin/media/TenantMediaBank.tsx): also uploads to `tenant-media`.
- Docs confirm this design:
	- [docs/MEDIA_DOMAIN.md](docs/MEDIA_DOMAIN.md) notes confirm returns `getPublicUrl` and that private buckets should use signed download URLs instead.

#### Media DB model (existing)
- `media` table stores `{ id, url, type ('template'|'upload'|'ai'), tenant_id, ... }`.
- `game_media` table associates a `media_id` to a `game_id` (and `tenant_id`, `kind`, `alt_text`).
	- This is the primitive used widely to attach media to game content.

#### Artifacts DB model + how Play reads them (existing)
- Authoring tables:
	- `game_artifacts`: main artifact row, includes `artifact_type` and `metadata` JSON (config/state per artifact type).
	- `game_artifact_variants`: variant rows with `media_ref` and `metadata` JSON (visibility, step/phase gating, etc).
- Runtime snapshot tables:
	- Host snapshots into `session_artifacts` + `session_artifact_variants`.
	- Snapshot API: [app/api/play/sessions/[id]/artifacts/route.ts](app/api/play/sessions/[id]/artifacts/route.ts)
- Important: `session_artifact_variants.media_ref` is a FK to `game_media.id` (not `media.id`, and not a raw URL).
	- See Supabase types: [types/supabase.ts](types/supabase.ts)
- Participant API returns variants with `media_ref` but treats it as `unknown` today (no resolution to URL yet):
	- [features/play/api/primitives-api.ts](features/play/api/primitives-api.ts)

#### Hotspot + Audio runtime config conventions (existing)
- Play runtime renders many artifact types via:
	- [features/play/components/PuzzleArtifactRenderer.tsx](features/play/components/PuzzleArtifactRenderer.tsx)
- For `audio` artifacts it reads from `artifact.metadata`:
	- `audioUrl` or fallback `src`
	- `autoplay`/`autoPlay`, `requireAck`, etc
- For `hotspot` artifacts it reads from `artifact.metadata`:
	- `imageUrl`
	- `zones` (or fallback `hotspots`) with `{id,x,y,radius,label?,required?}`
- The interactive component used is:
	- [components/play/HotspotImage.tsx](components/play/HotspotImage.tsx)

#### Sandbox map/hotspot/audio (existing)
- Sandbox harness uses Zod schemas that already accept absolute URLs and root-relative `/path` URLs:
	- [app/sandbox/artifacts/schemas.ts](app/sandbox/artifacts/schemas.ts)
- Sandbox already has stable local test assets under `/public/sandbox/*` (hotspot svg + audio wav).

### Notes

#### Implications for this initiative
- We should reuse the existing `/api/media/upload` signed-upload flow for new buckets rather than inventing a second upload protocol.
- Because `/api/media/upload/confirm` returns `getPublicUrl`, “private-by-default” media requires additional work (signed download URLs or proxy endpoint). If we keep buckets public, we can ship faster but must accept that URLs are public.
- Current Admin Game Builder artifact configuration for `audio`/`hotspot` is URL-based and stored in `artifact.metadata` (not `media_ref`). That means:
	- Our new “upload + editor” work must either:
		- produce the same `metadata.imageUrl` / `metadata.audioUrl` (for backward compatibility), OR
		- introduce a new `mediaRef` form and add a server-side resolver that converts `game_media.id` → `media.url` in Play.

### Refined checklist for Steps 1–6

#### Step 1 — Storage helpers (Supabase)
- Add `media-images` and `media-audio` bucket support in [app/api/media/upload/route.ts](app/api/media/upload/route.ts) allowlist.
- Harden [app/api/media/upload/confirm/route.ts](app/api/media/upload/confirm/route.ts): Zod-validate payload + enforce same allowlist.
- Decide URL strategy:
	- Public URL: keep confirm as `getPublicUrl`.
	- Private URL: add a dedicated download endpoint returning signed URLs (and update clients).

#### Step 2 — Reusable editors
- Build `InteractiveImageEditor` (upload + hotspot placement) that outputs enterprise refs:
	- `{ imageRef: { bucket, path }, zones: [{id,x,y,radius,label,required}] }`
- Build `AudioUploadEditor` (upload + config) that outputs enterprise refs:
	- `{ audioRef: { bucket, path }, autoPlay, requireAck }`

#### Step 3 — Sandbox integration
- Wire Sandbox artifact scenarios to use the new editors + upload flow.
- Ensure adapters keep older sandbox configs working (existing `/path` URLs remain valid).

#### Step 4 — Admin integration
- Replace raw URL inputs in [app/admin/games/builder/components/ArtifactEditor.tsx](app/admin/games/builder/components/ArtifactEditor.tsx) for `audio`/`hotspot` with the reusable editors.
- Keep emitting `artifact.metadata` in the shape used by Play (`audioUrl`, `imageUrl`, `zones`).

#### Step 5 — Play integration
- Ensure Play runtime renders the new metadata without change.
- If we introduce `media_ref` usage for these artifact types, add URL resolution server-side (join `game_media -> media`), and update client types.

#### Step 6 — Manual verification
- Upload image/audio via Sandbox → verify URLs resolve and artifacts render.
- Configure hotspot + audio in Admin Game Builder → publish → start session → verify Play.
- Verify auth restrictions: unauthenticated upload/confirm rejected; bucket allowlist enforced.

### Follow-ups

---

## Step 1 — Storage layer (media-images + media-audio)

### Plan
1. Extend `/api/media/upload` bucket allowlist to include `media-images` and `media-audio`
2. Harden `/api/media/upload/confirm` with Zod validation + same allowlist
3. Initial default was public URLs, but we are pivoting to an enterprise strategy:
	- Treat `media-images` and `media-audio` as private buckets
	- Use signed URLs for preview/consumption

### TODO
- [x] Add `media-images`/`media-audio` to upload allowlist
- [x] Validate confirm payload (bucket/path) + enforce allowlist
- [x] Update docs where bucket list is described (if needed)
- [x] Run `npm run lint` + `npm test`

### Notes
- Enterprise decision (2025-12-29): for artifact-specific media, store `{bucket,path}` and resolve to signed URLs server-side (or on confirm for preview). Avoid persisting expiring URLs in DB configs.

---

## Step 2 — Reusable editors (enterprise refs)

### Plan
1. Build `InteractiveImageEditor` that uploads to `media-images` and outputs `{ imageRef: {bucket,path}, zones: [...] }`
2. Build `AudioUploadEditor` that uploads to `media-audio` and outputs `{ audioRef: {bucket,path}, autoPlay, requireAck }`
3. Editors use `/api/media/upload` + `/api/media/upload/confirm` to get a short-lived signed preview URL

### TODO
- [x] Add `InteractiveImageEditor` component
- [x] Add `AudioUploadEditor` component
- [x] Ensure lint + tests are green

---

## Step 3 — Sandbox integration (enterprise refs)

### Plan
1. Extend Sandbox Zod schemas to accept `{bucket,path}` refs for hotspot image + audio
2. Wire Sandbox admin UI to use `InteractiveImageEditor` + `AudioUploadEditor`
3. Update Sandbox renderer to resolve refs → signed URLs at runtime (host/participant)
4. Keep backwards compatibility with existing absolute URLs and `/path`

### TODO
- [x] Extend sandbox schemas (`imageRef` + `audioRef`, keep url/src working)
- [x] Make editors reload-safe by re-resolving preview URLs from stored refs
- [x] Wire editors into Sandbox admin UI (hotspot + audio)
- [x] Resolve refs in Sandbox ArtifactRenderer
- [x] Run `npm run lint`, `npm run type-check`, `npm test`

### Notes
- Requires Supabase Storage buckets + RLS policies for `media-images` and `media-audio`.
	- Migration: [supabase/migrations/20251229090000_media_artifact_buckets.sql](supabase/migrations/20251229090000_media_artifact_buckets.sql)
	- Apply (local): `npx supabase db push`
	- Apply (linked/remote): `npx supabase db push --linked`
- Schema changes: [app/sandbox/artifacts/schemas.ts](app/sandbox/artifacts/schemas.ts)
- Admin UI editors: [app/sandbox/artifacts/page.tsx](app/sandbox/artifacts/page.tsx)
- Runtime ref → signed URL resolution: [app/sandbox/artifacts/ArtifactRenderer.tsx](app/sandbox/artifacts/ArtifactRenderer.tsx)
- Editors reload-safe previews: [components/ui/interactive-image-editor.tsx](components/ui/interactive-image-editor.tsx), [components/ui/audio-upload-editor.tsx](components/ui/audio-upload-editor.tsx)

---

## Step 4 — Admin Game Builder integration (DONE)

### Plan
1. Wire `InteractiveImageEditor` into Admin `hotspot` artifact configuration
2. Wire `AudioUploadEditor` into Admin `audio` artifact configuration
3. Persist enterprise refs `{bucket,path}` in `artifact.metadata` (do not store signed URLs)
4. Keep URL-based fields for backward compatibility until Step 5 updates Play to resolve refs

### TODO
- [x] Integrate `AudioUploadEditor` into Admin `audio`
- [x] Integrate `InteractiveImageEditor` into Admin `hotspot`
- [x] Store `audioRef`/`imageRef` and keep `audioUrl`/`imageUrl` inputs

### Notes
- Admin integration implemented in:
	- [app/admin/games/builder/components/ArtifactEditor.tsx](app/admin/games/builder/components/ArtifactEditor.tsx)
	- [app/admin/games/builder/components/ArtifactWizard.tsx](app/admin/games/builder/components/ArtifactWizard.tsx)
- Data shape:
	- `audio` artifacts now support `metadata.audioRef` alongside legacy `metadata.audioUrl`.
	- `hotspot` artifacts now support `metadata.imageRef` alongside legacy `metadata.imageUrl`.
	- `zones` are edited visually via the image editor and stored in `metadata.zones`.
- Important: Play currently reads `audioUrl/src` and `imageUrl/zones` (no ref resolution yet). Step 5 will add ref → signed URL resolution in Play runtime.


