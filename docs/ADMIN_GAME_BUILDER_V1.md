# Admin Game Builder V1 (MVP Spec)

Goal: Ett enhetligt Game Builder-flöde i /admin/games som stödjer både enkla lekar och avancerade, play-redo upplevelser (roller, faser, bräden) utan separata “wizards”. Moduler aktiveras via valda Play Modes och progressiv disclosure.

## 1) Nuläge (repo-sammanfattning)
- Data: `games` (core metadata: name, short_description, description, status, age_min/max, min/max players, time_estimate_min, energy_level_enum, location_type_enum, main_purpose_id, product_id, owner_tenant_id, materials[], instructions (text), translations via `game_translations` (title, short_description, materials[], instructions Json), media via `game_media` (cover/galleri).
- Admin UI: /admin/games (list + modal create/edit), /admin/games/[gameId] (detail). Fält motsvarar ovan; instruktioner antingen enkel text eller translations.instructions (array av steg i vissa spel). Ingen modulär builder.
- Play-konsumption: `app/app/games/[gameId]/page.tsx` pickTranslation(locale sv/no/en), använder translation.instructions (array av steps med title/description/duration) om finns; annars `game.instructions` (string). Play antar att instruktioner kan vara array eller text. Media laddas från `game_media`.
- Participants/Play Sessions: separat domän (participant_sessions, participants) med Play MVP. Spel saknar idag explicit faser/roller/board-actions som Play Sessions kan nyttja.

## 2) Målbild: modulär Game Content Model
Ett game består av GameCore + valbara moduler. Builder visar sektioner baserat på Play Mode (Basic / Facilitated / Roles+Participants). Allt i en ruta/flow, inga separata wizards.

- **GameCore (obligatorisk)**: metadata (name, status, owner scope, product, main purpose, categories/tags, energy/location, age min/max, players min/max, duration min/max, short desc, full desc), media (cover krävs vid publish), localization (sv/no/en).
- **Modules (aktiveras via toggles/Play Mode)**  
  - SessionFlow: faser/rounds, ordning, rekommenderad persistence_mode, pause/resume regler.  
  - Instruction Steps (struktur): steg med title/body/duration/media_ref/leader_script/participant_prompt/board_text, flags optional/conditional. Kan länkas till faser.  
  - Play Readiness: materials list, prep steps, safety notes, leader tips, difficulty, accessibility, space requirements, group size constraints.  
  - Participants/Roles: roll definitions (name, description, secrets/private/public), max_count, assignment strategy, role cards.  
  - Actions: definiera schema för vote/answer/choice (prompt, options, validation, host override).  
  - Public Board: vad som visas offentligt per fas (text/markdown, media refs, template key).  
  - Variations: korta alternativa regler/house rules.  
  - Localization: per-locale titlar, kortbeskrivning, steg, roller, board-texter, materials.  
  - Gamification hooks (placeholder): event keys game_played/session_logged.

## 3) Valideringsnivåer
- Draft: Core metadata + status=draft.
- Playable: Instruction Steps + Duration + Materials/Safety (om krävs) + minst en lokal (sv/NO/EN) komplett för titel + kortbeskrivning + steps.
- Publishable: kvalitetssäkring (cover image satt, main purpose/product satt om krävs, translations “tillräckligt kompletta” i primär locale, inga blockerande TODO-fält).
- Versioning: nytt fält `game_content_version` (t.ex. v1=befintlig, v2=modulär). Vid migrering sätt v2 men håll legacy fält synkade (se migration nedan).

## 4) Migration / bakåtkompatibilitet
- Behåll befintliga `games` fält. Lägg till nya tabeller:  
  - `game_steps` (game_id, locale, phase_id nullable, order, title, body, duration_seconds, leader_script, participant_prompt, board_text, media_ref, optional_flag, conditional_flag).  
  - `game_phases` (game_id, locale, name, description, order, entry_condition, exit_condition).  
  - `game_roles` (game_id, locale, name, description, max_count, is_public, private_notes, assignment_strategy, board_text).  
  - `game_actions` (game_id, phase_id nullable, action_type vote/answer/choice, payload_schema jsonb, host_override_allowed bool, prompt, options).  
  - `game_boards` (game_id, phase_id nullable, locale, content jsonb or markdown, visibility public-only).  
  - `game_materials` (game_id, locale, items[], safety_notes, prep_steps).  
  - Option: `game_variations` (game_id, locale, title, description).  
  - Add columns on `games`: `game_content_version` (default 'v1'), `play_mode` ('basic'|'facilitated'|'roles'), `duration_max`, `players_recommended`, `accessibility_notes`, `space_requirements`, `difficulty`, `leader_tips`.
- Migration mapping:  
  - `games.instructions` (string) → single `game_steps` entry (locale=null) as body.  
  - `game_translations.instructions` (array) → insert ordered `game_steps` per locale.  
  - `game_translations.materials` → `game_materials.items`; `short_description` -> core translation; `title` stays.  
  - Keep legacy fields populated; Play still reads translation.instructions if present. New Play should prefer `game_steps` when `game_content_version = v2`, else fall back.
- Play compatibility: update mappers to check `game_steps` (structured) first, fallback to translation.instructions array, else `games.instructions` text.

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

## 6) UI/UX riktlinjer (en builder, modulärt)
- En route: `/admin/games/new` och `/admin/games/[id]/edit`.
- Sektioner: Core, Play Readiness, Instructions, (optional) Phases, (optional) Roles, (optional) Actions, (optional) Board, Localization, Media, Validation.
- Play Mode toggle (Basic/Facilitated/Roles) visar/döljer moduler. Basic visar bara Core+Instructions (enkla steg) + Media. Facilitated öppnar Play Readiness + Phases. Roles öppnar Roles + Actions + Board.
- Progressiv disclosure: accordions per sektion, “Add phase/role/step” inline.
- Validation banners per nivå (Draft/Playable/Publishable) med checklistor.

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

## 8) Testplan (manuell, P0)
1) Skapa nytt spel via `/admin/games/new` – fyll Core + 2 steps + cover; spara som draft; kontrollera att game_steps skrivs och game_content_version=v2.  
2) Publicera: fyll cover + short desc + main purpose; se valideringschecklist går grön och status publish sparas.  
3) Migrerat spel: öppna befintligt v1-spel → builder visar steps (mappat från legacy instructions); spara utan förändring; Play detail-sida laddas (fallback check).  
4) Play detail: öppna `app/app/games/[id]` för nytt spel → instruktioner renderas från game_steps (om v2), annars fallback.  
5) Materials/safety fylls → sparas i game_materials och visas i builder.  
6) Quick-create modal (om kvar) → sparar v1 (minimalt), builder kan sedan uppgradera till v2.

## 9) Nästa steg / TODO
- Bygg P0 (schema + API + builder UI + mapper fallback).  
- Lägg till admin/games navigation till nya builder routes och uppdatera gamla modaler att länka till builder.  
- P1/P2 enligt planen ovan, efter P0 leverans.  

## Referenser i kodbasen (nuvarande flöden)
- Admin list/detail: `features/admin/games/*`, `app/admin/games` pages.  
- Game detail (Play): `app/app/games/[gameId]/page.tsx` – pickTranslation, använder translation.instructions array om finns.  
- Schema: `types/supabase.ts` (`games`, `game_translations`, `game_media`).  
- Play sessions (om koppling behövs): `participant_sessions` mm., men inte ändrat i P0.  

