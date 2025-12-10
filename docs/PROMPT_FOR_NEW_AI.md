# LEKBANKEN — PROMPT FÖR NY AI-ASSISTENT

## ⚠️ OBLIGATORISK LÄSNING FÖRST

**Innan du gör NÅGOT:**
1. Läs `docs/AI_CODING_GUIDELINES.md` — Kritiska regler för att undvika breaking changes
2. Läs `docs/VS_CODE_WORKFLOW.md` — Utvecklingsworkflow

**Nyckelfakta:**
- Vi använder `proxy.ts` (INTE `middleware.ts`)
- Supabase via `createBrowserClient()` från `@/lib/supabase/client`
- Catalyst UI Kit (inte Shadcn)
- DDD-struktur i `features/`

## Kontext

Du hjälper till med **Lekbanken**, en svensk webbapp för att hitta och organisera barnlekar. Projektet använder:

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** + Catalyst UI Kit
- **Supabase** (PostgreSQL, Auth, RLS)
- **Heroicons**

## Aktuell Status (2025-12-10)

Vi arbetar på:
- **Participants Domain** — Anonymous join via session codes (se `PARTICIPANTS_DOMAIN_ARCHITECTURE.md`)
- Admin dashboard är live
- 25 svenska lekar finns i databasen


## Viktiga Dokumentation

| Dokument | När använda |
|----------|-------------|
| `AI_CODING_GUIDELINES.md` | **ALLTID först** — Undvik vanliga AI-fel |
| `PARTICIPANTS_DOMAIN_ARCHITECTURE.md` | Bygger join/session-funktionalitet |
| `VS_CODE_WORKFLOW.md` | Setup & dagligt arbete |
| `CATALYST_UI_KIT.md` | UI-komponenter |
| `HANDOVER_2024-12-07.md` | Historisk kontext |

## Viktiga Filer

- `proxy.ts` — Auth middleware (INTE middleware.ts!)
- `lib/services/gameService.ts` — Supabase queries
- `features/browse/BrowsePage.tsx` — Leklistan
- `app/app/games/[gameId]/page.tsx` — Detaljvy
- `supabase/migrations/` — Databasmigrationer

## Kommandon

```bash
# Starta dev
npm run dev

# Supabase
npx supabase status
npx supabase db push

# Se git-status
git status
```

## Svenska Språket

- UI är på svenska
- Använd svenska tecken (å, ä, ö) korrekt
- Lekar har svenska namn och beskrivningar

