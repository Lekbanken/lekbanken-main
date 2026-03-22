# Notion (mirror) – Lekbanken

## Metadata

- Owner: -
- Status: active
- Date: 2025-11-29
- Last updated: 2026-03-21
- Last validated: 2026-03-21

Notion är kopplad till GitHub, men **repo:t är Single Source of Truth** för aktuell dokumentation.

- **Repo (docs/ + sandbox/wiki)**: det som gäller här och nu (implementation, invariants, flöden, runbooks, DB/migrations, adminflöden).
- **Notion**: spegel/portal (bra för browse, onboarding, beslutshistorik) men ska inte innehålla “egna sanningar” som avviker från repo.

Aktuell arbetsmodell:
- verktygsansvar: `docs/TOOLING_MATRIX.md`
- Notion-syncstrategi: `docs/NOTION_SYNC_PLAN.md`
- operativ checklista: `docs/NOTION_UPDATE_CHECKLIST.md`

Startpunkter i repo:
- docs start: [README.md](README.md)
- docs entry map: [DOCS_INDEX.md](DOCS_INDEX.md)
- docs authoritative registry: [INVENTORY.md](INVENTORY.md)
- docs naming/structure: [DOCS_NAMING_CONVENTIONS.md](DOCS_NAMING_CONVENTIONS.md)
- docs reports (archive): [reports/README.md](reports/README.md)
- docs archive: [archive/README.md](archive/README.md)
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
| [🎯 Lekbanken Dashboard](https://www.notion.so/Johan-Schultzs-omr-de-Lekbanken-Dashboard-14ca3649dd9080fdaeb3e8c067e1eb2e) | Central översikt med snabbnavigering till alla hubs och databaser |
| [🏛️ Master Structure v1.0](https://www.notion.so/Johan-Schultzs-omr-de-Lekbanken-Master-Structure-v1-0-14ca3649dd908087a1bfc94b89ea2a07) | Komplett systemöversikt med alla domäner och inline-databaser |
| [🎉 Welcome to Lekbanken Workspace](https://www.notion.so/a2aede16b55a4924bb1bb8ccb66e568d) | Workspace entry point |

Om en länk saknas eller blir inaktuell: utgå från repo först och uppdatera sedan Notion-länken via repo-styrd process.

---

## 🏛️ Arkitektur & Domäner (Notion)

| Länk | Beskrivning |
|------|-------------|
| [⭐ Domänstruktur: Lekbanken](https://www.notion.so/Johan-Schultzs-omr-de-Dom-nstruktur-Lekbanken-14ca3649dd9080e89b62d94db3502c82) | Fullständig domänarkitektur med DDD-principer och ansvarsområden |
| [⭐ Platform Domain](https://www.notion.so/Johan-Schultzs-omr-de-Platform-Domain-Uppdaterad-med-Vercel-14ba3649dd908017af0bd5b87c2f37ed) | Vercel runtime, miljöer, deployment, routing, säkerhet, observability |
| [Browse Domain](browse/BROWSE_DOMAIN.md) | Sök, filter, rekommendationer, key tables |

Rekommenderad spegling i repo:
- [platform/PLATFORM_DOMAIN.md](platform/PLATFORM_DOMAIN.md)
- Browse (aktuellt): [browse/BROWSE_DOMAIN.md](browse/BROWSE_DOMAIN.md)
- Data Model (aktuellt): [database/DATA_MODEL_DOMAIN.md](database/DATA_MODEL_DOMAIN.md)
- Auth/RBAC: [auth/README.md](auth/README.md) (aktuellt) + [auth/archive/AUTH_SYSTEM_ANALYSIS.md](auth/archive/AUTH_SYSTEM_ANALYSIS.md) (historisk/archived)
- Accounts (aktuellt): [auth/ACCOUNTS_DOMAIN.md](auth/ACCOUNTS_DOMAIN.md)
- Participants (aktuellt): [participants/PARTICIPANTS_DOMAIN.md](participants/PARTICIPANTS_DOMAIN.md)
	- Legacy spec: [participants/PARTICIPANTS_DOMAIN_ARCHITECTURE.md](participants/PARTICIPANTS_DOMAIN_ARCHITECTURE.md)
- Tenant (aktuellt): [tenant/TENANT_DOMAIN.md](tenant/TENANT_DOMAIN.md)
	- Roadmap: [tenant/DOMAIN_TENANT_TODO.md](tenant/DOMAIN_TENANT_TODO.md)
	- Learnings: [tenant/DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md](tenant/DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md)
- Billing & Licensing (aktuellt): [billing/BILLING_LICENSING_DOMAIN.md](billing/BILLING_LICENSING_DOMAIN.md)
	- Stripe integration (detail): [billing/STRIPE.md](billing/STRIPE.md)
- Games (aktuellt): [games/GAMES_DOMAIN.md](games/GAMES_DOMAIN.md)
	- Roadmap: [games/DOMAIN_GAMES_TODO.md](games/DOMAIN_GAMES_TODO.md)
	- Learnings: [games/DOMAIN_GAMES_LEARNINGS.md](games/DOMAIN_GAMES_LEARNINGS.md)
- Content Management (aktuellt): [content/CONTENT_MANAGEMENT_DOMAIN.md](content/CONTENT_MANAGEMENT_DOMAIN.md)
- Play (aktuellt): [play/PLAY_DOMAIN.md](play/PLAY_DOMAIN.md)
- Planner (aktuellt): [planner/PLANNER_DOMAIN.md](planner/PLANNER_DOMAIN.md)
- Gamification (aktuellt): [gamification/GAMIFICATION_DOMAIN.md](gamification/GAMIFICATION_DOMAIN.md)
- Journey (aktuellt): [journey/JOURNEY_DOMAIN.md](journey/JOURNEY_DOMAIN.md)
- Marketing (aktuellt): [marketing/MARKETING_DOMAIN.md](marketing/MARKETING_DOMAIN.md)
- Media (aktuellt): [media/MEDIA_DOMAIN.md](media/MEDIA_DOMAIN.md)
- Notifications (aktuellt): [notifications/NOTIFICATIONS_DOMAIN.md](notifications/NOTIFICATIONS_DOMAIN.md)
- Support (aktuellt): [support/SUPPORT_DOMAIN.md](support/SUPPORT_DOMAIN.md)
- Translation Engine (aktuellt): [content/TRANSLATION_ENGINE_DOMAIN.md](content/TRANSLATION_ENGINE_DOMAIN.md)
- Operations (aktuellt): [ops/OPERATIONS_DOMAIN.md](ops/OPERATIONS_DOMAIN.md)
	- Runbooks: [ops/README.md](ops/README.md)
- API / Integration (aktuellt): [api/API_INTEGRATION_DOMAIN.md](api/API_INTEGRATION_DOMAIN.md)
- AI (gated): [ai/AI_DOMAIN.md](ai/AI_DOMAIN.md)
- Database Security (aktuellt): [database/DATABASE_SECURITY_DOMAIN.md](database/DATABASE_SECURITY_DOMAIN.md)
- DOMAIN_* (där det finns)

---

## 🗂️ Hubs (Team-resurser)

| Hub | Länk | Innehåll |
|-----|------|----------|
| **📦 Product Hub** | Pending URL verification | Produktspecifikationer, roadmap, feature requests |
| **⚙️ Engineering Hub** | [Engineering Hub](https://www.notion.so/Johan-Schultzs-omr-de-Engineering-Hub-14ca3649dd908085ba50e9c43d7a4a31) | Teknisk dokumentation, API-bibliotek, release notes |
| **🎨 Design Hub** | Pending URL verification | Design system, UI-komponenter, style guide |
| **💼 Operations Hub** | Pending URL verification | Drift, processer, workflows, monitoring |

### Sub-pages från hubs:

**Product Hub:**
- Pending URL verification

**Engineering Hub:**
- API Library — pending URL verification
- Release Notes — pending URL verification

**Operations Hub:**
- Workflows — pending URL verification

---

## 🏗️ Fullständig domänarkitektur

Enligt [⭐ Domänstruktur: Lekbanken](https://www.notion.so/Johan-Schultzs-omr-de-Dom-nstruktur-Lekbanken-14ca3649dd9080e89b62d94db3502c82):

| Domän | Ansvar | Status |
|-------|--------|--------|
| **Platform Domain** | Runtime (Vercel), miljöer, deployment, routing, subdomäner, feature flags, error handling, performance, security, release channels | ⭐ Dokumenterad |
| **Data Model Domain** | Schema governance: migrations, typegen (TS), RLS-täckning, naming conventions och cross-domain invariants | ⭐ Dokumenterad |
| **Accounts Domain** | Multi-tenant authentication, användarkonton, roller & behörigheter, språkpreferenser, sessionshantering, onboarding, e-postverifiering, 2FA | ⭐ Dokumenterad |
| **Tenant Domain** | Tenant-inställningar, valda produkter, aktiva licenser, feature configuration, standardinställningar, admin users, användarbegränsningar | ⭐ Dokumenterad |
| **Billing & Licenses Domain** | Produkttyper, paket, licenser, begränsningar per licens, Stripe/Vipps-integration, fakturering, förnyelse, seats/användarantal | ⭐ Dokumenterad |
| **Browse Domain** | Filter, produkter, kategorier, huvudsyften & undersyften, favoriter, sök, rekommendationer | ⭐ Dokumenterad |
| **Games Domain** | Lekdatabas, lekstruktur (Inför/Under/Efter/Reflektion), metadata, variationer, gruppstorlek/ålder/tid, koppling till syften och produkter | ⭐ Dokumenterad |
| **Play Domain** | Sessions (host + participants), Legendary Play realtime runtime (steps/phases/timer/roles/board), plan playback | ⭐ Dokumenterad |
| **Planner Domain** | Planer, block/tidslinje, synlighet (private/tenant/public), anteckningar, play-projection | ⭐ Dokumenterad |
| **Gamification Domain** | Achievements, badges, coins, streaks, levels/XP, challenges, events, leaderboards | ⭐ Dokumenterad |
| **Journey Domain** | "Din lekresa" – dashboard/timeline över aktivitet och framsteg (read/composition, Journey BFF) | ⭐ Dokumenterad |
| **Media Domain** | Standardbilder, illustrationer per produkt + huvudsyfte, kundens egna bilder, moderering, bildformat, media templates, versionering | ⭐ Dokumenterad |
| **AI Domain** | AI-funktioner (user-facing) – alltid feature-flag gated (default OFF) | ⭐ Dokumenterad |
| **Translation Engine Domain** | i18n-logik, fallback-kedja (NO → SE → EN), import/export av språksträngar, batch-översättning, missing-key-detektor, admin UI för översättning | ⭐ Dokumenterad |
| **Operations Domain** | Backups, migrations, monitoring, error tracking, incident logs, deploy pipelines, versionshantering, load testing, performance budgets | ⭐ Dokumenterad |
| **API / Integration Domain** | Endpoints, BFF contracts, webhooks, auth/tenancy conventions, error patterns (repo-anchored) | ⭐ Dokumenterad |
| **Marketing / Public Site Domain** | Landningssidor, produktsidor, onboarding funnels, SEO, guides och artiklar, demo-mode, pricing pages, FAQ, try-before-pay-flöden | ⭐ Dokumenterad |
| **Notifications Domain** | In-app notiser, preferenser, delivery log, admin-sändning | ⭐ Dokumenterad |
| **Support Domain** | Feedback, support tickets, ticket messages, bug reports, admin-hantering | ⭐ Dokumenterad |
| **Content Management Domain (CMD)** | CSV import/export, massuppdatering av lekar, versionskontroll (draft/published), builder-flöden och content planner primitives | ⭐ Dokumenterad |

**Legend:**
- ⭐ **Dokumenterad** – Sidan innehåller fullständig specifikation
- **Placeholder** – Sidan existerar men behöver fyllas i

---

## 🗄️ Datamodell

### Core Databases

Enligt [Master Structure v1.0](https://www.notion.so/Johan-Schultzs-omr-de-Lekbanken-Master-Structure-v1-0-14ca3649dd908087a1bfc94b89ea2a07):

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

**Alla databaser med inline-views finns i:** [Master Structure v1.0](https://www.notion.so/Johan-Schultzs-omr-de-Lekbanken-Master-Structure-v1-0-14ca3649dd908087a1bfc94b89ea2a07)

---

## 🚀 Platform & Tech Stack

### URL:er

Källan för “vad som faktiskt är deployat” är [platform/PLATFORM_DOMAIN.md](platform/PLATFORM_DOMAIN.md).

| URL | Syfte |
|-----|------|
| `app.lekbanken.no` | Produktion (app) |

### Miljöer

Miljö-/deployflöde kan förändras. Utgå från:

- [platform/PLATFORM_DOMAIN.md](platform/PLATFORM_DOMAIN.md)
- Ops/runbooks i `docs/ops/*`
- Repo-workflows (t.ex. `.github/workflows/*` om de finns)

### Deployment & CI/CD

Notion kan sammanfatta principer, men “aktuellt läge” ska alltid peka på repo:

- [platform/PLATFORM_DOMAIN.md](platform/PLATFORM_DOMAIN.md)
- [MIGRATIONS.md](MIGRATIONS.md)

**Fullständig specifikation:** [platform/PLATFORM_DOMAIN.md](platform/PLATFORM_DOMAIN.md)

---

## 🎯 Nästa steg för dokumentation

### Domäner som behöver fyllas i:

- [x] **Data Model Domain** – Central schema-governance (se `docs/database/DATA_MODEL_DOMAIN.md`)
- [x] **Accounts Domain** – Auth-flöden och roller (se `docs/auth/ACCOUNTS_DOMAIN.md` + `docs/auth/*`)
- [x] **Tenant Domain** – Multi-tenancy-setup (se `docs/tenant/TENANT_DOMAIN.md`)
- [x] **Billing & Licenses Domain** – Stripe/Vipps-integration (se `docs/billing/BILLING_LICENSING_DOMAIN.md` + `docs/billing/STRIPE.md`)
- [x] **Games Domain** – Lekstruktur och metadata (se `docs/games/GAMES_DOMAIN.md`)
- [x] **Planner Domain** – Planer, block/tidslinje, synlighet, anteckningar, play-projection (se `docs/planner/PLANNER_DOMAIN.md`)
- [ ] **Planner Domain** – AI-generering och templates
- [x] **Gamification Domain** – "Din Lekresa"-gamification (coins, streaks, achievements) (se `docs/gamification/GAMIFICATION_DOMAIN.md`)
- [x] **Journey Domain** – "Din lekresa" dashboard/timeline (read/composition) (se `docs/journey/JOURNEY_DOMAIN.md`)
- [x] **Translation Engine Domain** – i18n-fallback och batch-översättning (se `docs/content/TRANSLATION_ENGINE_DOMAIN.md`)
- [x] **Operations Domain** – Drift och monitoring (se `docs/ops/OPERATIONS_DOMAIN.md` + `docs/ops/*`)
- [x] **API/Integration Domain** – endpoints & conventions (se `docs/api/API_INTEGRATION_DOMAIN.md`)
- [x] **Marketing Domain** – Landningssidor och funnels (se `docs/marketing/MARKETING_DOMAIN.md`)
- [x] **Notifications Domain** – In-app notiser (se `docs/notifications/NOTIFICATIONS_DOMAIN.md`)
- [x] **Support Domain** – Feedback + tickets (se `docs/support/SUPPORT_DOMAIN.md`)
- [x] **Content Management Domain (CMD)** – Bulk ops (CSV import/export) + builder + content planner primitives (se `docs/content/CONTENT_MANAGEMENT_DOMAIN.md`)

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