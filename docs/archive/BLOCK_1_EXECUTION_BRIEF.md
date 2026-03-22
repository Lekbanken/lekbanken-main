# Block 1 Execution Brief

## Metadata

- Owner: -
- Status: archived
- Date: 2026-03-10
- Last updated: 2026-03-21
- Last validated: -

> Archived execution brief for a completed Block 1 security workstream. Keep as planning history, not as an active implementation surface.

**Status vid arkivering:** Pre-execution review — ej implementerad  
**Scope:** Enbart Block 1 (Informationssäkerhet)  
**Grunddokument:** GAMEDETAILS_CONTEXT_AUDIT.md v2.0, GAMEDETAILS_CONTEXT_ARCHITECTURE.md v2.0, GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md v2.0

---

## 1. In-scope findings

### F1: leaderTips synlig i preview

| | |
|---|---|
| **Finding** | F1 |
| **Exposure type** | UI — renderas direkt för alla autentiserade användare |
| **Exact source** | `components/game/GameDetails/config.ts` rad 78 — `leaderTips: true` i `SECTION_VISIBILITY.preview` |
| **Data path** | `getGameByIdPreview()` → `mapDbGameToDetailPreview()` → `game.leaderTips` → `GameDetailLeaderTips` (client component) |
| **File(s) to change** | `components/game/GameDetails/config.ts` |
| **Fix layer** | Config |

**Verified code:**
```typescript
// config.ts, SECTION_VISIBILITY.preview:
leaderTips: true,  // ← Ska bli false
```

`getSectionConfig('preview', playMode)` returnerar alltid `leaderTips: true` (ingen playMode-override stänger av det).

---

### F3: leaderScript i RSC-payload

| | |
|---|---|
| **Finding** | F3 |
| **Exposure type** | RSC payload — fältet serialiseras till klienten men renderas inte |
| **Exact source** | `lib/game-display/mappers.ts` rad 551 — `leaderScript: s.leader_script ?? undefined` i `mapSteps()` |
| **Data path** | `getGameByIdPreview()` → `game_steps(*)` → `mapSteps()` → `step.leaderScript` → serialiseras i RSC → client |
| **Consumer** | `GameDetailSteps` — renderar INTE `leaderScript` (använder bara `title`, `body`, `durationMinutes`, `optional`) |
| **File(s) to change** | `app/app/games/[gameId]/page.tsx` |
| **Fix layer** | Page — strip innan serialisering |

**Verified code:**
```typescript
// mappers.ts, mapSteps():
leaderScript: s.leader_script ?? undefined,           // rad 551
participantPrompt: s.participant_prompt ?? undefined, // rad 552
boardText: s.board_text ?? undefined,                 // rad 553
```

```typescript
// page.tsx — game passas direkt utan strippning:
const game = mapDbGameToDetailPreview(dbGame! as unknown as DbGame, { ... })
// → game.steps inkluderar leaderScript, boardText, participantPrompt
```

---

### F4: boardText i RSC-payload

| | |
|---|---|
| **Finding** | F4 |
| **Exposure type** | RSC payload — fältet serialiseras men renderas inte |
| **Exact source** | `lib/game-display/mappers.ts` rad 553 — `boardText: s.board_text ?? undefined` i `mapSteps()` |
| **Data path** | Samma som F3 |
| **Consumer** | `GameDetailSteps` renderar INTE `boardText` |
| **File(s) to change** | `app/app/games/[gameId]/page.tsx` (samma fix som F3) |
| **Fix layer** | Page |

---

### F5: Roles API läcker privata fält

| | |
|---|---|
| **Finding** | F5 |
| **Exposure type** | API JSON — privata fält i response body |
| **Exact source** | `app/api/games/[gameId]/roles/route.ts` rad 36–38 — explicit extraction av `private_instructions`, `private_hints`, `assignment_strategy` |
| **Data path** | `getGameRoles()` → `select('*')` → route extraction → `mapRoles()` → JSON response |
| **Mapped field names** | `privateNote` (←`private_instructions`), `secrets` (←`private_hints`, wrappat i array), `assignmentStrategy` (←`assignment_strategy`) |
| **Consumer** | `GameDetailRoles` renderar INTE dessa fält (använder bara `name`, `icon`, `color`, `publicNote`, `minCount`, `maxCount`) |
| **File(s) to change** | `app/api/games/[gameId]/roles/route.ts` |
| **Fix layer** | Route — strip vid extraction |

**Verified code:**
```typescript
// roles/route.ts — explicit extraction:
private_instructions: r.private_instructions,  // → privateNote
private_hints: r.private_hints,                 // → secrets
assignment_strategy: r.assignment_strategy,    // → assignmentStrategy
```

```typescript
// mappers.ts, mapRoles():
privateNote: r.private_instructions ?? undefined,
secrets: r.private_hints ? [r.private_hints] : undefined,
assignmentStrategy: r.assignment_strategy === 'random' || ...
```

---

## 2. Ambiguities to resolve before patching

### A1: Ska `participantPrompt` strippas i Block 1?

**Fakta:**
- `participantPrompt` mappas i `mapSteps()` (rad 552)
- `GameDetailSteps` renderar INTE fältet
- Fältet nämns i audit som en av tre fält i mapSteps (F3-diskussionen)
- Fältet ANVÄNDS i Play-domänen (`StorylineModal`, `DirectorStagePanel`) — text som visas för deltagare under spelsession
- Fältet är INTE i sig säkerhetskritiskt (det är text som deltagare ser under spel), men i library preview-kontext har det inget syfte

**Beslut:** **JA — inkludera i strippningen.** Motivering:
1. Det har inget syfte i preview — deltagarprompt är runtime-data
2. Det är gratis att strippa (ingår redan i destructuring-operationen)
3. Det följer principen "strip allt som inte behövs i aktuell kontext"
4. Play-domänen påverkas INTE — den hämtar data via sin egen API (`/api/play/sessions/[id]/game`)

### A2: Immutability — mutera game-objektet eller skapa nytt?

**Fakta:**
- `game`-objektet i page.tsx är ett vanligt objekt (ej `Object.freeze`, ej `readonly`)
- Det muteras inte någon annanstans i page.tsx
- Det passas till flera client components via props
- React serialiserar props vid RSC → client boundary (kopierar, muterar inte originalet)

**Beslut:** **Skapa nytt objekt istället för att mutera.** Motivering:
1. Tydligare intention — `publicGame` kommunicerar att fält tagits bort
2. Minskar risk för subtila bieffekter om page.tsx utvecklas vidare
3. Negligibel performance-kostnad (ett spread + en map)

Rekommenderad approach:
```typescript
const publicGame = {
  ...game,
  leaderTips: undefined,
  steps: game.steps?.map(({ leaderScript, boardText, participantPrompt, ...publicStep }) => publicStep),
};
```

### A3: Konsumerar något UTANFÖR GameDetails de privata roles-fälten?

**Verifierat:** `RolesSection` i Play lobby (`components/play/lobby/RolesSection.tsx`) konsumerar `role.secrets`. Men den hämtar data via Play-domänens session API, INTE via `/api/games/[gameId]/roles`. Den påverkas inte av Block 1-ändringen.

**Svar:** Inga konsumenter utanför GameDetails.

---

## 3. Minimal safe patch order

**Steg 1: Verify call sites** (ej kodändring)
1. Bekräfta att `GameDetailSteps` inte refererar `leaderScript`, `boardText`, `participantPrompt` → VERIFIED
2. Bekräfta att `GameDetailRoles` inte refererar `privateNote`, `secrets`, `assignmentStrategy` → VERIFIED
3. Bekräfta att `GameDetailLeaderTips` konsumerar `game.leaderTips` och bör döljas i preview → VERIFIED
4. Bekräfta att Director Preview (`/director-preview/`) använder `mapDbGameToDetailFull()` och INTE `page.tsx` → VERIFIED

**Steg 2: Config fix — F1** (lägst blast radius)
- Ändra `config.ts` rad 78: `leaderTips: true` → `leaderTips: false`
- Verify: sandbox preview-mode döljer leaderTips
- 1 fil, 1 rad

**Steg 3: Route fix — F5** (isolerad API-ändring)
- Ta bort `private_instructions`, `private_hints`, `assignment_strategy` från route extraction i `roles/route.ts`
- Verify: GET response saknar `privateNote`, `secrets`, `assignmentStrategy`
- 1 fil, 3 rader borttagna

**Steg 4: Page fix — F3, F4** (payload-strippning)
- I `page.tsx`, efter `mapDbGameToDetailPreview()`, skapa `publicGame` med strippade fält
- Passera `publicGame` istället för `game` till alla komponenter
- Verify: RSC-payload saknar `leaderScript`, `boardText`, `participantPrompt`, `leaderTips`
- 1 fil, ~5 rader tillagda

**Steg 5: Contract tests — F12**
- Skapa `components/game/GameDetails/__tests__/config.test.ts`
- Skapa `app/api/games/[gameId]/roles/__tests__/contract.test.ts`
- Verify: `npx vitest run` passerar

**Steg 6: Build verification**
- Kör `npx tsc --noEmit` — 0 errors
- Kör `npx vitest run` — alla tester passerar

---

## 4. Acceptance checks

### F1: leaderTips config

| Kontroll | Före | Efter |
|---------|------|-------|
| `getSectionConfig('preview', 'basic').leaderTips` | `true` | `false` |
| `getSectionConfig('preview', 'facilitated').leaderTips` | `true` | `false` |
| `getSectionConfig('preview', 'participants').leaderTips` | `true` | `false` |
| `getSectionConfig('host', 'basic').leaderTips` | `true` | `true` (oförändrad) |
| `getSectionConfig('admin', 'basic').leaderTips` | `true` | `true` (oförändrad) |
| UI: `/app/games/[gameId]` leaderTips-sektion | Synlig | Dold |
| UI: Director Preview leaderTips | Synlig | Synlig (oförändrad) |
| UI: Sandbox preview leaderTips | Synlig | Dold |
| UI: Sandbox host leaderTips | Synlig | Synlig (oförändrad) |

### F3/F4: RSC payload stripping

| Kontroll | Före | Efter |
|---------|------|-------|
| RSC payload `step.leaderScript` | Present | Absent |
| RSC payload `step.boardText` | Present | Absent |
| RSC payload `step.participantPrompt` | Present | Absent |
| RSC payload `game.leaderTips` | Present | Absent |
| UI: steg-rendering | Oförändrad | Oförändrad |
| Director Preview: full stegdata | Allt synligt | Allt synligt (oförändrad) |

Verifiering: Inspektera HTML source (Ctrl+U) på `/app/games/[gameId]` — sök "leaderScript" → 0 träffar.

### F5: Roles API sanitering

| Kontroll | Före | Efter |
|---------|------|-------|
| JSON: `role.privateNote` | Present | Absent |
| JSON: `role.secrets` | Present | Absent |
| JSON: `role.assignmentStrategy` | Present | Absent |
| JSON: `role.name` | Present | Present (oförändrad) |
| JSON: `role.publicNote` | Present | Present (oförändrad) |
| JSON: `role.icon`, `role.color` | Present | Present (oförändrade) |
| UI: rollnamn, ikon, publicNote | Renderas | Renderas (oförändrad) |

Verifiering: DevTools → Network → GET `/api/games/[gameId]/roles` → inspektera JSON.

---

## 5. Regression risks

| Risk | Sannolikhet | Konsekvens | Verifiering |
|------|------------|-----------|-------------|
| **leaderTips försvinner i host/admin** | Låg — ändring begränsad till `SECTION_VISIBILITY.preview` | Hög — host förlorar ledartips | Manuell: öppna spel i host-mode → leaderTips synlig |
| **Sandbox visar fel i preview** | Låg — sandbox läser samma config | Medel — developer-tool saknar sektion | Manuell: öppna sandbox → preview → leaderTips borta; host → leaderTips kvar |
| **Director Preview tappar data** | Mycket låg — den använder `mapDbGameToDetailFull()`, inte page.tsx | Hög — facilitator ser ofullständig preview | Manuell: öppna `/app/games/[id]/director-preview` → all data synlig |
| **GameDetailSteps slutar visa steg** | Mycket låg — vi strippar fält den inte renderar | Hög — steglista tom/bruten | Manuell: öppna spel → steg renderas korrekt med titel, body, duration |
| **GameDetailRoles slutar visa roller** | Mycket låg — vi strippar fält den inte renderar | Hög — rolllista tom/bruten | Manuell: öppna spel med roller → roller visas med namn, ikon, publicNote |
| **TypeScript-kompileringsfel** | Låg — vi tar inte bort TypeScript-typer, bara runtime-värden | Medel — build misslyckas | `npx tsc --noEmit` |
| **Play lobby förlorar rolldata** | Ingen — Play lobby hämtar via session API, ej roles library API | Hög om det hade hänt | Manuell: starta session → lobby → roller visas med secrets |

---

## 6. Stop conditions

Pausa implementation och revidera planen om NÅGON av dessa uppstår:

1. **`GameDetailSteps` visar sig referera `leaderScript` eller `boardText`** — innebär att strippning bryter rendering. (Verifierat att det INTE är fallet, men om det ändrats sedan audit.)

2. **`GameDetailRoles` visar sig referera `privateNote` eller `secrets`** — innebär att strippning bryter rendering. (Verifierat att det INTE är fallet.)

3. **Director Preview visar sig använda `page.tsx`-flödet** istället för sin egen `director-preview-client.tsx` → F3/F4-fixens antagande om isolering stämmer inte.

4. **Roles API visar sig ha en admin-specific codepath** som behöver de privata fälten → strippning vid extraction kräver conditional logik istället.

5. **`mapDbGameToDetailPreview()` returnerar ett frozen/readonly objekt** → spread-approach i page.tsx fungerar inte.

6. **Befintliga tester failar efter config-ändring** → oväntad testinfrastruktur som inte upptäckts.

7. **TypeScript-kompilering visar att `leaderTips` är requirad (ej optional) i `GameDetailData`** → strippning till `undefined` kräver typändring.

**Hantering:** Om stop condition inträffar — dokumentera fynd, rapportera avvikelse från plan, INTE bredda scope eller börja refaktorera.

---

## Out-of-scope reminder

Dessa findings/arbetspaket rör INTE Block 1. Touch them not.

| Item | Varför ej nu |
|------|-------------|
| F7 Triggers API `condition`/`actions` | Produktbeslut krävs — allvarlighetsgrad ej klarlagd |
| F8 Artifacts API variants | Block 3 — kräver edge-case-verifiering av tom-variant-rendering |
| F10 Unused GameDetailContext | Cleanup — inget säkerhetsproblem |
| F11 Director Preview mode-namngivning | Block 2 — modell/namngivning, ej informationsläcka |
| Facilitator-mode | Block 2 |
| Sandbox-utvidgning | Block 2/4 |
| Play-domänens kontrakt | Explicit non-goal |
| Mapper-refaktorering | Explicit non-goal — vi strippar i page/route istället |
