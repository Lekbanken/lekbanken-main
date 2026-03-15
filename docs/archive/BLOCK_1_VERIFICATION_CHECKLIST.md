# Block 1 Verification Checklist

> **Datum:** 2026-03-10  
> **Status:** Code-complete — manuell verifiering kvar

Alla kodändringar och automatiserade tester är klara. Denna checklista täcker de manuella verifieringar som krävs innan Block 1 kan betraktas som helt stängt.

---

## UI-kontroller

| # | Kontroll | Steg | Förväntat resultat | ✓ |
|---|---------|------|-------------------|---|
| U1 | leaderTips dold i preview | Öppna `/app/games/[gameId]` (som inloggad, icke-admin) | Ingen "Ledartips"-sektion synlig | [ ] |
| U2 | leaderTips synlig i host | Öppna sandbox → host-mode | "Ledartips"-sektion renderas | [ ] |
| U3 | leaderTips synlig i admin | Öppna sandbox → admin-mode | "Ledartips"-sektion renderas | [ ] |
| U4 | Stegrendering oförändrad | Öppna `/app/games/[gameId]` med ett spel som har steg | Steg visas med titel, body, duration, optional-badge — oförändrat från före patchen | [ ] |
| U5 | Rollrendering oförändrad | Öppna `/app/games/[gameId]` med ett spel som har roller (participants-mode) | Roller visas med namn, ikon, färg, publicNote — oförändrat | [ ] |
| U6 | Director Preview full data | Öppna `/app/games/[gameId]/director-preview` | All data synlig, inklusive leaderTips | [ ] |

---

## RSC payload / HTML source-kontroller

| # | Kontroll | Steg | Förväntat resultat | ✓ |
|---|---------|------|-------------------|---|
| P1 | leaderScript borta | Öppna `/app/games/[gameId]` → Ctrl+U (View Source) → sök "leaderScript" | 0 träffar | [ ] |
| P2 | boardText borta | Samma View Source → sök "boardText" | 0 träffar | [ ] |
| P3 | participantPrompt borta | Samma View Source → sök "participantPrompt" | 0 träffar | [ ] |
| P4 | leaderTips borta | Samma View Source → sök "leader_tips" eller "leaderTips" (exkludera komponentnamnet "LeaderTips" i script) | Inga datavärden, bara eventuella komponent-/chunk-namn | [ ] |
| P5 | Director Preview behåller data | Öppna `/app/games/[gameId]/director-preview` → View Source → sök "leaderScript" | Träffar (data finns kvar) | [ ] |

---

## Network response-kontroller (DevTools → Network-fliken)

| # | Kontroll | Steg | Förväntat resultat | ✓ |
|---|---------|------|-------------------|---|
| N1 | Roles API utan privateNote | Öppna `/app/games/[gameId]` med roller → DevTools → Network → GET `.../roles` → Preview/Response | `privateNote` saknas på varje roll-objekt | [ ] |
| N2 | Roles API utan secrets | Samma response | `secrets` saknas | [ ] |
| N3 | Roles API utan assignmentStrategy | Samma response | `assignmentStrategy` saknas | [ ] |
| N4 | Roles API publika fält kvar | Samma response | `name`, `icon`, `color`, `publicNote`, `minCount`, `maxCount` finns | [ ] |

---

## Automatiserade verifieringar (redan avklarade)

| # | Kontroll | Resultat | Datum |
|---|---------|---------|-------|
| A1 | `npx tsc --noEmit` | 0 errors | 2026-03-10 |
| A2 | `npx vitest run` | 1767 passed, 0 failed | 2026-03-10 |
| A3 | Config visibility tests (9 st) | Alla gröna | 2026-03-10 |
| A4 | Roles contract tests (3 st) | Alla gröna | 2026-03-10 |
| A5 | Pre-existing config test updated | 2 assertions uppdaterade, alla gröna | 2026-03-10 |

---

## Sign-off

När alla U/P/N-kontroller är avprickade:

- [ ] Block 1 kan markeras som **STÄNGT**
- [ ] Manuell verifierare: ________________
- [ ] Datum: ________________
