# 🗺️ Atlas Evolution

> **Definition of Atlas** – Läs detta innan du arbetar med Atlas

---

## Vad är Atlas?

Atlas Evolution är ett **lokalt arkitektur- och beslutsverktyg** för Lekbanken.

Det är:
- 📊 En **levande systemkarta** – visuell översikt av routes, komponenter, databas och relationer
- ✅ En **checklista för teknisk hygien** – spåra cleanup, översättning, testning, ägarskap
- 🔒 Ett **säkerhets- och riskinstrument** – identifiera kritiska områden och unknown usage
- 📚 Ett **onboarding-verktyg** – hjälp nya utvecklare förstå systemet
- 🎯 Ett **beslutsstöd** – "safe to refactor"-signaler baserat på review-status

---

## Atlas ÄR source of truth för:

| Område | Beskrivning |
|--------|-------------|
| Användningsklassificering | `usage`, `confidence`, `evidence` |
| Riskbedömning | `risk`, `exposure`, `guards` |
| Manuella beslut | `cleanup_status`, `lock`, `owner`, `translation` |
| Review-status | `ux_reviewed`, `data_linked`, `rls_checked`, `tested` |
| Systemkarta | Vad finns, var, och hur det hänger ihop |

---

## Atlas ÄR INTE source of truth för:

| Område | Varför inte |
|--------|-------------|
| Runtime-logik | Hanteras i kod |
| Affärsregler | Hanteras i kod/dokumentation |
| Speldefinitioner | Hanteras i Game Builder |
| API-kontrakt | Hanteras i OpenAPI/Swagger |
| Feature flags | Hanteras i feature flag-system |
| Produktionsdata | Hanteras i Supabase |

---

## Konsekvenser

- Atlas **läser**, den **styr inte**
- Atlas **informerar beslut**, den **verkställer inte**
- Atlas **kan regenereras** utan att tappa mänskliga anteckningar
- Atlas **får aldrig** bli ett produktionsberoende

---

## Filer i denna mapp

| Fil | Beskrivning |
|-----|-------------|
| `annotations.json` | Mänskliga beslut (review-status, owner, notes). Ignoreras av git som default. |
| `.gitkeep` | Säkerställer att mappen existerar i git |
| `README.md` | Denna fil |

---

## Annotations

`annotations.json` innehåller mänskliga beslut som:
- Review-status (ux_reviewed, data_linked, rls_checked, tested)
- Cleanup-status (not_started, in_progress, cleaned, locked)
- Translation-status (n/a, pending, done)
- Owner (vem som ansvarar för noden)
- Notes (fria anteckningar)

**Viktigt:** Annotations-nycklar är alltid `inventory.node.id` och är oberoende av hur inventory är uppdelad på disk.

### Dela annotations med teamet

Som default ignoreras `annotations.json` av git. Om du vill dela review-status med teamet:

1. Ta bort raden `.atlas/annotations.json` från `.gitignore`
2. Committa `annotations.json`
3. Var beredd på merge-konflikter

---

## Köra Atlas

```bash
# Öppna Atlas i webbläsaren
pnpm dev
# Navigera till: http://localhost:3000/sandbox/atlas
```

---

## Regenerera inventory

```powershell
# Kör från projektets rot
.\scripts\generate-inventory-v2.ps1
```

Detta uppdaterar `inventory.json` utan att påverka `annotations.json`.
