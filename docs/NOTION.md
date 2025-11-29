# Notion Documentation – Lekbanken

Detta dokument innehåller alla länkar till Lekbankens Notion-workspace, som fungerar som **Single Source of Truth** för arkitektur, domänlogik, datamodeller och strategiska beslut.

---

## 📚 Dokumentationsprinciper

### Notion innehåller:
- ✅ Domänlogik och arkitekturbeslut
- ✅ Datamodeller, relationer och tabellscheman
- ✅ Produktspecifikationer och roadmap
- ✅ Workflows, processer och team-resurser
- ✅ Design system och UI-principer

### GitHub innehåller:
- ✅ Implementation-specifika detaljer
- ✅ Setup-instruktioner och dev-miljö-guider
- ✅ API endpoint-dokumentation (där det är kodsmart)
- ✅ Kod-kommentarer för komplex logik

**Vi undviker duplicering** – strategiska beslut dokumenteras i Notion, implementation i kod och README/kommentarer.

---

## 🔗 Huvudnavigering

| Länk | Beskrivning |
|------|-------------|
| [🎯 Lekbanken Dashboard]() | Central översikt med snabbnavigering till alla hubs och databaser |
| [🏛️ Master Structure v1.0]() | Komplett systemöversikt med alla domäner och inline-databaser |
| [🎉 Welcome to Lekbanken Workspace]() | Workspace entry point |

---

## 🏛️ Arkitektur & Domäner

| Länk | Beskrivning |
|------|-------------|
| [⭐ Domänstruktur: Lekbanken]() | Fullständig domänarkitektur med DDD-principer och ansvarsområden |
| [⭐ Platform Domain]() | Vercel runtime, miljöer, deployment, routing, säkerhet, observability |
| [Browse Domain]() | Sök, filter, rekommendationer, key tables |

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
| **Accounts Domain** | Multi-tenant authentication, användarkonton, roller & behörigheter, språkpreferenser, sessionshantering, onboarding, e-postverifiering, 2FA | Placeholder |
| **Tenant Domain** | Tenant-inställningar, valda produkter, aktiva licenser, feature configuration, standardinställningar, admin users, användarbegränsningar | Placeholder |
| **Billing & Licenses Domain** | Produkttyper, paket, licenser, begränsningar per licens, Stripe/Vipps-integration, fakturering, förnyelse, seats/användarantal | Placeholder |
| **Browse Domain** | Filter, produkter, kategorier, huvudsyften & undersyften, favoriter, sök, rekommendationer | ⭐ Dokumenterad |
| **Games Domain** | Lekdatabas, lekstruktur (Inför/Under/Efter/Reflektion), metadata, variationer, gruppstorlek/ålder/tid, koppling till syften och produkter | Placeholder |
| **Play Domain** | Game-view, steg-för-steg UI, presentationsläge, session state, offline-läge | Placeholder |
| **Planner Domain** | Planläggning av flera lekar, veckoscheman, export (PDF, delning), AI-genererade planer, templates, delning med team/grupp | Placeholder |
| **Gamification Domain** | "Din Lekresa" – poängsystem, tokens/valuta, badges/troféer, levels, milestones, easter eggs, butik/reward-shop, aktivitetshistorik | Placeholder |
| **Media Domain** | Standardbilder, illustrationer per produkt + huvudsyfte, kundens egna bilder, moderering, bildformat, media templates, versionering | Placeholder |
| **AI Domain** | AI-generering av lekar och planer, AI-illustrationer, AI-sökning, AI-förslag baserat på ålder/syfte/produkt, översättningshjälp | Placeholder |
| **Translation Engine Domain** | i18n-logik, fallback-kedja (NO → SE → EN), import/export av språksträngar, batch-översättning, missing-key-detektor, admin UI för översättning | Placeholder |
| **Operations Domain** | Backups, migrations, monitoring, error tracking, incident logs, deploy pipelines, versionshantering, load testing, performance budgets | Placeholder |
| **API / Integration Domain** | REST/GraphQL endpoints, public API (framtida), webhooks, tokens & auth, rate limiting, API-error-struktur, integrations (Stripe, Supabase, e-post, push) | Placeholder |
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

### Subdomäner (enligt Platform Domain)

| Subdomän | Syfte |
|----------|-------|
| `lekbanken.no` | Marketing site |
| `app.lekbanken.no` | Huvudapplikation |
| `admin.lekbanken.no` | Administrationspanel (CMD) |
| `demo.lekbanken.no` | Offentlig demo |
| `api.lekbanken.no` | API endpoints |

### Miljöer

- **Production** – Live-miljö
- **Staging** – Pre-production test
- **Preview** – Automatisk preview per PR (GitHub → Vercel)
- **Local** – Lokal utveckling

### Deployment & CI/CD

- GitHub → Vercel integration
- Automatiska preview-deploys per PR
- Automatisk production deploy vid merge
- Migrations pipeline för Supabase
- Seed-data per miljö
- Rollbacks & build history

**Fullständig specifikation:** [⭐ Platform Domain]()

---

## 🎯 Nästa steg för dokumentation

### Domäner som behöver fyllas i:

- [ ] **Data Model Domain** – Central schema-governance
- [ ] **Accounts Domain** – Auth-flöden och roller
- [ ] **Tenant Domain** – Multi-tenancy-setup
- [ ] **Billing & Licenses Domain** – Stripe/Vipps-integration
- [ ] **Games Domain** – Lekstruktur och metadata
- [ ] **Planner Domain** – AI-generering och templates
- [ ] **Gamification Domain** – "Din Lekresa"-logik
- [ ] **Translation Engine Domain** – i18n-fallback och batch-översättning
- [ ] **Operations Domain** – Drift och monitoring
- [ ] **API/Integration Domain** – REST/GraphQL-spec
- [ ] **Marketing Domain** – Landningssidor och funnels

---

## 📖 Document Ownership Rules

| Dokumenttyp | Ägs av | Uppdateras av | Exempel |
|-------------|--------|---------------|---------|
| **Domänarkitektur** | Notion | Tech Lead / Architect | Domänstrukturen, Platform Domain |
| **Datamodeller** | Notion | Tech Lead / Backend | Master Structure, Games DB schema |
| **Produktspecifikationer** | Notion | Product Owner | Product Hub, feature specs |
| **API-endpoints** | Notion (översikt) + GitHub (detaljer) | Backend team | API Library (Notion) + OpenAPI spec (GitHub) |
| **Design system** | Notion | Design team | Design Hub, UI-komponenter |
| **Setup-guider** | GitHub README | Engineering | Installation, env vars |
| **Kod-specifika detaljer** | GitHub-kommentarer | Engineers | Algoritmer, edge cases |
| **Workflows & processer** | Notion | Operations / PM | Operations Hub, Workflows |

---

## 🔄 Synkronisering & Uppdateringar

**När du uppdaterar arkitekturen:**
1. Uppdatera Notion-sidorna först (single source of truth)
2. Uppdatera eventuella referenser i GitHub README/docs om strukturen ändras
3. Meddela teamet via Slack/Discord

**När du implementerar en ny feature:**
1. Läs specifikationen i Notion
2. Implementera i kod enligt domänens ansvar
3. Uppdatera API Library (Notion) om nya endpoints skapas
4. Lägg till kod-kommentarer för komplex logik
5. Uppdatera Release Notes (Notion) när featuren deployas

---

**Maintainer:** Johan Schultz – johan@formgiver.no  
**Last updated:** 2025-11-28