# PLAY SYSTEM DOCUMENTATION
## Komplett teknisk dokumentation av Lekbankens /play-ekosystem

**Version:** 1.1  
**Datum:** 2026-01-17  
**Status:** Referensdokument

---

## Processdokumentation (kontinuerlig)

### Principer
- **Endast dokumentation uppdateras** tills du ger explicit klartecken för implementation.
- **Sandbox Atlas Evolution** används som historisk referens när kopplingar är oklara.
- Alla beslut dokumenteras här innan kodförändringar görs.

### Logg
- **2026-01-17**: Initierat kontinuerlig dokumentation. Skapade implementeringsplan utifrån Golden Flows + UX-spec.
- **2026-01-17**: Steg 1 påbörjat: kartlade nuvarande filer per GF1–GF3 och dokumenterade kända gap.
- **2026-01-17**: Steg 1 fördjupat: definierade verifieringschecklist och dokumenterade UI-state-resolver (spec).
- **2026-01-17**: Steg 3 specificerat: Run-vy (NOW/NEXT/CONTROLS/HEALTH), tabs och copy/acceptans för GF1.
- **2026-01-17**: Steg 4 specificerat: Participant Join/Lobby/Live/Rejoin med states, copy och acceptans för GF2.
- **2026-01-17**: Steg 5 specificerat: Board templates, safe mode, copy och acceptans för GF3.
- **2026-01-17**: Steg 6–7 specificerat: konsistenta states/copy och manuell testchecklista.
- **2026-01-17**: Steg 1.E tillagt: verifieringspunkter med fil- och endpoint-referenser.
- **2026-01-17**: Risklogg (P0) tillagd. Nästa: Atlas Evolution-spårning.
- **2026-01-17**: Atlas Evolution-spårning påbörjad. Dokumenterar historiska kopplingar per GF.
- **2026-01-17**: Atlas Evolution-spårning pausad. Går vidare utan historisk förankring tills underlag finns.
- **2026-01-17**: Steg 8 specificerat: drift/observability, larm, rollback och release-checklista.
- **2026-01-17**: Progression per steg dokumenterad. Implementation pausad i väntan på explicit klartecken.
- **2026-01-18**: Klartecken mottaget. Påbörjad implementation: i18n för Play/App-sidor samt lint-fixar (state-in-effect, hardcoded strings) i berörda vyer.
- **2026-01-18**: Play-relaterat: åtgärdade hook-deps i Play-komponenter (t-deps) och städade bort trasig shared-export.
- **2026-01-18**: Play-relaterat: i18n-rensning i marketing-/play-join samt session-lobby (ersatte hardcoded strings med t-nycklar).
- **2026-01-18**: Play-relaterat: lokaliserade fallback-texter i PlayPage/PlayPlanPage (legacy-map) och justerade hook-deps.
- **2026-01-18**: Play-relaterat: uppdaterade /participants/view till UI-state-resolver + i18n (banner/status/connection/broadcast).
- **2026-01-18**: Play-relaterat: införde safe-mode cache/fallback i board-klienten + uppdateringsbanner.
- **2026-01-18**: Play-relaterat: lokaliserade SessionCockpit (header/tabs/triggers/fallbacks) och återanvände preflight-checklistans i18n-builder i `useSessionState`.
- **2026-01-18**: Play-relaterat: lokaliserade host-lobbyn (LobbyHub) med nya i18n-nycklar för status, sektioner och CTA.
- **2026-01-18**: Play-relaterat: lokaliserade hostens sessionslista (filter, empty state, header, felmeddelanden).
- **2026-01-18**: Play-relaterat: lokaliserade host-vyn för deltagarsessioner (dashboard, kontrollpanel, deltagarlista, progresspanel).
- **2026-01-18**: Play-relaterat: lokaliserade rollväljare för deltagare samt audio player (aria-labels och felmeddelanden).
- **2026-01-18**: Play-relaterat: lokaliserade session actions och session history viewer (filter, status, pagination, felmeddelanden).
- **2026-01-18**: Play-relaterat: lokaliserade sessionshistorik-sidan och sessionsanalysvyn (export, stats, tabeller, fel/empty/loading).
- **2026-01-18**: Play-relaterat: lokaliserade skapa-session-sidan för deltagarsessioner.
- **2026-01-18**: Play-relaterat: lokaliserade roll- och statusetiketter i sessionsanalysens deltagartabell.
- **2026-01-18**: Play-relaterat: lokaliserade deltagarens join-sida (form, fel, CTA, hjälptext).
- **2026-01-18**: Play-relaterat: lokaliserade fel-fallback i deltagarens view-polling.
- **2026-01-18**: Play-relaterat: lokaliserade QR-scanner (success/fel-fallback och NO-nycklar).
- **2026-01-18**: Play-relaterat: lokaliserade datumformat i hostens deltagarsession-vy.
- **2026-01-18**: Play-relaterat: lokaliserade TriggerCard (status, etiketter, sammanfattning).
- **2026-01-18**: Play-relaterat: lokaliserade TriggerTemplateLibrary (kategorier, kanaler och tagg-sammanfattning).
- **2026-01-18**: Play-relaterat: lokaliserade RoleCard (rubriker/etiketter för roll, instruktioner och tips).
- **2026-01-18**: Play-relaterat: lokaliserade StepPhaseNavigation (start-etiketter, navigation, media och minutformat).
- **2026-01-18**: Play-relaterat: lokaliserade TriggerLivePanel (titel, execute-once, delayformat och tidsformattering per locale).
- **2026-01-18**: Play-relaterat: lokaliserade LeaderScriptPanel (rubriker, faser, tomtexter och spel/steg-rad).
- **2026-01-18**: Play-relaterat: lokaliserade PropConfirmationManager (foto-alt och anteckningslabel).
- **2026-01-18**: Play-relaterat: lokaliserade StoryViewModal (minutformat och script-etikett).
- **2026-01-18**: Play-relaterat: lokaliserade DecisionsPanel (statusbadge och options-placeholder).
- **2026-01-18**: Play-relaterat: lokaliserade SessionStoryPanel (story/countdown overlay, faser/steg och feltexter).
- **2026-01-18**: Play-relaterat: lokaliserade ActiveSessionShell (tillbaka-CTA och chattlabel).
- **2026-01-18**: Play-relaterat: lokaliserade TriggerDryRunPanel (execute-once badge).
- **2026-01-18**: Play-relaterat: lokaliserade ConversationCardsCollectionArtifact (progress och uppföljningsrader).
- **2026-01-18**: Play-relaterat: lokaliserade ArtifactsPanel (visibility-etiketter).
- **2026-01-18**: Play-relaterat: lokaliserade StepViewer (minuter/sekunder-labels).
- **2026-01-18**: Play-relaterat: lokaliserade OutcomePanel (status/CTA-texter).
- **2026-01-18**: Play-relaterat: lokaliserade BatchArtifactPanel (artifakttyper, operationsverb och pluralisering).
- **2026-01-18**: Play-relaterat: lokaliserade SignalPanel (statusbadge).
- **2026-01-18**: Play-relaterat: lokaliserade EventFeedPanel (detaljlabel, separator och locale-tider).
- **2026-01-18**: Play-relaterat: lokaliserade TimerControl (minut/sekund-labels och snabbknappar).
- **2026-01-18**: Play-relaterat: lokaliserade TimeBankPanel (snabbknappar, delta-format och locale-tid).
- **2026-01-18**: Play-relaterat: lokaliserade TimeBankLivePanel (titel, snabbjusteringar, historik-toggle och locale-tid).
- **2026-01-18**: Play-relaterat: lokaliserade AnalyticsDashboard (titel, tabs, export och beskrivning).
- **2026-01-18**: Play-relaterat: lokaliserade ReadinessIndicator (rubrik, kategorier, checks och summeringar).
- **2026-01-18**: Play-relaterat: lokaliserade RoleAssigner (rubriker, knappar, status och sammanfattningar).
- **2026-01-18**: Play-relaterat: lokaliserade SessionTimeline (live-label och locale-tid).
- **2026-01-18**: Play-relaterat: lokaliserade DirectorModeDrawer (leader script, triggers/signaler, separators och locale-tider).
- **2026-01-18**: Play-relaterat: lokaliserade HostPlayMode (roller-count i manage-tab).
- **2026-01-18**: Play-relaterat: lokaliserade ParticipantSessionWithPlay (nedräkning vid join gate).
- **2026-01-18**: Play-relaterat: lokaliserade FacilitatorDashboard (signal-fel och nedräkningslabel).
- **2026-01-18**: Play-relaterat: lokaliserade SignalCapabilityTest (kort tillgänglighetsbadge).
- **2026-01-18**: Play-relaterat: lokaliserade TimeBankRuleEditor (rubrik och max-badge).
- **2026-01-18**: Play-relaterat: lokaliserade SignalPresetEditor (default-namn och notif-rubrik).
- **2026-01-18**: Play-relaterat: lokaliserade ShortcutHelpPanel (modifikatortangenter och separator).
- **2026-01-18**: Play-relaterat: lokaliserade SignalPanel (förvalda kanallabels).
- **2026-01-18**: Play-relaterat: lokaliserade PuzzleProgressPanel (locale-tider).
- **2026-01-18**: Play-relaterat: lokaliserade PuzzleArtifactRenderer (serverfel, statusmeddelanden och sound/timebank-badges).
- **2026-01-18**: Play-relaterat: körde lint för Play-komponenter (features/play/**/*.tsx) utan kvarvarande hardcoded strings.
- **2026-01-18**: I18n fortsättning utanför Play: lokaliserade marketing header/footer + features/pricing, admin analytics (dashboard + errors) och justerade AudioPlayer hook-deps.
- **2026-01-18**: I18n fortsättning utanför Play: lokaliserade admin billing (invoices/subscriptions) tabellrubriker, statusetiketter och tom-/auth-texter.
- **2026-01-18**: I18n fortsättning utanför Play: lokaliserade admin Design hub (DesignPageClient) för rubriker, tabs och info-copy.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: lokaliserade GameBuilderForm/GameBuilderPage samt ArtifactEditor/ArtifactWizard (inkl. template-texter) och lade till nya i18n-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: färdigställde DecisionEditor (UI-strängar + templates) och lade till decision-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: lokaliserade TriggerEditor (UI-strängar, villkor/åtgärder, placeholders) och lade till trigger-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: kompletterade PhaseEditor (timer-label) och lade till nyckel i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: kompletterade BoardEditor (placeholder/defaults) och lade till nyckel i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: lokaliserade SnapshotManager (UI-strängar, fel/empty/laddning) och lade till snapshot-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: lokaliserade ValidationPanel (rubriker, counts, labels, CTA) och lade till validation-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: lokaliserade QualityChecklist (rubriker, status, checklisttexter) och lade till quality-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: kompletterade StepEditor (minutetikett) och lade till nyckel i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: lokaliserade TriggerSimulator (UI, event-labels, status/empty) och lade till triggerSimulator-nycklar i sv/en/no.
- **2026-01-18**: I18n fortsättning i Admin Game Builder: verifierade RoleEditor (UI-strängar, tabs, hints, counts, färg/ikon/strategi) och bekräftade role-nycklar i sv/en/no.
- **2026-01-18**: Kvalitetsgate: `npm run type-check` + `npm test` gröna. Commit/push genomförd (main).
- **2026-01-18**: Datamodell-align: ersatte `participant_status = 'pending'` i API/UI med enum-kompatibel `idle` för “awaiting approval” (ingen DB-migration gjord).
- **2026-01-18**: Lokal build-fix (screenshot): `next-intl` kraschade p.g.a. ogiltig JSON i `messages/*.json` (t.ex. “trailing comma / Expected ',' or '}'”). Rensade/lagade `messages/en.json`, `messages/no.json`, `messages/sv.json` så att de är parsebara igen.

### Status (2026-01-18) — Full kontroll

**Genomfört (klart)**
- Supabase: `supabase db push` körd, remote var “up to date”. (Diff-check blockerad lokalt p.g.a. Docker saknas.)
- Lint: blockerande ESLint-fel åtgärdat (varningar kvarstår).
- TypeScript: `npm run type-check` passerar.
- Tester: `npm test` passerar (smoke + CSV header sync + trigger alias roundtrip + Legendary JSON roundtrip).
- Git: ändringar committade och pushade till `main`.

**Återstår / att besluta (kvar)**
- **DB enum**: Om “awaiting approval” ska vara `idle` (som nu) eller om vi ska införa `participant_status = 'pending'` via DB-migration + typgenerering.
- **Docker lokalt**: Installera/starta Docker Desktop för att kunna köra `supabase db diff` och verifiera migrations.
- **ESLint warnings**: många kvarvarande varningar (ej blockerande). Prioritera de som riskerar regressions (hooks deps, react compiler hints).
- **EOL/CRLF**: LF→CRLF-varningar i git-add på Windows. Besluta `.gitattributes`/`core.autocrlf` policy.
- **Runtime smoke**: kör `npm run dev` och navigera GF1–GF3 manuellt (Host session, Participant join/rejoin, Board safe-mode) efter de stora ändringarna.

**Screenshot (lokalt) — Build Error (sammanfattning)**
- Fel: “Unable to make a module from invalid JSON … trailing comma …” i `messages/en.json` (och även no/sv).
- Påverkan: Next.js/Turbopack kunde inte generera chunk för locale-filen → appen startar inte.
- Åtgärd: rensade trasiga objekt/kommor och återställde giltig JSON.

### Progression (i18n Play)
- **Senast kontrollerad:** 2026-01-18
- **Genomförda (urval):** FacilitatorDashboard, SignalCapabilityTest, TimeBankRuleEditor, SignalPresetEditor, ShortcutHelpPanel, SignalPanel, PuzzleProgressPanel, ParticipantSessionWithPlay, ParticipantSignalMicroUI, RoleAssignerContainer, NavigationControls, SessionChatDrawer, PreflightChecklist, PuzzleArtifactRenderer.
- **Återstår att verifiera/åtgärda enligt senaste lint-lista (play-lint.txt):** inga kvarvarande träffar i features/play/**/*.tsx efter lint-körning.
- **Nästa steg:** fortsätt bevaka och rensa eventuella nya träffar vid framtida ändringar. (Övriga i18n-lintvarningar kan kvarstå i admin/marketing enligt senaste körning.)

---

## Implementeringsplan (tydliga steg)

### Progression per steg (status)
- **Steg 1 (P0)**: Dokumenterat (mappning, gap, verifiering, risker). **Status: Klart (doc)**.
- **Steg 2 (P0)**: UI-state-resolver spec dokumenterad. **Status: Klart (doc)**.
- **Steg 3 (P0)**: Host IA + Run view dokumenterad. **Status: Klart (doc)**.
- **Steg 4 (P0)**: Participant Join/Lobby/Live/Rejoin dokumenterad. **Status: Klart (doc)**.
- **Steg 5 (P0)**: Board templates + safe mode dokumenterad. **Status: Klart (doc)**.
- **Steg 6 (P0)**: Konsistenta states & copy dokumenterat. **Status: Klart (doc)**.
- **Steg 7 (P0)**: Testchecklista dokumenterad. **Status: Klart (doc)**.
- **Steg 8 (P1)**: Drift/observability/rollback dokumenterat. **Status: Klart (doc)**.

**Implementation:** Pågår enligt prioritering (lint-blockerare → Play-flöden → övrigt).

### Mål
Säkerställa att GF1–GF3 fungerar stabilt och förutsägbart med tydlig UI/IA och robusta state-overgångar, utan att ändra datamodell eller API i onödan.

### Steg 1 — Förstudie och spårbarhet (P0)
**Syfte:** Full kontroll och koppling till historik.
- Bekräfta relevanta historiska kopplingar i **Sandbox Atlas Evolution**.
- Mappa nuvarande filer och ansvar per Golden Flow (Host/Participant/Board).
- Lista gap mellan nuvarande UX och specificerad UX.

#### Steg 1.A — Mappning per Golden Flow (nuvarande)

**GF1 Host — Run a live session end-to-end**
- Host-routes
  - Sessionslista: app/app/play/sessions/page.tsx, app/app/play/sessions/client.tsx
  - Sessionsdetalj: app/app/play/sessions/[id]/page.tsx, app/app/play/sessions/[id]/client.tsx
- API
  - /api/play/sessions (GET/POST)
  - /api/play/sessions/[id] (GET/PATCH)
  - /api/play/sessions/[id]/participants
  - /api/play/sessions/[id]/artifacts
  - /api/play/sessions/[id]/triggers
- UI-komponenter
  - components/play/SessionHeader
  - components/play/SessionControls
  - components/play/ParticipantList
  - components/play/SessionStatusMessage

**GF2 Participant — Join → wait → interact → rejoin**
- Participant-routes
  - Join: app/participants/join/page.tsx
  - View: app/participants/view/page.tsx
- API
  - /api/participants/sessions/join
  - /api/participants/sessions/rejoin
  - /api/participants/sessions/[sessionId]/participants
- Hooks
  - features/participants/hooks/useParticipantRejoin
  - features/participants/hooks/useParticipantHeartbeat
  - features/participants/hooks/useParticipantBroadcast

**GF3 Board — Public display that never breaks**
- Board-route
  - app/board/[code]/page.tsx
- API
  - /api/play/board/[code]

#### Steg 1.B — Identifierade gap mot UX-spec (förstudie)

**GF1 Host**
- Saknar tabs/IA för Run/Participants/Artifacts/Triggers/Board/Settings.
- Run-vy saknar NOW/NEXT/CONTROLS + Health-panel.
- UI saknar `ui_mode = lobby|live`-härledning (started_at/flagga).
- Quick actions saknas eller ligger utspritt.

**GF2 Participant**
- Lobby är inte förstaklass; `/participants/view` saknar tydlig statusvy.
- Pending/requireApproval saknas eller otydligt i UI.
- Join-feltyper (invalid/full/ended) inte konsekvent presenterade.

**GF3 Board**
- Board saknar explicita Lobby/Live templates i dokumenterad struktur.
- Safe mode/caching och "Uppdaterar…" overlay saknas i nuvarande vy.

#### Steg 1.C — Historik-referens
- **Sandbox Atlas Evolution**: används vid oklar koppling mellan tidigare Play-flöden och nuvarande implementation.
- Inga förändringar görs innan spårning är bekräftad i historiken.

#### Steg 1.D — Verifieringschecklist (utan kodändringar)
**Syfte:** Säkerställa att vi förstår faktiska nuvarande flöden innan vi föreslår implementation.

**GF1 Host (Run)**
- Bekräfta hur “start” markeras (fält: `started_at`, `status` i `participant_sessions`).
- Verifiera var “phase/step” läses och presenteras i host-vyn.
- Identifiera var triggers/artifacts hämtas och om de filtreras per steg.
- Bekräfta om “locked” används i praktiken (UI eller API).

**GF2 Participant**
- Verifiera rejoin-flöde: vad returnerar `/api/participants/sessions/rejoin` vid ended/invalid.
- Bekräfta hur pending/approval hanteras (om `requireApproval` finns i settings).
- Kontrollera var participant prompt hämtas (participant_prompt vs board_text).

**GF3 Board**
- Verifiera vilka board-data som hämtas i `/api/play/board/[code]` (session, artifacts, decisions, outcomes).
- Bekräfta hur board visar status för paused/ended.
- Kontrollera om någon “safe mode” mekanism redan finns (cache eller fallback).

#### Steg 1.E — Verifiering med källhänvisningar
**Syfte:** Exakt spårbarhet mellan krav och kod/endpoint.

**GF1 Host (Run) — källor**
- **Session status & start**
  - API: `app/api/play/sessions/[id]/route.ts` (PATCH: `start|pause|resume|end`)
  - UI: `app/app/play/sessions/[id]/client.tsx` (statushantering i host-vy)
- **Phase/Step display**
  - API: `app/api/play/sessions/[id]/game/route.ts` (steg/faser, overrides)
  - UI: `components/play/SessionHeader` (översikt), `components/play/SessionControls` (kontroller)
- **Artifacts/Triggers per step**
  - API: `app/api/play/sessions/[id]/artifacts/route.ts`
  - API: `app/api/play/sessions/[id]/triggers/route.ts`

**GF2 Participant — källor**
- **Join**
  - UI: `app/participants/join/page.tsx`
  - API: `app/api/participants/sessions/join/route.ts`
- **Rejoin**
  - Hook: `features/participants/hooks/useParticipantRejoin.ts`
  - API: `app/api/participants/sessions/rejoin/route.ts`
- **View + realtime**
  - UI: `app/participants/view/page.tsx`
  - Realtime: `features/participants/hooks/useParticipantBroadcast.ts`
  - Presence: `features/participants/hooks/useParticipantHeartbeat.ts`

**GF3 Board — källor**
- **Board view**
  - UI: `app/board/[code]/page.tsx`
  - API: `app/api/play/board/[code]/route.ts`
- **Public data sanitization**
  - API: `app/api/play/sessions/[id]/artifacts/route.ts` (host vs participant view)

#### Risklogg (P0)

**GF1 Host**
- **Risk:** `active` kan betyda lobby eller live → fel CTA/UI.
  - **Mitigering:** Inför `uiMode` med `started_at`-härledning.
- **Risk:** Quick actions spridda → kognitiv last.
  - **Mitigering:** Begränsa till Run + flytta övrigt till tabs.

**GF2 Participant**
- **Risk:** Rejoin/ended fel leder till blank vy.
  - **Mitigering:** Tydlig ended/pending state + fallback till join.
- **Risk:** Approval saknas i UI trots `requireApproval`.
  - **Mitigering:** Pending-state som förstaklass i `/participants/view`.

**GF3 Board**
- **Risk:** Realtime-störning → blank skärm.
  - **Mitigering:** Safe mode med cache + overlay.
- **Risk:** Visar hemlig data (artifacts/metadata).
  - **Mitigering:** Endast public/saniterad payload.

#### Atlas Evolution-spårning (pågående)
**Syfte:** Förankra historiska beslut och tidigare kopplingar innan implementation.

**Format för spårning**
- **Källa (Atlas)**: Modul/sida/ID
- **Historisk intent**: Vad var avsikten?
- **Nuvarande implementation**: Var i koden finns detta idag?
- **Gap/Avvikelse**: Vad saknas eller har driftat?
- **Beslut**: Behåll / Justera / Avfärda

**GF1 Host — Atlas-spårning**
- **Run/Live-läge**: Ursprunglig definition av lobby/live + triggers
- **Host controls**: Start/Pause/Resume/End + timer-funktioner
- **Now/Next-koncept**: Om fanns, hur mappas det idag?

**GF2 Participant — Atlas-spårning**
- **Join/Approval**: Policy för requireApproval och pending
- **Lobby-state**: Ursprungligt flöde och copy
- **Rejoin**: Token- och återanslutningspolicy

**GF3 Board — Atlas-spårning**
- **Lobby template**: QR + kod + instruktion
- **Live template**: phase/step/timer/board_text
- **Safe mode**: Fanns fallback eller cache-krav?

**Status**: Pågår — kräver verifiering i Atlas Evolution och dokumenteras här när fynd är bekräftade.

**Statusnotis**: Spårningen är pausad och återupptas när Atlas-underlag delas.

### Steg 2 — Gemensam UI-state-resolver (P0)
**Syfte:** Enhetliga states och mindre if-spaghetti.
- Definiera `uiMode`, `sessionBanner`, `allowedActions`, `connectionHealth`.
- Dokumentera exakt härledning från DB-fält (t.ex. `status`, `started_at`, `paused_at`).

#### Steg 2.A — UI-state-resolver (spec)

**Mål:** Ett deterministiskt state-lager som återanvänds i Host/Participant/Board.

**Föreslagen outputstruktur**
```ts
type UiMode = 'lobby' | 'live' | 'paused' | 'ended' | 'locked';
type ConnectionHealth = 'connected' | 'degraded' | 'offline';
type SessionBanner = 'waiting' | 'paused' | 'locked' | 'ended' | 'degraded' | 'offline' | 'none';

type AllowedActions = {
  start: boolean;
  pause: boolean;
  resume: boolean;
  end: boolean;
  advanceStep: boolean;
  revealArtifacts: boolean;
  fireManualTriggers: boolean;
};

type UiState = {
  uiMode: UiMode;
  banner: SessionBanner;
  connection: ConnectionHealth;
  allowed: AllowedActions;
};
```

**Härledning (förslag)**
- `status = ended|archived|cancelled` → `uiMode = ended`, `banner = ended`
- `status = paused` → `uiMode = paused`, `banner = paused`
- `status = locked` → `uiMode = locked`, `banner = locked`
- `status = active` + `started_at is null` → `uiMode = lobby`, `banner = waiting`
- `status = active` + `started_at set` → `uiMode = live`, `banner = none`

**ConnectionHealth**
- `connected`: realtime OK och senaste event < 10s
- `degraded`: realtime saknas men senaste poll < 30s
- `offline`: ingen realtime + ingen lyckad poll > 30s

**AllowedActions (Host)**
- `start`: `uiMode = lobby`
- `pause`: `uiMode = live`
- `resume`: `uiMode = paused`
- `end`: `uiMode in (live|paused|locked|lobby)`
- `advanceStep`: `uiMode = live`
- `revealArtifacts`: `uiMode = live`
- `fireManualTriggers`: `uiMode = live`

**Copy-banners (svenska)**
- `waiting`: “Väntar på start. Deltagare kan ansluta med koden.”
- `paused`: “Pausad. Deltagare ser pausläge.”
- `locked`: “Låst: inga nya deltagare kan gå med.”
- `ended`: “Sessionen är avslutad. Tack för att ni deltog.”
- `degraded`: “Uppkopplingen är instabil. Visar senaste kända läge.”
- `offline`: “Ingen anslutning. Försök igen.”

### Steg 3 — Host IA + Run View (P0)
**Syfte:** GF1 fungerar utan att lämna Run-tab.
- Tabs: Run, Participants, Artifacts, Triggers, Board, Settings.
- Run layout: NOW / NEXT / CONTROLS + Health panel.
- Begränsa quick actions till rekommenderade.

#### Steg 3.A — IA: Tabs och informationsarkitektur
**Tabs (i sessionsdetalj):**
1. **Run** (default)
2. **Participants**
3. **Artifacts**
4. **Triggers**
5. **Board**
6. **Settings**

**Navigationsprinciper**
- Run ska alltid innehålla allt som behövs för normal sessiondrift.
- Övriga tabs ska inte krävas för GF1 (förutom edge cases).

#### Steg 3.B — Run layout (NOW / NEXT / CONTROLS / HEALTH)

**Block A — NOW (primär fokus)**
- **Current Phase**: namn + index
- **Current Step**: titel
- **“Just nu”-instruktion** (prioritet): `leader_script` → `board_text` → `body`
- **Status badges**: Sessionstatus + Realtime health

**Block B — NEXT**
- **Nästa steg**: titel + 1–2 rader (preview)
- **Primary CTA**: “Gå vidare” (Advance step) när live
- **Auto-advance indikator**: visa om fas/step har auto_advance
- **Avbryt auto**: liten länk/knapp om auto_advance är aktiv

**Block C — CONTROLS**
- **Start / Pause / Resume / End** (state-baserat)
- **Timer controls**: start/stop/reset (och tidbank ± om aktiv)
- **Quick actions** (endast rekommenderade):
  - Reveal current-step artifacts
  - Fire current-step manual triggers

**Block D — HEALTH (alltid synlig)**
- **Realtime**: Connected / Degraded / Offline
- **Participants**: Active / Idle / Disconnected / Pending counts
- **Board**: last_update timestamp
- **Triggers**: Armed / Error counts

#### Steg 3.C — State rules (Run)

| Session status | uiMode | Primär CTA | Banner |
|---|---|---|---|
| active + not started | lobby | Start session | “Väntar på start. Deltagare kan ansluta med koden.” |
| active + running | live | Advance step | (ingen/neutral) |
| paused | paused | Resume | “Pausad. Deltagare ser pausläge.” |
| locked | locked | Unlock | “Låst: inga nya deltagare kan gå med.” |
| ended | ended | Archive / New session | “Sessionen är avslutad. Tack för att ni deltog.” |

#### Steg 3.D — UI-regler för quick actions
- **Reveal artifacts**: endast artifakter kopplade till aktuell step.
- **Fire trigger**: endast manuella triggers kopplade till aktuell step.
- Alla andra åtgärder flyttas till respektive tab.

#### Steg 3.E — Copy (svenska)
- Lobby: “Väntar på start. Deltagare kan ansluta med koden.”
- Paus: “Pausad. Deltagare ser pausläge.”
- Degraded realtime: “Uppkopplingen är instabil. Visar senaste kända läge.”
- Offline: “Ingen anslutning. Försök igen.”
- End confirm: “Avsluta sessionen? Deltagare och board kommer visa att leken är slut.”

#### Steg 3.F — Acceptanskriterier (GF1)
1. Host kan köra GF1 utan att lämna Run-tabben.
2. Run-vyn visar alltid current phase/step och tydlig instruktion.
3. Primära knappar är korrekt enabled/disabled baserat på uiMode.
4. Health-panel visar realtimestatus och påverkar banner.
5. Board last_update uppdateras minst vid phase/step change.

### Steg 4 — Participant Lobby + Rejoin (P0)
**Syfte:** GF2 blir friktionsfri och robust.
- Förstaklass-lobby (state i `/participants/view` eller ny route).
- Join-validering och pending-state.
- Rejoin-flöde med tydliga fallbacks.

#### Steg 4.A — IA & routes
**Rekommenderad IA**
- `/participants/join` — Join-form
- `/participants/view` — Primär vy (lobby/live/ended via `uiMode`)
- (Valfritt) `/participants/lobby` om man vill separera routes, men helst **single view** med tydliga states.

#### Steg 4.B — Join UX (form)
**Fält & validering**
- **Sessionskod**: auto-uppercase, visuellt grupperad (ex: `H3K 9QF`).
- **Namn**: min 2 tecken, trim, max 50.
- **CTA**: “Gå med”.

**Fel- och edge-states**
- **Invalid code** → “Koden verkar vara fel. Kontrollera och försök igen.”
- **Session full** → “Sessionen är full. Försök igen senare.”
- **Session ended** → “Sessionen är avslutad.”
- **Require approval** → “Väntar på godkännande från lekledaren…”

#### Steg 4.C — Lobby state (förstaklass)
**Måste alltid visa**
- Stor **statusrubrik**: Väntar / Pågår / Paus / Avslutad / Väntar på godkännande
- **“Vad händer nu?”**-text med lugnande copy
- **Ditt namn** (och ev. roll om publik)
- **Anslutningsindikator**: Connected / Degraded / Offline

**Copy (svenska)**
- Waiting: “Väntar på att lekledaren startar.”
- Pending: “Väntar på godkännande från lekledaren…”
- Paused: “Paus. Snart kör vi igen.”
- Ended: “Sessionen är avslutad. Tack för att du var med.”

#### Steg 4.D — Live view (participant)
**Layout**
- En **huvudpanel** med tydligt “Just nu”-prompt
- **Artifact UI** endast när relevant och synligt
- **Feedback** nära interaktionen (t.ex. “Korrekt”, “Försök igen”)

**Mobilkrav**
- Minst 44px touch targets
- Ingen sidomeny; minimera navigering

#### Steg 4.E — Rejoin rules
1. Om token finns → POST `/api/participants/sessions/rejoin`.
2. Om `ended` → visa ended-state med tydlig copy.
3. Om invalid token → redirect till join med “Din anslutning gick inte att återställa. Gå med igen.”
4. Om `allowRejoin=false` → visa join med förklaring.

#### Steg 4.F — Acceptanskriterier (GF2)
1. Join tar < 10 sekunder i normalfall (inkl. redirect).
2. Deltagare ser alltid en meningsfull vy (ingen blank state).
3. Rejoin sker automatiskt vid refresh när `allowRejoin=true`.
4. Paused/Ended visar korrekt status-copy.
5. Artifact UI är mobilvänligt.

### Steg 5 — Board Templates + Safe Mode (P0)
**Syfte:** GF3 aldrig blank skärm.
- Lobby-template och Live-template.
- Safe mode med cache + overlay “Uppdaterar…”.

#### Steg 5.A — Board templates (Lobby / Live)

**Template A — Lobby**
- **Sessionnamn**
- **Sessionskod** (stor, max-kontrast)
- **QR-kod** till `/participants/join` (eller `/play` om genväg)
- **Kort instruktion** (1–2 rader)
- **welcome_message** om satt

**Template B — Live**
- **Phase name + Step title**
- **Timer** (om enabled i boardConfig)
- **“Just nu”-text** (`board_text` prioriterat)
- **Synliga artifacts** (endast public)
- **Beslut/omröstningar** om aktiva

#### Steg 5.B — Safe mode (kritisk)
**Princip:** Board får aldrig bli blank.

**Regler**
- Spara **senaste kända state** lokalt (minne) vid lyckad fetch.
- Vid realtime/requests degraderade: visa cache och overlay.
- Overlay-text: “Uppdaterar…” + timestamp för senaste uppdatering.
- Om ingen cache finns: fallback till Lobby-template med generiskt budskap.

#### Steg 5.C — Readability rules
- **Max två textnivåer** (rubrik + stödtext).
- **Stabila marginaler** och grid (undvik layout-jump).
- **Inga interna controls** på board.

#### Steg 5.D — Copy (svenska)
- Lobby: “Skanna QR-koden eller skriv in koden för att gå med.”
- Live (neutral): “Följ instruktionerna på skärmen.”
- Safe mode overlay: “Uppdaterar… Visar senaste kända läge.”

#### Steg 5.E — Acceptanskriterier (GF3)
1. Board visar alltid en meningsfull vy även om data saknas temporärt.
2. Board byter inte layout oförutsägbart vid state changes.
3. Safe mode aktiveras vid degraded/offline och återhämtar sig.
4. Board visar endast saniterad/public data.

### Steg 6 — Konsistenta states & copy (P0)
**Syfte:** Samma språk och beteende över hela /play.
- Standardiserad copy för waiting/paused/ended/pending.
- Gemensamma komponenter för tomt/laddar/fel.

#### Steg 6.A — State-taxonomi (delad)
**Gemensamma states**
- `lobby` (waiting)
- `live`
- `paused`
- `ended`
- `locked`
- `pending` (participant approval)

**UI-krav**
- Samma state ska alltid ge samma copy och layoutstruktur.
- Alla vyer ska ha en “tillståndspanel” (banner eller header).

#### Steg 6.B — Copy-matrix (svenska)

| State | Host | Participant | Board |
|---|---|---|---|
| waiting | “Väntar på start. Deltagare kan ansluta med koden.” | “Väntar på att lekledaren startar.” | “Skanna QR-koden eller skriv in koden för att gå med.” |
| live | (ingen/neutral) | “Nu kör vi.” | “Följ instruktionerna på skärmen.” |
| paused | “Pausad. Deltagare ser pausläge.” | “Paus. Snart kör vi igen.” | “Pausad. Återkommer strax.” |
| ended | “Sessionen är avslutad. Tack för att ni deltog.” | “Sessionen är avslutad. Tack för att du var med.” | “Sessionen är avslutad.” |
| locked | “Låst: inga nya deltagare kan gå med.” | “Sessionen är låst.” | “Sessionen är låst.” |
| pending | (n/a) | “Väntar på godkännande från lekledaren…” | (n/a) |

#### Steg 6.C — Empty/Loading/Error komponenter
**Gemensam struktur**
- Title (kort), Description (1 rad), Optional CTA.

**Standardtexter**
- Loading: “Laddar…”
- Empty (host sessions): “Inga sessioner ännu.”
- Error (generic): “Något gick fel. Försök igen.”

#### Steg 6.D — Metadata-säkerhet
- All participant/board copy måste gå via saniterad data.
- Inga hemliga fält får exponeras i public views.

### Steg 7 — Testchecklista (P0)
**Syfte:** Verifiera GF1–GF3 med manuella scenarier.
- Dokumentera steg-för-steg testlista (host/participant/board).

#### Steg 7.A — Manual test checklist (GF1–GF3)

**GF1 — Host**
1. Skapa session → verify lobby state + banner.
2. Deltagare ansluter → participant count uppdateras.
3. Starta session → `uiMode=live`, NOW/NEXT uppdateras.
4. Pause/Resume → korrekt banner + controls.
5. End → board/participants visar ended.

**GF2 — Participant**
1. Join med korrekt kod → redirect till view.
2. Fel kod → korrekt felmeddelande.
3. Pending (requireApproval) → pending state.
4. Refresh → rejoin fungerar.
5. Ended session → ended copy.

**GF3 — Board**
1. Lobby template visar kod + QR + welcome_message.
2. Live template visar phase/step + timer + board_text.
3. Simulera realtime degraderad → safe mode overlay + cache.
4. Inga hemliga data exponeras.

### Steg 8 — Drift, observability & rollback (P1)
**Syfte:** Säker drift vid release och snabb felsökning utan kodändringar i produktion.

#### Steg 8.A — Observability (minimikrav)
- **Mätpunkter**
  - Sessioner skapade per dag, aktiva sessioner per timme.
  - Join success rate (%), rejoin success rate (%).
  - Realtime health: connected/degraded/offline andel per session.
  - Board safe mode activation count (per session).
- **Loggning**
  - Host actions: start/pause/resume/end/advance step.
  - Participant lifecycle: join/pending/approved/kicked/disconnected.
  - Board fetch errors + cache fallback.

#### Steg 8.B — Larm (trösklar)
- **Join failure rate** > 5% under 15 min → varning.
- **Realtime offline** > 10% sessioner i 5 min → varning.
- **Board safe mode** aktiverad > 3 gånger per session → varning.

#### Steg 8.C — Rollback & feature flags
- **Flaggor**
  - `ENABLE_REALTIME_FALLBACK`
  - `MAX_PARTICIPANTS_PER_SESSION`
- **Rollback-regel**: om P0-symptom i GF1–GF3 uppstår → disable ny funktion och återgå till stabilt läge.

#### Steg 8.D — Release-checklista (P1)
1. P0-testchecklista (Steg 7) grön.
2. Observability-mätpunkter aktiva.
3. Larm notifierar rätt kanal.
4. Rollback steg verifierat i staging.

---

---

## Innehållsförteckning

1. [Systemöversikt](#1-systemöversikt)
2. [Databasschema](#2-databasschema)
3. [API-arkitektur](#3-api-arkitektur)
4. [Game Builder (Admin)](#4-game-builder-admin)
5. [Sessioner & Deltagare](#5-sessioner--deltagare)
6. [Artifakter & Puzzles](#6-artifakter--puzzles)
7. [Trigger-systemet](#7-trigger-systemet)
8. [Realtime & Broadcast](#8-realtime--broadcast)
9. [Frontend-komponenter](#9-frontend-komponenter)
10. [Användarflöden](#10-användarflöden)
11. [Säkerhet & RLS](#11-säkerhet--rls)
12. [Kända begränsningar](#12-kända-begränsningar)

---

## 1. Systemöversikt

### 1.1 Vad är Play-systemet?

Play-systemet är Lekbankens kärna för att **köra lekar live**. Det hanterar:
- **Lekledaren (Host)** som skapar och driver sessioner
- **Deltagare (Participants)** som går med via sessionskod
- **Spel (Games)** byggda i Game Builder med faser, steg, artifakter och triggers
- **Board** - en publik visningsvy för storskärm

### 1.2 Arkitekturdiagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN LAYER                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Game Builder                                     │ │
│  │   app/admin/games/builder/                                              │ │
│  │   ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌─────────────┐            │ │
│  │   │  Phases  │ │   Steps   │ │  Artifacts │ │  Triggers   │            │ │
│  │   └──────────┘ └───────────┘ └────────────┘ └─────────────┘            │ │
│  │   ┌──────────┐ ┌───────────┐ ┌────────────┐                            │ │
│  │   │  Roles   │ │ Decisions │ │   Board    │                            │ │
│  │   └──────────┘ └───────────┘ └────────────┘                            │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ create_game_snapshot()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE (Supabase)                                 │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────────┐               │
│  │    games      │──│ game_snapshots │──│participant_sessions│              │
│  └───────────────┘  └────────────────┘  └──────────────────┘               │
│         │                                        │                          │
│  ┌──────┴──────┐                         ┌──────┴──────┐                   │
│  │ game_phases │                         │ participants │                   │
│  │ game_steps  │                         │session_artifacts│                │
│  │game_artifacts│                        │session_triggers │                │
│  │game_triggers │                        │session_decisions│                │
│  │ game_roles  │                         └─────────────────┘               │
│  └─────────────┘                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME LAYER                                      │
│  ┌─────────────────────┐    ┌─────────────────────┐                         │
│  │   HOST (Lekledare)  │    │   PARTICIPANTS      │                         │
│  │   /app/play/sessions│    │   /participants/    │                         │
│  │   - Starta/Pausa    │    │   - join (kod)      │                         │
│  │   - Hantera deltagare│   │   - view (realtid)  │                         │
│  │   - Trigga events   │    │   - heartbeat       │                         │
│  │   - Kontrollera tid │    │   - broadcast       │                         │
│  └─────────────────────┘    └─────────────────────┘                         │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           BOARD                                          ││
│  │   /board/[code] - Publik storskärmsvy                                   ││
│  │   Visar: faser, steg, artifakter, beslut, timer                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Huvudflöde

1. **Författare** skapar spel i Game Builder (admin)
2. **Snapshot** tas av spelet (fryst version)
3. **Lekledare** startar session baserat på snapshot
4. **Deltagare** går med via 6-siffrig kod
5. **Session körs** med triggers, artifakter, beslut
6. **Board** visar sessionsstatus på storskärm

---

## 2. Databasschema

### 2.1 Huvudtabeller

#### `participant_sessions` - Aktiva sessioner
```sql
CREATE TABLE participant_sessions (
  id UUID PRIMARY KEY,
  session_code VARCHAR(6) UNIQUE NOT NULL,    -- 6-teckenkod typ "H3K9QF"
  display_name TEXT NOT NULL,                 -- Sessionsnamn
  description TEXT,
  
  -- Kopplingar
  host_user_id UUID REFERENCES auth.users,    -- Lekledaren
  tenant_id UUID REFERENCES tenants,          -- Organisationen
  game_id UUID REFERENCES games,              -- Ursprungsspelet
  game_snapshot_id UUID REFERENCES game_snapshots,  -- Fryst version
  plan_id UUID,                               -- Lektionsplan (valfri)
  
  -- Status
  status participant_session_status NOT NULL DEFAULT 'active',
  -- Enum: 'active' | 'paused' | 'locked' | 'ended' | 'archived' | 'cancelled'
  
  -- Progression
  current_phase_index INTEGER DEFAULT 0,
  current_step_index INTEGER DEFAULT 0,
  
  -- State (JSON)
  board_state JSONB,      -- Vad som visas på board
  timer_state JSONB,      -- Tidsinställningar
  settings JSONB,         -- Sessionsinställningar
  
  -- Metadata
  participant_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Settings JSON-struktur:**
```typescript
{
  allowRejoin?: boolean;        // Tillåt återanslutning
  maxParticipants?: number;     // Max antal deltagare
  requireApproval?: boolean;    // Lekledaren måste godkänna
  allowAnonymous?: boolean;     // Tillåt anonyma deltagare
  tokenExpiryHours?: number;    // Token-giltighetstid
  enableChat?: boolean;         // Aktivera chat
  enableProgressTracking?: boolean;  // Spåra framsteg
}
```

#### `participants` - Deltagare i sessioner
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES participant_sessions ON DELETE CASCADE,
  
  -- Identifiering
  participant_token VARCHAR(64) UNIQUE,    -- JWT-liknande token
  display_name TEXT NOT NULL,              -- Visningsnamn
  avatar_url TEXT,
  
  -- Status
  role participant_role DEFAULT 'participant',
  -- Enum: 'participant' | 'observer' | 'assistant' | 'moderator'
  status participant_status DEFAULT 'active',
  -- Enum: 'pending' | 'active' | 'idle' | 'disconnected' | 'kicked' | 'blocked'
  
  -- Progression (JSON)
  progress JSONB,
  
  -- Tidsstämplar
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ
);
```

#### `game_snapshots` - Frysta spelversioner
```sql
CREATE TABLE game_snapshots (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games,
  
  -- Versionshantering
  version INTEGER NOT NULL,
  version_label TEXT,           -- "v1.2" eller "Launch version"
  
  -- Fullständig spelets data (immutabel)
  snapshot_data JSONB NOT NULL,
  
  -- Vad som inkluderas
  includes_steps BOOLEAN DEFAULT true,
  includes_phases BOOLEAN DEFAULT false,
  includes_roles BOOLEAN DEFAULT false,
  includes_artifacts BOOLEAN DEFAULT false,
  includes_triggers BOOLEAN DEFAULT false,
  includes_board_config BOOLEAN DEFAULT false,
  
  checksum TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `session_artifacts` - Runtime-kopior av artifakter
```sql
CREATE TABLE session_artifacts (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES participant_sessions ON DELETE CASCADE,
  source_artifact_id UUID REFERENCES game_artifacts,
  
  title TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  metadata JSONB,
  
  -- Synlighet & status
  revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMPTZ,
  locked BOOLEAN DEFAULT false,
  
  -- Progression
  step_index INTEGER,
  phase_index INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `session_triggers` - Runtime-triggers
```sql
CREATE TABLE session_triggers (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES participant_sessions ON DELETE CASCADE,
  source_trigger_id UUID,       -- Ursprungs-game_trigger
  
  name TEXT NOT NULL,
  condition JSONB NOT NULL,     -- TriggerCondition
  actions JSONB NOT NULL,       -- TriggerAction[]
  
  -- Status
  status trigger_status DEFAULT 'armed',
  -- Enum: 'armed' | 'fired' | 'disabled' | 'error'
  enabled BOOLEAN DEFAULT true,
  execute_once BOOLEAN DEFAULT false,
  delay_seconds INTEGER DEFAULT 0,
  
  -- Historik
  fired_at TIMESTAMPTZ,
  fired_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Relationsdiagram

```
games ─────────────┐
  │                │
  ├── game_phases  │
  │     └── game_steps
  │                │
  ├── game_artifacts───────────┐
  │     └── game_artifact_variants
  │                │           │
  ├── game_triggers│           │
  ├── game_roles   │           │
  └── game_board_config        │
                   │           │
                   ▼           ▼
            game_snapshots ────┤
                   │           │
                   ▼           │
        participant_sessions ──┤
              │    │           │
              │    ├── session_artifacts (kopierade)
              │    ├── session_triggers (kopierade)
              │    ├── session_decisions
              │    └── session_artifact_variants
              │
              └── participants
                    └── participant_progress
```

---

## 3. API-arkitektur

### 3.1 Play Sessions API

**Basväg:** `/api/play/sessions`

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/` | Lista alla host-sessioner |
| POST | `/` | Skapa ny session |
| GET | `/:id` | Hämta specifik session |
| PATCH | `/:id` | Uppdatera status (start/pause/resume/end) |

**Session-skapande (POST):**
```typescript
// Request body
{
  displayName: string;        // Obligatoriskt
  description?: string;
  gameId?: string;            // Spel att basera på
  planId?: string;            // Lektionsplan
  settings?: {
    allowRejoin?: boolean;
    maxParticipants?: number;
    requireApproval?: boolean;
  };
  expiresInHours?: number;
}

// Response
{
  session: {
    id: string;
    sessionCode: string;      // 6-teckenkod
    displayName: string;
    status: 'active';
    // ...
  }
}
```

**Status-uppdatering (PATCH):**
```typescript
// Request body
{ action: 'start' | 'pause' | 'resume' | 'end' }

// Broadcast skickas automatiskt till play:${sessionId}
```

### 3.2 Session Sub-routes

| Route | Beskrivning |
|-------|-------------|
| `/api/play/sessions/[id]/game` | Hämta spelinnehåll (steg, faser) |
| `/api/play/sessions/[id]/participants` | Hantera deltagare |
| `/api/play/sessions/[id]/artifacts` | Hantera artifakter |
| `/api/play/sessions/[id]/triggers` | Hantera triggers |
| `/api/play/sessions/[id]/decisions` | Hantera beslut/röstningar |
| `/api/play/sessions/[id]/chat` | Sessionsmeddelanden |
| `/api/play/sessions/[id]/signals` | Signal-kanaler |
| `/api/play/sessions/[id]/time-bank` | Tidshantering |
| `/api/play/sessions/[id]/roles` | Rollhantering |
| `/api/play/sessions/[id]/secrets` | Hemlig information (per roll) |
| `/api/play/sessions/[id]/state` | Board-state |
| `/api/play/sessions/[id]/outcome` | Resultat/outcome |
| `/api/play/sessions/[id]/overrides` | Admin-överrides |

### 3.3 Participant Sessions API

**Basväg:** `/api/participants/sessions`

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/join` | Gå med via sessionskod |
| POST | `/rejoin` | Återanslut med token |
| GET | `/[sessionId]/participants` | Lista deltagare |
| PATCH | `/[sessionId]/[participantId]` | Uppdatera deltagare |

**Join-flöde (POST /join):**
```typescript
// Request
{
  sessionCode: "H3K9QF",
  displayName: "Anna"
}

// Response
{
  participant: {
    id: string;
    token: string;           // Sparas i localStorage
    sessionId: string;
    displayName: string;
    status: 'active';
  }
}
```

### 3.4 Board API

**Route:** `/api/play/board/[code]`

Publik endpoint (ingen auth krävs) som returnerar:
- Session-status
- Spelinfo
- Synliga artifakter
- Aktiva beslut
- Outcomes

---

## 4. Game Builder (Admin)

### 4.1 Komponentstruktur

```
app/admin/games/builder/
├── GameBuilderForm.tsx      # Huvudformulär
├── GameBuilderPage.tsx      # Sidcontainer
├── components/
│   ├── ArtifactEditor.tsx   # Redigera artifakter
│   ├── ArtifactWizard.tsx   # Steg-för-steg skapande
│   ├── BoardEditor.tsx      # Board-konfiguration
│   ├── DecisionEditor.tsx   # Beslut/röstningar
│   ├── PhaseEditor.tsx      # Faser
│   ├── RoleEditor.tsx       # Roller
│   ├── StepEditor.tsx       # Steg
│   ├── TriggerEditor.tsx    # Trigger-logik
│   ├── TriggerSimulator.tsx # Testa triggers
│   ├── SnapshotManager.tsx  # Versionshantering
│   ├── ValidationPanel.tsx  # Validering
│   └── QualityChecklist.tsx # Kvalitetskontroll
└── utils/
```

### 4.2 Spelets struktur

**GameBuilderData-typ:**
```typescript
type GameBuilderData = {
  game: {
    id: string;
    name: string;
    status: 'draft' | 'published';
    play_mode: 'basic' | 'facilitated' | 'participants';
    min_players: number;
    max_players: number;
    // ... metadata
  };
  steps: GameStep[];           // Spelets steg
  phases: GamePhase[];         // Faser som grupperar steg
  roles: GameRole[];           // Roller för deltagare
  artifacts: GameArtifact[];   // Interaktiva element
  triggers: GameTrigger[];     // Automatiserad logik
  boardConfig: GameBoardConfig; // Storskärmsvy
  materials: GameMaterials;    // Material som behövs
};
```

### 4.3 Faser (Phases)

```typescript
type GamePhase = {
  id: string;
  name: string;
  phase_type: 'intro' | 'round' | 'finale' | 'break';
  phase_order: number;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: 'countdown' | 'elapsed' | 'trafficlight';
  description: string | null;
  board_message: string | null;
  auto_advance: boolean;
};
```

### 4.4 Steg (Steps)

```typescript
type GameStep = {
  id: string;
  phase_id: string | null;    // Koppling till fas
  step_order: number;
  title: string | null;
  body: string | null;        // Instruktioner
  duration_seconds: number | null;
  leader_script: string | null;  // Manus för lekledare
  participant_prompt: string | null;
  board_text: string | null;  // Visas på board
  display_mode: 'instant' | 'typewriter' | 'dramatic';
  optional: boolean;
  conditional: string | null; // Villkor för att visa
};
```

### 4.5 Roller (Roles)

```typescript
type GameRole = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  public_description: string | null;
  private_instructions: string;   // Hemlig info
  private_hints: string | null;
  min_count: number;
  max_count: number | null;
  assignment_strategy: 'random' | 'leader_picks' | 'player_picks';
  conflicts_with: string[];       // Roller som inte kan samexistera
};
```

### 4.6 Board-konfiguration

```typescript
type GameBoardConfig = {
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string | null;
  theme: 'mystery' | 'party' | 'sport' | 'nature' | 'neutral';
  background_media_id: string | null;
  background_color: string | null;
  layout_variant: 'standard' | 'fullscreen';
};
```

---

## 5. Sessioner & Deltagare

### 5.1 Session-livscykel

```
             ┌──────────────┐
             │    CREATE    │
             │  (status=active)
             └──────┬───────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│    ACTIVE     │◄─────►│    PAUSED     │
│  (körs live)  │ pause │  (pausad)     │
│               │ resume│               │
└───────┬───────┘       └───────┬───────┘
        │                       │
        │         end           │
        └───────────┬───────────┘
                    ▼
             ┌──────────────┐
             │    ENDED     │
             └──────┬───────┘
                    │ archive
                    ▼
             ┌──────────────┐
             │   ARCHIVED   │
             └──────────────┘
```

### 5.2 Deltagares livscykel

```
┌──────────┐   join    ┌──────────┐
│  (new)   │──────────►│  ACTIVE  │
└──────────┘           └────┬─────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────┐        ┌─────────┐       ┌──────────┐
    │  IDLE   │        │DISCONN- │       │  KICKED  │
    │(inaktiv)│        │ ECTED   │       │(borttagen)│
    └─────────┘        └─────────┘       └──────────┘
         │                  │
         │                  │ rejoin
         └──────────────────┴─────────► ACTIVE
```

### 5.3 Deltagarhantering (Host-funktioner)

```typescript
// features/play-participant/api.ts

// Hämta deltagare
async function getParticipants(sessionId: string): Promise<{ participants: Participant[] }>

// Sparka deltagare (kan återanslutas)
async function kickParticipant(sessionId: string, participantId: string): Promise<void>

// Blockera deltagare (kan INTE återanslutas)
async function blockParticipant(sessionId: string, participantId: string): Promise<void>

// Sätt nästa startare (vems tur)
async function setNextStarter(sessionId: string, participantId: string): Promise<void>

// Sätt position (plats i ordning)
async function setParticipantPosition(sessionId: string, participantId: string, position: number): Promise<void>
```

### 5.4 Session-kod

Sessioner identifieras med en **6-tecken alfanumerisk kod** (exempel: `H3K9QF`).

Koden:
- Genereras vid skapande
- Normaliseras till VERSALER
- Undviker förväxlingsbara tecken (O/0, I/1, etc.)
- Är unik per aktiv session

**Kodgenerering:** `lib/services/participants/session-code-generator.ts`

---

## 6. Artifakter & Puzzles

### 6.1 Artifakt-typer (ArtifactType)

Alla tillgängliga artifakt-typer:

| Kategori | Typ | Beskrivning |
|----------|-----|-------------|
| **Basic** | `card` | Enkelt kort med text |
| | `document` | Längre dokument |
| | `image` | Bild |
| **Toolbelt** | `conversation_cards_collection` | Samtalskort |
| **Code & Input** | `keypad` | Nummerlås |
| | `riddle` | Gåta med textinput |
| | `multi_answer` | Flervalsfrågor |
| **Media** | `audio` | Ljudfil med bekräftelse |
| | `hotspot` | Klickbara områden på bild |
| | `tile_puzzle` | Pussel med bitar |
| **Kryptografi** | `cipher` | Chiffer/kodknäckning |
| | `logic_grid` | Logikpussel |
| **Special** | `counter` | Räknare |
| | `qr_gate` | QR-kod-skanner |
| | `hint_container` | Tips-behållare |
| | `prop_confirmation` | Bekräfta fysisk prop |
| | `location_check` | GPS-kontroll |
| | `sound_level` | Ljudnivåmätare |
| | `replay_marker` | Markör för replay |
| **Cockpit** | `signal_generator` | Signalgenerator |
| | `time_bank_step` | Tidsbankssteg |
| | `empty_artifact` | Tom platshållare |

### 6.2 Artifakt-struktur

```typescript
type GameArtifact = {
  id: string;
  game_id: string;
  title: string;
  description: string | null;
  artifact_type: ArtifactType;
  artifact_order: number;
  tags: string[];
  metadata: Record<string, unknown> | null;  // Typspecifik data
  variants: GameArtifactVariant[];
};

type GameArtifactVariant = {
  id: string;
  title: string | null;
  body: string | null;
  media_ref: string | null;
  variant_order: number;
  visibility: 'public' | 'leader_only' | 'role_private';
  visible_to_role_id: string | null;  // Om role_private
  metadata: Record<string, unknown> | null;
};
```

### 6.3 Keypad-exempel

```typescript
// Keypad metadata
{
  code: "1234",              // Rätt kod
  maxAttempts: 3,            // Max försök
  lockoutSeconds: 30,        // Låsningstid
  showHint: true,            // Visa ledtråd
  hintText: "Årtalet...",
  style: "numeric" | "alpha" // Typ av knappsats
}
```

### 6.4 Komponenter i `components/play/`

| Komponent | Beskrivning |
|-----------|-------------|
| `Keypad.tsx` | Nummerlås-UI |
| `AlphaKeypad.tsx` | Bokstavslås |
| `KeypadDisplay.tsx` | Display för kod |
| `RiddleInput.tsx` | Gåtinput |
| `MultiAnswerForm.tsx` | Flervalsfrågor |
| `AudioPlayer.tsx` | Ljudspelare |
| `HotspotImage.tsx` | Klickbara bilder |
| `TilePuzzle.tsx` | Pusselspel |
| `CipherDecoder.tsx` | Chifferavkodare |
| `LogicGrid.tsx` | Logikpussel |
| `Counter.tsx` | Räknare |
| `QRScanner.tsx` | QR-läsare |
| `HintPanel.tsx` | Tips-panel |
| `PropConfirmation.tsx` | Prop-bekräftelse |
| `LocationCheck.tsx` | GPS-kontroll |
| `SoundLevelMeter.tsx` | Ljudnivåmätare |
| `ReplayMarker.tsx` | Replay-markör |

### 6.5 Artifakt-synlighet

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISIBILITY FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   revealed=false ──► Gömd för alla                               │
│         │                                                        │
│         │ trigger/manual                                         │
│         ▼                                                        │
│   revealed=true ──► Visibility-kontroll:                         │
│         │                                                        │
│         ├── 'public' ──► Alla ser                                │
│         ├── 'leader_only' ──► Endast lekledare                   │
│         └── 'role_private' ──► Endast specifik roll             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Trigger-systemet

### 7.1 Översikt

Triggers är **deklarativ automatisering** - "När X händer, gör Y".

```typescript
type GameTrigger = {
  id: string;
  name: string;
  enabled: boolean;
  condition: TriggerCondition;   // WHEN
  actions: TriggerAction[];      // THEN (i ordning)
  execute_once: boolean;         // Bara första gången
  delay_seconds: number;         // Fördröjning
};
```

### 7.2 Tillgängliga villkor (Conditions)

**Progression-villkor:**
| Typ | Beskrivning |
|-----|-------------|
| `step_started` | Ett steg börjar |
| `step_completed` | Ett steg slutförs |
| `phase_started` | En fas börjar |
| `phase_completed` | En fas slutförs |

**Artifakt-villkor:**
| Typ | Beskrivning |
|-----|-------------|
| `artifact_unlocked` | Artifakt avslöjas |
| `keypad_correct` | Rätt kod matad |
| `keypad_failed` | Max försök uppnått |
| `riddle_correct` | Gåta löst |
| `audio_acknowledged` | Ljud bekräftat |
| `scan_verified` | QR-kod verifierad |
| `hotspot_found` | Hotspot hittad |
| `hotspot_hunt_complete` | Alla hotspots funna |
| `tile_puzzle_complete` | Pussel klart |
| `cipher_decoded` | Chiffer avkodat |
| `prop_confirmed` | Prop bekräftad |
| `prop_rejected` | Prop avvisad |
| `location_verified` | Plats verifierad |
| `logic_grid_solved` | Logikpussel löst |
| `sound_level_triggered` | Ljudnivå nådd |

**Andra villkor:**
| Typ | Beskrivning |
|-----|-------------|
| `decision_resolved` | Omröstning avslutad |
| `timer_ended` | Timer utgången |
| `signal_received` | Signal mottagen |
| `counter_reached` | Räknare når värde |
| `hint_requested` | Tips begärt |
| `manual` | Manuell utlösning |
| `time_bank_expired` | Tidsbank slut |

### 7.3 Tillgängliga åtgärder (Actions)

**Artifakt-åtgärder:**
| Typ | Beskrivning |
|-----|-------------|
| `reveal_artifact` | Visa gömd artifakt |
| `hide_artifact` | Dölj synlig artifakt |
| `reset_keypad` | Nollställ keypad |
| `reset_riddle` | Nollställ gåta |
| `reset_scan_gate` | Nollställ QR-gate |
| `reset_hotspot_hunt` | Nollställ hotspotsök |
| `reset_tile_puzzle` | Nollställ pussel |
| `reset_cipher` | Nollställ chiffer |
| `reset_prop` | Nollställ prop |
| `reset_location` | Nollställ platscheck |
| `reset_logic_grid` | Nollställ logikpussel |
| `reset_sound_meter` | Nollställ ljudmätare |

**Progression-åtgärder:**
| Typ | Beskrivning |
|-----|-------------|
| `advance_step` | Gå till nästa steg |
| `advance_phase` | Gå till nästa fas |
| `unlock_decision` | Aktivera omröstning |
| `lock_decision` | Stäng omröstning |

**Kommunikation:**
| Typ | Beskrivning |
|-----|-------------|
| `send_message` | Skicka meddelande till board |
| `send_signal` | Skicka signal på kanal |
| `send_hint` | Skicka tips |
| `show_leader_script` | Visa lekledarmanus |
| `play_sound` | Spela ljudeffekt |
| `show_countdown` | Visa nedräkning |

**Timer/Tid:**
| Typ | Beskrivning |
|-----|-------------|
| `start_timer` | Starta timer |
| `time_bank_apply_delta` | Lägg till/ta bort tid |
| `time_bank_pause` | Pausa/återuppta tidsbank |

**Övrigt:**
| Typ | Beskrivning |
|-----|-------------|
| `increment_counter` | Öka räknare |
| `reset_counter` | Nollställ räknare |
| `add_replay_marker` | Lägg till replay-markör |
| `trigger_signal` | Utlös signalgenerator |

### 7.4 Trigger-livscykel

```
┌──────────┐
│  ARMED   │ ◄── Redo att aktiveras
└────┬─────┘
     │ condition == true
     ▼
┌──────────┐
│  FIRING  │ ── Exekverar actions (med delay om satt)
└────┬─────┘
     │
     ├── execute_once == true ──► DISABLED
     │
     └── execute_once == false ──► ARMED (igen)
```

### 7.5 Trigger API

```
POST /api/play/sessions/[id]/triggers
  - Snapshot triggers från game_triggers → session_triggers

PATCH /api/play/sessions/[id]/triggers/[triggerId]
  - action: 'fire' | 'disable' | 'arm'

GET /api/play/sessions/[id]/triggers
  - Lista alla session-triggers
```

---

## 8. Realtime & Broadcast

### 8.1 Supabase Channels

Play-systemet använder **Supabase Realtime Broadcast** för kommunikation:

```typescript
// Kanalnamn: session:${sessionId}
const channel = supabase.channel(`session:${sessionId}`);

// Prenumerera
channel.on('broadcast', { event: 'participant_event' }, (payload) => {
  handleEvent(payload);
});

// Skicka
channel.send({
  type: 'broadcast',
  event: 'participant_event',
  payload: {
    type: 'session_paused',
    timestamp: new Date().toISOString(),
  },
});
```

### 8.2 Broadcast-eventtyper

```typescript
type BroadcastEvent = {
  type: 
    | 'session_paused'
    | 'session_resumed'
    | 'session_ended'
    | 'session_locked'
    | 'session_unlocked'
    | 'host_message'
    | 'participant_joined'
    | 'participant_left'
    | 'role_changed'
    | 'progress_updated'
    | 'achievement_unlocked';
  payload?: Record<string, unknown>;
  timestamp: string;
};
```

### 8.3 Play Events (Host → Deltagare)

Ytterligare kanal för spelhändelser:

```typescript
// Kanalnamn: play:${sessionId}
const channel = supabase.channel(`play:${sessionId}`);

channel.send({
  type: 'broadcast',
  event: 'play_event',
  payload: {
    type: 'phase_changed',
    phaseIndex: 2,
    phaseName: 'Finale',
  },
});
```

### 8.4 Heartbeat-system

Deltagare skickar **heartbeat** var 30:e sekund:

```typescript
// features/participants/hooks/useParticipantHeartbeat.ts

// Uppdaterar participants.last_seen_at
// Sätter status till 'idle' efter 2 minuters inaktivitet
```

---

## 9. Frontend-komponenter

### 9.1 Host-vyer (`app/app/play/`)

```
app/app/play/
├── page.tsx                    # Redirect → sessions
├── sessions/
│   ├── page.tsx               # Lista sessioner (HostSessionsClient)
│   ├── client.tsx             # Sessionslista med filter
│   └── [id]/
│       ├── page.tsx           # Sessionsdetalj
│       └── client.tsx         # Host-kontroller
├── plan/                      # Lektionsplaner
└── [gameId]/                  # Starta session för specifikt spel
```

### 9.2 Participant-vyer (`app/participants/`)

```
app/participants/
├── join/
│   └── page.tsx              # Anslut med kod
├── view/
│   └── page.tsx              # Deltagarvy (realtid)
├── host/                     # Host-specifika vyer
├── history/                  # Sessionshistorik
├── create/                   # Skapa (för host)
└── analytics/                # Statistik
```

### 9.3 Board-vy (`app/board/`)

```
app/board/
└── [code]/
    └── page.tsx              # Publik storskärmsvy
```

### 9.4 Nyckelkomponenter i `components/play/`

**Session-hantering:**
- `SessionCard.tsx` - Kort för sessionslista
- `SessionHeader.tsx` - Header med kod, status
- `SessionControls.tsx` - Start/pause/slut-knappar
- `SessionStatusBadge.tsx` - Statusindikator
- `SessionStatusMessage.tsx` - Statusmeddelanden

**Deltagare:**
- `ParticipantList.tsx` - Lista deltagare
- `ParticipantRow.tsx` - Rad per deltagare
- `ParticipantStatusBadge.tsx` - Status (active/idle/kicked)
- `ReadinessBadge.tsx` - Beredskapsindikator

**Lobby:**
- `JoinSessionForm.tsx` - Anslutningsformulär
- `LobbyHub.tsx` - Lobby-vy

**Triggers:**
- `TriggerList.tsx` - Lista triggers
- `TriggerCard.tsx` - Triggerkort
- `TriggerWizard.tsx` - Skapa triggers

**UI-effekter:**
- `TypewriterText.tsx` - Typewriter-effekt
- `StoryOverlay.tsx` - Dramatisk overlay
- `CountdownOverlay.tsx` - Nedräkning

---

## 10. Användarflöden

### 10.1 Skapa och köra session (Host)

```
1. Välj spel i /app/browse
         │
         ▼
2. Klicka "Starta session"
         │
         ▼
3. Konfigurera session (namn, inställningar)
         │
         ▼
4. Få sessionskod (t.ex. "H3K9QF")
         │
         ▼
5. Vänta på deltagare i /app/play/sessions/[id]
         │
         ▼
6. Starta session
         │
         ▼
7. Kör genom faser/steg
         │
         ├─ Utlös triggers manuellt
         ├─ Hantera deltagare (kick/block)
         ├─ Skicka meddelanden
         └─ Kontrollera timer
         │
         ▼
8. Avsluta session
```

### 10.2 Gå med som deltagare

```
1. Öppna /participants/join
         │
         ▼
2. Skriv in 6-teckenkod
         │
         ▼
3. Skriv in namn
         │
         ▼
4. POST /api/participants/sessions/join
         │
         ├─ Validering av kod
         ├─ Kontroll av maxdeltagare
         ├─ Generera participant_token
         └─ Spara i localStorage
         │
         ▼
5. Redirect till /participants/view
         │
         ▼
6. Lyssna på broadcast-kanal
         │
         ├─ Heartbeat var 30s
         └─ Visa events i realtid
```

### 10.3 Board på storskärm

```
1. Öppna /board/H3K9QF
         │
         ▼
2. Server-side fetch av board-data
         │
         ▼
3. Visa:
   ├─ Sessionsstatus
   ├─ QR-kod för anslutning
   ├─ Aktuell fas/steg
   ├─ Timer
   ├─ Synliga artifakter
   └─ Beslut/röstresultat
```

---

## 11. Säkerhet & RLS

### 11.1 Row Level Security

**participant_sessions:**
```sql
-- Host kan läsa/uppdatera sina egna sessioner
CREATE POLICY "host_access" ON participant_sessions
  USING (host_user_id = auth.uid());

-- Tenant-medlemmar kan se sessioner i sin organisation
CREATE POLICY "tenant_access" ON participant_sessions
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships 
      WHERE user_id = auth.uid()
    )
  );
```

**participants:**
```sql
-- Deltagare kan uppdatera sig själva (via token, ej auth)
-- Service role krävs för deltagare utan auth
```

**game_snapshots:**
```sql
-- Användare kan skapa/läsa snapshots för spel de äger
CREATE POLICY "snapshot_access" ON game_snapshots
  USING (
    game_id IN (
      SELECT id FROM games WHERE created_by = auth.uid()
    )
  );
```

### 11.2 Rate Limiting

```typescript
// lib/utils/rate-limiter.ts

// 'strict' - Join-endpoint (förhindra missbruk)
// 'api' - Generella API-anrop
// 'auth' - Autentisering

applyRateLimitMiddleware(request, 'strict');
```

### 11.3 Token-hantering

Deltagare autentiseras via **participant_token** (inte Supabase auth):

```typescript
// Generering
const token = generateParticipantToken(); // Kryptografiskt säker

// Lagring
localStorage.setItem('participant_token', token);

// Validering
const participant = await supabase
  .from('participants')
  .select('*')
  .eq('participant_token', token)
  .single();
```

### 11.4 Metadata-sanitering

Artifakt-metadata saniteras innan de skickas till deltagare:

```typescript
// Exempel: Keypad-lösning tas bort för deltagare
function sanitizeArtifactMetadata(artifact, isHost) {
  if (!isHost && artifact.type === 'keypad') {
    const { code, ...safe } = artifact.metadata;
    return safe;
  }
  return artifact.metadata;
}
```

---

## 12. Kända begränsningar

### 12.1 Tekniska begränsningar

| Begränsning | Beskrivning |
|-------------|-------------|
| **Max deltagare** | Ingen hårt kodad gräns, men prestanda försämras över ~100 deltagare |
| **Session-livstid** | Sessioner förfaller efter `expires_at` (konfigurerbart) |
| **Offline-stöd** | Inget offline-stöd för deltagare |
| **Fil-storlek** | Artefakter med media begränsade av Supabase Storage-gränser |

### 12.2 Funktionella begränsningar

| Begränsning | Status |
|-------------|--------|
| **Leaderboard** | Stub - ej implementerat |
| **Custom CSS för board** | Borttaget (XSS-risk) |
| **Compact layout** | Borttaget för MVP |
| **Multi-tenant broadcast** | Ej isolerat per tenant |

### 12.3 UX-begränsningar

| Begränsning | Beskrivning |
|-------------|-------------|
| **Mobiloptimering** | Board ej optimerat för mobil |
| **A11y på puzzles** | Vissa puzzles saknar fullständig tillgänglighet |
| **Språkstöd** | Endast svenska i production |

### 12.4 Rekommendationer för framtida utveckling

1. **Optimistic UI** - Implementera för snabbare känsla
2. **WebSocket fallback** - För miljöer utan WebSocket-stöd
3. **Offline-först** - Service Worker för deltagare
4. **Multi-device sync** - Host kan styra från flera enheter
5. **AI-stöd** - Automatisk trigger-generering

---

## Appendix A: API Quick Reference

```
# Sessions
GET    /api/play/sessions                    Lista host-sessioner
POST   /api/play/sessions                    Skapa session
GET    /api/play/sessions/:id                Hämta session
PATCH  /api/play/sessions/:id                Uppdatera status

# Session Sub-routes
GET    /api/play/sessions/:id/game           Spelinnehåll
GET    /api/play/sessions/:id/participants   Deltagarlista
POST   /api/play/sessions/:id/artifacts      Skapa artifakter
PATCH  /api/play/sessions/:id/artifacts/:aid Uppdatera artifakt
POST   /api/play/sessions/:id/triggers       Snapshot triggers
PATCH  /api/play/sessions/:id/triggers/:tid  Fire/disable trigger

# Participants
POST   /api/participants/sessions/join       Gå med
POST   /api/participants/sessions/rejoin     Återanslut

# Board
GET    /api/play/board/:code                 Board-data (publik)
```

---

## Appendix B: Miljövariabler

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Feature flags (om tillämpligt)
ENABLE_REALTIME_FALLBACK=
MAX_PARTICIPANTS_PER_SESSION=
```

---

## Appendix C: Databasmigrationer

Relevanta migrationer för Play-systemet:

- `20251228120000_game_snapshots.sql` - Snapshot-system
- (Lägg till fler relevanta migrationer här)

---

*Dokumentet genererat 2025-01-09. Uppdatera vid betydande ändringar i Play-systemet.*
