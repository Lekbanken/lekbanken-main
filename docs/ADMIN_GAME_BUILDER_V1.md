\# Admin Game Builder (builder API + v2 content)

Goal: Ett enhetligt Game Builder-flöde i `/admin/games` som stödjer både enkla lekar och mer avancerade upplägg (faser/roller/board-config) utan separata “wizards”.

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- UI entrypoints:
  - `app/admin/games/page.tsx`
  - `app/admin/games/new/page.tsx`
  - `app/admin/games/[gameId]/edit/page.tsx`
  - `app/admin/games/builder/*`
  - `features/admin/games/GameAdminPage.tsx`
- Builder API:
  - `app/api/games/builder/route.ts` (POST)
  - `app/api/games/builder/[id]/route.ts` (GET/PUT)
- Runtime consumption (app):
  - `lib/services/games.server.ts` (hämtar `game_steps`)
  - `app/app/games/[gameId]/page.tsx` (renderar steps → fallback)
- DB migrations:
  - `supabase/migrations/20251216010000_game_builder_p0.sql` (game_steps, game_materials, games.*)
  - `supabase/migrations/20251216020000_game_phases.sql` (game_phases + FK)
  - `supabase/migrations/20251216030000_game_roles.sql` (game_roles + participant_role_assignments)
  - `supabase/migrations/20251216040000_game_board_config.sql` (game_board_config)

## Validation checklist

- `/admin/games/new` och `/admin/games/[id]/edit` fungerar och använder `/api/games/builder*`.
- Builder sparar `games.game_content_version = 'v2'` och skriver `game_steps`.
- App-detaljvyn visar steps i denna ordning: `game_steps` → `game_translations.instructions[]` → `games.instructions`.
- Faser/roller/board-config sparas endast om motsvarande tabeller finns (migrations körda).

---

## 1) Nuläge (verifierat i repo)

- **Admin UI**:
  - Spellista: `/admin/games` (med knappar för Builder + CSV import/export).
  - Builder: `/admin/games/new` och `/admin/games/[gameId]/edit`.
  - Detalj: `/admin/games/[gameId]`.
- **API**:
  - `POST /api/games/builder` skapar ett spel (kräver `name` + `short_description`) och sätter `game_content_version='v2'`.
  - `GET/PUT /api/games/builder/[id]` läser/sparar builder-data (core, steps, materials, phases, roles, boardConfig, secondaryPurposes, coverMedia).
- **DB (nuvarande tabeller)**:
  - `games` + `game_steps` + `game_materials`.
  - `game_phases` (valfritt, om P2a är kört).
  - `game_roles` + `participant_role_assignments` (valfritt, om P2b är kört).
  - `game_board_config` (valfritt, om P2c är kört).
  - Kopplingar som builder använder: `game_secondary_purposes`, `game_media` (cover).
- **App (runtime-konsumption)**:
  - `getGameById()` hämtar `steps:game_steps(*)` och `materials:game_materials(*)`.
  - Speldetaljen (`/app/games/[gameId]`) renderar `game_steps` om de finns, annars fallback till `game_translations.instructions` (array), annars `games.instructions` (text).

## 2) Modell: GameCore + builder-moduler

Buildern organiserar innehåll i **GameCore** + valfria moduler som kan aktiveras via `play_mode`.

- **GameCore (obligatorisk)**: metadata i `games` (name, short_description, status, owner_tenant_id, product/purpose, mm).
- **Steps (struktur)**: `game_steps` (title/body/duration, leader_script/participant_prompt/board_text, optional/conditional).
- **Materials (play readiness)**: `game_materials` (items, safety_notes, preparation).
- **Phases/Rounds (P2a)**: `game_phases` och `game_steps.phase_id` (FK).
- **Roles (P2b)**: `game_roles` (+ runtime `participant_role_assignments`).
- **Board config (P2c)**: `game_board_config` (togglar + theme + bakgrund).
- **Planerat/ej implementerat här**: “actions”-modell och per-fas board-content finns inte som DB-modell i nuvarande migrations; håll sånt i spec-dokument (t.ex. `GAME_BUILDER_UI_SPEC.md`) tills det finns i schema/API.

## 3) Valideringsnivåer (praktiskt)

- Draft: `name` + `short_description` (API kräver) + `status='draft'`.
- Playable (guideline): minst ett steg (via `game_steps`) + rimlig metadata.
- Publishable (guideline): cover satt (via `game_media` kind=cover), syfte/produkt enligt innehållskrav.
- Versioning: `games.game_content_version` används som flagga (`v1` legacy, `v2` strukturerat innehåll). Builder skriver `v2`.

## 4) Backåtkompatibilitet

- Appen är tolerant: den renderar `game_steps` om de finns; annars fallback till `game_translations.instructions[]`; annars `games.instructions`.
- Det innebär att gamla spel kan leva vidare utan att “konverteras” direkt.

## 5) Fältdjup (sektioner)
**A) Core metadata**  
- name, short_summary (short_description), full_description, status, owner_tenant_id, product_id, main_purpose_id, sub_purposes[], categories/tags, energy_level, location_type/environment, age_min/max, players_min/max/recommended, duration_min/max, difficulty, accessibility_notes, space_requirements, leader_tips, game_key/slug (if needed), play_mode, game_content_version.

**B) Play readiness**  
- materials list (localized), preparation steps (list), safety notes, leader tips (concise), group size constraints, environment/space requirements.

**C) Instruction model (game_steps)**  
- order, locale, phase_id?, title, body (rich text/markdown), duration_seconds, media_ref (game_media id), leader_script (optional), participant_prompt (optional), board_text (optional/public), flags (optional, conditional).

**D) Session/Flow (game_phases)**  
- order, name, description, entry_condition, exit_condition, suggested_status (locked/paused allowed), recommended_persistence_mode.

**E) Participants/Roles (game_roles)**  
- locale, name, description, max_count, is_public (if false -> private notes only to host), private_notes, secrets, assignment_strategy (random/host/manual), board_text (public), constraints (requires_min?).

**F) Actions (game_actions)**  
- action_type (vote/answer/choice), prompt, options, validation rules, payload_schema jsonb, host_override_allowed bool, phase_id optional.

**G) Public Board (game_boards)**  
- locale, phase_id optional, content markdown/jsonb, visibility=public, media_refs.

**H) Localization / ownership**  
- Locales: sv/no/en. Fallback: if locale missing, use default (sv). Track completeness (% fields filled). Owner_tenant_id controls edit rights; system_admin override.

**I) Media**  
- Cover (required for publish), gallery optional, per-step media_ref (FK to game_media). Board visuals can reference media.

**J) Gamification hooks**  
- Placeholder fields for event keys (`game_played`, `session_logged`), no runtime implementation in P0.

## 5) UI/UX (routing och entrypoints)

- Nya spel: `/admin/games/new`
- Redigera: `/admin/games/[id]/edit`
- Listan (`/admin/games`) länkar till Builder per rad samt en global “Builder”-knapp.

## 7) Implementationplan (faser)
**P0 (MVP Builder & data-minimum)**  
- Ny builder-sidor `/admin/games/new` och `/admin/games/[id]/edit`; ersätt modalen som huvudflöde (modal kan vara quick-create).  
- Frontend: sektioner för Core, Play Readiness (materials, safety, tips), Instructions (structured steps), Media, Localization summary, Validation.  
- Backend/API:  
  - Nya tabeller: `game_steps`, `game_materials` (min), nya kolumner på games: `game_content_version`, `play_mode`, `duration_max`, `players_recommended`, `difficulty`, `accessibility_notes`, `space_requirements`, `leader_tips`.  
  - API för create/update att skriva både legacy och nya tabeller; bibehåll `game_translations`.  
  - Play mapper: använd `game_steps` om version v2 annars fallback (övriga konsumenter orörda).  
- Migration: fyll `game_steps` från translation.instructions och games.instructions, sätt `game_content_version='v2'` för migrerade spel, annars v1.
- Dokumentation: denna spec + kort testplan.  
- UI-validering: kräver cover? -> endast vid publish; Playable kräver minst 1 step.

**P1 (SessionFlow / Phases)**  
- Tabell `game_phases` + koppla `game_steps.phase_id`.  
- Builder: sektion “Faser” + visa steps per fas.  
- API: spara/läsa faser; Play kan ignorera (fallback).

**P2 (Roles + Actions + Board authoring)**  
- Tabeller `game_roles`, `game_actions`, `game_boards`, `game_variations` (om vi hinner).  
- Builder: sektioner för roller (kort), actions (schemaform), board content.  
- Inga runtime-förändringar ännu; endast authoring + lagring.  

## 6) Testplan

Se `docs/TESTPLAN_GAME_BUILDER_P0.md`.

## 7) Nästa steg / TODO

- Om vi vill ha “actions” eller per-fas board-content: börja i DB-schema + API (inte i UI), och uppdatera sedan spec-dokument.
- Dokumentera rollernas runtime-flöde (koppling till `participant_sessions`) när det finns UI/rutter för sessions.

## Referenser i kodbasen (nuvarande flöden)
- Admin list/detail: `features/admin/games/*`, `app/admin/games` pages.  
- Game detail (Play): `app/app/games/[gameId]/page.tsx` – pickTranslation, använder translation.instructions array om finns.  
- Schema: `types/supabase.ts` (`games`, `game_translations`, `game_media`).  
- Play sessions (om koppling behövs): `participant_sessions` mm., men inte ändrat i P0.  

