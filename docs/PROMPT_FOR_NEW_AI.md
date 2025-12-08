# LEKBANKEN — PROMPT FÖR NY AI-ASSISTENT

## Kontext

Du hjälper till med **Lekbanken**, en svensk webbapp för att hitta och organisera barnlekar. Projektet använder:

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + Catalyst UI Kit
- **Supabase** (PostgreSQL, Auth, RLS)
- **Heroicons**

## Senaste Arbetet (2024-12-07)

Vi har precis:

1. ✅ Seedat 25 riktiga svenska barnlekar i Supabase (Kurragömma, Sista pansen, Björnen sover, etc.)
2. ✅ Kopplat `/app/browse` till riktig Supabase-data istället för mock
3. ✅ Fixat RLS-policies så att publicerade globala lekar kan läsas av alla
4. ✅ Fixat tenant helper-funktioner som hade en bugg (refererade `deleted_at` som inte existerade)

## Vad Som Behöver Göras Nu

1. **Verifiera att browse-sidan fungerar**
   - Öppna `http://localhost:3000/app/browse`
   - Bör visa 25 lekar
   - Testa både inloggad och utloggad

2. **Game Detail Page** (`/app/games/[gameId]`)
   - Behöver kopplas till riktig data (använder nog fortfarande mock)

3. **Sök och filter**
   - Kategori, energinivå, antal deltagare, ålder

## Viktiga Filer

- `lib/services/gameService.ts` — Supabase queries
- `features/browse/BrowsePage.tsx` — Leklistan
- `app/app/games/[gameId]/page.tsx` — Detaljvy
- `supabase/migrations/` — Databasmigrationer
- `scripts/seed-games.ts` — Seeding script

## Kommandon

```bash
# Starta dev
npm run dev

# Testa RLS/fetch
npx tsx scripts/test-games-fetch.ts

# Se git-status
git status
```

## Svenska Språket

- UI är på svenska
- Använd svenska tecken (å, ä, ö) korrekt
- Lekar har svenska namn och beskrivningar

## Dokumentation

- `docs/HANDOVER_2024-12-07.md` — Fullständig status
- `docs/VS_CODE_WORKFLOW.md` — Dagliga rutiner
- `docs/CATALYST_UI_KIT.md` — UI-komponenter
