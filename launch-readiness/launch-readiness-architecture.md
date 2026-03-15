# Lekbanken Launch Readiness — Architecture & Environment

> **Version:** 1.2  
> **Created:** 2026-03-10  
> **Last updated:** 2026-03-15  
> **Purpose:** Målbild för sandbox, test foundation, miljöer, databaser, migrationssäkerhet, release/rollback och framtidssäkring.  
> **Status:** LAUNCH READY — API wrapper, rate limiting, auth standardization, and scaling hardening done. Environment isolation implemented (local Docker + staging Supabase). Test foundation exists ad-hoc (261 test files, CI 7 checks).

---

## 1. Nuläge

### Tech Stack
| Komponent | Teknologi | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Runtime | React | 19 |
| Språk | TypeScript | 5 (strict) |
| Styling | Tailwind CSS | 4 |
| UI Components | shadcn/ui + Headless UI | — |
| Backend/DB | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth (JWT + MFA) | — |
| Hosting | Vercel | — |
| Testing | Playwright (E2E), Vitest (unit) | — |
| i18n | next-intl | 4.7 |
| State | Zustand (client), URL-driven | 4 |
| Validation | Zod | 3 |
| CI/CD | GitHub Actions | — |
| Payments | Stripe | 16 |

### Nuvarande miljöer

| Miljö | URL | DB | Status |
|-------|-----|-----|--------|
| Production | app.lekbanken.no | Supabase prod (`qohhnufxididbmzqnjwg`) | ✅ Live |
| Demo | demo.lekbanken.no | Supabase prod (demo tenant) | ✅ Live |
| Development | localhost:3000 | Lokal Supabase (Docker CLI) | ✅ Isolerad |
| Preview (Vercel) | *.vercel.app | Staging Supabase (`vmpdejhgpsrfulimsoqn`) | ✅ Isolerad |
| Sandbox (Atlas) | localhost:3000/sandbox/atlas | — | ✅ Dev only |

**Status:** ✅ LÖST (2026-03-13) — Utveckling och preview-deploys pekar nu mot isolerade databaser. ADR-005 (Alt B remote sandbox) implementerat. Lokal Supabase via Docker CLI för development.

---

## 2. Sandbox & Environment Strategy

### ADR-005: Environment Isolation

**Problem:** Idag delar development, preview och production samma Supabase-instans. Det gör det farligt att testa migrations och omöjligt att köra destructive tests.

**Alternativ utvärderade:**

| Alt | Beskrivning | Fördelar | Nackdelar |
|-----|-------------|----------|-----------|
| A | Lokal Supabase (Docker) | Full isolation, snabbt, gratis | Kräver Docker, inte identisk med hosted Supabase |
| B | Separat Supabase-projekt (remote sandbox) | Identiskt med prod, delbart | Kostar pengar, kräver config management |
| C | Hybrid: Lokal för dev + remote sandbox för preview | Bästa av A+B | Mer komplexitet att underhålla |
| D | Supabase Branching (beta) | Native branch-per-PR | Betafunktion, begränsad kontroll |

**Beslut: Alt B först → Alt C som målbild**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Local Dev       │    │  Preview (Vercel) │    │  Production     │
│  Lokal Supabase  │    │  Staging Supabase │    │  Prod Supabase  │
│  (Docker CLI)    │    │  (vmpdejhgpsrful) │    │  (qohhnufxidid) │
│                  │    │                   │    │                 │
│  APP_ENV=local   │    │  APP_ENV=staging  │    │  APP_ENV=       │
│  DEPLOY_TARGET=  │    │  DEPLOY_TARGET=   │    │    production   │
│    development   │    │    preview        │    │  DEPLOY_TARGET= │
│                  │    │                   │    │    prod         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Status:** ✅ DECIDED (2026-03-13) — Alt B (remote staging) implementerat. Preview + Development Vercel-scopes pekar mot staging Supabase. Lokal dev kör Docker CLI.

### Implementeringsplan för Hybrid-setup

#### Steg 1: Lokal Supabase

```bash
# Supabase CLI setup
supabase init          # Redan gjort (supabase/ dir finns)
supabase start         # Startar lokal PostgreSQL + Auth + Storage
supabase db reset      # Kör alla migrations från scratch
supabase db seed       # Kör seed-filer
```

**Konfigurering:**
- `.env.local` pekar mot `localhost:54321`
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<lokal nyckel>`

**Behov:**
- [ ] Verifiera att `supabase start` fungerar med 330+ migrations
- [ ] Skapa/uppdatera seed-filer i `supabase/seeds/`
- [ ] Skapa `.env.local.example` med lokala Supabase-variabler
- [ ] Dokumentera setup i README

#### Steg 2: Remote Sandbox

- [ ] Skapa nytt Supabase-projekt: `lekbanken-sandbox`
- [ ] Synka alla migrations dit
- [ ] Konfigurera Vercel preview environment variables att peka mot sandbox
- [ ] Sätt upp seed data
- [ ] Testa auth flows mot sandbox

#### Steg 3: CI-integration

- [ ] GitHub Actions: E2E-tester körs mot lokal Supabase
- [ ] Vercel previews: pekar mot sandbox DB
- [ ] Migration verification: `supabase db diff` i CI innan merge

---

## 3. Migration Safety

### Nuvarande process

Migrations skapas manuellt som SQL-filer i `supabase/migrations/`. De appliceras via Supabase Dashboard eller CLI.

### Rekommenderad process

```
1. Utvecklare skapar migration
   └── supabase/migrations/YYYYMMDDHHMMSS_description.sql

2. Lokal verifiering
   ├── supabase db reset  (kör alla migrations från scratch)
   ├── supabase db diff   (verifiera att schema matchar)
   └── Kör seed + app     (verifiera att appen fungerar)

3. PR review
   ├── CI kör migrations mot lokal Supabase
   ├── Vercel preview pekar mot sandbox
   └── Reviewer verifierar i preview

4. Merge till main
   └── Migration appliceras automatiskt på sandbox

5. Release till prod
   ├── Manuell applicering via Supabase Dashboard / CLI
   ├── Verifiering innan flagg-switch
   └── Rollback-plan redo
```

### Rollback-strategi

| Scenario | Åtgärd |
|----------|--------|
| Migration med additive changes (nya tabeller/kolumner) | Safe — nya saker påverkar inte befintligt |
| Migration med destructive changes (drop, rename) | Skapa explicit rollback-script |
| Migration som ändrar RLS | Testa rollback med RLS-tester |
| Katastrofal migration | Återställ från backup + rollback script |

**Regler:**
1. Destructive migrations ska alltid ha en motsvarande rollback-fil
2. Migrations ska vara idempotenta där möjligt
3. Stora migrations ska delas upp i små steg
4. Inga migrations ska droppa kolumner utan deprecation period

---

## 4. Test Strategy Architecture

### Test-pyramiden

```
                    ┌───────────┐
                    │   E2E     │  5-10 kritiska flöden
                    │ Playwright│  Full browser + DB
                    ├───────────┤
                  ┌─┤Integration├─┐  API + auth + RLS + permissions
                  │ │  Vitest   │ │  Mot lokal Supabase
                  │ └───────────┘ │
                ┌─┤    Unit       ├─┐  Business logic, mappers, validators
                │ │   Vitest      │ │  Ingen DB-beroende
                │ └───────────────┘ │
                └───────────────────┘
```

### Testkategorier och tools

| Kategori | Verktyg | Scope | Körs i CI |
|----------|---------|-------|-----------|
| Unit tests | Vitest + Testing Library | Hooks, utils, mappers, validators | ✅ Ja |
| Integration tests | Vitest + Supabase lokal | API routes, auth guards, RLS | ✅ Ja |
| E2E tests | Playwright | Full user flows | ✅ Ja |
| Accessibility | @axe-core/playwright | a11y violations | ✅ Ja |
| i18n validation | Custom script (i18n-audit.mjs) | Missing keys, hardcoded strings | ✅ Ja (finns) |
| Type checking | tsc --noEmit | TypeScript strictness | ✅ Ja (finns) |
| Linting | ESLint | Code quality | ✅ Ja |
| RLS verification | Custom SQL | Row-level security | ✅ Ja (finns) |
| Visual regression | Playwright screenshots | UI changes | 🟡 Optional |

### Minimum Test Coverage (Pre-Launch)

| Flöde | Typ | Prioritet |
|-------|-----|-----------|
| Login (email + Google) | E2E | P0 |
| Signup + onboarding | E2E | P0 |
| Browse games + search | E2E | P0 |
| Create plan (wizard) | E2E | P0 |
| Run plan (director mode) | E2E | P0 |
| Participant join via code | E2E | P1 |
| Session artifacts (keypad, voting) | E2E | P1 |
| Billing checkout | E2E | P1 |
| Admin: Manage users | E2E | P1 |
| Admin: Manage games | E2E | P1 |
| API auth guards (all routes) | Integration | P0 |
| RLS tenant isolation | Integration | P0 |
| Role-based capabilities | Unit | P0 |
| Planner state machine | Unit | P1 |
| Game snapshot integrity | Integration | P1 |

---

## 5. Architecture — Framtidssäkring

### 5.1 Nuvarande styrkor

Redan implementerade arkitekturbeslut som är bra:

1. **Feature-scoped code** — Domänlogik i `features/{domain}/`
2. **URL-driven state** — Inga komplexa global state stores
3. **RLS-first security** — Databasdriven åtkomstkontroll
4. **Strict TypeScript** — Kompileringsgarantier
5. **Zod validation** — Runtime type safety på API boundaries
6. **i18n from start** — next-intl med sv/en/no

### 5.2 Identifierade förbättringsområden

Dessa utreddes i Phase 1A (Architecture Audit) — **alla lösta utom B och D:**

#### A. API-lager konsolidering

**Problem:** 287 API-routes med inkonsistenta mönster (auth guards, error handling, response format).

**Status: ✅ LÖST.** `apiHandler()` wrapper implementerad i `lib/api/route-handler.ts`. 253/288 filer (87.8%) migrerade. Auth-nivåer: `'user'`, `'system_admin'`, `'participant'`, `'public'`. Zod input-validering via `input:`, centraliserad felformat, audit-logging på mutationer.

> Resterande ~35 routes är specialfall (webhooks, publika kataloger, sandbox-verktyg) som konvergerar organiskt.

#### B. Data Access Layer

**Problem:** Direkt Supabase-anrop från komponenter blandat med API-routes.

**Möjlig förbättring:**
- Tydligare separation: Server Components → Direct DB, Client Components → API routes
- Standardiserade data access patterns per domän

#### C. State Management

**Nuläge:** Mix av URL params, Zustand stores, React state, och server state.

**Möjlig förbättring:**
- Tydliga regler: när URL params, när Zustand, när server
- Dokumentera mönstren per domän

#### D. Error Boundaries

**Problem:** Oklart hur error handling fungerar konsistent.

**Möjlig förbättring:**
- Standardiserade error boundaries per route
- Centraliserad error reporting
- Konsistenta empty/loading/error states

#### E. Feature Flags

**Problem:** Inga feature flags idag. Calendar är "feature-flaggad" manuellt.

**Möjlig förbättring:**
- Enkel feature flag-mekanism (environment-based eller DB-based)
- Gör det möjligt att stänga av problematiska features snabbt

### 5.3 Arkitekturellt Backlog

Dessa ska INTE göras nu utan dokumenteras inför framtida beslut:

| Item | Prioritet | Beskrivning |
|------|-----------|-------------|
| Offline support | Post-launch | Service Workers, IndexedDB-cache |
| Real-time collaboration | Post-launch | Multipla directors på samma plan |
| Plugin system | Framtida | Tredjeparts-artifakt-typer |
| Multi-region | Framtida | Geografisk distribution |
| Audit trail | Pre-launch | Session commands audit log (`session_commands` table) ✅ Play domain. Other domain mutations not yet logged. |
| Rate limiting | Pre-launch | Wrapper-based rate limiting på kritiska routes ✅ Implementation klar. Serverless limiter-arkitektur (SEC-002b) P1 open. |

---

## 6. Observability & Operations

### Nuläge

✅ **Utrett och dokumenterat.** Launch Telemetry Pack definierar 5 signaler + 3 alerts. Alla mätvärden från befintliga tabeller (ingen ny instrumentering krävs). Incident Playbook finns med rollback-procedurer och kill-switches.

**Dokumentation:**
- `launch-readiness/launch-telemetry-pack.md` — Signals + alerts definition
- `docs/ops/production-signals-dashboard.md` — Signal query reference
- `docs/ops/anomaly-detection-playbook.md` — Alert response procedures
- `launch-readiness/incident-playbook.md` — Rollback, kill-switches, domain playbooks

### Rekommenderad minimum för launch

| Behov | Rekommendation | Prioritet |
|-------|----------------|-----------|
| Error tracking | Sentry / Vercel Analytics | P0 |
| API monitoring | Vercel Monitoring / custom | P1 |
| DB monitoring | Supabase Dashboard | P1 (gratis) |
| Auth failure tracking | Supabase Auth logs | P1 |
| Uptime monitoring | UptimeRobot / Vercel | P0 |
| Performance monitoring | Vercel Web Analytics | P2 |
| Custom business metrics | Supabase analytics tables | P2 |
| Alerting | Email/Slack alerts on errors | P1 |

### Logging-strategi

| Lager | Vad loggas | Varför |
|-------|-----------|--------|
| API routes | Request/response metadata, errors | Felsökning, abuse detection |
| Auth | Login attempts, failures, MFA events | Security audit trail |
| Mutations | Who changed what, when | Compliance, debugging |
| RLS | Denied queries (audit log i DB) | Security monitoring |
| Client | Unhandled errors | UX debugging |

---

## 7. Security Architecture

### Nuvarande säkerhetsmodell

```
┌──────────────────────┐
│  Vercel Edge          │  SSL termination, DDoS protection
├──────────────────────┤
│  Next.js Middleware   │  Auth check, tenant routing, MFA verification
│  (proxy.ts)          │  Circuit breaker, locale/theme
├──────────────────────┤
│  apiHandler() wrapper │  Auth (user/admin/participant/public), Zod validation,
│  (lib/api/)           │  Rate limiting, error format. 253/288 routes (87.8%).
├──────────────────────┤
│  Supabase RLS        │  Row-level security on ALL tables
│  (PostgreSQL)        │  Tenant isolation, user scoping
├──────────────────────┤
│  Supabase Auth       │  JWT tokens, MFA, OAuth
│  (GoTrue)            │  Session management, refresh tokens
└──────────────────────┘
```

### Säkerhetsstatus (efter Security & Auth Audit + Tenant Isolation Audit)

| Risk | Severity | Status |
|------|----------|--------|
| API routes utan auth check | P0 | ✅ Triaged — 5 true concerns, all P0 fixed. 86.1% now use apiHandler. |
| ServiceRole routes utan explicit auth | P0 | ✅ Triaged — SEC-001 fixed, remaining are RLS-protected or intentional. |
| Rate limiting | P1 | 🟡 Kritiska routes ratelimitade. SEC-002b (serverless limiter arkitektur) öppen P1. |
| Upload abuse | P1 | ✅ Media audit complete — cross-tenant upload blocked, upload pipeline secured. Server-side MIME validation deferred (P1 post-launch). |
| Tenant isolation | P0 | ✅ TI-001 P0 fixed. TI-002/TI-NEW-1c resolved (product decisions). |
| ID enumeration | P2 | RLS hanterar. Participant routes använder 403 (inte 404) för att förhindra enumeration. |

### Rekommenderade säkerhetsåtgärder

1. **API auth audit** — ✅ KLAR — Klassificerat alla 287 routes (se Security & Auth Audit)
2. **Rate limiting** — ✅ Standardiserad rate limit i apiHandler() wrapper (DD-3). Kritiska routes täckta.
3. **Input validation** — ✅ Zod-schemas på API boundaries via wrapper `input:`. 86.1% routes täckta.
4. **GDPR compliance** — Verifiera delete/anonymize-flöden
5. **CSP headers** — Content Security Policy i next.config.ts
6. **Secret management** — Verifiera att inga secrets läcker i client bundles

---

## 8. Release & Deploy Strategy

### Nuvarande deploy-process

```
Developer → Git push → GitHub Actions (lint, type-check, i18n, tests) → Vercel auto-deploy
```

### Rekommenderad launch-process

```
1. Feature branch
   └── Dev testar lokalt mot lokal Supabase

2. PR → develop
   ├── CI: lint, type-check, i18n, unit tests
   ├── Vercel preview → sandbox DB
   └── Review: kolla preview deployment

3. develop → staging
   ├── Full E2E test suite
   ├── Migration verification
   └── Smoke test manuellt

4. staging → main (release)
   ├── Migration appliceras på prod (manuellt med verifiering)
   ├── Vercel auto-deploy
   ├── Smoke test av prod
   └── Rollback-plan redo (revert commit + migration rollback)
```

### Feature Flags

Enkel implementation:

```typescript
// lib/config/features.ts
export const FEATURES = {
  calendar: process.env.NEXT_PUBLIC_FEATURE_CALENDAR === 'true',
  newGamification: process.env.NEXT_PUBLIC_FEATURE_NEW_GAMIFICATION === 'true',
  // Kill switches
  billing: process.env.NEXT_PUBLIC_FEATURE_BILLING !== 'false', // default on
  sessions: process.env.NEXT_PUBLIC_FEATURE_SESSIONS !== 'false',
} as const;
```

**Vercel environment variables** per miljö (prod, preview, development) styr vilka features som är aktiva.

---

## 9. Beslutstabell

Alla arkitekturbeslut som behöver fattas under Phase 1:

| ADR | Beslut | Alternativ | Status | Ägare |
|-----|--------|-----------|--------|-------|
| ADR-005 | Environment isolation | A (lokal), B (remote), C (hybrid), D (branching) | ✅ DECIDED: B (remote sandbox) — implementerat 2026-03-13. Hybrid (C) framtida målbild. | Claude + GPT |
| ADR-006 | Test strategy | Pyramiden ovan | 🟡 PROPOSED | — |
| ADR-007 | API standardisering | Wrapper vs middleware vs per-route | ✅ DECIDED: Wrapper (`apiHandler()`) | Claude |
| ADR-008 | Feature flags | Env-based vs DB-based vs service | 🟡 PROPOSED: env-based | — |
| ADR-009 | Error tracking | Sentry vs Vercel vs custom | ⬜ Behöver beslut | — |
| ADR-010 | Rate limiting strategy | Middleware vs Vercel edge vs DB | ✅ DECIDED: In-wrapper (DD-3) | Claude |
| ADR-011 | Deploy branching model | main only vs develop + staging | 🟡 PROPOSED: develop + staging | — |
| ADR-012 | Rollback strategy | Git revert + migration rollback | 🟡 PROPOSED | — |

---

## Changelog

| Datum | Ändring |
|-------|---------|
| 2026-03-10 | Initial creation — environment, test, security, deploy strategy |
| 2025-07-24 | Updated security model, API wrapper status, ADR-007/010 decided, rate limiting + audit trail status |
