# Admin IA Refactor: Gamification hub

> **Status**: ✅ Implementerad
> **Datum**: 2026-01-04

## Sammanfattning

Denna IA-refaktorering konsoliderar alla gamification-relaterade admin-sidor under ett centralt nav: **Gamification hub**. Målet är att skapa en tydlig, framtidssäker modulstruktur som grupperar relaterad funktionalitet logiskt.

---

## Genomförda ändringar

### 1. Navigationsändringar

| Tidigare namn | Nytt namn |
|--------------|-----------|
| "Gamification" | "Gamification hub" |
| "Leaderboard" | Flyttad till DiceCoin & XP (tab) |
| "Levels" | Flyttad till DiceCoin & XP (tab) |
| "Butik" | Ersatt av "Shop & Rewards" |

### 2. Ny modulstruktur

| Modul | Route | Beskrivning |
|-------|-------|-------------|
| Hub landing | `/admin/gamification` | Dashboard med 4 module-cards |
| DiceCoin & XP | `/admin/gamification/dicecoin-xp` | XP-regler, Nivåer, Leaderboards |
| Achievements | `/admin/gamification/achievements` | Badge-admin, tiers, triggers |
| Shop & Rewards | `/admin/gamification/shop-rewards` | Butik, belöningar, priser |
| Library Exports | `/admin/gamification/library-exports` | Export-mallar, logg |

### 3. Ruttändringar

| Legacy route | → Ny route | Strategi |
|--------------|------------|----------|
| `/admin/leaderboard` | `/admin/gamification/dicecoin-xp?tab=leaderboards` | Redirect |
| `/admin/gamification/levels` | `/admin/gamification/dicecoin-xp?tab=levels` | Redirect |
| `/admin/marketplace` | `/admin/gamification/shop-rewards` | Redirect |

---

## Arkitektur

### Filstruktur

```
app/admin/gamification/
├── page.tsx                      # Hub landing
├── dicecoin-xp/
│   └── page.tsx                  # DiceCoin & XP (tabbed)
├── achievements/
│   └── page.tsx                  # Achievements
├── shop-rewards/
│   └── page.tsx                  # Shop & Rewards
├── library-exports/
│   └── page.tsx                  # Library Exports
├── levels/
│   ├── page.tsx                  # Redirect
│   └── _legacy-page.tsx          # Backup
├── analytics/                    # Befintlig
├── automation/                   # Befintlig
├── awards/                       # Befintlig
└── campaigns/                    # Befintlig

app/admin/leaderboard/
├── page.tsx                      # Redirect
└── _legacy-page.tsx              # Backup

app/admin/marketplace/
├── page.tsx                      # Redirect
└── _legacy-page.tsx              # Backup
```

---

## Modulbeskrivningar

### 1. DiceCoin & XP

**Syfte:** Hantera progression, nivåer, XP-regler och leaderboard-kopplingar.

**Tabs:**
- **XP & DiceCoin** - XP-regler med triggers, amounts, multipliers
- **Nivåer** - Level thresholds med namn och belöningar
- **Leaderboards** - Topplista över användare och organisationer

**Datakällor:**
- `gamification_levels` table
- `coin_transactions` table
- `user_xp` / `org_xp` views

### 2. Achievements

**Syfte:** Administrera achievements/badges, tiers, kriterier och rewards.

**Features:**
- Badge-bibliotek med ikoner och metadata
- Tier-system (multi-level achievements)
- Trigger-regler
- Reward-koppling

**Datakällor:**
- `badges` table
- `achievements` table
- `achievement_triggers` table

### 3. Shop & Rewards

**Syfte:** Hantera Butik och belöningar.

**Features:**
- Shop items med kategorier (cosmetic, powerup, bundle, reward)
- Prissättning i DiceCoin/XP
- Lager och tillgänglighetsregler
- Försäljningsstatistik

**Datakällor:**
- `shop_items` table
- `virtual_currencies` table
- `purchases` table

### 4. Library Exports

**Syfte:** Admin för exportpaket från biblioteket.

**Features:**
- Export-mallar (CSV, JSON, PDF, Excel)
- Format-konfiguration
- Versionshantering
- Export-logg

**Status:** Planerad (empty state med CTA)

---

## Navigationsstruktur

### Grupp: Gamification hub

```yaml
- Översikt
  - path: /admin/gamification
  
- DiceCoin & XP
  - path: /admin/gamification/dicecoin-xp
  - tabs: xp, levels, leaderboards
  
- Achievements
  - path: /admin/gamification/achievements
  
- Shop & Rewards
  - path: /admin/gamification/shop-rewards
  
- Library Exports
  - path: /admin/gamification/library-exports
```

---

## RBAC-behörigheter

Alla Gamification hub-sidor är för närvarande system_admin-only. Framtida TODO:

| Behörighet | Beskrivning | Status |
|------------|-------------|--------|
| `admin.gamification.view` | Läsa gamification-data | TODO |
| `admin.gamification.edit` | Redigera regler och items | TODO |
| `admin.shop.manage` | Hantera butik | TODO |

---

## Cross-linking

Hub landing innehåller:
- 4 module-cards med status badges
- Quick stats (aktiva spelare, XP utdelat, achievements, köp)
- Snabblänkar till varje modul

Varje modul visar relevant statistik och actions.

---

## Migrering

### Bakåtkompatibilitet

Gamla rutter redirectar automatiskt:
- `/admin/leaderboard` → `/admin/gamification/dicecoin-xp?tab=leaderboards`
- `/admin/gamification/levels` → `/admin/gamification/dicecoin-xp?tab=levels`
- `/admin/marketplace` → `/admin/gamification/shop-rewards`

### Rensa legacy-filer

När migreringen är validerad kan följande filer tas bort:

```bash
rm app/admin/leaderboard/_legacy-page.tsx
rm app/admin/gamification/levels/_legacy-page.tsx
rm app/admin/marketplace/_legacy-page.tsx
```

---

## Framtida förbättringar

- [ ] Implementera riktiga API-anrop (ersätt mock data)
- [ ] RBAC-behörigheter för tenant_admin
- [ ] Fullständig CRUD för alla moduler
- [ ] Library Exports backend
- [ ] Analytics integration
- [ ] Bulk-operationer
