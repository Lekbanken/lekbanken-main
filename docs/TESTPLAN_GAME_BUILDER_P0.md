## Testplan Game Builder (P0)

## Metadata

- Owner: -
- Status: draft
- Last validated: 2025-12-17

## Related code (source of truth)

- UI:
   - `features/admin/games/GameAdminPage.tsx` (länkar till builder)
   - `app/admin/games/new/page.tsx`
   - `app/admin/games/[gameId]/edit/page.tsx`
   - `app/admin/games/builder/*`
- API:
   - `app/api/games/builder/route.ts` (POST)
   - `app/api/games/builder/[id]/route.ts` (GET/PUT)
- Runtime:
   - `lib/services/games.server.ts`
   - `app/app/games/[gameId]/page.tsx`

## Syfte

Verifiera att builder-flödet (P0) kan skapa och uppdatera spel med strukturerade steg och material utan att bryta befintlig visning i appen.

## Förutsättningar

- Inloggad som admin med rättighet att skapa/uppdatera spel.
- Migration `20251216010000_game_builder_p0.sql` körd (tabeller `game_steps`, `game_materials` + nya kolumner på `games`).
- Om du testar faser/roller/board-config: kör även `20251216020000_game_phases.sql`, `20251216030000_game_roles.sql`, `20251216040000_game_board_config.sql`.

### Manuella steg
1) **Skapa nytt spel via builder**
   - Gå till `/admin/games/new`.
   - Fyll: namn, kort beskrivning, status utkast, lägg till minst två steg, lägg till material (1 rad).
   - Spara.
   - Bekräfta att API-svaret är OK och att du hamnar på spel-detalj (eller ser “Sparat!”).
   - Kontrollera i databasen att `game_steps` och `game_materials` har rader för spelet och att `games.game_content_version='v2'`.

2) **Redigera befintligt spel via builder**
   - Gå till `/admin/games/{id}/edit`.
   - Lägg till/ändra steg, uppdatera material.
   - Spara och bekräfta att `game_steps` ersatts med nya poster.

3) **Visning i appen**
   - Öppna `/app/games/{id}` för spelet från steg 1.
   - Instruktionerna ska renderas från `game_steps` (lista med steg).
   - Om inga `game_steps` finns, ska fallback ske till ev. `game_translations.instructions` eller `games.instructions`.

4) **Builder-knappar i admin-listan**
   - Gå till `/admin/games`.
   - Klicka “Builder” i topp och på en rad => rätt route öppnas.

5) **Publicera-drift (grundläggande)**
   - Sätt status Published i builder och spara.
   - Kontrollera att status uppdaterats i listan och på detaljsidan.

6) **Felhantering**
   - Försök spara utan namn/kort beskrivning -> ska få felmeddelande från API.

### Förväntade resultat
- API-rutter `/api/games/builder` och `/api/games/builder/[id]` fungerar för create/update/get.
- `game_steps` används i appens speldetaljsida när de finns.
- Admin-listan har länkar till buildern.
- Inga TypeScript-fel (`npm run type-check`).
