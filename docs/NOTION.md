# Notion (mirror) – Lekbanken

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

Notion är kopplad till GitHub, men **repo:t är Single Source of Truth** för aktuell dokumentation.

- **Repo (docs/ + sandbox/wiki)**: det som gäller här och nu (implementation, invariants, flöden, runbooks, DB/migrations, adminflöden).
- **Notion**: spegel/portal (bra för browse, onboarding, beslutshistorik) men ska inte innehålla “egna sanningar” som avviker från repo.

Startpunkter i repo:
- docs start: [README.md](README.md)
- docs inventering/index: [DOCS_INDEX.md](DOCS_INDEX.md)
- docs full inventory (alla docs): [INVENTORY.md](INVENTORY.md)
- AI/human-wiki: [sandbox/wiki/README.md](../sandbox/wiki/README.md)

Målet är att undvika "code vibe drift": om något står i Notion men inte kan verifieras i repo så är det per definition misstänkt och ska uppdateras eller tas bort.

---

## 📚 Dokumentationsprinciper

### Repo innehåller (Source of Truth)
- ✅ Implementation, API-yta, UI-flöden och invariants
- ✅ DB/migrations + typgenerering + driftinstruktioner
- ✅ “Hur systemet fungerar” (system map + domain maps) för humans och AI

### Notion innehåller (spegel)
- ✅ Ingång/portal + länkar till repo-dokument
- ✅ Beslutshistorik (ADR/decision log) om ni vill ha det där också
- ✅ Roadmap/backlog om ni föredrar Notion som planeringsyta

**Regel:** Om en Notion-sida beskriver teknik/struktur så ska den i första hand länka till motsvarande doc i repo.

---

## 🔗 Huvudnavigering (Notion)

| Länk | Beskrivning |
|------|-------------|
| [🎯 Lekbanken Dashboard]() | Central översikt med snabbnavigering till alla hubs och databaser |
| [🏛️ Master Structure v1.0]() | Komplett systemöversikt med alla domäner och inline-databaser |
| [🎉 Welcome to Lekbanken Workspace]() | Workspace entry point |

⚠️ OBS: Fyll i länkarna när du har page IDs/URLs. Tills dess: utgå från repo.

---

## 🏛️ Arkitektur & Domäner (Notion)

| Länk | Beskrivning |
|------|-------------|
| [⭐ Domänstruktur: Lekbanken]() | Fullständig domänarkitektur med DDD-principer och ansvarsområden |
| [⭐ Platform Domain]() | Vercel runtime, miljöer, deployment, routing, säkerhet, observability |
| [Browse Domain]() | Sök, filter, rekommendationer, key tables |

Rekommenderad spegling i repo:
- [PLATFORM_DOMAIN.md](PLATFORM_DOMAIN.md)
- Auth/RBAC: [auth/README.md](auth/README.md) (aktuellt) + [AUTH_SYSTEM_ANALYSIS.md](AUTH_SYSTEM_ANALYSIS.md) (historisk/archived)
- Accounts (aktuellt): [ACCOUNTS_DOMAIN.md](ACCOUNTS_DOMAIN.md)
- Participants (aktuellt): [PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md)
	- Legacy spec: [PARTICIPANTS_DOMAIN_ARCHITECTURE.md](PARTICIPANTS_DOMAIN_ARCHITECTURE.md)
- Tenant (aktuellt): [TENANT_DOMAIN.md](TENANT_DOMAIN.md)
	- Roadmap: [DOMAIN_TENANT_TODO.md](DOMAIN_TENANT_TODO.md)
	- Learnings: [DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md](DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md)
- Billing & Licensing (aktuellt): [BILLING_LICENSING_DOMAIN.md](BILLING_LICENSING_DOMAIN.md)
	- Stripe integration (detail): [STRIPE.md](STRIPE.md)
- Games (aktuellt): [GAMES_DOMAIN.md](GAMES_DOMAIN.md)
	- Roadmap: [DOMAIN_GAMES_TODO.md](DOMAIN_GAMES_TODO.md)
	- Learnings: [DOMAIN_GAMES_LEARNINGS.md](DOMAIN_GAMES_LEARNINGS.md)
- Play (aktuellt): [PLAY_DOMAIN.md](PLAY_DOMAIN.md)
- Planner (aktuellt): [PLANNER_DOMAIN.md](PLANNER_DOMAIN.md)
- Gamification (aktuellt): [GAMIFICATION_DOMAIN.md](GAMIFICATION_DOMAIN.md)
- Media (aktuellt): [MEDIA_DOMAIN.md](MEDIA_DOMAIN.md)
- Translation Engine (aktuellt): [TRANSLATION_ENGINE_DOMAIN.md](TRANSLATION_ENGINE_DOMAIN.md)
- Operations (aktuellt): [OPERATIONS_DOMAIN.md](OPERATIONS_DOMAIN.md)
	- Runbooks: [ops/README.md](ops/README.md)
- DOMAIN_* (där det finns)

---

## 🗂️ Hubs (Team-resurser)

| Hub | Länk | Innehåll |
|-----|------|----------|
| **📦 Product Hub** | [Product Hub]() | Produktspecifikationer, roadmap, feature requests |
| **⚙️ Engineering Hub** | [Engineering Hub]() | Teknisk dokumentation, API-bibliotek, release notes |
| **🎨 Design Hub** | [Design Hub]() | Design system, UI-komponenter, style guide |
| **💼 Operations Hub** | [Operations Hub]() | Drift, processer, workflows, monitoring |

### Sub-pages från hubs:

**Product Hub:**
- [Product Overview]()

**Engineering Hub:**
- [API Library]()
- [Release Notes]()

**Operations Hub:**
- [Workflows]()

---

## 🏗️ Fullständig domänarkitektur

Enligt [⭐ Domänstruktur: Lekbanken]():

| Domän | Ansvar | Status |
|-------|--------|--------|
| **Platform Domain** | Runtime (Vercel), miljöer, deployment, routing, subdomäner, feature flags, error handling, performance, security, release channels | ⭐ Dokumenterad |
| **Accounts Domain** | Multi-tenant authentication, användarkonton, roller & behörigheter, språkpreferenser, sessionshantering, onboarding, e-postverifiering, 2FA | ⭐ Dokumenterad |
| **Tenant Domain** | Tenant-inställningar, valda produkter, aktiva licenser, feature configuration, standardinställningar, admin users, användarbegränsningar | ⭐ Dokumenterad |
| **Billing & Licenses Domain** | Produkttyper, paket, licenser, begränsningar per licens, Stripe/Vipps-integration, fakturering, förnyelse, seats/användarantal | ⭐ Dokumenterad |
| **Browse Domain** | Filter, produkter, kategorier, huvudsyften & undersyften, favoriter, sök, rekommendationer | ⭐ Dokumenterad |
| **Games Domain** | Lekdatabas, lekstruktur (Inför/Under/Efter/Reflektion), metadata, variationer, gruppstorlek/ålder/tid, koppling till syften och produkter | ⭐ Dokumenterad |
| **Play Domain** | Sessions (host + participants), Legendary Play realtime runtime (steps/phases/timer/roles/board), plan playback | ⭐ Dokumenterad |
| **Planner Domain** | Planer, block/tidslinje, synlighet (private/tenant/public), anteckningar, play-projection | ⭐ Dokumenterad |
| **Gamification Domain** | Achievements, badges, coins, streaks, levels/XP, challenges, events, leaderboards | ⭐ Dokumenterad |
| **Media Domain** | Standardbilder, illustrationer per produkt + huvudsyfte, kundens egna bilder, moderering, bildformat, media templates, versionering | ⭐ Dokumenterad |
| **AI Domain** | AI-generering av lekar och planer, AI-illustrationer, AI-sökning, AI-förslag baserat på ålder/syfte/produkt, översättningshjälp | Placeholder |
| **Translation Engine Domain** | i18n-logik, fallback-kedja (NO → SE → EN), import/export av språksträngar, batch-översättning, missing-key-detektor, admin UI för översättning | ⭐ Dokumenterad |
| **Operations Domain** | Backups, migrations, monitoring, error tracking, incident logs, deploy pipelines, versionshantering, load testing, performance budgets | ⭐ Dokumenterad |
| **API / Integration Domain** | REST/GraphQL endpoints, public API (framtida), webhooks, tokens & auth, rate limiting (om/när implementerat), API-error-struktur, integrations (Stripe, Supabase, e-post, push) | Placeholder |
| **Marketing / Public Site Domain** | Landningssidor, produktsidor, onboarding funnels, SEO, guides och artiklar, demo-mode, pricing pages, FAQ, try-before-pay-flöden | Placeholder |
| **Content Management Domain (CMD)** | CSV import/export, massuppdatering av lekar, batch-översättning, batch-illustrationer, automatisk validering, versionskontroll (draft/published), importloggar, felrapporter, mapping engine | Placeholder |

**Legend:**
- ⭐ **Dokumenterad** – Sidan innehåller fullständig specifikation
- **Placeholder** – Sidan existerar men behöver fyllas i

---

## 🗄️ Datamodell

### Core Databases

Enligt [Master Structure v1.0]():

| Database | Beskrivning | Notion-länk |
|----------|-------------|-------------|
| **Users DB** | Användarkonton, roller, preferenser | Se Master Structure |
| **Tenants DB** | Organisationer, multi-tenancy | Se Master Structure |
| **Products DB** | Lekbanken-produkter och kopplingar | Se Master Structure |
| **Purposes DB** | Huvudsyften och undersyften | Se Master Structure |
| **Games DB** | Lekdatabas med struktur och metadata | Se Master Structure |
| **Plans DB** | Användarnas planer och scheman | Se Master Structure |
| **Media DB** | Bilder, illustrationer, uploads | Se Master Structure |

### Billing & Licensing Databases

| Database | Beskrivning |
|----------|-------------|
| **Billing Products DB** | Produkter för försäljning (paket, licenser) |
| **Tenant Subscriptions DB** | Organisationers prenumerationer |
| **Private Subscriptions DB** | Privata användarprenumerationer |
| **Tenant Seat Assignments DB** | Tilldelning av seats per tenant |
| **Invoices DB** | Fakturor och betalningshistorik |
| **Payments DB** | Betalningar via Stripe/Vipps |

**Alla databaser med inline-views finns i:** [Master Structure v1.0]()

---

## 🚀 Platform & Tech Stack

### URL:er

Källan för “vad som faktiskt är deployat” är [PLATFORM_DOMAIN.md](PLATFORM_DOMAIN.md).

| URL | Syfte |
|-----|------|
| `app.lekbanken.no` | Produktion (app) |

### Miljöer

Miljö-/deployflöde kan förändras. Utgå från:

- [PLATFORM_DOMAIN.md](PLATFORM_DOMAIN.md)
- Ops/runbooks i `docs/ops/*`
- Repo-workflows (t.ex. `.github/workflows/*` om de finns)

### Deployment & CI/CD

Notion kan sammanfatta principer, men “aktuellt läge” ska alltid peka på repo:

- [PLATFORM_DOMAIN.md](PLATFORM_DOMAIN.md)
- [MIGRATIONS.md](MIGRATIONS.md)

**Fullständig specifikation:** [PLATFORM_DOMAIN.md](PLATFORM_DOMAIN.md)

---

## 🎯 Nästa steg för dokumentation

### Domäner som behöver fyllas i:

- [ ] **Data Model Domain** – Central schema-governance
- [x] **Accounts Domain** – Auth-flöden och roller (se `docs/ACCOUNTS_DOMAIN.md` + `docs/auth/*`)
- [x] **Tenant Domain** – Multi-tenancy-setup (se `docs/TENANT_DOMAIN.md`)
- [x] **Billing & Licenses Domain** – Stripe/Vipps-integration (se `docs/BILLING_LICENSING_DOMAIN.md` + `docs/STRIPE.md`)
- [x] **Games Domain** – Lekstruktur och metadata (se `docs/GAMES_DOMAIN.md`)
- [ ] **Planner Domain** – AI-generering och templates
- [ ] **Gamification Domain** – "Din Lekresa"-logik
- [x] **Translation Engine Domain** – i18n-fallback och batch-översättning (se `docs/TRANSLATION_ENGINE_DOMAIN.md`)
- [x] **Operations Domain** – Drift och monitoring (se `docs/OPERATIONS_DOMAIN.md` + `docs/ops/*`)
- [ ] **API/Integration Domain** – REST/GraphQL-spec
- [ ] **Marketing Domain** – Landningssidor och funnels

---

## 📖 Document Ownership Rules

| Dokumenttyp | Ägs av | Uppdateras av | Exempel |
|-------------|--------|---------------|---------|
| **Domänarkitektur** | Repo (docs/ + sandbox/wiki) | Tech Lead / Architect | Platform Domain + system map |
| **Datamodeller** | Repo (supabase/ + docs/) | Tech Lead / Backend | Migrations + schema/docs |
| **Produktspecifikationer** | Repo (docs/) | Product Owner + Engineering | Product docs och kontrakt |
| **API-endpoints** | Repo (kod) + docs (kontrakt) | Backend team | app/api/* + docs-referenser |
| **Design system** | Repo (docs/ + components/) | Design/Engineering | Admin design system + UI-principer |
| **Setup-guider** | Repo | Engineering | docs/ + README |
| **Kod-specifika detaljer** | Repo (kod) | Engineers | Algoritmer, edge cases |
| **Workflows & processer** | Repo (docs/ops) | Operations / PM | Runbooks och rutiner |

---

## 🔄 Synkronisering & Uppdateringar

**När du uppdaterar arkitekturen:**
1. Uppdatera repo-docs först (Source of Truth)
2. Uppdatera Notion-sidor som spegel (länka till rätt repo-dokument)
3. Meddela teamet vid större ändringar

**När du implementerar en ny feature:**
1. Implementera + uppdatera repo-docs i samma PR
2. (Valfritt) Uppdatera Notion-spegeln efter merge

### Notion ↔ GitHub (strategi)

Vi kan köra en av dessa nivåer:

**A) Manuell spegling (lägst friktion)**
- Notion får en “Start Here”-sida som bara länkar till repo-dokument.
- Uppdatering sker vid behov.

**B) Semi-automatisk (rekommenderad start)**
- Repo har en tydlig docs-nav + /sandbox/wiki.
- Notion har en eller flera sidor som uppdateras av en enkel script-körning som publicerar indexet (t.ex. docs/README.md och sandbox/wiki/README.md).

**C) Full automation (senare, om ROI finns)**
- GitHub Action som vid merge till main uppdaterar Notion-sidor via Notion API.

För automation behöver vi GitHub Secrets:
- NOTION_TOKEN
- NOTION_ROOT_PAGE_ID (eller DATABASE_ID om ni använder DB)

Och ett beslut om *vad* som synkas (förslag: endast index + “System Map”, inte alla docs).

---

**Maintainer:** Johan Schultz – johan@formgiver.no  
**Last updated:** 2025-12-17