# Journey v2.0 — Implementation Prompt

## Metadata

- Owner: -
- Status: archived
- Date: 2026-03-06
- Last updated: 2026-03-21
- Last validated: -

> Archived one-shot implementation prompt for the superseded Journey v2 cycle. Keep as prompt history only.

**Status vid arkivering:** Design-frozen — alla designdokument är rev 3 och godkända  
**Instruktion:** Utför steg 1–8 exakt som specificerat. Improvisera INTE utanför dokumenten.

---

## Rollinstruktion

Du är en senior fullstack-utvecklare som implementerar Journey v2.0 i Lekbanken-kodbasen. Du arbetar **strikt** utifrån de tre designdokumenten — ingen egen tolkning, ingen scope creep, inga "förbättringar" utanför spec.

---

## Obligatorisk läsordning (innan du skriver kod)

Läs dessa dokument **i ordning** och bekräfta att du förstått innan du börjar:

1. **`PROJECT_CONTEXT.md`** — Produktförståelse, tech stack, designfilosofi
2. **`Journey_v2_Architecture.md`** (rev 3) — Schema, RLS, API-kontrakt, rendering, admin-scope
3. **`Journey_v2_ImplementationPlan.md`** (rev 3) — Steg 1–8 med checklista per steg
4. **`Journey_v2_Audit.md`** (rev 3) — v1.0-status och problem som v2.0 löser

Om det uppstår en **konflikt** mellan dokumenten gäller:  
Architecture > Implementation Plan > Audit.

---

## Hårda regler

### Scope

- Implementera **enbart** vad som specificeras i Steg 1–8
- Skapa **inga** nya kosmetik-slots utöver de 5 core slots: `avatar_frame`, `scene_background`, `particles`, `xp_bar`, `section_divider`
- Skapa **inga** nya tabeller utöver: `cosmetics`, `cosmetic_unlock_rules`, `user_cosmetics`, `user_cosmetic_loadout`
- Lägg **inte** till features som nämns under "Framtida" eller "v2.1+" i arkitekturen

### Säkerhet

- **RLS:** Kopiera policyerna exakt från Architecture §4.7. `loadout_insert` ska innehålla ägarskaps-subquery (defense-in-depth)
- **Grants:** `user_cosmetics` INSERT sker **enbart** via service role (`createServiceRoleClient()` från `lib/supabase/server.ts`). Ingen INSERT-policy för `authenticated`
- **Admin:** Alla admin-endpoints kräver **system-admin** (inte tenant-admin). Skapa dedikerad `requireSystemAdmin()` guard
- **Zod-validering:** `render_config` valideras mot render_type-specifikt Zod-schema vid admin create/update

### TypeScript

- `npx tsc --noEmit` ska passera med 0 errors efter varje steg
- Använd discriminated union-typer för `RenderConfig` (se Architecture §6.3):
  ```typescript
  type SvgFrameConfig = { renderType: 'svg_frame'; variant: string; glowColor?: string };
  type CssBackgroundConfig = { renderType: 'css_background'; className: string; keyframes?: string };
  type CssParticlesConfig = { renderType: 'css_particles'; className: string; density?: number };
  type XpSkinConfig = { renderType: 'xp_skin'; skin: string; colorMode?: string };
  type CssDividerConfig = { renderType: 'css_divider'; className: string; gradient?: string };
  type RenderConfig = SvgFrameConfig | CssBackgroundConfig | CssParticlesConfig | XpSkinConfig | CssDividerConfig;
  ```
- **Aldrig** `Record<string, unknown>` för render configs

### Konventioner

- Filnamn och kod på engelska
- UI-text på svenska via i18n (`messages/{sv,en,no}.json`) under nycklar `journey.*` och `cosmetics.*`
- Feature-scoped filer under `features/journey/` — inte i globala `components/`
- Supabase-typer regenereras med CLI efter schema-ändringar

---

## Exekveringsplan

Utför stegen **sekventiellt**. Varje steg ska vara deploybart och testbart isolerat. Kör testchecklistan i Implementation Plan efter varje steg.

### Steg 1 — Fraktionsomnamning (`sky` → `desert`)

**Källa:** Implementation Plan §Steg 1

- Supabase-migration: `UPDATE user_journey_preferences SET faction_id = 'desert' WHERE faction_id = 'sky'`
- Uppdatera alla TypeScript-typer, `FACTION_THEMES`, `VALID_FACTIONS`, `FactionSelector`, i18n-nycklar
- Sök globalt efter `'sky'` — uppdatera alla relevanta referenser
- **Verifiering:** `npx tsc --noEmit` = 0 errors, FactionSelector visar 4 fraktioner utan neutral

### Steg 2 — Databasschema + seed-data

**Källa:** Architecture §4.1–4.7, Implementation Plan §Steg 2

- Skapa tabeller exakt som i Architecture §4.1–4.4
- RLS-policies exakt som i Architecture §4.7 — inklusive `loadout_insert` med ägarskaps-subquery
- `ALTER TABLE shop_items ADD COLUMN cosmetic_id` (Architecture §4.5)
- Seed ~24 kosmetik (inte 36) — se Architecture §10.2 och Implementation Plan seed-data appendix
- Generera TypeScript-typer: `npx supabase gen types`
- Skapa `features/journey/cosmetic-types.ts` med discriminated unions (Implementation Plan §2c)
- **Verifiering:** 24 rader i `cosmetics`, RLS blockerar klient-INSERT på `user_cosmetics`, loadout-insert blockerar icke-ägd kosmetik

### Steg 3 — Kosmetik-API

**Källa:** Architecture §7.1–7.4, Implementation Plan §Steg 3

- Utöka `GET /api/gamification` med `cosmetics`-fält (§7.1)
- `GET /api/journey/cosmetics` — katalog + unlocked + loadout (§7.2)
- `POST /api/journey/cosmetics/equip` — 4-stegs-validering (§7.3)
- `lib/journey/cosmetic-grants.ts` — `checkAndGrantCosmetics()` med service role (§7.4, §3d i impl. plan)
- **Hook-point:** Denna funktion anropas i Steg 6 — skriv den redo nu, koppla in den senare
- **Verifiering:** API-endpoints svarar korrekt, equip blockerar icke-ägd kosmetik med 403

### Steg 4 — Loadout-rendering

**Källa:** Architecture §6.3, Implementation Plan §Steg 4

- Komponenter konsumerar `ActiveLoadout` — varje komponent tar sin slot-specifika config
- `AvatarFrame`, `XPProgressBar`, `ParticleField` uppdateras med `render_config`-driven rendering
- CSS-klasser för alla seed-kosmetik skapas
- **Inget:** Canvas, WebGL, dynamisk `style`-prop. Enbart `className`.
- **Verifiering:** Journey-vy renderar loadout-driven kosmetik, tom loadout = basdesign

### Steg 5 — CosmeticControlPanel

**Källa:** Architecture §6.2, Implementation Plan §Steg 5

- Ersätter `SkillTreeSection` — 5 kategoriflikar (avatar_frame, bakgrund, partiklar, xp_bar, divider)
- Locked/unlocked/equipped states
- Equip via optimistic update + API-anrop
- Placeras i `features/journey/components/CosmeticControlPanel.tsx`
- **Verifiering:** Grid visar korrekt status, equip uppdaterar loadout visuellt, cross-fraktion fungerar

### Steg 6 — Unlock-motor

**Källa:** Architecture §5.1, §7.4, Implementation Plan §Steg 6

- **6a — Level-up:** Hook i `gamification-reward-engine.server.ts` → `applyXp()`. Efter RPC `apply_xp_transaction_v1` returnerar `level_up: true` → anropa `checkAndGrantCosmetics()`
- **6b — Achievement:** Hook i `/api/gamification/achievements/unlock` → efter unlock → check cosmetic rules
- **6c — Shop:** Om `shop_items.cosmetic_id IS NOT NULL` → auto-grant
- **6d — Toast:** `CosmeticUnlockToast.tsx` med raritets-glow
- **Verifiering:** Level up → auto-unlock, achievement → auto-unlock, toast visas

### Steg 7 — Admin UI

**Källa:** Architecture §7.5, §8.1–8.2, Implementation Plan §Steg 7

- **Auth:** `requireSystemAdmin()` guard — INTE `requireAdmin(tenantId)`
- Admin-sidor under `/app/admin/cosmetics/`
- CRUD för kosmetik med Zod-validerad `render_config`
- Unlock-regel-hantering
- Enskild grant med anledning (ingen batch)
- **Verifiering:** System-admin kan CRUD, tenant-admin får 403, render_config valideras

### Steg 8 — Cleanup + verifiering

**Källa:** Implementation Plan §Steg 8

- Markera `skill-trees.ts` som deprecated (behåll 2 sprints)
- Ta bort `SkillTreeSection.tsx` import från `GamificationPage.tsx`
- Skapa `lib/journey/getJourneyEnabled.ts` utility
- Bundle-analys: standard-vy ska INTE innehålla Journey-kod
- End-to-end-test: hela flödet från onboarding till cross-fraktion equip
- Uppdatera `PROJECT_CONTEXT.md` med Journey v2.0 status

---

## Viktiga kodreferenser (befintliga filer att hooka in i)

| Fil | Relevans |
|-----|----------|
| `lib/services/gamification-reward-engine.server.ts` | `applyXp()` — hook-point för level-up cosmetic grant (Steg 6a) |
| `lib/supabase/server.ts` | `createServiceRoleClient()` — använd för grants och admin-ops |
| `app/api/gamification/achievements/unlock/route.ts` | Hook-point för achievement cosmetic grant (Steg 6b) |
| `app/api/gamification/faction/route.ts` | `VALID_FACTIONS` Set — uppdatera i Steg 1 |
| `features/gamification/data/skill-trees.ts` | Källa för seed-data mapping (Steg 2b), deprecate i Steg 8 |
| `lib/factions.ts` | `FACTION_THEMES` — uppdatera i Steg 1 |
| `types/journey.ts` | `FactionId` type — uppdatera i Steg 1 |
| `features/gamification/types.ts` | `GamificationIdentity` — uppdatera i Steg 1, utöka i Steg 3 |
| `app/app/gamification/page.tsx` | Journey dispatcher — oförändrad men importerar nya komponenter i Steg 5 |

---

## Förbjudet

- Skapa nya tabeller som inte finns i Architecture §4
- Lägga till kosmetik-slots utöver de 5 core slots
- Använda `requireAdmin(tenantId)` för kosmetik-admin (ska vara `requireSystemAdmin()`)
- Använda `Record<string, unknown>` för render configs
- Lägga till Canvas/WebGL-rendering
- Implementera batch-grant, trading, seasonal cosmetics, eller andra v2.1+ features
- Ändra `apply_xp_transaction_v1` PL/pgSQL-funktionen
- Bryta befintlig funktionalitet (gamification, achievements, shop, streaks)

---

## Utdata per steg

Efter varje slutfört steg: bekräfta med:
1. Vilka filer som skapades/ändrades
2. `npx tsc --noEmit` resultat
3. Testchecklistan från Implementation Plan (vilka items som passerar)
4. Eventuella avvikelser från spec (med motivering)
