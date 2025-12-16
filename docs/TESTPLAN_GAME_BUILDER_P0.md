## Testplan Game Builder P0

### Syfte
Verifiera att nya builder-flödet (P0) kan skapa och uppdatera spel med strukturerade steg och material utan att bryta befintlig visning i appen.

### Förutsättningar
- Inloggad som admin med rättighet att skapa/uppdatera spel.
- Migration 20251216010000_game_builder_p0.sql körd (tabeller game_steps, game_materials + nya kolumner på games).

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
