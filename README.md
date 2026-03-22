# Lekbanken

## Metadata

- Owner: -
- Status: active
- Date: 2025-11-28
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active root-level repo entrypoint. Use this file for quick repo orientation and setup routing; use `PROJECT_CONTEXT.md` for deeper product understanding.

Lekbanken är en modern multi-tenant SaaS-plattform för lekpedagogik och aktivitetsplanering, byggd med Next.js, Supabase och Vercel.

Plattformen riktar sig mot idrottsledare, föreningar, skolor och föräldrar, och erbjuder ett bibliotek av lekaktiviteter, planer, AI-förslag, gamification och rollstyrda arbetsytor.

Detta repo innehåller applikationskod, migrations, CI-konfiguration och den tekniska dokumentationen.

## Start här

- Produktkontext först: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- Dokumentationsingång: [docs/README.md](docs/README.md)
- VS Code-arbetsmodell: [docs/VS_CODE_WORKFLOW.md](docs/VS_CODE_WORKFLOW.md)
- Miljöer och databasmål: [docs/database/environments.md](docs/database/environments.md)
- Release-flöde: [docs/ops/release-promotion-checklist.md](docs/ops/release-promotion-checklist.md)
- Notion-strategi: [docs/NOTION.md](docs/NOTION.md)

## Dokumentationsmodell

- Repo:t är source of truth för implementation, migrations, miljöregler, workflows och operativ dokumentation.
- Notion är portal och spegel, inte primär implementation truth.
- Om repo och Notion säger olika saker gäller repo:t.

## DB & migrations

- Migration guide: [docs/MIGRATIONS.md](docs/MIGRATIONS.md)
- Environment rules: [docs/database/environments.md](docs/database/environments.md)
- Production safety: [docs/ops/prod-migration-workflow.md](docs/ops/prod-migration-workflow.md)
- Verification (run in Supabase SQL Editor): [scripts/verify-migrations.sql](scripts/verify-migrations.sql)

Note: If you execute migrations manually in Supabase SQL Editor, the schema can be updated even if
`supabase_migrations.schema_migrations` is missing versions. The verification script calls this out and includes a safe
registration snippet.

---

## Notion

Notion används som portal, översikt och kunskapsyta.

- Spegelstrategi: [docs/NOTION.md](docs/NOTION.md)
- Sync-strategi: [docs/NOTION_SYNC_PLAN.md](docs/NOTION_SYNC_PLAN.md)
- Operativ uppdateringsregel: [docs/NOTION_UPDATE_CHECKLIST.md](docs/NOTION_UPDATE_CHECKLIST.md)

---

## 🚀 Tech Stack

- **Runtime:** Vercel (Next.js)
- **Database:** Supabase (PostgreSQL)
- **CI/CD:** GitHub → Vercel (automatiska previews per PR)
- **Hosting:** Edge Functions, CDN, ISR/SSR

Aktuell host- och deploytopologi ska alltid läsas från repo-dokumentationen, inte från hårdkodade README-sammanfattningar:

- [docs/platform/PLATFORM_DOMAIN.md](docs/platform/PLATFORM_DOMAIN.md)
- [docs/database/environments.md](docs/database/environments.md)
- [docs/ops/README.md](docs/ops/README.md)

---

## 🏗️ Domänarkitektur (översikt)

Projektet är organiserat enligt **Domain-Driven Design** med tydligt avgränsade domäner:

**Kärn-domäner:**
- **Platform** – Runtime, miljöer, deployment, routing
- **Accounts** – Autentisering, användare, roller
- **Tenant** – Multi-tenancy, organisationer
- **Billing & Licenses** – Betalningar, prenumerationer

**Produkt-domäner:**
- **Browse** – Sök, filter, rekommendationer
- **Games** – Lekdatabas och struktur
- **Play** – Spelupplevelse
- **Planner** – Planering och schemaläggning
- **Gamification** – "Din Lekresa", poäng, badges

**Stöd-domäner:**
- **Media** – Bilder och illustrationer
- **AI** – AI-generering och smarta förslag
- **Translation Engine** – i18n (NO→SE→EN)
- **Operations** – Drift och monitoring
- **API/Integration** – REST/GraphQL endpoints
- **Marketing** – Landningssidor och demo

📖 **[Se repo-förankrad domändokumentation →](docs/README.md)**

---

## 🛡️ Enterprise Security Status

Lekbanken har genomgått fullständig säkerhetsrevision och uppfyller **Enterprise-nivå**:

| Metric | Status |
|--------|--------|
| Row Level Security (RLS) | ✅ 167/167 tabeller |
| SECURITY DEFINER search_path | ✅ 52/52 funktioner |
| auth.uid() optimering | ✅ 100% |
| Supabase Security Advisor | ✅ 0 varningar |

📖 **[Se fullständig säkerhetsdokumentation →](docs/database/DATABASE_SECURITY_DOMAIN.md)**

---

## ✅ Planner QA-checklista (snabb)

- Säkerställ giltig auth-cookie och `lb_tenant`-header/cookie.
- Skapa plan via UI eller `POST /api/plans` (visibility default private).
- Uppdatera titel/beskrivning och bekräfta att debounced sparning fungerar utan text-förlust.
- Lägg till block (lek/pause/preparation/custom), flytta upp/ner, radera; kontrollera total tid.
- Spara privata anteckningar och tenant-anteckningar; bekräfta RLS (tenant-medlem ser tenant note, ej privat note).
- Ändra visibility (private/tenant/public – public kräver system_admin) och verifiera åtkomst med annan användare/tenant.
- Kalla på `/api/plans/[planId]/play` och säkerställ att translations/media/duration finns.

---

## 🔧 Kom igång
