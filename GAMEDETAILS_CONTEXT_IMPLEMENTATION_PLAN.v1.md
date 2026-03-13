# GameDetails Context Implementation Plan

> **Datum:** 2026-03-10  
> **Förutsättning:** GAMEDETAILS_CONTEXT_AUDIT.md (läs den först)  
> **Syfte:** Genomförbar plan för att lösa identifierade problem — utan implementation  
> **Status:** Plan — ej påbörjad

---

## Exekveringsprinciper

1. **Säkerhet först** — Informationsläckor (P1, P2, P3) åtgärdas innan allt annat
2. **Bakåtkompatibilitet** — Inga befintliga routes/API:er ska brytas
3. **Inkrementellt** — Varje arbetsblock levererar värde oberoende
4. **Verifierbart** — Varje uppgift har acceptance criteria och verifieringsmetod
5. **Minimal blast radius** — Config-ändringar före komponentrefaktorer före arkitekturförändringar

---

## Arbetsblock-översikt

```
═══════════════════════════════════════════════════════
 BLOCK 1: INFORMATIONSSÄKERHET          ~3–5 SP
 Dependencies: Inga
 Typ: Audit fixes
═══════════════════════════════════════════════════════

 BLOCK 2: KONTEXTUTVIDGNING             ~5–8 SP
 Dependencies: Block 1
 Typ: Architecture adjustment

═══════════════════════════════════════════════════════

 BLOCK 3: SANDBOX EVOLUTION             ~3–5 SP
 Dependencies: Block 2
 Typ: Testing infrastructure

═══════════════════════════════════════════════════════

 BLOCK 4: TYPKONTRAKT-HARMONISERING     ~8–13 SP
 Dependencies: Block 1 (kan parallelliseras med Block 2–3)
 Typ: Architecture refactor

═══════════════════════════════════════════════════════

 BLOCK 5: UX-HARMONISERING              ~3–5 SP
 Dependencies: Block 2
 Typ: Design harmonization

═══════════════════════════════════════════════════════

 BLOCK 6: FRAMTIDA FÖRBÄTTRINGAR        ~5–8 SP
 Dependencies: Block 1–5
 Typ: Future optional

═══════════════════════════════════════════════════════

 TOTAL:                                  ~27–44 SP
```

---

## Block 1: Informationssäkerhet (Kritiskt)

> **Gate:** Måste slutföras innan vi kan anse systemet produktionssäkert för scenarier med delade länkar.  
> **Beräknad effort:** ~3–5 SP  
> **Dependencies:** Inga

### 1.1 LeaderTips: Gate i preview-mode (P1)

**Problem:** `GameDetailLeaderTips` renderas i preview-mode. Alla inloggade användare ser facilitator-tips.

**Rekommenderad lösning:** Ändra `SECTION_VISIBILITY.preview.leaderTips` till `false`. Alternativt: skapa en `facilitator`-mode som visar dem.

**Designbeslut krävs:**
- [ ] Ska leaderTips vara synliga i library-preview överhuvudtaget?
  - **Alternativ A:** Dölj i preview — visa bara i host/admin-mode → Enklast, säkrast
  - **Alternativ B:** Visa i preview men bakom "Visa ledartips"-toggle med indikation att det är "för facilitatorn" → Bättre UX men kräver komponentändring
  - **Alternativ C:** Ny `facilitator`-mode i config → Mest flexibelt men scope creep

**Acceptance criteria:**
- [ ] `getSectionConfig('preview', anyPlayMode).leaderTips === false`
- [ ] Library game detail page renderar INTE `GameDetailLeaderTips`
- [ ] Sandbox i preview-mode döljer leaderTips
- [ ] Host-mode visar fortfarande leaderTips

**Verifiering:**
- Unit test: `config.test.ts` — verifiera att preview mode returnerar `leaderTips: false`
- Manuell: Öppna `/app/games/[gameId]` — ingen leaderTips-sektion synlig
- E2E: Playwright-test som assertar att section inte renderas

---

### 1.2 Roles API: Sanitera library-response (P2)

**Problem:** `/api/games/[id]/roles` kan returnera `privateNote`, `secrets`, `assignmentStrategy`, `scalingRules`.

**Uppgift:**
1. Verifiera vad `/api/games/[id]/roles` faktiskt returnerar (manuell bekräftelse)
2. Om privata fält returneras: lägg till field stripping (samma mönster som play API)
3. Om redan korrekt: dokumentera och stäng

**Acceptance criteria:**
- [ ] `/api/games/[id]/roles` returnerar ALDRIG `privateNote`, `secrets`, `assignmentStrategy`, `scalingRules`, `conflictsWith` för icke-admin-anrop
- [ ] Existerande `GameDetailRoles`-komponent fungerar fortfarande (den använder bara `name`, `icon`, `color`, `publicNote`, `count`)
- [ ] Unit test eller integration test verifierar strippningen

**Verifiering:**
- Integration test: Anropa roles-API som vanlig användare, verifiera att privata fält saknas
- Code review: Granska att `.select()`-satsen eller response-mappningen inte inkluderar privata fält

---

### 1.3 LeaderScript i serialiserat data-objekt (P3)

**Problem:** `mapDbGameToDetailPreview()` inkluderar `leaderScript` i `GameStep`. Fältet serialiseras till klienten via Server Component.

**Rekommenderad lösning:** Skapa `mapDbGameToDetailPublic()` som explicit exkluderar host-only fält från GameStep.

**Alternativ enklare lösning:** Strip `leaderScript` och `boardText` i `page.tsx` efter mapping men före rendering.

**Designbeslut krävs:**
- [ ] Ny mapper-funktion eller strip-at-page-level?
  - **Alternativ A:** Ny `mapDbGameToDetailPublic()` → Tydligast, men ytterligare en mapper
  - **Alternativ B:** Strip i page.tsx → Enklast, minst blast radius

**Acceptance criteria:**
- [ ] `leaderScript` och `boardText` finns INTE i serialiserat data-objekt på public game detail page
- [ ] Director preview fortsätter använda `mapDbGameToDetailFull()` (oförändrad)
- [ ] Sandbox mock-data påverkas inte

**Verifiering:**
- Manuell: Inspektera HTML source på `/app/games/[gameId]` — verifiera att leaderScript inte finns i RSC payload
- Unit test: Verifiera att den publika mappern/strippningen fungerar

---

## Block 2: Kontextutvidgning

> **Syfte:** Utöka kontextmodellen från 3 till 5+ lägen  
> **Beräknad effort:** ~5–8 SP  
> **Dependencies:** Block 1

### 2.1 Utöka GameDetailMode

**Nuläge:** `GameDetailMode = 'preview' | 'admin' | 'host'`

**Målbild:** `GameDetailMode = 'preview' | 'admin' | 'host' | 'facilitator' | 'participant'`

**Notering:** `participant` och `facilitator` behövs inte nödvändigtvis i GameDetails-komponenterna (Play-domänen har egna). Men formalisering av kontextmodellen gör det möjligt att bygga framtida ytor korrekt.

**Designbeslut krävs:**
- [ ] Behöver vi `facilitator`-mode i GameDetails?
  - Om ja: visar allt som preview + leaderTips + leaderScript i steg
  - Om nej: visar vi leaderTips i host-mode (som idag) och det räcker
- [ ] Behöver vi `participant`-mode i GameDetails?
  - Om ja: döljer leaderTips, roles.privateNote, triggers, artifacts (participant-only vid runtime)
  - Om nej: accept att GameDetails aldrig renderas i participant-kontext

**Rekommendation:** Lägg till `facilitator`-mode. Skippa `participant` (Play-domänen hanterar detta).

**Acceptance criteria:**
- [ ] `GameDetailMode` inkluderar `'facilitator'`
- [ ] `SECTION_VISIBILITY.facilitator` definierad med korrekt matris
- [ ] `getSectionConfig('facilitator', playMode)` returnerar korrekt config
- [ ] Existerande modes (preview/admin/host) oförändrade

---

### 2.2 Context capability matrix i config

Formalisera vilka capabilities varje kontext har, utöver section visibility:

```typescript
interface ContextCapabilities {
  canSeeLeaderTips: boolean;
  canSeeLeaderScript: boolean;
  canSeePrivateRoleFields: boolean;
  canStartSession: boolean;
  canEditGame: boolean;
  canFireTriggers: boolean;
  canAssignRoles: boolean;
  canRevealArtifacts: boolean;
}
```

**Acceptance criteria:**
- [ ] `getContextCapabilities(mode)` funktion exporterad från config
- [ ] Capability matrix dokumenterad i GAMEDETAILS_CONTEXT_ARCHITECTURE.md
- [ ] Minst 1 komponent konsumerar capabilities (t.ex. GameDetailLeaderTips)

---

### 2.3 Uppdatera GameDetailContext

Utöka context-providern med capabilities:

**Acceptance criteria:**
- [ ] `useGameDetailCapabilities()` hook tillgänglig
- [ ] `GameDetailContextValue` inkluderar `capabilities: ContextCapabilities`
- [ ] Bakåtkompatibelt — existerande `useGameDetail()` fungerar oförändrat

---

## Block 3: Sandbox Evolution

> **Syfte:** Utöka sandbox till att testa fler kontexter  
> **Beräknad effort:** ~3–5 SP  
> **Dependencies:** Block 2

### 3.1 Lägg till facilitator-mode i sandbox

**Acceptance criteria:**
- [ ] Mode-toggle har 4 alternativ: preview, admin, host, facilitator
- [ ] Facilitator-mode visar leaderTips och leaderScript-indikator i steg
- [ ] Diff-indikator visar vilka sektioner som skiljer sig mellan modes

---

### 3.2 Kontextkänsligt innehälls-varning

Lägg till visuell indikator i sandbox för fält som är kontextkänsliga:

**Acceptance criteria:**
- [ ] Fält som `leaderTips`, `leaderScript`, `boardText`, `privateNote` markeras med ikon/badge i sandbox
- [ ] Varje markerat fält visar vilka modes det borde vara synligt i
- [ ] Kontextkänslighets-panelen kan togglas on/off

---

### 3.3 Cross-context diff-vy

**Acceptance criteria:**
- [ ] Sandbox kan visa side-by-side: "Preview" vs "Facilitator" vs "Host"
- [ ] Diffade sektioner highlightas

---

## Block 4: Typkontrakt-harmonisering

> **Syfte:** Minska fragmenteringen mellan 4 parallella format  
> **Beräknad effort:** ~8–13 SP  
> **Dependencies:** Block 1 (bör ej blocka Block 2–3)

### 4.1 Audit av fältnamn-mismatch

**Uppgift:** Kartlägg exakt vilka fält som har olika namn i olika kontrakt och avgör om de kan unifieras.

| Display (`GameStep`) | Play (`Step`) | Play API (`StepInfo`) | Rekommendation |
|----------------------|---------------|----------------------|----------------|
| `body` | `description` | `description` + `content` | Behåll `body` i display, `description` i play — de har olika semantik |
| `durationMinutes` | `durationMinutes` | `durationMinutes` + `duration` (s) | OK — play behöver sekund-precision |
| `leaderScript` | *(saknas)* | `leaderScript` | Korrekt — play Step representerar sanitized data |

**Designbeslut krävs:**
- [ ] Ska `GameStep` och `Step` dela ett bas-interface? 
  - **Alternativ A:** `BaseStep { id, title, durationMinutes? }` → Gemensamt, utökningar per domän
  - **Alternativ B:** Behåll separata — de representerar genuint olika saker (content vs execution)
  - **Rekommendation:** Alternativ B — de har genuint olika semantik

**Acceptance criteria:**
- [ ] Mismatch-dokumentation komplett
- [ ] Beslut fattat om varje fältpar
- [ ] Dokumenterat i GAMEDETAILS_CONTEXT_ARCHITECTURE.md

---

### 4.2 PlayPage legacy-mapping

**Problem:** `PlayPage` (`features/play/PlayPage.tsx`) har sin egen `mapApiToGameRun()` som mappar från ett legacy `/api/games/${gameId}`-endpoint.

**Rekommendation:** Denna bör migreras till att konsumera samma API-format som övriga play-ytor, men det är **låg prioritet** eftersom `PlayPage` troligen ersätts av plan-baserat play-flöde.

**Acceptance criteria:**
- [ ] Beslut: Migrera eller deprecate `PlayPage`?
- [ ] Om migrera: Ny API-consumer som använder play-session-format
- [ ] Om deprecate: Markera som legacy, byt redirect

---

### 4.3 Gemensamt contract-test

**Acceptance criteria:**
- [ ] Contract test som verifierar att `mapDbGameToDetailPreview()` output matchar `GameDetailData` schema
- [ ] Contract test som verifierar att play API output matchar `ParticipantGameStepSchema`
- [ ] Båda testerna körs i CI

---

## Block 5: UX-harmonisering

> **Syfte:** Säkerställ att UX-mönster matchar kontextens intention  
> **Beräknad effort:** ~3–5 SP  
> **Dependencies:** Block 2

### 5.1 Director Preview → Session bridge

**Problem:** Director preview saknar en tydlig CTA för att starta en riktig session.

**Acceptance criteria:**
- [ ] Director preview har en "Starta live-session"-knapp eller länk
- [ ] Knappen navigerar till session-skapande-flödet
- [ ] Interaktion känns naturlig ("jag har provat, nu vill jag köra på riktigt")

---

### 5.2 LeaderTips UX i facilitator/host-mode

**Problem:** Om vi döljer leaderTips i preview (Block 1), behöver facilitator/host-mode visa dem tydligare.

**Designbeslut krävs:**
- [ ] Ska leaderTips vara en expanderbar sektion i host-mode?
- [ ] Ska leaderTips integreras med steg-visning (per steg) eller vara en separat panel?
- [ ] Ska leaderTips visas proaktivt (open by default) eller on-demand?

**Acceptance criteria:**
- [ ] LeaderTips har en designad host-mode-presentation
- [ ] UX-mönstret signalerar "operativt tips" inte "passiv information"

---

### 5.3 Kontextbaserade CTA-anpassningar

**Acceptance criteria:**
- [ ] Preview-mode: CTA = "Starta session" + "Lägg till i plan"
- [ ] Facilitator-mode (om relevant): CTA = "Starta Director Preview" + "Starta session"
- [ ] Host-mode: CTA = (inga library-CTAs — runtime har egna controls)

---

## Block 6: Framtida förbättringar (Optional)

> **Dessa kräver inga omedelbara åtgärder**

### 6.1 Cross-domain sandbox verification

Skapa en sandbox-vy som visar samma spel i alla kontexter side-by-side:
Library Preview → Facilitator View → Director Preview → Participant View → Board

### 6.2 Visibility matrix documentation

Autogenerera visibility-matris från `SECTION_VISIBILITY`-config och publicera i sandbox.

### 6.3 PlayPage migration

Migrera PlayPage från legacy `/api/games/` endpoint till session-baserat play-format.

### 6.4 Offline-ready host mode

Designa hur host play mode ska fungera med dålig uppkoppling (pre-cache game data).

---

## Exekveringsordning

```
Vecka 1: Block 1 (Informationssäkerhet)
├── 1.1 LeaderTips gate i preview
├── 1.2 Roles API audit + sanitering
└── 1.3 LeaderScript strip från serialiserat data

Vecka 2: Block 2 (Kontextutvidgning)
├── 2.1 Utöka GameDetailMode
├── 2.2 Context capability matrix
└── 2.3 Uppdatera GameDetailContext

Vecka 3: Block 3 (Sandbox) + Block 5 (UX)
├── 3.1 Facilitator-mode i sandbox
├── 3.2 Kontextkänsligt innehålls-varning
├── 5.1 Director → Session bridge
└── 5.2 LeaderTips UX i host-mode

Vecka 4+: Block 4 (Typkontrakt — kan parallelliseras)
├── 4.1 Fältnamn-mismatch audit
├── 4.2 PlayPage legacy beslut
└── 4.3 Gemensamma contract tests
```

---

## Dependencies-karta

```
Block 1 ──────────────────┐
  │                        │
  ├──▶ Block 2 ──▶ Block 3 │
  │         │              │
  │         └──▶ Block 5   │
  │                        │
  └──▶ Block 4 ────────────┘
                           │
                     Block 6 (optional)
```

---

## Risker

| Risk | Beskrivning | Mitigation |
|------|-------------|------------|
| **R1** | Ändring av leaderTips visibility kan förvåna befintliga lekledare | Kommunicera i release notes. Facilitator-mode ger dem tillgång separat |
| **R2** | Utökning av GameDetailMode kan påverka snapshot-tester | Uppdatera snapshots i samma PR |
| **R3** | Roles API audit kan avslöja mer allvarliga problem | Scope: om kritiska fält läcker, hotfix omedelbart — expandera inte scope |
| **R4** | TypeScript-ändringar i config.ts kan kaskadeffektera | Alla konsumenter av SectionVisibility importerar interface — type-safe |
| **R5** | Block 4 (typharmonisering) kan bli scope creep | Strikt scoping: BESLUT i denna fas, implementation separat |

---

## Vad som kräver designbeslut FÖRE implementation

| Beslut | Block | Alternativ | Rekommendation |
|--------|-------|-----------|----------------|
| Ska leaderTips visas i preview? | 1.1 | Dölj / Toggle / Ny mode | **Dölj** (Alternativ A) |
| Ny mapper eller strip-at-page? | 1.3 | Ny mapper / Strip i page | **Strip i page** (Alternativ B) |
| Behövs facilitator-mode i config? | 2.1 | Ja / Nej | **Ja** |
| Behövs participant-mode i config? | 2.1 | Ja / Nej | **Nej** (Play-domänen hanterar) |
| Delade bas-typer mellan display/play? | 4.1 | BaseStep / Separata | **Separata** (Alternativ B) |
| Migrera eller deprecate PlayPage? | 4.2 | Migrera / Deprecate | **Beslut krävs** |

---

## Vad som kräver datakontraktsbeslut FÖRE implementation

| Kontrakt | Block | Fråga |
|----------|-------|-------|
| `/api/games/[id]/roles` response shape | 1.2 | Vilka fält ska returneras för icke-admin? |
| `GameStep` serialisering i RSC | 1.3 | Ska `leaderScript` finnas i public GameDetailData? |
| `ContextCapabilities` interface | 2.2 | Vilka capabilities definierar vi? |
| `SectionVisibility` för facilitator | 2.1 | Vilka sektioner är synliga? |

---

## Definition of Done per block

### Block 1: Informationssäkerhet
- [ ] Inga facilitator-only-fält exponeras i preview-mode (UI eller data)
- [ ] Roles API returnerar bara publika fält för icke-admin
- [ ] Contract test verifierar att privata fält strippas
- [ ] `npx tsc --noEmit` passerar

### Block 2: Kontextutvidgning
- [ ] `GameDetailMode` har minst 4 värden
- [ ] Context capability matrix definierad och dokumenterad
- [ ] Alla existerande tests passerar utan ändringar (backwards compat)
- [ ] `npx tsc --noEmit` passerar

### Block 3: Sandbox Evolution
- [ ] Sandbox visar alla definierade modes
- [ ] Kontextkänsliga fält har visuell markering
- [ ] Mode-diff-vy fungerar

### Block 4: Typkontrakt-harmonisering
- [ ] Fält-mismatch fullständigt dokumenterad
- [ ] Beslut fattat och dokumenterat per fältpar
- [ ] Minst 2 gemensamma contract tests i CI

### Block 5: UX-harmonisering
- [ ] Director Preview har session-start CTA
- [ ] LeaderTips har anpassad presentation i host/facilitator-mode
