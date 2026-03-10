# GameDetails Context Implementation Plan

> **Datum:** 2026-03-10  
> **Version:** 2.0 (execution-focused rewrite)  
> **Förutsättning:** GAMEDETAILS_CONTEXT_AUDIT.md v2.0 + GAMEDETAILS_CONTEXT_ARCHITECTURE.md v2.0 (godkända)  
> **Syfte:** Exekverbar sekvensering med minimal blast radius  
> **Status:** ✅ **SÄKERHETSARBETET STÄNGT (2026-03-10)** — Block 1 KLAR, Block 3 KLAR, F7 KLAR. Alla preview-context-exponeringar fixade.  
> **Kvarvarande:** Block 2 BESLUTSPUNKT, Block 4–6 ej påbörjade (icke-säkerhet)

---

## Non-goals

These are explicitly **out of scope** for this plan. They are documented here to prevent scope creep.

1. **Play-domänen ska INTE migreras till GameDetailData** — Play har egna typer med annan semantik
2. **Participant-mode ska INTE införas i GameDetailMode** — Participants använder Play-domänens separata komponenter
3. **Director Preview ska INTE börja konsumera display-komponenternas stegsrendering** — den har egen klient
4. **Inga delade `BaseStep`-typer mellan display/play** — `body` vs `description` är semantisk skillnad, inte drift
5. **Board-komponenter ska INTE skrivas om** — de har fundamentalt annorlunda UX och dataflöde
6. **PlayPage legacy-migration ingår INTE i denna plan** — hanteras separat om/när beslut fattas
7. ~~**Trigger `condition`/`actions` exponering hanteras INTE förrän produktbeslut fattas**~~ → ✅ **BESLUT FATTAT (2026-03-10): Option B** — visa struktur, strippa innehållssträngar

---

## Audit → Fix Traceability

| Finding | Description | Fixed by | Status |
|---------|-------------|---------|--------|
| F1 | leaderTips visible in preview | Block 1.1 | ✅ Fixed (2026-03-10) |
| F3 | leaderScript in RSC payload | Block 1.3 | ✅ Fixed (2026-03-10) |
| F4 | boardText in RSC payload | Block 1.3 | ✅ Fixed (2026-03-10) |
| F5 | Roles API leaks privateNote/secrets/assignmentStrategy | Block 1.2 | ✅ Fixed (2026-03-10) |
| F7 | Triggers API exposes condition/actions | F7 fix (Option B) | ✅ Fixed (2026-03-10) — content strings stripped, structure preserved |
| F8 | Artifacts API returns all variants | Block 3.1 | ✅ Fixed (2026-03-10) |
| F8b | `metadata.correctCode` exposed in artifacts route | Block 3.1b | ✅ Fixed (2026-03-10) — discovered during Block 3 research. Same route boundary. |
| F10 | GameDetailContext unused | DEFERRED | Low priority cleanup |
| F11 | Director Preview uses wrong mode | ~~Block 2.1~~ | **RECLASSIFIED** — Director Preview does NOT use `GameDetailMode`. The `mode="preview"` refers to Play domain's `DirectorModeDrawer` type. Not a GameDetails concern. |
| F12 | No tests for config/contracts | Block 1.4 + Block 4 | ✅ Partially fixed (2026-03-10) — 12 tests added; Block 4 extends coverage |

**Findings NOT requiring fixes (currently correct):**

| Finding | Description | Why no fix |
|---------|-------------|------------|
| F2 | Play API dual-strip + Zod | Exemplary — no change needed |
| F6 | scalingRules/conflictsWith NOT returned | Correct behavior |
| F9 | Board API correct public filtering | Correct behavior |
| F16 | GameDetailSteps does NOT render leaderScript | Correct behavior |
| F17 | GameDetailRoles does NOT render privateNote | Correct behavior |

---

## Block 1: Informationssäkerhet

> **Mål:** Förhindra att facilitator-only-fält når browsern i library/preview-kontext  
> **Varför nu:** Tre verifierade informationsläckor (F1, F3, F5) exponerar känslig data för alla autentiserade användare  
> **Dependencies:** Inga  
> **Beräknad effort:** ~3–5 SP  
> **Status:** ✅ KLAR (2026-03-10)

**Noteringar:**
- Alla 4 delblock (1.1–1.4) implementerade i en session
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 1767 passed, 0 failed
- Filer ändrade: `config.ts` (1 rad), `roles/route.ts` (3 fält borttagna), `page.tsx` (derived object med strip)
- Filer skapade: `tests/unit/game-details/config-visibility.test.ts` (9 tester), `tests/unit/game-details/roles-contract.test.ts` (3 tester)
- Filer uppdaterade: `tests/game-display/config.test.ts` (2 assertions uppdaterade)
- Manuell verifiering: Se `BLOCK_1_VERIFICATION_CHECKLIST.md`

### 1.1: Dölj leaderTips i preview-mode

**Rekommenderad ändring:** Sätt `SECTION_VISIBILITY.preview.leaderTips = false`

**Exakta filer som ändras:**
| Fil | Ändring |
|-----|---------|
| `components/game/GameDetails/config.ts` | Ändra rad 78: `leaderTips: true` → `leaderTips: false` |

**Alternativ övervägda:**

| Alternativ | Beskrivning | Valt? | Varför |
|------------|------------|-------|--------|
| A: `leaderTips: false` i preview | Enklaste, säkraste | **JA** | 1 rad — ingen blast radius |
| B: Toggle i UI | "Visa ledartips" toggle | Nej | Kräver komponentändring, data finns fortfarande i payload |
| C: Ny facilitator-mode nu | Utöka config med facilitator | Nej | Scope creep — hanteras i Block 2 |

**Risk / Blast radius:**
- Routes påverkas: Inga — config.ts konsumeras lokalt
- Komponenter påverkas: `GameDetailLeaderTips` renderas inte längre i preview — korrekt beteende
- API:er påverkas: Inga
- Tester: Inga existerande tester (F12) — men nya tester bör skrivas (se 1.4)
- Snapshots: Inga kända snapshot-tester för denna sektion
- **Risk: Låg** — det är en boolean-ändring i config

**Notering:** Även med `leaderTips: false` i config finns `game.leaderTips` fortfarande i serialiserat RSC-payload. Fullständig datastrippning hanteras i 1.3.

**Acceptance criteria:**
- [x] `getSectionConfig('preview', anyPlayMode).leaderTips === false` ✅ (2026-03-10)
- [ ] Library game detail page (`/app/games/[gameId]`) renderar INTE `GameDetailLeaderTips` — manuell verifiering kvar
- [ ] Sandbox i preview-mode döljer leaderTips — manuell verifiering kvar
- [x] Host-mode visar fortfarande leaderTips ✅ (test: config-visibility.test.ts)

**Verifiering:**
- Manuell: Öppna `/app/games/[gameId]` — ingen leaderTips-sektion synlig
- Sandbox: Toggla till preview-mode — leaderTips ej synlig; toggla till host — leaderTips synlig

**Rollback:** Ändra tillbaka `leaderTips: false` → `true`. Inga övriga ändringar krävs.

---

### 1.2: Sanitera Roles API response

**Rekommenderad ändring:** Strip `privateNote`, `secrets`, `assignmentStrategy` från Roles API response för icke-admin-anrop.

**Exakta filer som ändras:**
| Fil | Ändring |
|-----|---------|
| `app/api/games/[gameId]/roles/route.ts` | Ta bort `private_instructions`, `private_hints`, `assignment_strategy` från route extraction ELLER strip efter `mapRoles()` |

**Detalj:** I routens explicit extraction (rad ~29-39) ändra:
```diff
  dbRoles.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: r.color,
    role_order: r.role_order,
    public_description: r.public_description,
-   private_instructions: r.private_instructions,
-   private_hints: r.private_hints,
    min_count: r.min_count,
    max_count: r.max_count,
-   assignment_strategy: r.assignment_strategy,
  }))
```

**Alternativ övervägda:**

| Alternativ | Beskrivning | Valt? | Varför |
|------------|------------|-------|--------|
| A: Strip vid route extraction | Ta bort fält från explicit mapping | **JA** | Enklast — stoppar data innan mapper |
| B: Strip efter mapRoles() | Destructuring efter mapping | Nej | Onödig extra bearbetning |
| C: Kontextberoende mapper | Skapa `mapPublicRoles()` | Nej | Scope creep — routen gör redan explicit extraction |
| D: Admin-check i routen | Skicka alla fält till admin, strippade till andra | Nej | Routen har ingen admin-specifik logik idag |

**Risk / Blast radius:**
- Routes påverkas: Bara `app/api/games/[gameId]/roles/route.ts`
- Komponenter påverkas: `GameDetailRoles` — renderar bara `name`, `icon`, `color`, `publicNote` — INGA ÄNDRINGAR KRÄVS (F17)
- API:er påverkas: Bara denna route
- Tester: Inga existerande tester (F12)
- **Risk: Låg** — komponent använder inte dessa fält

**Acceptance criteria:**
- [x] GET `/api/games/[gameId]/roles` returnerar ALDRIG `privateNote`, `secrets`, `assignmentStrategy` i JSON-svaret ✅ (2026-03-10)
- [x] `GameDetailRoles` fungerar oförändrat (den använder bara publika fält) ✅ (2026-03-10)
- [x] Integration/contract test verifierar strippningen ✅ (roles-contract.test.ts)

**Verifiering:**
- Manuell: Öppna DevTools → Network → requesten till `/api/games/[gameId]/roles` — verifiera att `privateNote`, `secrets`, `assignmentStrategy` saknas
- Test: Skriv integration test som gör GET och assertar att privata fält inte finns i response

**Rollback:** Lägg tillbaka de tre fälten i route extraction. Inga kaskadeffekter.

---

### 1.3: Strip leaderScript och boardText från preview-serialisering

**Rekommenderad ändring:** Strip `leaderScript`, `boardText`, och `participantPrompt` från steg-data i `page.tsx` innan den passas till klientkomponenter.

**Exakta filer som ändras:**
| Fil | Ändring |
|-----|---------|
| `app/app/games/[gameId]/page.tsx` | Efter `mapDbGameToDetailPreview()`, strip host-only fält från steps |

**Detalj:** I page.tsx, efter `const game = mapDbGameToDetailPreview(...)` lägg till:
```typescript
// SECURITY: Strip host-only fields before serialization to client
if (game.steps) {
  game.steps = game.steps.map(({ leaderScript, boardText, participantPrompt, ...publicStep }) => publicStep);
}
```

Och strip `leaderTips` om vi vill vara belt-and-suspenders (utöver config-gaten):
```typescript
delete game.leaderTips;
```

**Alternativ övervägda:**

| Alternativ | Beskrivning | Valt? | Varför |
|------------|------------|-------|--------|
| A: Strip i page.tsx | Destructuring efter mapping | **JA** | Minst blast radius — ändrar inte mappern |
| B: Ny `mapDbGameToDetailPublic()` | Separat mapper som exkluderar fälten | Nej | Ytterligare en mapper-funktion att underhålla |
| C: Ändra `mapSteps()` med context-parameter | Parameteriserad mapper | Nej | Bryter Director Preview som behöver full data |

**Risk / Blast radius:**
- Routes påverkas: Inga
- Komponenter påverkas: Inga — `GameDetailSteps` renderar aldrig dessa fält (F16)
- API:er påverkas: Inga
- Director Preview: OPÅVERKAD — den använder `mapDbGameToDetailFull()`, inte `page.tsx`
- **Risk: Låg** — additivt strip i page som inte ändrar någon komponents beteende

**Acceptance criteria:**
- [x] RSC-payload på `/app/games/[gameId]` innehåller INTE `leaderScript` i något stegobjekt ✅ (2026-03-10 — code verified)
- [x] RSC-payload innehåller INTE `boardText` i något stegobjekt ✅ (2026-03-10 — code verified)
- [x] RSC-payload innehåller INTE `leaderTips` array ✅ (2026-03-10 — code verified)
- [ ] Director Preview (`/app/games/[gameId]/director-preview`) visar fortfarande full data — manuell verifiering kvar
- [x] Sandbox mock-data påverkas inte ✅ (2026-03-10 — oförändrad)

**Verifiering:**
- Manuell: Inspektera HTML source (Ctrl+U) på `/app/games/[gameId]` — sök efter "leaderScript" i HTML — ska ge 0 träffar
- Manuell: Verifiera att Director Preview fortfarande visar leaderTips

**Rollback:** Ta bort strip-raden i page.tsx. Inga övriga ändringar.

---

### 1.4: Skriv contract tests för säkerhetsgränser

**Mål:** Automatisera verifiering av att privata fält inte läcker.

**Exakta filer som skapas:**
| Fil | Innehåll |
|-----|---------|
| `components/game/GameDetails/__tests__/config.test.ts` | Tests för `getSectionConfig()` |
| `app/api/games/[gameId]/roles/__tests__/route.test.ts` | Contract test för roles response |

**Tester att skriva (konkreta exempel):**

```typescript
// components/game/GameDetails/__tests__/config.test.ts
import { getSectionConfig, SECTION_VISIBILITY } from '../config';

describe('GameDetails config security boundaries', () => {
  test('preview mode hides leaderTips across all playModes', () => {
    expect(getSectionConfig('preview', 'basic').leaderTips).toBe(false);
    expect(getSectionConfig('preview', 'facilitated').leaderTips).toBe(false);
    expect(getSectionConfig('preview', 'participants').leaderTips).toBe(false);
  });

  test('host mode shows leaderTips', () => {
    expect(getSectionConfig('host', 'basic').leaderTips).toBe(true);
  });

  test('all modes have identical section keys (completeness guard)', () => {
    const referenceKeys = Object.keys(SECTION_VISIBILITY.preview).sort();
    for (const [, config] of Object.entries(SECTION_VISIBILITY)) {
      expect(Object.keys(config).sort()).toEqual(referenceKeys);
    }
  });
});
```

```typescript
// app/api/games/[gameId]/roles/__tests__/route.test.ts
describe('Roles API contract', () => {
  test('response never contains private fields', async () => {
    const response = await GET(req, { params: { gameId: testGameId } });
    const roles = await response.json();
    for (const role of roles) {
      expect(role).not.toHaveProperty('privateNote');
      expect(role).not.toHaveProperty('secrets');
      expect(role).not.toHaveProperty('assignmentStrategy');
    }
  });
});
```

**Acceptance criteria:**
- [x] Minst 5 config-tester i CI ✅ (9 tester i config-visibility.test.ts)
- [x] Minst 1 contract test för Roles API ✅ (3 tester i roles-contract.test.ts)
- [x] `npx vitest run` passerar ✅ (1767 passed, 0 failed)

---

### Vad som explicit INTE ändras i Block 1

- `mapDbGameToDetailPreview()` — oförändrad (vi strippar i page.tsx istället)
- `mapDbGameToDetailFull()` — oförändrad (Director Preview behöver full data)
- `mapSteps()` — oförändrad (den används av båda mappersna)
- `GameDetailSteps` komponent — oförändrad (den renderar redan bara publika fält)
- `GameDetailRoles` komponent — oförändrad (den renderar redan bara publika fält)
- ~~Triggers API — hanteras INTE (OPEN QUESTION om `condition`/`actions` är känsliga)~~ → ✅ **Hanterad med F7 fix (2026-03-10, Option B)** — innehållssträngar strippade
- ~~Artifacts API — hanteras i Block 2 eller separat~~ → ✅ **Hanterad i Block 3 (2026-03-10)** — F8/F8b fixade

---

## Block 2: Kontextutvidgning — BESLUTSPUNKT

> **Mål:** Utöka `GameDetailMode` med `facilitator`-mode för display/sandbox-domänen  
> **Ursprunglig motivation ~~(F11 — Director Preview)~~:** Omklassificerad — Director Preview använder INTE `GameDetailMode` alls. Se BLOCK_2_EXECUTION_BRIEF.md sektion 0.  
> **Kvarvarande motivation:** Design-komplettering av capability-matris + sandbox testbarhet  
> **Dependencies:** Block 1  
> **Beräknad effort:** ~1 SP (ned från 4–6 SP efter Director Preview-korrigeringen)  
> **Status:** BESLUTSPUNKT — välj Option A eller Option B innan implementation

### Arkitekturkorrigering (2026-03-10)

**Verifierat:** Director Preview (`director-preview-client.tsx`) importerar `DirectorModeDrawer` från Play-domänen och använder dess `mode: 'session' | 'preview'`-typ. Den importerar inga `GameDetail*`-komponenter, anropar inte `getSectionConfig()`, och har ingen koppling till `SECTION_VISIBILITY`.

Konsekvens:
- ~~Block 2.1: Ändra Director Preview `mode="preview"` → `mode="facilitator"`~~ — **Felriktat** — borttaget
- F11 omklassificerad från "GameDetails mode-problem" till "Play-domänens namngivning"
- Block 2 är nu ENBART en GameDetails display/sandbox-fråga

### Option A: Inför facilitator-mode för GameDetails/sandbox

**Skicklighet:** Adderad mode utan konsument är en formalisering.

**Fördelar:**
- Sandbox kan jämföra `preview` vs `facilitator` (leaderTips synlighet)
- Capability-matrisen i arkitekturdokumentet får en implementerad motsvarighet
- Om en framtida facilitator-förberedelse-vy behov `facilitator`-mode, finns den redan

**Nackdelar:**
- Ingen verklig production consumer idag
- Adderar 4:e värde i union type som måste hanteras i tester
- YAGNI-risk: abstraktion utan användare

**Implementation (om vald):**

| # | Fil | Ändring |
|---|-----|--------|
| C1 | `components/game/GameDetails/config.ts:19` | Lägg till `'facilitator'` i `GameDetailMode` union |
| C2 | `components/game/GameDetails/config.ts:58–152` | Lägg till `facilitator: { ... }` i `SECTION_VISIBILITY` (preview + `leaderTips: true`) |
| C3 | `app/sandbox/app/game-detail/page.tsx:528` | Lägg till `'facilitator'` i mode-toggle tuple |
| C4 | `app/sandbox/app/game-detail/page.tsx:535` | Lägg till label-gren för facilitator |
| T1 | `tests/game-display/config.test.ts:32` | Lägg till `'facilitator'` i MODES array |
| T2 | `tests/unit/game-details/config-visibility.test.ts` | Lägg till facilitator leaderTips/adminActions assertions |

**Filer som INTE berörs:**
- `director-preview-client.tsx` — använder inte GameDetailMode
- `GameDetailContext.tsx` — redan generisk
- Alla `GameDetail*`-sektionskomponenter — mode-agnostiska
- Inga mappers, inga API-routes

**Acceptance criteria (Option A):**
- [ ] `GameDetailMode` inkluderar `'facilitator'`
- [ ] `SECTION_VISIBILITY.facilitator` definierad med `leaderTips: true`, `adminActions: false`
- [ ] Sandbox visar 4 mode-toggles
- [ ] `npx tsc --noEmit` passerar med 0 errors
- [ ] Alla tester passerar

### Option B: Skjut upp facilitator-mode (YAGNI)

**Skicklighet:** Inför inte abstraktioner utan konsumenter.

**Fördelar:**
- Noll kodkomplexitet adderad
- Ingen union-expansion som måste hanteras
- Block 2 försvinner från arbetsplanen helt

**Nackdelar:**
- När en facilitator-vy behövs måste mode läggas till då
- Sandbox kan inte jämföra preview vs facilitator

**Implementation (om vald):**
- Markera Block 2 som DEFERRED
- Uppdatera traceability: F15 → "Deferred — no consumer exists"
- Inga kodändringar

### Rekommendation

**Option B (YAGNI)** rekommenderas.

Skäl:
1. Den ursprungliga motivationen (Director Preview) var felaktig — Director Preview är inte en GameDetails-konsument
2. Ingen production-vy behöver `facilitator`-mode idag
3. Förändringen är trivial (~45 min) och kan göras just-in-time när en konsument uppstår
4. Block 3 (Artifacts API sanitering) har högre säkerhetsvärde och bör prioriteras

**Om beslutet är Option A:** Se `BLOCK_2_EXECUTION_BRIEF.md` för fullständig exekveringsplan.

---

### Vad som explicit INTE ändras i Block 2

- `director-preview-client.tsx` — använder inte GameDetailMode (verifierat 2026-03-10)
- `GameDetailContext`/`GameDetailProvider` — de är unused (F10) och ska inte aktiveras här
- `mapDbGameToDetailPreview`/`mapDbGameToDetailFull` — oförändrade
- Play domain typer/komponenter — oförändrade
- Board domain — oförändrad

---

## Block 3: Artifacts API sanitering

> **Mål:** Filtrera icke-publika artifact-varianter och strippa känslig metadata i library API  
> **Varför nu:** Artifacts API returnerar alla varianter oavsett visibility (F8) och exponerar `metadata.correctCode` för keypad-artefakter (F8b)  
> **Dependencies:** Block 1  
> **Beräknad effort:** ~1 SP (ned från 2–3 SP — enklare fix efter execution brief-analys)  
> **Status:** ✅ KLAR (2026-03-10)

**Noteringar:**
- F8b (`metadata.correctCode` exponering) upptäcktes under Block 3-research och inkluderades i samma fix
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → 1772 passed, 0 failed (5 nya contract tests)
- Filer ändrade: `app/api/games/[gameId]/artifacts/route.ts` (variant filter + metadata strip)
- Filer skapade: `tests/unit/game-details/artifacts-contract.test.ts` (5 tester)
- Filer oförändrade: `mapArtifacts()`, `getGameArtifacts()`, `GameDetailArtifacts.tsx`, Director Preview, Play session route

### 3.1: Filtrera artifact-varianter i API

**Datamodell (VERIFIED):**
- Kolumn: `game_artifact_variants.visibility` — `TEXT NOT NULL DEFAULT 'public'`
- CHECK constraint: `visibility IN ('public', 'leader_only', 'role_private')`
- Typ i TypeScript: `ArtifactVisibility = 'public' | 'leader_only' | 'role_private'` (`types/games.ts`)
- Kolumn `visible_to_role_id` (UUID) — referens till `game_roles(id)` för `role_private`-varianter

**Exakta filer som ändras:**
| Fil | Ändring |
|-----|---------|
| `app/api/games/[gameId]/artifacts/route.ts` | Filtrera varianter till `visibility === 'public'` före mapping |

**Detalj:** I route handler, filtrera INNAN mapping:
```typescript
const publicArtifacts = dbArtifacts.map((a) => ({
  ...a,
  variants: a.variants?.filter(v => v.visibility === 'public'),
}));
const artifacts = mapArtifacts(publicArtifacts);
```

**Alternativ övervägda:**

| Alternativ | Beskrivning | Valt? | Varför |
|------------|------------|-------|--------|
| A: Filtrera i route pre-map | Filter innan mapper | **JA** | Stoppar data tidigt, mapper oförändrad |
| B: Filtrera i SQL query | `WHERE visibility = 'public'` | Nej | Kräver Supabase query-ändring, risk att bryta admin-route om delad |
| C: Filtrera i mapArtifacts() | Parameteriserad mapper | Nej | Ändrar mapper-kontrakt — blast radius till Director Preview |

**Risk / Blast radius:**
- Routes: Bara artifacts route
- Komponenter: `GameDetailArtifacts` — behöver verifiera att den hanterar tomma variant-listor korrekt
- **Edge case:** Om en artifact BARA har `leader_only`/`role_private` varianter, returneras den med tom variant-lista. Komponent måste hantera `variants: []` utan crash.
- **Risk: Låg** — additiv filtrering

**Acceptance criteria:**
- [x] Artifacts API returnerar bara varianter med `visibility === 'public'` ✅ (2026-03-10)
- [x] `metadata.correctCode` är aldrig med i artifacts API-response (F8b) ✅ (2026-03-10)
- [x] `GameDetailArtifacts` renderar korrekt med filtrerade varianter ✅ (code verified — component guards empty/undefined variants)
- [x] Edge case: artifact med 0 publika varianter renderar utan crash ✅ (contract test)
- [x] Contract test verifierar att `leader_only`/`role_private` aldrig returneras ✅ (artifacts-contract.test.ts)
- [x] Contract test verifierar att `correctCode` aldrig returneras ✅ (artifacts-contract.test.ts)

**Rollback:** Ta bort `.filter()` i route. Inga kaskadeffekter.

---

## Block 4: Testinfrastruktur

> **Mål:** Utöka contract-testning utöver redan implementerade tester  
> **Status:** ✅ DELVIS UPPFYLLD — 22 tester redan skapade i Block 1/Block 3/F7  
> **Dependencies:** Block 1  
> **Beräknad effort:** ~1–2 SP (ned från 3–5 SP — majoriteten redan gjord)

**Redan implementerade tester (22 st):**
| Fil | Tester | Skapad i |
|-----|--------|----------|
| `tests/unit/game-details/config-visibility.test.ts` | 9 (modes × playModes, completeness guard) | Block 1 |
| `tests/unit/game-details/roles-contract.test.ts` | 3 (privata fält aldrig i response) | Block 1 |
| `tests/unit/game-details/artifacts-contract.test.ts` | 5 (variant-filtrering + correctCode strip) | Block 3 |
| `tests/unit/game-details/triggers-contract.test.ts` | 5 (content string strip + outcome strip) | F7 |
| `tests/game-display/config.test.ts` | 2 assertions uppdaterade | Block 1 |

### 4.1: Kvarvarande testbehov

- [ ] End-to-end API contract tests (integration mot riktig route handler istället för mapper-unit-test)
- [ ] Snapshot-test för RSC payload (verifiera att `leaderScript`/`boardText` aldrig serialiseras)
- [ ] Cross-mode smoke test (same game data → 3 modes → verifiera diff)

---

## Block 5: UX-harmonisering

> **Mål:** Säkerställ att UX matchar kontextens intention  
> **Varför nu:** Lägre prioritet — beror på Block 2  
> **Dependencies:** Block 2  
> **Beräknad effort:** ~2–3 SP

### 5.1: LeaderTips UX i facilitator/host-mode

**Designbeslut krävs (inte implementation-beslut):**
- Ska leaderTips vara expanderbar i host-mode?
- Ska leaderTips integreras per steg eller vara separat panel?
- Ska leaderTips visas proaktivt eller on-demand?

### 5.2: Director Preview → Session bridge

**Acceptance criteria:**
- [ ] Director Preview har CTA för att starta en riktig session
- [ ] CTA navigerar till session-skapande-flödet

---

## Block 6: Framtida arbete (ej sekvenserat)

Dessa kräver inga omedelbara åtgärder och placeras utanför exekveringsplanen:

1. ~~**Trigger `condition`/`actions` exponering** — Produktbeslut krävs (OPEN QUESTION F7):~~
   ~~- **Q1:** Ska trigger-logik döljas från preview-kontext?~~
     ~~- Om JA → Lägg till filtrering analog med Block 3.1~~
     ~~- Om NEJ → Dokumentera som avsäktlig exponering och stäng frågan~~
   ~~- **Q2:** Vad är en trigger ur speldesign-perspektiv? Pusselmekanik (visa i preview) eller facilitator-verktyg (dölj)?~~
   ~~- **Deadline:** Om inget beslut fattas, anta "avsäktlig" och stäng~~
   ✅ **BESLUT FATTAT (2026-03-10): Option B** — Visa trigger-struktur (typer, ID:n, siffror) men strippa innehållssträngar (`message`, `customScript`, `reason`, `label`) och `outcome` från `decision_resolved`-conditions. Implementerat som route-level sanitization i `app/api/games/[gameId]/triggers/route.ts`. Contract tests i `tests/unit/game-details/triggers-contract.test.ts` (5 tester).
2. **Cross-context sandbox comparison** — Side-by-side vy av samma spel i alla modes
3. **BoardApiResponse typformalisering** — Extrahera inline-typ till `lib/board/types.ts` (P10)
4. **GameDetailContext cleanup** — Antingen ta i bruk eller ta bort unused provider (P8)
5. **Sandbox API response preview** — Visa vad lazy-loaded APIs returnerar per kontext
6. **PlayPage legacy migration** — Migrera eller deprecate `PlayPage` från legacy endpoint

---

## Exekveringsordning

```
Block 1: Informationssäkerhet ✅ KLAR (2026-03-10)
├── 1.1 leaderTips: false i preview config ✅
├── 1.2 Strip Roles API private fields ✅
├── 1.3 Strip leaderScript/boardText från page.tsx ✅
└── 1.4 Contract tests ✅

Block 2: Kontextutvidgning — BESLUTSPUNKT
├── Option A: Inför facilitator-mode (sandbox/display)
│   ├── Type + config expansion
│   ├── Sandbox update
│   └── Test expansion
└── Option B: YAGNI — skjut upp (rekommenderat)

Block 3: Artifacts API sanitering ✅ KLAR (2026-03-10)
└── 3.1 Filtrera till public-only variants + strip correctCode ✅

F7: Triggers API sanitering ✅ KLAR (2026-03-10, Option B)
└── Strip content strings från actions + outcome från decision_resolved ✅

Block 4: Testinfrastruktur — DELVIS UPPFYLLD (22 tester redan skapade)
├── 4.1 Config visibility tests ✅ (9 tester)
├── 4.1 API contract tests ✅ (roles: 3, artifacts: 5, triggers: 5)
└── Kvarstår: E2E integration tests, RSC snapshot

Block 5: UX-harmonisering (beror på Block 2)
├── 5.1 LeaderTips UX design
└── 5.2 Director → Session bridge
```

---

## Dependencies-karta

```
Block 1 ─────────────┐
  │                   │
  ├──▶ Block 2 ──▶ Block 5
  │
  ├──▶ Block 3
  │
  └──▶ Block 4 (parallelliserbar)
```

---

## Decision Log

| # | Decision | Options considered | Chosen | Why | Deferred risks |
|---|---------|-------------------|--------|-----|----------------|
| D1 | Hur döljs leaderTips i preview? | A: config false, B: UI toggle, C: ny mode | **A: config false** | 1 rad, ingen blast radius, säkrast | Data finns fortfarande i payload → 1.3 hanterar |
| D2 | Hur strippas leaderScript från preview? | A: strip i page.tsx, B: ny public mapper, C: context-param i mapSteps | **A: strip i page.tsx** | Minst blast radius, ändrar inte mappern, Director Preview opåverkad | Om fler pages behöver strippning kan mapper behövas |
| D3 | Hur saniteras Roles API? | A: strip vid extraction, B: strip efter map, C: kontextberoende mapper | **A: strip vid extraction** | Stoppar data innan det ens når mapper — säkrast | Om admin-route behöver fälten måste extraction parameteriseras |
| D4 | Behövs facilitator-mode? | A: Ja, B: Nej (behåll preview för allt) | **BESLUTSPUNKT** | ~~Director Preview had wrong-mode-problem (F11)~~ → F11 reclassified: Director Preview does NOT use GameDetailMode. Kvarvarande motivation är sandbox/display-komplettering. Se Block 2 Option A vs B. | Om Option B väljs och en framtida yta behöver facilitator måste mode läggas till då |
| D5 | Behövs participant-mode i GameDetails? | A: Ja, B: Nej | **B: Nej** | Participants använder Play-domänens separata komponenter | Om framtida yta behöver det kan det läggas till |
| D6 | Delade bas-typer mellan display/play? | A: BaseStep, B: separata | **B: separata** | `body` vs `description` är semantisk skillnad, inte drift | Om fler fält konvergerar kan BaseStep övervägas |
| D7 | Hur hanteras trigger condition/actions exponering? | A: dölj helt, B: visa struktur/strippa innehåll, C: låt vara | **B: Option B (visa struktur, strippa innehåll)** | Produktbeslut 2026-03-10. Ledare behöver se spelstruktur men inte facilitator-innehåll. Strippar: `message`, `customScript`, `reason`, `label` från actions + `outcome` från `decision_resolved` conditions. | Inga — alla identifierade preview-exponeringar är nu åtgärdade |

---

## Blast Radius Map per block

### Block 1

| Ändring | Routes | Komponenter | API:er | Tester | TypeScript |
|---------|--------|------------|--------|--------|------------|
| 1.1 config.leaderTips = false | Inga | `GameDetailLeaderTips` renderas inte i preview | Inga | Inga snapshot-tester påverkas | Inga typändringar |
| 1.2 Roles API strip | `/api/games/[id]/roles` | `GameDetailRoles` OPÅVERKAD | Roles API | Inga existerande tester | Inga typändringar |
| 1.3 page.tsx strip | Inga | Inga (ingen komponent renderar fälten) | Inga | Inga | Inga |
| 1.4 Contract tests | Inga | Inga | Inga | NYA tester | Inga |

### Block 2 (if Option A)

| Ändring | Routes | Komponenter | API:er | Tester | TypeScript |
|---------|--------|------------|--------|--------|------------|
| Facilitator mode | Inga | config.ts | Inga | Nya facilitator tester | `GameDetailMode` union expands → `Record<GameDetailMode, ...>` måste uppdateras |
| Sandbox update | Inga | sandbox page | Inga | Inga | Inga |

### Block 3

| Ändring | Routes | Komponenter | API:er | Tester | TypeScript |
|---------|--------|------------|--------|--------|------------|
| 3.1 Artifacts variant filter | Inga | `GameDetailArtifacts` — verifiera | Artifacts API | Inga existerande | Inga |
| 3.1b Metadata correctCode strip | Inga | Inga (komponent renderar inte metadata) | Artifacts API | Inga existerande | Inga |

---

## Definition of Done

### Block 1: Informationssäkerhet ✅ KLAR (2026-03-10)
- [x] `getSectionConfig('preview', anyPlayMode).leaderTips === false`
- [x] Roles API returnerar aldrig `privateNote`, `secrets`, `assignmentStrategy`
- [x] RSC-payload på library game detail innehåller inte `leaderScript`, `boardText`, `leaderTips`
- [ ] Director Preview visar fortfarande full data — manuell verifiering kvar
- [x] Minst 5 contract tests i CI (12 tester totalt)
- [x] `npx tsc --noEmit` passerar med 0 errors
- [x] Inga befintliga tester bryts (2 assertions uppdaterade, alla gröna)

### Block 2: Kontextutvidgning — BESLUTSPUNKT
- [ ] **BESLUT:** Option A (inför) eller Option B (skjut upp)
- Om Option A:
  - [ ] `GameDetailMode` har 4 värden: preview, admin, host, facilitator
  - [ ] `SECTION_VISIBILITY.facilitator` definierad
  - [ ] ~~Director Preview använder `mode="facilitator"`~~ — BORTTAGET (Director Preview använder inte GameDetailMode)
  - [ ] Sandbox har 4-mode toggle
  - [ ] `npx tsc --noEmit` passerar med 0 errors
  - [ ] Inga befintliga tester bryts
- Om Option B:
  - [ ] Block 2 markerat som DEFERRED i traceability

### Block 3: Artifacts API ✅ KLAR (2026-03-10)
- [x] Artifacts API returnerar bara varianter med `visibility === 'public'`
- [x] `metadata.correctCode` aldrig i response (F8b)
- [x] `GameDetailArtifacts` fungerar korrekt
- [x] Contract test verifierar variant-filtrering och metadata-strippning (5 tester)

### F7: Triggers API sanitering ✅ KLAR (2026-03-10, Option B)
- [x] Content strings (`message`, `customScript`, `reason`, `label`) strippade från actions
- [x] `outcome` strippad från `decision_resolved` conditions
- [x] Trigger-struktur (typer, ID:n, siffror) bevarad för design-inspektion
- [x] Route-level sanitering (shared mapper oförändrad)
- [x] Contract tests (5 tester)
- [x] `npx tsc --noEmit` passerar med 0 errors
- [x] `npx vitest run` passerar (1777 passed, 0 failed)

### Block 4: Testinfrastruktur — DELVIS UPPFYLLD
- [x] Config visibility tests täcker alla modes × playModes (9 tester)
- [x] API contract tests täcker roles, artifacts, och triggers (13 tester)
- [ ] End-to-end integration tests (kvarstår)
- [ ] RSC payload snapshot test (kvarstår)

### Block 5: UX-harmonisering
- [ ] Designbeslut dokumenterade för leaderTips-presentation
- [ ] Director Preview har session-start CTA

---

## Closure — Säkerhetsarbetet stängt (2026-03-10)

Alla identifierade preview-context-exponeringar är fixade på kodnivå. Säkerhetsarbetsströmmen är avslutad.

### Sammanfattning

| Arbetsblock | Findings | Status | Tester |
|-------------|----------|--------|--------|
| **Block 1** | F1, F3, F4, F5 | ✅ KLAR | 12 tester (9 config + 3 roles) |
| **Block 3** | F8, F8b | ✅ KLAR | 5 artifacts contract tests |
| **F7 fix** | F7 (Option B) | ✅ KLAR | 5 triggers contract tests |
| **Totalt** | **7 findings fixade** | **✅ Inga öppna** | **22 tester** |

### Genomgående mönster

- Sanering vid API/page-boundary — aldrig i shared mappers
- Route-level filtrering för lazy-loaded APIs
- Derived object för RSC-serialiserad data
- Config gate för komponentvisibilitet
- Contract tests per API-boundary

### Kvarvarande icke-säkerhetsarbete

| Block | Beskrivning | Prioritet |
|-------|-------------|-----------|
| Block 2 | Facilitator-mode (YAGNI-rekommendation) | Låg |
| Block 4 (rest) | E2E integration tests, RSC snapshot | Medel |
| Block 5 | UX-harmonisering | Låg |
| Manuell verifiering | Block 1 browser checklist | **Väntar på manuell åtgärd** |
