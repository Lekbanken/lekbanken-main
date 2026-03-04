# Project Context — Lekbanken

> **Syfte:** Ge AI-agenter (och nya utvecklare) snabb förståelse för produkten, inte bara koden.

## Product

**Lekbanken** är en SaaS-plattform för att upptäcka, organisera och köra strukturerade lekar och aktiviteter med deltagare.

## Primary Users

| Roll | Beskrivning |
|------|-------------|
| **Lekledare** | Lärare, fritidspedagoger, teambuilding-facilitatorer. Mobil-first. Kör aktiviteter i fält. |
| **Admin** | Organisationsansvarig. Hanterar licenser, användare, spelbibliotek. Desktop-first. |
| **Deltagare** | Går med i sessioner via kod/QR. Minimal UI — telefon i handen. |

## Core Domains

| Domän | Syfte | Nyckelflöde |
|-------|-------|-------------|
| **Games** | Spelbibliotek. Bläddra, filtrera, favoriter. | Hitta lek → Läs instruktioner → Kör |
| **Planner** | Skapa aktivitetsplaner (block av lekar). | Skapa plan → Bygg (drag-and-drop) → Spara & Utför |
| **Play/Run** | Köra en plan steg-för-steg i fält. | Starta körning → Visa steg → Markera klar → Nästa |
| **Sessions** | Deltagarlekar med realtids-interaktion. | Skapa session → Dela kod → Deltagare ansluter → Spela |
| **Calendar** | Schemalägga planer på datum. | Välj dag → Välj plan → Schemalägg → Starta körning |

## Design Philosophy

1. **Mobile-first** — Lekledare har telefonen i fickan, inte en laptop
2. **Offline-friendly** — Aktiviteter körs utomhus, dålig uppkoppling
3. **Simple execution** — Under körning: ett steg i taget, stora knappar, minimal kognitiv last
4. **Progressive disclosure** — Visa det enkla först, avancerat bakom "Mer"
5. **Swedish-first UI** — Svenska som primärspråk, i18n via next-intl (sv/en/no)

## Tech Stack

| Lager | Teknologi |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| i18n | next-intl (`messages/{sv,en,no}.json`) |
| Backend | Supabase (PostgreSQL, Auth, RLS, Realtime) |
| Hosting | Vercel |
| Testing | Vitest (unit), Playwright (e2e) |

## Key Architecture Decisions

- **Feature-scoped code** — `features/{domain}/` not global `components/`
- **URL-driven state** — Wizard steps via `?step=`, no global state store
- **Auto-publish** — "Spara & Utför" transparently publishes + starts run
- **RLS everywhere** — Row-level security on all user data tables
- **Status state machine** — Plans: `draft → published → modified → archived`

## Non-goals (current phase)

- Planner is **NOT** a full LMS or lesson-planning tool
- No complex scheduling rules (recurrence, conflicts, resource booking)
- No real-time collaboration (multi-user editing of same plan)
- No participant session integration in plans yet (post-beta, MS6)
- No offline-first sync (optimistic UI only — requires connectivity for saves)
- No AI-generated plans (ai-assist.ts is a stub, not exposed)

## AI Agent Quick Start

```
1. Read PROJECT_CONTEXT.md          → Understand the product
2. Read planner-architecture.md     → Understand system design
3. Read planner-audit.md            → Understand current status
4. Read planner-implementation-plan.md → Understand roadmap
5. Read .github/copilot-instructions.md → Understand project rules
```
