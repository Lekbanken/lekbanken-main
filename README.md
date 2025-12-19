This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Lekbanken

Lekbanken är en modern multi-tenant SaaS-plattform för lekpedagogik och aktivitetsplanering, byggd med Next.js, Supabase och Vercel.

Plattformen riktar sig mot idrottsledare, föreningar, skolor och föräldrar, och erbjuder ett bibliotek av lekaktiviteter, planer, AI-förslag, gamification och rollstyrda arbetsytor.

Detta repo innehåller hela applikationen för `app.lekbanken.no`.  
**All domänlogik och arkitekturbeslut dokumenteras i Notion.**

## DB & migrations

- Quick start (manual + CLI): [MIGRATIONS_QUICK_START.md](MIGRATIONS_QUICK_START.md)
- Full guide: [docs/MIGRATIONS.md](docs/MIGRATIONS.md)
- Verification (run in Supabase SQL Editor): [scripts/verify-migrations.sql](scripts/verify-migrations.sql)

Note: If you execute migrations manually in Supabase SQL Editor, the schema can be updated even if
`supabase_migrations.schema_migrations` is missing versions. The verification script calls this out and includes a safe
registration snippet.

---

## 📚 Notion as Strategic Source of Truth

Lekbanken använder **Notion som den centrala källan** för:
- Domänarkitektur och systemdesign (Domain-Driven Design)
- Datamodeller, relationer och tabellscheman
- Produktspecifikationer och strategiska beslut
- Engineering workflows och team-processer

**GitHub-repot implementerar besluten som dokumenteras i Notion.**

### Viktiga länkar

- **[🎯 Lekbanken Dashboard](https://www.notion.so/Johan-Schultzs-omr-de-Lekbanken-Dashboard-14ca3649dd9080fdaeb3e8c067e1eb2e)** – Central översikt och snabbnavigering
- **[🏛️ Master Structure v1.0](https://www.notion.so/Johan-Schultzs-omr-de-Lekbanken-Master-Structure-v1-0-14ca3649dd908087a1bfc94b89ea2a07)** – Komplett systemöversikt med alla domäner
- **[⭐ Domänstruktur: Lekbanken](https://www.notion.so/Johan-Schultzs-omr-de-Domänstruktur-Lekbanken-14ca3649dd9080e89b62d94db3502c82)** – Fullständig domänarkitektur
- **[⭐ Platform Domain](https://www.notion.so/Johan-Schultzs-omr-de-Platform-Domain-Uppdaterad-med-Vercel-14ba3649dd908017af0bd5b87c2f37ed)** – Vercel, deployment, routing, säkerhet
- **[⚙️ Engineering Hub](https://www.notion.so/Johan-Schultzs-omr-de-Engineering-Hub-14ca3649dd908085ba50e9c43d7a4a31)** – Teknisk dokumentation och processer

📖 **[Se fullständig dokumentation och alla länkar i docs/NOTION.md →](docs/NOTION.md)**

---

## 🚀 Tech Stack

- **Runtime:** Vercel (Next.js)
- **Database:** Supabase (PostgreSQL)
- **CI/CD:** GitHub → Vercel (automatiska previews per PR)
- **Hosting:** Edge Functions, CDN, ISR/SSR
- **Domäner:**
  - `lekbanken.no` – Marketing site
  - `app.lekbanken.no` – Huvudapplikation
  - `admin.lekbanken.no` – Administrationspanel
  - `demo.lekbanken.no` – Offentlig demo
  - `api.lekbanken.no` – API endpoints

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

📖 **[Se fullständig domänarkitektur med ansvarsområden →](docs/NOTION.md)**

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
