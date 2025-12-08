# DOMAIN: GAMES - KEY LEARNINGS FOR NEXT DOMAINS

This document summarizes the main architectural and implementation lessons learned from the current GAMES domain implementation. It should be used as guidance when designing and implementing future domains in Lekbanken.

---

## 1. Prefer API routes over direct Supabase access

The GAMES domain now exposes a clear API surface:

- `POST /api/games` – create
- `GET /api/games/[gameId]` – read single with relations
- `PATCH /api/games/[gameId]` – update
- `POST /api/games/[gameId]/publish` – publish with guards
- `POST /api/games/search` – search published games

Legacy modules (`lib/db/games.ts`, `lib/db/browse.ts`, `lib/services/gameService.ts`) still talk directly to Supabase tables and use the old media model.

**Guideline for new domains:**

- New features should primarily use Next API routes + server-side RLS clients.
- Legacy direct-Supabase helpers should be:
  - Either migrated to the new schema/relations model, or
  - Gradually deprecated and replaced by API-driven flows.

---

## 2. Treat translations and media as first-class domain concepts

GAMES introduced:

- `game_translations` – per-locale content (title, short_description, instructions, materials).
- `game_media` – explicit mapping between games and media with:
  - `kind` enum (`cover` | `gallery`)
  - `position`
  - `alt_text`

The UI uses a clear locale fallback chain: `sv -> no -> en`.
Cover images are resolved from `game_media` (kind = cover).

**Guideline for new domains:**

- Model translations and media explicitly when they are part of the domain.
- Define a clear locale fallback strategy and stick to it.
- Do not overload the main table with ad-hoc translated fields or implicit media fields.

---

## 3. Publishing is a separate, guarded flow

Publishing is implemented as a dedicated endpoint:

- `POST /api/games/[gameId]/publish`:
  - Checks user role (admin/owner via `app_metadata.role`).
  - Validates `hasCoverImage` and the actual existence of a cover record in `game_media`.
  - Only then moves the game to `status = 'published'`.

**Guideline for new domains:**

- When content has draft vs published states, use explicit publish/unpublish flows.
- Implement guards that enforce:
  - Required fields
  - Required relations (e.g., translations, media)
  - Role/permission constraints

Do not rely solely on generic “status update” logic.

---

## 4. Manage legacy vs new implementations intentionally

In GAMES, we currently have:

- New architecture:
  - API routes
  - `game_translations`, `game_media`
  - New SSR detail and Play flows
- Legacy components:
  - Old browse helpers joining the old `media` table
  - `games.instructions` vs translation-based instructions
  - Planner still using mock/in-memory data

This coexistence is acceptable but must be explicit.

**Guideline for new domains:**

- Always identify legacy patterns and clearly separate them from new patterns.
- For each domain, maintain a small migration plan:
  - What should be phased out
  - What should be updated to use new schemas/services
- Add clear TODOs with rationale instead of silently layering new code on top of old.

---

## 5. Planner as a warning example

The current Planner:

- Uses fully mocked data.
- Does not integrate with the new API, translations, or media.
- Represents the desired UX but not the real system.

**Guideline for new domains:**

- Mocked UIs are acceptable as a first step, but:
  - They must have a clearly defined “Phase 2” where they integrate with real APIs.
  - That phase must be documented as a concrete TODO (not just “we’ll fix it later”).

---

## 6. Documentation must follow reality

We already have `docs/DOMAIN_GAMES_TODO.md` and Notion domain docs, but parts of them are now outdated.

**Guideline for new domains:**

- Each domain should have:
  - A `DOMAIN_<NAME>_TODO.md` (or similar) in the repo.
  - A corresponding Notion entry describing:
    - Current schema
    - API endpoints
    - Main UI flows
- Whenever we:
  - Add/rename fields
  - Introduce new relations
  - Add or refactor API endpoints
  -> we should adjust the domain docs accordingly.

---

## 7. Patterns to reuse in other domains

From GAMES, the following patterns are worth reusing:

1. API-first approach for domain operations (create/update/publish/search).
2. Server RLS client for safe, tenant-aware queries in API routes.
3. Locale-aware translation system with fallback logic.
4. Media mapping tables with `kind` + `position` instead of implicit media.
5. Publish endpoint with strict guards for content readiness and permissions.
6. SSR detail pages + client play/interaction flows consuming the same structured API response.
7. Seeds that mirror real data structures (translations, media mappings, short descriptions).

