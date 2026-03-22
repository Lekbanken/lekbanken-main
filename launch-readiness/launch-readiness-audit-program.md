# Lekbanken Launch Readiness — Audit Program

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Historical audit-method reference for the launch-readiness execution cycle. Use `launch-readiness/launch-control.md` for current program state and `launch-readiness/audits/README.md` to navigate the resulting audit artifacts.

> **Version:** 1.0  
> **Created:** 2026-03-10  
> **Purpose:** Definiera exakt hur hela Lekbanken ska auditas systematiskt inför launch.  
> **Kontroll:** Alla audits loggas i `launch-control.md`. Denna fil ändras INTE under körning — den definierar metoden.

---

## 1. Audit Philosophy

### Principer

1. **Stoppa aldrig vid första felet.** Notera, klassificera, fortsätt.
2. **Följ kopplingar end-to-end.** DB → API → mapper → hook → UI → i18n. Problem som bara syns i ett lager döljer ofta systemiska svagheter.
3. **Separation av audit och fix.** Audit-fasen producerar en rapport. Implementation-fasen fixar. Blanda inte.
4. **Audit → Implement → Regression per domän.** Kör hela cykeln för en domän innan nästa. Annars växer backlog okontrollerat.
5. **Iterera tills rent.** Samma audit körs igen efter remediation. Upprepa tills inga materiella findings kvarstår.
6. **Uppdatera launch-control.md kontinuerligt.** Aldrig skapa nya progress-filer.
7. **Verifiera findings.** Klassificera som "Confirmed", "Unverified", eller "False positive". Ge aldrig en severity till en finding som inte är verifierad.

### Vad är en "audit"?

En systematisk genomsökning av ett avgränsat område med syfte att hitta:
- **Bekräftade fel** (verifierad via kod/data)
- **Sannolika risker** (mönster som troligen leder till problem)
- **Frågetecken** (behöver manuell verifiering)
- **Testgap** (saknar coverage)
- **Dokumentationsgap** (saknar eller inaktuell doku)

---

## 2. Issue Taxonomy

Varje finding klassificeras med **typ** och **severity**.

### Typer

| Typ | Kod | Beskrivning |
|-----|-----|-------------|
| Bug | `BUG` | Funktionellt fel som påverkar användare |
| UX | `UX` | Dålig användarupplevelse, förvirrande UI |
| Copy / i18n | `I18N` | Saknad/felaktig översättning, hårdkodad text |
| Data Risk | `DATA` | Data kan hamna fel, förloras eller läcka |
| Auth / Permissions | `AUTH` | Åtkomstkontroll, roller, RLS |
| Performance | `PERF` | Långsam rendering, tunga queries, stora bundles |
| Architecture Smell | `ARCH` | Otydliga gränser, duplicering, felplacerad logik |
| Test Gap | `TEST` | Saknad testning för kritisk funktionalitet |
| Doc Gap | `DOC` | Saknad eller inaktuell dokumentation |
| Security | `SEC` | Säkerhetsbrist utöver auth (XSS, CSRF, injection) |
| Accessibility | `A11Y` | Tillgänglighetsproblem |
| Mobile/Responsive | `MOBILE` | Layout-problem på mobil |

### Severity

| Nivå | Kod | Definition | Launch-påverkan |
|------|-----|------------|-----------------|
| P0 | 🔴 | System fungerar inte / data läcker / säkerhetshål | **Blockerar launch** |
| P1 | 🟠 | Viktig funktion trasig / dålig UX i kritisk flow | **Måste fixas före launch** |
| P2 | 🟡 | Bör fixas men blockerar inte | Bör fixas, kan skjutas |
| P3 | 🔵 | Nice-to-have / kosmetiskt | Post-launch |

---

## 3. Finding Format

Varje finding dokumenteras i audit-filen med detta format:

```markdown
### [DOMAIN-NNN] Kort beskrivning

- **Typ:** BUG | UX | I18N | DATA | AUTH | PERF | ARCH | TEST | DOC | SEC | A11Y | MOBILE
- **Severity:** P0 | P1 | P2 | P3
- **Fil(er):** `path/to/file.ts` (rad X-Y)
- **Beskrivning:** Vad som är fel och varför det är ett problem.
- **Bevis:** Kodsnutt, skärmdump, eller logik som visar felet.
- **Förslag:** Rekommenderad fix.
- **Kopplat till:** Eventuellt relaterade findings.
```

---

## 4. Definition of Done

### Audit DoD

En domänaudit är "done" när:

- [x] Alla relevanta filer har lästs (routes, components, hooks, API, types, i18n-nycklar)
- [x] End-to-end-flöden har följts (DB → API → mapper → component → UI)
- [x] Alla findings dokumenterade med typ + severity
- [x] Quick wins separerade från systemiska fixar
- [x] Test-gap identifierade
- [x] Dokumentationsgap identifierade
- [x] i18n-nycklar verifierade mot `messages/sv.json`
- [x] Rollbaserade vyer kontrollerade (admin vs leader vs participant)
- [x] Audit-fil sparad i `/launch-readiness/audits/`
- [x] `launch-control.md` uppdaterad med domain status

### Implementation DoD

En remediation är "done" när:

- [x] Alla P0/P1 findings i domänen fixade
- [x] TypeScript-kompilering: `npx tsc --noEmit` = 0 errors
- [x] i18n-validering: `npm run validate:i18n` = OK
- [x] Regression-test: Berörd Playwright/Vitest-test passerar
- [x] Uppdaterad documentation om relevant
- [x] `launch-control.md` uppdaterad

### Regression Audit DoD

En domän klarar regression-audit när:

- [x] Samma audit-procedur körs igen
- [x] Inga nya P0/P1 findings
- [x] Max 2 nya P2 findings (flaggas för nästa pass)
- [x] Tidigare fixade findings förblir fixade

---

## 5. Audit Scope — Domain Audits

### Audit-ordning (rekommenderad)

Områden auditeras i denna ordning, baserat på risk och beroende:

| Ordning | Domän | Motivering |
|---------|-------|------------|
| 1 | ~~**Auth / Onboarding**~~ | ✅ Covered by Security & Auth Audit (17 findings) |
| 2 | ~~**Tenants / Multi-tenancy**~~ | ✅ Tenant Isolation Audit (10 findings) |
| 3 | ~~**API Security** (tvärgående)~~ | ✅ Security & Auth Audit + API Consistency Audit (31 findings total) |
| 4 | ~~**Games / Library**~~ | ✅ Games System Audit — 14 findings. M1–M3 complete. |
| 5 | ~~**Game Authoring (Admin)**~~ | ✅ Covered by Games System Audit |
| 6 | ~~**Planner**~~ | ✅ Planner Audit — 16 findings. M1–M3 complete. |
| 7 | ~~**Play / Run**~~ | ✅ Play Runtime Audit (14 findings). M1+M2 done, M3–M5 remaining. |
| 8 | ~~**Sessions / Participants**~~ | ✅ Sessions Audit — 13 findings. M1–M3 complete. |
| 9 | ~~**Journey / Gamification**~~ | ✅ Journey Audit — 12 findings. M1–M2 + GAM-001 complete. |
| 10 | ~~**Billing / Stripe**~~ | ✅ Billing Audit — 15 findings. M1–M2 complete. |
| 11 | ~~**Notifications**~~ | ✅ Notifications Audit — 8 findings. No launch remediation needed. |
| 12 | ~~**Media / Assets**~~ | ✅ Media Audit — 12 findings. M1 complete. |
| 13 | ~~**Support / Tickets**~~ | ✅ Support Audit — 10 findings. No launch remediation needed. |
| 14 | ~~**Profile / Settings**~~ | ✅ Profile Audit — 8 findings. No launch remediation needed. |
| 15 | ~~**Calendar**~~ | ✅ Calendar Audit — 7 findings. No launch remediation needed. |
| 16 | ~~**Marketing / Landing**~~ | ✅ Marketing Audit — 7 findings. MKT-001 M1 fixed. |
| 17 | ~~**Atlas / Sandbox**~~ | ✅ Atlas Audit — 11 findings. M1 complete. |

### Per domain: vad som ska kontrolleras

Varje domänaudit följer samma checklista:

#### Kod & arkitektur
- [ ] Alla routes (`app/`) — korrekt rendering, felhantering, guards
- [ ] Alla API-routes (`app/api/`) — auth, validation, error responses
- [ ] Feature-components (`features/{domain}/`) — props, state, edge cases
- [ ] Hooks — korrekt data-hämtning, caching, error handling
- [ ] Types — strikta, inga `any`, matchar DB-schema
- [ ] Lib/services — business logic, mappers, DTOs

#### Data & säkerhet
- [ ] RLS-policies — korrekt tenant/user isolation
- [ ] DB-schema — constraints, indexes, foreign keys
- [ ] Input validation — Zod schemas på API boundaries
- [ ] Permissions — rollbaserad åtkomst (admin/leader/participant)

#### UI & UX
- [ ] Loading states — skeleton/spinner visas
- [ ] Error states — felmeddelanden visas
- [ ] Empty states — tydligt meddelande när data saknas
- [ ] Mobile responsiveness — fungerar på liten skärm
- [ ] Rollbaserad UI — rätt knappar/vyer för rätt roll
- [ ] Navigation — breadcrumbs, back-navigering, deep links

#### i18n
- [ ] Alla synliga strängar använder `useTranslations()` / `t()`
- [ ] Nycklar finns i `messages/sv.json`
- [ ] Nycklar finns i `messages/en.json` och `messages/no.json`
- [ ] Inga hårdkodade svenska strängar i komponenter

#### Test
- [ ] Finns Playwright-test för kritiska flöden?
- [ ] Finns unit-test för business logic?
- [ ] Finns integration-test för API-routes?

---

## 6. Audit Scope — Cross-Cutting Audits

Dessa körs separat, efter domänaudits, och kollar tvärgående mönster.

### A. End-to-End Data Flows

Följ data genom hela stacken:
1. **Game authoring → snapshot → play runtime** (verifierad pipeline)
2. **Plan creation → save → publish → run → session** (full wizard flow)
3. **Participant join → live state → artifacts → scoring** (participant journey)
4. **User signup → tenant assignment → role → capabilities** (auth chain)
5. **Cosmetic unlock → purchase → equip → display** (gamification loop)
6. **Notification trigger → delivery → read status** (notification pipeline)

---

## 7. Level 2 — Critical Building Block Audits

> **Tillagd:** 2026-03-14 (GPT-direktiv)  
> **Syfte:** Hitta djupare fel som domänaudits missar — hårdkodning, kontraktsdrift, roll-/visibility-fel, inkonsekvent auth, trasiga end-to-end-kedjor, döda fallbackar, splittrad logik mellan UI/hook/action/route/DB.

### 7.1 Definition — vad är en "kritisk byggsten"?

En byggsten ska granskas med samma noggrannhet som en domän om den uppfyller **ett eller flera** av dessa kriterier:

- Används i **flera domäner**
- Påverkar **auth, roller, capability eller tenant-scope**
- Används i **kritiska användarflöden** (play, session, planner, billing)
- Används i **flera kontexter** (admin, preview, play, participant, demo)
- Ansvarar för **dataformning, state transition eller rendering** av säkerhets-/produktkritisk information
- Har **hög återanvändning** eller **hög blast radius** (en bugg påverkar många ställen)
- Är känd att vara **AI-genererad, polymorf eller historiskt omarbetad** flera gånger

### 7.2 Typer som kan auditeras

| Typ | Beskrivning |
|-----|-------------|
| **Components** | React-komponenter med komplex logik, rollbaserad rendering eller cross-domain användning |
| **Hooks** | Custom hooks som hanterar data, auth, state eller side effects |
| **Server actions** | Next.js server actions med mutations eller auth-beroende logik |
| **Shared route helpers** | Funktioner som `apiHandler`, `requireTenantRole`, `requireGameAuth` etc. |
| **Capability/auth helpers** | Allt som fattar beslut om vad en användare får göra |
| **Mappers / adapters / transformers** | Funktioner som transformerar data mellan lager (DB → API → UI) |
| **State helpers / command layers** | State-maskineri, reducers, command patterns |
| **Feature gates / demo gates / upgrade gates** | Kod som styr vad som visas baserat på feature-flaggor, demo-status, licensnivå |
| **Constants / policy maps / config contracts** | Enums, policy-maps, konfigurationslager som styr systembeteende |

### 7.3 Standardprocedur — Building Block Audit

> **Hård regel:** En building-block audit måste alltid vara **kodbevisad**. Spekulativa findings är inte tillåtna. Claude ska alltid följa verkliga call-sites, läsa aktuell kod, och tydligt skilja på: **verifierat i kod** / **infererat** / **ej verifierat**.

För varje kritisk funktion/komponent/hook:

#### Steg 1 — Definition

- Vad är byggstenen?
- Vilket ansvar ska den ha?
- Vilken domän/del av systemet använder den?

#### Steg 2 — Ingress

- Vilka props/params/context/session/input tar den?
- Vilka invariants förutsätts?
- Finns implicit beroende av auth, tenant, locale, feature flag, role?

#### Steg 3 — Egress

- Vad returnerar/renderar/skriver den?
- Vilka side effects uppstår?
- Vilka beroenden anropas vidare?

#### Steg 4 — Call-site inventory

- Lista **alla verkliga call-sites** (grep/search, inte gissning)
- Gruppera efter användningskontext:
  - admin
  - user
  - participant
  - public
  - preview/demo
  - play runtime
  - mobile/touch
  - server/client

#### Steg 5 — Behavior matrix

- Beter sig byggstenen rätt i **alla** call-site-kategorier?
- Visar den rätt data för rätt roll?
- Används den felaktigt som om den vore generell trots att den är kontextbunden?

#### Steg 6 — State / logic audit

- Finns dold hårdkodning?
- Finns fallbackar som maskerar fel?
- Finns dead code?
- Finns race/rerender/double-fire-risk?
- Finns splittrad logik mellan hook, component, route, server action?

#### Steg 7 — End-to-end proof

- Följ minst ett riktigt flöde: **UI → hook/action/route → DB → tillbaka**
- Bevisa att byggstenen faktiskt håller ihop i verklig användning

#### Steg 8 — Regression check

Om byggstenen tidigare varit remediated:
- Är fixen fortfarande intakt?
- Har nya call-sites tillkommit?
- Har kontraktet driftat?

#### Steg 9 — Finding classification

- P0/P1/P2/P3 eller "no finding"
- Tydlig skillnad mellan:
  - **lokal bugg** — isolerat i byggstenen
  - **systemic pattern** — samma fel upprepas på andra ställen
  - **docs drift** — byggstenen fungerar men dokumentation stämmer inte
  - **unused/dead path** — kod som aldrig exekveras
  - **product decision** — beteendet kanske är avsiktligt

### 7.4 Kedjeregel — auditera kontraktet, inte bara filen

> **Kritisk regel:** Claude **får inte auditera en komponent isolerat om dess verkliga risk ligger i kedjan.**

En komponent kan se korrekt ut lokalt men vara fel i kontext:
- Hooken ger fel shape
- Server action returnerar annan struktur
- Route filtrerar fel fält
- Rollen som använder komponenten borde inte se samma data
- Samma komponent används i preview och live med olika krav

**Princip:** Auditera inte bara filen — auditera **kontraktet och användningen**.

### 7.5 När ska building-block audits användas?

Building-block audits öppnas selektivt:

1. **Efter domänaudit** — när en finding verkar beröra en bredare byggsten
2. **Vid regression** — när samma building block dyker upp i flera domäners findings
3. **Cross-domain** — när samma byggsten används i flera domäner med olika krav
4. **Vid misstanke** — när ett fynd verkar "lokalt" men sannolikt är systemiskt

De ska **inte** generera en stor backlog av småaudits. Syftet är selektiv fördjupning med hög blast-radius-medvetenhet.

### 7.6 Prioriterade byggstens-kluster (för framtida audit)

Dessa kluster har identifierats som högst prioritet baserat på blast radius och cross-domain-användning. **Ingen exekvering planerad i nuvarande fas** — listan är referens för när Level 2 audits aktiveras.

| Kluster | Blast radius | Motivering |
|---------|-------------|------------|
| Auth / role / tenant / capability helper stack | Kritisk | Används av alla autentiserade routes |
| Play/session visibility-komponenter | Hög | Påverkar vad deltagare/ledare ser i realtid |
| Demo / feature gate / upgrade gate-komponenter | Hög | Externt exponerad, rollberoende rendering |
| Planner shared capability helpers + publishing UI | Hög | Styr vem som får redigera/publicera/starta |
| Game builder shared mappers / serializers | Medium | Komplex dataformning, AI-genererad |
| Journey/gamification rendering chain | Medium | Polymorf, historiskt omarbetad |
| Shared UI across admin + user + participant | Medium | Rollbaserade renderingsskillnader |

### 7.7 Output-format

Building-block audit-rapporter sparas i `/launch-readiness/audits/` med namnkonventionen:

```
building-block-{name}-audit.md
```

Rapporten följer samma finding-format som domänaudits (§3), med tillägg av:
- **Call-site inventory** (alla kända användare)
- **Behavior matrix** (kontext × beteende)
- **End-to-end proof** (minst ett fullständigt flöde)


### B. UI Consistency

- Design system adherence (shadcn/ui patterns)
- Consistent button styles, spacing, colors
- Consistent modal/dialog patterns
- Consistent form patterns (validation, errors, success)
- Consistent navigation patterns

### C. Role-Based Visibility

Verifiera att varje vy korrekt visar/döljer element baserat på roll:
- System Admin
- License Admin  
- Lekledare (Leader)
- Participant
- Guest/Unauthenticated

### D. Security Deep-Dive

- Auth bypass-möjligheter
- Tenant data leakage
- ID enumeration
- Upload abuse
- Rate limiting coverage
- Personal data exposure
- GDPR compliance (delete/anonymize)

### E. Performance

- Bundle size analysis (`next build` output)
- Slow queries (identify candidates)
- Overfetching patterns
- Client vs server rendering decisions
- Image optimization

### F. Accessibility

- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management
- ARIA labels

---

## 8. Audit Output Format

Varje domänaudit producerar **en Markdown-fil** i `/launch-readiness/audits/`:

Filnamn: `{domain}-audit.md`

### Mallstruktur

```markdown
# {Domain} — Launch Readiness Audit

> **Auditor:** Claude  
> **Date:** YYYY-MM-DD  
> **Status:** Complete | In Progress  
> **Pass:** 1 | 2 | 3 (vilken iteration)

---

## Scope

Vilka filer, routes och flöden som granskats.

## Summary

| Severity | Count |
|----------|-------|
| P0 | X |
| P1 | X |
| P2 | X |
| P3 | X |

## Findings

### [DOMAIN-001] Finding title
- **Typ:** ...
- **Severity:** ...
(etc, se Finding Format ovan)

## Quick Wins

Snabba fixar som kan göras direkt.

## Systemic Issues

Problem som kräver arkitekturell förändring.

## Test Gaps

Vad som saknar test-coverage.

## Documentation Gaps

Dokumentation som saknas eller är inaktuell.

## i18n Status

Sammanfattning av översättningsstatus för domänen.

## Recommendations

Prioriterad lista med rekommenderade åtgärder.
```

---

## 9. Remediation Output Format

Varje implementation-fas producerar en fil i `/launch-readiness/implementation/`:

Filnamn: `{domain}-remediation.md`

### Mallstruktur

```markdown
# {Domain} — Remediation Plan

> **Based on:** audits/{domain}-audit.md  
> **Date:** YYYY-MM-DD  
> **Status:** Planning | In Progress | Complete

---

## P0 Fixes (Launch Blockers)

### Fix for DOMAIN-001
- **Finding:** ...
- **Root cause:** ...
- **Implementation:** ...
- **Files changed:** ...
- **Verification:** ...

## P1 Fixes (Must Fix)

(same format)

## P2 Fixes (Should Fix)

(same format)

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run validate:i18n` passes
- [ ] Related tests pass
- [ ] Manual verification of critical flows
```

---

## 10. Regression Protocol

### När körs regression?

1. Efter varje domän-remediation (alla P0/P1 fixade)
2. Efter större arkitekturella ändringar
3. Inför release readiness gate

### Hur körs regression?

1. Kör exakt samma audit-checklista igen
2. Verifiera att alla tidigare findings är fixade
3. Notera nya findings med `[REGRESSION]` tag
4. Uppdatera `launch-control.md`

### Regressions-rapport

Sparas i samma audit-fil med nytt pass-nummer:

```markdown
---

## Pass 2 — Regression (YYYY-MM-DD)

### Previously Fixed Findings
- [DOMAIN-001] ✅ Verified fixed
- [DOMAIN-002] ✅ Verified fixed

### New Findings
- [DOMAIN-010] ...

### Result: PASS | FAIL
```

---

## 11. Claude Instructions — Audit Execution

### Prompt-strategi för domänaudits

Varje audit-session bör instruera Claude att:

1. **Läs alla relevanta filer** för domänen (routes, components, hooks, API, types, i18n-keys)
2. **Följ kopplingar end-to-end:** DB-schema → RLS → API route → mapper/DTO → hook → component → UI
3. **Kontrollera rollbaserade skillnader:** Vad ser admin? Ledare? Deltagare?
4. **Verifiera i18n:** Jämför med `messages/sv.json` — finns nycklarna? Används `t()`?
5. **Notera ALLA problem** i det angivna formatet — stoppa aldrig vid första felet
6. **Skilja på bekräftat, troligt och behöver verifiering**
7. **Föreslå quick wins vs systemiska fixar**
8. **Identifiera test-gap och dokumentationsgap**
9. **Uppdatera launch-control.md** med resultat

### Prompt-mall

```
Du ska genomföra en launch-readiness audit av domänen {DOMAIN} i Lekbanken.

Följ metodiken i launch-readiness/launch-readiness-audit-program.md.

1. Läs alla filer i: {lista relevanta kataloger}
2. Följ dataflöden end-to-end
3. Notera ALLA findings — stoppa inte vid första felet
4. Klassificera varje finding med typ och severity
5. Spara resultatet i launch-readiness/audits/{domain}-audit.md
6. Uppdatera launch-readiness/launch-control.md med status

Sök djupt. Kolla kopplingar. Verifiera roller. Kontrollera i18n.
Producera en komplett audit — inte bara ytliga observationer.
```

---

## 12. Atlas Integration Protocol

### Under audit

- För varje domän som auditas, notera i Atlas:
  - `audit_status`: not_started → in_progress → complete → regression_passed
  - `last_audit_date`: datum
  - `findings_count`: { p0: N, p1: N, p2: N, p3: N }
  - `test_coverage`: none → minimal → adequate → good

### Under remediation

- Uppdatera finding-status
- Notera vilka filer som ändrats

### Under regression

- Uppdatera `audit_status` till `regression_passed` eller `regression_failed`

---

## 13. Arbetssätt — Steg för steg

```
┌─────────────────┐
│  1. AUDIT       │  Claude söker djupt, noterar allt
│                 │  → {domain}-audit.md
└────────┬────────┘
         │
┌────────▼────────┐
│  2. PRIORITERA  │  P0/P1/P2/P3, group by root cause
│                 │  → launch-control.md updated
└────────┬────────┘
         │
┌────────▼────────┐
│  3. IMPLEMENTERA│  Fixa grouped by root cause
│                 │  → {domain}-remediation.md
└────────┬────────┘
         │
┌────────▼────────┐
│  4. VERIFIERA   │  tsc, i18n, tests, manuellt
│                 │  → launch-control.md updated
└────────┬────────┘
         │
┌────────▼────────┐
│  5. REGRESSION  │  Samma audit igen
│                 │  → Pass 2 i audit-filen
└────────┬────────┘
         │
    Rent? ─── Nej → Tillbaka till steg 3
         │
         Ja
         │
┌────────▼────────┐
│  6. NÄSTA DOMÄN │
└─────────────────┘
```

---

## Appendix: Lekbanken Domain Map

```
Lekbanken
├── Auth & Identity
│   ├── Login / Signup / Recovery
│   ├── MFA
│   ├── OAuth (Google)
│   ├── Roles (system_admin, license_admin, leader, participant)
│   └── Capabilities
├── Tenants & Multi-tenancy
│   ├── Tenant isolation (RLS)
│   ├── Subdomain routing
│   └── License management
├── Games
│   ├── Library (browse, search, filter)
│   ├── Game details
│   ├── Favorites
│   └── Reactions
├── Game Authoring (Admin)
│   ├── Game builder
│   ├── Steps, phases, roles
│   ├── Artifacts & triggers
│   ├── Board config
│   └── Snapshot pipeline
├── Planner
│   ├── Plan list (scope tabs)
│   ├── Wizard (build + save-and-run)
│   ├── Calendar
│   ├── Plan versioning
│   └── Plan sharing
├── Play / Run
│   ├── Director mode
│   ├── Step execution
│   ├── Timer / signals
│   ├── Realtime state sync
│   └── Run history
├── Sessions & Participants
│   ├── Session creation
│   ├── QR / code join
│   ├── Lobby
│   ├── Artifact interaction
│   ├── Keypad / voting
│   └── Chat
├── Journey & Gamification
│   ├── Factions (4 factions)
│   ├── Cosmetics & loadout
│   ├── XP & levels
│   ├── Achievements
│   ├── Shop / purchases
│   └── Admin grants
├── Billing
│   ├── Stripe checkout
│   ├── Subscriptions
│   ├── Entitlements
│   └── Gift subscriptions
├── Notifications
│   ├── Push notifications
│   ├── Email delivery
│   ├── Read status
│   └── Broadcasts
├── Media
│   ├── Image upload
│   ├── Asset management
│   └── Spatial artifacts
├── Support
│   ├── FAQ
│   ├── Tickets
│   └── SLA tracking
├── Profile & Settings
│   ├── User profile
│   ├── Preferences
│   └── Avatar / cosmetic display
├── Marketing
│   ├── Landing pages
│   ├── SEO / metadata
│   └── Public game cards
├── Admin Dashboard
│   ├── User management
│   ├── Analytics
│   ├── Content moderation
│   └── System config
└── Infrastructure
    ├── Supabase (DB, Auth, Realtime, Storage)
    ├── Vercel (hosting, preview deploys)
    ├── CI/CD (GitHub Actions)
    ├── Atlas (code inventory)
    └── i18n (sv/en/no)
```
